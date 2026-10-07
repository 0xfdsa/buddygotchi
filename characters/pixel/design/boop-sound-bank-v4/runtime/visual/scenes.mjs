import {palette,rect,path,block,group,at,move,opacity,frames,star,keyboardBase,work,flood,splash,trophy,keycap,victoryBackground} from "./base.mjs";

// One primary verb + silhouette per slot. Reusing a face is intentional;
// reusing a whole keyboard scene with different particle counts is not.
export const sceneSpecs={
  happy:[
    ["conveyor","Cheerful conveyor","Hop little parcels into the inbox",5],
    ["piano","Work-song piano","Play the keys like a tiny piano",4],
    ["paper-plane","Paper-plane post","Fold a page, then send it sailing",5],
    ["block-tower","Happy little builder","Stack bright cubes into a tower",5],
    ["stamp","Stamp-dance","Bounce a giant stamp onto a card",4]
  ],
  excited:[
    ["turbo","Turbo keyboard","Pound the keys in a frantic flurry",1.6],
    ["juggle","Too many ideas","Juggle three work cubes overhead",3],
    ["rocket","Keyboard liftoff","A rocket keyboard lifts on square flames",4],
    ["treadmill","Task treadmill","Cards race past on a roller belt",3.6],
    ["pinball","Pinball brain","A bright cube ricochets among bumpers",3]
  ],
  proud:[
    ["pedestal","The grand workstation","A desk rises on a show-off pedestal",5],
    ["conductor","Maestro of the tabs","A baton conducts an orbit of cards",4],
    ["origami","Effortless origami","Fold a plain sheet into a pixel crane",5],
    ["polish","Polish the masterpiece","Buff one work tile to a ridiculous shine",4.5],
    ["one-key","One-key virtuoso","Perform an absurd flourish on one giant key",4]
  ],
  curious:[
    ["magnifier","Under the lens","A giant lens inspects a little specimen",5],
    ["periscope","What is over there?","Extend a periscope, then pivot its eye",5],
    ["explode","How does this work?","Pull a cube apart and rebuild it",5],
    ["maze","Follow the maze","Chase a wandering square through a maze",5],
    ["box","Mystery-box inspection","Lift the lid and peer into the box",5]
  ],
  determined:[
    ["steady","Steady typing","A planted, deliberate keyboard rhythm",2.4],
    ["uphill","One more push","Shove a heavy cube up stepped ground",5],
    ["brick-wall","Brick by brick","Build a wall one block at a time",5],
    ["winch","Haul the workload","Crank a pulley to lift a heavy stack",5],
    ["scissors","Cut through the tangle","Giant scissors snip a knotted strip",4]
  ],
  grumpy:[
    ["key-rain","Keyboard meltdown","Spray keycaps in every direction",1.8],
    ["snap","Bash, bash, SNAP!","Three accelerating desk slams → snap → scatter",3.2],
    ["throw","Smash the fourth wall","Desk hit → three screen hits → cracks → throw",4.4],
    ["crumple","Paper rage, rapid-fire","Crumple and fling three pages: right, left, right",2.7],
    ["boiler","Pressure cooker","Frantic lid rattle → two steam bursts → lid launch",2.4]
  ],
  sad:[
    ["flood","Typing through a flood","Cube tears submerge the keyboard",3.2],
    ["buckets","Bucket brigade","Catch the tears; the buckets overflow",5],
    ["tissue","Never-ending tissue","A printer dispenses an accordion of tissue",5],
    ["umbrella","Rainy-day workstation","Shelter the work under a little umbrella",5],
    ["raft","Keep the work afloat","A work raft bobs on a sea of blue cubes",5]
  ]
};
export const activeNames={
  needs_you:["Knock-knock request","Raise the little flag","Ring for attention"],
  task_complete:["Trophy fireworks","Curtain-call reveal","Onto the podium"],
  listening:["Focused attention","Headphones on","The listening trumpet"]
};
export const activeCaptions={
  needs_you:["Knock on the door, then wait","Unfurl an amber request flag","One little bell gesture, then stillness"],
  task_complete:["Cup entrance + a square-confetti fountain","Curtains open onto the result","A stepped podium rises under the cup"],
  listening:["Four large focus corners frame the face","A pixel headset settles around the face","Lean toward a comically large ear trumpet"]
};
const ink=palette.ink,gray=palette.dim,light=palette.prop,blue=palette.blue,coral=palette.cheek,amber=palette.amber;
const square=(x,y,s,c=ink)=>rect(x,y,s,s,c);
function story(ctx,drawings,seconds,part,once=false,still=2){
  if(!ctx.motion)return group(drawings[Math.min(still,drawings.length-1)],`data-part="${part}"`);
  if(!once)return frames(ctx,drawings,seconds,part);
  if(ctx.loopSeconds){
    const duration=ctx.loopSeconds,returning=["flag-request","podium-rise"].includes(part);
    const beats=drawings.map((_,i)=>[i*seconds/(drawings.length-1),i]);
    if(returning)for(let i=drawings.length-2;i>=0;i--)beats.push([duration-.6+(drawings.length-2-i)*.12,i]);
    else beats.push([duration-.15,0]);
    beats.push([duration,0]);
    return timedStory(ctx,drawings,duration,part,beats.map(b=>b[0]/duration),beats.map(b=>b[1]),still);
  }
  const times=drawings.map((_,i)=>i/(drawings.length-1)).join(";");
  return group(drawings.map((drawing,i)=>group(opacity(ctx,drawings.map((_,j)=>Number(j===i)).join(";"),seconds,times,"1")+drawing,`opacity="${i===0?1:0}" data-frame="${i}"`)).join(""),`data-part="${part}"`);
}
// Anticipation, fast impact/travel, aftermath, reset. The frames stay integer
// aligned; the joke no longer moves at the same speed through all five poses.
function timedStory(ctx,drawings,seconds,part,times,order,still=2){
  if(!ctx.motion)return group(drawings[still],`data-part="${part}"`);
  return group(drawings.map((drawing,i)=>group(opacity(ctx,order.map(j=>Number(j===i)).join(";"),seconds,times.join(";"))+drawing,`opacity="${i===order[0]?1:0}" data-frame="${i}"`)).join(""),`data-part="${part}"`);
}
function miniBoard(x,y,w=154,columns=10,vertical=false){
  let a=rect(0,0,w,28,gray)+rect(3,3,w-6,21,palette.black);
  const cell=Math.floor((w-10)/columns);
  for(let r=0;r<2;r++)for(let c=0;c<columns;c++)a+=rect(6+c*cell,6+r*8,cell-4,5,light);
  a+=rect(Math.floor(w*.3),24,Math.floor(w*.4),3,light);
  return at(x,y,vertical?group(a,'transform="rotate(90)"'):a);
}
function card(x,y,w=26,h=30,c=light){return at(x,y,rect(0,0,w,h,c)+rect(4,5,w-8,3,gray)+rect(4,12,w-12,3,gray)+rect(4,19,7,4,gray));}
function cube(x,y,s=18,c=blue){return at(x,y,square(0,0,s,c)+rect(2,2,s-4,3,ink)+rect(s-4,5,3,s-7,gray));}
function burst(x,y,phase=1,c=amber){return [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1]].map(([dx,dy],i)=>square(x+dx*(8+phase*5),y+dy*(5+phase*4),i%2?3:4,c)).join("");}
function wheel(x,y,r=10,phase=0){return at(x,y,rect(-r,-r,2*r,2*r,gray)+rect(-r+3,-r+3,2*r-6,2*r-6,palette.black)+(phase%2?rect(-r+3,-2,2*r-6,4,light):rect(-2,-r+3,4,2*r-6,light)));}
function note(x,y,c=coral){return at(x,y,rect(6,0,3,15,c)+rect(9,0,7,4,c)+rect(0,12,6,6,c));}
function pixelRod(x,y,tilt,steps=7,c=light){return Array.from({length:steps},(_,i)=>square(x+tilt*i*4,y+i*4,5,c)).join("");}
function flame(x,y,p){return at(x,y,rect(0,0,8,10+p*4,amber)+rect(2,0,4,7+p*3,coral)+square(1,14+p*4,4,amber));}
function splitBoard(x,y,left=true){
  let a=miniBoard(0,0,69,4);
  a+=path(left?"M69 0h7v6h-5v6h6v6h-7v10h-1Z":"M0 0h-7v6h5v6h-6v6h7v10h1Z",light);
  return at(x,y,a);
}
function plane(x,y,size=1){return at(x,y,group(path("M0 12h12V8h12V4h16V0h12v4H40v4H28v4H16v4H8v8H4v-8H0Z",ink)+path("M16 12h24v4H28v4h-8v4h-4Z",blue),`transform="scale(${size})"`));}
function boat(x,y){return at(x,y,path("M0 0h80v5h-6v6h-6v6H12v-6H6V5H0Z",light)+rect(15,3,50,4,ink));}
function steam(x,y,p){return [0,1,2].map(i=>square(x+(i%2?7:-2),y-i*10-p*4,5-i,light)).join("");}

