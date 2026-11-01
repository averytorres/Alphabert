import { spawn } from 'node:child_process';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const output = 'test-results/full-suite';
await mkdir(output, { recursive: true });
let server;
const serverReady = async () => {
  try {
    return (await fetch('http://127.0.0.1:4173')).ok;
  } catch {
    return false;
  }
};

const results = [];
async function run(name, args) {
  const started = Date.now();
  let log = '';
  const child = spawn(process.execPath, args, { cwd: root, windowsHide: true });
  child.stdout.on('data', (data) => (log += data));
  child.stderr.on('data', (data) => (log += data));
  const timeout = setTimeout(() => child.kill(), 600_000);
  const code = await new Promise((resolve) => {
    child.on('error', (error) => {
      log += String(error);
      resolve(-1);
    });
    child.on('close', resolve);
  });
  clearTimeout(timeout);
  await writeFile(`${output}/${name}.log`, log);
  const result = { name, code, seconds: Math.round((Date.now() - started) / 1000) };
  results.push(result);
  console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${name} (${result.seconds}s)`);
}

try {
  if (!(await serverReady())) {
    server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, windowsHide: true });
    for (let attempt = 0; attempt < 50 && !(await serverReady()); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!(await serverReady())) throw new Error('Preview server did not start.');
  }
  const tests = (await readdir('scripts'))
    .filter((name) => /^test-.*\.mjs$/.test(name) && name !== 'test-all.mjs')
    .sort();
  // Keep browser and audio work bounded while allowing independent suites to run together.
  const queue = tests.map((name) => [name.slice(0, -4), [`scripts/${name}`]]);
  queue.push([
    'test-letter-pronunciation-published',
    ['scripts/test-letter-pronunciation.mjs', '--published'],
  ]);
  queue.push(
    ['test-layout-keycaps', ['scripts/test-layout-audit.mjs', '--keycaps']],
    ['test-layout-search-controls', ['scripts/test-layout-audit.mjs', '--search-controls']],
  );
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (queue.length) {
        const [name, args] = queue.shift();
        await run(name, args);
      }
    }),
  );
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  const failures = results.filter(({ code }) => code !== 0);
  console.log(`${results.length - failures.length}/${results.length} suites passed.`);
  process.exitCode = failures.length ? 1 : 0;
} finally {
  server?.kill();
}
