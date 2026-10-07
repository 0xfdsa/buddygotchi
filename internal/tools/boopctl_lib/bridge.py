"""`boopctl bridge`: owns the board's serial port and shares it through a
Unix socket (internal/VERIFICATION.md §2, L4).

Every complete line from the board goes to every client; every complete line
from a client goes to the board whole, so lines from different clients never
interleave. The Mac app's USB transport and other boopctl commands can use
the board at the same time.

The bridge never waits on a client: each has its own outgoing buffer, sent
as the client reads, and one that falls MAX_BEHIND bytes behind (it stopped
reading) is dropped. Otherwise a paused `boopctl` would stall the board's
lines to everyone and, once the app's socket filled, the app itself.
"""
from __future__ import annotations

import os
import select
import signal
import socket
import stat
import sys

from boopctl_lib.device import Device

DEFAULT_SOCKET = "/tmp/boop-bridge.sock"
MAX_BEHIND = 4 * 1024 * 1024  # about 40 screenshots


def bridge_path() -> str:
    return os.environ.get("BOOP_BRIDGE") or DEFAULT_SOCKET


def bridge_running(path: str | None = None) -> bool:
    path = path or bridge_path()
    try:
        if not stat.S_ISSOCK(os.stat(path).st_mode):
            return False
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            s.connect(path)
        return True
    except OSError:
        return False


def serve(port: str | None, path: str, quiet: bool = False) -> int:
    if bridge_running(path):
        print(f"boopctl: a bridge is already running on {path}", file=sys.stderr)
        return 2
    with Device(port, direct=True) as dev:
        ser = dev._ser
        assert ser is not None
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        if os.path.exists(path):
            os.unlink(path)
        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(path)
        os.chmod(path, 0o600)
        server.listen(8)
        clients: dict[socket.socket, bytearray] = {}  # what each client has sent, up to its newline
        outgoing: dict[socket.socket, bytearray] = {}  # what each client hasn't read yet
        board = bytearray()
        stopping = False

        def stop(*_: object) -> None:
            nonlocal stopping
            stopping = True

        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        if not quiet:
            print(f"bridge: {dev.port} ⇄ {path}", flush=True)
        try:
            def drop(conn: socket.socket, why: str) -> None:
                clients.pop(conn, None)
                outgoing.pop(conn, None)
                conn.close()
                if not quiet:
                    print(f"bridge: client {why} ({len(clients)})", flush=True)

            while not stopping:
                waiting = [c for c, out in outgoing.items() if out]
                try:
                    readable, writable, _ = select.select([ser.fileno(), server, *clients], waiting, [], 0.2)
                except InterruptedError:
                    continue
                for w in writable:
                    out = outgoing.get(w)
                    if not out:
                        continue
                    try:
                        del out[: w.send(out)]
                    except BlockingIOError:
                        pass
                    except OSError:
                        drop(w, "left")
                for r in readable:
                    if r is server:
                        conn, _ = server.accept()
                        conn.setblocking(False)
                        clients[conn] = bytearray()
                        outgoing[conn] = bytearray()
                        if not quiet:
                            print(f"bridge: client joined ({len(clients)})", flush=True)
                    elif r == ser.fileno():
                        board.extend(ser.read(65536))
                        while (nl := board.find(b"\n")) >= 0:
                            line = bytes(board[: nl + 1])
                            del board[: nl + 1]
                            for c in list(clients):
                                outgoing[c].extend(line)
                                if len(outgoing[c]) > MAX_BEHIND:
                                    drop(c, "stopped reading, dropped")
                    elif r in clients:
                        conn = r
                        try:
                            data = conn.recv(65536)
                        except BlockingIOError:
                            continue
                        except OSError:
                            data = b""
                        if not data:
                            drop(conn, "left")
                            continue
                        buf = clients[conn]
                        buf.extend(data)
                        while (nl := buf.find(b"\n")) >= 0:
                            ser.write(bytes(buf[: nl + 1]))
                            del buf[: nl + 1]
                        ser.flush()
        finally:
            for c in clients:
                c.close()
            server.close()
            if os.path.exists(path):
                os.unlink(path)
            if not quiet:
                print("bridge: stopped", flush=True)
    return 0
