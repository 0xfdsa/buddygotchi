#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
# Its own build directory: the repo root's .build is SwiftPM's.
build="$root/internal/tools/webcam/.build"
mkdir -p "$build"
if [ ! -x "$build/webcam" ] || [ "$root/internal/tools/webcam/Webcam.swift" -nt "$build/webcam" ] || [ "$root/internal/tools/webcam/Info.plist" -nt "$build/webcam" ]; then
    xcrun swiftc -swift-version 5 "$root/internal/tools/webcam/Webcam.swift" -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker "$root/internal/tools/webcam/Info.plist" -o "$build/webcam"
fi
exec "$build/webcam" "$@"
