import { el, button, icon, menuBar, popup, separator } from "../ui/index.js";

const HKEY = "nsHistory";

/* ------------------------------------------------------------------ History store */
export function recordVisit(ctx, url, title) {
  if (!url || url === "about:blank") return;
  const h = ctx.settings.get(HKEY) || {}, now = Date.now(), e = h[url];
  h[url] = e ? { ...e, title: title || e.title, last: now, count: e.count + 1 } : { title: title || url, first: now, last: now, count: 1 };
  ctx.settings.set(HKEY, h);
}
export function setVisitTitle(ctx, url, title) {
  const h = ctx.settings.get(HKEY) || {};
  if (h[url] && title) { h[url].title = title; ctx.settings.set(HKEY, h); }
}
export const days = (ctx) => Math.max(0, parseInt(ctx.settings.get("nsHistDays") ?? 9, 10) || 0);
export function expireHistory(ctx) {
  const h = ctx.settings.get(HKEY) || {}, cutoff = Date.now() - days(ctx) * 86400000;
  let changed = false;
  for (const [u, e] of Object.entries(h)) if (e.last < cutoff) { delete h[u]; changed = true; }
  if (changed) ctx.settings.set(HKEY, h);
}
const fmt = (t) => new Date(t).toLocaleString();

/* ------------------------------------------------------------------ History window */
let histWin = null;
export function openHistoryWindow(ctx, { go }) {
  if (histWin?.w.el.isConnected) { histWin.render(); histWin.w.focus?.(); return histWin.w; }
  const w = ctx.wm.create({ title: "History", icon: "netscape", width: 640, height: 400, x: 120, y: 90, appId: "netscape-history" });
  const cols = [["Title", "title", 190], ["Location", "url", 200], ["First Visited", "first", 120], ["Last Visited", "last", 120], ["Expiration", "exp", 120], ["Visit Count", "count", 70]];
  let sortKey = "last", asc = false, sel = null;
  const head = el("div", { class: "nsh-row nsh-head" }), body = el("div", { class: "nsh-body", tabindex: 0 }), status = el("div", { class: "nsh-status" });
  const rows = () => {
    expireHistory(ctx);
    const h = ctx.settings.get(HKEY) || {};
    return Object.entries(h).map(([url, e]) => ({ url, ...e, exp: e.last + days(ctx) * 86400000 }));
  };
  function render() {
    head.replaceChildren(...cols.map(([t, k, wd]) => el("div", { class: "nsh-cell", style: { width: wd + "px" }, text: t + (sortKey === k ? (asc ? " ▲" : " ▼") : ""), onclick: () => { asc = sortKey === k ? !asc : true; sortKey = k; render(); } })));
    const list = rows().sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (typeof x === "string" ? x.localeCompare(y) : x - y) * (asc ? 1 : -1); });
    body.replaceChildren(...list.map((e) => {
      const r = el("div", { class: "nsh-row" + (sel === e.url ? " sel" : "") },
        ...cols.map(([, k, wd], i) => el("div", { class: "nsh-cell", style: { width: wd + "px" } }, i === 0 ? icon("nshtml", 16) : null, ["first", "last", "exp"].includes(k) ? fmt(e[k]) : String(e[k]))));
      r.addEventListener("pointerdown", () => { sel = e.url; body.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel")); r.classList.add("sel"); });
      r.addEventListener("dblclick", () => go(e.url));
      return r;
    }));
    status.textContent = `${list.length} document${list.length === 1 ? "" : "s"}`;
  }
  const del = () => { if (!sel) return; const h = ctx.settings.get(HKEY) || {}; delete h[sel]; ctx.settings.set(HKEY, h); sel = null; render(); };
  const menus = menuBar({
    File: [{ label: "Go to Page", action: () => sel && go(sel) }, separator(), { label: "Close", shortcut: "Ctrl+W", action: () => w.close() }],
    Edit: [{ label: "Delete", shortcut: "Del", action: del }, { label: "Clear History", action: () => { ctx.settings.set(HKEY, {}); render(); } }],
    View: cols.map(([t, k]) => ({ label: "Sort by " + t, action: () => { sortKey = k; asc = k === "title" || k === "url"; render(); } })),
    Help: [{ label: "About History", action: () => ctx.dialogs.message("The History window lists the pages you have visited recently. Double-click a page to return to it.", { title: "History", icon: "info" }) }],
  });
  body.addEventListener("keydown", (e) => e.key === "Delete" && del());
  w.setContent(menus, el("div", { class: "nsh-wrap" }, head, body), status);
  w.onClose = () => { histWin = null; return true; };
  histWin = { w, render };
  render();
  return w;
}

