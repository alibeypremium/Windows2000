import { CORE } from "./core.js";
import { APPS1 } from "./apps1.js";
import { APPS2 } from "./apps2.js";
import { MORE } from "./more.js";
import { MORE1 } from "./more1.js";
import { MORE2 } from "./more2.js";
import { MORE3 } from "./more3.js";
import { MORE4 } from "./more4.js";
export const DICT = new Map(Object.entries({ ...CORE, ...APPS1, ...APPS2, ...MORE, ...MORE1, ...MORE2, ...MORE3, ...MORE4 }));
const fmt = (s) => s;
/** Pattern rules for strings that contain numbers/names: [RegExp, (…groups) => Turkish]. */
export const RULES = [
  [/^(\d+) object\(s\)$/, (n) => `${n} nesne`],
  [/^(\d+) event\(s\)$/, (n) => `${n} olay`],
  [/^(\d+) items?$/, (n) => `${n} öğe`],
  [/^(\d+) files?$/, (n) => `${n} dosya`],
  [/^(\d+) folders?$/, (n) => `${n} klasör`],
  [/^(\d+) channels?$/, (n) => `${n} kanal`],
  [/^(\d+) channels? loaded$/, (n) => `${n} kanal yüklendi`],
  [/^(\d+) message\(s\), (\d+) unread$/, (a, b) => `${a} ileti, ${b} okunmamış`],
  [/^(\d+) new message\(s\)$/, (n) => `${n} yeni ileti`],
  [/^(\d+) unread$/, (n) => `${n} okunmamış`],
  [/^Total (\d+) folders? and ([\d,.]+) bytes in (\d+) files?$/, (a, b, c) => `Toplam ${a} klasör ve ${c} dosyada ${b} bayt`],
  [/^([\d,.]+) bytes$/, (n) => `${n} bayt`],
  [/^([\d.,]+ ?(?:KB|MB|GB|bytes)) free$/, (n) => `${n.replace("bytes", "bayt")} boş`],
  [/^(.+) - Notepad$/, (n) => `${n} - Not Defteri`],
  [/^(.+) - WordPad$/, (n) => `${n} - WordPad`],
  [/^(.+) - Paint$/, (n) => `${n} - Paint`],
  [/^(.+) - Microsoft Word$/, (n) => `${n} - Microsoft Word`],
  [/^(.+) - Windows Media Player$/, (n) => `${n} - Windows Media Player`],
  [/^(.+) - Microsoft Internet Explorer$/, (n) => `${n} - Microsoft Internet Explorer`],
  [/^Untitled - (.+)$/, (n) => `Adsız - ${n}`],
  [/^(.+) Properties$/, (n) => `${n} Özellikleri`],
  [/^About (.+)$/, (n) => `${n} Hakkında`],
  [/^(.+) Help$/, (n) => `${n} Yardımı`],
  [/^Shortcut to (.+)$/, (n) => `${n} Kısayolu`],
  [/^Error: (.+)$/, (n) => `Hata: ${n}`],
  [/^Page (\d+) of (\d+)$/, (a, b) => `Sayfa ${a} / ${b}`],
  [/^(.+) \((\w):\)$/, (n, d) => ({ "Local Disk": "Yerel Disk", "Floppy": "Disket", "CD-ROM": "CD-ROM", "Compact Disc": "Compact Disc" }[n] ? `${({ "Local Disk": "Yerel Disk", "Floppy": "Disket", "CD-ROM": "CD-ROM", "Compact Disc": "Compact Disc" })[n]} (${d}:)` : null)],
  [/^Score: (\d+)$/, (n) => `Puan: ${n}`],
  [/^Time: (\d+)$/, (n) => `Süre: ${n}`],
  [/^Cards Left: (\d+)$/, (n) => `Kalan Kart: ${n}`],
  [/^Processes: (\d+)$/, (n) => `İşlemler: ${n}`],
  [/^(\d+) by (\d+) pixels$/, (a, b) => `${a} x ${b} piksel`],
];
