// Internal acting recipes. These are not extra agent/tool parameters.
// Canonical catalog IDs are retained; newer owner feedback overrides old art limits.
export const workCaptions={
  happy:["Even paired taps · soft bob","Notes drift upward · mouth hums","Compress → key tap → rebound","Typing continues through a sideways peek","Three tiles snap into a tidy row"],
  excited:["Fast staccato taps · little breath","Rapid left / center / right shuffle","Alternating key flurries · side ticks","Eager glance → snap back to work","Coil downward → spring into a flurry"],
  proud:["Sparse taps · slow audience glance","Square flourish over the last key","Precise alignment · measured scan","Peek → blush → tuck away","A showy tap knocks one key crooked"],
  curious:["Lens and brackets inspect one tile","Look left / right between two tiles","Sparkle → pause → try the keyboard","Follow a bounded wandering square","Peer at the same tile from both sides"],
  determined:["Steady planted typing","Pull back → press forward","Scan three rows, then start again","Steadying breath → recenter","Slow emphatic key press"],
  grumpy:["Unbroken key spray · rattling keyboard","Large cap catapult + smaller debris","Dust blocks boil around the keys","Accusatory scan → firm key jab","Huff pixels drift off · chaos continues"],
  sad:["Wide cube tears feed a tiled flood","Sniffle → flick off one tear","Large tear obscures just one eye","Typing through sobbing beats","Retain corner tears · brace to continue"]
};
export const workRecipes={
  happy:[
    {name:"Easy rhythm",prop:"keyboard",beat:"0 0;-2 -2;2 0;0 2;0 0",seconds:3.2,fx:"twinkle"},
    {name:"Singing along",prop:"keyboard",beat:"-3 0;3 -2;-3 0;3 -2;-3 0",seconds:3.2,fx:"music",mouth:"sing"},
    {name:"Bouncy return key",prop:"keyboard",beat:"0 0;0 -4;0 7;0 -7;0 0",seconds:4,fx:"big-key"},
    {name:"Friendly audience check",prop:"keyboard",beat:"0 0;0 0;4 -2;4 -2;0 0",gaze:"0 0;0 0;5 -2;5 -2;0 0",seconds:5.6,fx:"none"},
    {name:"Neat little shuffle",prop:"tiles",beat:"-3 0;3 0;-2 0;0 -2;0 0",seconds:4.8,fx:"none"}
  ],
  excited:[
    {name:"Turbo typing",prop:"keyboard",beat:"0 0;0 4;0 -5;0 4;0 0",seconds:1.6,fx:"speed"},
    {name:"Rapid-fire sorting",prop:"tiles",beat:"-5 0;0 2;5 0;0 -2;-5 0",gaze:"-4 0;0 0;4 0;0 0;-4 0",seconds:2,fx:"speed"},
    {name:"Keyboard overdrive",prop:"double-keyboard",beat:"0 0;-4 3;4 3;0 -3;0 0",seconds:1.2,fx:"speed"},
    {name:"Eager double-take",prop:"keyboard",beat:"0 0;6 -4;0 5;-3 1;0 0",gaze:"0 0;6 -2;0 2;0 0;0 0",seconds:3.2,fx:"turn-tick"},
    {name:"Coiled little engine",prop:"keyboard",beat:"0 0;0 8;0 10;0 -9;0 0",seconds:3.6,fx:"spring"}
  ],
  proud:[
    {name:"Effortless expert",prop:"keyboard",beat:"0 0;0 -2;4 -3;4 -3;0 0",gaze:"0 0;0 0;5 -1;5 -1;0 0",seconds:6.4,fx:"none"},
    {name:"Watch this flourish",prop:"keyboard",beat:"0 0;0 -4;0 3;5 -3;0 0",seconds:4.4,fx:"key-arc"},
    {name:"Immaculate professional",prop:"tiles",beat:"-2 0;0 0;2 0;0 -2;0 0",seconds:5.6,fx:"straighten"},
    {name:"Bashful show-off",prop:"keyboard",beat:"0 -3;4 -3;0 7;-2 4;0 0",gaze:"0 0;4 0;0 2;-2 1;0 0",seconds:5.2,fx:"blush"},
    {name:"Too grand for the key",prop:"keyboard",beat:"0 0;0 -5;3 5;-4 2;0 0",seconds:5.6,fx:"crooked-key"}
  ],
  curious:[
    {name:"Close inspection",prop:"inspect",beat:"0 0;7 3;7 4;2 1;0 0",gaze:"0 0;4 2;4 3;0 0;0 0",seconds:4.4,fx:"glass"},
    {name:"Compare the clues",prop:"compare",beat:"-6 1;-6 1;6 1;6 1;-6 1",gaze:"-4 2;-4 2;4 2;4 2;-4 2",seconds:4,fx:"none"},
    {name:"Interesting possibility",prop:"keyboard",beat:"0 0;0 -6;0 -6;0 4;0 0",seconds:4.8,fx:"idea"},
    {name:"Follow that cursor",prop:"cursor",beat:"-4 0;6 -2;8 3;-5 1;-4 0",gaze:"-5 0;5 -2;7 2;-4 0;-5 0",seconds:4,fx:"none"},
    {name:"Peer around the problem",prop:"inspect",beat:"-9 2;-9 4;9 2;9 4;0 0",gaze:"-3 1;-3 2;3 1;3 2;0 0",seconds:5.2,fx:"brackets"}
  ],
  determined:[
    {name:"Steady little engine",prop:"keyboard",beat:"0 2;0 4;0 2;0 4;0 2",seconds:2,fx:"brackets"},
    {name:"Brace and push",prop:"keyboard",beat:"0 0;0 -5;0 7;0 4;0 0",seconds:4.4,fx:"pressure"},
    {name:"Methodical pass",prop:"rows",beat:"-3 0;0 1;3 2;0 0;-3 0",gaze:"-4 0;0 1;4 2;0 0;-4 0",seconds:4.8,fx:"none"},
    {name:"Refocus and continue",prop:"keyboard",beat:"0 0;0 -4;0 -4;0 4;0 0",seconds:5.6,fx:"breath"},
    {name:"Heroic final key",prop:"keyboard",beat:"0 0;0 -7;0 6;0 -3;0 0",seconds:5.2,fx:"big-key"}
  ],
  grumpy:[
    {name:"Keyboard meltdown",prop:"chaos",beat:"0 0;0 -4;-2 4;2 1;0 0",seconds:1.2,fx:"none"},
    {name:"Keycap catapult",prop:"keyboard",beat:"0 -3;0 6;-3 1;3 3;0 -3",seconds:1.6,fx:"catapult"},
    {name:"Dust-cloud tussle",prop:"keyboard",beat:"-4 2;4 6;-4 6;4 2;-4 2",seconds:1.4,fx:"dust-storm"},
    {name:"Suspicious inspection",prop:"rows",beat:"-4 0;0 0;7 5;7 5;0 0",gaze:"-4 0;0 0;5 3;5 3;0 0",seconds:4,fx:"accuse"},
    {name:"Huff and carry on",prop:"keyboard",beat:"0 0;0 -6;0 -4;0 5;0 0",seconds:3.6,fx:"huff"}
  ],
  sad:[
    {name:"Typing through a flood",prop:"flood",beat:"0 0;0 2;-2 0;2 1;0 0",seconds:3.2,tear:"waterfall",fx:"none"},
    {name:"Sniffle and refocus",prop:"keyboard",beat:"0 3;0 -4;-4 -2;4 -2;0 3",seconds:4.4,tear:"flick",fx:"breath"},
    {name:"One eye on the job",prop:"keyboard",beat:"-5 2;-5 2;3 1;0 -3;-5 2",seconds:4.8,tear:"lens",fx:"none"},
    {name:"Whiny work rhythm",prop:"flood",beat:"0 2;-3 5;0 2;3 5;0 2",seconds:2.4,tear:"waterfall",fx:"sob"},
    {name:"Brave little reset",prop:"keyboard",beat:"0 6;0 6;0 -5;0 2;0 0",seconds:5.6,tear:"corners",fx:"pressure"}
  ]
};

