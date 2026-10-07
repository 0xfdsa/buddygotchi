// Optional stage timing for BOOP_GEL_PROFILE builds: the
// board supplies a microsecond clock and the drawing code times its own
// stages with Measure. With no clock it costs nothing and measures nothing.
#pragma once
#include <cstdint>
namespace render {
inline uint32_t (*profileClock)() = nullptr;
// Adds the microseconds of its scope to `total`.
struct Measure {
  uint32_t& total;
  uint32_t start;
  explicit Measure(uint32_t& value) : total(value), start(profileClock ? profileClock() : 0) {}
  ~Measure() {
    if (profileClock) total += profileClock() - start;
  }
};
}  // namespace render
