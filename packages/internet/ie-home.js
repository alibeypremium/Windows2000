// Internet Explorer start page, in the style of a 2000-era web portal: search, Turkish and global sites with icons,
// "verse / hadith / name of the day" and "this day in history" panels (fixed height, no inner scrolling) and the year-by-year web.
import { el, button, icon } from "../ui/index.js";
import { dailyPick } from "./netscape-sites.js";
import { YEAR_FACTS } from "./ie-years.js";

// [name, host, colour, letters]
export const SITES_TR = [
  ["Hürriyet", "hurriyet.com.tr", "#c8102e", "H"], ["Milliyet", "milliyet.com.tr", "#0b3c8c", "M"], ["Sabah", "sabah.com.tr", "#e07b00", "S"], ["Radikal", "radikal.com.tr", "#7a1f1f", "R"],
  ["Cumhuriyet", "cumhuriyet.com.tr", "#a4161a", "C"], ["NTV", "ntvmsnbc.com", "#003b73", "N"], ["TRT", "trt.net.tr", "#d2232a", "T"], ["Mynet", "mynet.com", "#ff6a00", "my"],
  ["Superonline", "superonline.com", "#1b5fc1", "S!"], ["TTNET", "turk.net", "#0a4da2", "TT"], ["Fenerbahçe", "fenerbahce.org", "#13286b", "F"], ["Galatasaray", "galatasaray.org", "#d4112f", "G"],
  ["Beşiktaş", "bjk.com.tr", "#222222", "B"], ["Boğaziçi Ü.", "boun.edu.tr", "#00467f", "Bü"], ["ODTÜ", "metu.edu.tr", "#8c1c13", "O"], ["İTÜ", "itu.edu.tr", "#1d4e9e", "İ"],
];
export const SITES_GLOBAL = [
  ["Yahoo!", "yahoo.com", "#720e9e", "Y!"], ["MSN", "msn.com", "#1a6fd1", "M"], ["Google", "google.com", "#3b78e7", "G"], ["AltaVista", "altavista.com", "#1d6fa5", "A"],
  ["Netscape", "netscape.com", "#0f7d4b", "N"], ["Microsoft", "microsoft.com", "#2b7bd6", "MS"], ["AOL", "aol.com", "#222d6b", "A"], ["Lycos", "lycos.com", "#0b7a4f", "L"],
  ["Excite", "excite.com", "#e4572e", "E"], ["GeoCities", "geocities.com", "#d42a2a", "Ge"], ["Amazon", "amazon.com", "#ff9900", "a"], ["eBay", "ebay.com", "#e43137", "e"],
  ["CNN", "cnn.com", "#cc0000", "CNN"], ["BBC", "bbc.co.uk", "#bb1919", "BBC"], ["Apple", "apple.com", "#666666", "A"], ["Winamp", "winamp.com", "#e6a100", "W"],
];