// Poses are five integer-aligned acting beats; entries hold their final pose.
export const requestBeats={
  happy:["0 0;-5 -2;3 -3;0 0;0 0","0 0;5 2;-2 -2;0 0;0 0","0 4;0 7;-2 1;0 0;0 0"],
  excited:["0 0;0 -8;0 3;0 0;0 0","0 0;0 -5;0 4;0 0;0 0","-4 0;4 -3;-3 -2;0 0;0 0"],
  proud:["0 -3;-5 -3;5 1;0 -2;0 -2","3 -3;3 -3;-3 0;0 -2;0 -2","-4 -2;-4 -2;4 0;0 -1;0 -1"],
  curious:["0 0;-6 2;3 -2;0 0;0 0","5 3;7 4;0 -3;0 0;0 0","-8 2;-8 2;5 -2;0 0;0 0"],
  determined:["0 3;0 -2;0 1;0 0;0 0","-3 0;3 -2;0 -3;0 0;0 0","0 4;0 4;0 -4;0 0;0 0"],
  grumpy:["0 1;0 7;-3 2;0 0;0 0","5 1;5 1;-5 0;0 0;0 0","0 -4;0 -4;0 3;0 0;0 0"],
  sad:["0 4;-5 4;0 1;0 0;0 0","0 7;0 7;0 -3;0 0;0 0","-6 7;-6 7;1 2;0 0;0 0"]
};
export const completeBeats={
  happy:["0 0;0 -5;0 3;0 0;0 0","0 0;-7 -3;7 -3;0 0;0 0","0 -5;0 -5;0 4;0 0;0 0"],
  excited:["0 0;0 -12;0 5;0 -4;0 0","-7 0;7 -6;-7 0;0 -3;0 0","0 -8;0 4;0 4;0 -3;0 0"],
  proud:["0 -3;0 9;0 12;3 2;0 0","0 0;0 -6;-3 -3;3 -3;0 0","0 -5;0 -5;0 8;0 3;0 0"],
  curious:["5 3;5 3;-4 -2;0 0;0 0","0 0;6 3;6 3;-3 -2;0 0","-4 4;0 -5;4 -2;0 0;0 0"],
  determined:["0 3;0 -4;0 5;0 0;0 0","0 3;0 -6;0 -6;0 2;0 0","-3 1;3 1;0 -3;0 0;0 0"],
  grumpy:["0 0;0 -3;0 6;0 1;0 0","0 0;-5 1;5 1;0 0;0 0","-3 1;-3 1;3 -2;0 0;0 0"],
  sad:["0 4;0 4;-2 1;0 -2;0 0","0 0;0 10;-3 7;2 2;0 0","0 6;0 -5;0 -5;0 3;0 0"]
};
export const listeningBeats={
  happy:["0 0;0 -2;0 -2;0 0;0 0","-4 0;-2 -3;-2 -3;0 0;0 0","3 1;3 1;0 0;0 0;0 0"],
  excited:["0 0;0 -5;0 1;0 0;0 0","4 -2;4 -2;0 0;0 0;0 0","0 0;0 -4;0 2;0 0;0 0"],
  proud:["0 -4;0 -4;0 -1;0 0;0 0","-4 -2;-4 -2;0 0;0 0;0 0","0 -5;0 -5;0 1;0 0;0 0"],
  curious:["-5 1;-5 1;-2 -2;0 0;0 0","5 2;5 2;1 0;0 0;0 0","-4 2;4 -2;0 0;0 0;0 0"],
  determined:["0 1;0 0;0 0;0 0;0 0","0 0;0 -3;0 -3;0 0;0 0","0 3;0 3;0 -1;0 0;0 0"],
  grumpy:["2 2;0 1;0 0;0 0;0 0","5 0;5 0;-2 -2;0 0;0 0","0 4;0 4;0 -1;0 0;0 0"],
  sad:["0 2;0 1;0 0;0 0;0 0","0 6;0 6;0 -2;0 0;0 0","0 0;0 -2;1 2;0 0;0 0"]
};
