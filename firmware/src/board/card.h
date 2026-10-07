// The microSD card: mounted on the
// second hardware SPI bus at boot, with the voice pack Boop says its takes
// from. With no card, or no pack on it, Boop has no voice.
#pragma once

namespace board {

// Mounts the card and opens /boop/voice.bin for voice::openPack. False
// when there's no card or no pack; BoardHal's cardState says which
// (dbg.ping's `card`). A new pack copied on over USB
// (dbg.card) goes to /boop/voice.tmp, begun afresh or kept, appended to,
// then checked and renamed over the pack, which reopens (BoardHal's
// packBegin, packAppend and packEnd).
bool cardBegin();

}  // namespace board
