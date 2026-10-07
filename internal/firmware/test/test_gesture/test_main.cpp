// Boop's BOOT button: a tap, and a hold for push-to-talk.
#include <unity.h>

#include "app/gesture.h"

using app::ButtonGesture;

void setUp() {}
void tearDown() {}

static void test_short_press_is_a_tap() {
  ButtonGesture g;
  TEST_ASSERT_EQUAL(ButtonGesture::kDown, g.update(true, 1000));
  TEST_ASSERT_EQUAL(ButtonGesture::kNone, g.update(true, 1399));
  TEST_ASSERT_EQUAL(ButtonGesture::kTap, g.update(false, 1399));
}

// Held 400 ms or more, a press is push-to-talk from then
// until the release, and the release is no tap.
static void test_hold_is_push_to_talk() {
  TEST_ASSERT_EQUAL_UINT32(400, ButtonGesture::kHoldMs);
  ButtonGesture g;
  g.update(true, 0);
  TEST_ASSERT_EQUAL(ButtonGesture::kNone, g.update(true, 399));
  TEST_ASSERT_EQUAL(ButtonGesture::kHoldStart, g.update(true, 400));
  TEST_ASSERT_TRUE(g.holding());
  TEST_ASSERT_EQUAL(ButtonGesture::kNone, g.update(true, 5000));
  TEST_ASSERT_EQUAL(ButtonGesture::kHoldEnd, g.update(false, 5000));
  TEST_ASSERT_FALSE(g.down());
  TEST_ASSERT_FALSE(g.holding());
  // The next press starts afresh: a tap.
  TEST_ASSERT_EQUAL(ButtonGesture::kDown, g.update(true, 6000));
  TEST_ASSERT_EQUAL(ButtonGesture::kTap, g.update(false, 6100));
}

// Talking stops by itself 30 s after it started, however long
// BOOT stays down, and the release after that sends nothing.
static void test_talk_is_capped_at_30_s() {
  TEST_ASSERT_EQUAL_UINT32(30000, ButtonGesture::kTalkCapMs);
  ButtonGesture g;
  g.update(true, 1000);
  TEST_ASSERT_EQUAL(ButtonGesture::kHoldStart, g.update(true, 1400));
  TEST_ASSERT_EQUAL(ButtonGesture::kNone, g.update(true, 1400 + 29999));
  TEST_ASSERT_EQUAL(ButtonGesture::kHoldEnd, g.update(true, 1400 + 30000));
  TEST_ASSERT_TRUE(g.down());
  TEST_ASSERT_FALSE(g.holding());
  TEST_ASSERT_EQUAL(ButtonGesture::kNone, g.update(true, 90000));
  TEST_ASSERT_EQUAL(ButtonGesture::kNone, g.update(false, 90000));
  TEST_ASSERT_EQUAL(ButtonGesture::kDown, g.update(true, 91000));
  TEST_ASSERT_EQUAL(ButtonGesture::kTap, g.update(false, 91100));
}

static void test_bounces_are_ignored() {
  ButtonGesture g;
  g.update(true, 0);
  TEST_ASSERT_EQUAL(ButtonGesture::kNone, g.update(false, 5));  // bounce
  TEST_ASSERT_TRUE(g.down());
  TEST_ASSERT_EQUAL(ButtonGesture::kTap, g.update(false, 60));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_short_press_is_a_tap);
  RUN_TEST(test_hold_is_push_to_talk);
  RUN_TEST(test_talk_is_capped_at_30_s);
  RUN_TEST(test_bounces_are_ignored);
  return UNITY_END();
}
