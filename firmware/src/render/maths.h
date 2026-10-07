// Integer maths the device and the simulator share, so they agree to the
// pixel and the millisecond.
#pragma once
#include <cstdint>

namespace render {

// Smoothstep ease-in-out: t of `dur` → 0..1024.
constexpr int ease(int t, int dur) {
  if (dur <= 0 || t >= dur) return 1024;
  if (t <= 0) return 0;
  int64_t u = int64_t(t) * 1024 / dur;  // 0..1024
  return int(u * u * (3 * 1024 - 2 * u) / (1024 * 1024));
}

// v, held within [lo, hi].
constexpr int clamp(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }

}  // namespace render
