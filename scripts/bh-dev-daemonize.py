#!/usr/bin/env python3
"""Double-fork exec for macOS/Linux so child survives launcher exit."""
from __future__ import annotations

import os
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 4:
        print("usage: bh-dev-daemonize.py <cwd> <logfile> <cmd> [args...]", file=sys.stderr)
        raise SystemExit(2)
    cwd = Path(sys.argv[1])
    logfile = Path(sys.argv[2])
    cmd = sys.argv[3:]
    logfile.parent.mkdir(parents=True, exist_ok=True)
    if os.fork() > 0:
        raise SystemExit(0)
    os.setsid()
    if os.fork() > 0:
        raise SystemExit(0)
    os.chdir(cwd)
    with open(logfile, "ab", buffering=0) as lf:
        os.dup2(lf.fileno(), 1)
        os.dup2(lf.fileno(), 2)
    # close stdin
    devnull = os.open(os.devnull, os.O_RDONLY)
    os.dup2(devnull, 0)
    os.close(devnull)
    os.execvp(cmd[0], cmd)


if __name__ == "__main__":
    main()
