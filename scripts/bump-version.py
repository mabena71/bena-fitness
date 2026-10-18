# Neue App-Version setzen: erhöht die Nummer in js/version.js, version.json und die Cache-Version in sw.js.
# Aufruf vor jedem Push: python scripts/bump-version.py
import datetime, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
today = datetime.date.today().strftime('%Y.%m.%d')
ver_js = root / 'js' / 'version.js'
current = re.search(r"APP_VERSION = '([^']+)'", ver_js.read_text(encoding='utf-8')).group(1)
n = int(current.split('-')[1]) + 1 if current.startswith(today) and '-' in current else 1
new = f'{today}-{n}'
ver_js.write_text(re.sub(r"APP_VERSION = '[^']+'", f"APP_VERSION = '{new}'", ver_js.read_text(encoding='utf-8')), encoding='utf-8')
(root / 'version.json').write_text(json.dumps({'version': new}) + '\n', encoding='utf-8')
sw = root / 'sw.js'
s = sw.read_text(encoding='utf-8')
s = re.sub(r"const CACHE = 'fitness-v(\d+)';", lambda m: f"const CACHE = 'fitness-v{int(m.group(1)) + 1}';", s)
sw.write_text(s, encoding='utf-8')
print('Version', new)
