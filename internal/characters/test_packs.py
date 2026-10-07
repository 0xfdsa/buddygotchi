"""characters/packs.py: packs from repositories of their own, in throwaway repositories
(characters/CHARACTER.md §2)."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def run(*args, cwd, check=True):
    done = subprocess.run(list(args), cwd=cwd, capture_output=True, text=True)
    if check and done.returncode != 0:
        raise AssertionError(f"{' '.join(args)} failed:\n{done.stdout}{done.stderr}")
    return done


def git(*args, cwd, check=True):
    return run("git", "-c", "user.name=t", "-c", "user.email=t@t", *args, cwd=cwd, check=check).stdout.strip()


class PacksTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="packs-test-"))
        # The pack's own repository, with a commit on main.
        self.remote = self.tmp / "demo-pack.git"
        git("init", "-q", "--bare", "-b", "main", str(self.remote), cwd=self.tmp)
        seed = self.tmp / "seed"
        git("clone", "-q", str(self.remote), str(seed), cwd=self.tmp)
        (seed / "character.json").write_text('{"id": "demo"}\n')
        git("add", "-A", cwd=seed)
        git("commit", "-qm", "demo", cwd=seed)
        git("push", "-q", "origin", "HEAD:main", cwd=seed)
        # A repository like this one, with the tool tracked in it.
        self.repo = self.tmp / "engine"
        (self.repo / "characters").mkdir(parents=True)
        git("init", "-q", "-b", "main", cwd=self.repo)
        shutil.copy(ROOT / "characters" / "packs.py", self.repo / "characters" / "packs.py")
        git("add", "-A", cwd=self.repo)
        git("commit", "-qm", "engine", cwd=self.repo)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def packs(self, *args, cwd=None, check=True):
        return run("python3", "characters/packs.py", *args, cwd=cwd or self.repo, check=check)

    def test_an_added_pack_is_checked_out_and_never_tracked(self):
        self.packs("add", "demo", str(self.remote))
        pack = self.repo / "characters" / "demo"
        self.assertTrue((pack / "character.json").exists())
        self.assertEqual(git("rev-parse", "--abbrev-ref", "HEAD", cwd=pack), "main")
        # This repository sees nothing to commit, and names the pack nowhere it tracks.
        self.assertEqual(git("status", "--porcelain", cwd=self.repo), "")
        tracked = git("grep", "-l", str(self.remote), cwd=self.repo, check=False)
        self.assertEqual(tracked, "")

    def test_a_commit_in_the_pack_goes_to_its_own_repository(self):
        self.packs("add", "demo", str(self.remote))
        pack = self.repo / "characters" / "demo"
        (pack / "new.md").write_text("hi\n")
        git("add", "-A", cwd=pack)
        git("commit", "-qm", "more", cwd=pack)
        git("push", "-q", cwd=pack)
        self.assertEqual(git("log", "-1", "--format=%s", "main", cwd=self.remote), "more")
        self.assertEqual(git("status", "--porcelain", cwd=self.repo), "")

    def test_a_new_worktree_syncs_its_own_checkout_on_its_branch(self):
        self.packs("add", "demo", str(self.remote))
        wt = self.tmp / "wt"
        git("worktree", "add", "-q", "-b", "feature", str(wt), cwd=self.repo)
        self.assertFalse((wt / "characters" / "demo").exists())
        self.packs("sync", cwd=wt)
        pack = wt / "characters" / "demo"
        self.assertTrue((pack / "character.json").exists())
        self.assertEqual(git("rev-parse", "--abbrev-ref", "HEAD", cwd=pack), "feature")
        self.assertEqual(git("status", "--porcelain", cwd=wt), "")
        # The main checkout's stays on main.
        self.assertEqual(git("rev-parse", "--abbrev-ref", "HEAD", cwd=self.repo / "characters" / "demo"), "main")
        # Syncing again changes nothing.
        self.assertIn("already", self.packs("sync", cwd=wt).stdout)

    def test_remove_keeps_changes_safe(self):
        self.packs("add", "demo", str(self.remote))
        pack = self.repo / "characters" / "demo"
        (pack / "draft.md").write_text("wip\n")
        self.assertEqual(self.packs("remove", "demo", check=False).returncode, 1)
        (pack / "draft.md").unlink()
        self.packs("remove", "demo")
        self.assertFalse(pack.exists())

    def test_names_that_would_clash_are_refused(self):
        for name in ("pixel", "studio", "Bad Name"):
            self.assertEqual(self.packs("add", name, str(self.remote), check=False).returncode, 1, name)


if __name__ == "__main__":
    unittest.main()
