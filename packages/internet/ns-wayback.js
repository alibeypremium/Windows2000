// Wayback Machine support for Netscape Navigator: the same time machine as in Internet Explorer
// (archive year/date in the status bar, previous/next copy, year menu with grey years, compare, archive options,
// closest-copy fallback, "no copy" page, slow-archive notice).
import { el, button, popup } from "../ui/index.js";
import { getLang } from "../ui/i18n.js";
import { openDlgWindow } from "../accessories/winrar-dlg.js";

const WB = "https://web.archive.org/web/";
const WB_RE = /web\.archive\.org\/web\/(\d+)[a-z_]*\/(https?:\/\/.+)$/i;
const SANDBOX_WB = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";
export const WB_YEARS = Array.from({ length: 14 }, (_, i) => String(1996 + i));
const norm = (u) => String(u).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/:80(?=\/|$)/, "").replace(/\/$/, "");

export function createNsWayback(env) {
  const { ctx, viewport, msg, getCurrent, followed, setTitle, setLoading, rerender, mkFrame } = env;
  let year = String(ctx.settings.get("ieYear") || "2000"), stamp = "", frame = null, loadTimer = 0, years = null, token = 0, snapBusy = false, popWasOpen = false;
  const tr = () => getLang() === "tr";
  const on = (u = getCurrent()) => ctx.settings.get("ieArchive") !== false && /^https?:/i.test(u);
  const stampDate = (st) => (st && st.length >= 8 ? (tr() ? st.slice(6, 8) + "/" + st.slice(4, 6) + "/" + st.slice(0, 4) : +st.slice(4, 6) + "/" + +st.slice(6, 8) + "/" + st.slice(0, 4)) : st && /^\d{4}$/.test(st) ? st : year);
  const datePane = el("div", { class: "ns-pane ns-pane-date", title: "Wayback Machine" });
  const wbPane = el("div", { class: "ns-pane ns-pane-wb" });
  const setDate = () => {
    const web = /^https?:/i.test(getCurrent()), o = on();
    datePane.textContent = o ? stampDate(stamp) : "";
    datePane.style.visibility = o ? "" : "hidden";
    wbPane.textContent = web ? (ctx.settings.get("ieArchive") === false ? (tr() ? "Canlı" : "Live") : "Wayback Machine") : "";
    wbPane.style.visibility = web ? "" : "hidden";
  };
  const flash = (t) => { msg.textContent = t; setTimeout(() => { if (msg.textContent === t) msg.textContent = "Document: Done"; }, 2500); };
  const loadEnd = (text = "Document: Done") => { clearTimeout(loadTimer); setLoading(false); msg.textContent = text; };
  const loadStart = (what) => {
    clearTimeout(loadTimer); setLoading(true); msg.textContent = what;
    loadTimer = setTimeout(() => { loadEnd(); if (frame) slowNote(); }, 45000);
  };
  const slowNote = () => viewport.prepend(el("div", { class: "ie-infobar" },
    el("span", { text: tr() ? "Arşiv yanıt vermiyor." : "The archive is not responding." }),
    el("span", { class: "ie-infobar-btns" },
      button(tr() ? "Yeniden dene" : "Try again", () => rerender()),
      button(tr() ? "Canlı siteyi aç" : "Open the live site", () => { ctx.settings.set("ieArchive", false); rerender(); }))));

  // the Wayback playback page reports its navigation to us
  const onMessage = (e) => {
    if (typeof e.data !== "string" || !frame || e.source !== frame.contentWindow) return;
    let d; try { d = JSON.parse(e.data); } catch { return; }
    if (!d?.event) return;
    const m = String(d.pageUrl || "").match(WB_RE);
    if (!m) return;
    if (d.event === "pagehide") return loadStart("Connecting to " + m[2] + "...");
    if (m[1].length === 14) stamp = m[1];
    if (norm(m[2]) !== norm(getCurrent())) followed(m[2]);
    if (d.pageTitle) setTitle(d.pageTitle);
    setDate();
    if (d.event === "domContentLoaded") loadEnd();
  };
  window.addEventListener("message", onMessage);

  // archive.org/wayback/available answers JSONP (a <script> tag), which works from any site; CDX does not.
  let jpN = 0;
  const jsonp = (url, ms = 15000) => new Promise((ok, no) => {
    const cb = "__nswb" + ++jpN + "_" + Date.now().toString(36), sc = document.createElement("script");
    let t = 0;
    const done = (v, err) => { clearTimeout(t); delete window[cb]; sc.remove(); err ? no(err) : ok(v); };
    window[cb] = (d) => done(d);
    sc.onerror = () => done(null, new Error("jsonp"));
    t = setTimeout(() => done(null, new Error("timeout")), ms);
    sc.src = url + "&callback=" + cb;
    document.head.append(sc);
  });
  async function closestSnap(url, st) {
    try {
      const d = await jsonp("https://archive.org/wayback/available?url=" + encodeURIComponent(url) + "&timestamp=" + (st + "0101000000").slice(0, 14));
      const c = d?.archived_snapshots?.closest;
      return c?.available ? c.timestamp : null;
    } catch { return undefined; }
  }
  const snapCache = new Map(), probeFail = new Set();
  async function loadYears() {
    const key = norm(getCurrent()), hit = snapCache.get(key);
    if (hit) return (years = hit.years);
    const url = getCurrent();
    const res = await Promise.all([...WB_YEARS.map((y) => closestSnap(url, y + "0701")), closestSnap(url, "1996"), closestSnap(url, "2026")]);
    if (res.slice(0, WB_YEARS.length).every((r) => r === undefined)) { probeFail.add(key); return (years = null); }
    const has = WB_YEARS.filter((y, i) => res[i] && res[i].slice(0, 4) === y);
    snapCache.set(key, { years: has, first: res[WB_YEARS.length] || null, last: res[WB_YEARS.length + 1] || null });
    return (years = has);
  }
  const snapStep = async (dir) => {
    const cur0 = getCurrent();
    if (snapBusy || !on(cur0)) return;
    snapBusy = true;
    const cur = (stamp || year + "0101").slice(0, 8);
    msg.textContent = tr() ? "Kayıt aranıyor..." : "Looking for a copy...";
    let found = null;
    try {
      for (let days = 1, n = 0; n < 14 && !found; days *= 2, n++) {
        const p = new Date(Date.UTC(+cur.slice(0, 4), +cur.slice(4, 6) - 1, +cur.slice(6, 8) + dir * days)).toISOString().slice(0, 10).replace(/-/g, "");
        if (p < "19960101" || p > new Date().toISOString().slice(0, 10).replace(/-/g, "")) break;
        const ts = await closestSnap(cur0, p);
        if (ts === undefined) throw new Error("offline");
        if (ts && (dir < 0 ? ts.slice(0, 8) < cur : ts.slice(0, 8) > cur)) found = ts;
      }
    } catch { snapBusy = false; return flash(tr() ? "Arşive ulaşılamadı." : "Could not reach the archive."); }
    snapBusy = false;
    if (found) { year = found.slice(0, 4); stamp = found; return rerender(); }
    flash(tr() ? (dir < 0 ? "Bu sayfanın daha eski kaydı yok." : "Bu sayfanın daha yeni kaydı yok.") : (dir < 0 ? "There is no earlier copy of this page." : "There is no later copy of this page."));
  };
  const setYear = (y) => { year = String(y); stamp = ""; rerender(); };
  const openCompare = () => {
    const url = getCurrent();
    if (!/^https?:/i.test(url)) return;
    const a = stamp ? stamp.slice(0, 4) : year, hit = snapCache.get(norm(url));
    const ys = hit?.years?.length > 1 ? hit.years : WB_YEARS;
    let b = ys.find((y) => y > a) || [...ys].reverse().find((y) => y < a) || a;
    if (b === a) b = String(Math.min(2009, +a + 3));
    const cw = ctx.wm.create({ title: (tr() ? "Karşılaştır - " : "Compare - ") + url, icon: "netscape", width: 940, height: 600, appId: "netscape" });
    const sels = [];
    const pane = (y0) => {
      const sel = el("select", {}, ...ys.map((y) => el("option", { value: y, text: y, selected: y === y0 })));
      const f = el("iframe", { class: "ie-frame", sandbox: SANDBOX_WB, referrerpolicy: "no-referrer", title: "Wayback" });
      const load = () => { f.src = WB + sel.value + "if_/" + url; };
      sel.addEventListener("change", load); load(); sels.push(sel);
      return el("div", { class: "ie-cmp-pane" }, el("div", { class: "ie-cmp-head" }, el("span", { text: tr() ? "Yıl:" : "Year:" }), sel), f);
    };
    cw.setContent(el("div", { class: "ie-cmp" }, pane(a), pane(b)));
    if (!hit) loadYears().then((list) => { if (!list?.length) return; for (const sel of sels) { const v = sel.value; sel.replaceChildren(...list.map((y) => el("option", { value: y, text: y, selected: y === v }))); if (!list.includes(v)) sel.append(el("option", { value: v, text: v, selected: true })); } }).catch(() => {});
  };
  const chooseDate = async () => {
    const v = await ctx.dialogs.prompt(tr() ? "Bir yıl (1996-2009) veya tarih (GG/AA/YYYY) girin:" : "Enter a year (1996-2009) or a date (MM/DD/YYYY):", stampDate(stamp), { title: tr() ? "Tarih Seç" : "Choose Date" });
    if (!v) return;
    const d = v.trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/), y = v.trim().match(/^\d{4}$/);
    if (d) { const [dd, mm] = tr() ? [d[1], d[2]] : [d[2], d[1]]; year = d[3]; stamp = d[3] + mm.padStart(2, "0") + dd.padStart(2, "0"); rerender(); }
    else if (y) setYear(v.trim());
    else ctx.dialogs.message(tr() ? "Lütfen 2000 gibi bir yıl veya 24/01/2001 gibi bir tarih girin." : "Please enter a year such as 2000 or a date such as 1/24/2001.", { title: "Netscape", icon: "warning" });
  };
  const archiveOptions = () => {
    const T = tr() ? { title: "Arşiv Seçenekleri", src: "Kaynak", wb: "Wayback Machine (geçmiş web arşivi)", live: "Canlı (sitenin şu anki sürümü)", year: "Varsayılan arşiv yılı:", ok: "Tamam", cancel: "İptal" } : { title: "Archive Options", src: "Source", wb: "Wayback Machine (web archive)", live: "Live (the site as it is today)", year: "Default archive year:", ok: "OK", cancel: "Cancel" };
    const isLive = ctx.settings.get("ieArchive") === false;
    const rWb = el("input", { type: "radio", name: "nssrc", id: "nswbo-wb", checked: !isLive }), rLive = el("input", { type: "radio", name: "nssrc", id: "nswbo-live", checked: isLive });
    const sel = el("select", {}, ...WB_YEARS.map((y) => el("option", { value: y, text: y, selected: y === year })));
    let d;
    const row = el("div", { class: "rd-btnrow" },
      button(T.ok, () => {
        ctx.settings.set("ieArchive", !rLive.checked);
        if (!rLive.checked) { ctx.settings.set("ieYear", sel.value); year = sel.value; stamp = ""; }
        d.close(); rerender();
      }, { class: "default-button" }),
      button(T.cancel, () => d.close()));
    d = openDlgWindow(ctx, { title: T.title, buttons: row, content: el("div", { class: "wbo" },
      el("fieldset", {}, el("legend", { text: T.src }),
        el("div", { class: "field-row" }, rWb, el("label", { for: "nswbo-wb", text: T.wb })),
        el("div", { class: "field-row" }, rLive, el("label", { for: "nswbo-live", text: T.live }))),
      el("div", { class: "field-row" }, el("label", { text: T.year }), sel)) });
  };
  const popAt = (anchor, items, up) => {
    const r = anchor.getBoundingClientRect();
    popup(items, r.left, up ? r.top : r.bottom, { anchor });
    const m = [...document.querySelectorAll(".popup-menu")].pop();
    if (m && up) { m.style.top = "auto"; m.style.bottom = Math.max(0, innerHeight - r.top) + "px"; }
    if (m) m.style.left = Math.max(0, Math.min(r.left, innerWidth - m.offsetWidth - 2)) + "px";
  };
  const yearMenu = (anchor = datePane, up = true) => {
    const t = tr(), key = norm(getCurrent()), info = snapCache.get(key) || null, pending = !info && !probeFail.has(key);
    if (pending) loadYears().then(() => { if (document.querySelector(".popup-menu") && yearMenu.anchor === anchor) yearMenu(anchor, up); }).catch(() => {});
    yearMenu.anchor = anchor;
    const fmt = (s) => (s ? stampDate(s.slice(0, 8)) : "?");
    const infoItems = pending ? [{ label: t ? "Kayıtlar denetleniyor..." : "Checking copies...", disabled: true }, { separator: true }] : info ? [
      { label: info.years.length ? (t ? `Kayıt: ${info.years[0]}–${info.years[info.years.length - 1]} arası, ${info.years.length} yılda` : `Copies: ${info.years[0]}–${info.years[info.years.length - 1]}, in ${info.years.length} years`) : (t ? "1996–2009 arası kayıt yok" : "No copies from 1996 to 2009"), disabled: true },
      { label: (t ? "İlk: " : "First: ") + fmt(info.first) + (t ? "  Son: " : "  Last: ") + fmt(info.last), disabled: true },
      { separator: true }] : [];
    popAt(anchor, [
      ...infoItems,
      ...WB_YEARS.map((y) => ({ label: y, radio: true, checked: y === (stamp ? stamp.slice(0, 4) : year), disabled: pending || (!!info && !info.years.includes(y)), action: () => { ctx.settings.set("ieArchive", true); setYear(y); } })),
      { separator: true },
      { label: "Previous Snapshot", action: () => snapStep(-1) },
      { label: "Next Snapshot", action: () => snapStep(1) },
      { label: "Compare Years...", action: openCompare },
      { separator: true },
      { label: "Choose Date...", action: chooseDate },
      { label: "Wayback Calendar...", action: () => window.open("https://web.archive.org/web/*/" + getCurrent(), "_blank", "noopener,noreferrer") },
      { separator: true },
      { label: "Archive Options...", action: archiveOptions },
    ], up);
  };
  const modeMenu = () => {
    const live = ctx.settings.get("ieArchive") === false;
    popAt(wbPane, [
      { label: "Wayback Machine", radio: true, checked: !live, action: () => { ctx.settings.set("ieArchive", true); rerender(); } },
      { label: tr() ? "Canlı" : "Live", radio: true, checked: live, action: () => { ctx.settings.set("ieArchive", false); rerender(); } },
    ], true);
  };
  // a click on a pane that closes its own open menu must not reopen it
  const onPopDown = (e) => { popWasOpen = !!document.querySelector(".popup-menu") && !!e.target.closest?.(".ns-pane,.ns-pt-arch"); };
  document.addEventListener("pointerdown", onPopDown, true);
  datePane.addEventListener("click", () => { if (popWasOpen) { popWasOpen = false; return; } if (/^https?:/i.test(getCurrent())) yearMenu(); });
  wbPane.addEventListener("click", () => { if (popWasOpen) { popWasOpen = false; return; } if (/^https?:/i.test(getCurrent())) modeMenu(); });

  /** Open an http(s) page in the viewport: from the archive (closest copy, notices) or live. */
  function show(current) {
    const url = new URL(current), live = !on(current), my = ++token, t = tr();
    frame = null; setDate();
    if (!live) loadYears().catch(() => {});
    loadStart("Connecting to " + url.hostname + "...");
    setTitle(url.hostname);
    const open = (src, note) => {
      const f = mkFrame({ src, title: url.hostname, sandbox: live ? "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" : SANDBOX_WB, referrerpolicy: "no-referrer" });
      frame = live ? null : f;
      f.addEventListener("load", () => loadEnd());
      viewport.replaceChildren(...(note ? [el("div", { class: "ie-infobar" }, el("span", { text: note }), button("×", (e) => e.currentTarget.parentElement.remove(), { class: "ie-infobar-x", title: "Close" }))] : []), f);
    };
    if (live) return open(current);
    const want = stamp || year;
    closestSnap(current, want).then((ts) => {
      if (my !== token) return;
      if (ts === undefined) return open(WB + want + "if_/" + current);
      if (ts === null) {
        loadEnd(t ? "Bu sayfanın arşiv kaydı yok" : "No archived copy of this page");
        viewport.replaceChildren(el("div", { class: "ie-legacy-page" },
          t ? "Wayback Machine'de bu sayfanın hiçbir kaydı bulunamadı." : "The Wayback Machine has no copy of this page.", el("br"), el("br"),
          button(t ? "Canlı siteyi aç" : "Open the live site", () => { ctx.settings.set("ieArchive", false); rerender(); })));
        return;
      }
      const gotY = ts.slice(0, 4), wantY = want.slice(0, 4);
      if (gotY === wantY) return open(WB + want + "if_/" + current);
      const when = stampDate(ts.slice(0, 8));
      year = gotY; stamp = ts; setDate();
      open(WB + ts + "if_/" + current, t ? `Bu sayfa ${wantY} yılında arşivlenmemiş. En yakın kayıt (${when}) gösteriliyor.` : `This page was not archived in ${wantY}. Showing the closest copy (${when}).`);
    });
  }
  return {
    datePane, wbPane, show, setDate, yearMenu, modeMenu, snapStep, openCompare, chooseDate, archiveOptions, setYear, stampDate, on,
    /** archive date of the page being shown (for dated bookmarks) */
    get date() { return stamp || year; },
    useDate(d) { const s = String(d || ""); if (!s) return; year = s.slice(0, 4); stamp = s.length >= 8 ? s.slice(0, 8) : ""; ctx.settings.set("ieArchive", true); },
    resetStamp() { stamp = ""; },
    stop() { clearTimeout(loadTimer); frame = null; },
    destroy() { clearTimeout(loadTimer); window.removeEventListener("message", onMessage); document.removeEventListener("pointerdown", onPopDown, true); },
  };
}
