#!/usr/bin/env python3
"""Installs character packs that live in git repositories of their own
(characters/CHARACTER.md §2).

    python3 characters/packs.py add NAME URL
    python3 characters/packs.py sync
    python3 characters/packs.py list
    python3 characters/packs.py remove NAME   (from this worktree only)

An installed pack is a checkout of its repository at characters/NAME/,
which this repository never tracks. You work in it, commit and push as in
any repository. What's installed, and from where, is kept in this clone's
own .git folder, never in a commit: one shared copy of each pack's
repository, the list of packs, and the rule that ignores their folders.
Every worktree of this clone sees the same list, so `sync` in a new
worktree gives it its own checkout of each pack, on a branch named after
the worktree's: the main checkout's packs are on main.

Runs on the Mac's own python3, standard library only.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / "characters"
USAGE = __doc__.split("\n\n")[1]


class Stop(Exception):
    """Something to sort out; the message says what."""


def git(*args: str, cwd: Path = ROOT, check: bool = True) -> str:
    run = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
    if check and run.returncode != 0:
        raise Stop(f"git {' '.join(args)}: {run.stderr.strip()}")
    return run.stdout.strip()


def common() -> Path:
    """This clone's .git folder, which all its worktrees share."""
    return Path(git("rev-parse", "--path-format=absolute", "--git-common-dir"))


def recorded() -> dict:
    path = common() / "character-packs.json"
    return json.loads(path.read_text()) if path.exists() else {}


def record(packs: dict) -> None:
    (common() / "character-packs.json").write_text(json.dumps(packs, indent=2, sort_keys=True) + "\n")


def installed() -> list:
    """The names of the packs installed in this worktree, in order."""
    return sorted(n for n in recorded() if (CHARACTERS / n / "character.json").exists())


def store(name: str) -> Path:
    return common() / "character-packs" / f"{name}.git"


def ignore(name: str) -> None:
    exclude = common() / "info" / "exclude"
    exclude.parent.mkdir(parents=True, exist_ok=True)
    line = f"/characters/{name}/"
    lines = exclude.read_text().splitlines() if exclude.exists() else []
    if line not in lines:
        exclude.write_text("\n".join(lines + [line]) + "\n")


def branch() -> str:
    """The branch this worktree's packs check out: its own branch's name."""
    name = git("rev-parse", "--abbrev-ref", "HEAD")
    if name != "HEAD":
        return name
    return "worktree/" + ROOT.name  # a detached worktree


def check_name(name: str) -> None:
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", name):
        raise Stop(f"{name}: a pack's name is lowercase letters, digits, - and _")
    if name in ("pixel", "studio"):
        raise Stop(f"{name} is this repository's own")


def fetch(name: str, url: str) -> Path:
    """The shared copy of the pack's repository, fetched now."""
    repo = store(name)
    if not repo.exists():
        repo.parent.mkdir(parents=True, exist_ok=True)
        git("clone", "-q", "--bare", url, str(repo))
        git("config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*", cwd=repo)
    git("fetch", "-q", "origin", cwd=repo)
    return repo


def check_out(name: str, url: str) -> str:
    """This worktree's checkout of the pack, at characters/NAME/."""
    folder = CHARACTERS / name
    if (folder / ".git").exists():
        return f"{name}: already at characters/{name}/"
    if folder.exists() and any(folder.iterdir()):
        raise Stop(f"characters/{name}/ is there but isn't the pack's checkout: move it away first")
    repo = fetch(name, url)
    ignore(name)
    want = branch()
    if git("rev-parse", "-q", "--verify", f"refs/heads/{want}", cwd=repo, check=False):
        git("worktree", "add", "-q", str(folder), want, cwd=repo)
        if git("rev-parse", "-q", "--verify", f"refs/remotes/origin/{want}", cwd=repo, check=False):
            git("branch", "-q", "--set-upstream-to", f"origin/{want}", want, cwd=repo)
    elif git("rev-parse", "-q", "--verify", f"refs/remotes/origin/{want}", cwd=repo, check=False):
        git("worktree", "add", "-q", "--track", "-b", want, str(folder), f"origin/{want}", cwd=repo)
    else:
        # A new branch, from the pack's default one; `git push -u origin` publishes it.
        git("remote", "set-head", "origin", "--auto", cwd=repo)
        git("worktree", "add", "-q", "--no-track", "-b", want, str(folder), "origin/HEAD", cwd=repo)
    return f"{name}: checked out at characters/{name}/ on {want}"


def add(name: str, url: str) -> None:
    check_name(name)
    packs = recorded()
    if name in packs and packs[name] != url:
        raise Stop(f"{name} is already installed from {packs[name]}: remove it first")
    packs[name] = url
    record(packs)
    print(check_out(name, url))


def sync() -> None:
    packs = recorded()
    if not packs:
        print("no character packs installed (add one with: python3 characters/packs.py add NAME URL)")
    for name, url in sorted(packs.items()):
        print(check_out(name, url))


def show() -> None:
    for name, url in sorted(recorded().items()):
        folder = CHARACTERS / name
        if (folder / ".git").exists():
            where = f"characters/{name}/ on {git('rev-parse', '--abbrev-ref', 'HEAD', cwd=folder)}"
            if git("status", "--porcelain", cwd=folder):
                where += ", with changes"
        else:
            where = "not in this worktree (sync)"
        print(f"{name}  {url}  {where}")


def remove(name: str) -> None:
    packs = recorded()
    if name not in packs:
        raise Stop(f"{name} isn't installed")
    folder = CHARACTERS / name
    if (folder / ".git").exists():
        if git("status", "--porcelain", cwd=folder):
            raise Stop(f"characters/{name}/ has changes: commit or discard them first")
        git("worktree", "remove", str(folder), cwd=store(name))
    print(f"{name}: removed from this worktree; other worktrees keep theirs")


def main(argv: list) -> int:
    commands = {"add": (add, 2), "sync": (sync, 0), "list": (show, 0), "remove": (remove, 1)}
    if not argv or argv[0] not in commands or len(argv) - 1 != commands[argv[0]][1]:
        print(USAGE, file=sys.stderr)
        return 2
    try:
        commands[argv[0]][0](*argv[1:])
    except Stop as stop:
        print(f"packs: {stop}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