/* ------------------------------------------------------------------ Page Info */
export function openPageInfo(ctx, { url, title, loadedAt }) {
  const isHttps = /^https:/i.test(url), isLocal = /^(about:|[A-Z]:)/i.test(url);
  const w = ctx.wm.create({ title: `Page Info for ${url}`, icon: "netscape", width: 560, height: 360, x: 130, y: 100, appId: "netscape-pageinfo" });
  const rows = [
    ["Title", title || "(none)"],
    ["Location (URL)", url],
    ["File MIME Type", isLocal ? "text/html" : "text/html (embedded document)"],
    ["Source", isLocal ? "Currently in memory cache" : "Currently in disk cache"],
    ["Local cache file", "none"],
    ["Last Modified", "Unknown"],
    ["Last Updated", loadedAt ? new Date(loadedAt).toUTCString() : "Unknown"],
    ["Content Length", "Unknown"],
    ["Expires", "No date given"],
    ["Charset", "iso-8859-1"],
    ["Security", isHttps ? "This is a secure document that uses a medium-grade encryption key suited for U.S. export (RC4, 128 bit)." : "This document is not secure. It was not encrypted before being sent over the network."],
  ];
  w.setContent(el("div", { class: "nspi" },
    el("div", { class: "nspi-hd", text: "Document Info" }),
    el("div", { class: "nspi-body" }, ...rows.map(([k, v]) => el("p", {}, el("b", { text: k }), "  ", v))),
    el("div", { class: "nspi-btns" }, button("Close", () => w.close(), { class: "default" }))));
  return w;
}

