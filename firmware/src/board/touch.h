// The touch controller: the CYD's XPT2046 on
// bit-banged SPI (cyd24/touch.cpp), or the AMOLED board's FT3168 on I2C
// (amoled206/touch.cpp).
#pragma once

namespace board {

void touchBegin();
// The controller's raw reading (no mapping) and whether it reports a touch;
// z is 0 with no press. BoardHal maps it to screen pixels (app/touch_cal.h).
void touchRaw(int& x, int& y, int& z, bool& irq);

}  // namespace board
