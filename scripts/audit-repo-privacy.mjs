// Scan the actual Git publication set without printing matched secret values.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const args=process.argv.slice(2),forbidden=[];
for(let i=0;i<args.length;i++){
 if(args[i]!=='--forbid-name'||!args[i+1])throw Error('Usage: node scripts/audit-repo-privacy.mjs [--forbid-name NAME]');
 forbidden.push(args[++i].toLowerCase());
}
const files=[...new Set(execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{maxBuffer:20e6}).toString('utf8').split('\0').filter(Boolean))];
const findings=[],publicNotices=[],add=(file,kind)=>findings.push({file,kind});
const secrets=/(?:sk_[a-z0-9]{24,}|gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|AIza[a-z0-9_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const email=/[a-z0-9_.+%-]+@[a-z0-9.-]+\.[a-z]{2,}/ig;
const personalPath=/(?:\b[A-Z]:[\\/]Users[\\/][^\\/\r\n" ]+|(?<![a-z])\/(?:Users|home)\/[^/\r\n" ]+)/i;
const hardwareId=/\bR\d{2}[A-Z0-9]{8,}\b/;
const textExtensions=new Set(['.js','.mjs','.cjs','.json','.html','.css','.md','.txt','.ps1','.py','.java','.xml','.abc','.yml','.yaml','.properties','.ini','.cfg']);
let count=0;
for(const file of files){
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
 count++;
 const buffer=fs.readFileSync(file),ascii=buffer.toString('latin1').toLowerCase();
 if(forbidden.some(term=>file.toLowerCase().includes(term)||ascii.includes(term)))add(file,'forbidden name');
 if(/(?:^|\/)(?:\.env(?:\..+)?|api-key\.txt|credentials\.json)$|\.(?:keystore|jks|p12|pfx|key|pem)$/i.test(file)&&!file.endsWith('.env.example'))add(file,'credential/signing filename');
 if(!textExtensions.has(path.extname(file).toLowerCase())&&!path.basename(file).startsWith('.'))continue;
 const text=buffer[0]===255&&buffer[1]===254?buffer.subarray(2).toString('utf16le'):buffer.toString('utf8');
 if(secrets.test(text))add(file,'credential pattern');
 if(personalPath.test(text))add(file,'personal home-directory path');
 if(hardwareId.test(text))add(file,'device identifier');
 if(/\b\d{3}-\d{2}-\d{4}\b/.test(text))add(file,'possible government identifier');
 const emails=[...text.matchAll(email)].map(m=>m[0]);
 if(emails.length){
  if(file.startsWith('audio/licenses/'))publicNotices.push(file);
  else if(emails.some(e=>!/@(?:example\.(?:com|org|net|invalid)|users\.noreply\.github\.com)$/i.test(e)))add(file,'email address requiring review');
 }
}
console.log(JSON.stringify({filesScanned:count,findings,publicLicenseNoticeFiles:[...new Set(publicNotices)],scope:'Git-tracked and nonignored untracked file contents; Git author metadata and ignored local files are outside this scan.'},null,2));
if(findings.length)process.exitCode=1;
