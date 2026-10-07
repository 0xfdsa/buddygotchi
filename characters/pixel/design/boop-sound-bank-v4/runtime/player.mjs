import {makeScene,synthesizeCue,chooseVariation,sceneEvents} from './bank.mjs';
import {cycleHasSound} from './score.mjs';
import {sustainedStates} from './state-catalog.mjs';
import {protectedSoundStates} from './quiet-mix.mjs';

// Browser/WebView reference player. No network, audio files, or hidden autoplay.
export function createBoopPlayer({mount,audioContext=null,volume=.4,onProgress=()=>{},onStatus=()=>{},onCue=()=>{},cacheLimitBytes=8*1024*1024}={}){
  if(!mount)throw new Error('A mount element is required');
  let ctx=audioContext,owned=!audioContext,master=null,session=null,generation=0,raf=0,timer=0,disposed=false,lastPair=null,previousId=null,duck=false;
  const cache=new Map();let cacheBytes=0,scheduled=0,lateSkipped=0;
  const reduced=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const clamp=x=>Math.max(0,Math.min(.8,Number(x)||0));let level=clamp(volume);
  const report=(phase,extra={})=>onStatus({phase,...extra});
  function draw(t){const svg=mount.querySelector('svg');if(svg){svg.pauseAnimations();svg.setCurrentTime(reduced?.matches?0:t);}}
  function show(id){if(disposed)throw new Error('Player is disposed');const scene=makeScene(id);mount.innerHTML=scene.svg;draw(0);return scene;}
  function audibleTime(){const stamp=ctx.getOutputTimestamp?.();if(stamp?.contextTime>0&&stamp?.performanceTime>0)return Math.min(ctx.currentTime,stamp.contextTime+Math.max(0,performance.now()-stamp.performanceTime)/1000);return Math.max(0,ctx.currentTime-(ctx.outputLatency||0));}
  function stop({clearState=true,notify=true}={}){
    generation++;cancelAnimationFrame(raf);clearInterval(timer);
    const old=session;session=null;
    if(old&&ctx){old.bus.gain.cancelScheduledValues(ctx.currentTime);old.bus.gain.setValueAtTime(old.bus.gain.value,ctx.currentTime);old.bus.gain.linearRampToValueAtTime(0,ctx.currentTime+.018);for(const source of old.sources){try{source.stop(ctx.currentTime+.020);}catch{}}setTimeout(()=>old.bus.disconnect(),50);}
    draw(0);if(clearState)lastPair=null;if(notify)report('stopped');
  }
  async function ready(){
    if(!ctx){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)throw new Error('Web Audio is unavailable.');ctx=new C();}
    if(!master){master=ctx.createGain();master.gain.value=level;master.connect(ctx.destination);}
    await ctx.resume();if(ctx.state!=='running')throw new Error('Audio needs an enabled user gesture.');
  }
  function key(event,seed){return `${event.effect}:${event.pitch}:${seed}:${ctx.sampleRate}`;}
  function buffer(event,seed){
    const k=key(event,seed);if(cache.has(k)){const b=cache.get(k);cache.delete(k);cache.set(k,b);return b;}
    const samples=synthesizeCue(event,seed,ctx.sampleRate),bytes=samples.byteLength;
    const b=ctx.createBuffer(1,samples.length,ctx.sampleRate);b.copyToChannel(samples,0);
    while(cacheBytes+bytes>cacheLimitBytes&&cache.size){const first=cache.keys().next().value;cacheBytes-=cache.get(first).length*4;cache.delete(first);}
    if(bytes<=cacheLimitBytes){cache.set(k,b);cacheBytes+=bytes;}return b;
  }
  function schedule(s,event,at,cycle){
    if(at<ctx.currentTime-.030){lateSkipped++;return;}
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer(event,s.seed);gain.gain.value=event.gain;source.connect(gain);gain.connect(s.bus);s.sources.add(source);
    source.onended=()=>{s.sources.delete(source);source.disconnect();gain.disconnect();};
    source.start(Math.max(ctx.currentTime,at));scheduled++;onCue({id:s.scene.asset.id,effect:event.effect,cycle,scheduledAt:at,localAt:event.at,label:event.label});
  }
  function pump(s){
    if(session!==s||!s.scene.score.events.length)return;
    const horizon=ctx.currentTime+.16;
    while(s.cycle<s.cycles){
      if(!cycleHasSound(s.scene.score,s.cycle)){
        if(s.scene.score.policy==='entry'||s.scene.score.policy==='silent')return;
        const stride=Math.max(1,Math.ceil(s.scene.score.intervalSeconds/s.scene.asset.seconds));s.cycle=Math.ceil((s.cycle+1)/stride)*stride;s.event=0;continue;
      }
      const events=eventsFor(s,s.cycle);
      if(!events.length){s.cycle++;s.event=0;continue;}
      const event=events[s.event],at=s.start+s.cycle*s.scene.asset.seconds+event.at;
      if(at>horizon)return;
      schedule(s,event,at,s.cycle);s.event++;
      if(s.event===events.length){s.event=0;s.cycle++;}
    }
  }
  function eventsFor(s,cycle){
    if(!s.eventPlans.has(cycle))s.eventPlans.set(cycle,sceneEvents(s.scene,{cycle,seed:s.seed}));
    while(s.eventPlans.size>4)s.eventPlans.delete(s.eventPlans.keys().next().value);
    return s.eventPlans.get(cycle);
  }
  async function playVariation(id,{cycles=1,seed,preserveState=false}={}){
    if(cycles!==Infinity&&(!Number.isInteger(cycles)||cycles<1||cycles>100))throw new Error('cycles must be 1–100 or Infinity');
    if(disposed)throw new Error('Player is disposed');
    stop({clearState:!preserveState,notify:false});const token=generation,scene=show(id);previousId=id;report('preparing',{id});
    seed=seed??(protectedSoundStates.includes(scene.asset.state)?53:Math.floor(Math.random()*4294967296));
    try{
      await ready();if(token!==generation)return null;
      const candidates=scene.score.mix?.gestures?.flatMap(g=>g.members)||scene.score.events;
      const unique=[...new Map(candidates.map(e=>[key(e,seed),e])).values()];
      for(const event of unique){buffer(event,seed);await new Promise(resolve=>setTimeout(resolve,0));if(token!==generation)return null;}
      const bus=ctx.createGain();bus.gain.value=duck&&!protectedSoundStates.includes(scene.asset.state)?.225:.9;bus.connect(master);
      const s={scene,seed,cycles,start:ctx.currentTime+.09,bus,sources:new Set(),cycle:0,event:0,eventPlans:new Map()};session=s;
      const visualDuration=cycles*scene.asset.seconds,total=visualDuration+scene.score.tailSeconds+.025;
      pump(s);timer=setInterval(()=>pump(s),25);report('playing',{id,scene});
      function tick(){
        if(session!==s)return;
        const elapsed=Math.max(0,audibleTime()-s.start),cycle=Math.floor(elapsed/scene.asset.seconds);
        const local=elapsed>=visualDuration?0:elapsed%scene.asset.seconds;draw(local);
        const sounding=cycleHasSound(scene.score,cycle),cue=sounding?eventsFor(s,cycle).filter(e=>e.at<=local).at(-1):null;
        onProgress({elapsed:Math.min(elapsed,visualDuration),duration:visualDuration,cycle:Math.min(cycles,cycle+1),label:elapsed>=visualDuration?'Home frame':cue?.label|| (scene.score.events.length?'Waiting / quiet':'Intentional silence')});
        if(elapsed<total)raf=requestAnimationFrame(tick);
        else{clearInterval(timer);session=null;draw(0);bus.disconnect();report('finished',{id,scene});}
      }
      raf=requestAnimationFrame(tick);return scene;
    }catch(error){if(token===generation){stop({clearState:false,notify:false});report('error',{message:error.message});}throw error;}
  }
  async function setState(pair,{force=false,seed,hostContext={}}={}){
    const stateKey=pair.mood+':'+pair.state+':'+(hostContext.completionOutcome||'')+':'+(hostContext.startContext||'');
    if(stateKey===lastPair&&!force)return null;
    const id=chooseVariation(pair,{previousId,hostContext});lastPair=stateKey;
    return playVariation(id,{cycles:sustainedStates.includes(pair.state)?Infinity:1,seed,preserveState:true});
  }
  function setVolume(value){level=clamp(value);if(master)master.gain.setTargetAtTime(level,ctx.currentTime,.02);}
  function setSpeechActive(active){duck=!!active;if(session)session.bus.gain.setTargetAtTime(duck&&!protectedSoundStates.includes(session.scene.asset.state)?.225:.9,ctx.currentTime,.035);}
  const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);
  const pagehide=()=>stop();globalThis.addEventListener('pagehide',pagehide);
  async function dispose(){stop({notify:false});disposed=true;document.removeEventListener('visibilitychange',visibility);globalThis.removeEventListener('pagehide',pagehide);cache.clear();cacheBytes=0;master?.disconnect();if(owned&&ctx)await ctx.close();}
  return {show,playVariation,setState,stop,setVolume,setSpeechActive,dispose,stats:()=>({cacheBytes,cacheEntries:cache.size,scheduled,lateSkipped,activeSources:session?.sources.size||0,playing:!!session})};
}