const tileCache = new Map();
/** A little 32x32 "site icon": bevelled coloured tile with the site's initials (no network, no logos). */
export function siteIcon(color, text) {
  const k = color + text;
  if (tileCache.has(k)) return tileCache.get(k);
  const fs = text.length > 2 ? 10 : text.length > 1 ? 15 : 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs><rect x="1.5" y="1.5" width="29" height="29" rx="5" fill="${color}" stroke="#000" stroke-opacity=".45"/><rect x="1.5" y="1.5" width="29" height="29" rx="5" fill="url(#g)"/><text x="16" y="${text.length > 2 ? 20 : 22.5}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${fs}" fill="#fff" stroke="#000" stroke-opacity=".35" stroke-width=".4">${text.replace(/&/g, "&amp;")}</text></svg>`;
  const u = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  tileCache.set(k, u);
  return u;
}

const MONTHS = { tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
const DAYS = { tr: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };

export function buildHome(env) {
  const { ctx, navigate, tr, year, setYear, years, favorites, openFav, favLabel } = env;
  const L = tr ? "tr" : "en", now = new Date();
  const go = (host) => navigate("http://www." + host + "/");
  const search = el("input", { "aria-label": tr ? "Web'de ara" : "Search the Web", placeholder: tr ? "Bir sözcük veya tümce yazın" : "Type a word or phrase" });
  const doSearch = () => search.value.trim() && navigate(search.value.trim());
  search.addEventListener("keydown", (e) => e.key === "Enter" && doSearch());
  const yearSel = el("select", { "aria-label": tr ? "Arşiv yılı" : "Archive year" }, ...years.map((y) => el("option", { value: y, text: y, selected: y === year })));
  yearSel.addEventListener("change", () => setYear(yearSel.value));

  const tile = ([n, host, color, txt]) => button([el("img", { src: siteIcon(color, txt), alt: "", draggable: "false", width: 32, height: 32 }), el("span", { text: n })], () => go(host), { class: "ih-tile", title: "www." + host });
  const box = (title, sub, items, cls = "") => el("section", { class: "ih-box " + cls }, el("h2", {}, el("span", { text: title }), sub ? el("small", { text: sub }) : null), el("div", { class: "ih-grid" }, ...items.map(tile)));

  // verse / hadith / name of the day (static text, clamped so the panel never scrolls)
  const p = dailyPick(0);
  const dayPanel = el("section", { class: "ih-panel" },
    el("h2", { text: tr ? "Günün Ayeti, Hadisi ve Esması" : "Verse, Hadith and Name of the Day" }),
    el("div", { class: "ih-panel-body" },
      el("div", { class: "ih-ar", text: p.esma[0] }),
      el("div", { class: "ih-esma" }, el("b", { text: p.esma[1] }), " — " + p.esma[2]),
      el("hr"),
      el("p", { class: "ih-clamp" }, el("b", { text: tr ? "Ayet: " : "Verse: " }), p.ayet[1], el("em", { text: " (" + p.ayet[0] + ")" })),
      el("p", { class: "ih-clamp" }, el("b", { text: tr ? "Hadis: " : "Hadith: " }), p.hadis[0], el("em", { text: " (" + p.hadis[1] + ")" }))),
    el("div", { class: "ih-panel-foot" }, button(tr ? "Devamı »" : "More »", () => navigate("about:daily"), { class: "text-link" })));

  // this day in history (Wikipedia "On this day"; fixed height, five items at most)
  const list = el("ul", { class: "ih-hist" }, el("li", { text: tr ? "Vikipedi'den yükleniyor..." : "Loading from Wikipedia..." }));
  const mm = String(now.getMonth() + 1).padStart(2, "0"), dd = String(now.getDate()).padStart(2, "0");
  fetch(`https://${L}.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`).then((r) => r.json()).then((j) => {
    const ev = (j.events || []).slice(0, 5);
    list.replaceChildren(...(ev.length ? ev.map((e) => {
      const page = e.pages?.[0]?.content_urls?.desktop?.page;
      return el("li", {}, el("b", { text: e.year + " — " }), page ? el("a", { href: page, target: "_blank", rel: "noopener noreferrer", text: e.text }) : el("span", { text: e.text }));
    }) : [el("li", { text: tr ? "Bugün için kayıt bulunamadı." : "Nothing found for today." })]));
  }).catch(() => list.replaceChildren(el("li", { text: tr ? "Vikipedi'ye ulaşılamadı." : "Wikipedia could not be reached." })));
  const histPanel = el("section", { class: "ih-panel" },
    el("h2", { text: tr ? "Tarihte Bugün" : "This Day in History" }),
    el("div", { class: "ih-panel-body" }, list),
    el("div", { class: "ih-panel-foot" }, button(tr ? "Tamamı »" : "More »", () => navigate("about:today"), { class: "text-link" })));

  // the web, year by year
  const facts = YEAR_FACTS[year] || [];
  const yearBox = el("section", { class: "ih-box ih-year" },
    el("h2", {}, el("span", { text: tr ? `${year}'de İnternet` : `The web in ${year}` }), el("small", { text: tr ? "arşiv yılı" : "archive year" })),
    el("div", { class: "ih-chips" }, ...years.map((y) => button(y, () => setYear(y), { class: "ih-chip" + (y === year ? " on" : "") }))),
    el("ul", { class: "ih-facts" }, ...facts.map((f) => el("li", { text: tr ? f[0] : f[1] }))));

  const favs = favorites();
  return el("article", { class: "ih" },
    el("header", { class: "ih-top" },
      el("div", { class: "ih-brand" }, icon("ie", 32), el("div", {}, el("h1", { text: tr ? "Internet Explorer Başlangıç Sayfası" : "Internet Explorer Start Page" }), el("p", { text: tr ? "Dünyaya açılan pencereniz" : "Your window to the world" }))),
      el("div", { class: "ih-date" }, el("b", { text: `${now.getDate()} ${MONTHS[L][now.getMonth()]} ${now.getFullYear()}` }), el("span", { text: DAYS[L][now.getDay()] }))),
    el("div", { class: "ih-search" },
      el("label", { text: tr ? "Web'de Ara:" : "Search the Web:" }), search, button(tr ? "Ara" : "Search", doSearch, { class: "default-button" }),
      el("span", { class: "ih-sep" }), el("label", { text: tr ? "Arşiv yılı:" : "Archive year:" }), yearSel),
    el("nav", { class: "ih-nav" },
      ...[[tr ? "Türkiye" : "Turkey", "#ih-tr"], [tr ? "Dünya" : "World", "#ih-gl"], [tr ? "Günün Bilgileri" : "Today", "#ih-today"], [tr ? "İnternet Tarihi" : "Web History", "#ih-year"]].map(([t, h]) => el("a", { href: h, onclick: (e) => { e.preventDefault(); document.querySelector(".ih " + h)?.scrollIntoView({ block: "start" }); }, text: t })),
      el("span", { class: "ih-grow" }),
      button(tr ? "Sık Kullanılanlar" : "Favorites", () => navigate("about:favorites"), { class: "text-link" }), button(tr ? "Geçmiş" : "History", () => navigate("about:history"), { class: "text-link" }), button(tr ? "Yardım" : "Help", () => ctx.launch("help", { topic: "internet" }), { class: "text-link" })),
    el("div", { class: "ih-cols" },
      Object.assign(box(tr ? "Türkiye'den Siteler" : "Sites from Turkey", tr ? "Haber · Portal · Spor · Üniversite" : "News · Portals · Sport · Universities", SITES_TR), { id: "ih-tr" }),
      Object.assign(box(tr ? "Dünyadan Siteler" : "Sites from the World", tr ? "Arama · Portal · Alışveriş · Haber" : "Search · Portals · Shopping · News", SITES_GLOBAL), { id: "ih-gl" })),
    el("div", { class: "ih-cols", id: "ih-today" }, dayPanel, histPanel),
    Object.assign(yearBox, { id: "ih-year" }),
    favs.length ? el("section", { class: "ih-box ih-favs" }, el("h2", { text: tr ? "Sık Kullanılanlarınız" : "Your Favorites" }), el("div", { class: "ih-favlist" }, ...favs.slice(0, 12).map((f) => button([icon("ie"), favLabel(f)], () => openFav(f), { class: "text-link" })))) : null,
    el("footer", { class: "ih-foot" },
      el("span", { text: tr ? "Siteler Wayback Machine'den, seçili yılın görünümüyle açılır." : "Sites open from the Wayback Machine as they looked in the chosen year." }),
      button(tr ? "Internet Seçenekleri..." : "Internet Options...", () => ctx.launch("control", { page: "internet" }))));
}
