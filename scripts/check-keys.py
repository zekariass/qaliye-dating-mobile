import json, re, io, glob

d = json.load(io.open('src/i18n/locales/en.json', encoding='utf-8'))

def get(path):
    node = d
    for p in path.split('.'):
        if isinstance(node, dict) and p in node:
            node = node[p]
        else:
            return None
    return node

files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)
files = [f for f in files if '__tests__' not in f and 'i18n' not in f.replace('\\', '/')]

missing, dyn_missing, keys = [], [], set()
for f in files:
    src = io.open(f, encoding='utf-8').read()
    for m in re.finditer(r"(?:i18n\.)?t\('([a-zA-Z][a-zA-Z0-9_.]+)'", src):
        k = m.group(1)
        if '.' in k:
            keys.add(k)
    # dynamic: t(`ns.prefix.${var}`) or i18n.t(`ns.prefix.${var}`)
    for m in re.finditer(r"(?:i18n\.)?t\(`([a-zA-Z][a-zA-Z0-9_.]*)\.\$\{([^}]+)\}([^`]*)`\)", src):
        dyn_missing.append((f, m.group(1) + '.${' + m.group(2) + '}' + m.group(3)))

for k in sorted(keys):
    if get(k) is None and get(k + '_one') is None and get(k + '_other') is None:
        missing.append(k)

print('total referenced:', len(keys), 'missing:', len(missing))
for m in missing[:60]:
    print('  MISSING:', m)
print('dynamic template usages:', len(dyn_missing))
for f, m in dyn_missing[:30]:
    print('  DYN:', f, '->', m)
