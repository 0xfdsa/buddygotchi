// The screen on the Waveshare ESP32-S3-Touch-AMOLED-2.06:
// the CO5300 through LovyanGFX on quad SPI. Gel uses native pixels, turned
// a quarter during transfer by a task of its own on core 0 while the loop
// draws the next frame; indexed diagnostics retain 1.5× (board/config.h).
#include "board/display.h"

#define LGFX_USE_V1
#include <Arduino.h>
#include <LovyanGFX.hpp>
#include <esp_heap_caps.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/task.h>

#include <algorithm>
#include <atomic>

#include "board/config.h"
#include "render/palette.h"

namespace board {
namespace {

class Panel : public lgfx::LGFX_Device {
 public:
  Panel() {
    {
      auto cfg = bus_.config();
      cfg.spi_host = SPI2_HOST;
      cfg.spi_mode = 0;
      cfg.freq_write = kSpiWriteHz;
      cfg.freq_read = 16000000;
      cfg.spi_3wire = true;
      cfg.use_lock = true;
      cfg.dma_channel = SPI_DMA_CH_AUTO;
      cfg.pin_sclk = pins::kLcdSclk;
      cfg.pin_mosi = -1;
      cfg.pin_miso = -1;
      cfg.pin_dc = -1;
      cfg.pin_io0 = pins::kLcdIo0;
      cfg.pin_io1 = pins::kLcdIo1;
      cfg.pin_io2 = pins::kLcdIo2;
      cfg.pin_io3 = pins::kLcdIo3;
      bus_.config(cfg);
      panel_.setBus(&bus_);
    }
    {
      auto cfg = panel_.config();
      cfg.pin_cs = pins::kLcdCs;
      cfg.pin_rst = -1;  // reset in displayBegin, held longer than LovyanGFX holds it
      cfg.pin_busy = -1;
      cfg.memory_width = kPanelWidth;
      cfg.memory_height = kPanelHeight;
      cfg.panel_width = kPanelWidth;
      cfg.panel_height = kPanelHeight;
      cfg.offset_x = kPanelOffsetX;
      cfg.offset_y = 0;
      cfg.offset_rotation = 0;
      cfg.readable = false;
      cfg.invert = false;
      cfg.rgb_order = false;
      cfg.dlen_16bit = false;
      cfg.bus_shared = false;
      panel_.config(cfg);
    }
    setPanel(&panel_);
  }

 private:
  lgfx::Bus_SPI bus_;
  lgfx::Panel_CO5300 panel_;
};

// Two bands of the canvas (12 rows) are 18 panel columns, even as the
// CO5300 wants; one batch is at most 18 × 480 px, 17.3 KB.
constexpr int kRows = 2 * render::kBand;
constexpr int kCols = kRows * 3 / 2;
static_assert(render::kBand * 3 % 2 == 0 && (render::kHeight / kRows) * kRows == render::kHeight,
              "two bands must scale to whole, even panel columns");

Panel lcd;
uint16_t* buf[2] = {nullptr, nullptr};
uint16_t swapped[256];   // palette in the panel's byte order
uint16_t along[kPicH];   // panel step along the canvas's columns → canvas column
uint16_t across[kPicW];  // panel step across → canvas row
render::Changes changes;

// The native frames' sender: a task on core 0 below the
// voice task and Bluetooth's host, so it takes only time they leave. It
// sends `job` while the loop, on core 1, draws the next frame. `idle` is
// there to take while no frame is being sent: the loop takes it to hand
// over the next one, or to use the panel itself.
static_assert(render::PushPlan::kRows * kNativeWidth <= kCols * kPicH, "a native band fits a DMA buffer");
constexpr UBaseType_t kPushPriority = 1;
constexpr uint32_t kPushStack = 4096;
struct Job {
  const render::Surface* surface = nullptr;
  render::PushPlan plan;
};
Job job;
TaskHandle_t pusher = nullptr;
SemaphoreHandle_t idle = nullptr;
std::atomic<uint32_t> pushUs{0};
// Frames sent, and when the last two finished (millis, by frame number),
// for displayShown. The loop hands a frame over only once the one before
// has gone, so at most two are sent between two of its passes.
std::atomic<uint32_t> sentFrames{0};
std::atomic<uint32_t> sentAt[2];
uint32_t shownFrames = 0;  // the loop's: frames displayShown has reported

// The plan's bands, each turned into a DMA buffer while the other one sends.
void send(const Job& j) {
  int cur = 0;
  lcd.startWrite();
  for (int b = 0; b < j.plan.bands; ++b) {
    if (j.plan.spans[b].empty()) continue;
    const render::PanelWindow w = render::packBand(*j.surface, b, j.plan.spans[b], kTopOnPanelLeft, buf[cur]);
    lcd.setAddrWindow(w.x, w.y, w.w, w.h);
    lcd.writePixelsDMA(buf[cur], w.w * w.h, false);  // already in panel order
    cur ^= 1;
  }
  lcd.endWrite();  // waits for the last batch
}

void pushTask(void*) {
  for (;;) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    const uint32_t start = micros();
    send(job);
    pushUs.store(micros() - start);
    const uint32_t frame = sentFrames.load();
    sentAt[frame % 2].store(millis());
    sentFrames.store(frame + 1);
    xSemaphoreGive(idle);
  }
}

// The panel to itself, once no frame is being sent: a canvas push or the
// brightness waits for the native frame in flight, at most one push.
struct PanelHeld {
  PanelHeld() {
    if (idle) xSemaphoreTake(idle, portMAX_DELAY);
  }
  ~PanelHeld() {
    if (idle) xSemaphoreGive(idle);
  }
};

// The CO5300's hardware reset, timed as Waveshare's own driver times it
// (Arduino_GFX's CO5300, 200 ms each way). LovyanGFX's 8 ms low and 64 ms
// after were enough from power-up but, after a restart over USB with the
// panel still powered, left it stuck on a white screen until the board
// was unplugged.
constexpr uint32_t kResetMs = 200;

void resetPanel() {
  pinMode(pins::kLcdReset, OUTPUT);
  digitalWrite(pins::kLcdReset, HIGH);
  delay(10);
  digitalWrite(pins::kLcdReset, LOW);
  delay(kResetMs);
  digitalWrite(pins::kLcdReset, HIGH);
  delay(kResetMs);
}

}  // namespace

