#include "render/pattern.h"

#include "render/font.h"

namespace render {

namespace {

// A label in the strip's font. The fonts draw over black, so each sits on a
// black plate around its capitals (rows 5 to 13 of the 18-row cell).
void label(Canvas& c, int x, int y, const char* text) {
  c.fillRect(x - 2, y + 3, stringWidth(kSmall, text) + 4, 13, kBlack);
  drawString(c, kSmall, x, y, text, kInkAmber);
}

}  // namespace

void drawPattern(Canvas& c) {
  c.fill(kGrey);

  // The UP arrow, pointing at the top edge.
  const int ax = kWidth / 2;
  c.fillTriangle(ax, 14, ax - 56, 70, ax + 56, 70, kWhite);
  c.fillRect(ax - 22, 70, 44, 44, kWhite);
  label(c, ax - stringWidth(kSmall, "UP") / 2, 85, "UP");

  for (const PatternBlock& b : kPatternBlocks) c.fillRect(b.x, b.y, b.w, b.h, b.color);

  // The USB-C side: a black bar down the left edge, and a label pointing at it.
  c.fillRect(0, kPatternUsbTop, kPatternUsbW, kPatternUsbBottom - kPatternUsbTop, kBlack);
  const int tipX = kPatternUsbW + 4, ty = 42;
  c.fillTriangle(tipX, ty + 7, tipX + 8, ty, tipX + 8, ty + 14, kBlack);
  label(c, tipX + 12, ty - 2, "USB-C");

  // Labelled corners.
  const int right = kWidth - 4 - stringWidth(kSmall, "TR"), bottom = kHeight - 16;
  label(c, 4, -2, "TL");
  label(c, right, -2, "TR");
  label(c, 4, bottom, "BL");
  label(c, right, bottom, "BR");
}

}  // namespace render
