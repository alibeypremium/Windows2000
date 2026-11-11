# Compatibility matrix

## Scope

This project recreates the Windows 2000 desktop interface and selected workflows in a browser. It does **not** implement all Windows 2000 OS features or every original application feature, and is not a verified pixel-perfect clone. It includes 38 registered entries; several share an implementation or primarily provide reports/adapters.

**Core**: principal browser workflow implemented. **Partial**: reduced feature set. **Adapter**: browser/device integration. **Info**: report or launcher. These labels describe implementation scope, not completed end-to-end verification or native parity.

| Program              | Scope   | Implemented                                                                      | Material differences                                                                 |
| -------------------- | ------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Explorer             | Core    | Virtual files, views, search, CRUD, Recycle Bin, import/download.                | No native NTFS, host filesystem, SMB or Windows permissions.                         |
| Notepad              | Core    | Plain text, undo, find/replace, wrap, font, save/open/print.                     | No original text-control or encoding compatibility guarantee.                        |
| Microsoft Word       | Partial | Rich text, tables (grid picker, AutoFormat, merge/split, Tab navigation), pictures (file/computer/paste, resize), header/footer, page numbers, Page Setup (margins, paper, orientation), spell check, .doc/.docx/.htm/.txt save, .docx open. | .doc is Word-style HTML (no binary .doc); no real pagination, so header/footer show on first/last page on screen and repeat when printing. |
| MSN Messenger        | Partial | Offline simulation with 30+ fictional contacts and organisations, display pictures, groups, add/delete from a local directory, saved status and history, nudge, simulated file transfer, rule-based auto replies. | Menus/dialogs from the real msnmsgr resources; nothing is sent over the network; menu items without a function were removed. |
| WordPad              | Partial | Rich text, lists, alignment, images, HTML export, .wdoc save.                    | Only custom .wdoc preserves formatting; RTF is basic text import.                    |
| Paint                | Partial | Drawing, fill, shapes, selection, undo, transforms, import and PNG save.         | 4096×4096 limit; free-form selection uses a rectangle; curves/text simplified.       |
| Calculator           | Partial | Arithmetic, memory, repeated equals and selected scientific functions.           | JavaScript numeric precision; incomplete original scientific/base/bitwise functions. |
| Windows Media Player | Core    | Audio/video, seeking, playlist, repeat, speed and spectrum; plays all Docs media. | Uses browser codecs; no Windows codec DLLs or legacy DRM.                            |
| CD Player            | Adapter | Imported-audio playback with CD Player title.                                    | No physical audio CD or CD-ROM access.                                               |
| Sound Recorder       | Partial | Microphone capture, playback and PCM WAV save with dirty guards.                 | Permission/codecs apply; playback-speed effects do not rewrite saved audio.          |
| Volume Control       | Partial | Desktop master/wave level, mute and stereo balance where supported.              | Controls app audio, not the host OS mixer or independent hardware channels.          |
| Imaging              | Partial | Image viewing, zoom, rotation, print/download and Paint handoff.                 | Rotation is view-only; download keeps original. No scanning/OCR/multipage editing.   |
| Internet Explorer    | Adapter | Addresses, favorites/history, local HTML, web frames and external opening.       | Modern browser engine; embedding may be refused; no ActiveX, VBScript or Trident.    |
| Outlook Express      | Partial | Local drafts, compose/reply, .eml export and mailto handoff.                     | No SMTP/POP3/IMAP delivery or retrieval; sending completes externally.               |
| Address Book         | Core    | Contact CRUD/search, JSON export and compose handoff.                            | No WAB format or directory-service integration.                                      |
| HyperTerminal        | Adapter | Loopback, WebSocket/Web Serial, text and log capture.                            | No raw modem/Telnet sockets or complete terminal escape emulation.                   |
| Phone Dialer         | Adapter | Keypad and tel handoff.                                                          | Requires external telephone handler; no voice-modem control.                         |
| Synchronize          | Info    | Waits for pending virtual-file writes and reports completion.                    | No remote/server/mail/device synchronization.                                        |
| Minesweeper          | Core    | Levels/custom board, flags, questions, chord, timer and best times.              | 9×9 Beginner and safe first-click neighborhood; native RNG parity unverified.        |
| Solitaire            | Core    | Klondike, draw 1/3, legal moves, scoring, undo, hints and auto-foundation.       | Custom cards and simplified original options/scoring.                                |
| FreeCell             | Core    | Free cells, sequence limits, undo, hints and deterministic game numbers.         | Deal numbers are specific to this implementation.                                    |
| Command Prompt       | Partial | Virtual file/text commands, environment, history, completion and launching.      | Simplified parser; no native executables, complete batch language or pipes.          |
| Task Manager         | Core    | Window/process list, switch/close/run, event-loop and available JS heap reports. | Processes are desktop windows; no host process/CPU management.                       |
| Registry Editor      | Partial | Virtual keys/values, search and JSON import/export.                              | No native hives or Windows .reg compatibility.                                       |
| System Information   | Core    | Browser capabilities, renderer, virtual storage and text export.                 | Only browser-exposed information; no comprehensive hardware inventory.               |
| Device Manager       | Info    | Browser/API capability inventory.                                                | No native devices, drivers, enable/disable or installation.                          |
| Event Viewer         | Core    | Session events, details, filter, clear and JSON export.                          | In-memory desktop log, capped at 500; no native System/Security logs.                |
| Scheduled Tasks      | Partial | Persisted delayed/repeating app launches, run, pause and delete.                 | Page must remain alive; background suspension delays tasks.                          |
| Disk Management      | Info    | Virtual volume/record summaries, analysis, map and JSON backup.                  | No physical disks, partitions, formatting or native disk images.                     |
| Disk Defragmenter    | Info    | Virtual-record analysis and backup interface.                                    | Does not defragment/reorganize records; IndexedDB manages storage.                   |
| Character Map        | Partial | ASCII/Latin-1, font choice, code points, string building and copy.               | Restricted character ranges; no complete Unicode/font inventory.                     |
| ClipBook Viewer      | Partial | Internal text/file clipboard, changes, clear and text download.                  | No host clipboard-format or shared ClipBook-page compatibility.                      |
| On-Screen Keyboard   | Partial | Text insertion, backspace, newline, spaces and letter case.                      | No OS keystroke injection; modifier/shifted punctuation support incomplete.          |
| Magnifier            | Partial | CSS desktop/window zoom and reset.                                               | No separate lens, cursor tracking or host-screen magnification.                      |
| Control Panel        | Partial | 18 pages, theme/clock/sounds/settings, reports and filesystem backups.           | Some applets are informational; no native OS/hardware/security configuration.        |
| Windows Help         | Core    | Project topics, search, navigation, related links and printing.                  | No native .hlp/.chm engine.                                                          |
| Getting Started      | Info    | Introductory links and startup preference.                                       | No native setup/tour engine.                                                         |
| About Windows        | Info    | Recreation version, user, renderer and compatibility information.                | Displayed Windows-era branding does not indicate a running NT kernel.                |
| Run                  | Core    | App IDs/aliases, virtual paths, web URLs and command history.                    | Aliases select JavaScript apps; they do not execute Windows binaries.                |

