import {palette,rect,path,group,at,star} from './visual/base.mjs';

// Native 320 × 192 action area; the bottom 48 px belongs to host text.
// Each kind is a different performance, not a palette swap of one tap sprite.
export const requestPerformances={
  happy:[
    {kind:'pillow',name:'Friendly pillow pats',hits:[.42,1.02],points:[[56,165],[264,165]],effect:'alertSoftTap',story:'Two broad soft pats alternate left and right, with a happy bounce.'},
    {kind:'envelope',name:'Bouncy invitation',hits:[.44,.84,1.24],points:[[64,159],[160,151],[256,159]],effect:'alertPaperTap',story:'An invitation envelope hops across the glass and opens its flap.'},
    {kind:'gift',name:'A little delivery',hits:[.56,1.18],points:[[148,151],[180,151]],effect:'alertSoftTap',story:'A little parcel bumps the glass; its lid pops up to reveal a request card.'}
  ],
  excited:[
    {kind:'pinball',name:'Everywhere at once',hits:[.26,.44,.62,.80,.98,1.16],points:[[42,74],[272,151],[276,72],[44,155],[160,164],[160,69]],effect:'alertSoftTap',story:'Six rapid, broad pats jump around the screen, with a fading trail.'},
    {kind:'ball',name:'Ricochet hello',hits:[.28,.50,.72,.94,1.16],points:[[46,105],[136,164],[274,94],[236,164],[160,69]],effect:'alertRubberTap',story:'A chunky ball ricochets across the glass, squashing at each impact.'},
    {kind:'cord',name:'Overeager alert cord',hits:[.32,.54,.76,1.08],points:[[274,111],[274,137],[274,117],[274,146]],effect:'alertRubberTap',story:'Boop repeatedly yanks an oversized pull-cord; its soft knob springs back.'}
  ],
  proud:[
    {kind:'stamp',name:'Royal summons',hits:[.56,1.20],points:[[96,159],[224,159]],effect:'alertKnock',story:'A grand stamp lands twice, leaving a bold request seal rather than an approval check.'},
    {kind:'cane',name:'Gentlemanly cane tap',hits:[.56,1.30],points:[[52,167],[68,167]],effect:'alertKnock',story:'A chunky hooked cane lifts and taps the glass with theatrical composure.'},
    {kind:'curtain',name:'Ahem, spotlight',hits:[.50,1.18],points:[[52,139],[268,139]],effect:'alertSoftTap',story:'Two curtains sweep inward with soft thumps, then part to present Boop.'}
  ],
  curious:[
    {kind:'lens',name:'Inspect the glass',hits:[.46,.94,1.34],points:[[48,83],[264,103],[164,143]],effect:'alertKnock',story:'An oversized magnifying glass inspects three places, bumping its rim against the glass.'},
    {kind:'keycap',name:'Is this the button?',hits:[.48,.94,1.28],points:[[60,161],[160,161],[260,161]],effect:'alertKeyboardTap',story:'A giant question-mark keycap probes different spots, compressing on each press.'},
    {kind:'periscope',name:'Who is out there?',hits:[.48,1.02,1.40],points:[[92,112],[228,96],[180,70]],effect:'alertKnock',story:'A chunky periscope extends, changes direction and nudges the screen.'}
  ],
  determined:[
    {kind:'palms',name:'Steady two-paw request',hits:[.32,.64,.96],points:[[136,166],[160,166],[184,166]],effect:'alertKnock',story:'Two simple soft pads press in lockstep: three firm, even beats.'},
    {kind:'press',name:'Press the request',hits:[.38,.68,.98],points:[[160,164],[160,164],[160,164]],effect:'alertKeyboardTap',story:'A chunky plunger presses a large request button three times with mechanical precision.'},
    {kind:'blocks',name:'Build a step',hits:[.36,.68,1.00],points:[[56,166],[56,126],[56,86]],effect:'alertKnock',story:'Three big blocks stack upward so Boop can reach higher and demand attention.'}
  ],
  grumpy:[
    {kind:'keyboard',name:'Keyboard ultimatum',hits:[.34,.60,.84,1.08],points:[[106,160],[212,153],[126,160],[204,153]],effect:'alertKeyboardTap',story:'Boop brandishes a keyboard side to side, then bashes its broad face against the glass.'},
    {kind:'brick',name:'Brick negotiation',hits:[.44,.74,1.12],points:[[110,152],[206,156],[158,152]],effect:'alertBrickTap',story:'A big brick winds up and thumps the glass; chunky stress marks appear and clear.'},
    {kind:'tantrum',name:'Two-paw tantrum',hits:[.25,.43,.61,.79,1.06],points:[[48,163],[272,163],[48,163],[272,163],[160,163]],effect:'alertKnock',story:'Heavy broad pats alternate sides, ending with a simultaneous two-paw shove.'}
  ],
  sad:[
    {kind:'poke',name:'Is anybody there?',hits:[.70,1.70],points:[[268,166],[252,161]],effect:'alertSoftTap',level:.80,tail:.30,story:'One simple soft puff hesitates, makes two light pokes, then retreats.'},
    {kind:'lean',name:'Please notice me',hits:[.74,1.86],points:[[160,153],[160,153]],effect:'alertSoftTap',level:.85,tail:.34,story:'Two soft pads press and slowly slip down the glass while Boop waits tearfully.'},
    {kind:'tissue',name:'Tissue-box plea',hits:[.84,1.96],points:[[244,151],[260,155]],effect:'alertPaperTap',level:.75,tail:.32,story:'A tissue rises from a little box, pats the glass and folds back down.'}
  ]
};