/* ------------------------------------------------------------------ Preferences */
export function openPreferences(ctx, { onApply }) {
  const w = ctx.wm.create({ title: "Preferences", icon: "netscape", width: 620, height: 470, x: 110, y: 60, dialog: true, resizable: false, maximizable: false, appId: "netscape-prefs" });
  const S = (k, d) => ctx.settings.get(k) ?? d;
  const state = { nsStartup: S("nsStartup", "Navigator"), nsToolbar: S("nsToolbar", "both"), nsStart: S("nsStart", "home"), nsHome: S("nsHome", "about:home"), nsHistDays: S("nsHistDays", 9),
    nsMailName: S("nsMailName", ""), nsMailEmail: S("nsMailEmail", ""), nsMailOrg: S("nsMailOrg", ""), nsMailServer: S("nsMailServer", "mail.example.com"), nsMailUser: S("nsMailUser", "") };
  const radio = (name, key, val, label) => { const i = el("input", { type: "radio", name, checked: state[key] === val }); i.addEventListener("change", () => (state[key] = val)); return el("label", { class: "nsp-opt" }, i, label); };
  const text = (key, label, wd = 260) => { const i = el("input", { type: "text", value: String(state[key]), class: "nsp-in", style: { width: wd + "px" } }); i.addEventListener("input", () => (state[key] = i.value)); return el("label", { class: "nsp-field" }, el("span", { text: label }), i); };
  const group = (t, ...kids) => el("fieldset", { class: "nsp-grp" }, el("legend", { text: t }), ...kids);
  const intro = (t, d) => el("div", {}, el("h2", { class: "nsp-h", text: t }), el("p", { class: "nsp-p", text: d }));
  const stub = (t) => el("div", {}, el("h2", { class: "nsp-h", text: t }), el("p", { class: "nsp-p", text: "There are no options to change on this page in this simulation." }));

  const pane = {
    Appearance: () => el("div", {}, intro("Appearance", "Change the appearance of the Navigator window."),
      group("On Startup, Launch", radio("su", "nsStartup", "Navigator", "Navigator"), radio("su", "nsStartup", "Messenger", "Messenger Mailbox"), radio("su", "nsStartup", "Collabra", "Collabra Discussions"), radio("su", "nsStartup", "Composer", "Page Composer")),
      group("Show Toolbar As", radio("tb", "nsToolbar", "both", "Pictures and Text"), radio("tb", "nsToolbar", "pictures", "Pictures Only"), radio("tb", "nsToolbar", "text", "Text Only"))),
    Fonts: () => stub("Fonts"), Colors: () => stub("Colors"),
    Navigator: () => el("div", {}, intro("Navigator", "Specify the home page location and how long your History list is kept."),
      group("Navigator Starts With", radio("ns", "nsStart", "blank", "Blank page"), radio("ns", "nsStart", "home", "Home page"), radio("ns", "nsStart", "last", "Last page visited")),
      group("Home Page", text("nsHome", "Location:", 300),
        el("div", { class: "nsp-row" }, button("Use Current Page", () => { state.nsHome = ctx.settings.get("nsLast") || state.nsHome; w.el.querySelector(".nsp-pane").replaceChildren(pane.Navigator()); }))),
      group("History", el("label", { class: "nsp-field" }, el("span", { text: "Pages in history expire after" }), el("input", { type: "text", class: "nsp-in", style: { width: "40px" }, value: String(state.nsHistDays), oninput: (e) => (state.nsHistDays = e.target.value) }), el("span", { text: "days" })),
        el("div", { class: "nsp-row" }, button("Clear History", () => ctx.settings.set(HKEY, {})), button("Clear Location Bar", () => ctx.settings.set("nsTyped", []))))),
    Languages: () => stub("Languages"), Applications: () => stub("Applications"),
    "Mail & Groups": () => el("div", {}, intro("Mail & Groups", "Set preferences for Messenger and Collabra."), el("p", { class: "nsp-p", text: "Expand the category to change your identity and mail server." })),
    Identity: () => el("div", {}, intro("Identity", "Specify your name and e-mail address."), group("Your Identity", text("nsMailName", "Your name:"), text("nsMailEmail", "E-mail address:"), text("nsMailOrg", "Organization:"))),
    Messages: () => stub("Messages"),
    "Mail Server": () => el("div", {}, intro("Mail Server", "Specify the servers Messenger uses."), group("Incoming Mail Server", text("nsMailUser", "Mail server user name:"), text("nsMailServer", "Incoming mail server:"))),
    "Groups Server": () => stub("Groups Server"), Directory: () => stub("Directory"),
    Composer: () => stub("Composer"), Offline: () => stub("Offline"), Advanced: () => stub("Advanced"),
  };
  const tree = [
    ["Appearance", ["Fonts", "Colors"]], ["Navigator", ["Languages", "Applications"]],
    ["Mail & Groups", ["Identity", "Messages", "Mail Server", "Groups Server", "Directory"]], ["Composer", []], ["Offline", []], ["Advanced", []],
  ];
  let cur = "Appearance";
  const expanded = new Set(["Appearance"]);
  const left = el("div", { class: "nsp-tree" }), right = el("div", { class: "nsp-pane" });
  function draw() {
    left.replaceChildren();
    for (const [name, kids] of tree) {
      const mkRow = (n, d, hasKids) => { const r = el("div", { class: "nsp-node" + (cur === n ? " sel" : ""), style: { paddingLeft: 4 + d * 16 + "px" } }, el("span", { class: "nsp-ar", text: hasKids ? (expanded.has(n) ? "▾" : "▸") : "" }), el("span", { text: n }));
        r.addEventListener("click", () => { if (hasKids) expanded.has(n) ? (cur === n || expanded.delete(n)) : expanded.add(n); cur = n; draw(); }); return r; };
      left.append(mkRow(name, 0, kids.length > 0));
      if (expanded.has(name)) kids.forEach((k) => left.append(mkRow(k, 1, false)));
    }
    right.replaceChildren(pane[cur]());
  }
  const apply = () => {
    const days = Math.max(0, parseInt(state.nsHistDays, 10) || 0);
    for (const [k, v] of Object.entries({ ...state, nsHistDays: days })) ctx.settings.set(k, v);
    onApply?.();
  };
  w.setContent(el("div", { class: "nsp" }, el("div", { class: "nsp-cols" }, left, right),
    el("div", { class: "nsp-btns" }, button("OK", () => { apply(); w.close(); }, { class: "default" }), button("Cancel", () => w.close()), button("Apply", apply), button("Help", () => ctx.dialogs.message("Choose a category on the left, then change the options on the right.", { title: "Preferences Help", icon: "info" })))));
  draw();
  return w;
}
