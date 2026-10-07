// Compile independent SMIL tracks onto one asset-local clock. No JS runtime
// is embedded in the SVG. Repeating the SVG N times repeats every track N times.
export function loopSpec(mood,state,variant,workSeconds){
  let seconds=state==="working"?(mood==="sad"&&variant===1?6.4:workSeconds):
    ({idle:[8,10,9],needs_you:[6,7.2,6.4],task_complete:[6.4,7.2,6.4],listening:[6.4,7.2,6.8],asleep:[9,10,12],no_app:[9,10,12]})[state][variant-1];
  return {seconds,seam_hold_seconds:.04,default_repeat_count:"indefinite",recommended_repeat_count:["needs_you","task_complete"].includes(state)?1:"indefinite",boundary:"Same complete frame at start, end and finite stop; effects share the clip clock"};
}
const num=n=>String(Number(n.toFixed(8)));
function sample(values,times,p,linear){
  let i=0;while(i+1<times.length&&times[i+1]<=p+1e-9)i++;
  if(!linear||i===times.length-1)return values[i];
  const f=(p-times[i])/(times[i+1]-times[i]);
  if(/^#[0-9a-f]{6}$/i.test(values[i])){
    const rgb=v=>[1,3,5].map(k=>parseInt(v.slice(k,k+2),16));
    return "#"+rgb(values[i]).map((c,k)=>Math.round(c+(rgb(values[i+1])[k]-c)*f).toString(16).padStart(2,"0")).join("");
  }
  return num(Number(values[i])+(Number(values[i+1])-Number(values[i]))*f);
}
function returnValues(from,to,attribute){
  if(attribute!=="transform")return [to];
  const a=from.split(/\s+/).map(Number),b=to.split(/\s+/).map(Number);
  return [.33,.67,1].map(f=>a.map((v,i)=>Math.round(v+(b[i]-v)*f)).join(" "));
}
export function closeTimelines(art,seconds,repeatCount="indefinite"){
  if(repeatCount!=="indefinite"&&(!Number.isInteger(repeatCount)||repeatCount<1||repeatCount>100))throw new Error("repeatCount must be 1–100 or indefinite");
  const guard=.04;
  return art.replace(/<(animate|animateTransform)\b([^>]*?)\/>/g,(_,tag,attrs)=>{
    const a=Object.fromEntries([...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    const values=a.values.split(";"),times=a.keyTimes.split(";").map(Number),duration=parseFloat(a.dur),begin=parseFloat(a.begin||"0"),linear=a.calcMode==="linear";
    const oneShot=a.repeatCount==="1";
    let events=[],at;
    if(oneShot){
      // Keep the action in forward order. If a pose changes, recover during the
      // unused tail; burst transforms may reset while their parent is hidden.
      const end=Math.min(begin+duration,seconds-.55),scale=(end-Math.max(0,begin))/duration;
      const start=Math.max(0,begin);
      events=times.map((p,i)=>[start+p*duration*scale,values[i]]);
      if(start>0)events.unshift([0,values[0]]);
      if(values.at(-1)!==values[0]){
        const recovery=returnValues(values.at(-1),values[0],a.attributeName);
        recovery.forEach((v,i)=>events.push([seconds-.44+(i+1)*.1,v]));
      }
      at=t=>{
        let i=0;while(i+1<events.length&&events[i+1][0]<=t+1e-9)i++;
        return events[i][1];
      };
    }else{
      // Fit a whole number of local cycles, retaining relative particle phase.
      const cycles=Math.max(1,Math.round(seconds/duration)),period=seconds/cycles,phase=begin/duration;
      at=t=>{let p=((t/period-phase)%1+1)%1;return sample(values,times,p,linear);};
      for(let k=Math.floor(-phase)-1;k<=cycles+Math.ceil(Math.abs(phase))+1;k++)for(const p of times){
        const t=(k+p+phase)*period;if(t>0&&t<seconds)events.push([t,at(t)]);
      }
    }
    const initial=at(0);
    const points=[[0,initial],[guard,initial],...events.filter(([t])=>t>guard&&t<seconds-guard),[seconds-guard,initial],[seconds,initial]];
    points.sort((a,b)=>a[0]-b[0]);
    const compact=[];
    for(const point of points){
      if(compact.length&&Math.abs(point[0]-compact.at(-1)[0])<1e-7)compact[compact.length-1]=point;
      else compact.push(point);
    }
    a.values=compact.map(p=>p[1]).join(";");a.keyTimes=compact.map(p=>num(p[0]/seconds)).join(";");
    a.dur=num(seconds)+"s";a.begin="0s";a.repeatCount=String(repeatCount);a.fill="freeze";
    return `<${tag} ${Object.entries(a).map(([k,v])=>`${k}="${v}"`).join(" ")}/>`;
  });
}