// Seconds, pose, face recoil. Irregularly spaced acting beats, not a speed
// multiplier on V2's five-pose loops. Large impacts do not flash the screen.
export const grumpyTiming={
  snap:{seconds:3.2,still:"apart",hits:[.38,.68,.94],steps:[
    [0,"ready",0,0],[.24,"lift",0,-4],[.38,"slam1",-2,5],[.48,"recoil",2,-3],
    [.68,"slam2",3,5],[.77,"lift",-2,-5],[.94,"slam3",-3,6],[1.05,"strain",0,3],
    [1.2,"crack",0,-4],[1.3,"split",-2,-1],[1.42,"apart",2,1],[1.56,"fly",0,-2],
    [1.86,"fallen",0,2],[1.98,"fall-away",0,1],[2.08,"gone",0,0],[2.16,"feed",0,0],[2.28,"reload",0,1],[2.38,"ready",0,0],[2.44,"tap",0,3],
    [2.58,"ready",0,0],[2.78,"tap",0,2],[2.9,"ready",0,0]
  ]},
  throw:{seconds:4.4,still:"screen3",hits:[.32,.68,1.05,1.48],steps:[
    [0,"ready",0,0],[.18,"lift",0,-5],[.32,"desk",-3,5],[.43,"recoil0",2,-4],
    [.56,"rush0",0,-2],[.68,"screen1",-4,6],[.78,"recoil1",3,-4],
    [.94,"rush1",0,-2],[1.05,"screen2",4,5],[1.16,"recoil2",-3,-5],
    [1.36,"rush2",0,-3],[1.48,"screen3",-4,7],[1.6,"recoil3",3,-3],
    [1.8,"windup",-6,2],[1.96,"release",5,-3],[2.08,"tumble",3,0],
    [2.22,"exit",1,0],[2.36,"empty",0,0],[2.62,"glare",-3,0],
    [2.92,"wipe1",2,0],[3.06,"wipe2",-1,0],[3.2,"clear",0,0],
    [3.26,"feed",0,0],[3.34,"reload",0,2],[3.42,"ready",0,0],[3.48,"tap",0,3],[3.6,"ready",0,-1],
    [3.78,"tap",0,3],[3.91,"ready",0,-2],[4.08,"tap",0,2],[4.2,"ready",0,0]
  ]},
  crumple:{seconds:2.7,still:"ball2",hits:[.31,1.04,1.77],steps:[
    [0,"page0",0,0],[.12,"scrunch0",-3,3],[.23,"squeeze0",3,0],[.31,"ball0",-2,4],
    [.41,"toss0",5,-3],[.51,"flight0",3,0],[.62,"edge0",0,0],
    [.73,"page1",0,1],[.84,"scrunch1",3,3],[.94,"squeeze1",-3,0],[1.04,"ball1",2,4],
    [1.14,"toss1",-5,-3],[1.25,"flight1",-3,0],[1.36,"edge1",0,0],
    [1.46,"page2",0,1],[1.57,"scrunch2",-4,3],[1.67,"squeeze2",4,0],[1.77,"ball2",-2,4],
    [1.87,"toss2",6,-4],[1.98,"flight2",3,0],[2.08,"edge2",0,0],
    [2.2,"pile",0,2],[2.28,"clear1",0,1],[2.36,"clear2",0,0],[2.4,"feed",0,0],[2.48,"reload",0,-1],[2.56,"page0",0,0]
  ]},
  boiler:{seconds:2.4,still:"launch",hits:[.49,.91,1.34],steps:[
    [0,"rest",0,0],[.16,"left",-2,1],[.25,"right",2,-1],[.33,"left",-3,1],
    [.41,"right",3,-1],[.49,"puff1",0,-3],[.6,"left",-2,2],[.69,"right",2,-1],
    [.77,"left",-3,2],[.84,"right",3,-2],[.91,"puff2",0,-4],[1.04,"left",-3,2],
    [1.13,"right",3,-2],[1.22,"squat",0,4],[1.34,"launch",0,-6],[1.45,"high",0,-3],
    [1.61,"fall",0,0],[1.78,"land",-2,3],[1.9,"bounce",2,-2],[2.05,"settle",0,1],[2.2,"rest",0,0]
  ]}
};
export function grumpyActing(ctx){
  const id=sceneSpecs.grumpy[ctx.variant-1][0],plan=grumpyTiming[id];
  if(!plan)return null;
  const steps=[...plan.steps,[plan.seconds,plan.steps[0][1],...plan.steps[0].slice(2)]];
  return move(ctx,steps.map(s=>`${s[2]} ${s[3]}`).join(";"),plan.seconds,steps.map(s=>s[0]/plan.seconds).join(";"));
}
function beatScene(ctx,id,draw){
  const plan=grumpyTiming[id];
  if(!ctx.motion)return group(draw(plan.still),`data-part="story-${id}" data-cycle-seconds="${plan.seconds}"`);
  const poses=[...new Set(plan.steps.map(s=>s[1]))];
  const end=[plan.seconds,plan.steps[0][1]];
  const steps=[...plan.steps,end],times=steps.map(s=>s[0]/plan.seconds).join(";");
  return group(poses.map((pose,i)=>group(opacity(ctx,steps.map(s=>Number(s[1]===pose)).join(";"),plan.seconds,times)+draw(pose),`opacity="${i===0?1:0}" data-pose="${pose}"`)).join(""),`data-part="story-${id}" data-cycle-seconds="${plan.seconds}"`);
}
function deskLine(){return rect(46,218,228,5,gray)+rect(58,223,7,10,gray)+rect(257,223,7,10,gray);}
function hitSquares(level=1){return burst(85,205,level,amber)+burst(235,205,level,amber);}
function crumpled(x,y,s=30){return at(x,y,path(`M5 0h${s-10}v5h5v${s-10}h-5v5H5v-5H0V5h5Z`,light)+rect(7,8,Math.max(2,s-14),3,gray)+rect(Math.min(12,s-5),Math.min(12,s-5),3,Math.max(2,s-17),gray));}
function frontBoard(x,y,w,h){
  let a=rect(x,y,w,h,light)+rect(x+4,y+4,w-8,h-8,gray);
  const cw=Math.floor((w-16)/10),rh=Math.floor((h-16)/2);
  for(let r=0;r<2;r++)for(let c=0;c<10;c++)a+=rect(x+9+c*cw,y+7+r*(rh+3),cw-4,rh,palette.black);
  return a;
}
function glassCracks(level=1){
  // Stair-step orthogonal cracks: square-pixel glass, not smooth vector lines.
  const lines=[
    [[158,178],[158,162],[143,162],[143,148],[128,148],[128,127],[118,127]],
    [[164,174],[180,174],[180,161],[200,161],[200,150],[225,150],[225,141],[258,141]],
    [[158,188],[149,188],[149,200],[127,200],[127,211],[107,211],[107,227]],
    [[174,185],[190,185],[190,197],[214,197],[214,209],[246,209],[246,221],[284,221]],
    [[143,148],[133,148],[133,115],[145,115],[145,94],[131,94],[131,68],[120,68],[120,41]],
    [[128,148],[99,148],[99,155],[68,155],[68,146],[34,146],[34,132],[12,132]],
    [[200,161],[217,161],[217,150],[254,150],[254,135],[284,135],[284,118],[309,118]],
    [[145,94],[159,94],[159,72],[173,72],[173,53],[165,53],[165,27]]
  ];
  const count=[0,2,4,8][level];
  return group(lines.slice(0,count).map(points=>points.slice(1).map(([x,y],i)=>{
    const [px,py]=points[i];return rect(Math.min(px,x),Math.min(py,y),Math.max(3,Math.abs(x-px)+3),Math.max(3,Math.abs(y-py)+3),light);
  }).join("")).join(""),'data-part="screen-cracks" opacity="0.68"');
}
function grumpyActionScene(ctx,id){
  return beatScene(ctx,id,pose=>{
    if(id==="snap"){
      let p=deskLine();
      if(["ready","tap","lift","recoil","slam1","slam2","slam3","strain"].includes(pose)){
        const y=({ready:185,tap:190,lift:163,recoil:167,slam1:190,slam2:190,slam3:190,strain:181})[pose];
        p+=miniBoard(83+(pose==="slam2"?4:pose==="slam3"?-4:0),y);
        if(pose.startsWith("slam"))p+=hitSquares(Number(pose.at(-1)));
        if(["slam3","strain"].includes(pose))p+=path("M158 181h5v9h-4v8h5v10h-6v-11h3v-7h-3Z",coral);
      }else if(pose==="reload"||pose==="feed")p+=miniBoard(83,pose==="feed"?233:205);
      else if(!["empty","gone"].includes(pose)){
        const [d,y]=({crack:[5,182],split:[20,176],apart:[36,176],fly:[56,185],fallen:[64,206],"fall-away":[68,228]})[pose];
        p+=group(splitBoard(83-d,y,true),'data-part="broken-left"')+group(splitBoard(168+d,y+3,false),'data-part="broken-right"');
        if(pose==="crack"||pose==="split")p+=burst(158,188,3,amber)+path("M154 177h5v10h7v11h-5v-7h-7Z",coral);
      }
      return p;
    }
    if(id==="throw"){
      let p=deskLine(),cracks=0;
      if(["ready","tap","lift","desk","recoil0","rush0","reload","feed"].includes(pose)){
        if(pose==="rush0")p+=frontBoard(60,168,200,39);
        else p+=miniBoard(83,({ready:185,tap:190,lift:163,desk:190,recoil0:163,reload:204,feed:233})[pose]);
        if(pose==="desk")p+=hitSquares(2);
      }else if(pose.startsWith("screen")){
        cracks=Number(pose.at(-1));p+=frontBoard(35,154,250,54)+burst(39,168,2,amber)+burst(278,168,2,amber);
      }else if(pose.startsWith("rush")){
        cracks=Number(pose.at(-1));p+=frontBoard(60,168,200,39);
      }else if(pose.startsWith("recoil")){
        cracks=Number(pose.at(-1));p+=miniBoard(90,176);
      }else {
        cracks=["clear","reload","ready","tap"].includes(pose)?0:pose==="wipe2"?1:pose==="wipe1"?2:3;
        if(pose==="windup")p+=miniBoard(37,174);
        if(pose==="release")p+=miniBoard(148,161)+rect(114,190,23,4,light)+rect(97,199,14,3,gray);
        if(pose==="tumble")p+=miniBoard(308,63,154,10,true)+rect(245,193,21,4,light);
        if(pose==="exit")p+=square(302,163,5,gray)+square(288,179,4,gray);
        if(pose==="wipe1"||pose==="wipe2")p+=rect(pose==="wipe1"?113:219,176,32,18,coral);
      }
      return p+(cracks?glassCracks(cracks):"");
    }
    if(id==="crumple"){
      const match=pose.match(/^(page|scrunch|squeeze|ball|toss|flight|edge)([012])$/);
      const cycle=match?Number(match[2]):pose==="reload"?0:2,step=match?.[1]||pose;
      let p=rect(115,223,90,4,gray);
      const clearing=pose==="clear1"?10:pose==="clear2"?27:0;
      const fresh=["reload","feed"].includes(pose);
      if(!fresh&&(cycle>=1||pose==="pile"))p+=crumpled(286,215+clearing,19);
      if(!fresh&&(cycle>=2||pose==="pile"))p+=crumpled(13,216+clearing,18);
      if(pose==="pile"||clearing)p+=crumpled(268,220+clearing,15);
      if(step==="page"||fresh)p+=card(121,pose==="feed"?235:pose==="reload"?191:161,78,59,ink);
      if(step==="scrunch")p+=path("M126 172h60v6h12v34h-12v8h-51v-7h-13v-31h4Z",ink)+rect(142,180,4,29,gray)+rect(152,187,24,4,gray);
      if(step==="squeeze")p+=crumpled(138,178,44)+burst(159,195,1,light);
      if(step==="ball")p+=crumpled(145,192,30);
      const right=cycle%2===0;
      if(step==="toss")p+=crumpled(right?200:84,167,28)+rect(right?173:118,191,19,3,gray);
      if(step==="flight")p+=crumpled(right?259:35,162,23)+rect(right?239:64,185,14,3,light);
      if(step==="edge")p+=crumpled(right?295:7,197,18)+square(right?287:29,181,4,gray);
      return p;
    }
    const dx=pose==="left"?-4:pose==="right"?4:0;
    const lid=({rest:0,left:-2,right:-4,puff1:-13,puff2:-22,squat:2,launch:-39,high:-52,fall:-25,land:1,bounce:-12,settle:-2})[pose];
    let p=at(dx,0,rect(113,187,94,37,gray)+rect(120,193,80,25,blue)+rect(104,203,9,11,gray)+rect(207,203,9,11,gray)+rect(135,208,48,5,coral));
    p+=rect(107-dx,179+lid,106,9,light)+rect(148-dx,172+lid,24,7,gray);
    const power=["launch","high"].includes(pose)?3:pose==="puff2"?2:1;
    p+=steam(224+dx,194,power)+steam(90-dx,198,power+1);
    if(["puff1","puff2","launch","high"].includes(pose))for(let i=0;i<power+2;i++)p+=square(105-i*9,173-i*4,6,light)+square(210+i*9,173-i*4,6,light);
    if(pose==="land")p+=hitSquares(1);
    return p;
  });
}

