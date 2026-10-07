# sfxgen

Builds `characters/pixel/firmware/include/sfx.h`, Boop's sound effects, from the animation
bank's procedural sounds:

    node characters/pixel/tools/sfxgen/sfxgen.mjs [--wav-dir DIR]

It imports the bank, `characters/pixel/design/boop-sound-bank-v4/runtime/`:
its synthesiser and recipes (`audio/`, unchanged) render the clips, and
`makeScene` gives each design's timeline in the bank's voice-first mix.
A routine design's picks of which contacts sound change each loop, so
this bakes them for loops 0 to 7 (seed 53). The designs, in the device's
order, are the ones `facegen` lists in `../facegen/design/manifest.json`,
with each one's voice window: run `make -C internal faces` first when the
bank changes.
