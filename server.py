"""Sobe o site da BRASA e guarda visitas e cliques no WhatsApp.

Uso: python server.py
Abre http://127.0.0.1:8090/admin.html
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import secrets
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "analytics.json"
PORT = 8090
USER = "FOGO"
PASSWORD = "Brasa@1000"
KEEP_MS = 370 * 24 * 60 * 60 * 1000
MAX_EVENTS = 8000

lock = threading.Lock()
tokens = set()


def load_events():
    if not DATA.exists():
        return []
    try:
        payload = json.loads(DATA.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    events = payload.get("events", [])
    return events if isinstance(events, list) else []


def save_events(events):
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps({"events": events}, ensure_ascii=False), encoding="utf-8")


def prune(events):
    cutoff = int(time.time() * 1000) - KEEP_MS
    fresh = [event for event in events if isinstance(event, dict) and event.get("ts", 0) >= cutoff]
    return fresh[-MAX_EVENTS:]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/events":
            self.handle_events()
            return
        if path.startswith("/data") or path.startswith("/.git") or path == "/server.py":
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/login":
            self.handle_login()
            return
        if path == "/api/hit":
            self.handle_hit()
            return
        self.send_error(404)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0 or length > 8192:
            return None
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        header = self.headers.get("Authorization", "")
        token = header[7:] if header.startswith("Bearer ") else ""
        return token in tokens

    def handle_login(self):
        data = self.read_json() or {}
        name = str(data.get("name", "")).strip()
        password = str(data.get("password", ""))
        if name != USER or password != PASSWORD:
            self.send_json(401, {"ok": False})
            return
        token = secrets.token_urlsafe(24)
        tokens.add(token)
        self.send_json(200, {"ok": True, "token": token})

    def handle_hit(self):
        data = self.read_json() or {}
        kind = data.get("t")
        if kind not in ("view", "wa"):
            self.send_json(400, {"ok": False})
            return
        via = str(data.get("via", ""))[:20]
        if via not in ("", "botao", "contato", "pedro"):
            via = ""
        visitor = str(data.get("id", ""))[:80] or "anon"
        try:
            ts = int(data.get("ts") or time.time() * 1000)
        except (TypeError, ValueError):
            ts = int(time.time() * 1000)
        event = {"t": kind, "ts": ts, "id": visitor, "via": via}
        with lock:
            events = prune(load_events())
            events.append(event)
            save_events(events)
        self.send_json(200, {"ok": True})

    def handle_events(self):
        if not self.authorized():
            self.send_json(401, {"ok": False})
            return
        with lock:
            events = prune(load_events())
        self.send_json(200, {"events": events})

    def log_message(self, fmt, *args):
        if str(args[0]).startswith("GET /api") or str(args[0]).startswith("POST /api"):
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"BRASA em http://127.0.0.1:{PORT}")
    print(f"Admin em http://127.0.0.1:{PORT}/admin.html")
    server.serve_forever()
