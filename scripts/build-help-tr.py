#!/usr/bin/env python3
"""Compile scripts/help-tr/{names-N,seg-N}.txt ("id|turkish") into assets/help-tr/*.json.
segs.json = English source segments ([[..]] marks inline elements); books map via /tmp scan stored in segs-books.json."""
import json, glob, re, os, sys
H = "scripts/help-tr"; OUT = "assets/help-tr"; os.makedirs(OUT, exist_ok=True)
def load(pat):
    d = {}
    for f in sorted(glob.glob(f"{H}/{pat}")):
        for l in open(f, encoding="utf8"):
            l = l.rstrip("\n")
            if "|" in l and l.split("|", 1)[0].isdigit():
                i, t = l.split("|", 1); d[int(i)] = t
    return d
names = json.load(open(f"{H}/names-src.json")); nt = load("names-*.txt")
json.dump({names[i]: t for i, t in nt.items() if t and names[i] != t}, open(f"{OUT}/names.json", "w"), ensure_ascii=False, separators=(",", ":"))
segs = json.load(open(f"{H}/segs.json")); books = json.load(open(f"{H}/segs-books.json")); st = load("seg-*.txt")
per = {}; bad = 0
for i, t in st.items():
    src = segs[i]
    if src.count("[[") != t.count("[["):
        # inline markers must match, otherwise markup would be lost: drop markers
        t = t.replace("[[", "").replace("]]", ""); bad += 1
    key = re.sub(r"\[\[|\]\]", "", src)
    for b in books[i]: per.setdefault(b, {})[key] = t
for b, d in per.items(): json.dump(d, open(f"{OUT}/{b}.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("names", len(nt), "segments", len(st), "/", len(segs), "marker-mismatch", bad, "books", len(per))
