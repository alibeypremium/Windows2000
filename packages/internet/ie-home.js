// Internet Explorer start page, in the style of a 2000-era web portal: search, Turkish and global sites with icons,
// "verse / hadith / name of the day" and "this day in history" panels (fixed height, no inner scrolling) and the year-by-year web.
import { el, button, icon } from "../ui/index.js";
import { dailyPick } from "./netscape-sites.js";
import { YEAR_FACTS } from "./ie-years.js";

// [name, host, background, text colour(s), wordmark, style]. Style flags: i italic, s serif, l lowercase-looking wide font.
// These are redrawn wordmarks in each site's well-known colours (no network, no original bitmaps).
export const SITES_TR = [
  ["Hürriyet", "hurriyet.com.tr", "#fff", "#c8102e", "hürriyet", "bi"], ["Milliyet", "milliyet.com.tr", "#fff", "#0b3c8c", "Milliyet", "bs"], ["Sabah", "sabah.com.tr", "#e07b00", "#fff", "SABAH", "b"], ["Radikal", "radikal.com.tr", "#fff", "#b01c1c", "radikal", "b"],
  ["Cumhuriyet", "cumhuriyet.com.tr", "#fff", "#a4161a", "Cumhuriyet", "bs"], ["NTV", "ntvmsnbc.com", "#003b73", "#fff", "NTV", "b"], ["TRT", "trt.net.tr", "#d2232a", "#fff", "TRT", "b"], ["Mynet", "mynet.com", "#ff6a00", "#fff", "mynet", "b"],
  ["Superonline", "superonline.com", "#fff", "#1b5fc1", "superonline", "bi"], ["TTNET", "turk.net", "#0a4da2", "#fff", "TTNET", "b"], ["Fenerbahçe", "fenerbahce.org", "#13286b", "#ffd700", "FENERBAHÇE", "b"], ["Galatasaray", "galatasaray.org", "#d4112f", "#ffcc00", "GALATASARAY", "b"],
  ["Beşiktaş", "bjk.com.tr", "#111", "#fff", "BEŞİKTAŞ", "b"], ["Boğaziçi Ü.", "boun.edu.tr", "#00467f", "#fff", "BOĞAZİÇİ", "b"], ["ODTÜ", "metu.edu.tr", "#8c1c13", "#fff", "ODTÜ", "b"], ["İTÜ", "itu.edu.tr", "#1d4e9e", "#fff", "İTÜ", "b"],
];
export const SITES_GLOBAL = [
  ["Yahoo!", "yahoo.com", "#fff", "#e60000", "Yahoo!", "bs"], ["MSN", "msn.com", "#fff", ["#1a6fd1", "#1a6fd1", "#1a6fd1"], "msn", "b"], ["Google", "google.com", "#fff", ["#3b78e7", "#dc2f1c", "#f9b300", "#3b78e7", "#2fa12f", "#dc2f1c"], "Google", "bs"], ["AltaVista", "altavista.com", "#fff", "#0e5fa8", "AltaVista", "bi"],
  ["Netscape", "netscape.com", "#fff", "#1c7c54", "Netscape", "b"], ["Microsoft", "microsoft.com", "#fff", "#333", "Microsoft", "bi"], ["AOL", "aol.com", "#222d6b", "#fff", "AOL", "b"], ["Lycos", "lycos.com", "#fff", "#0b7a4f", "LYCOS", "b"],
  ["Excite", "excite.com", "#fff", "#e4572e", "excite", "b"], ["GeoCities", "geocities.com", "#fff", "#d42a2a", "GeoCities", "b"], ["Amazon", "amazon.com", "#fff", "#111", "amazon.com", "b"], ["eBay", "ebay.com", "#fff", ["#e53238", "#0064d2", "#f5af02", "#86b817"], "ebay", "b"],
  ["CNN", "cnn.com", "#cc0000", "#fff", "CNN", "b"], ["BBC", "bbc.co.uk", "#111", "#fff", "BBC", "b"], ["Apple", "apple.com", "#fff", "#666", "Apple", "b"], ["Winamp", "winamp.com", "#111", "#e6a100", "WINAMP", "b"],
];

