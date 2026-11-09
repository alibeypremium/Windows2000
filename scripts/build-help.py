#!/usr/bin/env python3
"""Bundle a curated subset of the Windows 2000 CHM help (pre-extracted with 7z) into assets/help.
usage: build-help.py <chm-extract-dir> <out-dir>"""
import sys, re, json, shutil
from pathlib import Path
src, out = Path(sys.argv[1]), Path(sys.argv[2])
SEL = "getstart howto concepts tshoot glossary notepad calc mspaint wordpad freecell sol winmine pinball regedit taskmgr charmap clipbrd display access common iexplore mplayer soundrec sndvol32 find folderop fonts recycle printing hardware keyb mouse datetime cpanel sounds nthelp msoe dialer hypertrm mobsync osk deluxcd wab MP_w".split()
BOOK_NAMES = {"getstart":"Getting Started","howto":"How To...","concepts":"Concepts","tshoot":"Troubleshooting","glossary":"Glossary"}
if out.exists(): shutil.rmtree(out)
out.mkdir(parents=True)
def rd(p): return Path(p).read_bytes().decode("cp1252", "replace")
def media(d, dest):
    dest.mkdir(parents=True, exist_ok=True)
    for f in d.iterdir():
        if f.suffix.lower() in (".gif",".jpg",".png",".css",".ico"):
            shutil.copy(f, dest / f.name.lower())
media(src/"ntshared", out/"ntshared")
haid = {}; pages = []  # pages: [chm,file,title,text]
for chm in SEL:
    d = src/chm
    if not d.is_dir(): print("skip", chm); continue
    media(d, out/chm)
    for f in sorted(d.glob("*.htm")):
        if f.name == "compile_date.htm": continue
        h = rd(f)
        m = re.search(r'MS-HAID"\s+CONTENT="([^"]+)"', h, re.I)
        t = re.search(r"<TITLE>(.*?)</TITLE>", h, re.I | re.S)
        if m: haid[m.group(1)] = f"{chm}/{f.name.lower()}"
        pages.append([chm, f.name, (t.group(1).strip() if t else f.stem), h])
def fix(h, chm):
    h = re.sub(r"<SCRIPT.*?</SCRIPT>", "", h, flags=re.I | re.S)
    h = re.sub(r"<HEAD>", '<HEAD><meta charset="utf-8">', h, count=1, flags=re.I)
    h = re.sub(r'<META[^>]*PICS[^>]*>|<META[^>]*MS-IT-LOC[^>]*>|<META[^>]*Content-Type[^>]*>', "", h, flags=re.I)
    h = re.sub(r'MS-ITS:ntshared\.chm::/', "../ntshared/", h, flags=re.I)
    def own(m):
        c, f = m.group(1).lower(), m.group(2).lower()
        return f'"../{c}/{f}"'
    h = re.sub(r'"MS-ITS:([\w]+)\.chm::/([^"#]+)"', own, h, flags=re.I)
    h = re.sub(r'"mk:@MSITStore:[^"]*?([\w]+)\.chm::/([^"#]+)"', own, h, flags=re.I)
    h = re.sub(r'HREF="CHM=[^"]*?META=([^"]+)"', lambda m: 'HREF="#" data-haid="%s"' % m.group(1), h, flags=re.I)
    h = re.sub(r'(?i)\b(src|href|background)=(["\'])(?!https?:|mailto:|#|CHM=|javascript:)([^"\'#]+)', lambda m: f"{m.group(1)}={m.group(2)}{m.group(3).lower()}", h)
    return h
names = {}
for chm, fn, title, h in pages:
    (out/chm/fn.lower()).write_text(fix(h, chm), encoding="utf-8")
def parse(path, chm):
    if not path.exists(): return []
    txt = rd(path); root = []; stack = [root]; last = None
    for tok in re.finditer(r"<UL>|</UL>|<OBJECT type=\"text/sitemap\">(.*?)</OBJECT>", txt, re.I | re.S):
        s = tok.group(0).upper()
        if s == "<UL>":
            if last is not None: last.setdefault("c", []); stack.append(last["c"])
            else: stack.append(stack[-1])
        elif s == "</UL>":
            if len(stack) > 1: stack.pop()
        else:
            body = tok.group(1)
            nm = re.search(r'name="Name"\s+value="([^"]*)"', body, re.I); lc = re.search(r'name="Local"\s+value="([^"]*)"', body, re.I)
            n = {"n": re.sub(r"&amp;", "&", nm.group(1)) if nm else ""}
            if lc:
                l = lc.group(1); l = re.sub(r"(?i)^ms-its:(\w+)\.chm::/", lambda m: m.group(1).lower() + "/", l)
                n["l"] = l if "/" in l else f"{chm}/{l.lower()}"
                n["l"] = n["l"].split("#")[0].lower()
            stack[-1].append(n); last = n
    return root
toc = {}; idx = []
for chm in SEL:
    d = src/chm
    if not d.is_dir(): continue
    hhc = next(iter(d.glob("*.hhc")), None); hhk = next(iter(d.glob("*.hhk")), None)
    t = parse(hhc, chm) if hhc else []
    def clean(ns): return [dict(n, c=clean(n["c"])) if "c" in n else n for n in ns if n["n"]]
    t = clean(t)
    BN = dict(BOOK_NAMES, common="Common Dialog Boxes", recycle="Recycle Bin", msoe="Outlook Express", iexplore="Internet Explorer", cpanel="Control Panel", tshoot="Troubleshooting", getstart="Getting Started")
    if len(t) > 1: t = [{"n": BN.get(chm, chm), "l": t[0].get("l"), "c": t[1:] if t[0].get("l") and not t[0].get("c") else t}]
    elif len(t) == 1 and chm in ("common", "recycle"): t[0]["n"] = BN[chm]
    if t: toc[chm] = t
    else:
        ps = sorted(((t, f"{chm}/{fn.lower()}") for c, fn, t, h in pages if c == chm), key=lambda x: x[0].lower())
        toc[chm] = [{"n": BOOK_NAMES.get(chm, chm), "c": [{"n": t, "l": l} for t, l in ps]}]; toc[chm][0]["n"] = BN.get(chm, chm)
    if hhk:
        def flat(ns):
            for n in ns:
                if n.get("l"): idx.append([n["n"], n["l"]])
                flat(n.get("c", []))
        flat(parse(hhk, chm))
idx.sort(key=lambda x: x[0].lower())
# search index
STOP = set("the and for you that with this are can your from not will have all any has was use into more such when then they them their which also but how what who its out one may see these those other only".split())
tx = []; inv = {}
for i, (chm, fn, title, h) in enumerate(pages):
    body = re.sub(r"<[^>]+>", " ", re.sub(r"<SCRIPT.*?</SCRIPT>", "", h, flags=re.I | re.S))
    for w in set(re.findall(r"[a-z][a-z0-9]{2,}", (title + " " + body).lower())):
        if w not in STOP: inv.setdefault(w, []).append(i)
    tx.append([f"{chm}/{fn.lower()}", title])
json.dump({"haid": haid, "toc": toc, "index": idx, "pages": tx, "words": inv, "books": BOOK_NAMES}, open(out/"help.json", "w"), separators=(",", ":"))
tot = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
print(len(pages), "pages", len(idx), "index", len(inv), "words", tot // 1024, "KB")
