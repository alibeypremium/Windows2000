#!/usr/bin/env python3
"""Builds the Desktop README.pdf and DMCA.pdf (English + Turkish). usage: make-docs.py outdir"""
import sys, os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
D = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("S", D + "DejaVuSans.ttf")); pdfmetrics.registerFont(TTFont("SB", D + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFontFamily("S", normal="S", bold="SB", italic="S", boldItalic="SB")
NAVY, RED, GREEN, BLUE, YEL = colors.HexColor("#000080"), colors.HexColor("#e8321e"), colors.HexColor("#1f8a3b"), colors.HexColor("#1a4fd6"), colors.HexColor("#f2b800")
GRAY = colors.HexColor("#d4d0c8"); PALE = colors.HexColor("#eef3fb")
REPO = "https://github.com/alibeypremium/Windows2000"
SITE = "https://alibeypremium.github.io/Windows2000/"
body = ParagraphStyle("b", fontName="S", fontSize=9.5, leading=14, spaceAfter=5)
small = ParagraphStyle("s", parent=body, fontSize=8, leading=11, textColor=colors.HexColor("#555555"))
def H(t, c): return ParagraphStyle("h", fontName="SB", fontSize=15, leading=19, textColor=c, spaceBefore=10, spaceAfter=6)
h2 = ParagraphStyle("h2", fontName="SB", fontSize=11, leading=14, textColor=NAVY, spaceBefore=6, spaceAfter=3)
bul = ParagraphStyle("bl", parent=body, leftIndent=12, bulletIndent=2, spaceAfter=2)

def page(c, d, title):
    w, h = A4
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, h - 26 * mm, w, 26 * mm, 0, 1)
    for i, col in enumerate((RED, GREEN, BLUE, YEL)):
        c.setFillColor(col); c.rect(14 * mm + (i % 2) * 7.5 * mm, h - 21 * mm + (1 - i // 2) * 7.5 * mm, 7 * mm, 7 * mm, 0, 1)
    c.setFillColor(colors.white); c.setFont("SB", 17); c.drawString(34 * mm, h - 14 * mm, title)
    c.setFont("S", 8.5); c.drawString(34 * mm, h - 20 * mm, "Fan-made · Non-commercial · " + SITE)
    c.setFillColor(GRAY); c.rect(0, 0, w, 10 * mm, 0, 1); c.setFillColor(NAVY); c.setFont("S", 8)
    c.drawString(14 * mm, 4 * mm, "Windows2000 — unofficial fan project"); c.drawRightString(w - 14 * mm, 4 * mm, "Page %d" % d.page)
    c.restoreState()

def build(path, title, flow):
    d = BaseDocTemplate(path, pagesize=A4, title=title, author="Windows2000 fan project")
    fr = Frame(16 * mm, 14 * mm, A4[0] - 32 * mm, A4[1] - 46 * mm, id="f")
    d.addPageTemplates([PageTemplate(id="p", frames=[fr], onPage=lambda c, dd: page(c, dd, title))])
    d.build(flow)

def box(text, col):
    t = Table([[Paragraph(text, body)]], colWidths=[A4[0] - 36 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("LINEBEFORE", (0, 0), (0, -1), 3, col), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t
def bullets(items): return [Paragraph(i, bul, bulletText="•") for i in items]
def table(rows, head, col):
    data = [[Paragraph("<b>%s</b>" % h, ParagraphStyle("th", parent=body, textColor=colors.white, spaceAfter=0)) for h in head]] + [[Paragraph(c, ParagraphStyle("td", parent=body, fontSize=8.6, leading=12, spaceAfter=0)) for c in r] for r in rows]
    t = Table(data, colWidths=[38 * mm, A4[0] - 36 * mm - 38 * mm], repeatRows=1)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), col), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("GRID", (0, 0), (-1, -1), 0.3, GRAY), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return t

# ---------------- README ----------------
APPS_EN = [
 ("Internet Explorer", "Classic IE with address bar, Favorites, History, Search, offline mode and real news pages (BBC, etc.). Opens at a roomy window size."),
 ("Netscape Navigator", "Netscape 4 look. Home page is <i>www.netscape.com/home</i> with the daily Ayah/Hadith/Names panel and 'This day in history'. Bookmarks, Tools and Communicator menus."),
 ("MSN Messenger", "Contact list with personal messages and 'now listening' status, chat windows, tray icon when minimized, and the Diyanet Library contact that sends ayahs, hadiths and the Names of Allah."),
 ("Outlook Express", "Mail client with folders, rules, address book and a local mail server for sending to yourself."),
 ("Microsoft Word / WordPad / Notepad", "Documents, fonts, tables, pictures, find/replace, printing. .doc, .docx, .rtf and .txt open from Docs."),
 ("Acrobat Reader 5.0", "Reads PDF files (rendered with pdf.js): zoom, page navigation, search, text selection."),
 ("Windows Media Player", "Real 6.4 menus, Go to, Favorites, Radio, captions, M3U playlists and TV channel lists (paste an address)."),
 ("VLC media player", "Cone splash screen, volume up to 200%, subtitles (.srt/.vtt) with a load button, M3U/M3U8/HLS TV channels, playlist and effects."),
 ("DivX Player / Winamp", "DivX skin player; Winamp 2.91 classic skin with equalizer and playlist."),
 ("WinRAR", "Browse, create and extract ZIP and RAR archives with the original toolbar."),
 ("Windows Tools", "Wizard to import files into <b>Docs</b>, export files to your real computer, and import/export settings (desktop layout, wallpaper, TV and radio links, sound...)."),
 ("Nvidia", "Opens Display Properties on the Settings tab."),
 ("Paint, Calculator, Games", "Paint, Calculator, Minesweeper, Solitaire, FreeCell, Character Map, Magnifier and more under Start → Programs → Accessories."),
 ("Control Panel & Admin", "Display, Sounds, Regional Options, Add/Remove Programs (cosmetic — nothing is really removed), System Properties, Task Manager, Registry Editor, Disk tools."),
]
APPS_TR = [
 ("Internet Explorer", "Adres çubuğu, Sık Kullanılanlar, Geçmiş, Arama, çevrimdışı mod ve gerçek haber sayfalarıyla (BBC vb.) klasik IE. Geniş bir pencerede açılır."),
 ("Netscape Navigator", "Netscape 4 görünümü. Ana sayfa <i>www.netscape.com/home</i>; günün ayeti/hadisi/esması ve 'Tarihte Bugün' paneli. Yer imleri, Tools ve Communicator menüleri."),
 ("MSN Messenger", "Kişi listesi, kişisel mesajlar ve 'şu an dinliyor' durumu, sohbet pencereleri, simge durumunda sistem tepsisi ikonu ve ayet, hadis, esma gönderen Diyanet Kütüphanesi kişisi."),
 ("Outlook Express", "Klasörler, kurallar, adres defteri ve kendinize mail göndermek için yerel mail sunucusu."),
 ("Microsoft Word / WordPad / Notepad", "Belgeler, yazı tipleri, tablolar, resimler, bul/değiştir, yazdırma. .doc, .docx, .rtf ve .txt dosyaları Docs'tan açılır."),
 ("Acrobat Reader 5.0", "PDF dosyalarını (pdf.js ile) okur: yakınlaştırma, sayfa gezinme, arama, metin seçme."),
 ("Windows Media Player", "Gerçek 6.4 menüleri, Go to, Favorites, Radyo, altyazı, M3U oynatma listeleri ve TV kanal listeleri (adres yapıştırılabilir)."),
 ("VLC media player", "Koni açılış ekranı, %200'e kadar ses, altyazı (.srt/.vtt) yükleme düğmesi, M3U/M3U8/HLS TV kanalları, oynatma listesi ve efektler."),
 ("DivX Player / Winamp", "DivX temalı oynatıcı; ekolayzır ve oynatma listeli klasik Winamp 2.91."),
 ("WinRAR", "Orijinal araç çubuğuyla ZIP ve RAR arşivlerini gez, oluştur, çıkar."),
 ("Windows Tools", "Dosyaları <b>Docs</b> klasörüne alma, gerçek bilgisayara aktarma ve ayar içe/dışa aktarma (masaüstü düzeni, duvar kağıdı, TV-radyo linkleri, ses...) sihirbazı."),
 ("Nvidia", "Display Properties'i Settings sekmesinde açar."),
 ("Paint, Hesap Makinesi, Oyunlar", "Start → Programs → Accessories altında Paint, Hesap Makinesi, Mayın Tarlası, Solitaire, FreeCell, Karakter Tablosu, Büyüteç ve daha fazlası."),
 ("Denetim Masası ve Yönetim", "Ekran, Sesler, Bölgesel Ayarlar, Program Ekle/Kaldır (görsel — gerçekten kaldırmaz), Sistem Özellikleri, Görev Yöneticisi, Kayıt Defteri, Disk araçları."),
]
def readme():
    f = []
    f += [Spacer(1, 4 * mm), Paragraph("Welcome to Windows2000", H("", RED)),
      Paragraph("A Windows 2000 Professional desktop that runs entirely in your browser — no install, no server. It is a fan-made, non-commercial tribute to the old days. Everything you create is stored inside your browser.", body),
      box("<b>Quick start:</b> double-click (or tap on a phone) an icon on the desktop. Use <b>Start → Programs</b> for every app, <b>Start → Run…</b> to type a program name (e.g. <i>vlc</i>, <i>wintools</i>, <i>control desk.cpl</i>).", BLUE),
      Paragraph("How the desktop works", H("", GREEN))]
    f += bullets([
      "<b>Docs folder</b> on the desktop holds every file you bring in from outside, plus sample documents, music, videos and playlists.",
      "<b>Bring files in:</b> drag files onto the desktop or a folder, use <b>File → Open</b> in an app, or use <b>Windows Tools</b>.",
      "<b>Take files out:</b> Windows Tools → Export files, or select files in Explorer and use the download action.",
      "<b>Right-click</b> (long-press on touch) for context menus; icons can be dragged; Properties dialogs show real information.",
      "<b>Settings</b> (wallpaper, colors, sounds, volume, home pages) are saved in the browser and can be exported with Windows Tools.",
      "<b>Wallpapers:</b> Right-click desktop → Properties → Background. The Windows 2000 logo wallpaper is in the list.",
    ])
    f += [Paragraph("Programs and what they do", H("", BLUE)), table(APPS_EN, ["Program", "What it does"], BLUE), Spacer(1, 6 * mm)]
    f += [Paragraph("Windows Tools — how to use", H("", RED))]
    f += bullets(["<b>Import files:</b> choose 'Import files into Docs' → Add Files → Finish. Word, PDF, MP3, MP4, pictures — anything goes to Docs.",
      "<b>Export files:</b> choose 'Export files', tick files in Docs/My Documents/Desktop → Finish. Your browser downloads them.",
      "<b>Export settings:</b> tick groups (desktop layout, wallpaper &amp; colors, TV links, radio links, sound, Internet, date &amp; time) → Finish. Saves <i>Windows2000-Settings.json</i>.",
      "<b>Import settings:</b> browse for a settings file, or choose Default settings to reset the ticked groups. The desktop refreshes."])
    f += [Paragraph("Tips and notes", H("", GREEN))]
    f += bullets(["Media plays whatever formats your browser supports (MP3, OGG, WAV, MP4, WebM, HLS).",
      "Some real web sites refuse to be embedded and may look blank — this is the site's choice, not a bug.",
      "Browser data is local: clearing site data deletes your files. Export now and then.",
      "On a phone, a single tap on a desktop icon opens the program."])
    f += [Paragraph("Project", H("", BLUE)), Paragraph("Source and issue tracker: <u>%s</u><br/>Live site: <u>%s</u><br/>Fan-made, non-commercial. Windows, Microsoft and other names belong to their owners. See the DMCA file on the desktop." % (REPO, SITE), body), PageBreak()]
    f += [Spacer(1, 4 * mm), Paragraph("Windows2000'e Hoş Geldiniz", H("", RED)),
      Paragraph("Tamamen tarayıcınızda çalışan bir Windows 2000 Professional masaüstü — kurulum yok, sunucu yok. Eski günleri hatırlamak için yapılmış, hayran yapımı ve ticari olmayan bir projedir. Oluşturduğunuz her şey tarayıcınızda saklanır.", body),
      box("<b>Hızlı başlangıç:</b> masaüstündeki bir simgeye çift tıklayın (telefonda tek dokunuş yeterli). Tüm uygulamalar <b>Start → Programs</b> altındadır; <b>Start → Run…</b> ile program adı yazabilirsiniz (ör. <i>vlc</i>, <i>wintools</i>, <i>control desk.cpl</i>).", BLUE),
      Paragraph("Masaüstü nasıl çalışır", H("", GREEN))]
    f += bullets([
      "Masaüstündeki <b>Docs</b> klasörü dışarıdan getirdiğiniz tüm dosyaları, örnek belge, müzik, video ve oynatma listelerini tutar.",
      "<b>Dosya getirme:</b> dosyaları masaüstüne veya klasöre sürükleyin, bir uygulamada <b>File → Open</b> kullanın ya da <b>Windows Tools</b>'u açın.",
      "<b>Dosya çıkarma:</b> Windows Tools → Export files veya Explorer'da dosyayı seçip indirme eylemini kullanın.",
      "Bağlam menüleri için <b>sağ tıklayın</b> (dokunmatikte uzun basın); simgeler sürüklenebilir; Özellikler pencereleri gerçek bilgi gösterir.",
      "<b>Ayarlar</b> (duvar kağıdı, renkler, sesler, ana sayfalar) tarayıcıda saklanır ve Windows Tools ile dışa aktarılabilir.",
      "<b>Duvar kağıtları:</b> Masaüstüne sağ tık → Properties → Background. Windows 2000 logolu duvar kağıdı listede.",
    ])
    f += [Paragraph("Programlar ve işlevleri", H("", BLUE)), table(APPS_TR, ["Program", "Ne yapar"], BLUE), Spacer(1, 6 * mm)]
    f += [Paragraph("Windows Tools — kullanım", H("", RED))]
    f += bullets(["<b>Dosya al:</b> 'Import files into Docs' → Add Files → Finish. Word, PDF, MP3, MP4, resim — hepsi Docs'a gider.",
      "<b>Dosya ver:</b> 'Export files' → Docs/My Documents/Desktop'tan dosyaları işaretle → Finish. Tarayıcı indirir.",
      "<b>Ayar ver:</b> grupları işaretle (masaüstü düzeni, duvar kağıdı ve renkler, TV linkleri, radyo linkleri, ses, internet, tarih-saat) → Finish. <i>Windows2000-Settings.json</i> kaydedilir.",
      "<b>Ayar al:</b> bir ayar dosyası seçin ya da Default settings ile işaretli grupları sıfırlayın. Masaüstü yenilenir."])
    f += [Paragraph("İpuçları ve notlar", H("", GREEN))]
    f += bullets(["Medya, tarayıcınızın desteklediği biçimleri (MP3, OGG, WAV, MP4, WebM, HLS) oynatır.",
      "Bazı gerçek siteler gömülü gösterilmeyi reddeder ve boş görünebilir — bu sitenin tercihidir, hata değildir.",
      "Tarayıcı verisi yereldir: site verisini silmek dosyalarınızı siler. Ara sıra dışa aktarın.",
      "Telefonda masaüstü simgesine tek dokunuş programı açar."])
    f += [Paragraph("Proje", H("", BLUE)), Paragraph("Kaynak ve sorun takibi: <u>%s</u><br/>Canlı site: <u>%s</u><br/>Hayran yapımı, ticari değildir. Windows, Microsoft ve diğer adlar sahiplerine aittir. Masaüstündeki DMCA dosyasına bakın." % (REPO, SITE), body)]
    return f

# ---------------- DMCA ----------------
def dmca():
    f = []
    def sec(lang_title, intro, pts, notice, col):
        out = [Spacer(1, 4 * mm), Paragraph(lang_title, H("", col)), Paragraph(intro, body)]
        for h, t in pts: out += [Paragraph(h, h2), Paragraph(t, body)]
        out += [box(notice, RED)]
        return out
    f += sec("DMCA &amp; Copyright Notice",
      "<b>Windows2000</b> is a fan-made, browser-based tribute to the Windows 2000 desktop and the programs of that era (Internet Explorer, Netscape, MSN Messenger, Winamp, VLC, WinRAR, Acrobat Reader and others). It is built with plain HTML, CSS and JavaScript.",
      [("Non-commercial fan project", "This project earns no money. There are no ads, no payments, no donations and no paid features. The only purpose is to remember the old days."),
       ("Not affiliated", "It is not made, endorsed or sponsored by Microsoft, Netscape, AOL, Adobe, VideoLAN, Nullsoft, RARLAB, DivX, NVIDIA or any other company. All names, logos and trademarks belong to their respective owners and are used only to identify the programs being recreated."),
       ("No cracks, no pirated software", "The programs are look-alike re-creations written for the browser. They contain <b>no cracks, key generators, patches, license bypasses, hidden scripts, trackers, miners or background code</b> of any kind, and no original licensed program is distributed. Nothing runs outside your browser tab and nothing is uploaded: files you import stay in your own browser storage."),
       ("Third-party components", "pdf.js (Apache-2.0), hls.js (Apache-2.0) and Webamp (MIT) are used under their own licenses. The project is based on the open repository wieslawsoltes/Win2000. Some interface images and icons imitate or originate from the era's software; if any of them should not be here, we will remove them."),
       ("Your files", "Imported documents, music and videos are your responsibility; please only use content you have the right to use.")],
      "<b>Takedown requests.</b> If you are a rights holder and believe something here infringes your copyright or trademark, please contact us through GitHub — open an issue or write to the repository owner at <u>%s</u> (issues: <u>%s/issues</u>). Please name the material and where it appears. We will <b>remove it immediately</b> once notified, no argument needed." % (REPO, REPO), RED)
    f += [PageBreak()]
    f += sec("DMCA ve Telif Hakkı Bildirimi",
      "<b>Windows2000</b>, Windows 2000 masaüstünün ve dönemin programlarının (Internet Explorer, Netscape, MSN Messenger, Winamp, VLC, WinRAR, Acrobat Reader ve diğerleri) tarayıcıda çalışan, hayran yapımı bir anısıdır. Yalnızca HTML, CSS ve JavaScript ile yazılmıştır.",
      [("Ticari olmayan hayran projesi", "Bu proje gelir elde etmez. Reklam, ödeme, bağış ya da ücretli özellik yoktur. Tek amaç eski günleri hatırlamaktır."),
       ("Bağlantısızlık", "Microsoft, Netscape, AOL, Adobe, VideoLAN, Nullsoft, RARLAB, DivX, NVIDIA veya başka bir şirket tarafından yapılmamış, onaylanmamış ve desteklenmemiştir. Tüm adlar, logolar ve markalar sahiplerine aittir ve yalnızca yeniden oluşturulan programları belirtmek için kullanılır."),
       ("Crack yok, korsan yazılım yok", "Programlar tarayıcı için yazılmış benzer görünümlü yeniden yapımlardır. Hiçbir türde <b>crack, anahtar üretici, yama, lisans atlatma, gizli betik, izleyici, madenci ya da arka plan kodu içermez</b>; orijinal lisanslı program dağıtılmaz. Hiçbir şey tarayıcı sekmenizin dışında çalışmaz ve hiçbir şey yüklenmez: içe aktardığınız dosyalar kendi tarayıcı depolamanızda kalır."),
       ("Üçüncü taraf bileşenler", "pdf.js (Apache-2.0), hls.js (Apache-2.0) ve Webamp (MIT) kendi lisanslarıyla kullanılır. Proje, açık wieslawsoltes/Win2000 deposuna dayanır. Bazı arayüz görselleri ve ikonlar dönemin yazılımlarını taklit eder ya da onlardan gelir; burada olmaması gereken bir şey varsa kaldırırız."),
       ("Dosyalarınız", "İçe aktardığınız belge, müzik ve videolardan siz sorumlusunuz; lütfen yalnızca kullanım hakkınız olan içerikleri kullanın.")],
      "<b>Kaldırma talepleri.</b> Hak sahibiyseniz ve burada telif ya da marka hakkınızı ihlal eden bir şey olduğunu düşünüyorsanız lütfen GitHub üzerinden bize ulaşın — <u>%s</u> deposunda bir issue açın veya depo sahibine yazın (issues: <u>%s/issues</u>). Lütfen içeriği ve yerini belirtin. Bildirim üzerine içeriği <b>derhal kaldıracağız</b>, tartışmaya gerek yoktur." % (REPO, REPO), RED)
    return f

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
build(os.path.join(out, "README.pdf"), "Windows2000 — README / Beni Oku", readme())
build(os.path.join(out, "DMCA.pdf"), "Windows2000 — DMCA Notice / DMCA Bildirimi", dmca())
