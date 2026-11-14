import { CORE } from "./core.js";
import { APPS1 } from "./apps1.js";
import { APPS2 } from "./apps2.js";
import { MORE } from "./more.js";
import { MORE1 } from "./more1.js";
import { MORE2 } from "./more2.js";
import { MORE3 } from "./more3.js";
import { MORE4 } from "./more4.js";
import { MORE5 } from "./more5.js";
import { MORE6 } from "./more6.js";
import { MORE7 } from "./more7.js";
import { MORE8 } from "./more8.js";
import { MORE9 } from "./more9.js";
import { MORE10 } from "./more10.js";
import { MORE11, RULES11 } from "./more11.js";
import { MORE12, RULES12 } from "./more12.js";
const nk = (k) => k.replace(/&(?=[A-Za-z0-9])/g, "").trim();
export const DICT = new Map(Object.entries({ ...CORE, ...APPS1, ...APPS2, ...MORE, ...MORE1, ...MORE2, ...MORE3, ...MORE4, ...MORE5, ...MORE6, ...MORE7, ...MORE8, ...MORE9, ...MORE10, ...MORE11, ...MORE12 }).map(([k, v]) => [nk(k), typeof v === "string" ? v.replace(/&(?=[\p{L}\d])/gu, "") : v]));
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
  [/^(.+) \((\w):\)$/, (n, d) => ({ "Local Disk": "Yerel Disk", "Floppy": "Disket", "CD-ROM": "CD-ROM", "Compact Disc": "Kompakt Disk" }[n] ? `${({ "Local Disk": "Yerel Disk", "Floppy": "Disket", "CD-ROM": "CD-ROM", "Compact Disc": "Kompakt Disk" })[n]} (${d}:)` : null)],
  [/^Score: (\d+)$/, (n) => `Puan: ${n}`],
  [/^Time: (\d+)$/, (n) => `Süre: ${n}`],
  [/^Cards Left: (\d+)$/, (n) => `Kalan Kart: ${n}`],
  [/^Processes: (\d+)$/, (n) => `İşlemler: ${n}`],
  [/^(\d+) by (\d+) pixels$/, (a, b) => `${a} x ${b} piksel`],
];

RULES.push(...RULES11, ...RULES12);
