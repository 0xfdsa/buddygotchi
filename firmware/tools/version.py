# PlatformIO pre-script: bakes the firmware version and git SHA into the
# build, so `boopctl ping` can confirm what's flashed. They go in a
# generated header that only board/board_hal.cpp includes, rewritten only
# when they change. As global defines they changed every compile line, so
# each commit, and the first edit after one, rebuilt the framework and
# every library.
import os
import subprocess

Import("env")  # noqa: F821

def git(*args):
    try:
        return subprocess.check_output(["git", *args], cwd=env["PROJECT_DIR"], text=True).strip()  # noqa: F821
    except Exception:
        return "unknown"

sha = git("rev-parse", "--short=10", "HEAD")
if git("status", "--porcelain", "--", "."):
    sha += "-dirty"
version = open(env["PROJECT_DIR"] + "/../VERSION").read().strip()  # noqa: F821
text = f'#pragma once\n#define BOOP_FW_VERSION "{version}"\n#define BOOP_GIT_SHA "{sha}"\n'
out = os.path.join(env.subst("$BUILD_DIR"), "generated")  # noqa: F821
header = os.path.join(out, "boop_version.h")
os.makedirs(out, exist_ok=True)
if not os.path.exists(header) or open(header).read() != text:
    with open(header, "w") as f:
        f.write(text)
env.Append(CPPPATH=[out])  # noqa: F821