export function requestPerformance(asset){return requestPerformances[asset.mood][asset.variation-1];}
const white=palette.ink,blue=palette.blue,coral=palette.cheek,amber=palette.amber,black=palette.black;
const chunky=(x,y,w,h,c=white)=>at(x-w/2,y-h/2,rect(8,0,w-16,h,c)+rect(0,8,w,h-16,c));
function contact(x,y,phase,force=1){
  const w=8*Math.round(5+force*2)-(phase===2?8:0),h=phase===0?24:32;
  return group(chunky(x,y,w,h),`data-part="tap-surface" data-cell="8" opacity="${phase===0?.92:phase===1?.5:.22}"`);
}
function smallBoard(x,y,w=96,h=32){
  return at(x-w/2,y-h/2,rect(0,0,w,h,palette.prop)+rect(8,4,w-16,h-8,black)+
    [0,1,2,3,4,5].map(i=>rect(12+i*12,8,8,8,white)).join('')+rect(24,h-12,w-48,8,white));
}
function brick(x,y,w=72,h=32){
  return at(x-w/2,y-h/2,rect(0,0,w,h,coral)+rect(0,0,w,8,'#FF9E9A')+
    rect(0,h/2,w,6,'#B95060')+rect(w/3,8,6,h/2-8,'#B95060')+rect(w*2/3,h/2,6,h/2,'#B95060'));
}
function envelope(x,y,open=false){
  return at(x-32,y-20,rect(0,8,64,32,white)+path(open?'M0 8h16V0h32v8h16v8H0Z':'M0 8h16v8h16v8h16v-8h16v-8H0Z',blue)+rect(24,24,16,8,coral));
}
function questionKey(x,y,hit){
  return at(x-28,y-(hit?16:24),chunky(28,hit?16:24,56,hit?32:48,white)+
    path('M16 8h24v8h-8v8h-8V16h-8ZM24 28h8v8h-8Z',blue));
}

