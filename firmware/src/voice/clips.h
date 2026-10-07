// A face's sound-effect clips: 11.025 kHz,
// unsigned 8-bit, 128 as silence. Each face brings its own bank
// (render::Face::clips), so the mixer never knows which face is drawing,
// and a board could carry two faces with two banks.
#pragma once
#include <cstdint>
#include <cstring>

namespace voice {

struct EffectClip {
  const char* name = "";
  const uint8_t* samples = nullptr;
  uint32_t len = 0;  // samples
};

class EffectClips {
 public:
  virtual ~EffectClips() = default;
  virtual int count() const = 0;
  // An empty clip, named "", out of range.
  virtual EffectClip at(int clip) const = 0;
  virtual const char* version() const = 0;
  virtual uint32_t bytes() const = 0;  // the samples, in flash
  // By name; -1 if unknown.
  int index(const char* name) const {
    for (int i = 0; name && i < count(); ++i)
      if (!std::strcmp(name, at(i).name)) return i;
    return -1;
  }
};

}  // namespace voice
