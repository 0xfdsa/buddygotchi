// The Pixel pack's face (characters/CHARACTER.md §9): the pixel face on
// every board and in the simulator. A pack that builds on Pixel replaces
// this file with its own to choose among its faces.
#include "render/face.h"
#include "render/pixel/anim.h"
namespace render {
std::unique_ptr<Face> makeFace() { return std::make_unique<pixel::PixelFace>(); }
}  // namespace render
