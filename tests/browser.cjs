const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {mockCloud,signIn}=require('./mock-cloud.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const backend=await mockCloud(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const go=async name=>{console.log('Action:',name);await page.getByRole('button',{name,exact:true}).first().click();};
 const save=async()=>page.getByRole('button',{name:'Save',exact:true}).click();
 const checkWidth=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 try{
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5174');await signIn(page);
 await go('Clients');await go('Add client');await page.getByLabel('Client / Business Name').fill('Acme Studio');await page.getByLabel('Email').fill('hello@example.com');await go('Save Client');
 await go('Projects');await go('New project');await page.getByLabel('Project Name').fill('Launch design');await page.getByLabel('Client',{exact:true}).selectOption({label:'Acme Studio'});await page.getByLabel('Description',{exact:true}).fill('Design work');await go('Save Project');
 await go('Finances');await go('Project payments');await go('Add payment');await page.getByLabel('Payment description').fill('Design deposit');await page.getByLabel('Project',{exact:true}).selectOption({label:'Launch design'});await page.getByLabel('Amount (PHP)').fill('1250.50');await go('Save Payment');await go('Mark paid Design deposit');
 assert.match(await page.locator('.v4-metrics').innerText(),/1,250.50/);
 await go('Edit Design deposit');await page.getByLabel('Amount (PHP)').fill('1500');await go('Save Payment');
 await go('Projects');await go('Delete Launch design');assert.match(await page.getByRole('status').innerText(),/tasks|payment/);await go('Dismiss notification');
 await go('Tasks');await go('Add task');await page.getByLabel('Task title').fill('Weekly delivery');await page.getByLabel('Project (optional)').selectOption({label:'Launch design'});await page.getByLabel('Repeat').selectOption('weekly');await page.getByLabel('Deadline',{exact:true}).fill('2026-09-15');await page.getByRole('button',{name:'Add task',exact:true}).last().click();await go('Complete Weekly delivery');
 assert.equal(await page.getByRole('button',{name:'Edit Weekly delivery',exact:true}).count(),2);
 await go('Reopen Weekly delivery');await go('Complete Weekly delivery');assert.equal(await page.getByRole('button',{name:'Edit Weekly delivery',exact:true}).count(),2);
 await go('Calendar');await page.getByRole('button',{name:/2026-09-22,/}).click();assert.match(await page.locator('.agenda-row').innerText(),/Weekly delivery/);await go('Next month');assert.match(await page.locator('.panel-head').first().innerText(),/October 2026/);await go('Today');
 await go('Focus');await page.getByLabel('Focus minutes').fill('1');await go('Start focus');await page.waitForTimeout(1200);await go('Pause');await page.reload();await page.locator('.app').waitFor();await go('Focus');assert.equal(await page.getByRole('button',{name:'Resume',exact:true}).count(),1);await go('Resume');await go('Stop & save');assert.match(await page.locator('.record-row').innerText(),/Focus session/);
 await page.waitForTimeout(1000);backend.remote={revision:backend.remote.revision+1,data:{...backend.remote.data,timer:{id:'finish-check',kind:'focus',label:'Completed focus check',duration:60,elapsed:0,startedAt:Date.now()-65000}}};await page.reload();await page.waitForTimeout(1500);await go('Notifications');await page.getByText('Focus session complete',{exact:true}).waitFor();assert.match(await page.locator('.content').innerText(),/Focus session complete/);await go('Dismiss Focus session complete');
 await go('Analytics');assert.match(await page.locator('.summary-copy').innerText(),/1 tasks/);
 await go('Settings');await page.getByLabel('Category name').fill('Research');await go('Add');await go('Rename category Research');await page.getByLabel('Category name').fill('Reading');await save();await go('Delete category Reading');assert.equal(await page.getByRole('button',{name:'Rename category Reading'}).count(),0);
 await page.getByLabel('Display name').fill('Kaycee');await go('dark');await page.getByLabel('Custom accent color').fill('#526b51');
 const download=page.waitForEvent('download');await go('Export backup');assert.match((await download).suggestedFilename(),/karibok-backup/);
 await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');await go('Settings');assert.equal(await page.getByLabel('Display name').inputValue(),'Kaycee');await page.screenshot({path:'settings-dark-check.png',fullPage:true});await go('light');
 for(const screen of ['Dashboard','Tasks','Projects','Calendar','Focus','Analytics','Clients','Finances','Notifications','Settings']){await go(screen);await checkWidth();}
 await go('Finances');await page.screenshot({path:'finances-check.png',fullPage:true});await page.setViewportSize({width:390,height:844});
 for(const screen of ['Dashboard','Tasks','Projects','Calendar','Focus','Analytics','Clients','Finances','Notifications','Settings']){await go(screen);await checkWidth();}
 await go('Calendar');await page.screenshot({path:'calendar-mobile-check.png',fullPage:true});
 await go('Finances');await go('Project payments');await go('Delete Design deposit');await go('Delete');await go('Tasks');await page.getByRole('button',{name:'Delete Weekly delivery',exact:true}).first().click();await page.getByRole('button',{name:'Delete Weekly delivery',exact:true}).first().click();await go('Projects');await go('Delete Launch design');await go('Delete');await go('Clients');await go('Delete Acme Studio');await go('Delete');
 assert.deepEqual(errors,[]);console.log('PASS: client/project/payment CRUD, relationship guards, recurring tasks, calendar, persistent focus timer, notifications, summaries, categories, appearance, backup download, and ten screens at desktop/mobile widths.');
 }finally{await browser.close();}
})();


