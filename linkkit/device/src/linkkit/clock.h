// The device clock (linkkit/SPEC.md §7). It normally follows real time;
// tools freeze it, step it and let it run again (dbg.clock), so what an
// app draws repeats exactly. Pure C++.
#pragma once
#include <cstdint>

namespace linkkit {

class Clock {
 public:
  // `real` is the platform's millisecond counter at the time of the call.
  uint32_t now(uint32_t real) const { return frozen_ ? t_ : t_ + (real - realBase_); }
  bool frozen() const { return frozen_; }

  void freeze(uint32_t t) {
    frozen_ = true;
    t_ = t;
  }
  // Steps a frozen clock; a running clock freezes first.
  void step(uint32_t ms, uint32_t real) { freeze(now(real) + ms); }
  void run(uint32_t real) {
    if (!frozen_) return;
    frozen_ = false;
    realBase_ = real;
  }
  // Starts at 0, running (the board) or frozen (the simulator).
  void start(bool frozen, uint32_t real) {
    frozen_ = frozen;
    t_ = 0;
    realBase_ = real;
  }

 private:
  bool frozen_ = false;
  uint32_t t_ = 0;
  uint32_t realBase_ = 0;
};

// Small deterministic random numbers (xorshift32), reseeded when the clock
// freezes.
class Rng {
 public:
  void seed(uint32_t s) { s_ = s ? s : 0x9E3779B9u; }
  uint32_t next() {
    s_ ^= s_ << 13;
    s_ ^= s_ >> 17;
    s_ ^= s_ << 5;
    return s_;
  }
  // Uniform in [lo, hi].
  int range(int lo, int hi) { return lo + int(next() % uint32_t(hi - lo + 1)); }

 private:
  uint32_t s_ = 0x9E3779B9u;
};

}  // namespace linkkit
