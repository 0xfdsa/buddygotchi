// Reassembles newline-terminated message lines from a byte stream: USB
// serial, or Bluetooth's received bytes (linkkit/packets.h). A trailing
// `\r` is dropped, empty lines are skipped, and a line longer than
// kMaxLine is dropped whole (linkkit/SPEC.md §2). Pure C++.
#pragma once
#include <cstddef>
#include <cstdint>

#include "linkkit/limits.h"

namespace linkkit {

class LineReader {
 public:
  static constexpr size_t kMax = kMaxLine;

  // Feeds one byte. Returns true when a complete line is ready in line().
  bool feed(char c) {
    if (c == '\n') {
      bool ok = !overflow_ && len_ > 0;
      if (len_ > 0 && buf_[len_ - 1] == '\r') --len_;
      buf_[len_] = '\0';
      ready_ = len_;
      len_ = 0;
      overflow_ = false;
      return ok && ready_ > 0;
    }
    if (len_ >= kMax) {
      overflow_ = true;
      return false;
    }
    buf_[len_++] = c;
    return false;
  }

  const char* line() const { return buf_; }
  size_t length() const { return ready_; }

 private:
  char buf_[kMax + 1] = {};
  size_t len_ = 0;
  size_t ready_ = 0;
  bool overflow_ = false;
};

}  // namespace linkkit
