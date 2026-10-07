"""The studio's data rules in characters/charactergen.py (characters/CHARACTER.md §12)."""
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("charactergen", ROOT / "characters" / "charactergen.py")
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)


def write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value if isinstance(value, str) else json.dumps(value))


class RepoTests(unittest.TestCase):
    def test_states_are_the_boards(self):
        """The studio lists the board's states, each once (the firmware's kStateNames)."""
        ids = gen.state_ids(gen.states())
        self.assertEqual(sorted(ids), sorted(gen.firmware_states()))
        self.assertEqual(len(ids), len(set(ids)))

    def test_every_pack_here_is_clean(self):
        self.assertEqual(gen.studio_problems(gen.local_packs()), [])


class StudioRuleTests(unittest.TestCase):
    """Small packs in a temporary characters/ folder, against two states."""

    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dir)
        self.studio = self.dir / "studio"
        write(self.studio / "states.json", {"groups": [{"label": "All", "states": [{"id": "idle", "about": ""}, {"id": "working", "about": ""}]}], "facts": {}})
        self.firmware = self.dir / "types.cpp"
        write(self.firmware, 'constexpr const char* kStateNames[2] = {"idle", "working"};')

    def pack(self, name, moods, studio=None, base=None, files=()):
        character = {"id": name, "name": name.title(), "default_mood": moods[0]["id"], "moods": moods}
        if studio is not None:
            character["studio"] = studio
        if base:
            character["base"] = base
        write(self.dir / name / "character.json", character)
        for path, value in files:
            write(self.dir / name / path, value)
        return self.dir / name

    def problems(self, *packs):
        return gen.studio_problems(list(packs), self.studio, self.firmware)

    def test_a_pack_without_a_studio_entry_is_fine(self):
        self.assertEqual(self.problems(self.pack("plain", [{"id": "calm"}])), [])

    def test_states_must_match_the_board(self):
        """A state the board has and the studio doesn't fails the check."""
        write(self.firmware, 'constexpr const char* kStateNames[3] = {"idle", "working", "asleep"};')
        [problem] = self.problems()
        self.assertIn("missing ['asleep']", problem)

    def test_declared_files_must_exist(self):
        pack = self.pack("art", [{"id": "calm"}], {"scripts": ["studio/adapter.js"]})
        self.assertEqual(self.problems(pack), ["art: studio file studio/adapter.js doesn't exist"])

    def test_every_mood_and_state_needs_a_preview(self):
        """Every pair a pack's coverage leaves out fails, unless the mood's fallback covers it."""
        coverage = {"perPair": {"calm": {"idle": 2, "working": 1}, "sad": {"idle": 1, "working": 0}}}
        pack = self.pack("art", [{"id": "calm"}, {"id": "sad"}], {"coverage": "cover.json"}, files=[("cover.json", coverage)])
        self.assertEqual(self.problems(pack), ["art: art's preview can't play sad in working"])
        pack = self.pack("art", [{"id": "calm"}, {"id": "sad", "fallback": "calm"}], {"coverage": "cover.json"}, files=[("cover.json", coverage)])
        self.assertEqual(self.problems(pack), [])

    def test_a_base_preview_plays_the_packs_moods_through_fallbacks(self):
        """A base's preview must play each of the pack's moods, itself or through its fallback."""
        base = self.pack("base", [{"id": "calm"}], {})
        top = self.pack("top", [{"id": "calm"}, {"id": "giddy"}], {}, base="base")
        self.assertEqual(self.problems(base, top), ["top: base's preview can't play giddy in idle, working"])
        top = self.pack("top", [{"id": "calm"}, {"id": "giddy", "fallback": "calm"}], {}, base="base")
        self.assertEqual(self.problems(base, top), [])

    def test_data_has_paths_from_the_page(self):
        coverage = {"perPair": {"calm": {"idle": 1, "working": 1}}}
        base = self.pack("base", [{"id": "calm", "meaning": "Settled."}], {"scripts": ["studio/a.js"], "coverage": "c.json"},
                         files=[("studio/a.js", ""), ("c.json", coverage)])
        top = self.pack("top", [{"id": "calm", "family": "settled"}], None, base="base")
        data = gen.studio_data([base, top], top, self.studio)
        self.assertEqual(data["chosen"], "top")
        self.assertEqual(data["packs"]["base"]["studio"], {"scripts": ["../base/studio/a.js"], "styles": [], "covers": {"calm": ["idle", "working"]}})
        self.assertEqual(data["packs"]["top"], {"name": "Top", "default_mood": "calm", "base": "base", "moods": [{"id": "calm", "family": "settled"}], "studio": None})


if __name__ == "__main__":
    unittest.main()
