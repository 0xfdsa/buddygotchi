#!/bin/sh
# Runs PlatformIO with its core and packages inside this checkout, so
# worktrees don't fight over one shared cache. All paths are git-ignored.
#   firmware/tools/pio.sh run -e cyd24
# Uses the `pio` on PATH if there is one. Without one, the first run
# installs PlatformIO with pip into firmware/.platformio-core/venv, with
# the first Python 3.10 or later it finds: the ESP32 platform refuses the
# Mac's own 3.9.
set -eu
firmware_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export PLATFORMIO_CORE_DIR="${PLATFORMIO_CORE_DIR:-$firmware_dir/.platformio-core}"
cd "$firmware_dir"
# The chosen character pack's firmware, staged into ../.character-build/
# (characters/CHARACTER.md §2), which platformio.ini builds from.
python3 "$firmware_dir/../characters/charactergen.py" --stage

pio=$(command -v pio || true)
if [ -z "$pio" ]; then
  venv="$PLATFORMIO_CORE_DIR/venv"
  pio="$venv/bin/pio"
  if [ ! -x "$pio" ]; then
    python=
    for candidate in python3 python3.14 python3.13 python3.12 python3.11 python3.10; do
      if "$candidate" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then
        python=$candidate
        break
      fi
    done
    if [ -z "$python" ]; then
      echo "pio.sh: no pio on PATH, and installing PlatformIO needs Python 3.10 or later (brew install python)" >&2
      exit 1
    fi
    echo "pio.sh: no pio on PATH; installing PlatformIO into $venv with $python (once, about a minute)" >&2
    rm -rf "$venv"
    "$python" -m venv "$venv"
    "$venv/bin/python" -m pip install --quiet --disable-pip-version-check platformio
  fi
fi
exec "$pio" "$@"
