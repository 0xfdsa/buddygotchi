#include "linkkit/codec.h"

namespace linkkit {

uint32_t crc32(const uint8_t* data, size_t n, uint32_t crc) {
  crc = ~crc;
  for (size_t i = 0; i < n; ++i) {
    crc ^= data[i];
    for (int k = 0; k < 8; ++k) crc = (crc >> 1) ^ (0xEDB88320u & (0u - (crc & 1u)));
  }
  return ~crc;
}

static const char kAlphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

long base64Decode(const char* text, size_t n, uint8_t* out, size_t cap) {
  if (n % 4) return -1;
  size_t made = 0;
  for (size_t i = 0; i < n; i += 4) {
    uint32_t v = 0;
    int pad = 0;
    for (int k = 0; k < 4; ++k) {
      char c = text[i + k];
      int d = c >= 'A' && c <= 'Z' ? c - 'A' : c >= 'a' && c <= 'z' ? c - 'a' + 26 : c >= '0' && c <= '9' ? c - '0' + 52
              : c == '+' ? 62 : c == '/' ? 63 : -1;
      if (c == '=' && i + 4 == n && k >= 2) d = 0, ++pad;
      else if (d < 0 || pad) return -1;
      v = v << 6 | uint32_t(d);
    }
    size_t bytes = 3 - pad;
    if (made + bytes > cap) return -1;
    for (size_t k = 0; k < bytes; ++k) out[made++] = uint8_t(v >> (16 - 8 * k));
  }
  return long(made);
}

void Base64Writer::write(const uint8_t* data, size_t n) {
  for (size_t i = 0; i < n; ++i) {
    pend_[npend_++] = data[i];
    if (npend_ < 3) continue;
    uint32_t v = (uint32_t(pend_[0]) << 16) | (uint32_t(pend_[1]) << 8) | pend_[2];
    out_[nout_++] = kAlphabet[(v >> 18) & 63];
    out_[nout_++] = kAlphabet[(v >> 12) & 63];
    out_[nout_++] = kAlphabet[(v >> 6) & 63];
    out_[nout_++] = kAlphabet[v & 63];
    npend_ = 0;
    if (nout_ + 4 > sizeof(out_)) flushOut();
  }
}

void Base64Writer::finish() {
  if (npend_ > 0) {
    uint32_t v = uint32_t(pend_[0]) << 16;
    if (npend_ > 1) v |= uint32_t(pend_[1]) << 8;
    out_[nout_++] = kAlphabet[(v >> 18) & 63];
    out_[nout_++] = kAlphabet[(v >> 12) & 63];
    out_[nout_++] = npend_ > 1 ? kAlphabet[(v >> 6) & 63] : '=';
    out_[nout_++] = '=';
    npend_ = 0;
  }
  flushOut();
}

void Base64Writer::flushOut() {
  if (nout_) sink_(ctx_, out_, nout_);
  nout_ = 0;
}

}  // namespace linkkit
