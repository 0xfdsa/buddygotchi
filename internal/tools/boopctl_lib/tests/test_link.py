"""boopctl's Link on a scripted fake board: a debug request whose reply is
lost is asked for again when `retries` allows. Needs no board."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from boopctl_lib.device import DeviceError  # noqa: E402
from fake_board import FakeBoard  # noqa: E402


PING = b'{"t":"dbg.ping","fw":"t","up":5,"heap":90000,"heap_min":80000,"fps":21,"draw_us":812,"push_us":2690}\n'


class LinkTests(unittest.TestCase):
    def test_a_lost_reply_fails_without_retries(self):
        with self.assertRaises(DeviceError):
            FakeBoard.in_turn([b'{"t":"dbg.pi']).request({"t": "dbg.ping"})

    def test_a_lost_reply_is_asked_for_again(self):
        board = FakeBoard.in_turn([b'{"t":"dbg.pi', PING])  # the first reply loses its end
        seen: list[Exception] = []
        board.retries, board.on_retry = 1, seen.append
        self.assertEqual(board.vitals(), {"up": 5, "heap": 90000, "heap_min": 80000, "fps": 21, "draw_us": 812, "push_us": 2690})
        self.assertEqual(len(board.sent), 2)
        self.assertEqual(len(seen), 1)

    def test_retries_run_out(self):
        board = FakeBoard.in_turn([b"", b""])
        board.retries = 1
        with self.assertRaises(DeviceError):
            board.request({"t": "dbg.state"})
        self.assertEqual(len(board.sent), 2)


if __name__ == "__main__":
    unittest.main()
