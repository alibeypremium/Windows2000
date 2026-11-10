#!/usr/bin/env python3
"""Generates the sample files shipped in assets/samples/Docs (text, PDF, WordPad doc, JSON, images, music, video)."""
import json, math, os, subprocess, sys, tempfile, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "samples", "Docs")
os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONTB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONTS = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

# ---------------------------------------------------------------- text
SOZLER = """GÜZEL SÖZLER
============

Sabahın ilk ışığı gibi olsun yüzün; çünkü bazı gülüşler,
bütün bir günü aydınlatmaya yeter.

* Küçük şeylerde mutlu olmayı bilen, büyük mutlulukları kaçırmaz.
* Bir çiçeğe bakmak için acele etme; çiçek de seni beklemeyi bilir.
* Yürümek için yol bulmak değil, yürümeye başlamak gerekir.
* İyilik, söylenince değil yapılınca güzeldir.
* En güzel şarkı, içinden geçeni susmadan söyleyen kalbin şarkısıdır.

DENİZ
-----
Deniz ne söyler bilir misin? Hiçbir şey. Ama dinlerken
içindeki bütün gürültü yavaş yavaş susar.
Dalgalar gelir, gider; geçmişi alır, sana sadece
bugünü bırakır.

YAĞMUR
------
Camın arkasında yağmuru izlemek, dünyanın bir an
durup nefes aldığını görmek gibidir. Çay demlenir,
kitap açılır, zaman yavaşlar.

DİLEK
-----
Bu belgeyi açan herkesin günü güzel geçsin.
Yolun açık, kalbin hafif, çayın hep sıcak olsun.

                                   - Windows 2000 örnek dosyaları
"""
open(f"{OUT}/Güzel Sözler.txt", "w", encoding="utf-8", newline="\r\n").write(SOZLER)

# ---------------------------------------------------------------- WordPad document
html = """<p style="text-align:center"><b><font size="5">Sevgili Dostum</font></b></p>
<p><br></p>
<p>Bu mektubu yazarken pencerenin dışında güneş yavaşça denize iniyor. Gökyüzü önce turuncuya, sonra pembeye, en sonunda
da uzak bir maviye dönüyor. Sana bunu anlatmak istedim, çünkü bazı güzellikler paylaşıldıkça büyüyor.</p>
<p><br></p>
<p><b>Bugün üç şey öğrendim:</b></p>
<ul><li>Acele eden her yere geç kalır, sakin yürüyen yolun tadını çıkarır.</li>
<li>Bir fincan çay, en kötü günü bile biraz daha katlanılır yapar.</li>
<li>İyi bir dost, yıllarca görmesen de aynı sıcaklıkla gülümser.</li></ul>
<p><br></p>
<p>Yakında görüşürüz. O zamana kadar kendine iyi bak, bol bol müzik dinle, güzel kitaplar oku ve gökyüzüne bakmayı unutma.</p>
<p><br></p>
<p style="text-align:right"><i>Sevgilerle,<br>Senin eski bir bilgisayardaki dostun</i></p>"""
json.dump({"format": "win2k-wordpad", "version": 1, "html": html}, open(f"{OUT}/Mektup.wdoc", "w", encoding="utf-8"), ensure_ascii=False)