const logoCache = new Map();
/** 84x34 site logo: the site's wordmark redrawn in its colours. */
export function siteLogo(bg, fg, text, st = "b") {
  const k = [bg, fg, text, st].join("|");
  if (logoCache.has(k)) return logoCache.get(k);
  const fam = st.includes("s") ? "Georgia,'Times New Roman',serif" : "Arial,Helvetica,sans-serif";
  const size = Math.max(9, Math.min(20, Math.floor(76 / (text.length * (st.includes("s") ? 0.62 : 0.66)))));
  const esc = (c) => c.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = Array.isArray(fg) ? `<text x="42" y="22" text-anchor="middle" font-family="${fam}" font-weight="bold" font-size="${size}" ${st.includes("i") ? 'font-style="italic"' : ""}>${[...text].map((c, i) => `<tspan fill="${fg[i % fg.length]}">${esc(c)}</tspan>`).join("")}</text>`
    : `<text x="42" y="22" text-anchor="middle" font-family="${fam}" font-weight="bold" font-size="${size}" fill="${fg}" ${st.includes("i") ? 'font-style="italic"' : ""}>${esc(text)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="34" viewBox="0 0 84 34"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs><rect x=".5" y=".5" width="83" height="33" rx="3" fill="${bg}" stroke="#7f9db9"/><rect x=".5" y=".5" width="83" height="33" rx="3" fill="url(#g)"/>${body}</svg>`;
  const u = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  logoCache.set(k, u);
  return u;
}

const histCache = new Map(), histPending = new Map();
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

  const tile = ([n, host, bg, fg, txt, st]) => button(el("img", { src: siteLogo(bg, fg, txt, st), alt: n, draggable: "false", width: 84, height: 34 }), () => go(host), { class: "ih-tile", title: n + " — www." + host });
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
  const list = el("ul", { class: "ih-hist" });
  const mm = String(now.getMonth() + 1).padStart(2, "0"), dd = String(now.getDate()).padStart(2, "0");
  const key = L + mm + dd;
  const fill = (ev) => list.replaceChildren(...(ev.length ? ev.map((e) => {
    const page = e.pages?.[0]?.content_urls?.desktop?.page;
    return el("li", {}, el("b", { text: e.year + " — " }), page ? el("a", { href: page, target: "_blank", rel: "noopener noreferrer", text: e.text }) : el("span", { text: e.text }));
  }) : [el("li", { text: tr ? "Bugün için kayıt bulunamadı." : "Nothing found for today." })]));
  // The list is cached for the session, so changing the archive year redraws the page without reloading it.
  if (histCache.has(key)) fill(histCache.get(key));
  else {
    list.append(el("li", { text: tr ? "Vikipedi'den yükleniyor..." : "Loading from Wikipedia..." }));
    (histPending.get(key) || histPending.set(key, fetch(`https://${L}.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`).then((r) => r.json()).then((j) => (j.events || []).slice(0, 5)).catch(() => null)).get(key))
      .then((ev) => { histPending.delete(key); if (ev) histCache.set(key, ev); if (list.isConnected || !ev) fill(ev || []); if (!ev) list.replaceChildren(el("li", { text: tr ? "Vikipedi'ye ulaşılamadı." : "Wikipedia could not be reached." })); });
  }
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
      el("div", { class: "ih-brand" }, icon(env.brand?.icon || "ie", 32), el("div", {}, el("h1", { text: env.brand?.title || (tr ? "Internet Explorer Başlangıç Sayfası" : "Internet Explorer Start Page") }), el("p", { text: tr ? "Dünyaya açılan pencereniz" : "Your window to the world" }))),
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
      env.noOptions ? null : button(tr ? "Internet Seçenekleri..." : "Internet Options...", () => ctx.launch("control", { page: "internet" }))));
}