// Keep the main gag; give each one-way action a forward recovery instead of
// rewinding the destruction or replacing its prop in full view.
function closedWorkStory(ctx,id,shots,seconds){
  let drawings=[...shots],order,times;
  const backtrack=["piano","polish","maze","winch","conductor","magnifier"];
  if(backtrack.includes(id)){
    order=[0,1,2,3,4,3,2,1,0,0];times=[0,.14,.28,.42,.56,.66,.76,.86,.94,1];
  }else if(["conveyor","treadmill","juggle"].includes(id)){
    drawings=[];
    for(let f=0;f<=30;f++){
      let p="";
      if(id==="conveyor"){
        p=rect(55,199,170,12,gray)+rect(58,202,164,5,palette.black)+wheel(68,215,7,f)+wheel(208,215,7,f)+path("M231 185h8v23h39v-23h8v31h-55Z",amber);
        for(let i=0;i<4;i++)p+=cube(65+((i*40+f*5)%150),180,16,i%2?blue:coral);
      }else if(id==="treadmill"){
        p=wheel(76,208,15,f)+wheel(244,208,15,f)+rect(77,190,168,5,light)+rect(77,221,168,5,gray)+rect(51,206,11,4,coral)+rect(258,206,11,4,coral);
        for(let i=0;i<4;i++)p+=card(81+((i*36+Math.round(f*134/30))%134),166,22,25,i%2?blue:ink);
      }else{
        p=path("M81 217h5v5h147v-5h5v10H81Z",gray);
        const pos=[[90,183],[131,161],[189,173],[215,204],[133,209]],phase=f/6;
        for(let i=0;i<3;i++){
          const j=Math.floor(phase+i*2)%5,k=(j+1)%5,t=phase%1;
          p+=cube(Math.round(pos[j][0]+(pos[k][0]-pos[j][0])*t),Math.round(pos[j][1]+(pos[k][1]-pos[j][1])*t),20,[blue,coral,amber][i]);
        }
      }
      drawings.push(p);
    }
    order=drawings.map((_,i)=>i);times=order.map(i=>i/30);order.push(0);times.push(1);
    // No duplicate 1.0 key time: the final drawing already equals the first.
    order.pop();times.pop();
  }else if(id==="paper-plane"){
    const stack=card(73,204,34,22,light)+rect(70,228,55,3,gray);
    drawings.push(stack+plane(302,141),stack+plane(336,136),stack+card(127,234,54,42,ink),stack+card(127,206,54,42,ink),stack+card(127,181,54,42,ink),shots[0]);
  }else if(["block-tower","brick-wall","origami"].includes(id)){
    const support=id==="block-tower"?rect(95,223,130,5,gray):id==="brick-wall"?rect(99,222,130,6,gray):"";
    const final=shots[4].replace(support,""),first=shots[0].replace(support,"");
    drawings.push(...[25,85,185,325].map(dx=>support+at(dx,0,final)),support+at(-310,0,first),support+at(-145,0,first),support+at(-45,0,first),shots[0]);
  }else if(id==="stamp"){
    const press=rect(117,176,86,10,amber)+rect(145,164,30,13,gray);
    drawings.push(...[45,125,230].map(dx=>press+card(109+dx,201,103,23,ink)+star(157+dx,204,16,coral)),press+card(-91,201,103,23,ink),press+card(25,201,103,23,ink),shots[0]);
  }else if(id==="uphill"){
    const ramp=path("M70 224h30v-10h30v-10h30v-10h30v-10h30v-10h30v54H70Z",gray);
    drawings.push(ramp+cube(223,137,27,blue),ramp+cube(271,142,27,blue),ramp+cube(322,161,27,blue),ramp+cube(-26,187,27,blue),ramp+cube(27,187,27,blue),ramp+cube(65,187,27,blue),shots[0]);
  }else if(id==="tissue"){
    const printer=rect(100,192,121,34,gray)+rect(107,198,107,18,palette.black)+rect(175,207,12,5,blue)+rect(117,188,59,10,ink);
    const tissue=shots[4].replace(printer,"");
    drawings.push(...[-20,-70,-150,-205].map(dx=>printer+at(dx,-6,tissue)),printer+rect(124,184,38,6,ink),printer+rect(124,184,38,6,ink)+rect(132,177,38,6,light),shots[0]);
  }else if(id==="buckets"){
    for(let f=3;f>=0;f--){
      let p=card(133,193,52,31,ink);
      for(const x of[61,213]){
        p+=rect(x,179,37,45,gray)+rect(x+4,183,29,37,palette.black)+rect(x+5,213-f*5,27,5+f*5,blue)+rect(x+7,169,23,4,light)+rect(x+4,172,4,9,light)+rect(x+29,172,4,9,light);
        p+=square(x+30,222,4,blue)+square(x+36,228+(3-f),3,palette.lightWater);
      }
      drawings.push(p);
    }
    drawings.push(shots[0]);
  }else drawings.push(shots[0]);
  if(!order){
    // Keep the forward performance in the first 70%; dedicate the tail to
    // visible delivery/cleanup/replenishment. The next loop starts at rest.
    order=drawings.map((_,i)=>i);
    times=drawings.map((_,i)=>i<5?i*.14:.66+(i-4)*(.28/(drawings.length-5)));
    order.push(0);times.push(1);
  }
  return timedStory(ctx,drawings,seconds,"story-"+id,times,order);
}

