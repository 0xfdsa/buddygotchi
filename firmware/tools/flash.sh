#!/bin/sh
# Builds and uploads the firmware for whichever board is plugged in.
# The port says which board it is:
#   /dev/cu.usbserial-*, /dev/cu.wchusbserial*  the CYD's CH340  → env cyd24
#   /dev/cu.usbmodem*                           the S3's own USB → env amoled206
# BOARD (cyd24 or amoled206) and BOOP_PORT override what it finds. With
# more than one board plugged in it stops and asks for one of them.
#   firmware/tools/flash.sh            (or `make flash` from the repo root)
set -eu
tools_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

board_of() {
  case "$1" in
    /dev/cu.usbserial-* | /dev/cu.wchusbserial*) echo cyd24 ;;
    /dev/cu.usbmodem*) echo amoled206 ;;
    *) echo "" ;;
  esac
}

ports_for() {
  case "$1" in
    cyd24) ls /dev/cu.usbserial-* /dev/cu.wchusbserial* 2>/dev/null || true ;;
    amoled206) ls /dev/cu.usbmodem* 2>/dev/null || true ;;
    *) echo "flash: unknown BOARD '$1' (cyd24 or amoled206)" >&2; exit 2 ;;
  esac
}

board=${BOARD:-}
port=${BOOP_PORT:-}

if [ -n "$port" ]; then
  [ -n "$board" ] || board=$(board_of "$port")
  if [ -z "$board" ]; then
    echo "flash: can't tell which board is on $port; set BOARD=cyd24 or BOARD=amoled206" >&2
    exit 2
  fi
else
  if [ -n "$board" ]; then
    found=$(ports_for "$board")
  else
    found=$(ports_for cyd24; ports_for amoled206)
  fi
  count=$(printf '%s' "$found" | grep -c . || true)
  if [ "$count" -eq 0 ]; then
    case "$board" in
      cyd24) looked="/dev/cu.usbserial-* and /dev/cu.wchusbserial*" ;;
      amoled206) looked="/dev/cu.usbmodem*" ;;
      *) looked="/dev/cu.usbserial-*, /dev/cu.wchusbserial* and /dev/cu.usbmodem*" ;;
    esac
    echo "flash: no ${board:-Boop} board on USB (looked for $looked)" >&2
    exit 2
  fi
  if [ "$count" -gt 1 ]; then
    echo "flash: more than one board on USB; pick one with BOOP_PORT=… (or BOARD=cyd24 / BOARD=amoled206):" >&2
    printf '%s\n' "$found" | sed 's/^/  /' >&2
    exit 2
  fi
  port=$found
  [ -n "$board" ] || board=$(board_of "$port")
fi

echo "flash: $board on $port"
exec "$tools_dir/pio.sh" run -e "$board" -t upload --upload-port "$port"
