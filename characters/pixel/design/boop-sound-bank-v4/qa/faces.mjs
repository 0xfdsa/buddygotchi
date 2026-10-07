import {newMoods} from '../runtime/mood-catalog.mjs';
import {makeScene} from '../runtime/bank.mjs';
if(process.argv.includes('--help')){console.log('Usage: node characters/pixel/design/boop-sound-bank-v4/qa/faces.mjs\nWrites a six-mood contact sheet. Requires playwright and Chromium; optional BOOP_PLAYWRIGHT_MODULE and BOOP_QA_BROWSER.');process.exit(0);}
const {chromium}=await import(process.env.BOOP_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BOOP_QA_BROWSER?{executablePath:process.env.BOOP_QA_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:960,height:570}});
 await page.setContent('<style>body{margin:0;background:#191c18;color:#efeee4;font:14px system-ui}main{display:grid;grid-template-columns:repeat(3,320px)}article{height:284px}h2{font-size:16px;font-weight:500;margin:9px 12px}svg{display:block}</style><main>'+newMoods.map(m=>'<article><h2>'+m+'</h2>'+makeScene(m+'.working.01').svg+'</article>').join('')+'</main>');
 await page.evaluate(()=>document.querySelectorAll('svg').forEach(s=>{s.pauseAnimations();s.setCurrentTime(Number(s.dataset.loopSeconds)*.45);}));
 await page.locator('main').screenshot({path:new URL('./new-moods.png',import.meta.url).pathname});
}finally{await browser.close();}