export function drawWorkScene(ctx){
  const [id,,,seconds]=sceneSpecs[ctx.mood][ctx.variant-1];
  let a="",shots=[];
  if(id==="key-rain")a=work(ctx);
  else if(ctx.mood==="grumpy"&&grumpyTiming[id])a=grumpyActionScene(ctx,id);
  else if(id==="flood")a=keyboardBase(ctx)+flood(ctx);
  else if(id==="turbo")a=work(ctx);
  else if(id==="steady")a=keyboardBase(ctx)+rect(74,168,4,33,blue)+rect(243,168,4,33,blue);
  else {
    for(let f=0;f<5;f++){
      let p="";
      switch(id){
        case"conveyor":
          p=rect(55,199,170,12,gray)+rect(58,202,164,5,palette.black)+wheel(68,215,7,f)+wheel(208,215,7,f)+path("M231 185h8v23h39v-23h8v31h-55Z",amber);
          for(let i=0;i<4;i++){const x=65+((i*40+f*14)%150);p+=cube(x,180-(i===f%4?7:0),16,i%2?blue:coral);}break;
        case"piano":
          p=rect(77,181,166,34,gray)+rect(82,185,156,25,ink)+rect(90,215,8,12,gray)+rect(222,215,8,12,gray);
          for(let i=0;i<11;i++){p+=rect(84+i*14,186,2,23,palette.black);if(i%3!==2)p+=rect(91+i*14,185,6,14,palette.black);}
          p+=rect(84+(f*2%10)*14,202,11,7,coral)+note(42,176-f*5)+note(263,178-((f+2)%5)*5);break;
        case"paper-plane":
          p=card(73,204,34,22,light)+rect(70,228,55,3,gray);
          if(f===0)p+=card(127,170,54,42,ink);
          else if(f===1)p+=path("M132 178h46v6h-8v8h-10v12h-28Z",ink)+rect(141,184,24,3,blue);
          else p+=plane([0,0,132,207,263][f],[0,0,180,162,147][f]);break;
        case"block-tower":
          p=rect(95,223,130,5,gray);
          for(let i=0;i<=f;i++)p+=cube(139+(i%2?3:-3),204-i*11,18,[blue,amber,coral][i%3]);
          p+=cube(204-f*6,196-f*5,16,coral);break;
        case"stamp":{
          const y=[164,170,187,168,164][f];p=card(109,201,103,23,ink)+rect(117,y+12,86,10,amber)+rect(145,y,30,13,gray);
          if(f>=2)p+=star(157,204,16,coral);if(f===2)p+=burst(160,196,2,amber);break;}
        case"juggle":{
          const positions=[[90,183],[131,161],[189,173],[215,204],[133,209]];p=path("M81 217h5v5h147v-5h5v10H81Z",gray);
          for(let i=0;i<3;i++){const [x,y]=positions[(f+i*2)%5];p+=cube(x,y,20,[blue,coral,amber][i]);}break;}
        case"rocket":{
          const y=[189,180,161,168,186][f];p=miniBoard(98,y,124,8)+flame(118,y+27,f%3)+flame(193,y+27,(f+1)%3)+rect(92,y+10,6,19,coral)+rect(222,y+10,6,19,coral);break;}
        case"treadmill":
          p=wheel(76,208,15,f)+wheel(244,208,15,f)+rect(77,190,168,5,light)+rect(77,221,168,5,gray);
          for(let i=0;i<4;i++)p+=card(81+((i*36+f*19)%134),166,22,25,i%2?blue:ink);
          p+=rect(51,206,11,4,coral)+rect(258,206,11,4,coral);break;
        case"pinball":{
          p=rect(89,161,142,65,gray)+rect(93,165,134,57,palette.black)+square(112,177,11,coral)+square(189,177,11,blue)+square(153,196,11,amber);
          const pos=[[99,207],[142,172],[207,204],[175,180],[123,211]][f];p+=square(...pos,7,ink)+rect(106,216,29,3,light)+rect(186,216,29,3,light);break;}
        case"pedestal":{
          const lift=[0,5,13,13,5][f];p=rect(112,222-lift,96,8,gray)+rect(137,206-lift,46,17,light)+miniBoard(91,179-lift,138,9)+rect(93,225,134,5,amber);
          if(f>=2)p+=star(62,177,16,amber)+star(253,177,16,amber);break;}
        case"conductor":
          p=rect(115,218,90,6,gray)+rect(158,195,5,24,gray);
          for(let i=0;i<3;i++)p+=card(73+i*72,171+((f+i)%3)*10,27,30,[blue,ink,amber][i]);
          p+=pixelRod(155,166,[-1,-1,0,1,0][f],7,ink);break;
        case"origami":
          if(f===0)p=card(122,172,77,52,ink);
          else if(f===1)p=path("M112 214h23v-12h23v-12h23v-12h23v46h-92Z",ink);
          else p=path("M86 185h22v8h20v8h20v-18h8v-18h8v-8h19v6h-13v31h-8v10h31v-10h18v-10h23v9h-18v12h-20v12h-31v10h-12v-11h-29v-11h-24v-10H86Z",ink)+square(172,159,3,palette.black)+rect(148,216,7,13,blue);break;
        case"polish":
          p=rect(119,169,82,51,amber)+rect(125,175,70,39,blue)+rect(133,182,25,3,ink)+rect(133,190,46,3,ink)+rect(107+f*14,198-f%2*9,28,13,coral);
          if(f>=3)p+=star(182,158,24,ink)+star(105,207,16,ink);break;
        case"one-key":{
          const d=f===2?9:0;p=rect(111,216,98,8,gray)+at(131,166+d,keycap(48,"E"))+rect(101,221,118,5,amber);
          if(f===2)p+=burst(157,196,5,amber);break;}
        case"magnifier":{
          const x=111+[-10,0,10,0,-10][f];p=card(139,190,28,31,blue)+at(x,157,path("M10 0h39v9h9v34h-9v9H10v-9H0V9h10Zm4 10v32h30V10Z",light)+rect(47,44,10,10,gray)+rect(55,52,10,10,gray))+square(x+22,177,7,blue);break;}
        case"periscope":{
          const h=[33,43,53,53,43][f];p=rect(115,216,104,9,gray)+rect(164,212-h,18,h,blue)+rect(125,212-h,57,18,blue)+rect(119,209-h,12,24,light)+rect(120,215-h,8,12,palette.black)+square(121,217-h+f%2*3,5,ink)+rect(158,199,28,5,light);break;}
        case"explode":{
          const spread=[0,10,22,13,0][f];p=rect(104,223,112,4,gray);
          for(let i=0;i<4;i++)p+=cube(138+(i%2)*23+(i%2?spread:-spread),180+Math.floor(i/2)*23+(i<2?-spread:0),20,[blue,amber,coral,light][i]);break;}
        case"maze":{
          p=rect(85,161,150,67,gray)+rect(90,166,140,57,palette.black)+rect(112,166,5,35,blue)+rect(138,188,5,35,blue)+rect(164,166,5,35,blue)+rect(190,188,5,35,blue)+rect(116,196,17,5,blue);
          const pos=[[96,171],[98,210],[146,208],[173,174],[213,210]][f];p+=square(...pos,7,ink);break;}
        case"box":{
          const lift=[0,9,22,22,9][f];p=rect(114,190,92,36,amber)+rect(122,196,76,24,palette.black)+rect(110,182-lift,100,10,light)+rect(151,186-lift,18,5,gray);
          if(f>=2)p+=cube(149,173,15,blue)+square(136,185,4,coral)+square(184,178,4,ink);break;}
        case"uphill":{
          p=path("M70 224h30v-10h30v-10h30v-10h30v-10h30v-10h30v54H70Z",gray);
          p+=cube(83+f*28,187-f*10,27,blue)+burst(69+f*28,221-f*10,0,light);break;}
        case"brick-wall":
          p=rect(99,222,130,6,gray);for(let i=0;i<3+f*2;i++)p+=rect(104+(i%4)*29+(Math.floor(i/4)%2?8:0),204-Math.floor(i/4)*17,25,13,[blue,light,amber][Math.floor(i/4)%3]);break;
        case"winch":{
          const lift=[0,8,17,26,17][f];p=rect(85,158,8,70,gray)+rect(85,158,133,8,gray)+wheel(203,174,11,f)+rect(202,184,3,33-lift,light)+card(176,211-lift,57,15,blue)+card(179,202-lift,51,12,ink)+wheel(84,198,17,f)+rect(51,223,70,5,gray);break;}
        case"scissors":{
          p=rect(83,199,154,8,blue)+square(117,193,19,blue)+square(187,193,19,blue);
          const open=[true,true,false,false,true][f];p+=square(open?128:143,166,19,coral)+square(open?133:148,171,9,palette.black)+square(open?173:164,166,19,coral)+square(open?178:169,171,9,palette.black)+pixelRod(open?144:153,184,open?1:0,8)+pixelRod(open?173:164,184,open?-1:0,8);
          if(!open)p+=rect(153,201,15,10,palette.black)+burst(160,203,2,blue);break;}
        case"snap":
          if(f<2)p=miniBoard(83,183+(f?4:0))+ (f?path("M158 181h5v9h-4v8h5v10h-6v-11h3v-7h-3Z",coral):"");
          else {const d=f===2?29:f===3?52:13;p=splitBoard(83-d,182+(f===3?14:0),true)+splitBoard(168+d,188+(f===3?17:0),false);if(f===2)p+=burst(161,193,3,amber)+path("M151 185h4v7h7v7h7v5h-11v-6h-7Z",coral);}break;
        case"throw":
          if(f===0)p=miniBoard(83,185);
          if(f===1)p=miniBoard(105,165);
          if(f===2)p=miniBoard(296,71,154,10,true)+square(247,211,5,gray)+square(256,205,4,gray);
          if(f===3)p=square(302,155,5,gray)+square(291,169,4,gray)+square(283,183,3,gray);
          if(f===4)p=miniBoard(83,210);break;
        case"crumple":
          if(f===0)p=card(120,166,80,60,ink);
          if(f===1)p=path("M130 174h54v8h10v31h-8v9h-51v-8h-9v-31h4Z",ink)+rect(142,182,4,30,gray)+rect(152,188,24,4,gray);
          if(f===2)p=at(144,191,path("M5 0h24v5h6v24h-6v6H5v-5H0V5h5Z",light)+rect(8,8,19,4,gray)+rect(14,14,4,16,gray));
          if(f===3)p=cube(252,162,25,light)+square(232,189,5,gray)+square(219,198,3,gray);
          if(f===4)p=card(124,204,70,23,ink);break;
        case"boiler":{
          const dy=[0,-2,-15,-25,-7][f];p=rect(113,187,94,37,gray)+rect(120,193,80,25,blue)+rect(107,179+dy,106,9,light)+rect(148,172+dy,24,7,gray)+rect(104,203,9,11,gray)+rect(207,203,9,11,gray)+rect(135,208,48,5,coral)+steam(224,194,f)+steam(92,202,(f+2)%5);break;}
        case"buckets":
          for(const [i,x]of[61,213].entries()){p+=path(`M${x} 179h37v45H${x}Z`,gray)+rect(x+4,183,29,37,palette.black)+rect(x+5,213-f*5,27,5+f*5,blue)+rect(x+7,169,23,4,light)+rect(x+4,172,4,9,light)+rect(x+29,172,4,9,light);if(f>2)p+=burst(x+17,190,1,palette.lightWater);}
          p+=card(133,193,52,31,ink);break;
        case"tissue":
          p=rect(100,192,121,34,gray)+rect(107,198,107,18,palette.black)+rect(175,207,12,5,blue)+rect(117,188,59,10,ink);
          for(let i=0;i<3+f;i++)p+=rect(124+(i%2?8:0),184-i*7,38,6,i%2?light:ink);break;
        case"umbrella":
          p=miniBoard(102,198,118,8)+path("M90 179v-6h12v-6h18v-6h20v-6h40v6h20v6h18v6h12v6Z",blue)+rect(158,176,4,29,light)+rect(150,202,8,4,light)+burst(85,187,f%2,palette.lightWater)+burst(236,187,(f+1)%2,palette.lightWater);break;
        case"raft":{
          const dy=[0,-3,1,4,0][f];for(let i=0;i<17;i++)p+=square(56+i*12,221+((i+f)%3)*4,7,[blue,palette.water,palette.lightWater][i%3]);
          p+=boat(121,203+dy)+miniBoard(124,179+dy,74,5)+rect(208,170+dy,4,43,light)+path(`M212 ${171+dy}h23v5h-5v7h-18Z`,ink);break;}
      }
      shots.push(p);
    }
    a=closedWorkStory(ctx,id,shots,seconds);
  }
  const active=group(opacity(ctx,"1;0;1;1",1.2,"0;0.25;0.5;1")+square(152,234,3,blue)+square(158,234,3,light)+square(164,234,3,blue),'data-part="working-activity"');
  return group(a+active,`data-part="working-prop" data-action="${id}"`);
}

