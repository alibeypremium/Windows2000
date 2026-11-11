"""Adds Turkish glyphs (ş Ş ı İ ğ Ğ) to the pixel-grid MS Sans Serif fonts.
Run: python3 scripts/patch-turkish-glyphs.py  (works on assets/fonts/ms-sans-serif*.ttf in place)"""
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
U = 128
def rects_of(font, ch):
    gs = font.getGlyphSet(); c = font.getBestCmap(); p = RecordingPen(); gs[c[ord(ch)]].draw(p)
    out, cur = [], []
    for op, a in p.value:
        cur += list(a)
        if op in ("closePath", "endPath"):
            xs = [x for x, y in cur]; ys = [y for x, y in cur]
            out.append((min(xs)//U, min(ys)//U, max(xs)//U, max(ys)//U)); cur = []
    return out
SPEC = {  # bold? -> extras
    False: {"s": [(2,-1,3,0),(1,-2,3,-1)], "S": [(2,-1,3,0),(1,-2,3,-1)], "dot": (0,10,1,11),
            "g": [(0,8,1,9),(4,8,5,9),(1,7,4,8)], "G": [(1,11,2,12),(4,11,5,12),(2,10,4,11)]},
    True:  {"s": [(2,-1,4,0),(1,-2,4,-1)], "S": [(2,-1,4,0),(1,-2,4,-1)], "dot": (0,10,2,11),
            "g": [(0,8,2,9),(4,8,6,9),(2,7,4,8)], "G": [(0,11,2,12),(5,11,7,12),(2,10,5,11)]},
}
def patch(path, bold):
    f = TTFont(path); sp = SPEC[bold]; cm = f.getBestCmap()
    new = {
        0x131: ("uni0131", [r for r in rects_of(f, "i") if r[1] != 8], "i"),
        0x130: ("uni0130", rects_of(f, "I") + [sp["dot"]], "I"),
        0x15F: ("uni015F", rects_of(f, "s") + sp["s"], "s"),
        0x15E: ("uni015E", rects_of(f, "S") + sp["S"], "S"),
        0x11F: ("uni011F", rects_of(f, "g") + sp["g"], "g"),
        0x11E: ("uni011E", rects_of(f, "G") + sp["G"], "G"),
    }
    order = f.getGlyphOrder()
    for cp, (name, rects, base) in new.items():
        pen = TTGlyphPen(None)
        for x0, y0, x1, y1 in rects:
            pen.moveTo((x0*U, y0*U)); pen.lineTo((x0*U, y1*U)); pen.lineTo((x1*U, y1*U)); pen.lineTo((x1*U, y0*U)); pen.closePath()
        if name not in order: order.append(name)
        f["glyf"].glyphs[name] = pen.glyph()
        f["hmtx"].metrics[name] = f["hmtx"].metrics[cm[ord(base)]]
        for t in f["cmap"].tables:
            if t.isUnicode(): t.cmap[cp] = name
    f.setGlyphOrder(order); f["glyf"].glyphOrder = order
    f["maxp"].numGlyphs = len(order)
    if "post" in f and getattr(f["post"], "formatType", 0) == 2.0:
        f["post"].extraNames = []; f["post"].mapping = {}
    f.save(path)
patch("assets/fonts/ms-sans-serif.ttf", False)
patch("assets/fonts/ms-sans-serif-bold.ttf", True)
