"""A scripted board for boopctl's tests: a Link with no port behind it.
The tests put internal/tools on sys.path before importing it."""
import json
from typing import Callable

from boopctl_lib.device import Link


class FakeBoard(Link):
    """Keeps every line sent to it in `sent` and answers each with the bytes
    `answer` gives for it."""

    timeout = 0.05

    def __init__(self, answer: Callable[[dict], bytes]) -> None:
        super().__init__()
        self.answer = answer
        self.sent: list[dict] = []
        self.pending = b""

    @classmethod
    def by_type(cls, replies: dict[str, dict]) -> "FakeBoard":
        """Answers a message with the scripted reply for its type, and the
        rest with nothing."""
        def answer(msg: dict) -> bytes:
            if msg["t"] not in replies:
                return b""
            return json.dumps({"t": msg["t"], **replies[msg["t"]]}).encode() + b"\n"

        return cls(answer)

    @classmethod
    def in_turn(cls, replies: list[bytes]) -> "FakeBoard":
        """Answers each line with the next scripted bytes."""
        left = list(replies)
        return cls(lambda _: left.pop(0))

    def _write(self, data: bytes) -> None:
        msg = json.loads(data)
        self.sent.append(msg)
        self.pending += self.answer(msg)

    def _read(self) -> bytes:
        out, self.pending = self.pending, b""
        return out