## Operating-system boundary

The project does not include an x86 emulator, Windows installation media, NT kernel, native executable loader, Win32 API compatibility layer, drivers, services, native registry, Active Directory, SMB networking, NTFS permissions, account isolation or Windows security boundaries. Native `.exe`, `.dll`, `.sys` and installer files cannot run here. The virtual lock/shutdown/restart controls affect the web desktop.

Real native OS/application compatibility would require an emulator or virtualization runtime and an appropriately licensed Windows installation. That is a separate architecture from this HTML/JavaScript recreation.

## Visual fidelity

The UI uses Windows 2000-era colors, square beveled controls, title gradients, compact menus, Wine Tahoma replacement fonts and historical Windows-family icons. Some icons come from Windows 98 archives; the fonts are not Microsoft's Tahoma binaries. Browser font rasterization, zoom, device pixel ratio, native form controls, app-specific layouts and simplified game artwork introduce differences. No exhaustive screenshot-diff baseline exists for original Windows 2000 screens.

## Persistence and browser constraints

Files use IndexedDB; settings use localStorage. The JSON filesystem backup contains files/folders and registry data, but not separate settings, task definitions or browser permissions. Multiple desktop windows share serialized writes; stale writes from another tab are rejected instead of merged. Large imported media consumes extra memory/storage because it is retained as data URLs and committed in full-volume snapshots.

Clipboard, recording, serial ports, media codecs, GPU, printing and external handlers depend on browser support and permissions. Embedded websites can refuse frames. Scheduled tasks require a live page. Offline use requires relevant resources to have been cached. This implementation does not turn browser storage into a native protected filesystem.

