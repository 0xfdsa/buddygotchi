// Inspect our generated SVG timelines, not historical captions or guessed tempos.
export function tracksFromSVG(svg){
  const stack=[],tracks=[];
  for(const match of svg.matchAll(/<(\/?)([\w:-]+)\b([^>]*?)(\/?)>/g)){
    const [,closing,tag,tail,self]=match;
    if(closing){stack.pop();continue;}
    const attrs=Object.fromEntries([...tail.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    if((tag==='animate'||tag==='animateTransform')&&attrs.keyTimes){
      const parent=stack.at(-1),part=[...stack].reverse().find(x=>x.attrs['data-part'])?.attrs['data-part'];
      tracks.push({part,parent:parent?.attrs||{},attribute:attrs.attributeName,type:attrs.type,values:attrs.values.split(';'),times:attrs.keyTimes.split(';').map(t=>Number(t)*parseFloat(attrs.dur)),sync:attrs['data-audio-sync']});
    }
    if(!self)stack.push({tag,attrs});
  }
  return tracks;
}
export function entrances(tracks,part){
  const events=[];
  for(const track of tracks.filter(t=>t.part===part&&t.attribute==='opacity')){
    const frame=track.parent['data-frame'],pose=track.parent['data-pose'];
    if(frame===undefined&&pose===undefined)continue;
    for(let i=1;i<track.values.length;i++)if(Number(track.values[i])===1&&Number(track.values[i-1])===0)
      events.push({at:Number(track.times[i].toFixed(6)),frame:frame===undefined?null:Number(frame),pose:pose||null,part});
  }
  return events.sort((a,b)=>a.at-b.at);
}
