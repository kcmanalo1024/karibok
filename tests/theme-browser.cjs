const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {mockCloud,signIn}=require('./mock-cloud.cjs');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const cloud=await mockCloud(page);await page.goto('http://127.0.0.1:5174');await signIn(page);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 const nav=async name=>page.locator('.sidebar').getByRole('button',{name,exact:true}).filter({visible:true}).click();
 const surfaces=()=>page.evaluate(()=>['body','.sidebar','.topbar','.panel'].map(selector=>{const s=getComputedStyle(document.querySelector(selector));return [s.backgroundColor,s.backgroundImage,s.color,s.borderColor,s.boxShadow]}));
 const contrast=()=>page.evaluate(()=>{
  const parse=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
  const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const root=getComputedStyle(document.documentElement),swatch=document.createElement('span');document.body.append(swatch);
  const color=name=>{swatch.style.color=`var(${name})`;return parse(getComputedStyle(swatch).color)};
  const results=['--bg','--surface','--surface2'].flatMap(bg=>['--text','--muted','--accent-ink'].map(fg=>({bg,fg,ratio:ratio(color(bg),color(fg))})));
  results.push({bg:'accent',fg:'button label',ratio:ratio(color('--accent'),color('--on-accent'))});swatch.remove();return results;
 });
 for(const theme of ['dark','light']){
  await nav('Settings');await page.getByRole('button',{name:theme,exact:true}).click();const baseline=await surfaces();
  for(const accent of ['#8b3f2f','#526b51','#6253a3','#2563eb','#be416b','#d39836']){
   await page.getByRole('button',{name:`Use ${accent} accent`,exact:true}).click();assert.deepEqual(await surfaces(),baseline,`${theme}: accent must not recolor base surfaces`);
   for(const sample of await contrast())assert.ok(sample.ratio>=4.5,`${theme} ${accent} ${sample.fg} on ${sample.bg}: ${sample.ratio}`);
  }
  await page.getByRole('button',{name:'Use #8b3f2f accent',exact:true}).click();
  await page.screenshot({path:`ui-${theme}-settings.png`,fullPage:true});
  for(const name of ['Dashboard','Tasks','Notes','Calendar','Folders','Favorites','Clients','Finances','Focus','Trash']){
   await nav(name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${theme} ${name} overflow`);
  }
  await nav('Dashboard');await page.screenshot({path:`ui-${theme}-dashboard.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Switch to dark mode'}).click();await page.waitForTimeout(1000);assert.equal(cloud.remote.data.theme,'dark');await page.reload();await page.locator('.app').waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.setViewportSize({width:390,height:844});for(const name of ['Dashboard','Settings','Finances','Calendar','Notes']){await nav(name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`mobile ${name}`);}await page.screenshot({path:'ui-dark-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: dark default, theme persistence, all accent presets preserve base colors, text/button contrast >=4.5, all pages and mobile layouts.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
