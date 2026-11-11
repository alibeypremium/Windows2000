#!/usr/bin/env python3
"""Extract translatable leaf-block segments from assets/help/**/*.htm.
Writes /tmp/hs/segs.json: [{id, text, books:[..]}] (deterministic order)."""
import os, re, json, sys
from html.parser import HTMLParser
BLOCK = {"p","div","li","h1","h2","h3","h4","h5","h6","td","th","dt","dd","pre","blockquote","caption","center","body","title"}
ROOT = "assets/help"
def norm(s): return re.sub(r"\s+", " ", s).strip()
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.stack=[]; s.out=[]; s.skip=0
    def handle_starttag(s,t,a):
        if t in ("script","style"): s.skip+=1; return
        if t in BLOCK:
            if s.stack: s.stack[-1][1]=True  # parent has block child
            s.stack.append([t,False,[]])
    def handle_endtag(s,t):
        if t in ("script","style"): s.skip=max(0,s.skip-1); return
        if t in BLOCK:
            for i in range(len(s.stack)-1,-1,-1):
                if s.stack[i][0]==t:
                    while len(s.stack)>i+1: s.close()
                    s.close(); break
    def close(s):
        t,hb,tx=s.stack.pop()
        if not hb and t!="body": s.out.append(norm("".join(tx)))
        if s.stack and hb is False: pass
    def handle_data(s,d):
        if s.skip or not s.stack: return
        for fr in s.stack: pass
        s.stack[-1][2].append(d)
        # propagate text to ancestors? leaf only needs own text
    def finish(s):
        while s.stack: s.close()
def segs_of(path):
    p=P(); p.feed(open(path,encoding="utf8",errors="ignore").read()); p.finish()
    return [t for t in p.out if len(t)>2 and re.search("[A-Za-z]{3}",t)]
if __name__=="__main__":
    seen={}; order=[]
    books=sorted(d for d in os.listdir(ROOT) if os.path.isdir(f"{ROOT}/{d}"))
    for b in books:
        for dd,_,fs in sorted(os.walk(f"{ROOT}/{b}")):
            for f in sorted(fs):
                if f.endswith(".htm"):
                    for t in segs_of(f"{dd}/{f}"):
                        if t not in seen: seen[t]={"id":len(order),"text":t,"books":[]}; order.append(t)
                        if b not in seen[t]["books"]: seen[t]["books"].append(b)
    out=[seen[t] for t in order]
    json.dump(out,open("/tmp/hs/segs.json","w"),ensure_ascii=False)
    print(len(out),sum(len(x["text"]) for x in out))
