import json, os, glob, collections, sys
basis = os.path.join(os.environ["USERPROFILE"], ".claude", "projects")
summe = collections.defaultdict(lambda: collections.Counter())
gesehen = set()
erste, letzte = None, None
for d in glob.glob(os.path.join(basis, "*Fitness-App*")):
    for f in glob.glob(os.path.join(d, "**", "*.jsonl"), recursive=True):
        for z in open(f, encoding="utf-8", errors="ignore"):
            try:
                e = json.loads(z)
            except Exception:
                continue
            m = e.get("message") if isinstance(e, dict) else None
            if not isinstance(m, dict) or "usage" not in m:
                continue
            k = (m.get("id"), e.get("requestId"))
            if k in gesehen:
                continue
            gesehen.add(k)
            u = m["usage"]; mod = m.get("model", "?")
            for feld in ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"):
                summe[mod][feld] += u.get(feld) or 0
            ts = e.get("timestamp")
            if ts:
                erste = min(erste, ts) if erste else ts
                letzte = max(letzte, ts) if letzte else ts
tot = collections.Counter()
for mod, c in summe.items():
    print(mod, dict(c), "total", sum(c.values()))
    tot.update(c)
print("ALLE", dict(tot), "total", sum(tot.values()))
print("Zeitraum", erste, letzte)
