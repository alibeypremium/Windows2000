"""Builds the Turkish variant of the Windows Tools wizard side panel (assets/wintools/side.tr.png)
from the English one: erases the English captions and draws the Turkish ones in the same style."""
from PIL import Image, ImageDraw, ImageFont
import glob
src = Image.open("assets/wintools/side.png").convert("RGB")
im = src.copy(); px = im.load(); W, H = im.size
def erase(x0, y0, x1, y1):
    for y in range(y0, y1):
        a, b = src.getpixel((x0 - 1, y)), src.getpixel((x1, y))
        for x in range(x0, x1):
            f = (x - x0) / max(1, x1 - x0 - 1)
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * f) for i in range(3))
erase(8, 112, 156, 138)      # title
erase(30, 148, 134, 196)     # three captions
d = ImageDraw.Draw(im)
bold = [f for f in glob.glob("/usr/share/fonts/**/DejaVuSans-Bold.ttf", recursive=True)][0]
reg = [f for f in glob.glob("/usr/share/fonts/**/DejaVuSans.ttf", recursive=True)][0]
def center(text, y, font, fill):
    w = d.textlength(text, font=font); d.text(((W - w) / 2, y), text, font=font, fill=fill)
size = 13
while d.textlength("Windows Araçları", font=ImageFont.truetype(bold, size)) > 138: size -= 1
center("Windows Araçları", 115, ImageFont.truetype(bold, size), (255, 255, 255))
f = ImageFont.truetype(reg, 10)
for i, t in enumerate(["Dosyaları içe aktar", "Dosyaları dışa aktar", "Ayarlar"]):
    center(t, 148 + i * 14, f, (206, 216, 236))
im.save("assets/wintools/side.tr.png")