# ---------------------------------------------------------------- JSON
ayar = {
    "profil": {"ad": "Örnek Kullanıcı", "şehir": "İstanbul", "dil": "tr-TR", "tema": "Windows Klasik"},
    "favoriler": {"renk": "turuncu", "mevsim": "ilkbahar", "içecek": "çay", "müzik": ["Sabah Melodisi", "Gece Rüyası"]},
    "çalmaListesi": [
        {"sıra": 1, "dosya": "Sabah Melodisi.mp3", "süre": "00:30"},
        {"sıra": 2, "dosya": "Gece Rüyası.ogg", "süre": "00:30"},
        {"sıra": 3, "dosya": "Zil.wav", "süre": "00:02"},
    ],
    "günlükSöz": "Güzel bir gün, güzel bir başlangıçla başlar.",
    "notlar": ["Çiçekleri sula", "Eski dostları ara", "Gün batımını izle"],
}
json.dump(ayar, open(f"{OUT}/ayarlar.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- pictures
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def sunset(w, h, sun_t=0.0, seed=1):
    """sun_t 0 = high, 1 = at horizon; returns RGB image."""
    rng = np.random.default_rng(seed)
    horizon = int(h * 0.62)
    img = Image.new("RGB", (w, h))
    px = img.load()
    stops = [(0.0, (28, 32, 88)), (0.35, (112, 66, 140)), (0.65, (240, 120, 100)), (0.85, (255, 178, 90)), (1.0, (255, 226, 150))]
    for y in range(horizon):
        t = y / horizon
        for i in range(len(stops) - 1):
            if stops[i][0] <= t <= stops[i + 1][0]:
                c = lerp(stops[i][1], stops[i + 1][1], (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0])); break
        for x in range(w): px[x, y] = c
    glow = Image.new("RGB", (w, h), (0, 0, 0)); gd = ImageDraw.Draw(glow)
    sy = int(horizon - (1 - sun_t) * h * 0.28 - 6)
    sx = int(w * 0.5)
    r = int(h * 0.085)
    for k in range(10, 0, -1):
        rr = r + k * int(h * 0.03); a = int(14 * (11 - k))
        gd.ellipse((sx - rr, sy - rr, sx + rr, sy + rr), fill=(a, int(a * 0.7), int(a * 0.35)))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    img = Image.fromarray(np.clip(np.asarray(img, dtype=np.int32) + np.asarray(glow, dtype=np.int32), 0, 255).astype("uint8"))
    d = ImageDraw.Draw(img)
    d.ellipse((sx - r, sy - r, sx + r, sy + r), fill=(255, 244, 205))
    # clouds
    cl = Image.new("RGBA", (w, h), (0, 0, 0, 0)); cd = ImageDraw.Draw(cl)
    for _ in range(9):
        cx = int(rng.uniform(0, w)); cy = int(rng.uniform(h * 0.08, horizon * 0.62)); ww = int(rng.uniform(w * .12, w * .26))
        for k in range(4): cd.ellipse((cx + k * ww // 5, cy - 4, cx + k * ww // 5 + ww // 2, cy + ww // 9), fill=(255, 205, 190, 120))
    img.paste(cl.filter(ImageFilter.GaussianBlur(6)), (0, 0), cl.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(img)
    # distant hills
    for layer, (col, amp, off) in enumerate([((70, 52, 96), 0.05, 0.0), ((44, 34, 70), 0.07, 1.7)]):
        pts = [(0, horizon)]
        for x in range(0, w + 1, 6):
            pts.append((x, horizon - int(h * amp * (0.55 + 0.45 * math.sin(x / w * 5 + off) + 0.2 * math.sin(x / w * 13 + off * 2)))))
        pts.append((w, horizon)); d.polygon(pts, fill=col)
    # sea
    for y in range(horizon, h):
        t = (y - horizon) / (h - horizon)
        c = lerp((255, 160, 100), (40, 40, 100), min(1, t * 1.6))
        d.line((0, y, w, y), fill=c)
    for i in range(160):
        yy = int(horizon + (rng.random() ** 1.6) * (h - horizon)); spread = int(14 + (yy - horizon) * 0.5)
        x0 = sx + int(rng.normal(0, spread)); ln = int(rng.uniform(6, 40) * (1 + (yy - horizon) / (h - horizon)))
        d.line((x0 - ln // 2, yy, x0 + ln // 2, yy), fill=(255, 226, 170) if abs(x0 - sx) < w * .15 else (190, 120, 120))
    return img

def night(w, h):
    rng = np.random.default_rng(7)
    img = Image.new("RGB", (w, h)); d = ImageDraw.Draw(img)
    for y in range(h): d.line((0, y, w, y), fill=lerp((6, 10, 38), (42, 40, 96), (y / h) ** 1.4))
    for _ in range(260):
        x, y = int(rng.uniform(0, w)), int(rng.uniform(0, h * .8)); b = int(rng.uniform(140, 255)); s = rng.choice([1, 1, 1, 2])
        d.ellipse((x, y, x + s, y + s), fill=(b, b, min(255, b + 20)))
    mx, my, r = int(w * .72), int(h * .26), int(h * .11)
    halo = Image.new("RGB", (w, h)); hd = ImageDraw.Draw(halo)
    for k in range(12, 0, -1): hd.ellipse((mx - r - k * 9, my - r - k * 9, mx + r + k * 9, my + r + k * 9), fill=(k * 3, k * 3, k * 5))
    halo = halo.filter(ImageFilter.GaussianBlur(14))
    img = Image.fromarray(np.clip(np.asarray(img, dtype=np.int32) + np.asarray(halo, dtype=np.int32), 0, 255).astype("uint8")); d = ImageDraw.Draw(img)
    d.ellipse((mx - r, my - r, mx + r, my + r), fill=(246, 242, 220)); d.ellipse((mx - r + r // 3, my - r - 4, mx + r + r // 3, my + r - 4), fill=lerp((6, 10, 38), (42, 40, 96), my / h))
    d.ellipse((mx - r, my - r, mx + r, my + r), outline=None)
    # redraw crescent properly
    img2 = img.copy(); d2 = ImageDraw.Draw(img2)
    d2.ellipse((mx - r, my - r, mx + r, my + r), fill=(246, 242, 220))
    d2.ellipse((mx - r + r * 0.45, my - r - r * 0.12, mx + r + r * 0.45, my + r - r * 0.12), fill=lerp((6, 10, 38), (42, 40, 96), my / h))
    img = img2; d = ImageDraw.Draw(img)
    base = int(h * .8)
    pts = [(0, h)]; 
    for x in range(0, w + 1, 5): pts.append((x, base - int(h * .09 * (0.5 + 0.5 * math.sin(x / w * 6.5 + 0.4)) + h * .03 * math.sin(x / w * 17))))
    pts.append((w, h)); d.polygon(pts, fill=(10, 12, 28))
    for i in range(14):
        x = int(rng.uniform(0, w)); hh = int(rng.uniform(h * .06, h * .14)); y = base + int(rng.uniform(-8, 14))
        d.polygon([(x, y - hh), (x - hh // 4, y), (x + hh // 4, y)], fill=(6, 9, 20))
    return img

sunset(960, 600).save(f"{OUT}/Gün Batımı.png", optimize=True)
night(960, 600).save(f"{OUT}/Ay Işığı.png", optimize=True)

# ---------------------------------------------------------------- PDF
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
pdfmetrics.registerFont(TTFont("DV", FONT)); pdfmetrics.registerFont(TTFont("DVB", FONTB)); pdfmetrics.registerFont(TTFont("DVS", FONTS))
c = canvas.Canvas(f"{OUT}/Hayat Rehberi.pdf", pagesize=A4); W, H = A4
c.setTitle("Hayat Rehberi"); c.setAuthor("Windows 2000 örnek dosyaları")
# cover
im = ImageReader(f"{OUT}/Gün Batımı.png")
c.drawImage(im, 0, H - 11.5 * cm, width=W, height=11.5 * cm, preserveAspectRatio=False)
c.setFillColor(colors.HexColor("#1b2a5a")); c.setFont("DVB", 30); c.drawString(2.2 * cm, H - 14.2 * cm, "Hayat Rehberi")
c.setFont("DVS", 14); c.setFillColor(colors.HexColor("#555555")); c.drawString(2.2 * cm, H - 15.2 * cm, "Küçük mutlulukların kısa bir kılavuzu")
def para(txt, y, size=11.5, lead=17, font="DV", x=2.2, width=W - 4.4 * cm):
    c.setFont(font, size); c.setFillColor(colors.HexColor("#222222"))
    words = txt.split(); line = ""
    for wd in words:
        t = (line + " " + wd).strip()
        if pdfmetrics.stringWidth(t, font, size) > width: c.drawString(x * cm, y, line); y -= lead; line = wd
        else: line = t
    if line: c.drawString(x * cm, y, line); y -= lead
    return y
y = H - 17.4 * cm
y = para("Bu kısa rehber, her gün biraz daha güzel yaşamak isteyenler için hazırlandı. Büyük planlar gerekmez; küçük alışkanlıklar yeter.", y)
y -= 6
for i, (b, t) in enumerate([("1. Güne yavaş başla.", "Telefona uzanmadan önce pencereyi aç, üç derin nefes al ve gökyüzüne bak."),
                            ("2. Bir şey yarat.", "Resim çiz, mektup yaz, şarkı mırıldan. Yaratmak, zihnin en iyi dinlenme biçimidir."),
                            ("3. Birine iyilik yap.", "Küçük bir mesaj, içten bir teşekkür ya da bir fincan çay; ikimizin de gününü değiştirir."),
                            ("4. Müzik dinle.", "Bazı melodiler sözcüklerin söyleyemediğini söyler. Bu klasördeki parçalara bir göz at."),
                            ("5. Günü güzel bitir.", "Akşam olunca bugün güzel giden üç şeyi düşün ve onlar için içinden teşekkür et.")]):
    c.setFont("DVB", 12.5); c.setFillColor(colors.HexColor("#c0561f")); c.drawString(2.2 * cm, y, b); y -= 17
    y = para(t, y, 11, 16, x=2.8, width=W - 5 * cm); y -= 6
c.setStrokeColor(colors.HexColor("#c0561f")); c.line(2.2 * cm, 2.6 * cm, W - 2.2 * cm, 2.6 * cm)
c.setFont("DVS", 9.5); c.setFillColor(colors.HexColor("#777777")); c.drawString(2.2 * cm, 2.0 * cm, "Windows 2000 örnek dosyaları · Sayfa 1 / 2"); c.showPage()
# page 2
c.drawImage(ImageReader(f"{OUT}/Ay Işığı.png"), 2.2 * cm, H - 9.2 * cm, width=W - 4.4 * cm, height=(W - 4.4 * cm) * 600 / 960)
y = H - 11.4 * cm
c.setFont("DVB", 18); c.setFillColor(colors.HexColor("#1b2a5a")); c.drawString(2.2 * cm, y, "Gece Düşünceleri"); y -= 24
y = para("Gece, gün boyu bağırmış olan her şeyin sustuğu zamandır. Yıldızlara baktığında sorunların küçüldüğünü, dünyanın ise sandığından çok daha güzel olduğunu fark edersin.", y)
y -= 8
y = para("Bir gün her şey yerli yerine oturacak. O güne kadar yapman gereken tek şey nazik olmak, merak etmek ve yürümeye devam etmek.", y)
y -= 16
c.setFont("DVS", 13); c.setFillColor(colors.HexColor("#444444"))
c.drawString(2.2 * cm, y, "“Küçük adımlar da seni uzaklara götürür.”"); y -= 22
c.setFont("DV", 11); c.drawString(2.2 * cm, y, "Not: Bu dosya örnek amaçlıdır; yazıları ve resimleri bu proje için üretilmiştir.")
c.setStrokeColor(colors.HexColor("#c0561f")); c.line(2.2 * cm, 2.6 * cm, W - 2.2 * cm, 2.6 * cm)
c.setFont("DVS", 9.5); c.setFillColor(colors.HexColor("#777777")); c.drawString(2.2 * cm, 2.0 * cm, "Windows 2000 örnek dosyaları · Sayfa 2 / 2")
c.save()

# ---------------------------------------------------------------- audio synthesis
SR = 32000
def tone(freq, dur, kind="bell", amp=0.5):
    t = np.arange(int(SR * dur)) / SR
    if kind == "bell":
        y = np.sin(2 * np.pi * freq * t + 1.6 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-3 * t)) * np.exp(-2.4 * t)
        y += 0.35 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-4 * t)
    elif kind == "pad":
        y = sum(np.sin(2 * np.pi * freq * (1 + d) * t) for d in (-0.003, 0, 0.003)) / 3
        y *= np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 1.2)
    else:
        y = np.sin(2 * np.pi * freq * t) * np.exp(-6 * t)
    a = np.minimum(1, t / 0.005)
    return amp * y * a

def mix(events, total):
    buf = np.zeros(int(SR * total) + SR * 4)
    for st, wave_ in events:
        i = int(st * SR); buf[i:i + len(wave_)] += wave_[: len(buf) - i]
    return buf

def echo(x, delay=0.28, fb=0.38, n=4):
    out = x.copy()
    for k in range(1, n + 1):
        d = int(SR * delay * k); out[d:] += x[: len(x) - d] * (fb ** k)
    return out

def note(m): return 440 * 2 ** ((m - 69) / 12)

def save_wav(x, path):
    x = x / max(1e-9, np.max(np.abs(x))) * 0.88
    with wave.open(path, "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((x * 32767).astype("<i2").tobytes())

tmp = tempfile.mkdtemp()
# Morning melody (C major pentatonic arpeggios over pad)
ev = []; scale = [60, 62, 64, 67, 69, 72, 74, 76]
chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]]
for bar in range(8):
    st = bar * 3.75
    for m in chords[bar % 4]: ev.append((st, tone(note(m), 4.4, "pad", 0.16)))
    pattern = [0, 2, 4, 3, 5, 4, 2, 3] if bar % 2 == 0 else [3, 5, 6, 5, 4, 2, 4, 1]
    for i, p in enumerate(pattern): ev.append((st + i * 0.46, tone(note(scale[p]), 1.6, "bell", 0.34)))
morning = echo(mix(ev, 30.5))[: int(SR * 31)]
save_wav(morning, f"{tmp}/morning.wav")
# Night dream (slow, low pads and sparse bells)
ev = []; prog = [[45, 52, 57, 64], [41, 48, 53, 60], [43, 50, 55, 62], [40, 47, 52, 59]]
for bar in range(5):
    st = bar * 6
    for m in prog[bar % 4]: ev.append((st, tone(note(m), 7.5, "pad", 0.15)))
    for i, m in enumerate([76, 72, 69, 76, 74, 71][: 4 + bar % 3]): ev.append((st + 0.8 + i * 1.3, tone(note(m), 3.2, "bell", 0.3)))
night_a = echo(mix(ev, 30.5), 0.45, 0.45, 5)[: int(SR * 31)]
save_wav(night_a, f"{tmp}/night.wav")
# chime wav (kept as a real .wav sample)
ev = [(0.0, tone(note(84), 1.4, "bell", 0.5)), (0.22, tone(note(88), 1.4, "bell", 0.45)), (0.44, tone(note(91), 1.8, "bell", 0.42))]
chime = echo(mix(ev, 2.4), 0.2, 0.3, 3)[: int(SR * 3)]
with wave.open(f"{OUT}/Zil.wav", "wb") as f:
    x = chime / np.max(np.abs(chime)) * 0.85
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((x * 32767).astype("<i2").tobytes())

def ff(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)
ff("-i", f"{tmp}/morning.wav", "-c:a", "libmp3lame", "-b:a", "80k", "-ac", "2", f"{OUT}/Sabah Melodisi.mp3")
ff("-i", f"{tmp}/night.wav", "-c:a", "libvorbis", "-q:a", "2", f"{OUT}/Gece Rüyası.ogg")

# ---------------------------------------------------------------- video (frames piped to ffmpeg)
def video(path, audio, codec_args, frames_fn, secs=10, fps=12, size=(480, 270)):
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{size[0]}x{size[1]}", "-r", str(fps), "-i", "-",
                          "-i", audio, "-t", str(secs), "-shortest", *codec_args, path], stdin=subprocess.PIPE)
    for i in range(secs * fps):
        p.stdin.write(frames_fn(i, secs * fps, size).tobytes())
    p.stdin.close(); p.wait()

base_sun = {}
def f_sunset(i, n, size):
    t = i / (n - 1)
    im = sunset(size[0], size[1], sun_t=min(1, t * 0.95), seed=3)
    d = ImageDraw.Draw(im)
    fnt = ImageFont.truetype(FONTB, 22)
    a = int(255 * min(1, max(0, (1 - abs(t - 0.5) * 2.2))))
    txt = "Güzel bir gün batımı"
    tw = d.textlength(txt, font=fnt)
    ov = Image.new("RGBA", size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov); od.text(((size[0] - tw) / 2, 28), txt, font=fnt, fill=(255, 255, 255, a))
    im = Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")
    return np.asarray(im)

def f_stars(i, n, size):
    w, h = size; rng = np.random.default_rng(11)
    im = night(w, h); d = ImageDraw.Draw(im)
    for k in range(40):
        x, y = rng.uniform(0, w), rng.uniform(0, h * .7); ph = rng.uniform(0, 6.28); b = int(120 + 135 * (0.5 + 0.5 * math.sin(i / 2.0 + ph)))
        d.ellipse((x - 1.6, y - 1.6, x + 1.6, y + 1.6), fill=(b, b, 255))
    sh = (i * 11) % 160
    if 20 < sh < 70: d.line((w * .15 + sh * 3, 20 + sh * 1.2, w * .15 + sh * 3 - 30, 20 + sh * 1.2 - 12), fill=(255, 255, 255), width=2)
    return np.asarray(im)

video(f"{OUT}/Gün Batımı.mp4", f"{tmp}/morning.wav", ["-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart"], f_sunset)
video(f"{OUT}/Yıldızlar.webm", f"{tmp}/night.wav", ["-c:v", "libvpx", "-b:v", "260k", "-crf", "32", "-c:a", "libvorbis", "-q:a", "1"], f_stars)

for f in sorted(os.listdir(OUT)): print(f"{os.path.getsize(os.path.join(OUT, f)) / 1024:8.0f} KB  {f}")
