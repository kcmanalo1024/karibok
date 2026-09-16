const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {mockCloud,signIn}=require('./mock-cloud.cjs');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const backend=await mockCloud(page);await page.goto(process.env.APP_URL||'http://127.0.0.1:5174');await signIn(page);const add=page.getByRole('button',{name:'Quick Add'});
 await add.click();const menu=page.getByRole('menu');assert.deepEqual(await menu.getByRole('menuitem').allTextContents(),['Task','Project','Client','Transaction','Utang','Note']);await page.keyboard.press('Escape');assert.equal(await menu.count(),0);
 await add.click();await page.getByRole('menuitem',{name:'Client'}).click();await page.getByLabel('Client / Business Name').fill('Quick Client');await page.getByRole('button',{name:'Save Client'}).click();await page.getByText('Quick Client',{exact:true}).waitFor();
 await add.click();await page.getByRole('menuitem',{name:'Project'}).click();await page.getByLabel('Project Name').fill('Quick Project');await page.getByRole('button',{name:'Save Project'}).click();await page.getByText('Quick Project',{exact:true}).waitFor();
 await add.click();await page.getByRole('menuitem',{name:'Task'}).click();await page.getByLabel('Task title').fill('Quick Task');await page.getByRole('button',{name:'Add task',exact:true}).last().click();await page.getByText('Quick Task',{exact:true}).waitFor();
 await add.click();await page.getByRole('menuitem',{name:'Transaction'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await add.click();await page.getByRole('menuitem',{name:'Utang'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 await add.click();await page.getByRole('menuitem',{name:'Note'}).click();await page.getByLabel('Note title').fill('Quick Note');await page.getByLabel('Note content').fill('Saved through Quick Add');await page.getByRole('button',{name:'Save Note'}).click();await page.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('Note saved'));await page.waitForTimeout(1200);assert.equal(backend.remote.data.notes[0].title,'Quick Note');
 await page.setViewportSize({width:1440,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);console.log('PASS: Quick Add menu, Escape, destination forms, note persistence, and responsive layout.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
