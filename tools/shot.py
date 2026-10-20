# Scharfe Screenshots einer Seite mit Edge (headless) über das DevTools-Protokoll, nur Python-Standardbibliothek.
# Aufruf: python .claude/shot.py URL ausgabe.png [breite höhe wartezeit_s skalierung]
import base64, json, os, shutil, socket, struct, subprocess, sys, tempfile, time, urllib.request

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
url, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1263
h = int(sys.argv[4]) if len(sys.argv) > 4 else 860
wait = float(sys.argv[5]) if len(sys.argv) > 5 else 8
scale = float(sys.argv[6]) if len(sys.argv) > 6 else 2
port = 9333
prof = tempfile.mkdtemp(prefix="edge-cdp-")
proc = subprocess.Popen([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                         f"--user-data-dir={prof}", f"--remote-debugging-port={port}", f"--window-size={w},{h}", "about:blank"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
            page = next(t for t in targets if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws_url = page["webSocketDebuggerUrl"]
    host_port, path = ws_url[len("ws://"):].split("/", 1)
    host, p = host_port.split(":")
    s = socket.create_connection((host, int(p)))
    key = base64.b64encode(os.urandom(16)).decode()
    s.send(f"GET /{path} HTTP/1.1\r\nHost: {host_port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n".encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += s.recv(1)

    def send(obj):
        data = json.dumps(obj).encode()
        mask = os.urandom(4)
        hdr = bytes([0x81])
        n = len(data)
        hdr += bytes([0x80 | n]) if n < 126 else (bytes([0x80 | 126]) + struct.pack(">H", n) if n < 65536 else bytes([0x80 | 127]) + struct.pack(">Q", n))
        s.send(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv_exact(n):
        buf = b""
        while len(buf) < n:
            chunk = s.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("closed")
            buf += chunk
        return buf

    def recv():
        msg = b""
        while True:
            b1, b2 = recv_exact(2)
            n = b2 & 0x7F
            if n == 126: n = struct.unpack(">H", recv_exact(2))[0]
            elif n == 127: n = struct.unpack(">Q", recv_exact(8))[0]
            msg += recv_exact(n)
            if b1 & 0x80: return json.loads(msg)

    mid = 0
    def call(method, params=None):
        global mid
        mid += 1
        send({"id": mid, "method": method, "params": params or {}})
        while True:
            m = recv()
            if m.get("id") == mid:
                return m.get("result", {})

    call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": scale, "mobile": False})
    call("Page.enable")
    call("Page.navigate", {"url": url})
    time.sleep(wait)
    shot = call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    with open(out, "wb") as f:
        f.write(base64.b64decode(shot["data"]))
    print("ok", out)
finally:
    proc.kill()
    time.sleep(0.5)
    shutil.rmtree(prof, ignore_errors=True)
