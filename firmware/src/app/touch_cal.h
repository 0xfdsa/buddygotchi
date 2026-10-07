// Touch calibration: an affine map from the XPT2046's
// raw readings to screen pixels. `boopctl calibrate` fits it from 4 taps and
// sends it with dbg.touchcal; the board keeps it in NVS. Until then the
// default map below is used. Pure C++.
#pragma once
#include <cstddef>
#include <cstdint>
#include <cstring>

#include "render/canvas.h"
#include "render/maths.h"

namespace app {

// The raw range the XPT2046 reports across the panel, on both axes, before
// calibration.
constexpr int kTouchRawMin = 200, kTouchRawMax = 3900;

struct TouchCal {
  // x = (ax·rx + bx·ry + cx) / 65536, and the same for y.
  int32_t ax = 0, bx = 0, cx = 0;
  int32_t ay = 0, by = 0, cy = 0;
  bool valid = false;

  void map(int rx, int ry, int& x, int& y) const {
    int64_t fx = int64_t(ax) * rx + int64_t(bx) * ry + cx;
    int64_t fy = int64_t(ay) * rx + int64_t(by) * ry + cy;
    x = render::clamp(int((fx + 32768) >> 16), 0, render::kWidth - 1);
    y = render::clamp(int((fy + 32768) >> 16), 0, render::kHeight - 1);
  }
};

// The map to use before calibration: the raw range stretched over the
// panel as it's built (raw x along its 240 px side, raw y along its 320 px
// side, as LovyanGFX assumes), then turned by `rotation` (LovyanGFX's
// quarter turns clockwise, board/cyd24/config.h kRotation) exactly as the
// picture is. Which way the raw axes really run is unconfirmed until a
// calibration; the calibration fixes any mismatch.
inline TouchCal defaultTouchCal(int rotation) {
  rotation &= 3;
  const int pw = rotation & 1 ? render::kHeight : render::kWidth;  // the panel's own width
  const int ph = rotation & 1 ? render::kWidth : render::kHeight;
  const int64_t span = kTouchRawMax - kTouchRawMin, one = 65536;
  const int32_t sx = int32_t((pw - 1) * one / span), sy = int32_t((ph - 1) * one / span);
  const int32_t ox = -kTouchRawMin * sx, oy = -kTouchRawMin * sy;  // raw min → 0
  const int32_t fx = int32_t((pw - 1) * one) - ox, fy = int32_t((ph - 1) * one) - oy;  // raw min → far edge
  TouchCal c;
  switch (rotation) {
    case 0: c.ax = sx, c.cx = ox, c.by = sy, c.cy = oy; break;    // (px, py)
    case 1: c.bx = sy, c.cx = oy, c.ay = -sx, c.cy = fx; break;   // (py, pw-1-px)
    case 2: c.ax = -sx, c.cx = fx, c.by = -sy, c.cy = fy; break;  // (pw-1-px, ph-1-py)
    default: c.bx = -sy, c.cx = fy, c.ay = sx, c.cy = ox; break;  // (ph-1-py, px)
  }
  c.valid = true;
  return c;
}

// What NVS keeps: the map and the screen it was fitted on. A map fitted on
// another screen, like a portrait build's or one from before kRotation was
// flipped, is never applied; the default map is used until `boopctl
// calibrate` runs again.
struct SavedTouchCal {
  uint16_t w = 0, h = 0;
  uint8_t rotation = 0;
  TouchCal cal;
};

inline SavedTouchCal saveTouchCal(const TouchCal& c, int rotation) {
  SavedTouchCal s;
  s.w = uint16_t(render::kWidth), s.h = uint16_t(render::kHeight), s.rotation = uint8_t(rotation);
  s.cal = c;
  return s;
}

// The stored map, if `n` bytes at `blob` were saved for this screen size and
// rotation. False for anything else, including the old portrait record.
inline bool loadTouchCal(const void* blob, size_t n, int rotation, TouchCal& out) {
  SavedTouchCal s;
  if (!blob || n != sizeof(s)) return false;
  std::memcpy(&s, blob, sizeof(s));
  if (s.w != render::kWidth || s.h != render::kHeight || s.rotation != rotation || !s.cal.valid) return false;
  out = s.cal;
  return true;
}

}  // namespace app
