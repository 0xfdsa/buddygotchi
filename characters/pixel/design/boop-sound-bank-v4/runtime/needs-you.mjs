import {palette,rect,path,group,at,face,move,star,label} from './visual/base.mjs';
import {closeTimelines} from './visual/loop.mjs';
import {requestPerformance,drawRequestPerformance} from './request-performances.mjs';

// Fixed-size pixel art. The signal stays amber/dark; it never strobes a white
// screen or borrows the gold full-background treatment reserved for success.
export const alertProfiles={
  happy:{pitch:1.06,gain:.92,tapGain:.42,recoil:2,impact:1,look:'friendly, bouncy gestures'},
  excited:{pitch:1.12,gain:.95,tapGain:.48,recoil:4,impact:1.05,look:'quick, eager gestures at changing positions'},
  proud:{pitch:.98,gain:.92,tapGain:.50,recoil:2,impact:.85,look:'deliberate, theatrical gestures'},
  curious:{pitch:1.04,gain:.88,tapGain:.36,recoil:2,impact:.8,look:'inquisitive gestures exploring different spots'},
  determined:{pitch:1,gain:.94,tapGain:.63,recoil:3,impact:1.1,look:'steady, firm gestures'},
  grumpy:{pitch:.91,gain:.98,tapGain:.80,recoil:5,impact:1.25,look:'rapid, heavy gestures'},
  sad:{pitch:.97,gain:.88,tapGain:.22,recoil:1,impact:.7,look:'hesitant, soft and slow gestures'}
};
const amber=palette.amber,dark='#352915',panel='#584020';
// All request graphics stay above the host's bottom 48 px text lane.
export const requestLayout={width:320,height:240,textTop:192,textHeight:48,alertScale:.8,alertX:32};
const scaleAlert=art=>group(art,'transform="translate(32 0) scale(0.8)" data-part="scaled-alert"');
const attrs=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const bang=(x,y,w=30,h=66,c=amber)=>rect(x,y,w,h,c)+rect(x,y+h+12,w,Math.round(w*.75),c);
function pending(){
  return group(rect(20,12,280,32,dark)+rect(20,40,280,4,amber)+bang(32,17,7,11)+
    [0,1,2].map(i=>rect(137+i*17,24,8,8,amber)).join('')+rect(271,21,12,12,amber),'data-part="pending-request"');
}
function moodCorners(mood,phase=0){
  if(mood==='grumpy')return [22,272].map(x=>at(x,18,path('M0 8h8V0h5v13H0ZM20 0h5v8h8v5H20ZM0 20h13v13H8v-8H0ZM20 20h13v5h-8v8h-5Z',palette.red))).join('');
  if(mood==='sad')return [25,282].map((x,j)=>[0,1,2,3].map(i=>rect(x+(i%2)*5,94+i*20+((phase+j)%2)*6,7,9,[palette.blue,palette.water,palette.lightWater][i%3])).join('')).join('');
  if(mood==='excited')return [20,288].map(x=>[40,61,82].map((y,i)=>rect(x,y+(phase%2)*4,12,5,i%2?palette.cheek:amber)).join('')).join('');
  if(mood==='happy')return star(22,22,22,palette.cheek)+star(276,20,22,amber);
  if(mood==='proud')return [24,280].map(x=>rect(x,22,16,4,palette.ink)+rect(x,22,4,18,palette.ink)).join('');
  if(mood==='curious')return rect(23,30+phase%2*18,8,34,palette.blue)+rect(285,53-phase%2*18,8,20,palette.blue);
  return [23,289].map(x=>rect(x,28,7,45,palette.blue)+rect(x,176,7,27,palette.blue)).join('');
}
function knockGraphic(mood,signal=false){
  return group(rect(26,24,268,192,amber)+rect(36,34,248,172,dark)+rect(47,45,197,149,panel)+
    rect(56,54,178,7,amber)+rect(56,177,178,7,amber)+rect(237,116,17,20,amber)+
    bang(120,68,30,62,signal?palette.ink:amber)+moodCorners(mood),'data-part="giant-knock-panel"');
}
function warningGraphic(mood,pulse=false,phase=0){
  const c=mood==='grumpy'?palette.red:amber,b=pulse?12:7;
  return group(rect(16,18,288,204,panel)+rect(16+b,18+b,288-2*b,204-2*b,dark)+
    rect(16,18,288,b,c)+rect(16,222-b,288,b,c)+rect(16,18,b,204,c)+rect(304-b,18,b,204,c)+
    bang(pulse?139:144,pulse?47:54,pulse?42:32,pulse?88:76,amber)+
    (pulse?[31,274].map(x=>rect(x,96,15,48,amber)).join(''):'')+moodCorners(mood,phase),'data-part="giant-warning-card"');
}
function bellGraphic(mood,swing=0,ring=false,phase=0){
  const x=160+swing,y=38;
  const bell=at(x-100,y,path('M75 0h50v12h28v18h18v70h13v16h16v20H0v-20h16v-16h13V30h18V12h28Z',amber)+
    rect(42,40,15,59,palette.ink)+rect(60,26,22,12,palette.ink)+rect(88,-13,24,13,palette.prop)+
    rect(83+swing,136,34,17,palette.prop)+rect(92+swing,153,16,7,palette.ink));
  const rays=ring?[0,1,2].map(i=>rect(20+i*10,64+i*32,9,18,amber)+rect(290-i*10,64+i*32,9,18,amber)).join(''):'';
  return group(rect(16,19,288,205,dark)+bell+rays+moodCorners(mood,phase),'data-part="giant-bell"');
}
export function requestPlan(asset){
  const spec=requestPerformance(asset),v=asset.variation;
  const beats=spec.hits,signal=Number((beats.at(-1)+.36).toFixed(6));
  const retreat=Number((signal+1.65+(v===3?.18:0)).toFixed(6));
  const poses=[[0,'home']];
  beats.forEach((t,i)=>{
    const lead=Math.min(.16,i?(t-beats[i-1])*.32:t-.02);
    const tail=Math.min(spec.tail||.18,i<beats.length-1?(beats[i+1]-t)*.55:.32);
    poses.push([t-lead,'prepare-'+i],[t-lead*.45,'swing-'+i],[t,'knock-'+i],
      [t+tail*.3,'ripple-'+i],[t+tail*.65,'settle-'+i],[t+tail,'pause']);
  });
  poses.push([signal,'reveal']);
  if(v!==3)poses.push([signal+.24,'ready']);
  if(v===2)poses.push([signal+.85,'pulse'],[signal+1.11,'ready']);
  if(v===3)poses.push([signal+.24,'swing-back'],[signal+.44,'ready'],[signal+.70,'swing-small'],[signal+.92,'ready']);
  poses.push([retreat,'retreat'],[retreat+.18,'leaving'],[retreat+.36,'home'],[asset.seconds,'home']);
  poses.sort((a,b)=>a[0]-b[0]);
  return {beats,signal,retreat,poses};
}
function alertStory(asset,plan){
  const unique=[...new Set(plan.poses.map(p=>p[1]))],v=asset.variation,p=alertProfiles[asset.mood];
  const drawings=unique.map(pose=>{
    if(pose==='home'||pose==='pause')return '';
    if(/^(prepare|swing|knock|ripple|settle)-\d+$/.test(pose))return drawRequestPerformance(asset,pose,plan,p);
    const reveal=pose==='reveal',pulse=reveal||pose==='pulse';
    const swing=reveal?p.recoil*2:pose==='swing-back'?-p.recoil*2:pose==='swing-small'?p.recoil:0;
    const art=v===1?knockGraphic(asset.mood,reveal):v===2?warningGraphic(asset.mood,pulse,pose==='pulse'?1:0):bellGraphic(asset.mood,swing,reveal);
    const y=pose==='retreat'?-48:pose==='leaving'?-168:0;
    return scaleAlert(at(0,y,art));
  });
  return group(unique.map((pose,i)=>{
    const values=plan.poses.map(p=>Number(p[1]===pose)).join(';');
    return group(`<animate attributeName="opacity" values="${values}" keyTimes="${plan.poses.map(p=>Number((p[0]/asset.seconds).toFixed(9))).join(';')}" dur="${asset.seconds}s" begin="0s" repeatCount="indefinite" calcMode="discrete"/>`+drawings[i],`opacity="${i===0?1:0}" data-pose="${pose}"`);
  }).join(''),'data-part="request-alert"');
}
export function renderNeedsYou(asset){
  const p=alertProfiles[asset.mood],plan=requestPlan(asset),id='boop-alert-'+asset.mood+'-'+asset.variation;
  const ctx={mood:asset.mood,state:'needs_you',variant:asset.variation,quiet:false,complete:false,motion:true,ink:palette.ink,bg:palette.black,cheek:palette.cheek,suppressDecor:true};
  const spec=requestPerformance(asset);
  const faceBeats=plan.poses.map(([t,pose])=>{
    const i=Number(pose.split('-').at(-1)),dir=Number.isFinite(i)?Math.sign(spec.points[i][0]-160)||1:1;
    const shift=pose.startsWith('prepare-')?[dir,-1]:pose.startsWith('swing-')?[dir*2,-2]:pose.startsWith('knock-')?[dir*2,p.recoil]:pose.startsWith('ripple-')?[-dir,-1]:[0,0];
    return [t,...shift];
  });
  ctx.actorMotion=move(ctx,faceBeats.map(b=>`${b[1]} ${b[2]}`).join(';'),asset.seconds,faceBeats.map(b=>b[0]/asset.seconds).join(';'));
  if(asset.mood==='sad')ctx.tearOverride=rect(79,111,7,9,palette.blue)+rect(232,111,7,9,palette.lightWater);
  const art=face(ctx)+pending()+alertStory(asset,plan);
  // Reduced-motion fallback: a large static alert band and the mood face below.
  const staticArt=scaleAlert(at(0,46,face({...ctx,motion:false,actorMotion:''}))+rect(16,10,288,105,dark)+
    rect(16,10,288,6,amber)+rect(16,109,288,6,amber)+bang(143,24,28,47)+moodCorners(asset.mood));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240" id="${id}" data-mood="${asset.mood}" data-state="needs_you" data-variant="${asset.variation}" data-loop-seconds="${asset.seconds}" data-text-top="192" role="img" aria-labelledby="${id}-title ${id}-desc" shape-rendering="crispEdges" overflow="hidden"><title id="${id}-title">${label(asset.mood)} · ${attrs(asset.name)}</title><desc id="${id}-desc">${attrs(spec.story)} Boop uses ${p.look}, with matching face recoil and material-specific contact sounds. Props and soft paws use large filled pixel surfaces, without cursor marks or detailed hands. The signature ding reveals a large request signal reduced to 80 percent size. The bottom 48 pixels remain clear for text. It reveals Boop again and stays visibly pending. No approval or completion is implied.</desc><defs><clipPath id="${id}-art-area" clipPathUnits="userSpaceOnUse"><rect width="320" height="192"/></clipPath></defs><style>#${id} .alert-still{display:none}@media(prefers-reduced-motion:reduce){#${id} .alert-motion{display:none}#${id} .alert-still{display:inline}}</style><rect width="320" height="240" fill="${palette.black}"/><g data-part="notification-stage" clip-path="url(#${id}-art-area)"><g class="alert-motion">${closeTimelines(art,asset.seconds,'indefinite')}</g><g class="alert-still">${staticArt}</g></g><g data-part="reserved-text-zone" data-y="192" data-height="48"/></svg>\n`;
}
export function needsYouScore(asset){
  const p=alertProfiles[asset.mood],plan=requestPlan(asset),spec=requestPerformance(asset),v=asset.variation,events=[];
  // The signature pitch/timbre never changes with mood. Only supporting taps,
  // rhythm and dynamics vary, so questions and approvals share one identity.
  const add=(at,effect,gain,label,pose)=>events.push({at:Number(at.toFixed(6)),effect,gain:Number(gain.toFixed(4)),pitch:effect==='alertDing'?1:p.pitch,label,sync:{part:'request-alert',pose,frame:null}});
  plan.beats.forEach((t,i)=>add(t,spec.effect,p.gain*p.tapGain*(spec.level||1)*(asset.mood==='determined'?1:i%2===0?.95:1),spec.name+' · '+(i+1)+' / '+plan.beats.length,'knock-'+i));
  add(plan.signal,'alertDing',p.gain,'Ding · notification appears','reveal');
  return {id:asset.id,seconds:asset.seconds,policy:'entry',intervalSeconds:0,tailSeconds:0,character:spec.name,
    description:spec.story+' Then the signature ding reveals '+['a large request panel','a pulsing warning card','a gently swinging bell'][v-1]+'. The bottom 20% stays clear for text; the request stays pending.',events};
}
