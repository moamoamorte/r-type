#!/usr/bin/env python3
"""Static dev server for the game.

- Disables caching, so edited ES modules always reload.
- Serves /__mtime, the newest modification time across the source files, which
  the preview page polls to reload itself when code changes.

Usage: python3 serve.py [port]   (default 8765), then open http://localhost:8765
"""
import http.server
import json
import os
import sys

WATCH_SUFFIXES = (".js", ".html", ".css")
SKIP_DIRS = {".git", ".idea", "node_modules", "vendor", "__pycache__"}
ROOT = os.path.dirname(os.path.abspath(__file__))


def newest_mtime():
    latest = 0.0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            if name.endswith(WATCH_SUFFIXES):
                try:
                    latest = max(latest, os.path.getmtime(os.path.join(dirpath, name)))
                except OSError:
                    pass
    return latest


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript"}

    def do_GET(self):
        if self.path.split("?")[0] == "/__mtime":
            body = json.dumps({"mtime": newest_mtime()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "__mtime" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", port), Handler) as httpd:
        print(f"Serving on http://localhost:{port}  (live reload enabled)")
        httpd.serve_forever()
