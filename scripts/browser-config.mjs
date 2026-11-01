// Playwright resolves installed browser channels on Windows, macOS and Linux.
export function browserOptions(env=process.env){
 if(env.CHROME_PATH)return {executablePath:env.CHROME_PATH};
 const channel=env.BROWSER_CHANNEL||'chrome';
 return channel==='chromium'?{}:{channel};
}
