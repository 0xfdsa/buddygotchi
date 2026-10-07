# The kit stands alone: its sources include only its own headers, the C++
# standard library, ArduinoJson and, in the board-only Bluetooth part,
# Arduino, NimBLE and ESP-IDF. Anything else (an app's header, reachable
# through the app's -I flags) fails the build of every env that uses the
# kit: the board, the unit tests and the simulator. PlatformIO runs this
# as the library's extraScript; `python3 check_includes.py` runs it alone.
import os
import re
import sys

ALLOWED_ANGLE = re.compile(r"^(ArduinoJson\.h|Arduino\.h|NimBLEDevice\.h|esp_[a-z0-9_]+\.h|[a-z_]+)$")
INCLUDE = re.compile(r'^\s*#\s*include\s*([<"])([^>"]+)[>"]')
# Only C and C++ sources are read, and never strictly: an editor's swap
# file or Finder's .DS_Store in src/ mustn't fail the build.
SOURCES = (".h", ".hpp", ".c", ".cc", ".cpp")


def problems(src_dir):
    found = []
    for base, _, files in os.walk(src_dir):
        for name in sorted(files):
            if not name.endswith(SOURCES):
                continue
            path = os.path.join(base, name)
            with open(path, encoding="utf-8", errors="replace") as f:
                for n, line in enumerate(f, 1):
                    m = INCLUDE.match(line)
                    if not m:
                        continue
                    kind, header = m.groups()
                    ok = header.startswith("linkkit/") if kind == '"' else bool(ALLOWED_ANGLE.match(header))
                    if not ok:
                        found.append(f"{os.path.relpath(path, src_dir)}:{n}: #include {kind}{header}{'>' if kind == '<' else kind}")
    return found


def check(src_dir):
    bad = problems(src_dir)
    for b in bad:
        print(f"linkkit: not the kit's to include: {b}", file=sys.stderr)
    return not bad


try:
    Import("env", "pio_lib_builder")  # noqa: F821 (PlatformIO's SCons)
except NameError:
    if __name__ == "__main__":
        sys.exit(0 if check(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src")) else 1)
else:
    if not check(os.path.join(pio_lib_builder.path, "src")):  # noqa: F821
        env.Exit(1)  # noqa: F821