export function requestScene(ctx){
  const n=ctx.variant,shots=[];
  for(let f=0;f<5;f++){
    let a="";
    if(n===1){const tap=[10,0,9,0,10][f];a=rect(129,180,60,47,amber)+rect(135,185,48,42,palette.black)+rect(139,189,36,32,gray)+square(166,204,5,amber)+square(197+tap,199,13,ink);if(f===1||f===3)a+=burst(187,205,0,amber);}
    if(n===2){const w=[8,23,43,61,61][f];a=rect(114,177,5,48,light)+path(`M119 180h${w}v24h-${w}Z`,amber)+rect(107,225,24,4,gray);if(f>=2)a+=square(130,188,5,palette.black)+square(141,188,5,palette.black)+square(152,188,5,palette.black);}
    if(n===3){const dx=[0,-8,8,-5,0][f];a=at(132+dx,182,path("M18 0h20v6h7v23h8v7H0v-7h8V6h10Z",amber)+rect(21,36,11,6,light)+rect(22,-5,11,5,gray));if(f>0&&f<4)a+=square(117-dx,194,5,amber)+square(196-dx,194,5,amber);}
    shots.push(a);
  }
  return story(ctx,shots,3.6,["door-request","flag-request","bell-request"][n-1],true,4);
}
export function completionScene(ctx){
  const n=ctx.variant;
  if(n===1){
    const confetti=Array.from({length:10},(_,i)=>at(54+i*23,199,group(move(ctx,`0 18;${i%2?5:-5} -20;${i%2?9:-9} -10;0 20;0 20`,3.6,"0;0.25;0.5;0.8;1","1")+opacity(ctx,"0;1;1;0;0",3.6,"0;0.1;0.5;0.9;1","1")+square(0,0,5,[ink,coral,blue][i%3]),'opacity="0"'))).join("");
    return group(trophy(ctx)+confetti,'data-part="completion-cue" data-action="trophy-fountain"');
  }
  if(n===2){
    // Home is open, so a finite playback never strands Boop behind a curtain.
    const curtains=[12,34,72,105,72,34,12].map(w=>rect(0,0,w,232,"#B75242")+rect(320-w,0,w,232,"#B75242")+rect(Math.max(0,w-9),0,6,232,"#D97545")+rect(323-w,0,6,232,"#D97545"));
    const scroll=rect(114,185,92,33,ink)+rect(109,181,9,41,light)+rect(202,181,9,41,light)+rect(125,194,68,4,gray)+rect(125,203,48,4,gray);
    const curtainMotion=timedStory(ctx,curtains,ctx.loopSeconds||7.2,"curtain-reveal",[0,.03,.06,.09,.15,.22,.30,1],[0,1,2,3,4,5,6,0],0);
    return group(curtainMotion+(ctx.mood==="proud"?"":scroll)+star(152,22,24,ctx.ink),'data-part="completion-cue" data-action="curtain-call"');
  }
  const cup=group(path("M6 0h18v4h6v10h-7v4h-5v6h7v5H5v-5h7v-6H5v-4H0V4h6Z",ctx.ink)+rect(9,3,12,9,ink),'data-part="trophy"');
  const podium=[0,5,12,18,18].map(h=>rect(81,236-h,51,h+3,ctx.ink)+rect(132,220-h,56,h+19,ctx.ink)+rect(188,236-h,51,h+3,ctx.ink)+rect(136,223-h,48,4,ink)+at(145,191-h,cup));
  return group(story(ctx,podium,3.2,"podium-rise",true,4),'data-part="completion-cue" data-action="podium"');
}
export function listeningScene(ctx){
  const n=ctx.variant;
  if(n===1)return group(path("M31 62V30h32v5H36v27ZM257 30h32v10h-5v-5h-27ZM31 125h5v28h27v5H31ZM284 125h5v33h-32v-5h27Z",blue),'data-part="attention-frame"');
  if(n===2)return group(path("M18 91V53h8V37h16V25h236v12h16v16h8v38h-8V57h-8V43h-16V33H50v10H34v14h-8v34Z",gray)+rect(16,87,19,50,blue)+rect(285,87,19,50,blue)+rect(20,94,7,36,light)+rect(294,94,7,36,light),'data-part="headphones"');
  return group(path("M234 163h12v6h12v7h13v34h-13v6h-12v7h-12v-19h-30v-13h30Z",amber)+rect(262,180,5,26,palette.black)+rect(201,188,9,18,light)+rect(222,215,5,13,gray),'data-part="listening-trumpet"');
}
