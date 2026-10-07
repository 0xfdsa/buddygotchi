#include <unity.h>

#include <vector>

#include "render/canvas.h"
#include "render/palette.h"
#include "render/pattern.h"

using render::Canvas;

// A pixel, as the board pushes it.
static uint8_t at(const Canvas& c, int x, int y) { return c.pixels()[y * render::kWidth + x]; }

void setUp() {}
void tearDown() {}

static void test_fill_rect_clips_to_canvas() {
  std::vector<uint8_t> buf(render::kWidth * render::kHeight, 0);
  Canvas c(buf.data());
  c.fillRect(-10, -10, 20, 20, 7);
  TEST_ASSERT_EQUAL_UINT8(7, at(c, 0, 0));
  TEST_ASSERT_EQUAL_UINT8(7, at(c, 9, 9));
  TEST_ASSERT_EQUAL_UINT8(0, at(c, 10, 10));
  TEST_ASSERT_EQUAL_INT(320, render::kWidth);  // landscape
  TEST_ASSERT_EQUAL_INT(240, render::kHeight);
  c.fillRect(310, 230, 50, 50, 3);
  TEST_ASSERT_EQUAL_UINT8(3, at(c, 319, 239));
  TEST_ASSERT_EQUAL_UINT8(0, at(c, 309, 239));
  TEST_ASSERT_EQUAL_UINT8(0, at(c, 319, 229));
}

static void test_fill_covers_everything() {
  std::vector<uint8_t> buf(render::kWidth * render::kHeight, 0);
  Canvas c(buf.data());
  c.fill(5);
  TEST_ASSERT_EQUAL_UINT8(5, at(c, 0, 0));
  TEST_ASSERT_EQUAL_UINT8(5, at(c, 319, 239));
}

static void test_triangle_fills_inside_only() {
  std::vector<uint8_t> buf(render::kWidth * render::kHeight, 0);
  Canvas c(buf.data());
  c.fillTriangle(100, 10, 50, 60, 150, 60, 4);
  TEST_ASSERT_EQUAL_UINT8(4, at(c, 100, 10));  // the tip
  TEST_ASSERT_EQUAL_UINT8(4, at(c, 100, 40));
  TEST_ASSERT_EQUAL_UINT8(0, at(c, 60, 20));   // outside the left edge
  TEST_ASSERT_EQUAL_UINT8(0, at(c, 100, 61));  // below the base
}

static void test_hash_tracks_changes() {
  std::vector<uint8_t> buf(render::kWidth * render::kHeight, 0);
  Canvas c(buf.data());
  uint32_t before = c.hash(0, 5, render::kWidth, 1);
  TEST_ASSERT_EQUAL_UINT32(before, c.hash(0, 6, render::kWidth, 1));
  c.fillRect(render::kWidth - 1, 5, 1, 1, 1);
  TEST_ASSERT_NOT_EQUAL(before, c.hash(0, 5, render::kWidth, 1));
  TEST_ASSERT_EQUAL_UINT32(before, c.hash(0, 6, render::kWidth, 1));
  // Two pixels that each change only a word's top bit don't cancel out.
  uint32_t tile = c.hash(32, 12, 32, 6);
  c.fillRect(35, 12, 1, 1, 0x80);
  c.fillRect(39, 12, 1, 1, 0x80);
  TEST_ASSERT_NOT_EQUAL(tile, c.hash(32, 12, 32, 6));
}

// Only the changed tiles' columns of a band are pushed.
static void test_changes_find_the_columns_to_push() {
  std::vector<uint8_t> buf(render::kWidth * render::kHeight, 0);
  Canvas c(buf.data());
  render::Changes ch;
  for (int b = 0; b < render::kHeight / render::kBand; ++b) {  // everything, the first time
    render::Span s = ch.band(c, b);
    TEST_ASSERT_EQUAL_INT(0, s.x0);
    TEST_ASSERT_EQUAL_INT(render::kWidth, s.x1);
  }
  TEST_ASSERT_TRUE(ch.band(c, 3).empty());  // then nothing, until something changes
  c.fillRect(100, 50, 1, 1, 7);                // band 8, tile 3
  c.fillRect(250, 51, 1, 1, 7);                // band 8, tile 7
  render::Span s = ch.band(c, 50 / render::kBand);
  TEST_ASSERT_EQUAL_INT(96, s.x0);
  TEST_ASSERT_EQUAL_INT(256, s.x1);
  TEST_ASSERT_TRUE(ch.band(c, 50 / render::kBand).empty());
  TEST_ASSERT_TRUE(ch.band(c, 50 / render::kBand + 1).empty());
  c.fillRect(0, render::kHeight - 1, 1, 1, 7);  // the corners
  c.fillRect(render::kWidth - 1, render::kHeight - 1, 1, 1, 7);
  s = ch.band(c, render::kHeight / render::kBand - 1);
  TEST_ASSERT_EQUAL_INT(0, s.x0);
  TEST_ASSERT_EQUAL_INT(render::kWidth, s.x1);
}

static void test_pattern_blocks_have_their_colours() {
  std::vector<uint8_t> buf(render::kWidth * render::kHeight, 0);
  Canvas c(buf.data());
  render::drawPattern(c);
  for (const auto& b : render::kPatternBlocks) {
    TEST_ASSERT_EQUAL_UINT8(b.color, at(c, b.x + b.w / 2, b.y + b.h / 2));
  }
  for (const auto& b : render::kPatternBlocks) {  // on screen, clear of the USB-C bar and the labels
    TEST_ASSERT_TRUE(b.x >= render::kPatternUsbW && b.x + b.w <= render::kWidth);
    TEST_ASSERT_TRUE(b.y >= 0 && b.y + b.h <= render::kHeight - 12);
  }
  const int mid = render::kWidth / 2;
  TEST_ASSERT_EQUAL_UINT8(render::kWhite, at(c, mid, 20));  // the arrow tip is at the top
  TEST_ASSERT_EQUAL_UINT8(render::kGrey, at(c, mid, render::kHeight - 6));  // grey at the bottom
  // The USB-C bar is down the left edge, and the right edge is grey.
  TEST_ASSERT_EQUAL_UINT8(render::kBlack, at(c, 0, render::kHeight / 2));
  TEST_ASSERT_EQUAL_UINT8(render::kBlack, at(c, render::kPatternUsbW - 1, render::kHeight / 2));
  TEST_ASSERT_EQUAL_UINT8(render::kGrey, at(c, render::kWidth - 1, render::kHeight / 2));
  TEST_ASSERT_EQUAL_UINT8(render::kGrey, at(c, 0, 1));  // the bar stops short of the corners
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_fill_rect_clips_to_canvas);
  RUN_TEST(test_fill_covers_everything);
  RUN_TEST(test_triangle_fills_inside_only);
  RUN_TEST(test_hash_tracks_changes);
  RUN_TEST(test_changes_find_the_columns_to_push);
  RUN_TEST(test_pattern_blocks_have_their_colours);
  return UNITY_END();
}