// All special effects remain composed of chunky filled surfaces or 8 px blocks.
export function drawRequestPerformance(asset,pose,plan,profile){
  const spec=requestPerformance(asset),index=Number(pose.split('-').at(-1));
  const stage=pose.startsWith('prepare-')?-2:pose.startsWith('swing-')?-1:pose.startsWith('knock-')?0:pose.startsWith('ripple-')?1:2;
  const hit=stage===0,after=stage>0,phase=Math.max(0,stage),last=index===spec.hits.length-1;
  const target=spec.points[index],previous=spec.points[Math.max(0,index-1)];
  const blend=stage===-2?.45:stage===-1?.8:1;
  const x=Math.round(previous[0]+(target[0]-previous[0])*blend);
  const y=Math.round(previous[1]+(target[1]-previous[1])*blend)+(stage<0?-16:stage===1?-4:0);
  const pad=(px=x,py=y,force=profile.impact)=>contact(px,py,phase,force);
  const lift=stage===-2?-24:stage===-1?-12:stage===1?-8:0;
  let art='';
  switch(spec.kind){
    case 'pillow':
      art=stage<0?chunky(x,y,32,40):pad();
      if(hit)art+=star(x+(index%2?-36:36),y-24,16,coral);
      break;
    case 'envelope':art=envelope(x,y+lift,last&&after)+(hit?group(pad(), 'opacity=".16"'):'');break;
    case 'gift':{
      const lid=last&&after?-24:stage<0?-8:0;
      art=at(x-32,y-16,rect(0,0,64,32,blue)+rect(24,0,16,32,white)+rect(-8,-8+lid,80,8,coral)+rect(16,-24+lid,16,16,coral)+rect(32,-24+lid,16,16,coral));
      if(last&&after)art+=at(x-12,y-34,rect(0,0,24,24,white)+rect(8,0,8,12,amber)+rect(8,16,8,8,amber));
      break;
    }
    case 'pinball':
      if(index>0)art+=group(contact(previous[0],previous[1],2,profile.impact),'opacity=".4"');
      art+=stage<0?chunky(x,y,32,32):pad();break;
    case 'ball':
      if(index>0)art+=[.35,.65].map(f=>rect(Math.round(previous[0]+(x-previous[0])*f)-4,Math.round(previous[1]+(y-previous[1])*f)-4,8,8,blue)).join('');
      art+=chunky(x,y,hit?64:40,hit?24:40,blue)+rect(x-8,y-8,16,8,white);break;
    case 'cord':art=rect(270,40,8,Math.max(8,y-40),white)+chunky(274,y,hit?56:40,hit?24:40,coral);break;
    case 'stamp':
      if(after)art+=at(x-24,y-12,rect(0,0,48,24,amber)+rect(16,0,8,12,black)+rect(16,16,8,8,black));
      art+=at(x-32,y-24+lift,rect(20,-24,24,24,blue)+rect(8,0,48,16,palette.prop)+rect(0,16,64,16,white));break;
    case 'cane':art=at(x-8,y-64+lift,path('M0 0h32v8h8v16h-8V8H8v56H0Z',amber))+(hit?pad(x,y,.9):'');break;
    case 'curtain':{
      const w=hit?88:stage<0?56:32;
      art=[8,312-w].map(cx=>rect(cx,48,w,120,coral)+rect(cx+8,48,8,120,'#B95060')+rect(cx+w-16,48,8,120,'#B95060')).join('');
      if(hit)art+=pad(index%2?248:72,164);break;
    }
    case 'lens':art=at(x-28,y-28+lift,chunky(28,28,56,56,blue)+rect(12,12,32,32,black)+rect(20,20,16,8,white)+rect(40,48,16,24,white));break;
    case 'keycap':art=questionKey(x,y+lift,hit);break;
    case 'periscope':art=rect(152,Math.min(y,176),16,Math.max(8,176-y))+rect(Math.min(160,x),y-8,Math.max(16,Math.abs(x-160)),16,blue)+chunky(x,y,40,32,blue)+rect(x-8,y-8,16,16,white)+rect(136,176,48,8,palette.prop);break;
    case 'palms':art=pad(x-40,y)+pad(x+40,y);break;
    case 'press':art=rect(112,172,96,12,blue)+chunky(160,160,72,24,amber)+rect(152,108+lift,16,hit?48:32,white)+chunky(160,108+lift,64,24,blue);break;
    case 'blocks':
      for(let i=0;i<index;i++)art+=at(36,150-i*40,rect(0,0,40,32,blue)+rect(8,8,24,8,white));
      art+=at(x-20,y-16+lift,rect(0,0,40,32,hit?white:blue)+rect(8,8,24,8,hit?blue:white));break;
    case 'keyboard':
      art=smallBoard(x+(stage<0?(index%2?20:-20):0),y+lift,hit?112:96,hit?32:24);
      if(after)art+=rect(x-64,y-20,8,8,white)+rect(x+56,y-28,8,8,white);
      if(hit)art+=group(pad(x,y,1.4),'opacity=".25"');break;
    case 'brick':
      art=brick(x+(stage<0?(index%2?28:-28):0),y+lift,hit?88:72,32);
      if(hit||stage===1)art+=path(`M${x-48} ${y-20}h-16v-16h-8v24h24ZM${x+40} ${y+8}h24v16h8V${y}h-32Z`,white);
      break;
    case 'tantrum':
      art=last?pad(56,164,1.4)+pad(264,164,1.4):stage<0?chunky(x,y,40,40):pad(x,y,1.4);
      if(hit)art+=rect(index%2?24:288,100,8,8,palette.prop)+rect(index%2?32:280,84,8,8,palette.prop);break;
    case 'poke':art=chunky(x,y+(stage<0?16:after?phase*4:0),hit?40:32,hit?24:32,white);break;
    case 'lean':{
      const slip=stage<0?0:phase*8;art=chunky(64,153+slip,hit?56:40,24)+chunky(256,153+slip,hit?56:40,24);
      art+=rect(84,133+slip,8,8,blue)+rect(232,125+slip,8,8,palette.water);break;
    }
    case 'tissue':{
      art=at(208,160,rect(0,0,72,24,blue)+rect(8,0,56,8,black));
      const h=hit?40:stage===2?24:48;
      art+=at(x-20,y-h+16+(stage<0?8:0),path(`M8 0h24v8h8v${h-16}h-8v8H8v-8H0V8h8Z`,white)+rect(8,h-16,24,8,palette.prop));
      if(after)art+=rect(x+24,y-8,8,8,blue);break;
    }
    default:throw new Error('Unknown request performance '+spec.kind);
  }
  return group(art,`data-part="request-performance" data-kind="${spec.kind}" data-stage="${stage}" data-target-x="${target[0]}" data-target-y="${target[1]}"${stage===2?' opacity=".55"':''}`);
}
