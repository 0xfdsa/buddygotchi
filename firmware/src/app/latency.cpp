#include "app/latency.h"

#include <algorithm>

namespace app {

const char* Latency::name(Kind k) {
  static const char* const kNames[kKinds] = {"press", "tap", "state", "do", "frame"};
  return k < kKinds ? kNames[k] : "";
}

void Latency::Frame::merge(const Frame& o) {
  for (int k = 0; k < kFrame; ++k) {
    const uint8_t bit = uint8_t(1u << k);
    if ((o.has & bit) && !(has & bit)) has |= bit, at[k] = o.at[k];
  }
}

void Latency::mark(Kind k, uint32_t ms) {
  const uint8_t bit = uint8_t(1u << k);
  if (k >= kFrame || (pending_.has & bit)) return;
  pending_.has |= bit;
  pending_.at[k] = ms;
}

void Latency::drawn() {
  drawing_.merge(pending_);
  pending_ = Frame{};
}

void Latency::handed() {
  if (flights_ == kInFlight) {  // never shown: its events are lost, not counted
    for (int i = 1; i < kInFlight; ++i) flight_[i - 1] = flight_[i];
    --flights_;
  }
  flight_[flights_++] = drawing_;
  drawing_ = Frame{};
}

void Latency::shown(uint32_t ms) {
  if (sent_) add(kFrame, lastShown_, ms);
  sent_ = true;
  lastShown_ = ms;
  if (!flights_) return;
  const Frame f = flight_[0];
  for (int i = 1; i < flights_; ++i) flight_[i - 1] = flight_[i];
  --flights_;
  for (int k = 0; k < kFrame; ++k)
    if (f.has & (1u << k)) add(Kind(k), f.at[k], ms);
}

void Latency::add(Kind k, uint32_t at, uint32_t shown) {
  Window& w = w_[k];
  const uint32_t ms = shown - at;  // the counter may wrap; an event is never after its frame
  w.ms[w.n % kWindow] = uint16_t(std::min<uint32_t>(ms, 0xFFFF));
  ++w.n;
  w.at = at;
  w.shown = shown;
}

void Latency::clear() {
  for (Window& w : w_) w = Window{};
  sent_ = false;
}

Latency::Stats Latency::stats(Kind k) const {
  Stats s;
  if (k >= kKinds) return s;
  const Window& w = w_[k];
  s.n = w.n;
  s.at = w.at;
  s.shown = w.shown;
  const int count = int(std::min<uint32_t>(w.n, kWindow));
  if (!count) return s;
  uint16_t sorted[kWindow];
  std::copy(w.ms, w.ms + count, sorted);
  std::sort(sorted, sorted + count);
  // The nearest rank: the smallest sample with at least 95% at or below it.
  s.p95 = sorted[(count * 95 + 99) / 100 - 1];
  s.max = sorted[count - 1];
  return s;
}

}  // namespace app
