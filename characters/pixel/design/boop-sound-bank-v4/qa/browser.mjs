import fs from 'node:fs';
import assert from 'node:assert/strict';
import {moodAdditions,newMoods} from '../runtime/mood-catalog.mjs';
import {makeScene} from '../runtime/bank.mjs';
if(process.argv.includes('--help')){console.log('Usage: node characters/pixel/design/boop-sound-bank-v4/qa/browser.mjs\nRequires playwright, pngjs and installed Chromium. Optional BOOP_PLAYWRIGHT_MODULE, BOOP_PNGJS_MODULE and BOOP_QA_BROWSER override their locations.');process.exit(0);}
const {chromium}=await import(process.env.BOOP_PLAYWRIGHT_MODULE||'playwright');
const {PNG}=await import(process.env.BOOP_PNGJS_MODULE||'pngjs');
const dir=new URL('./',import.meta.url),errors=[];
const browser=await chromium.launch({headless:true,...(process.env.BOOP_QA_BROWSER?{executablePath:process.env.BOOP_QA_BROWSER}:{}),args:['--autoplay-policy=no-user-gesture-required']});
const report={status:'pass',xmlRendered:0,visibleCueChecks:0,domLoopEndpoints:0,rasterSeams:0,clearTextLanes:0,layouts:[],playback:[]};
try{
 const page=await browser.newPage({viewport:{width:960,height:800}});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.setContent('<style>body{margin:0;background:#000}#stage{width:320px;height:240px}svg{display:block}</style><div id="stage"></div>');
 const mount=page.locator('#stage');
 // All new scenes parse, show at least one shape, and use identical rendered element state at both endpoints.
 for(const [i,a]of moodAdditions.entries()){
  const scene=makeScene(a.id);
  const result=await mount.evaluate((el,{svg,seconds,events})=>{
   const xml=new DOMParser().parseFromString(svg,'image/svg+xml');if(xml.querySelector('parsererror'))throw Error(xml.querySelector('parsererror').textContent);
   el.innerHTML=svg;const node=el.querySelector('svg');node.pauseAnimations();
   const snapshot=t=>{node.setCurrentTime(t);return [...node.querySelectorAll('g[data-step]')].map(e=>getComputedStyle(e).opacity).join(',');};
   const seam=snapshot(0)===snapshot(seconds);
   const visible=events.every(e=>{node.setCurrentTime(e.at+.00001);return [...node.querySelectorAll('[data-part="mood-action"] > g[data-step]')].some(g=>g.dataset.step.split(',').includes(String(e.sync.step))&&Number(getComputedStyle(g).opacity)===1);});
   return {seam,visible,shapes:node.querySelectorAll('rect,path').length};
  },{svg:scene.svg,seconds:a.seconds,events:scene.score.events});
  assert(result.seam,a.id+' DOM seam');assert(result.visible,a.id+' hidden sound contact');assert(result.shapes>0);report.xmlRendered++;report.domLoopEndpoints++;report.visibleCueChecks+=scene.score.events.length;
  if((i+1)%77===0)console.log('Browser validated '+(i+1)+' / '+moodAdditions.length);
 }
 // Raster check representatives of every state, every working action, every new mood and all request variants.
 const reps=[...new Map([...moodAdditions.filter(a=>a.mood==='calm'&&a.variation===1),...moodAdditions.filter(a=>a.state==='working'||a.state==='needs_you'||a.state==='task_complete')].map(a=>[a.id,a])).values()];
 const snapshots=[];
 for(const a of reps){
  // Reset the document for raster samples. Hundreds of replaced SMIL roots in
  // one document can leave stale compositor layers in this Chromium build.
  await page.setContent('<style>body{margin:0;background:#000}#stage{width:320px;height:240px}svg{display:block}</style><div id="stage">'+makeScene(a.id).svg+'</div>');
  await mount.evaluate(el=>{el.querySelector('svg').pauseAnimations();el.querySelector('svg').setCurrentTime(0);});
  const first=await mount.screenshot();await mount.evaluate((el,t)=>el.querySelector('svg').setCurrentTime(t),a.seconds);const last=await mount.screenshot();
  assert.deepEqual(PNG.sync.read(first).data,PNG.sync.read(last).data,a.id+' raster seam');report.rasterSeams++;
  await mount.evaluate((el,t)=>el.querySelector('svg').setCurrentTime(t),a.state==='needs_you'?2.8:a.seconds*.53);
  const pose=await mount.screenshot(),png=PNG.sync.read(pose);let visiblePixels=0;
  for(let y=0;y<240;y++)for(let x=0;x<320;x++){const j=(y*320+x)*4,value=png.data[j]+png.data[j+1]+png.data[j+2];if(y>=192)assert.equal(value,0,a.id+' text lane');else if(value>0)visiblePixels++;}
  assert(visiblePixels>100,a.id+' blank raster sample');report.clearTextLanes++;
  if(a.state==='working'||a.state==='needs_you'||a.state==='task_complete'&&a.variation===1)snapshots.push({a,png:pose.toString('base64')});
 }
 for(const mood of newMoods){
  const items=snapshots.filter(s=>s.a.mood===mood);await page.setViewportSize({width:960,height:900});
  await page.setContent('<style>body{margin:0;background:#1b1d1a;color:#eeeee5;font:14px system-ui}main{display:grid;grid-template-columns:repeat(3,320px)}article{height:284px}h2{font-size:14px;font-weight:500;margin:9px 10px}img{display:block}</style><main>'+items.map(({a,png})=>`<article><h2>${mood} · ${a.state} ${a.variation}</h2><img width="320" height="240" src="data:image/png;base64,${png}"></article>`).join('')+'</main>');
  await page.locator('main').screenshot({path:new URL(`./${mood}-contact-sheet.png`,dir).pathname});
 }
 // The Character Studio (characters/studio/, its packs.js from characters/charactergen.py) plays the bank as Pixel's preview.
 await page.goto(new URL('../../../../studio/index.html#pack=pixel',import.meta.url).href);await page.waitForFunction(()=>document.getElementById('studio')?.studio);
 await page.evaluate(()=>document.getElementById('studio').studio.ready);
 const studio=(fn,arg)=>page.evaluate(([fn,arg])=>new Function('s','arg','return ('+fn+')(s,arg)')(document.getElementById('studio').studio,arg),[String(fn),arg]);
 for(const id of ['engaged.terminal.01','irritated.needs_you.02','whiny.task_complete.01','wounded.task_complete.04','calm.idle.01']){
  await studio((s,id)=>s.selectAsset(id),id);assert.equal(await studio(s=>s.adapter.scene.asset.id),id);await page.locator('[data-play]').click();
  await page.waitForFunction(()=>document.getElementById('studio').studio.adapter.playing);await page.waitForTimeout(350);
  assert(!(await page.locator('[data-status]').textContent()).startsWith('Playback error'));assert(await page.locator('#stage svg').evaluate(svg=>svg.getCurrentTime())>0);await page.locator('[data-play]').click();report.playback.push(id);
 }
 await studio(s=>s.selectAsset('whiny.working.02'));
 await page.locator('[data-next]').click();assert.equal(await studio(s=>s.adapter.scene.asset.id),'whiny.working.03');await page.locator('[data-prev]').click();
 assert.equal(await studio(s=>s.adapter.scene.asset.id),'whiny.working.02');
 await page.locator('[data-seek]').fill('2');await page.locator('[data-seek]').dispatchEvent('input');assert(Math.abs(await page.locator('#stage svg').evaluate(s=>s.getCurrentTime())-2)<.01);
 for(const width of [320,390,920]){
  await page.setViewportSize({width,height:950});const box=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert(box.scroll<=box.width+1);report.layouts.push(width);await page.screenshot({path:new URL(`./studio-${width}.png`,dir).pathname,fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#stage .motion').evaluate(el=>getComputedStyle(el).display),'none');assert.equal(await page.locator('#stage .still').evaluate(el=>getComputedStyle(el).display),'inline');report.reducedMotion=true;
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('./browser-checks.json',dir),JSON.stringify(report,null,2)+'\n');console.log(report);
}finally{await browser.close();}
