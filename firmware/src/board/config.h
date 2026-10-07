// The board being built for: its pins (namespace pins) and screen settings
// (namespace board). Each board's code is in its own folder, and its env in
// firmware/platformio.ini builds only that folder.
#pragma once

#if defined(BOOP_BOARD_CYD24)
#include "board/cyd24/config.h"
#elif defined(BOOP_BOARD_AMOLED206)
#include "board/amoled206/config.h"
#else
#error "no board: build with env cyd24 or amoled206 (firmware/platformio.ini)"
#endif
