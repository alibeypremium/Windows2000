#!/usr/bin/env python3
"""Extract RT_GROUP_ICON resources of a PE file as PNG (largest <=32px). usage: dump-icons.py file outdir"""
import sys, struct, io, os, pefile
from PIL import Image
pe = pefile.PE(sys.argv[1]); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
res = {}
for e in pe.DIRECTORY_ENTRY_RESOURCE.entries:
    t = e.struct.Id
    if t in (3, 14):
        d = {}
        for x in e.directory.entries:
            lang = x.directory.entries[0].data.struct
            d[x.id if x.name is None else x.name.decode()] = pe.get_data(lang.OffsetToData, lang.Size)
        res[t] = d
for gid, g in res.get(14, {}).items():
    n = struct.unpack_from('<H', g, 4)[0]
    ents = []
    for i in range(n):
        w, h, cc, _, pl, bc, sz, iid = struct.unpack_from('<BBBBHHIH', g, 6 + i * 14)
        ents.append((w or 256, h or 256, bc, iid))
    ents = [e for e in ents if e[0] <= 32] or ents
    w, h, bc, iid = sorted(ents, key=lambda e: (e[0], e[2]))[-1]
    data = res[3][iid]
    ico = struct.pack('<HHH', 0, 1, 1) + struct.pack('<BBBBHHII', w % 256, h % 256, 0, 0, 1, bc, len(data), 22) + data
    try: Image.open(io.BytesIO(ico)).convert('RGBA').save(os.path.join(out, f'{gid}.png'))
    except Exception as ex: print('fail', gid, ex)
