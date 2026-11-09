#!/usr/bin/env python3
"""Dump RT_DIALOG templates of a PE file to JSON (units in DLUs). usage: dump-dialogs.py file.dll [out.json]"""
import sys, struct, json, pefile
CLS = {0x80: "button", 0x81: "edit", 0x82: "static", 0x83: "listbox", 0x84: "scrollbar", 0x85: "combobox"}
def rdstr(b, o):
    s = o
    while struct.unpack_from("<H", b, o)[0]: o += 2
    return b[s:o].decode("utf-16le"), o + 2
def rdsz(b, o):  # sz_Or_Ord
    v = struct.unpack_from("<H", b, o)[0]
    if v == 0: return "", o + 2
    if v == 0xFFFF: return struct.unpack_from("<H", b, o + 2)[0], o + 4
    return rdstr(b, o)
def parse(b):
    o = 0; ver, sig = struct.unpack_from("<HH", b, 0)
    ex = ver == 1 and sig == 0xFFFF
    if ex:
        o = 4; helpid, exstyle, style = struct.unpack_from("<III", b, o); o += 12
    else:
        style, exstyle = struct.unpack_from("<II", b, 0); o = 8
    n, x, y, cx, cy = struct.unpack_from("<Hhhhh", b, o); o += 10
    menu, o = rdsz(b, o); cls, o = rdsz(b, o); title, o = rdstr(b, o)
    d = {"style": style, "exstyle": exstyle, "x": x, "y": y, "cx": cx, "cy": cy, "menu": menu, "class": cls, "title": title, "controls": []}
    if style & 0x40:  # DS_SETFONT
        pt = struct.unpack_from("<H", b, o)[0]; o += 2
        if ex: o += 4
        face, o = rdstr(b, o); d["font"] = [pt, face]
    for _ in range(n):
        o = (o + 3) & ~3
        if ex:
            hid, ees, st, = struct.unpack_from("<III", b, o); o += 12
            x, y, cx, cy, cid = struct.unpack_from("<hhhhI", b, o); o += 12
        else:
            st, ees = struct.unpack_from("<II", b, o); o += 8
            x, y, cx, cy, cid = struct.unpack_from("<hhhhH", b, o); o += 10
        c, o = rdsz(b, o); t, o = rdsz(b, o)
        ed = struct.unpack_from("<H", b, o)[0]; o += 2 + ed
        d["controls"].append({"class": CLS.get(c, c), "style": st, "exstyle": ees, "x": x, "y": y, "cx": cx, "cy": cy, "id": cid, "text": t})
    return d
def dump(path):
    pe = pefile.PE(path, fast_load=True); pe.parse_data_directories(directories=[2])
    out = {}
    for e in getattr(pe, "DIRECTORY_ENTRY_RESOURCE", None).entries if hasattr(pe, "DIRECTORY_ENTRY_RESOURCE") else []:
        if e.id != 5: continue
        for n in e.directory.entries:
            for l in n.directory.entries:
                rva, size = l.data.struct.OffsetToData, l.data.struct.Size
                try: out[str(n.name) if n.name else n.id] = parse(pe.get_data(rva, size))
                except Exception as ex: out[str(n.id)] = {"error": str(ex)}
    return out
if __name__ == "__main__":
    r = dump(sys.argv[1])
    json.dump(r, open(sys.argv[2], "w"), separators=(",", ":")) if len(sys.argv) > 2 else print(json.dumps(r)[:2000])
