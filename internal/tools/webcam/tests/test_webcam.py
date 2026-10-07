"""End-to-end native video tests, no camera or third-party Python dependencies."""
import csv
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[4]
CLI = ROOT / 'internal/tools/webcam/webcam.sh'


class WebcamTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='boop-webcam-test-')
        cls.folder = Path(cls.temp.name)
        fixture = cls.folder / 'fixture'
        subprocess.run(['xcrun', 'swiftc', str(Path(__file__).with_name('Fixture.swift')), '-o', str(fixture)], check=True)
        cls.movie = cls.folder / 'fixture.mov'
        subprocess.run([str(fixture), str(cls.movie)], check=True)
        subprocess.run([str(CLI), 'help'], check=True, capture_output=True)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def run_cli(self, *args):
        return subprocess.run([str(CLI), *map(str, args)], text=True, capture_output=True)

    def test_consecutive_frames_and_capture_gap(self):
        out = self.folder / 'analysis'
        result = self.run_cli('analyze', '--input', self.movie, '--out', out, '--seconds', 2,
                              '--roi', '0.05,0.2,0.9,0.4')
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((out / 'report.json').read_text())
        self.assertTrue((out / 'preview.png').exists())
        self.assertEqual(report['frameCount'], 59)
        self.assertEqual(report['reviewFrames'], 59)
        self.assertEqual(report['sheets'], 2)
        self.assertEqual(report['verdict'], 'unreviewed')
        gaps = report['captureGapsOver1_5xMedian']
        self.assertEqual(len(gaps), 1)
        self.assertAlmostEqual(gaps[0]['gapSeconds'], 2 / 30, places=5)
        with (out / 'frames.csv').open() as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual(len(rows), 59)
        self.assertEqual(len(list(out.glob('sequence-*.png'))), 2)
        for path in out.glob('sequence-*.png'):
            self.assertEqual(path.read_bytes()[:8], b'\x89PNG\r\n\x1a\n')
        repeat = self.run_cli('analyze', '--input', self.movie, '--out', out)
        self.assertNotEqual(repeat.returncode, 0)
        self.assertEqual(json.loads((out / 'report.json').read_text()), report)

    def test_interval_selects_frames_without_resampling(self):
        out = self.folder / 'interval'
        result = self.run_cli('analyze', '--input', self.movie, '--out', out, '--start', 1, '--seconds', 0.5)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((out / 'report.json').read_text())
        self.assertEqual(report['reviewFrames'], 14)  # frame at 1.0 deliberately absent
        self.assertEqual(report['frameCount'], 59)

    def test_invalid_arguments_fail_before_capture(self):
        cases = [
            ['record', '--camera', 'missing', '--seconds', 'nan', '--out', self.folder / 'bad'],
            ['record', '--camera', 'missing', '--seconds', '61', '--out', self.folder / 'bad'],
            ['analyze', '--input', self.movie, '--out', self.folder / 'bad', '--roi', '0,0,2,1'],
            ['analyze', '--input', self.movie, '--out', self.folder / 'bad', '--roi', 'nan,0,1,1'],
            ['analyze', '--input', self.movie, '--out', self.folder / 'bad', '--unknown', 'yes'],
        ]
        for args in cases:
            with self.subTest(args=args):
                self.assertNotEqual(self.run_cli(*args).returncode, 0)
                self.assertFalse((self.folder / 'bad').exists())


if __name__ == '__main__':
    unittest.main()
