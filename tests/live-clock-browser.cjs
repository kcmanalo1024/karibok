const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {mockCloud,signIn}=require('./mock-cloud.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Manila'});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();
  const backend=await mockCloud(page); await page.goto(process.env.APP_URL||'http://127.0.0.1:5174');
  assert.equal(await page.getByRole('timer').count(),0);
  await signIn(page);
  await page.clock.pauseAt(new Date('2026-09-15T14:42:18Z'));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  const clock=page.getByRole('timer');
  await page.waitForFunction(()=>document.querySelector('.live-clock-time')?.textContent==='10:42:18 PM');
  assert.equal(await clock.getAttribute('aria-label'),'Current time: 10:42:18 PM, Philippines');
  await page.clock.runFor(1000);
  assert.equal(await page.locator('.live-clock-time').innerText(),'10:42:19 PM');
  await page.clock.setSystemTime(new Date('2026-09-15T17:00:05Z'));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(()=>document.querySelector('.live-clock-time')?.textContent==='01:00:05 AM');
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  if (!await page.locator('#time-zone-select').count()) throw new Error(`Time zone setting did not render. Page errors: ${errors.join(' | ')}. Content: ${(await page.locator('.content').innerText()).slice(-500)}`);
  const selector=page.getByLabel('Time Zone',{exact:true});
  assert.equal(await selector.inputValue(),'Asia/Manila');
  await page.getByLabel('Search country or city').fill('Berlin');
  assert.equal(await selector.locator('option',{hasText:'Germany — Berlin'}).count(),1);
  await selector.selectOption('Europe/Berlin');
  await page.waitForFunction(()=>document.querySelector('.live-clock-zone')?.textContent==='Germany');
  assert.equal(await page.locator('.live-clock-time').innerText(),'07:00:05 PM');
  await page.clock.runFor(1000);
  await page.waitForFunction(()=>document.querySelector('.sync-status')?.textContent==='Synced');
  assert.equal(backend.remote.data.timeZone,'Europe/Berlin');
  await page.reload(); await page.clock.runFor(3000); await page.locator('.app').waitFor();
  assert.match(await page.getByRole('timer').getAttribute('aria-label'),/^Current time: \d{2}:\d{2}:\d{2} [AP]M, Germany$/);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await page.getByLabel('Time Zone',{exact:true}).inputValue(),'Europe/Berlin');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.locator('.auth-screen').waitFor();
  await signIn(page);
  assert.match(await page.getByRole('timer').getAttribute('aria-label'),/, Germany$/);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await page.getByLabel('Time Zone',{exact:true}).inputValue(),'Europe/Berlin');
  for(const width of [1440,390,320]) {
   await page.setViewportSize({width,height:900});
   assert.equal(await clock.isVisible(),true);
   const box=await clock.boundingBox(); assert.ok(box.x>=0 && box.x+box.width<=width);
   const profile=await page.locator('.topbar .user-pill').boundingBox(); assert.ok(box.x+box.width<=profile.x);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: browser default, time-zone search, immediate clock update, Supabase persistence across refresh and logout/login, accessible label, desktop and mobile widths.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

