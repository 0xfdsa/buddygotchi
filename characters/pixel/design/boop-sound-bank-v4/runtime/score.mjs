import {keyPlans} from './keyboard.mjs';
import {tracksFromSVG,entrances} from './timing.mjs';
import {effects} from './audio/effects.mjs';
import {needsYouScore} from './needs-you.mjs';

export const moodSound={
  happy:{pitch:1,gain:.75,character:'warm, light and buoyant'},
  excited:{pitch:1.10,gain:.86,character:'bright, brisk and springy'},
  proud:{pitch:.96,gain:.77,character:'deliberate, polished and theatrical'},
  curious:{pitch:1.045,gain:.64,character:'small tactile discoveries with pauses'},
  determined:{pitch:.98,gain:.79,character:'precise, planted and evenly accented'},
  grumpy:{pitch:.94,gain:.88,character:'brittle cracks and impatient material noises'},
  sad:{pitch:.93,gain:.58,character:'soft, damp and persistently trying'}
};
const directions={
  conveyor:'Dry roller clicks; little parcel landings on the belt.',
  piano:'Ivory-key clacks, not a tune; each visible key change gets a light press.',
  'paper-plane':'Paper crease, fold, airy launch and a fresh-page shuffle.',
  'block-tower':'Increasing stacks of woody cube clicks; a short delivery slide.',
  stamp:'One broad stamp clack, light rebound and paper sliding out.',
  turbo:'Ten synchronized presses per second, with quieter release ticks.',
  juggle:'Soft catches and short air swishes around the cube orbit.',
  rocket:'Short jet pulses follow the keyboard lift and descent; a light landing.',
  treadmill:'Quick roller ratchets and passing-card flutters, not background music.',
  pinball:'Dry bumper contacts and tiny spring recoils at each new position.',
  pedestal:'Small lift-motor strokes, a latch and a restrained sparkle.',
  conductor:'Baton air swishes answered by shuffling cards; no orchestral backing.',
  origami:'Two crisp paper folds, a reveal flutter and a delivery slide.',
  polish:'Alternating cloth buffs, a small shine accent, then quiet.',
  'one-key':'One exaggerated mechanical key clack, release and loose-key rattle.',
  magnifier:'Quiet lens-housing slides with tiny position-stop clicks.',
  periscope:'Telescoping tube ratchets and a small extension stop.',
  explode:'Four-piece separation clicks followed by a clean reassembly snap.',
  maze:'Sparse tactile ticks at the square’s turns; no repeating scanner beep.',
  box:'Lid creak, opening latch, small discovery accent and lid settling.',
  steady:'Approved crisp 6.7-press/second keyboard rhythm; matched release clicks.',
  uphill:'Gritty cube scrapes and short landings on each step.',
  'brick-wall':'Paired brick placements, with different-size block resonances.',
  winch:'Crank ratchets and tiny tension creaks on each visible lift.',
  scissors:'Blade movement, one sharp snip, severed-fibre flutter and reopening.',
  'key-rain':'Approved brittle keyboard fractures and scattered keycaps on every downstroke.',
  snap:'Three accelerating fractures, strain, SNAP, falling halves and resumed typing.',
  throw:'Desk fracture, three glassy screen cracks, throw, wipes and replacement keys.',
  crumple:'Three fast paper scrunch–squeeze–throw sequences, then a fresh sheet.',
  boiler:'Rapid metal lid rattle, two steam bursts, lid launch and clattering landing.',
  flood:'Approved soft rhythmic typing, cube-water drops, splashes and a tiny short circuit.',
  buckets:'Bucket pings, clustered water drops, overflow and a draining gurgle.',
  tissue:'Dry feed-motor ticks and accordion-paper rustles; soft pull-away.',
  umbrella:'Rain-like cube patters on the canopy and splashes down the sides.',
  raft:'Small water sloshes track the raft; a soft deck creak on the low bob.'
};

