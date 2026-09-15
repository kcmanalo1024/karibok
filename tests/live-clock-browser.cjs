const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {mockCloud,signIn}=require('./mock-cloud.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'Asia/Manila'});
  await page.clock.install();
  await mockCloud(page); await page.goto('http://127.0.0.1:5174');
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
  for(const width of [1440,390,320]) {
   await page.setViewportSize({width,height:900});
   assert.equal(await clock.isVisible(),true);
   const box=await clock.boundingBox(); assert.ok(box.x>=0 && box.x+box.width<=width);
   const profile=await page.locator('.topbar .user-pill').boundingBox(); assert.ok(box.x+box.width<=profile.x);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  console.log('PASS: authenticated clock, Philippines formatting, seconds, resume accuracy, accessible label, desktop and mobile widths.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

