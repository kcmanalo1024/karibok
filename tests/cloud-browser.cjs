const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { mockCloud, signIn } = require('./mock-cloud.cjs');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const backend = await mockCloud(page);
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await page.locator('.splash-screen').waitFor();
  assert.equal(await page.locator('.app').count(),0);
  assert.match(await page.locator('.splash-screen').innerText(),/Your Life Gets Chaotic\. Your Tasks Don't Have To Be\./);
  await page.locator('.auth-screen').waitFor();
  assert.equal(await page.locator('.app').count(),0);
  await page.screenshot({path:'auth-desktop-check.png',fullPage:true,animations:'disabled'});
  backend.loginError=true;
  await page.getByLabel('Email',{exact:true}).fill('test@example.com');await page.getByLabel('Password',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.locator('.app').count(),0);
  await page.getByRole('button',{name:'Sign Up',exact:true}).click();await page.getByLabel('Password',{exact:true}).fill('new-password');await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.getByText('Check your email to confirm your account, then sign in to your workspace.').waitFor();assert.equal(await page.locator('.app').count(),0);
  backend.loginError=false;backend.workspaceDelay=1600;
  await page.getByRole('button',{name:'Login',exact:true}).click();await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.workspace-loading').waitFor();assert.equal(await page.locator('.app').count(),0);await page.locator('.app').waitFor();
  assert.match(await page.locator('.nav-item.active').innerText(),/Dashboard/);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Display name').fill('Cloud student');await page.waitForFunction(()=>document.querySelector('.sync-status')?.textContent==='Synced');assert.equal(backend.remote.data.name,'Cloud student');
  const logins=backend.logins;backend.workspaceDelay=0;
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.splash-screen').waitFor();assert.equal(await page.locator('.app').count(),0);await page.locator('.app').waitFor();assert.equal(backend.logins,logins);assert.match(await page.locator('.nav-item.active').innerText(),/Dashboard/);
  await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await page.getByLabel('Display name').inputValue(),'Cloud student');
  backend.remote={revision:backend.remote.revision+1,data:{...backend.remote.data,name:'Other device'}};await page.getByLabel('Display name').fill('Local draft');await page.getByRole('button',{name:'Load cloud version',exact:true}).waitFor();assert.equal(await page.getByLabel('Display name').inputValue(),'Local draft');await page.getByRole('button',{name:'Load cloud version',exact:true}).click();await page.locator('.app').waitFor();await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await page.getByLabel('Display name').inputValue(),'Other device');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.locator('.auth-screen').waitFor();assert.equal(await page.locator('.app').count(),0);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.auth-screen').waitFor();assert.equal(await page.locator('.app').count(),0);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'auth-mobile-check.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('button',{name:'Sign Up',exact:true}).click();backend.confirmEmail=false;await page.getByLabel('Email',{exact:true}).fill('new@example.com');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.locator('.app').waitFor();assert.match(await page.locator('.nav-item.active').innerText(),/Dashboard/);
  // A failed workspace request cannot expose cached dashboard content.
  backend.workspaceError=true;await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Retry connection',exact:true}).waitFor();assert.equal(await page.locator('.app').count(),0);backend.workspaceError=false;await page.getByRole('button',{name:'Retry connection',exact:true}).click();await page.locator('.app').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: splash, signed-out gate, invalid login, confirmation signup, immediate signup, delayed workspace gate, session restoration, sync conflicts, logout/reload protection, load error recovery, responsive authentication.');
 } finally { await browser.close(); }
})();

