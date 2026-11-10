#!/usr/bin/env python3
"""Extract RT_BITMAP resources of a PE file as PNG. usage: dump-bitmaps.py file outdir [prefix]"""
import sys, struct, io, os, pefile
from PIL import Image
pe = pefile.PE(sys.argv[1]); out = sys.argv[2]; pre = sys.argv[3] if len(sys.argv) > 3 else "bmp"
os.makedirs(out, exist_ok=True)
for t in pe.DIRECTORY_ENTRY_RESOURCE.entries:
    if t.id != 2: continue
    for e in t.directory.entries:
        d = e.directory.entries[0].data.struct; b = pe.get_data(d.OffsetToData, d.Size)
        hs, w, h, pl, bc = struct.unpack_from("<IiiHH", b, 0); clr = struct.unpack_from("<I", b, 32)[0]
        n = clr or (1 << bc if bc <= 8 else 0); off = 14 + hs + n * 4
        bmp = b"BM" + struct.pack("<IHHI", 14 + len(b), 0, 0, off) + b
        try: Image.open(io.BytesIO(bmp)).convert("RGBA")  # placeholderos.path.join(out, f"{pre}{e.id}.png")); print(e.id, w, h, bc)
        except Exception as ex: print("fail", e.id, ex)
