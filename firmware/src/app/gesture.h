// Turns a button's raw up/down level into taps and push-to-talk:
// a press shorter than kHoldMs is a tap, sent on
// release; held kHoldMs or more, it's push-to-talk from then until the
// release, or until kTalkCapMs of talking. Debounced; pure C++, driven by
// the device clock.
#pragma once
#include <cstdint>

namespace app {

class ButtonGesture {
 public:
  enum Event : uint8_t { kNone, kDown, kTap, kHoldStart, kHoldEnd };

  static constexpr uint32_t kHoldMs = 400;
  static constexpr uint32_t kTalkCapMs = 30000;  // from kHoldStart
  static constexpr uint32_t kDebounceMs = 15;

  // Call often with the current level. Returns at most one event per call.
  // kDown comes on the press itself, so the screen can react at once.
  // Then either kTap on a release before kHoldMs, or kHoldStart at kHoldMs
  // and kHoldEnd on the release or at the cap, whichever is first; a
  // release after the cap sends nothing.
  Event update(bool down, uint32_t now);

  bool down() const { return down_; }
  bool holding() const { return holding_; }

 private:
  bool down_ = false;
  bool holding_ = false;  // push-to-talk, since holdAt_
  bool held_ = false;     // this press became push-to-talk, so its release isn't a tap
  bool changed_ = false;  // at least one edge seen, so debounce applies
  uint32_t since_ = 0;
  uint32_t holdAt_ = 0;
};

}  // namespace app
