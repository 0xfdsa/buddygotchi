---
name: webcam-verify
description: Verify Boop's physical screen and animations using bounded webcam recordings and consecutive-frame review. Use only when the user explicitly requests webcam verification; never activate for ordinary testing, animation edits, or a connected device alone.
---

# Opt-in webcam verification

The one procedure for Boop's camera. The recorder's commands and what it
writes are in `internal/tools/webcam/README.md`, the L3 checks this serves
are in `internal/VERIFICATION.md` L3, and the camera policy (opt-in, bounded
clips, video only, footage kept local) is in `CLAUDE.md`.

## When

- Only on an explicit request such as "use webcam verification" or
  `$webcam-verify`. A general request to verify a change doesn't turn the
  camera on.
- Before the first live clip, the owner confirms the board is positioned
  for this session. One "ready" covers the session; ask again only after
  setup has ended or in a later session. Earlier camera permission and
  recordings don't count as permission to record now.
- Record bounded clips for the requested scenarios, then stop: no
  background monitoring, no automatic later captures, and no webcam step
  in normal tests. Reviewing recordings you're given needs no setup.

## Procedure

1. **Record from the right terminal.** Camera commands
   (`webcam.sh record`, `boopctl cam …`, `boopctl e2e --clip`) work only
   in a terminal the Claude app opens (its Terminal panel); an agent's own
   shell has no camera permission. Commands that only talk to the board
   can run anywhere.
2. **Frame.** List the cameras (`internal/tools/webcam/webcam.sh list`)
   and pick one explicitly. Check the framing with
   `internal/tools/boopctl cam frame --camera ID`, or a short clip and its
   `preview.png`. If the screen is out of frame or unreadable, ask for it
   to be moved before recording the scenarios.
3. **Drive the board,** either through the owner's app over Bluetooth or
   over USB. For USB, check `internal/tools/boopctl ping` first: `ble`
   must not be `conn` and `link` must not be `ble`, because a connected
   Mac app's `state` messages replace yours (VERIFICATION L2). Don't
   launch the app to fix it; ask the owner. Note the installed firmware's
   `fw` and `sha` from `ping`, and don't flash just to use this skill.
   `internal/tools/boopctl cam clip <name>` plays an L3 preset with the
   clock running and saves a contact sheet of 18 frames spread over the
   clip, then deletes the video: enough to judge "looks right", too sparse
   for smoothness. For motion, or anything else, let the clock run
   (`internal/tools/boopctl send '{"t":"dbg.clock","run":true}'`) and
   drive the board with `internal/tools/boopctl play …` or `send` while
   `webcam.sh record` runs, then `webcam.sh analyze` the interval.
4. **Record.** Start recording before the motion, and trigger it after
   `RECORDING` prints. Time onset and duration from the video's own
   timestamps; the host's timing and the requested length are
   approximate. Put the board back as it was afterwards where you can.
5. **Review.** Crop to the screen and look at every consecutive frame
   across the motion and its settling. Compare with the simulator's
   goldens. Allow for the screen's orientation, exposure, the panel's
   scan and the camera's cadence (a frame every 33 ms at 30 fps). Check
   for continuous motion, overshoot and settling, repeated or abrupt
   jumps, and the return to rest. Clean timestamps alone can't prove
   smoothness, and an ambiguous artefact is inconclusive. Say so when you
   reviewed image sequences without real-time playback.
6. **Report** in a `review.md` beside the evidence: the scenario, what
   moved when, the firmware, capture quality, deviations from the spec,
   limitations, and pass, fail or inconclusive. Room footage stays local
   and out of git; only chosen crops go into the repo. Don't present a
   limited scenario review as a full hardware pass.

`make -C internal tools-test` checks the recorder on synthetic video without opening a
camera, so it doesn't need this skill.
