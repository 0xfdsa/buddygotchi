#include "board/card.h"

#include <Arduino.h>
#include <FS.h>
#include <SD.h>
#include <SPI.h>
#include <fcntl.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <unistd.h>

#include "linkkit/codec.h"
#include "board/board_hal.h"
#include "board/config.h"
#include "voice/player.h"

namespace board {

namespace {

// The card's SPI clock: the probe of 2026-09-29 read about 900 KB/s at
// 10 MHz, eighty times what a line needs.
constexpr uint32_t kCardHz = 10000000;
constexpr const char* kPackPath = "/boop/voice.bin";
constexpr const char* kCopyPath = "/boop/voice.tmp";

SPIClass cardSpi(pins::kCardSpiBus);
const char* state = "no card";

// The pack's bytes from one open file, shared by lookups on the main loop
// and the audio task under a mutex. One file, and a plain POSIX
// descriptor rather than Arduino's File: the mount reserves a FatFs file
// (a 4 KB sector each) for every file it allows open, and a File adds a
// stdio buffer, and the heap is the board's tightest limit.
struct CardSource : voice::Source {
  int fd = -1;
  SemaphoreHandle_t lock = nullptr;
  bool read(uint32_t at, void* buf, uint32_t n) override {
    if (!lock || xSemaphoreTake(lock, pdMS_TO_TICKS(200)) != pdTRUE) return false;
    bool ok = fd >= 0 && ::lseek(fd, off_t(at), SEEK_SET) == off_t(at) && ::read(fd, buf, n) == ssize_t(n);
    if (!ok && fd >= 0) {
      // A card pulled out or failing: FatFs keeps the error, so the file
      // won't read again. Let it go, so later lookups fail at once instead
      // of asking the card over SPI each time, until a mount opens it again.
      ::close(fd);
      fd = -1;
      state = "card failed";
    }
    xSemaphoreGive(lock);
    return ok;
  }
  bool open() {
    if (!lock) lock = xSemaphoreCreateMutex();
    close();
    fd = ::open("/sd/boop/voice.bin", O_RDONLY);
    return fd >= 0;
  }
  void close() {
    if (lock) xSemaphoreTake(lock, portMAX_DELAY);
    if (fd >= 0) ::close(fd);
    fd = -1;
    if (lock) xSemaphoreGive(lock);
  }
};
CardSource pack;
bool mounted = false;
File copy;  // the pack being copied on

bool mount() {
  if (!mounted) mounted = SD.begin(pins::kCardCs, cardSpi, kCardHz, "/sd", 1);  // the pack, or a copy of one
  return mounted;
}

bool openPack() {
  if (!pack.open() || !voice::openPack(&pack)) return false;
  state = "ok";
  return true;
}

}  // namespace

bool cardBegin() {
  cardSpi.begin(pins::kCardSclk, pins::kCardMiso, pins::kCardMosi, pins::kCardCs);
  if (!mount()) return false;
  state = "no pack";
  return openPack();
}

bool BoardHal::packBegin(bool keep, uint32_t& have, const char*& why) {
  have = 0;
  if (copy) copy.close();
  if (!mount()) {
    why = "no card";
    return false;
  }
  SD.mkdir("/boop");
  // Boop has no voice while a copy goes on: the one file the mount allows
  // is the copy's.
  hush();
  delay(60);
  voice::closePack();
  pack.close();
  state = "copying";
  if (!keep) SD.remove(kCopyPath);
  copy = SD.open(kCopyPath, FILE_APPEND);
  if (!copy) {
    why = "can't open /boop/voice.tmp";
    return false;
  }
  have = copy.size();
  return true;
}

bool BoardHal::packAppend(const uint8_t* d, size_t n, uint32_t& have) {
  if (!copy) {
    have = 0;
    return false;
  }
  bool ok = !n || copy.write(d, n) == n;
  have = copy.size();
  return ok;
}

// A copy's size and CRC-32 as the card holds them. Its 1 KB buffer is on
// the stack only while it reads: static, it would hold that much of the
// heap for good.
static __attribute__((noinline)) void readBack(uint32_t& got, uint32_t& sum) {
  File f = SD.open(kCopyPath);
  uint8_t buf[1024];
  for (size_t n; f && (n = f.read(buf, sizeof(buf))) > 0; got += n) sum = linkkit::crc32(buf, n, sum);
  if (f) f.close();
}

bool BoardHal::packEnd(uint32_t size, uint32_t crc, const char*& why) {
  if (!copy) {
    why = "no copy begun";
    return false;
  }
  copy.close();
  // Read it all back: what the card holds, not what was sent.
  uint32_t got = 0, sum = 0;
  readBack(got, sum);
  if (got != size || sum != crc) {
    why = got != size ? "wrong size" : "wrong crc";
    state = "no pack";
    openPack();  // the old pack, if there is one, plays again
    return false;
  }
  // Swap it in: nothing plays while the old pack closes.
  hush();
  delay(60);
  voice::closePack();
  pack.close();
  SD.remove(kPackPath);
  state = "no pack";
  if (!SD.rename(kCopyPath, kPackPath) || !openPack()) {
    why = "can't swap it in";
    return false;
  }
  return true;
}

const char* BoardHal::cardState() { return state; }

}  // namespace board