## Media players — shared media engine (`packages/accessories/media-engine.js`)
- VLC, DivX Player and Winamp use one engine: Docs-folder media (`sourceFor`, `mediaFiles`), 10-band equalizer with presets (settings `mediaEq`, shared by VLC/DivX), subtitle parsing (SRT/VTT/MicroDVD) with automatic loading of a sibling subtitle file. Winamp uses Webamp's own EQ and playlist editor.
- VLC: real Media/Playback/Audio/Video/View/Settings menus, playlist window (drag-reorder, M3U/PLS open/save, Add Folder), Adjustments and Effects (equalizer with live spectrum, video effects, subtitle delay), Preferences, subtitle loading.
- DivX Player: subtitles, equalizer menu, 4 colour skins. Winamp: Alt+S skin browser (7 colour skins via CSS filter, not .wsz files), Docs files in the add-file menu, `.m3u/.pls` open in VLC.
- Limitation: Winamp colour skins recolour the default skin; the playlist text keeps its green colour.

### WinRAR geliştirmeleri (dialoglar, arşiv oluşturma, kabuk eklentisi)
- Dialoglar gerçek WinRAR 4.11 kaynaklarından (dialogs.json): Find files + Search results (isim maskesi, metin/hex arama, alt klasör, arşivlerin içinde arama), Info (Archive/Statistics sekmeleri, sıkıştırma tahmini), Settings (7 sekme, değerler kalıcı; liste çizgileri, saniye gösterimi, düğme yazısı, arşivler önce, başlangıç klasörü ve açılışta Wizard gerçekten uygulanır), Context menu items, Wizard (Unpack / Create / Add adımları), Archive name and parameters (RAR/ZIP seçimi).
- Uçtan uca test: dosyalar → .zip/.rar oluştur → aç → test → çıkar → bayt boyutları aynı; RAR içinden silme çalışır.
- Explorer ve masaüstü sağ tık menülerine WinRAR satırları eklendi (Extract files/Here/to folder, Add to archive..., Add to \"x.rar\", Compress and email); "Context menu items" ayarı bu satırları açıp kapatır. Email seçenekleri Outlook Express'te arşivi ek olarak açar.
- Sınırlar: RAR yalnızca "Store" ile yazılır (sıkıştırma seviyesi RAR'da etkisiz; ZIP'te çalışır). Parola, bölünmüş (volume) arşiv, SFX, recovery record, Repair, Benchmark, Favorites, Report kullanılamaz. Başlat menüsündeki WinRAR satırları sanal olduğu için yalnızca WinRAR'ı açar.

### Genel sistem iyileştirmeleri
- **System Properties alt diyalogları** (Windows 2000 SP4 ISO'daki `sysdm.cpl` şablonlarından): Performance Options, Virtual Memory, Environment Variables (terminal `%VAR%` genişletmesine bağlı), Startup and Recovery, Hardware Profiles, User Profiles (Change Type / Copy To).
- **Disk Cleanup** (`cleanmgr.exe` şablonları): hesaplama → liste (Temporary files, Recycle Bin, ...) → onay → temizlik; More Options sekmesi. Start → System Tools ve sürücü Properties → "Disk Cleanup..." ile açılır.
- **Properties sayfaları** (`shell32.dll` şablonları 1041/1044/1080/1081/1054): dosya, klasör ve sürücü özellikleri; yeniden adlandırma, Read-only/Hidden/Archive öznitelikleri (`fs.setAttrs`), klasör boyutu/içeriği, sürücü Capacity pastası, Tools sekmesi.
- **Sağ tık menüleri**: pencere başlığı ve görev çubuğu düğmesi (sistem menüsü), görev çubuğu, Start düğmesi (Open/Explore/Find/All Users), Start ana satırları (Programs/Documents/Settings → Open/Explore/Find).
- **Explorer**: Details görünümü sütunları sürükleyerek yeniden boyutlanır (başlık kenarı, çift tık = otomatik), boyut "KB", tür adları ve tarih+saat; çoklu seçim kutusu (rubber band, Ctrl ile ekleme); sürükle-bırak kopyalama/taşıma (Ctrl = kopya) doğrulandı.
- **Network Connection Wizard** (`netshell.dll`) ve **Internet Connection Wizard** (`icwconn1.exe`): sayfa yerleşimleri ve metinleri ISO'dan. "Network and Dial-up Connections" klasörü (Make New Connection, Local Area Connection, kullanıcı bağlantıları); Internet Options → Connections → Setup ve Getting Started → Connect to the Internet ICW'yi açar.
- **About Windows / winver**: `shell32.dll` ShellAbout şablonu ve ISO'daki Windows 2000 afişi.
- Sınırlar: dial-up bağlantıları gerçekten arama yapmaz (modem yok); NCW'de telefon numarası/VPN/gelen bağlantı ara sayfaları yok; ICW'de "sign up/transfer" yolu yalnızca Dialing information sayfasına gider; sayfa başlık/alt başlık metinlerinden bazıları (ICW "Setting up your Internet connection") ISO'da bulunamadı, tahmin edildi; Disk Cleanup işleyici açıklamaları (Recycle Bin hariç) bilinen metinlerdir; salt-okunur öznitelik yazmayı engellemez.

### Netscape / Internet Explorer: yerleşik sayfalar
- News Reader'dan Hacker News ve YouTube kaldırıldı. Kaynaklar BBC News ve BBC Türkçe RSS (önbellek kırıcı istek, 3 kademeli yedek, tarihe göre sıralı, 5 dakikada bir yenilenir).
- **Günün Ayeti, Hadisi ve Esması** (`about:daily`): 99 Esmaü'l-Hüsnâ (Arapça ad, okunuş, anlam), 49 ayet, 46 hadis; gün sırasına göre seçilir, önceki/sonraki gün ve tam listeler (`?all=esma|ayet|hadis`). Ayet ve hadis metinleri bu projede yazılmış kısa Türkçe anlatımlardır (resmî meal değildir); kaynaklar `dini-data.js` içinde.
- **Tarihte Bugün** (`about:today`): Vikipedi "On this day" REST API'sinden (Türkçe/İngilizce); Netscape ve IE ana sayfalarında kısa kutu olarak da gösterilir.
- Aynı sayfalar (Google, News, Günün Ayeti/Hadisi/Esması, Tarihte Bugün) artık Internet Explorer'da da çalışır (`about:` adresleri ve ana sayfa).
- Sınırlar: canlı sayfalar internet ve Vikipedi ve BBC erişimi gerektirir.

### Outlook Express: günlük postalar, sıralama, adres
- Outlook Express her gün ilk açılışta iki ayrı posta alır: "Günün Ayeti, Hadisi ve Esması" ve "Tarihte Bugün" (Vikipedi'ye ulaşılamazsa kısa not).
- Posta listesi en yeni üstte; From, Subject ve Received başlıklarına tıklayınca sıralama (yön oku ile) değişir.
- Postaya tek tıklayınca okundu olur. "To" adresi bilgisayar adından gelir: `<bilgisayar adı>@hotmail.com` (eski postalar da güncellenir).

## Netscape/IE haber hızı, MSN durum güncellemeleri, VLC kanal listesi
- **Haber sayfaları:** BBC News/BBC Türkçe artık üst pencerede, üç kaynaktan (doğrudan RSS, allorigins, rss2json) aynı anda istenir; ilk gelen kullanılır, her biri 6 sn ile sınırlıdır. Sonuç localStorage'a kaydedilir (3 dk taze), tarayıcı açılırken arka planda önceden yüklenir; "Refresh" bağlantısı zorla yeniler. Ağ yoksa son önbellek gösterilir.
- **Netscape:** adres çubuğu varsayılan `www.netscape.com/home`; New&Cool kaldırıldı.
- **MSN Messenger:** simge durumuna küçülünce görev çubuğu yerine bildirim alanında (tray) simge olarak durur (tıkla: geri aç, sağ tık: menü). Kişilerin yanında özlü söz/dinlediği müzik durumu görünür ve zamanla değişir. "Diyanet Kütüphanesi" kişisi ayet, hadis, esma gönderir (anahtar kelimelerle: ayet/hadis/esma).
- **VLC:** altyazılar artık oynatma başlamadan yüklenir (eski sürümde oynatma tamamlanana dek yüklenmediği için görünmüyordu); araç çubuğunda Altyazı ve Kanal Listesi düğmeleri. `.m3u/.m3u8/.pls` ayrıştırma: `#EXTINF` başlıkları, `group-title`, `tvg-logo`. Kanal Listesi penceresi (grup süzgeci + arama), adresten kanal listesi açma, `.m3u8` (HLS) canlı yayınlar hls.js ile (yerel kopya `assets/vendor/hlsjs`, Safari'de yerel). Sınırlar: yayının CORS izni gerekir; adresten liste çekme de sunucunun CORS iznine bağlıdır; örnek `Televizyon.m3u` adresleri üçüncü tarafın canlı yayınlarıdır, kullanılabilirlikleri garanti değildir.

## VLC/WMP ortak geliştirmeler, Add/Remove Programs, Program Files
- **VLC:** açılışta video ekranı ve ortada koni logosu görünür (WMP/DivX gibi); durdurunca pencere küçülmez. Media > Open Network Stream ve Kanal Listesi penceresindeki adres kutusuna `.m3u`/`.m3u8` adresi yapıştırılınca liste çekilir ve Kanal Listesi otomatik açılır. Adres tek bir HLS yayınıysa (`#EXT-X-…`) doğrudan oynatılır. Listeyi çekerken sunucu CORS vermezse genel bir CORS aktarıcısı (allorigins) denenir.
- **Windows Media Player:** VLC ile aynı: altyazı (SRT/VTT, yan dosyadan otomatik, View > Captions ve CC düğmesi), File > Open'a adres veya `.m3u/.m3u8/.pls` yazma, Open Channel List/Open Playlist, TV düğmesi ve kanal listesi penceresi, HLS yayınlar (hls.js). Ayrıca örnek `.webm/.mp4` dosyaları artık blob üzerinden oynatılıyor (eskiden octet-stream data URL'si nedeniyle çalışmıyordu).
- **Add/Remove Programs:** yalnızca bu masaüstünde gerçekten bulunan programlar listelenir (Acrobat Reader, DivX, Java, IE 6, Word 2000, MSN Messenger, Netscape, VLC, Winamp, WinRAR). Change/Remove onay sorar ve "kaldırıldı" der, ama hiçbir şey silinmez (simülasyon notu görünür).
- **Program Files:** Winamp, VideoLAN\VLC, DivX, Netscape, WinRAR, Adobe, Microsoft Office, MSN Messenger, Windows Media Player, Outlook Express, Internet Explorer, Accessories klasörleri küçük yer tutucu dosyalarla oluşturulur (ilk açılışta, mevcut disklere de eklenir). Klasördeki `.exe` dosyaları (vlc.exe, winamp.exe, WINWORD.EXE…) ilgili yerleşik programı açar; gerçek ikili değildirler.

## Hız ve altyapı, yüklemeler
- **Tembel yükleme:** programlar (Word, WinRAR, VLC, WMP, MSN, Netscape, Paint, Control Panel diyalogları vb.) ilk açıldıklarında yüklenir; açılışta yalnızca kabuk, Explorer ve pencere sistemi gelir (114 → 22 JS dosyası, ~1,7 MB → ~0,36 MB, yerelde açılış 2,3 sn → 1,5 sn). Masaüstü hazır olduktan 3 sn sonra modüller boştayken sırayla arka planda ısıtılır (veri tasarrufu açıksa yapılmaz), böylece ilk açılışta bekleme olmaz.
- **Servis çalışanı:** yalnızca `/`, `main.js`, `desktop.css` önbelleğe alınır; ~1.500 ikonu ön indirme kaldırıldı, ikonlar ve modüller ilk kullanımda önbelleğe girer.
- **Büyük dosyalar:** Yardım (5,7 MB), pdf.js, Webamp, WinRAR ve hls.js yalnızca ilgili program açılınca yüklenir. 1.467 PNG kayıpsız sıkıştırıldı (≈2,0 MB → 1,2 MB).
- **Yüklemeler:** dışarıdan alınan tüm dosyalar (Import Files, WMP/Imaging içe aktarma, masaüstüne bırakma) `Desktop\Docs` klasörüne kaydedilir.
- **Program Files:** artık sistem klasörü uyarı sayfası yerine dosyalar doğrudan görünür.
- **VLC logosu:** koni logosu orijinal VLC koni logosuna benzer şekilde yeniden çizildi (orijinal büyük dosya sandbox'tan alınamadığı için SVG çizimidir).
- **WMP:** doğrudan URL akışları Web Audio grafiğinden geçirilmez (çapraz kaynaklı akışta ses sessiz kalıyordu).
