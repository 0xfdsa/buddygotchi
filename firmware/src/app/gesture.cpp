#include "app/gesture.h"

namespace app {

ButtonGesture::Event ButtonGesture::update(bool down, uint32_t now) {
  if (down != down_) {
    if (changed_ && now - since_ < kDebounceMs) return kNone;  // bounce
    down_ = down;
    changed_ = true;
    since_ = now;
    if (down) {
      held_ = false;
      return kDown;
    }
    if (holding_) {
      holding_ = false;
      return kHoldEnd;
    }
    return held_ ? kNone : kTap;  // after the cap, the release is nothing
  }
  if (down_ && !held_ && now - since_ >= kHoldMs) {
    holding_ = held_ = true;
    holdAt_ = now;
    return kHoldStart;
  }
  if (holding_ && now - holdAt_ >= kTalkCapMs) {
    holding_ = false;
    return kHoldEnd;
  }
  return kNone;
}

}  // namespace app
