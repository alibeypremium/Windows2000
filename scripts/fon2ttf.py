#!/usr/bin/env python3
"""Convert a Windows 3.x/NT .FON bitmap font (NE container, FNT v2) to a pixel-outline TrueType font.

usage: fon2ttf.py sserife.fon <points> <out.ttf> [--bold] [--family NAME]
"""
import struct, sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

PX = 128  # font units per source pixel


def read_fnt(path, points):
    d = open(path, "rb").read()
    ne = struct.unpack_from("<I", d, 0x3C)[0]
    rt = ne + struct.unpack_from("<H", d, ne + 0x24)[0]
    shift = struct.unpack_from("<H", d, rt)[0]
    p = rt + 2
    while True:
        t = struct.unpack_from("<H", d, p)[0]
        if t == 0:
            break
        n = struct.unpack_from("<H", d, p + 2)[0]
        p += 8
        for _ in range(n):
            off, ln, *_ = struct.unpack_from("<HHHHHH", d, p)
            p += 12
            if t == 0x8008:
                off <<= shift
                pts = struct.unpack_from("<H", d, off + 0x44)[0]
                if pts == points:
                    return d[off : off + (ln << shift)]
    raise SystemExit("size not found")


def parse(fnt):
    ver = struct.unpack_from("<H", fnt, 0)[0]
    assert ver == 0x200, hex(ver)
    asc = struct.unpack_from("<H", fnt, 74)[0]
    height = struct.unpack_from("<H", fnt, 88)[0]
    first, last = fnt[95], fnt[96]
    wbytes = struct.unpack_from("<H", fnt, 99)[0]
    bits_off = struct.unpack_from("<I", fnt, 113)[0]
    glyphs = {}
    for i in range(last - first + 1):
        w, o = struct.unpack_from("<HH", fnt, 118 + 4 * i)
        nb = (w + 7) // 8
        rows = [[0] * w for _ in range(height)]
        # v2: bitmap is row-major strips? (v2 stores column-planar like v3)
        for c in range(nb):
            for r in range(height):
                b = fnt[o + c * height + r]
                for k in range(8):
                    x = c * 8 + k
                    if x < w and b & (0x80 >> k):
                        rows[r][x] = 1
        glyphs[first + i] = (w, rows)
    return asc, height, glyphs


def main():
    a = sys.argv[1:]
    bold = "--bold" in a
    fam = "MS Sans Serif"
    if "--family" in a:
        fam = a[a.index("--family") + 1]
    src, pts, out = a[0], int(a[1]), a[2]
    asc, height, glyphs = parse(read_fnt(src, pts))
    order, cmap, metrics, glyf = [".notdef"], {}, {}, {}

    def build(rows, w):
        pen = TTGlyphPen(None)
        for r, row in enumerate(rows):
            y1 = (asc - r) * PX
            y0 = y1 - PX
            x = 0
            row = list(row)
            if bold:
                row = [row[i] or (i > 0 and row[i - 1]) for i in range(len(row))] + [row[-1] if row else 0]
            while x < len(row):
                if row[x]:
                    s = x
                    while x < len(row) and row[x]:
                        x += 1
                    pen.moveTo((s * PX, y0)); pen.lineTo((s * PX, y1)); pen.lineTo((x * PX, y1)); pen.lineTo((x * PX, y0)); pen.closePath()
                else:
                    x += 1
        return pen.glyph()

    def adv(w):
        return (w + (1 if bold else 0)) * PX

    glyf[".notdef"] = build([[1] * 6 for _ in range(height)], 6) if False else TTGlyphPen(None).glyph()
    metrics[".notdef"] = (adv(8), 0)
    for code, (w, rows) in sorted(glyphs.items()):
        try:
            uni = ord(bytes([code]).decode("cp1252"))
        except Exception:
            continue
        if code < 32:
            continue
        name = "uni%04X" % uni
        glyf[name] = build(rows, w)
        metrics[name] = (adv(w), 0)
        cmap[uni] = name
        order.append(name)
    fb = FontBuilder(height * PX, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics({n: (adv_, 0) for n, (adv_, _) in metrics.items()})
    fb.setupHorizontalHeader(ascent=asc * PX, descent=-(height - asc) * PX)
    fb.setupNameTable({"familyName": fam, "styleName": "Bold" if bold else "Regular"})
    fb.setupOS2(sTypoAscender=asc * PX, sTypoDescender=-(height - asc) * PX, usWinAscent=asc * PX, usWinDescent=(height - asc) * PX, fsType=0)
    fb.setupPost()
    fb.save(out)


main()
