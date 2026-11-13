import {
  el,
  button,
  icon,
  toolbar,
  statusBar,
  separator,
  field,
  popup, browserFrame } from "../ui/index.js";
import { basename, downloadFile } from "../core/index.js";
import { buildSite, isSite, prefetchNews, homeBoxes } from "./netscape-sites.js";
import { getLang } from "../ui/i18n.js";
import { YEAR_FACTS, YEAR_SITES, YEAR_TR_SITES } from "./ie-years.js";
import { openDlgWindow } from "../accessories/winrar-dlg.js";
import { ieOpen, ieOptions, ieAddFavorite, ieProps, ieOrganize, iePageSetup, iePrint, IE_HELP } from "./ie-dialogs.js";
const normalizeAddress = (input) => {
  let target = String(input || "about:home").trim();
  if (!/^(about:|https?:\/\/|[A-Z]:[\\/])/i.test(target))
    target =
      target.includes(".") && !target.includes(" ")
        ? "https://" + target
        : "http://auto.search.msn.com/response.asp?MT=" +
          encodeURIComponent(target) +
          "&srch=3&prov=&utf8";
  if (/^https?:/i.test(target)) target = new URL(target).href;
  if (
    /^about:/i.test(target) &&
    !isSite(target) &&
    ![
      "about:home",
      "about:welcome",
      "about:blank",
      "about:favorites",
      "about:history",
    ].includes(target)
  )
    throw new Error("This built-in page does not exist.");
  return target;
};
const YEAR_RANGE = Array.from({ length: 14 }, (_, i) => String(1996 + i));
const PORTALS = {
  tr: [["Hürriyet", "hurriyet.com.tr"], ["Milliyet", "milliyet.com.tr"], ["Mynet", "mynet.com"], ["Superonline", "superonline.com"], ["Sabah", "sabah.com.tr"], ["Turk.net", "turk.net"], ["Netscape", "netscape.com"], ["Yahoo!", "yahoo.com"]],
  en: [["Yahoo!", "yahoo.com"], ["MSN", "msn.com"], ["AltaVista", "altavista.com"], ["Lycos", "lycos.com"], ["Excite", "excite.com"], ["GeoCities", "geocities.com"], ["Netscape", "netscape.com"], ["CNN", "cnn.com"], ["Microsoft", "microsoft.com"], ["Apple", "apple.com"]],
};
let rufflePromise = null;
const loadRuffle = () => rufflePromise || (rufflePromise = new Promise((ok, no) => {
  const base = new URL("../../assets/vendor/ruffle/", import.meta.url).href;
  window.RufflePlayer = { config: { publicPath: base, polyfills: false, warnOnUnsupportedContent: false } };
  const sc = document.createElement("script");
  sc.src = base + "ruffle.js"; sc.onload = () => ok(); sc.onerror = () => { rufflePromise = null; no(); };
  document.head.append(sc);
}));
export function openInternetExplorer(ctx, { url = null, path = null, year = null, stamp = "" } = {}) {
  const initial = normalizeAddress(path || url || ctx.settings.get("homePage"));
  prefetchNews();
  const w = ctx.wm.create({
    title: "Microsoft Internet Explorer",
    icon: "ie",
    ...browserFrame(),
    appId: "ie",
  });
  let current = initial,
    history = [current],
    index = 0,
    loading = false;
  const address = el("input", { value: current, "aria-label": "Address" }),
    viewport = el("div", { class: "ie-viewport" }),
    status = el(
      "div",
      { class: "ie-status" },
      el("div", { class: "ie-pane ie-pane-done", text: "Done" }),
      el("div", { class: "ie-pane ie-pane-zone", text: "Internet" }),
      el("div", { class: "ie-pane ie-pane-prog", hidden: true }, el("div", { class: "ie-prog-bar" })),
      el("div", { class: "ie-pane ie-pane-blank" }),
      el("div", { class: "ie-pane ie-pane-snap", title: "Previous Snapshot", text: "◄", onclick: () => snapStep(-1) }),
      el("div", { class: "ie-pane ie-pane-snap", title: "Next Snapshot", text: "►", onclick: () => snapStep(1) }),
      el("div", { class: "ie-pane ie-pane-date", title: "Archive date" }),
      el("div", { class: "ie-pane ie-pane-wb", text: "Wayback Machine" }),
      el("span", { class: "status-grip" }),
    );

  // ---- Wayback Machine (the web of 2000) ----
  const WB = "https://web.archive.org/web/";
  const WB_RE = /web\.archive\.org\/web\/(\d+)[a-z_]*\/(https?:\/\/.+)$/i;
  let wbYear = String(year || ctx.settings.get("ieYear") || "2000"), wbStamp = String(stamp || ""), wbFrame = null, progTimer = 0, loadTimer = 0, wbYears = null;
  const wbOn = (u) => ctx.settings.get("ieArchive") !== false && /^https?:/i.test(u);
  const norm = (u) => String(u).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/:80(?=\/|$)/, "").replace(/\/$/, "");
  let throbber = null;
  const prog = status.querySelector(".ie-pane-prog"), progBar = prog.firstChild, datePane = status.querySelector(".ie-pane-date"), wbPane = status.querySelector(".ie-pane-wb");
  const trDate = () => getLang() === "tr";
  const stampDate = (st) => (st && st.length >= 8 ? (trDate() ? st.slice(6, 8) + "/" + st.slice(4, 6) + "/" + st.slice(0, 4) : +st.slice(4, 6) + "/" + +st.slice(6, 8) + "/" + st.slice(0, 4)) : wbYear);
  const setDate = () => {
    const web = /^https?:/i.test(current), on = wbOn(current);
    datePane.textContent = on ? stampDate(wbStamp) : "";
    datePane.style.visibility = on ? "" : "hidden";
    wbPane.textContent = web ? (ctx.settings.get("ieArchive") === false ? (trDate() ? "Canlı" : "Live") : "Wayback Machine") : "";
    wbPane.style.visibility = web ? "" : "hidden";
  };
  const loadEnd = (text = "Done") => {
    clearInterval(progTimer); clearTimeout(loadTimer); loading = false;
    prog.hidden = true; status.children[0].textContent = text; throbber?.classList.remove("spin");
  };
  const loadStart = (what) => {
    clearInterval(progTimer); clearTimeout(loadTimer);
    loading = true; prog.hidden = false; throbber?.classList.add("spin");
    let n = 1; progBar.style.width = "6px";
    progTimer = setInterval(() => { n = Math.min(n + 1, 10); progBar.style.width = n * 8 - 2 + "px"; }, 350);
    status.children[0].textContent = what;
    loadTimer = setTimeout(() => loadEnd(), 45000);
  };
  const onWayback = (e) => {
    if (typeof e.data !== "string" || !wbFrame || e.source !== wbFrame.contentWindow) return;
    let d; try { d = JSON.parse(e.data); } catch { return; }
    if (!d?.event) return;
    const m = String(d.pageUrl || "").match(WB_RE);
    if (!m) return;
    if (d.event === "pagehide") return loadStart("Opening page " + m[2] + "...");
    if (m[1].length === 14) wbStamp = m[1];
    if (norm(m[2]) !== norm(current)) {
      current = m[2]; address.value = current;
      history = history.slice(0, index + 1); history.push(current); index++;
      ctx.bus.emit("network:activity");
    }
    if (d.pageTitle) w.setTitle(d.pageTitle + " - Microsoft Internet Explorer");
    setDate(); syncNav();
    if (d.event === "domContentLoaded") loadEnd();
  };
  window.addEventListener("message", onWayback);
  const snapCache = new Map();
  async function loadYears() {
    const key = norm(current), hit = snapCache.get(key);
    if (hit) return (wbYears = hit);
    try {
      const r = await fetch("https://web.archive.org/cdx/search/cdx?output=json&fl=timestamp&collapse=timestamp:4&filter=statuscode:200&url=" + encodeURIComponent(current), { signal: AbortSignal.timeout(10000) });
      const ys = [...new Set((await r.json()).slice(1).map((x) => x[0].slice(0, 4)))].filter((y) => y >= "1996" && y <= "2009");
      if (ys.length) { snapCache.set(key, ys); return (wbYears = ys); }
    } catch {}
    return (wbYears = null);
  }
  // Closest archived copy to a wanted date (undefined = could not ask, null = nothing archived).
  async function closestSnap(url, st) {
    try {
      const r = await fetch("https://archive.org/wayback/available?url=" + encodeURIComponent(url) + "&timestamp=" + (st + "0101000000").slice(0, 14), { signal: AbortSignal.timeout(6000) });
      const c = (await r.json())?.archived_snapshots?.closest;
      return c?.available ? c.timestamp : null;
    } catch { return undefined; }
  }
  let snapBusy = false;
  const flash = (t) => { status.children[0].textContent = t; setTimeout(() => { if (!loading) status.children[0].textContent = "Done"; }, 2500); };
  const snapStep = async (dir) => {
    if (snapBusy || !wbOn(current)) return;
    snapBusy = true;
    const cur = (wbStamp || wbYear + "0101").slice(0, 8), d = new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(4, 6) - 1, +cur.slice(6, 8) + dir));
    const lim = d.toISOString().slice(0, 10).replace(/-/g, "");
    status.children[0].textContent = trDate() ? "Kayıt aranıyor..." : "Looking for a copy...";
    const none = () => flash(trDate() ? (dir < 0 ? "Bu sayfanın daha eski kaydı yok." : "Bu sayfanın daha yeni kaydı yok.") : (dir < 0 ? "There is no earlier copy of this page." : "There is no later copy of this page."));
    const go = (t) => { wbYear = t.slice(0, 4); wbStamp = t; snapBusy = false; render(); };
    let found;
    try { // 1) one small CDX query
      const q = "https://web.archive.org/cdx/search/cdx?output=json&fl=timestamp&collapse=timestamp:8&filter=statuscode:200&limit=" + (dir < 0 ? "-1&to=" : "1&from=") + lim + "&url=" + encodeURIComponent(current);
      const r = await fetch(q, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error("cdx " + r.status);
      found = (await r.json()).slice(1)[0]?.[0] || null;
    } catch {
      try { // 2) "closest copy" API, probing further and further from the current date until a different copy answers
        found = null;
        for (let days = 1, n = 0; n < 14 && !found; days *= 2, n++) {
          const p = new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(4, 6) - 1, +cur.slice(6, 8) + dir * days)).toISOString().slice(0, 10).replace(/-/g, "");
          if (p < "19960101" || p > new Date().toISOString().slice(0, 10).replace(/-/g, "")) break;
          const ts = await closestSnap(current, p);
          if (ts === undefined) throw new Error("offline");
          if (ts && (dir < 0 ? ts.slice(0, 8) < cur : ts.slice(0, 8) > cur)) found = ts;
        }
      } catch { snapBusy = false; return flash(trDate() ? "Arşive ulaşılamadı." : "Could not reach the archive."); }
    }
    if (found) return go(found);
    none();
    snapBusy = false;
  };
  const SANDBOX_WB = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";
  const openCompare = () => {
    if (!/^https?:/i.test(current)) return;
    const a = wbStamp ? wbStamp.slice(0, 4) : wbYear, url = current, hit = snapCache.get(norm(url));
    let ys = hit?.length > 1 ? hit : DEF_YEARS;
    let b = ys.find((y) => y > a) || [...ys].reverse().find((y) => y < a) || a;
    if (b === a) b = String(Math.min(2009, +a + 3));
    const cw = ctx.wm.create({ title: (trDate() ? "Karşılaştır - " : "Compare - ") + url, icon: "ie", width: 940, height: 600, appId: "ie" });
    const sels = [];
    const pane = (y0) => {
      const sel = el("select", {}, ...ys.map((y) => el("option", { value: y, text: y, selected: y === y0 })));
      const f = el("iframe", { class: "ie-frame", sandbox: SANDBOX_WB, referrerpolicy: "no-referrer", title: "Wayback" });
      const load = () => { f.src = WB + sel.value + "if_/" + url; };
      sel.addEventListener("change", load); load(); sels.push(sel);
      return el("div", { class: "ie-cmp-pane" }, el("div", { class: "ie-cmp-head" }, el("span", { text: trDate() ? "Yıl:" : "Year:" }), sel), f);
    };
    cw.setContent(el("div", { class: "ie-cmp" }, pane(a), pane(b)));
    if (!hit) loadYears().then((list) => { if (!list) return; for (const sel of sels) { const v = sel.value; sel.replaceChildren(...list.map((y) => el("option", { value: y, text: y, selected: y === v }))); if (!list.includes(v)) sel.append(el("option", { value: v, text: v, selected: true })); } }).catch(() => {});
  };
  const setYear = (y) => { wbYear = String(y); wbStamp = ""; render(); };
  const chooseDate = async () => {
    const v = await ctx.dialogs.prompt((trDate() ? "Bir yıl (1996-2009) veya tarih (GG/AA/YYYY) girin:" : "Enter a year (1996-2009) or a date (MM/DD/YYYY):"), stampDate(wbStamp), { title: trDate() ? "Tarih Seç" : "Choose Date" });
    if (!v) return;
    const d = v.trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/), y = v.trim().match(/^\d{4}$/);
    if (d) { const [dd, mm] = trDate() ? [d[1], d[2]] : [d[2], d[1]]; wbYear = d[3]; wbStamp = d[3] + mm.padStart(2, "0") + dd.padStart(2, "0"); render(); }
    else if (y) setYear(v.trim());
    else ctx.dialogs.message((trDate() ? "Lütfen 2000 gibi bir yıl veya 24/01/2001 gibi bir tarih girin." : "Please enter a year such as 2000 or a date such as 1/24/2001."), { title: "Microsoft Internet Explorer", icon: "warning" });
  };
  const archiveOptions = () => {
    const T = trDate() ? { title: "Arşiv Seçenekleri", src: "Kaynak", wb: "Wayback Machine (geçmiş web arşivi)", live: "Canlı (sitenin şu anki sürümü)", year: "Varsayılan arşiv yılı:", ok: "Tamam", cancel: "İptal" } : { title: "Archive Options", src: "Source", wb: "Wayback Machine (web archive)", live: "Live (the site as it is today)", year: "Default archive year:", ok: "OK", cancel: "Cancel" };
    const isLive = ctx.settings.get("ieArchive") === false;
    const rWb = el("input", { type: "radio", name: "src", id: "wbo-wb", checked: !isLive }), rLive = el("input", { type: "radio", name: "src", id: "wbo-live", checked: isLive });
    const sel = el("select", {}, ...DEF_YEARS.map((y) => el("option", { value: y, text: y, selected: y === wbYear })));
    let d;
    const row = el("div", { class: "rd-btnrow" },
      button(T.ok, () => {
        ctx.settings.set("ieArchive", !rLive.checked);
        if (!rLive.checked) { ctx.settings.set("ieYear", sel.value); wbYear = sel.value; wbStamp = ""; }
        d.close(); render();
      }, { class: "default-button" }),
      button(T.cancel, () => d.close()));
    d = openDlgWindow(ctx, { title: T.title, buttons: row, content: el("div", { class: "wbo" },
      el("fieldset", {}, el("legend", { text: T.src }),
        el("div", { class: "field-row" }, rWb, el("label", { for: "wbo-wb", text: T.wb })),
        el("div", { class: "field-row" }, rLive, el("label", { for: "wbo-live", text: T.live }))),
      el("div", { class: "field-row" }, el("label", { text: T.year }), sel)) });
  };
  const DEF_YEARS = Array.from({ length: 14 }, (_, i) => String(1996 + i));
  const popAt = (anchor, items, up) => {
    const r = anchor.getBoundingClientRect();
    popup(items, r.left, up ? r.top : r.bottom, { anchor });
    const m = [...document.querySelectorAll(".popup-menu")].pop();
    if (m && up) { m.style.top = "auto"; m.style.bottom = Math.max(0, innerHeight - r.top) + "px"; }
    if (m) m.style.left = Math.max(0, Math.min(r.left, innerWidth - m.offsetWidth - 2)) + "px";
  };
  const yearMenu = (anchor = datePane, up = true) => {
    const ys = wbYears || DEF_YEARS;
    popAt(anchor, [
      ...ys.map((y) => ({ label: y, radio: true, checked: y === (wbStamp ? wbStamp.slice(0, 4) : wbYear), action: () => { ctx.settings.set("ieArchive", true); setYear(y); } })),
      { separator: true },
      { label: "Previous Snapshot", action: () => snapStep(-1) },
      { label: "Next Snapshot", action: () => snapStep(1) },
      { label: "Compare Years...", action: openCompare },
      { separator: true },
      { label: "Choose Date...", action: chooseDate },
      { label: "Wayback Calendar...", action: () => window.open("https://web.archive.org/web/*/" + current, "_blank", "noopener,noreferrer") },
      { separator: true },
      { label: "Archive Options...", action: archiveOptions },
    ], up);
  };
  const modeMenu = () => {
    const live = ctx.settings.get("ieArchive") === false;
    popAt(wbPane, [
      { label: "Wayback Machine", radio: true, checked: !live, action: () => { ctx.settings.set("ieArchive", true); render(); } },
      { label: trDate() ? "Canlı" : "Live", radio: true, checked: live, action: () => { ctx.settings.set("ieArchive", false); render(); } },
    ], true);
  };
  let popWasOpen = false;
  const onPopDown = (e) => { popWasOpen = !!document.querySelector(".popup-menu") && !!e.target.closest?.(".ie-pane-date,.ie-pane-wb,.ie-links,.ie-chevron,.ie-tb[data-tb=archive]"); };
  document.addEventListener("pointerdown", onPopDown, true);
  datePane.addEventListener("click", () => { if (popWasOpen) { popWasOpen = false; return; } yearMenu(); });
  wbPane.addEventListener("click", () => { if (popWasOpen) { popWasOpen = false; return; } if (/^https?:/i.test(current)) modeMenu(); });
  const shareLink = () => location.href.split("#")[0] + "#web=" + encodeURIComponent(current) + "&date=" + (wbStamp ? wbStamp.slice(0, 8) : wbYear);
  const external = () => {
    if (/^https?:\/\//i.test(current))
      window.open(current, "_blank", "noopener,noreferrer");
  };
  const navigate = (target, push = true) => {
    target = normalizeAddress(target);
    ctx.bus.emit("network:activity");
    current = target;
    address.value = current;
    if (push) {
      history = history.slice(0, index + 1);
      history.push(current);
      index++;
    }
    render();
  };
  const siteFrames = new Set();
  const onSiteMessage = (e) => {
    const d = e.data;
    if (!d || d.ns !== "go" || ![...siteFrames].some((f) => f.contentWindow === e.source)) return;
    if (d.ext) window.open(d.url, "_blank", "noopener,noreferrer");
    else {
      try { navigate(d.url); } catch (err) { ctx.dialogs.message(err.message, { title: "Microsoft Internet Explorer", icon: "error" }); }
    }
  };
  window.addEventListener("message", onSiteMessage);
  const _close = w.close.bind(w);
  w.close = (...a) => (window.removeEventListener("message", onSiteMessage), window.removeEventListener("message", onWayback), document.removeEventListener("pointerdown", onPopDown, true), clearInterval(progTimer), clearTimeout(loadTimer), _close(...a));
  const siteFrame = (html, title) => {
    const f = el("iframe", { class: "ie-frame", sandbox: "allow-scripts allow-forms", title });
    f.srcdoc = html;
    siteFrames.add(f);
    return f;
  };
  // ---- Links bar ----
  const defaultLinks = () => (PORTALS[getLang()] || PORTALS.en).slice(0, 6).map(([title, u]) => ({ title, url: "http://www." + u + "/" }));
  const links = () => ctx.settings.get("ieLinks") || defaultLinks();
  const addLink = () => { const l = links().filter((x) => x.url !== current); ctx.settings.set("ieLinks", [...l, { title: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, "") || current, url: current }]); };
  const linksMenu = (anchor) => {
    if (popWasOpen) { popWasOpen = false; return; }
    popAt(anchor, [...links().map((l) => ({ label: l.title, icon: "ie", action: () => navigate(l.url) })), { separator: true }, { label: "Add Current Page to Links", disabled: !/^https?:/i.test(current), action: addLink }], false);
  };
  // ---- Explorer bar (Search / Favorites / History) ----
  let barKind = null;
  const explorer = el("div", { class: "ie-explorer", hidden: true });
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  let barMode = null;
  function showBar(kind, redraw = false) {
    if (kind === barKind && !redraw) kind = null;
    barKind = kind;
    explorer.hidden = !kind;
    for (const n of ["search", "favorites", "history"]) w.el?.querySelector?.(`.ie-tb[data-tb="${n}"]`)?.classList.toggle("pressed", n === kind);
    if (!kind) return explorer.replaceChildren();
    const link = (title, url, ic = "ie") => button([icon(ic), el("span", { text: title })], () => navigate(url), { class: "ie-exp-item", title: url });
    const tbtn = (img, label, fn, extra = {}) => button([el("img", { src: "/assets/ui/ie/iso/" + img + ".png", alt: "", draggable: "false" }), el("span", { text: label })], fn, { class: "ie-exp-tb", ...extra });
    const organize = () => ieOrganize(ctx, { get: favorites, set: (v) => ctx.settings.set("favorites", v), folders: favFolders, setFolders: (v) => ctx.settings.set("favFolders", v), open: navigate }).then?.(() => barKind === "favorites" && showBar("favorites", true));
    const draw = () => showBar(kind, true);
    let tools, body;
    if (kind === "search") {
      const q = el("input", { "aria-label": "Search", placeholder: "Type a word or phrase" });
      const go = () => q.value.trim() && navigate("about:search?q=" + encodeURIComponent(q.value.trim()));
      q.addEventListener("keydown", (e) => e.key === "Enter" && go());
      tools = [tbtn("bar-new", "New", () => { q.value = ""; q.focus(); }), tbtn("bar-next", "Next", go), tbtn("bar-cust", "Customize", () => {}, { disabled: true })];
      body = el("div", { class: "ie-exp-body" }, el("p", { text: "Search the Web:" }), q, button("Search", go));
    } else if (kind === "favorites") {
      tools = [tbtn("bar-add", "Add...", addFav), tbtn("bar-org", "Organize...", organize)];
      const fav = favorites();
      body = el("div", { class: "ie-exp-body" },
        ...favFolders().flatMap((fo) => [el("div", { class: "ie-exp-folder" }, icon("folder"), el("span", { text: fo })), ...fav.filter((f) => f.folder === fo).map((f) => el("div", { class: "ie-exp-indent" }, link(f.title, f.url)))]),
        ...fav.filter((f) => !f.folder).map((f) => link(f.title, f.url)));
    } else {
      const modes = [["date", "By &Date"], ["site", "By S&ite"], ["most", "By &Most Visited"], ["order", "By &Order Visited Today"]];
      const mode = (barMode = barMode || "date");
      const view = tbtn("bar-org", "View", () => {
        const r = view.getBoundingClientRect();
        popup(modes.map(([k, l]) => ({ label: l.replace("&", ""), radio: true, checked: k === barMode, action: () => { barMode = k; draw(); } })), r.left, r.bottom);
      });
      view.querySelector("img").remove();
      tools = [view];
      const visits = history.filter((x) => /^https?:/i.test(x));
      const uniq = [...new Set(visits)];
      const count = (u) => visits.filter((x) => x === u).length;
      let rows;
      if (barMode === "site") {
        const hosts = [...new Set(uniq.map(hostOf))].sort();
        rows = hosts.flatMap((h) => [el("div", { class: "ie-exp-folder" }, icon("folder"), el("span", { text: h })), ...uniq.filter((u) => hostOf(u) === h).map((u) => el("div", { class: "ie-exp-indent" }, link(u.replace(/^https?:\/\//, ""), u)))]);
      } else if (barMode === "most") rows = [...uniq].sort((a, b) => count(b) - count(a)).map((u) => link(hostOf(u), u));
      else if (barMode === "order") rows = uniq.map((u) => link(hostOf(u), u));
      else rows = [el("div", { class: "ie-exp-folder" }, icon("folder"), el("span", { text: "Today" })), ...[...uniq].reverse().map((u) => el("div", { class: "ie-exp-indent" }, link(hostOf(u), u)))];
      body = el("div", { class: "ie-exp-body" }, ...(uniq.length ? rows : [el("p", { text: "No pages to display." })]));
    }
    explorer.replaceChildren(
      el("div", { class: "ie-exp-head" }, el("span", { text: { search: "Search", favorites: "Favorites", history: "History" }[kind] }), button(el("img", { src: "/assets/ui/ie/iso/bar-close.png", alt: "", draggable: "false" }), () => showBar(null), { class: "ie-exp-close", title: "Close" })),
      el("div", { class: "ie-exp-tools" }, ...tools),
      body);
  }
  const ieBody = el("div", { class: "ie-body" }, explorer, viewport);
  let full = false;
  const setFull = (on) => {
    full = on; w.el.classList.toggle("ie-fullscreen", on);
    if (on) { w.maximize?.(); }
  };
  const _setTitle = w.setTitle.bind(w);
  w.setTitle = (t) => _setTitle(ctx.settings.get("ieOffline") && !t.includes("[Working Offline]") ? t + " [Working Offline]" : t.replace(" [Working Offline]", ""));
  const favorites = () =>
    ctx.settings.get("favorites") || [
      { title: "Google", url: "about:google" },
      { title: "News Reader", url: "about:news" },
      { title: "Günün Ayeti, Hadisi ve Esması", url: "about:daily" },
      { title: "Tarihte Bugün", url: "about:today" },
      { title: "Microsoft", url: "http://www.microsoft.com/" },
      { title: "Yahoo!", url: "http://www.yahoo.com/" },
      { title: "The Internet Archive", url: "http://www.archive.org/" },
    ];
  const favFolders = () => [...new Set([...(ctx.settings.get("favFolders") || []), ...favorites().map((f) => f.folder).filter(Boolean)])];
  const home = () => navigate(ctx.settings.get("homePage") || "about:home");
  function syncNav() {
    const set = (n, off) => { const b = w.el?.querySelector?.(`.ie-tb[data-tb="${n}"]`); if (b) { b.classList.toggle("disabled", off); if (off) b.firstChild.src = "/assets/ui/ie/iso/" + n + "-cold.png"; } };
    set("back", index <= 0);
    set("fwd", index >= history.length - 1);
  }
  function render() {
    syncNav();
    viewport.replaceChildren();
    wbFrame = null; loadEnd();
    setDate();
    status.children[1].textContent = current.startsWith("about:")
      ? "My Computer"
      : "Internet";
    if (current === "about:blank") {
      w.setTitle("about:blank - Microsoft Internet Explorer");
      return;
    }
    if (current === "about:home" || current === "about:welcome") {
      const tr2 = trDate();
      w.setTitle("Welcome to the Internet - Microsoft Internet Explorer");
      const search = el("input", {
        "aria-label": "Search the Web",
        placeholder: "Type a word or phrase",
      });
      const page = el(
        "article",
        { class: "ie-home" },
        el(
          "header",
          { class: "ie-home-header" },
          icon("ie", 32),
          el(
            "div",
            {},
            el("h1", { text: "Microsoft Internet Explorer" }),
            el("p", { text: "Your window to the world. " }),
          ),
        ),
        el(
          "nav",
          { class: "ie-home-nav" },
          button("Home", home, { class: "text-link" }),
          button("Favorites", () => navigate("about:favorites"), {
            class: "text-link",
          }),
          button("History", () => navigate("about:history"), {
            class: "text-link",
          }),
          button("Help", () => ctx.launch("help", { topic: "internet" }), {
            class: "text-link",
          }),
        ),
        el(
          "div",
          { class: "ie-home-body" },
          el("h2", { text: "Welcome to the Internet" }),
          el("p", {
            text: "Explore the Web, visit your favorite sites, or find something new. Type a website address in the Address bar and click Go.",
          }),
          el(
            "fieldset",
            { class: "ie-search-box" },
            el("legend", { text: "Search the Web" }),
            el(
              "div",
              { class: "search-line" },
              search,
              button("Search", () => navigate(search.value)),
            ),
          ),
          (() => { siteFrames.clear(); const f = siteFrame(homeBoxes(), "Günün Ayeti, Hadisi ve Esması / Tarihte Bugün"); f.style.cssText = "width:100%;height:230px;border:0;margin:6px 0"; return f; })(),
          el("h3", { text: "A few places to start" }),
          el(
            "div",
            { class: "ie-start-links" },
            ...favorites().map((f) =>
              button([icon("ie"), f.title], () => navigate(f.url), {
                class: "text-link",
              }),
            ),
          ),
          el("hr"),
          el("h3", { text: tr2 ? `${wbYear}'de İnternet` : `The web in ${wbYear}` }),
          el("p", {}, ...YEAR_RANGE.flatMap((y, i) => [i ? " · " : "", button(y, () => { wbYear = y; wbStamp = ""; render(); }, { class: "text-link", style: y === wbYear ? { fontWeight: "bold" } : null })])),
          el("ul", {}, ...(YEAR_FACTS[wbYear] || []).map((f) => el("li", { text: tr2 ? f[0] : f[1] }))),
          el("p", { text: tr2 ? "Bu yılın popüler siteleri (sayfalar Wayback Machine'den, o yıldaki hâliyle açılır):" : "Popular sites of the year (opened from the Wayback Machine as they looked then):" }),
          el("p", {}, ...[...YEAR_SITES(+wbYear), ...(tr2 ? YEAR_TR_SITES : [])].flatMap(([n, u], i) => [i ? " · " : "", button(n, () => navigate("http://www." + u + "/"), { class: "text-link" })])),
          el("hr"),
          el("h3", { text: "Make yourself at home" }),
          el("p", {
            text: "Add a page to Favorites to keep it close at hand. Use Back and Forward to revisit pages you have opened.",
          }),
          button("Internet Options...", () =>
            ctx.launch("control", { page: "internet" }),
          ),
          el("p", {
            class: "ie-browser-note",
            text: "Some websites do not allow embedded browsing. Choose Open in Browser from the toolbar to open them in a full browser tab.",
          }),
        ),
      );
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter") navigate(search.value);
      });
      viewport.append(page);
      return;
    }
    if (isSite(current)) {
      siteFrames.clear();
      status.children[0].textContent = "Opening page " + current + "...";
      const my = (render.token = (render.token || 0) + 1);
      buildSite(current).then((r) => {
        if (my !== render.token || !r) return;
        status.children[0].textContent = "Done";
        if (r.go) return navigate(r.go, false);
        viewport.replaceChildren(siteFrame(r.html, r.title));
        w.setTitle(r.title + " - Microsoft Internet Explorer");
      });
      return;
    }
    if (current === "about:favorites" || current === "about:history") {
      const list =
        current === "about:favorites"
          ? favorites()
          : history
              .filter((x) => /^https?:/.test(x))
              .map((url) => ({ url, title: url }));
      viewport.append(
        el(
          "div",
          { class: "ie-local-list" },
          el("h2", {
            text: current === "about:favorites" ? "Favorites" : "History",
          }),
          ...list.map((f) =>
            button([icon("ie"), f.title], () => navigate(f.url), {
              class: "text-link",
            }),
          ),
          !list.length ? el("p", { text: "No pages to display." }) : null,
        ),
      );
      return;
    }
    if (/^[A-Z]:/i.test(current)) {
      const text = ctx.fs.readFile(current),
        frame = el("iframe", {
          class: "ie-frame",
          sandbox: "allow-forms",
          title: basename(current),
        });
      frame.srcdoc = text;
      viewport.append(frame);
      w.setTitle(basename(current) + " - Microsoft Internet Explorer");
      return;
    }
    if (ctx.settings.get("ieOffline") && /^https?:/i.test(current)) {
      status.children[0].textContent = "Done";
      ctx.dialogs.confirm("This page is not available offline.\n\nTo view this page, click Connect.", "Web Page Unavailable While Offline").then((ok) => {
        if (ok) { ctx.settings.set("ieOffline", false); w.setTitle(w.title); render(); }
      });
      return;
    }
    const url = new URL(current);
    if (/(^|\.)(bing\.com|search\.msn\.com)$/i.test(url.hostname)) {
      w.setTitle("Browser Not Supported - Bing - Microsoft Internet Explorer");
      status.children[1].textContent = "Internet";
      viewport.append(
        el(
          "div",
          { class: "ie-legacy-page" },
          "We're sorry, but your current browser is no longer supported. To continue using Bing, please upgrade to a modern browser.",
          el("br"),
          el("br"),
          el("a", {
            href: "https://www.microsoft.com/edge",
            target: "_blank",
            rel: "noopener noreferrer",
            text: "Upgrade your browser",
          }),
        ),
      );
      return;
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Only HTTP and HTTPS addresses can be opened.");
    if (/\.swf(\?|#|$)/i.test(current) && /^https?:/i.test(current)) {
      const src = wbOn(current) ? WB + (wbStamp || wbYear) + "id_/" + current : current;
      w.setTitle(new URL(current).pathname.split("/").pop() + " - Microsoft Internet Explorer");
      loadStart("Opening page " + current + "...");
      const holder = el("div", { class: "ie-flash" });
      viewport.append(holder);
      loadRuffle().then(() => {
        const rf = window.RufflePlayer.newest(), pl = rf.createPlayer();
        pl.style.cssText = "width:100%;height:100%";
        holder.append(pl);
        pl.load({ url: src, allowScriptAccess: false, autoplay: "on", unmuteOverlay: "hidden", splashScreen: false });
        pl.addEventListener("loadedmetadata", () => loadEnd());
        setTimeout(() => loadEnd(), 4000);
      }).catch(() => { loadEnd(); holder.textContent = "Flash content could not be loaded."; });
      return;
    }
    const live = !wbOn(current);
    const tr2 = trDate(), token = (render.wb = (render.wb || 0) + 1);
    if (!live) { loadYears().catch(() => {}); }
    loadStart("Opening page " + current + "...");
    w.setTitle(url.hostname + " - Microsoft Internet Explorer");
    const show = (src, note) => {
      const frame = el("iframe", {
        class: "ie-frame",
        src,
        title: "Web page: " + url.hostname,
        sandbox: live ? "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" : SANDBOX_WB,
        referrerpolicy: "no-referrer",
      });
      wbFrame = live ? null : frame;
      frame.addEventListener("load", () => loadEnd());
      viewport.replaceChildren(...(note ? [el("div", { class: "ie-infobar" }, el("span", { text: note }), button("×", (e) => e.currentTarget.parentElement.remove(), { class: "ie-infobar-x", title: "Close" }))] : []), frame);
    };
    if (live) return show(current);
    const want = wbStamp || wbYear;
    closestSnap(current, want).then((ts) => {
      if (token !== render.wb) return;
      if (ts === undefined) return show(WB + want + "if_/" + current);
      if (ts === null) {
        loadEnd(tr2 ? "Bu sayfanın arşiv kaydı yok" : "No archived copy of this page");
        viewport.replaceChildren(el("div", { class: "ie-legacy-page" },
          tr2 ? "Wayback Machine'de bu sayfanın hiçbir kaydı bulunamadı." : "The Wayback Machine has no copy of this page.", el("br"), el("br"),
          button(tr2 ? "Canlı siteyi aç" : "Open the live site", () => { ctx.settings.set("ieArchive", false); render(); })));
        return;
      }
      const gotY = ts.slice(0, 4), wantY = want.slice(0, 4);
      if (gotY === wantY) return show(WB + want + "if_/" + current);
      const when = tr2 ? ts.slice(6, 8) + "/" + ts.slice(4, 6) + "/" + gotY : +ts.slice(4, 6) + "/" + +ts.slice(6, 8) + "/" + gotY;
      wbYear = gotY; wbStamp = ts; setDate();
      show(WB + ts + "if_/" + current, tr2 ? `Bu sayfa ${wantY} yılında arşivlenmemiş. En yakın kayıt (${when}) gösteriliyor.` : `This page was not archived in ${wantY}. Showing the closest copy (${when}).`);
    });
  }
  const back = () => {
      if (index > 0) navigate(history[--index], false);
    },
    forward = () => {
      if (index < history.length - 1) navigate(history[++index], false);
    };
  const viewSource = () => ctx.launch("notepad", { text: current.startsWith("C:") ? ctx.fs.readFile(current) : viewport.innerHTML });
  const addFav = () => ieAddFavorite(ctx, { name: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, ""), folders: favFolders(), onOk: (title, folder) => { ctx.settings.set("favorites", [...favorites(), { title, url: current, folder }]); if (barKind === "favorites") showBar("favorites", true); } });
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const pageMenu = () => [
    { label: "Back", disabled: index <= 0, action: back },
    { label: "Forward", disabled: index >= history.length - 1, action: forward },
    separator(),
    off("Save Background As..."), off("Set as Wallpaper"), off("Copy Background"), off("Set as Desktop Item..."),
    separator(),
    { label: "Select All", action: () => { const r = document.createRange(); r.selectNodeContents(viewport); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } },
    off("Paste"),
    separator(),
    off("Create Shortcut"),
    { label: "Add to Favorites...", action: addFav },
    { label: "View Source", action: viewSource },
    separator(),
    off("Encoding"),
    separator(),
    { label: "Print", action: () => iePrint(ctx, () => ctx.printText(viewport.innerText, current)) },
    { label: "Refresh", action: render },
    separator(),
    { label: "Properties", action: () => ieProps(ctx, { url: current, title: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, "") }) },
  ];
  const linkMenu = (href) => [
    { label: "Open", action: () => navigate(href) },
    { label: "Open in New Window", action: () => ctx.launch("ie", { url: href }) },
    off("Save Target As..."), off("Print Target"),
    separator(),
    off("Cut"), { label: "Copy", action: () => document.execCommand("copy") },
    { label: "Copy Shortcut", action: () => navigator.clipboard?.writeText(href) },
    off("Paste"),
    separator(),
    { label: "Add to Favorites...", action: addFav },
    separator(),
    { label: "Properties", action: () => ieProps(ctx, { url: href, title: href }) },
  ];
  const imageMenu = (src) => [
    { label: "Open Link", disabled: true }, off("Open Link in New Window"), off("Save Target As..."), off("Print Target"),
    separator(),
    off("Show Picture"), { label: "Save Picture As...", action: () => downloadFile(basename(src) || "picture.png", src, "image/png") }, off("Set as Wallpaper"), off("Set as Desktop Item..."),
    separator(),
    off("Cut"), { label: "Copy", action: () => document.execCommand("copy") }, off("Copy Shortcut"), off("Paste"),
    separator(),
    { label: "Add to Favorites...", action: addFav },
    separator(),
    { label: "Properties", action: () => ieProps(ctx, { url: src, title: basename(src) }) },
  ];
  const controlMenu = () => [
    off("Undo"), separator(), { label: "Cut", action: () => document.execCommand("cut") }, { label: "Copy", action: () => document.execCommand("copy") }, { label: "Paste", action: () => document.execCommand("paste") }, { label: "Delete", action: () => document.execCommand("delete") }, separator(), { label: "Select All", action: () => document.execCommand("selectAll") },
  ];
  viewport.addEventListener("contextmenu", (e) => {
    const t = e.target;
    e.preventDefault();
    const a = t.closest?.("a[href]"), img = t.closest?.("img");
    popup(t.closest?.("input,textarea,select") ? controlMenu() : img ? imageMenu(img.src) : a ? linkMenu(a.href) : pageMenu(), e.clientX, e.clientY);
  });
  const TB = "/assets/ui/ie/tb-", ISO = "/assets/ui/ie/iso/";
  const isoTb = new Set(["archive", "back", "fwd", "stop", "refresh", "home", "search", "favorites", "history", "mail", "print"]);
  const tbButton = (name, label, action, { drop = false, disabled = false, title } = {}) => {
    const iso = isoTb.has(name);
    const pic = el("img", { src: iso ? ISO + name + "-cold.png" : TB + name + ".png", alt: "", draggable: "false" });
    const b = button(
      [
        pic,
        label ? el("span", { text: label }) : null,
        drop ? el("span", { class: "ie-drop" }) : null,
      ],
      action,
      { class: "ie-tb" + (disabled ? " disabled" : ""), title: title || label },
    );
    b.dataset.tb = name;
    if (iso) {
      // Windows 2000 toolbars show the "hot" (coloured) bitmap while the pointer is over an enabled button.
      const hot = (on) => { if (!b.classList.contains("disabled")) pic.src = ISO + name + (on ? "-hot" : "-cold") + ".png"; };
      b.addEventListener("mouseenter", () => hot(true));
      b.addEventListener("mouseleave", () => hot(false));
    }
    return b;
  };
  const sep = () => el("span", { class: "ie-tb-sep" });
  const tools = el(
    "div",
    { class: "ie-toolbar" },
    el("span", { class: "ie-grip" }),
    tbButton("back", "Back", back, { drop: true }),
    tbButton("fwd", "", forward, { drop: true, title: "Forward" }),
    tbButton("stop", "", () => {
      viewport.querySelector("iframe")?.remove();
      loadEnd("Stopped");
    }, { title: "Stop" }),
    tbButton("refresh", "", render, { title: "Refresh" }),
    tbButton("home", "", home, { title: "Home" }),
    sep(),
    tbButton("search", "Search", () => showBar("search")),
    tbButton("favorites", "Favorites", () => showBar("favorites")),
    tbButton("history", "", () => showBar("history"), { title: "History" }),
    tbButton("archive", "Archive", (e) => { if (popWasOpen) { popWasOpen = false; return; } yearMenu(tools.querySelector('.ie-tb[data-tb="archive"]'), false); }),
    sep(),
    tbButton("mail", "", () => ctx.launch("outlook"), { title: "Mail" }),
    tbButton("print", "", () => ctx.printText(viewport.innerText, current), { title: "Print" }),
  );
  w.setMenu({
    File: () => [
      {
        label: "New",
        submenu: [
          { label: "Window", shortcut: "Ctrl+N", action: () => ctx.launch("ie", { url: current }) },
          { label: "Message", action: () => ctx.launch("outlook", { compose: true }) },
          { label: "Post", disabled: true },
          { label: "Contact", action: () => ctx.launch("address") },
          { label: "Internet Call", disabled: true },
        ],
      },
      {
        label: "Open...",
        shortcut: "Ctrl+O",
        action: () => ieOpen(ctx, (v) => navigate(v)),
      },
      { label: "Edit", action: viewSource },
      { label: "Save", shortcut: "Ctrl+S", disabled: true },
      {
        label: "Save As...",
        action: () => downloadFile((w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, "") || "index") + ".htm", `<html>${viewport.innerHTML}</html>`, "text/html"),
      },
      separator(),
      { label: "Page Setup...", action: () => iePageSetup(ctx) },
      { label: "Print...", shortcut: "Ctrl+P", action: () => iePrint(ctx, () => ctx.printText(viewport.innerText, current)) },
      separator(),
      {
        label: "Send",
        submenu: [
          { label: "Page by E-mail", disabled: true },
          { label: "Link by E-mail", action: () => (location.href = "mailto:?subject=" + encodeURIComponent(w.title) + "&body=" + encodeURIComponent(current)) },
          { label: "Shortcut to Desktop", disabled: true },
          { label: "Share Link (copy to Clipboard)", disabled: !/^https?:/i.test(current), action: () => navigator.clipboard?.writeText(shareLink()) },
        ],
      },
      { label: "Import and Export...", disabled: true },
      separator(),
      {
        label: "Properties",
        action: () => ieProps(ctx, { url: current, title: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, "") }),
      },
      { label: "Work Offline", checked: !!ctx.settings.get("ieOffline"), action: () => { ctx.settings.set("ieOffline", !ctx.settings.get("ieOffline")); w.setTitle(w.title.replace(/ - Microsoft Internet Explorer.*/, "") + " - Microsoft Internet Explorer"); } },
      { label: "Close", action: () => w.close() },
    ],
    Edit: [
      { label: "Cut", shortcut: "Ctrl+X", disabled: true },
      { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
      { label: "Paste", shortcut: "Ctrl+V", disabled: true },
      separator(),
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => {
          const range = document.createRange();
          range.selectNodeContents(viewport);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        },
      },
      separator(),
      { label: "Find (on This Page)...", shortcut: "Ctrl+F", action: async () => { const t = await ctx.dialogs.prompt("Find what:", "", { title: "Find" }); if (t) window.find(t); } },
    ],
    View: () => [
      {
        label: "Toolbars",
        submenu: [
          { label: "Standard Buttons", checked: true },
          { label: "Address Bar", checked: true },
          { label: "Links", checked: true },
          { separator: true },
          { label: "Customize..." },
        ],
      },
      {
        label: "Status Bar",
        checked: !status.hidden,
        action: () => {
          status.hidden = !status.hidden;
        },
      },
      {
        label: "Explorer Bar",
        submenu: [
          { label: "Search", shortcut: "Ctrl+E", checked: barKind === "search", action: () => showBar("search") },
          { label: "Favorites", shortcut: "Ctrl+I", checked: barKind === "favorites", action: () => showBar("favorites") },
          { label: "History", shortcut: "Ctrl+H", checked: barKind === "history", action: () => showBar("history") },
        ],
      },
      { separator: true },
      {
        label: "Go To",
        submenu: [
          { label: "Back", action: back },
          { label: "Forward", action: forward },
          { label: "Home Page", action: home },
        ],
      },
      {
        label: "Stop",
        shortcut: "Esc",
        action: () => {
          viewport.querySelector("iframe")?.remove();
          loadEnd("Stopped");
        },
      },
      { label: "Refresh", shortcut: "F5", action: render },
      { separator: true },
      {
        label: "Archive Year",
        submenu: Array.from({ length: 14 }, (_, i) => String(1996 + i)).map((y) => ({ label: y, radio: true, checked: y === (wbStamp ? wbStamp.slice(0, 4) : wbYear), action: () => setYear(y) })),
      },
      { label: "Compare Years...", action: openCompare },
      { label: "Archive Options...", action: archiveOptions },
      { separator: true },
      {
        label: "Text Size",
        submenu: ["Largest", "Larger", "Medium", "Smaller", "Smallest"].map((label) => ({
          label,
          action: () => {
            viewport.style.fontSize =
              { Largest: "150%", Larger: "125%", Medium: "100%", Smaller: "85%", Smallest: "70%" }[label];
          },
        })),
      },
      {
        label: "Encoding",
        submenu: [
          { label: "Auto-Select" },
          { separator: true },
          { label: "Western European (Windows)", checked: true },
          { label: "Unicode (UTF-8)" },
        ],
      },
      { separator: true },
      {
        label: "Source",
        action: () =>
          ctx.launch("notepad", {
            text: current.startsWith("C:")
              ? ctx.fs.readFile(current)
              : viewport.innerHTML,
          }),
      },
      { label: "Full Screen", shortcut: "F11", checked: full, action: () => setFull(!full) },
    ],
    Favorites: () => [
      {
        label: "Add to Favorites...",
        action: () => ieAddFavorite(ctx, { name: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, ""), folders: favFolders(), onOk: (title, folder) => ctx.settings.set("favorites", [...favorites(), { title, url: current, folder }]) }),
      },
      { label: "Add to Links", disabled: !/^https?:/i.test(current), action: addLink },
      {
        label: "Organize Favorites...",
        action: () => ieOrganize(ctx, { get: favorites, set: (v) => ctx.settings.set("favorites", v), folders: favFolders, setFolders: (v) => ctx.settings.set("favFolders", v), open: navigate }),
      },
      separator(),
      ...favFolders().map((fo) => ({
        label: fo,
        icon: "folder",
        submenu: favorites().filter((f) => f.folder === fo).map((f) => ({ label: f.title, icon: "ie", action: () => navigate(f.url) })),
      })),
      ...favorites().filter((f) => !f.folder).map((f) => ({
        label: f.title,
        icon: "ie",
        action: () => navigate(f.url),
      })),
    ],
    Tools: [
      {
        label: "Mail and News",
        submenu: [
          { label: "Read Mail", action: () => ctx.launch("outlook") },
          { label: "New Message...", action: () => ctx.launch("outlook", { compose: true }) },
          { label: "Send a Link...", action: () => (location.href = "mailto:?body=" + encodeURIComponent(current)) },
          { label: "Send Page...", disabled: true },
          separator(),
          { label: "Read News", disabled: true },
        ],
      },
      { label: "Synchronize...", disabled: true },
      { label: "Windows Update", disabled: true },
      separator(),
      { label: "Internet Options...", action: () => ctx.launch("control", { page: "internet" }) },
    ],
    Help: IE_HELP(ctx, () => ctx.dialogs.message("Microsoft Internet Explorer\nVersion: 5.00.3700.1000\n\nCopyright © 1995-2001 Microsoft Corp.", { title: "About Internet Explorer", icon: "ie" })),
  });
  w.setContent(
    tools,
    el(
      "div",
      { class: "ie-address" },
      el("span", { class: "ie-grip" }),
      el("span", { class: "ie-address-label", text: "Address" }),
      el(
        "div",
        { class: "ie-address-field" },
        el("img", { src: "/assets/ui/ie/addr-ie.png", alt: "", draggable: "false" }),
        address,
        el("span", { class: "ie-combo-drop" }),
      ),
      button(
        [el("img", { src: "/assets/ui/ie/go.png", alt: "", draggable: "false" }), el("span", { text: "Go" })],
        () => navigate(address.value),
        { class: "ie-go" },
      ),
      el("span", { class: "ie-grip" }),
      el("span", { class: "ie-links", text: "Links", onclick: (e) => linksMenu(e.currentTarget) }),
      el("span", { class: "ie-chevron", text: "»", onclick: (e) => linksMenu(e.currentTarget) }),
    ),
    ieBody,
    status,
  );
  const HELP = {
    File: "Contains commands for working with the selected item.",
    Edit: "Contains editing commands.",
    View: "Contains commands for manipulating the view.",
    Favorites: "Contains commands for working with your favorite items.",
    Tools: "Contains tools and options.",
    Help: "Contains commands for displaying help.",
  };
  w.el.querySelectorAll(":scope > .menu-bar .menu-bar-item").forEach((b) => {
    b.addEventListener("click", () => {
      status.children[0].textContent = HELP[b.textContent] || "";
      const restore = () =>
        setTimeout(() => {
          if (!document.querySelector(".popup-menu"))
            status.children[0].textContent = "Done";
        }, 0);
      document.addEventListener("pointerup", restore, { once: true });
      document.addEventListener("keydown", restore, { once: true });
    });
  });
  w.el.querySelector(":scope > .menu-bar")?.append(
    (throbber = el("div", { class: "ie-throbber", "aria-hidden": "true" })),
  );
  address.addEventListener("keydown", (e) => {
    if (e.key === "Enter") navigate(address.value);
  });
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "F5") {
      e.preventDefault();
      render();
    }
    if (e.key === "F11") { e.preventDefault(); setFull(!full); }
    if (e.key === "Escape" && full) setFull(false);
    if ((e.ctrlKey || e.metaKey) && ["e", "i", "h"].includes(e.key.toLowerCase())) { e.preventDefault(); showBar({ e: "search", i: "favorites", h: "history" }[e.key.toLowerCase()]); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      address.focus();
      address.select();
    }
  });
  if (path) {
    current = path;
    address.value = current;
  }
  render();
  return w;
}