export function composeScore(asset,svg){
  if(asset.state==='needs_you')return needsYouScore(asset);
  const {mood,state,variation:v,action,seconds}=asset,profile=moodSound[mood];
  const tracks=tracksFromSVG(svg),events=[];
  let description='',policy='loop',intervalSeconds=0;
  const add=(at,effect,gain=.7,label=effect,pitch=1,sync=null)=>{
    if(at<0||at>=seconds-.02)return;
    if(!effects[effect])throw new Error('Unknown effect '+effect);
    events.push({at:Number(at.toFixed(6)),effect,gain:Number(gain.toFixed(4)),pitch,label,...(sync?{sync}:{})});
  };
  const frameCue=(entry,effect,gain=.7,label=effect,pitch=1)=>add(entry.at,effect,gain,label,pitch,{part:entry.part,frame:entry.frame,pose:entry.pose});
  const part=action?'story-'+action:null;
  const entries=part?entrances(tracks,part):[];
  const frame=(index,effect,gain=.7,label=effect)=>entries.filter(e=>e.frame===index).forEach(e=>frameCue(e,effect,gain,label));
  const firstFrame=(index,effect,gain=.7,label=effect)=>{const e=entries.find(e=>e.frame===index);if(e)frameCue(e,effect,gain,label);};

  if(['asleep','no_app'].includes(state)){
    policy='silent';description='Intentional silence · shared quiet routine · no simulated breathing or snores.';
  }else if(state==='idle'){
    policy=v===1?'silent':'sparse';intervalSeconds=45;
    description=v===1?'Intentional silence · breathing and blinking stay visual.':v===2?'A tiny cloth-like glance accent; at most once per 45 seconds.':'A soft movement swish and cushion landing; at most once per 45 seconds.';
    const tr=tracks.find(t=>t.part===(v===2?'gaze':'face')&&t.attribute==='transform');
    const beats=tr?tr.times.filter((time,i)=>i>0&&tr.values[i]!==tr.values[i-1]&&time<seconds-.5):[];
    if(v===2&&beats.length)add(beats[0],'cloth',.20,'Quiet glance',profile.pitch);
    if(v===3&&beats.length){add(beats[0],'swipe',.20,'Small stretch',profile.pitch);if(beats[1])add(beats[1],'cushion',.32,'Settle',profile.pitch);}
  }else if(state==='listening'){
    policy=v===1?'silent':'entry';
    description=v===1?'Silent focused listening; no beeps compete with the user.':v===2?'One soft headset-settling click on entry; silent while listening.':'One light prop-handling brush on entry; silent while listening.';
    if(v===2){add(.06,'cushion',.24,'Headset settles',profile.pitch);add(.09,'latch',.16,'Soft fit click',profile.pitch);}
    if(v===3)add(.08,'cloth',.22,'Trumpet settles',profile.pitch);
  }else if(state==='task_complete'){
    policy='entry';
    const pitch=({happy:1,excited:1.06,proud:.94,curious:1.03,determined:.98,grumpy:.91,sad:.96})[mood];
    if(v===1){
      const fx=['excited','proud'].includes(mood)?'trophyB':'trophyA';
      add(.08,fx,mood==='sad'?.72:.86,'Victory fanfare',pitch);
      description=`${effects[fx].duration.toFixed(2)} s layered trophy fanfare with synthesized ${fx==='trophyB'?'crowd-like cheer and applause':'applause'}; then room for a mumble.`;
    }else if(v===2){
      const beats=entrances(tracks,'curtain-reveal');
      const close=beats.find(e=>e.frame===1),open=beats.find(e=>e.frame===4);
      if(close)frameCue(close,'cloth',.34,'Curtains gather');
      if(open)frameCue(open,'swipe',.30,'Curtains part');
      const start=Math.max(.08,(open?.at||1.08)-.47);
      add(start,'trophyB',mood==='sad'?.64:.82,'Curtain-call fanfare',pitch);
      description='2.85 s theatrical reveal fanfare, cloth swish and synthesized crowd-like applause. No spoken words.';
      if(mood==='proud')description+=' MWHAHAHA lettering reserves a future voice layer; no fake speech added.';
    }else{
      const beats=entrances(tracks,'podium-rise'),lift=beats.find(e=>e.frame===1);
      add(lift?.at||.8,'victoryPodium',mood==='sad'?.69:.86,'Podium fanfare',pitch);
      for(const e of beats.filter(e=>[1,2,3].includes(e.frame)&&e.at<3))frameCue(e,'ratchet',.22,'Podium lift');
      description='2.65 s rising podium fanfare; the full chord lands at the top step, with synthesized applause.';
    }
  }else if(state==='working'){
    description=directions[action];if(!description)throw new Error('No sound design for '+action);
    const plan=keyPlans[action];
    if(plan){
      plan.presses.forEach((at,i)=>{
        const fx=action==='key-rain'?'bash':action==='flood'?'softKey':['key','keyB','keyC','space'][i%4];
        const gain=action==='key-rain'?(i%2?.94:.81):action==='flood'?.77:(i%4===0?.95:.78);
        add(at,fx,gain,action==='key-rain'?'Keyboard fractures':'Key press',1,{key:'press',beat:i});
        add(at+plan.hold,'release',action==='flood'?.37:.55,'Key release',1,{key:'release',beat:i});
        if(action==='key-rain')add(at+.10,'keycap',.48,'Loose key scatter');
      });
      if(action==='flood'){
        for(let i=0;i<22;i++)add(.085+i*.281,'drop',.25+(i%4)*.06,'Cube water');
        for(const at of [.39,.98,1.62,2.32,2.91,3.57,4.20,4.82,5.40,5.96])add(at,'splash',at>2.8&&at<4.5?.64:.39,'Water splash');
        add(3.328,'short',.8,'Tiny short circuit');
      }
    }else if(['snap','throw','crumple','boiler'].includes(action)){
      for(const e of entries){const pose=e.pose;
        if(action==='snap'){
          if(pose.startsWith('slam'))frameCue(e,'bash',[.8,.92,1][Number(pose.at(-1))-1],'Bash / fracture');
          if(pose==='strain')frameCue(e,'creak',.75,'Strain');
          if(pose==='crack')frameCue(e,'snap',1,'SNAP');
          if(pose==='fly')frameCue(e,'whoosh',.7,'Halves fly');
          if(pose==='fallen'){frameCue(e,'landing',.78,'Plastic fragments land');add(e.at+.08,'keycap',.46,'Loose key');add(e.at+.185,'keycap',.30,'Loose key');}
          if(pose==='reload')frameCue(e,'landing',.25,'Replacement keyboard');
        }else if(action==='throw'){
          if(pose==='desk')frameCue(e,'bash',.90,'Desk fracture');
          if(pose.startsWith('screen')){frameCue(e,'glass',.7+Number(pose.at(-1))*.09,'Screen crack '+pose.at(-1));add(e.at+.045,'snap',.47,'Plastic shell cracks');}
          if(pose==='release')frameCue(e,'swipe',.95,'Keyboard thrown');
          if(pose==='exit')frameCue(e,'keycap',.36,'Fragments exit');
          if(pose.startsWith('wipe'))frameCue(e,'cloth',.42,'Wipe cracks away');
          if(pose==='reload')frameCue(e,'landing',.38,'Replacement keyboard');
        }else if(action==='crumple'){
          if(pose.startsWith('scrunch'))frameCue(e,'crumple',.91,'Crumple paper');
          if(pose.startsWith('squeeze'))frameCue(e,'tear',.63,'Squeeze');
          if(pose.startsWith('ball'))frameCue(e,'paper',.45,'Tight paper ball');
          if(pose.startsWith('toss'))frameCue(e,'swipe',.65,'Throw paper');
          if(pose.startsWith('edge'))frameCue(e,'cushion',.52,'Paper lands');
          if(pose==='feed')frameCue(e,'paper',.60,'Fresh page');
        }else{
          if(['left','right'].includes(pose))frameCue(e,'metal',.43,'Lid rattles');
          if(pose.startsWith('puff'))frameCue(e,'steam',pose==='puff1'?.75:1,'Steam burst');
          if(pose==='launch'){frameCue(e,'pop',.8,'Lid launches');add(e.at+.025,'steam',.84,'Pressure escapes');}
          if(pose==='land')frameCue(e,'metal',.92,'Lid lands');
          if(pose==='bounce')frameCue(e,'metal',.49,'Lid rebounds');
        }
        if(['snap','throw'].includes(action)&&pose==='tap'){
          frameCue(e,'key',.86,'Back to typing');
          const up=entries.find(x=>x.at>e.at&&x.pose==='ready');if(up)frameCue(up,'release',.55,'Key release');
        }
      }
    }else{
      // Each action has its own material, rhythm and foreground gesture. Every
      // primary cue below is attached to a real compiled SVG frame transition.
      switch(action){
        case 'conveyor':for(const e of entries.filter(e=>e.frame>0&&e.frame%2===0))frameCue(e,'latch',e.frame%6===0?.44:.25,'Roller click');for(const e of entries.filter(e=>[6,14,22,28].includes(e.frame)))frameCue(e,'wood',.40,'Parcel lands');break;
        case 'piano':entries.filter(e=>e.frame<=4).forEach((e,i)=>{frameCue(e,['keyB','keyC','key','space'][i%4],.60,'Ivory key clack');add(e.at+.06,'release',.31,'Key returns');});break;
        case 'paper-plane':frame(1,'fold',.77,'Paper crease');frame(2,'fold',.54,'Last fold');frame(3,'swipe',.73,'Plane launches');firstFrame(8,'paper',.50,'Fresh sheet');break;
        case 'block-tower':for(let i=1;i<=4;i++)frame(i,'wood',.48+i*.055,'Cube placed');firstFrame(5,'slide',.42,'Tower delivered');break;
        case 'stamp':frame(1,'creak',.33,'Stamp descends');frame(2,'wood',.94,'Stamp lands');frame(3,'latch',.35,'Stamp releases');firstFrame(5,'paper',.58,'Card slides out');break;
        case 'juggle':for(const e of entries.filter(e=>e.frame>0&&e.frame%3===0))frameCue(e,e.frame%6?'swipe':'rubber',e.frame%6?.20:.47,e.frame%6?'Cube travels':'Soft catch');break;
        case 'rocket':for(let i=1;i<=3;i++)frame(i,'jet',i===2?.80:.51,'Jet pulse');frame(4,'landing',.38,'Keyboard lands');break;
        case 'treadmill':for(const e of entries.filter(e=>e.frame>0&&e.frame%3===0))frameCue(e,e.frame%6?'paper':'ratchet',e.frame%6?.40:.46,e.frame%6?'Card passes':'Roller turns');break;
        case 'pinball':for(let i=1;i<=4;i++){frame(i,'latch',.62,'Bumper contact');frame(i,'rubber',.29,'Spring recoil');}break;
        case 'pedestal':frame(1,'motor',.48,'Workstation rises');frame(2,'latch',.49,'Platform locks');frame(2,'shimmer',.34,'Show-off sparkle');frame(4,'motor',.32,'Platform lowers');break;
        case 'conductor':entries.filter(e=>e.frame<=4).forEach((e,i)=>{frameCue(e,'swipe',.32,'Baton flourish');if(i%2===0)frameCue(e,'paper',.34,'Cards shuffle');});break;
        case 'origami':frame(1,'fold',.73,'Diagonal fold');frame(2,'fold',.62,'Crane takes shape');frame(3,'paper',.34,'Wing flutter');firstFrame(5,'swipe',.36,'Crane delivered');break;
        case 'polish':entries.filter(e=>e.frame<=4).forEach(e=>frameCue(e,'cloth',.53,'Buffing stroke'));firstFrame(3,'shimmer',.34,'Polished shine');break;
        case 'one-key':frame(1,'creak',.36,'Key anticipation');frame(2,'space',1,'Giant key press');frame(3,'release',.73,'Key releases');frame(3,'keycap',.28,'Cap settles');break;
        case 'magnifier':entries.filter(e=>e.frame<=4).forEach((e,i)=>frameCue(e,i%2?'latch':'slide',i%2?.24:.21,'Lens adjusts'));break;
        case 'periscope':frame(1,'ratchet',.48,'Tube extends');frame(2,'ratchet',.60,'Tube extends');frame(3,'latch',.33,'Eye pivots');frame(4,'slide',.41,'Tube lowers');break;
        case 'explode':frame(1,'pop',.51,'Cube separates');frame(2,'latch',.55,'Pieces extend');frame(3,'slide',.35,'Pieces return');frame(4,'latch',.70,'Cube reassembled');break;
        case 'maze':entries.filter(e=>e.frame<=4).forEach((e,i)=>frameCue(e,i%2?'keyB':'latch',.26,'Square turns'));break;
        case 'box':frame(1,'creak',.60,'Lid lifts');frame(2,'latch',.48,'Box opens');frame(2,'shimmer',.28,'Small discovery');frame(4,'wood',.42,'Lid settles');break;
        case 'uphill':for(let i=1;i<=4;i++){frame(i,'slide',.59,'Cube scrapes uphill');frame(i,'wood',.35,'Next step');}firstFrame(5,'swipe',.34,'Load delivered');break;
        case 'brick-wall':for(let i=1;i<=4;i++){frame(i,'wood',.59,'Bricks placed');const e=entries.find(e=>e.frame===i);if(e)add(e.at+.044,'wood',.35,'Second brick settles',1.12);}firstFrame(5,'slide',.38,'Wall slides out');break;
        case 'winch':entries.filter(e=>e.frame<=4).forEach(e=>{frameCue(e,'ratchet',.57,'Crank turns');frameCue(e,'creak',.24,'Rope tension');});break;
        case 'scissors':frame(1,'metal',.27,'Blades poise');frame(2,'snip',.89,'SNIP');frame(2,'tear',.44,'Strip parts');frame(4,'metal',.31,'Blades open');break;
        case 'buckets':for(let i=1;i<=4;i++){frame(i,'drop',.50,'Bucket fills');if(i%2===0)frame(i,'metal',.19,'Water hits bucket');}frame(3,'splash',.56,'Overflow');frame(4,'splash',.66,'Overflow');firstFrame(5,'bubble',.59,'Drain');firstFrame(7,'splash',.35,'Water recedes');break;
        case 'tissue':for(let i=1;i<=4;i++){frame(i,'motor',.36,'Printer advances');frame(i,'paper',.42,'Tissue unfolds');}firstFrame(5,'tear',.41,'Tissue pulls free');firstFrame(8,'paper',.27,'Tissue clears');break;
        case 'umbrella':for(let i=1;i<=4;i++){frame(i,'sprinkle',.52,'Rain hits canopy');frame(i,'splash',.27,'Side splash');}break;
        case 'raft':for(let i=1;i<=4;i++)frame(i,'splash',i===3?.50:.29,'Raft sloshes');frame(3,'creak',.30,'Deck creaks');break;
        default:throw new Error('Unscored action '+action);
      }
    }
  }else throw new Error('Unscored state '+state);

  events.sort((a,b)=>a.at-b.at);
  const tail=Math.max(0,...events.map(e=>e.at+effects[e.effect].duration-seconds));
  return {id:asset.id,seconds,policy,intervalSeconds,description,character:profile.character,tailSeconds:Number(tail.toFixed(6)),events};
}

export function cycleHasSound(score,cycle){
  if(score.policy==='silent')return false;
  if(score.policy==='entry')return cycle===0;
  if(score.policy==='sparse')return cycle%Math.max(1,Math.ceil(score.intervalSeconds/score.seconds))===0;
  return true;
}
