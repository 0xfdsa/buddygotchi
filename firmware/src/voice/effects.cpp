#include "voice/effects.h"

#include "voice/player.h"

namespace voice {

namespace {
constexpr uint32_t kCutFade = kOutRate * 4 / 1000;
}  // namespace

void Effects::play(const Effect& e) {
  if (!e.samples || e.len < 2 || e.vol == 0 || e.gain == 0) return;
  Voice* v = &voices_[0];  // a free voice, or else the oldest
  for (Voice& c : voices_) {
    if (!c.samples) {
      v = &c;
      break;
    }
    if (c.seq < v->seq) v = &c;
  }
  v->samples = e.samples;
  v->len = e.len;
  v->src = 0;
  // Clips are 11.025 kHz and the output 22.05 kHz: half a source sample per step.
  v->step = uint32_t(e.pitch) * 32768u / 1000u;
  v->gain = int(e.gain) * (int(e.vol > 10 ? 10 : e.vol) * 256 / 10);
  v->duck = e.duck;
  v->fade = 0;
  v->seq = ++seq_;
}

void Effects::stop() {
  for (Voice& v : voices_)
    if (v.samples && !v.fade) v.fade = kCutFade;
}

bool Effects::playing() const {
  for (const Voice& v : voices_)
    if (v.samples) return true;
  return false;
}

void Effects::mix(uint8_t* out, size_t n, bool duck) {
  if (!playing()) return;
  for (size_t j = 0; j < n; ++j) {
    int sum = 0;
    for (Voice& v : voices_) {
      if (!v.samples) continue;
      uint32_t k = v.src >> 16, f = v.src & 0xFFFF;
      if (k + 1 >= v.len) {
        v.samples = nullptr;
        continue;
      }
      const uint8_t* d = v.samples;
      int a = int(d[k]) - 128, b = int(d[k + 1]) - 128;
      int s = a + int((int64_t(b - a) * f) >> 16);
      int g = duck && v.duck ? v.gain * kDuck / 256 : v.gain;
      s = int((int64_t(s) * g) >> 16);
      if (v.fade) {
        s = s * int(v.fade) / int(kCutFade);
        if (--v.fade == 0) v.samples = nullptr;
      }
      sum += s;
      v.src += v.step;
    }
    int o = int(out[j]) + sum;
    out[j] = uint8_t(o < 0 ? 0 : o > 255 ? 255 : o);
  }
}

}  // namespace voice
