#!/usr/bin/env python3
"""Tiny static dev server with caching disabled, so edited ES modules always reload.

Usage: python3 serve.py [port]   (default 8765), then open http://localhost:8765
"""
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), NoCacheHandler) as httpd:
        print(f"Serving on http://localhost:{port}")
        httpd.serve_forever()
