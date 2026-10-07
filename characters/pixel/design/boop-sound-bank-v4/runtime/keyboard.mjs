// One key plan controls the visual flashes and sound down/up strokes.
export const keyPlans={
  steady:{presses:Array.from({length:16},(_,i)=>Number((.05+i*.15).toFixed(6))),hold:.045},
  'key-rain':{presses:Array.from({length:6},(_,i)=>Number((.15+i*.30).toFixed(6))),hold:.07},
  flood:{presses:Array.from({length:20},(_,i)=>Number((.08+i*.32).toFixed(6))),hold:.07},
  turbo:{presses:Array.from({length:16},(_,i)=>Number((.05+i*.10).toFixed(6))),hold:.025}
};
export function syncKeyboard(svg,asset){
  const plan=keyPlans[asset.action];if(!plan)return svg;let tracks=0;
  const revised=svg.replace(/<g([^>]*)>(<animate\s[^>]+\/>)(<rect\s[^>]+\/>)/g,(full,group,anim,rect)=>{
    const attrs=Object.fromEntries([...rect.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    if(![176,185].includes(Number(attrs.y))||Number(attrs.width)!==10||Number(attrs.height)!==4||attrs.fill!=='#F8F7EF')return full;
    const column=(Number(attrs.x)-90)/14;if(!Number.isInteger(column)||column<0||column>9)return full;
    const points=[[0,0]];
    plan.presses.forEach((t,i)=>{if(i%2===column%2)points.push([t,1],[t+plan.hold,0]);});
    points.push([asset.seconds,0]);points.sort((a,b)=>a[0]-b[0]);tracks++;
    const tag=`<animate attributeName="opacity" values="${points.map(p=>p[1]).join(';')}" keyTimes="${points.map(p=>Number((p[0]/asset.seconds).toFixed(9))).join(';')}" dur="${asset.seconds}s" begin="0s" repeatCount="indefinite" calcMode="discrete" fill="freeze" data-audio-sync="key-press"/>`;
    return `<g${group.replace(/opacity="[^"]*"/,'opacity="0"')}>${tag}${rect}`;
  });
  if(tracks!==7)throw new Error(`Expected 7 keyboard tracks for ${asset.id}; found ${tracks}`);
  return revised;
}