bool displayBegin() {
  for (int i = 0; i < 2; ++i) {
    buf[i] = static_cast<uint16_t*>(heap_caps_malloc(kCols * kPicH * 2, MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL));
    if (!buf[i]) return false;
  }
  for (int i = 0; i < 256; ++i) {
    uint16_t c = render::paletteAt(i);
    swapped[i] = uint16_t((c << 8) | (c >> 8));
  }
  for (int i = 0; i < kPicH; ++i) along[i] = uint16_t(i * 2 / 3);
  for (int j = 0; j < kPicW; ++j) across[j] = uint16_t(j * 2 / 3);
  resetPanel();
  if (!lcd.init()) return false;
  lcd.setRotation(0);
  lcd.fillScreen(0);
  lcd.setBrightness(255);
  idle = xSemaphoreCreateBinary();
  if (!idle) return false;
  xSemaphoreGive(idle);
  return xTaskCreatePinnedToCore(pushTask, "push", kPushStack, nullptr, kPushPriority, &pusher, 0) == pdPASS;
}

void displayPush(const render::Canvas& canvas) {
  PanelHeld held;
  int cur = 0;
  lcd.startWrite();
  for (int p = 0; p < render::kHeight / kRows; ++p) {
    render::Span a = changes.band(canvas, 2 * p), b = changes.band(canvas, 2 * p + 1);
    if (a.empty() && b.empty()) continue;
    int x0 = a.empty() ? b.x0 : b.empty() ? a.x0 : std::min(a.x0, b.x0);
    int x1 = a.empty() ? b.x1 : b.empty() ? a.x1 : std::max(a.x1, b.x1);
    // The canvas columns [x0, x1) cover panel steps [i0, i1), widened to even.
    int i0 = (3 * x0 + 1) / 2 & ~1, i1 = std::min(kPicH, ((3 * x1 + 1) / 2 + 1) & ~1);
    int px = kTopOnPanelLeft ? kPicX + kCols * p : kPicX + kPicW - kCols * (p + 1);
    int py = kTopOnPanelLeft ? kPicY + kPicH - i1 : kPicY + i0;
    uint16_t* dst = buf[cur];
    for (int k = 0; k < i1 - i0; ++k) {
      int i = kTopOnPanelLeft ? i1 - 1 - k : i0 + k;
      const uint8_t* col = canvas.pixels() + along[i];
      for (int c = 0; c < kCols; ++c) {
        int j = kTopOnPanelLeft ? kCols * p + c : kCols * p + kCols - 1 - c;
        *dst++ = swapped[col[across[j] * render::kWidth]];
      }
    }
    lcd.setAddrWindow(px, py, kCols, i1 - i0);
    lcd.writePixelsDMA(buf[cur], kCols * (i1 - i0), false);  // already in panel order
    cur ^= 1;
  }
  lcd.endWrite();
}

bool displayPush(render::SurfacePair& frames, const render::Canvas& canvas) {
  if (!frames.ready() || frames.front().width != kNativeWidth || frames.front().height != kNativeHeight) return false;
  xSemaphoreTake(idle, portMAX_DELAY);  // the frame before has gone: its surface is the next back()
  job.plan = frames.present(canvas);
  job.surface = &frames.front();
  xTaskNotifyGive(pusher);
  return true;
}

uint32_t displayPushUs() { return pushUs.load(); }

bool displayShown(uint32_t& atMs) {
  if (sentFrames.load() == shownFrames) return false;
  atMs = sentAt[shownFrames++ % 2].load();
  return true;
}

void displayBacklight(uint8_t level) {
  PanelHeld held;
  lcd.setBrightness(level);
}

void displayFailed() {}  // an AMOLED has no backlight to leave on

}  // namespace board
