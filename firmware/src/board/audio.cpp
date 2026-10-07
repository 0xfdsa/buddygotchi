// The voice task, the same on every board: it renders the voice player, mixes the sound
// effects in, and hands each chunk to the board's output (board/audio_out.h),
// turning the amp on only while something plays.
#include "board/audio.h"

#include <Arduino.h>
#include <esp_timer.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>

#include "board/audio_out.h"
#include "board/board_hal.h"

namespace board {

namespace {

// The task writes one chunk at a time and never lets the output run dry:
// silence when there's nothing to say.
constexpr size_t kChunk = audio_out::kChunk;

// Effects neither replace nor hush a line: they mix under it.
enum class Kind : uint8_t { kSay, kHush, kEffect, kStopEffects };
struct Cmd {
  Kind kind;
  voice::Line line;
  voice::Effect effect;
};
// The amp stays on this many chunks (about a second) after the last sound:
// what's queued has to play first, and a working design's clicks come a
// few times a second, so it doesn't switch on and off between them.
constexpr int kAmpHold = 44;
// Deep enough for the busiest design's events between two passes of the
// main loop, and a line.
constexpr int kQueue = 8;

QueueHandle_t queue = nullptr;
portMUX_TYPE lock = portMUX_INITIALIZER_UNLOCKED;
app::AudioOut stats;  // guarded by `lock`
voice::Player player;
voice::Effects effects;
uint8_t chunk[kChunk];

// The line being played, for its timeline. Writes return at the DMA's
// pace, so the time between the write before the line and the write that
// finished it is how long the output took to play those chunks.
struct Current {
  bool line = false;
  int take = -1;
  uint32_t planMs = 0;
  uint32_t samples = 0;  // line samples rendered
  uint32_t chunks = 0;   // chunks they span
  int64_t startUs = 0;
};
Current cur;
int64_t lastWriteUs = 0;
int drain = 0;  // chunks left before the amp goes off (kAmpHold)

template <typename F>
void locked(F f) {
  portENTER_CRITICAL(&lock);
  f();
  portEXIT_CRITICAL(&lock);
}

void finish(bool cut) {
  if (!cur.line) return;
  uint32_t wall = 0;
  if (cur.chunks) {  // the output's pace, over the line's own samples
    int64_t us = (lastWriteUs - cur.startUs) * int64_t(cur.samples) / int64_t(cur.chunks * kChunk);
    wall = uint32_t(us / 1000);
  }
  locked([&] {
    ++stats.lines;
    stats.take = cur.take;
    stats.planMs = cur.planMs;
    stats.outMs = cur.samples * 1000 / voice::kOutRate;
    stats.wallMs = wall;
    stats.cut = cut;
  });
  cur = Current{};
}

void applyVoice(const Cmd& c) {
  if (cur.line) finish(true);  // anything new replaces a line
  switch (c.kind) {
    case Kind::kSay:
      player.start(c.line);
      if (player.playing()) {
        cur.line = true;
        cur.take = c.line.take;
        cur.planMs = voice::lineSamples(c.line) * 1000 / voice::kOutRate;
        cur.startUs = lastWriteUs;
      }
      break;
    case Kind::kHush: player.stop(); break;
    default: break;
  }
}

bool sounding() { return player.playing() || effects.playing(); }

void apply(const Cmd& c) {
  if (c.kind == Kind::kEffect || c.kind == Kind::kStopEffects) {
    if (c.kind == Kind::kEffect) effects.play(c.effect);
    else effects.stop();
  } else {
    applyVoice(c);
  }
  if (sounding()) {
    audio_out::amp(true);
    drain = 0;
    locked([] { stats.playing = true; });
  } else if (drain == 0) {
    drain = kAmpHold;  // hushed: let the queue play out, then the amp goes off
  }
}

void task(void*) {
  Cmd c;
  for (;;) {
    while (xQueueReceive(queue, &c, 0) == pdTRUE) apply(c);
    bool was = player.playing();
    bool wasAny = sounding();
    bool speaking = player.playing();  // a line, which the effects go under
    size_t made = player.render(chunk, kChunk);
    effects.mix(chunk, kChunk, speaking);
    if (!audio_out::write(chunk)) locked([] { ++stats.errors; });
    lastWriteUs = esp_timer_get_time();
    if (cur.line && made) cur.samples += made, ++cur.chunks;
    if (was && !player.playing()) finish(false);
    if (wasAny && !sounding()) drain = kAmpHold;
    if (drain > 0 && --drain == 0 && !sounding()) {
      audio_out::amp(false);
      locked([] { stats.playing = false; });
    }
  }
}

void send(const Cmd& c) {
  if (!queue) return;
  if (xQueueSend(queue, &c, 0) != pdTRUE) {  // full: the newest wins
    Cmd old;
    xQueueReceive(queue, &old, 0);
    xQueueSend(queue, &c, 0);
  }
}

}  // namespace

bool audioBegin() {
  if (!audio_out::begin()) return false;
  queue = xQueueCreate(kQueue, sizeof(Cmd));
  if (!queue) return false;
  // Above Bluetooth's host task, so the DMA never runs dry. Its stack has
  // room for reading the card (FatFs and the SPI driver) as it plays.
  if (xTaskCreatePinnedToCore(task, "voice", 6144, nullptr, configMAX_PRIORITIES - 3, nullptr, 0) != pdPASS)
    return false;
  stats.ready = true;
  return true;
}

// BoardHal's sound: the queue to the task, its figures and the amp.
void BoardHal::say(const voice::Line& l) { send({Kind::kSay, l, {}}); }
void BoardHal::hush() { send({Kind::kHush, {}, {}}); }
void BoardHal::effect(const voice::Effect& e) { send({Kind::kEffect, {}, e}); }
void BoardHal::stopEffects() { send({Kind::kStopEffects, {}, {}}); }

app::AudioOut BoardHal::audioOut() {
  app::AudioOut a;
  locked([&] { a = stats; });
  return a;
}

bool BoardHal::ampOn() { return audio_out::ampOn(); }

}  // namespace board
