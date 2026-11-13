// ICQ 99b: ported from the win98.si ICQ app (contact list, registration, Find/Add Users, user details, history,
// system/status menus and the 12 built-in contacts). Contacts answer with a local rule-based persona instead of
// win98.si's remote AI. The "Uh-oh!" message sound is the real one from the ICQ 2001b installer.
import { el, button, popup, icon, separator } from "../ui/index.js";
import { t as tr } from "../ui/i18n.js";
import { openDlgWindow } from "../accessories/winrar-dlg.js";
import { getLang } from "../ui/i18n.js";
import { STATUSES, STATUS_LONG, FIELDS, DEFAULT_LIST, knocks, setDataLang, builtinNick, validUin, baseInfo, resolve, search, newUin, shownStatus, fmtTime, rand, diffInfo, reply } from "./icq-data.js";

const SND = "/assets/sounds/icq/";
const SKEY = "icq";
const plain = (s) => s.replace(/&&/g, "\u0001").replace(/&(?=\S)/g, "").replace(/\u0001/g, "&");
// "&Nickname:" -> Nickname with N underlined (the translator joins the pieces back into one label)
const mn = (s) => {
  const out = [], parts = s.split("&&");
  parts.forEach((p, k) => {
    const i = p.indexOf("&");
    if (i < 0 || i === p.length - 1) out.push(document.createTextNode(p));
    else { out.push(document.createTextNode(p.slice(0, i)), el("u", { text: p[i + 1] }), document.createTextNode(p.slice(i + 2))); }
    if (k < parts.length - 1) out.push(document.createTextNode("&"));
  });
  return out;
};
const statusLabel = (k) => STATUSES.find((s) => s[0] === k)[2];
const sicon = (k, w = 16) => el("img", { class: "icon", src: `/assets/icons/icq-${k}-16x16.png`, width: w, height: w, alt: "", draggable: "false" });

let inst = null; // single instance

export function openICQ(ctx) {
  if (inst && !inst.closed) { inst.win.focus(); return inst.win; }
  setDataLang(getLang());
  const S = Object.assign({ uin: 0, me: { nick: "", first: "", last: "", email: "", gender: "", age: "", city: "", state: "", country: "", phone: "", homepage: "", company: "", position: "", about: "", interests: "" }, status: "online", contacts: [], history: {}, unread: {}, dropped: [] }, ctx.settings.get(SKEY) || {});
  const lang = getLang();
  // contacts saved under the other language keep their (default) names in sync with the interface language
  for (const c of S.contacts) { const o = builtinNick(c.uin, lang === "tr" ? "en" : "tr"); if (o && c.nick === o && !c.info?.nick) c.nick = builtinNick(c.uin, lang) || c.nick; }
  const save = () => {
    ctx.settings.set(SKEY, S);
    // win98.si persists the ICQ store under HKCU\Software\Mirabilis\ICQ
    try { const k = "HKEY_CURRENT_USER\\Software\\Mirabilis\\ICQ"; ctx.registry?.set(k, "UIN", String(S.uin)); ctx.registry?.set(k, "Nick", S.me.nick || ""); ctx.registry?.set(k, "Status", S.status); } catch {}
  };
  const timers = new Set(), busy = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const play = (n) => { if (ctx.settings.get("muted") || ctx.settings.get("soundScheme") === "No Sounds") return; try { const a = new Audio(SND + n + ".wav"); a.volume = 1; a.play().catch(() => {}); } catch {} };
  const w = ctx.wm.create({ title: S.uin ? String(S.uin) : "ICQ", icon: "icq", width: 208, height: 370, x: 640, y: 60, appId: "icq", maximizable: false });
  inst = { win: w, closed: false };
  const anyUnread = () => Object.values(S.unread).some(Boolean);
  w.trayIcon = "icq-online"; w.trayAlways = true; w.trayFlashIcon = "icq-mail"; w.trayFlash = anyUnread; w.trayIconNow = () => "icq-" + (S.uin ? S.status : "offline");
  w.trayTitle = () => "ICQ" + (S.uin ? ` - ${S.me.nick || S.uin} (${statusLabel(S.status)})` : "");
  w.trayMenu = () => [{ label: "Open ICQ", bold: true, action: () => w.focus() }, { separator: true }, ...(S.uin ? statusItems() : []), { separator: true }, { label: "Shut Down", action: () => w.close() }];
  const attention = (win) => { if (win && !win.closed && (win.minimized || ctx.wm.active !== win)) { win.flashing = true; ctx.shell?.renderTasks?.(); } };
  const msgWins = new Map();
  w.onClose = () => { inst.closed = true; timers.forEach(clearTimeout); for (const mw of [...msgWins.values()]) mw.close(); return true; };

  let sel = null, renaming = null, blink = false, kw = "";
  const sorted = () => S.contacts.map((c) => ({ uin: c.uin, nick: c.nick, status: shownStatus(resolve(c), S.status, S.dropped) })).sort((a, b) => a.nick.localeCompare(b.nick));
  const hist = (uin) => S.history[uin] || (S.history[uin] = []);
  const addHist = (uin, from, text) => { const h = hist(uin); h.push({ from, text, time: Date.now() }); if (h.length > 50) h.splice(0, h.length - 50); save(); };
  const notice = (m) => ctx.dialogs.message(m, { title: "ICQ", icon: "warning" });

  // ---------- generic dialog ----------
  const dlg = (title, content, { ok = "OK", cancel = "Cancel", onOk, extra = [], width } = {}) => {
    let d;
    const row = el("div", { class: "rd-btnrow" });
    if (onOk) row.append(button(ok, () => { if (onOk() !== false) d.close(); }, { class: "default-button" }));
    for (const b of extra) row.append(b);
    if (cancel) row.append(button(cancel, () => d.close()));
    d = openDlgWindow(ctx, { title, content: el("div", { class: "icq-dlg", style: width ? { width: width + "px" } : null }, content), buttons: row });
    d.el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); d.close(); } else if (e.key === "Enter" && onOk && e.target.tagName === "INPUT" && e.target.type !== "button") { e.preventDefault(); if (onOk() !== false) d.close(); } });
    return d;
  };
  const frow = (label, input, cls = "icq-lbl") => el("div", { class: "field-row" }, el("label", { class: cls }, ...mn(label)), input);

  // ---------- registration ----------
  const register = () => {
    const f = { nick: "", first: "", last: "", email: "" };
    let own = false;
    const inputs = {};
    const mk = (k, label) => { const i = el("input", { type: "text", class: "icq-fill", oninput: (e) => (f[k] = e.target.value) }); inputs[k] = i; return frow(label, i); };
    const rNew = el("input", { type: "radio", name: "icq-reg", checked: true, onchange: () => { own = false; uinIn.disabled = true; } });
    const rOld = el("input", { type: "radio", name: "icq-reg", onchange: () => { own = true; uinIn.disabled = false; uinIn.focus(); } });
    const uinIn = el("input", { type: "text", inputmode: "numeric", maxlength: 9, class: "icq-uin", disabled: true, oninput: (e) => (e.target.value = e.target.value.replace(/\D/g, "")) });
    const content = el("div", { style: { width: "260px" } },
      el("fieldset", { class: "icq-fs" }, el("legend", { text: "ICQ# (UIN)" }),
        el("div", { class: "field-row" }, rNew, el("label", {}, ...mn("Register a ne&w ICQ#"))),
        el("div", { class: "field-row" }, rOld, el("label", {}, ...mn("I already have an ICQ# (&UIN):")), uinIn)),
      el("p", { class: "icq-p", text: "Enter your details:" }),
      mk("nick", "&Nickname:"), mk("first", "&First Name:"), mk("last", "&Last Name:"), mk("email", "&E-mail:"));
    const d = dlg("ICQ Registration", content, {
      onOk: () => {
        if (!f.nick.trim()) return false;
        if (own && !validUin(uinIn.value)) { notice("Please enter a valid ICQ# (UIN)."); return false; }
        const uin = own ? Number(uinIn.value) : newUin();
        S.me = { ...S.me, ...f, nick: f.nick.trim() };
        S.uin = uin; S.status = "online";
        S.contacts = DEFAULT_LIST.filter((u) => u !== uin).map((u) => ({ uin: u, nick: baseInfo(u).nick }));
        save(); w.setTitle(String(uin)); render(); scheduleKnock();
      },
    });
    d.onClose = () => { if (!S.uin) w.close(); return true; };
    inputs.nick.focus();
  };

  // ---------- Find / Add users ----------
  const findAdd = (initial = "") => {
    let found = search(initial), idx = 0, ran = !!initial.trim();
    const kwIn = el("input", { type: "text", class: "icq-fill", value: initial });
    const tbody = el("tbody"), none = el("p", { class: "icq-none" });
    const addBtn = button("Add User", () => add(), { class: "icq-addbtn" });
    addBtn.replaceChildren(...mn("&Add User"));
    const has = (u) => S.contacts.some((c) => c.uin === u);
    const add = () => { const m = found[idx]; if (m && !has(m.uin)) { S.contacts.push({ uin: m.uin, nick: baseInfo(m.uin).nick }); save(); render(); draw(); } };
    const draw = () => {
      tbody.replaceChildren(...found.map((m, i) => el("tr", { class: i === idx ? "highlighted" : "", onmousedown: () => { idx = i; [...tbody.children].forEach((r, j) => r.classList.toggle("highlighted", j === i)); addBtn.disabled = has(found[i].uin); }, ondblclick: add },
        el("td", { text: m.nick }), el("td", { text: `${m.first} ${m.last}` }), el("td", { text: String(m.uin) }), el("td", { text: m.city }))));
      none.textContent = ran && !found.length ? "No users found." : "";
      addBtn.disabled = !found[idx] || has(found[idx].uin);
    };
    const go = () => { found = search(kwIn.value); idx = 0; ran = true; draw(); };
    const searchBtn = button("Search", go); searchBtn.replaceChildren(...mn("&Search"));
    kwIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); go(); } });
    const content = el("div", { style: { width: "340px" } },
      el("div", { class: "field-row" }, el("label", {}, ...mn("Search &keyword:")), kwIn, searchBtn),
      el("div", { class: "sunken-panel icq-found" },
        el("table", { class: "interactive icq-tbl" }, el("thead", {}, el("tr", {}, ...["Nickname", "Name", "ICQ#", "City"].map((h) => el("th", { text: h })))), tbody), none));
    draw();
    const d = dlg("Find/Add Users to Your List", content, { cancel: null, extra: [addBtn, button("Close", () => d.close())] });
    kwIn.focus();
  };

  // ---------- user details / my details ----------
  const details = (uin) => {
    const c = uin ? S.contacts.find((x) => x.uin === uin) : null;
    const isC = !!c;
    const cur = isC ? resolve(c) : { ...S.me };
    const f = { ...cur };
    let uinVal = String(isC ? uin : S.uin), notes = isC ? c.notes || "" : "";
    const pages = ["Main", "Home", "Work", "More", "About", "Interests", ...(isC ? ["Notes"] : [])];
    let page = "Main";
    const body = el("div", { class: "icq-details" });
    const strip = el("menu", { role: "tablist", class: "icq-tabs" });
    const inp = (k, label) => frow(label, el("input", { type: "text", class: "icq-fill", value: f[k] || "", oninput: (e) => (f[k] = e.target.value) }));
    const area = (label, get, set) => [el("label", {}, ...mn(label)), el("textarea", { class: "icq-details-text", oninput: (e) => set(e.target.value) }, get())];
    const paint = () => {
      strip.replaceChildren(...pages.map((p) => el("li", { role: "tab", "aria-selected": String(p === page) }, el("a", { tabindex: 0, text: p, onclick: () => { page = p; paint(); } }))));
      const rows = {
        Main: () => [inp("nick", "&Nickname:"), inp("first", "&First Name:"), inp("last", "&Last Name:"), inp("email", "&E-mail:"),
          frow("IC&Q#:", el("input", { type: "text", inputmode: "numeric", maxlength: 9, class: "icq-fill", value: uinVal, oninput: (e) => { e.target.value = e.target.value.replace(/\D/g, ""); uinVal = e.target.value; } })),
          ...(isC ? [el("div", { class: "field-row" }, el("label", { class: "icq-lbl", text: "Status:" }), el("input", { type: "text", readonly: true, class: "icq-fill", value: STATUS_LONG[shownStatus(resolve(c), S.status, S.dropped)] }))] : [])],
        Home: () => [inp("city", "&City:"), inp("state", "S&tate:"), inp("country", "C&ountry:"), inp("phone", "&Phone:"), inp("homepage", "&Homepage:")],
        Work: () => [inp("company", "&Company:"), inp("position", "&Position:")],
        More: () => {
          const age = inp("age", "&Age:");
          const sel = el("select", { onchange: (e) => (f.gender = e.target.value) }, ...[["", "Not specified"], ["Female", "Female"], ["Male", "Male"]].map(([v, t]) => el("option", { value: v, text: t, selected: f.gender === v })));
          return [age, el("div", { class: "field-row" }, el("label", { class: "icq-lbl" }, ...mn("&Gender:")), sel)];
        },
        About: () => area("&About:", () => f.about, (v) => (f.about = v)),
        Interests: () => area("&Interests (separate with commas):", () => f.interests, (v) => (f.interests = v)),
        Notes: () => [...area("&Notes:", () => notes, (v) => (notes = v)), el("p", { class: "icq-p", text: "Only you can see your notes about this user." })],
      };
      body.replaceChildren(...rows[page]());
    };
    paint();
    const title = isC ? `User Details - ${c.nick}` : `View/Change My Details - ${S.uin}`;
    const content = el("div", { style: { width: "300px" } }, strip, el("div", { class: "icq-panel", role: "tabpanel" }, body));
    dlg(title, content, {
      onOk: () => {
        if (!f.nick.trim()) return false;
        if (!validUin(uinVal)) { notice("Please enter a valid ICQ# (UIN)."); return false; }
        const nu = Number(uinVal);
        if (nu !== (isC ? uin : S.uin) && (nu === S.uin || S.contacts.some((x) => x.uin === nu))) { notice(nu === S.uin ? "This is your own ICQ#." : "This ICQ# is already in your Contact List."); return false; }
        f.nick = f.nick.trim();
        if (isC) {
          const base = baseInfo(c.base ?? c.uin);
          const wasDefault = c.nick === resolve(c).nick;
          if (wasDefault && f.nick) c.nick = f.nick;
          if (nu !== uin) { c.base = c.base ?? c.uin; c.uin = nu; for (const key of ["history", "unread"]) if (uin in S[key]) { S[key][nu] = S[key][uin]; delete S[key][uin]; } S.dropped = S.dropped.map((u) => (u === uin ? nu : u)); const mw = msgWins.get(uin); if (mw) { msgWins.delete(uin); msgWins.set(nu, mw); mw.uin = nu; mw.setTitle(`Message Session with ${c.nick}`); } }
          c.info = diffInfo(base, f); c.notes = notes; sel = nu;
        } else { S.me = f; S.uin = nu; w.setTitle(String(nu)); }
        save(); render();
      },
    });
  };

  // ---------- history ----------
  const history = (uin) => {
    const c = S.contacts.find((x) => x.uin === uin);
    const h = S.history[uin] || [];
    const panel = el("div", { class: "sunken-panel icq-history" },
      ...h.map((m) => el("p", { class: m.from === "system" ? "icq-notice" : "" }, el("b", { text: `${m.from === "me" ? S.me.nick : m.from === "them" ? c.nick : "ICQ System"} (${fmtTime(m.time)})` }), el("br"), m.text)),
      h.length ? null : el("p", { text: "No messages." }));
    dlg(`History - ${c.nick}`, el("div", { style: { width: "300px" } }, panel), { ok: "Close", cancel: null, onOk: () => true });
  };

  // ---------- message session window ----------
  const openMsg = (uin) => {
    const c = S.contacts.find((x) => x.uin === uin);
    if (!c) return;
    const ex = msgWins.get(uin);
    if (ex) { ex.focus(); readMsgs(uin); return ex; }
    const mw = ctx.wm.create({ title: `Message Session with ${c.nick}`, icon: "icq", width: 330, height: 300, appId: "icqmsg" });
    mw.uin = uin;
    msgWins.set(uin, mw);
    mw.onClose = () => { if (mw.uin !== undefined) msgWins.delete(mw.uin); return true; };
    const log = el("div", { class: "icq-msg-text" });
    const input = el("textarea", { class: "icq-msg-input", rows: 4 });
    const paint = () => {
      const cc = S.contacts.find((x) => x.uin === mw.uin);
      log.replaceChildren(...(S.history[mw.uin] || []).map((m) => el("p", { class: m.from === "system" ? "icq-notice" : "" }, el("b", { text: `${m.from === "me" ? S.me.nick : m.from === "them" ? cc.nick : "ICQ System"} (${fmtTime(m.time)})` }), el("br"), m.text)));
      log.scrollTop = log.scrollHeight;
    };
    mw.paint = paint;
    const send = () => {
      const t = input.value.trim();
      if (!t) return;
      input.value = "";
      addHist(mw.uin, "me", t); play("sent"); paint(); respond(mw.uin);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    mw.setContent(el("div", { class: "icq-msg" }, log, input, el("div", { class: "icq-msgbtns" }, button("Send", send, { class: "default-button" }), button("Close", () => mw.close()))));
    mw.el.addEventListener("pointerdown", () => readMsgs(mw.uin), true);
    input.addEventListener("focus", () => readMsgs(mw.uin));
    paint(); readMsgs(uin); input.focus();
    return mw;
  };
  const readMsgs = (uin) => { if (S.unread[uin]) { S.unread[uin] = 0; save(); render(); } const mw = msgWins.get(uin); if (mw) mw.flashing = false; };

  // ---------- incoming messages ----------
  const incoming = (uin, text) => {
    const h = hist(uin); h.push({ from: "them", text, time: Date.now() }); if (h.length > 50) h.shift();
    const mw = msgWins.get(uin);
    if (mw && !mw.closed) { mw.paint?.(); if (mw.minimized || ctx.wm.active !== mw) { mw.flashing = true; S.unread[uin] = (S.unread[uin] || 0) + 1; } }
    else { S.unread[uin] = (S.unread[uin] || 0) + 1; }
    save(); play("message"); render(); attention(w); if (mw) ctx.shell?.renderTasks?.();
  };
  const isUp = (uin) => { const c = S.contacts.find((x) => x.uin === uin); return c && S.status !== "offline" && !S.dropped.includes(uin) && shownStatus(resolve(c), S.status, S.dropped) !== "offline"; };
  const respond = (uin) => {
    if (busy.has(uin)) return;
    const c = S.contacts.find((x) => x.uin === uin);
    if (!c) return;
    if (!isUp(uin)) {
      const m = "Message could not be delivered. User is offline.";
      const h = hist(uin); h.push({ from: "system", text: m, time: Date.now() }); if (!S.dropped.includes(uin)) S.dropped.push(uin); save(); render(); msgWins.get(uin)?.paint?.(); notice(m);
      return;
    }
    busy.add(uin);
    const info = resolve(c), last = [...hist(uin)].reverse().find((m) => m.from === "me");
    const text = reply(info, last ? last.text : "", hist(uin));
    const slow = ["online", "ffc"].includes(info.status) ? 1 : 2;
    later(() => { busy.delete(uin); if (!S.contacts.some((x) => x.uin === uin) || S.status === "offline") return; incoming(uin, text); if (hist(uin).at(-1)?.from === "me") respond(uin); }, Math.max(rand(1, 2), Math.min(12, Math.max(2, 1.5 + text.length / 6)) * 1000 * slow));
  };
  let knocked = false;
  const scheduleKnock = () => later(() => {
    if (knocked || S.status === "offline" || !S.uin) return;
    const up = S.contacts.map((c) => ({ c, s: shownStatus(resolve(c), S.status, S.dropped) })).filter((x) => x.s !== "offline");
    if (!up.length) return;
    knocked = true; const p = up[Math.floor(Math.random() * up.length)].c;
    incoming(p.uin, knocks()[Math.floor(Math.random() * knocks().length)]);
  }, rand(30, 90));

  // ---------- status ----------
  const setStatus = (k) => {
    if (k === "offline") { timers.forEach(clearTimeout); timers.clear(); busy.clear(); }
    else if (S.status === "offline") { S.dropped = []; knocked = false; scheduleKnock(); }
    S.status = k; save(); render();
  };
  const statusItems = () => STATUSES.map(([k, l]) => ({ label: plain(l), icon: `icq-${k}`, checked: S.status === k, action: () => setStatus(k) }));
  const menuAt = (btn, items, up = true) => {
    const r = btn.getBoundingClientRect();
    popup(items, r.left, r.top, { anchor: btn });
    const m = [...document.querySelectorAll(".popup-menu")].pop();
    if (m && up) { m.style.top = "auto"; m.style.bottom = Math.max(0, innerHeight - r.top) + "px"; m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 2) + "px"; }
  };
  const about = () => dlg("About ICQ", el("div", { class: "icq-about" },
    el("div", { class: "icq-about-row" }, icon("icq", 32), el("div", {}, el("p", { class: "icq-b", text: "ICQ 99b" }), el("p", { text: "Copyright (C) 1996-1999 Mirabilis Ltd." }), el("p", { text: `Your UIN: ${S.uin}` })))), { cancel: null, ok: "OK", onOk: () => true });

  // ---------- main window ----------
  const list = el("div", { class: "sunken-panel icq-list", tabindex: 0 });
  const rows = () => [...list.querySelectorAll(".icq-row")];
  const ctxMenu = (uin) => [
    { label: "Message", bold: true, action: () => openMsg(uin) }, { label: "Chat", disabled: true }, { label: "File", disabled: true }, { label: "URL", disabled: true }, { label: "Contacts", disabled: true },
    separator(), { label: "Info", action: () => details(uin) }, { label: "History", action: () => history(uin) },
    separator(), { label: "Rename", action: () => { renaming = uin; render(); } }, { label: "Delete", action: () => del(uin) },
  ];
  const del = (uin) => {
    const c = S.contacts.find((x) => x.uin === uin);
    ctx.dialogs.message(`Are you sure you want to delete "${c.nick}" from your Contact List?`, { title: "ICQ", icon: "help", buttons: ["Yes", "No"] }).then((a) => {
      if (a !== "Yes") return;
      S.contacts = S.contacts.filter((x) => x.uin !== uin); sel = null; save(); render();
    });
  };
  const open = (uin) => openMsg(uin);
  const pick = (uin) => { sel = uin; for (const r of rows()) r.classList.toggle("highlighted", Number(r.dataset.uin) === uin); list.focus(); };
  const group = (label, items) => [el("div", { class: "icq-group" }, label),
    ...items.map((e) => {
      const row = el("div", { class: `icq-row${e.uin === sel ? " highlighted" : ""}${e.status === "offline" ? " icq-off" : ""}`, "data-uin": e.uin, onmousedown: () => pick(e.uin), ondblclick: () => open(e.uin), oncontextmenu: (ev) => { ev.preventDefault(); pick(e.uin); popup(ctxMenu(e.uin), ev.clientX, ev.clientY); } });
      const mail = S.unread[e.uin] && blink;
      row.append(el("img", { class: "icon", "data-src": `/assets/icons/icq-${e.status}-16x16.png`, src: mail ? "/assets/icons/icq-mail-16x16.png" : `/assets/icons/icq-${e.status}-16x16.png`, width: 16, height: 16, alt: "", draggable: "false" }));
      if (renaming === e.uin) {
        const i = el("input", { type: "text", value: e.nick });
        i.addEventListener("keydown", (k) => { k.stopPropagation(); if (k.key === "Enter") i.blur(); if (k.key === "Escape") { i.value = e.nick; i.blur(); } });
        i.addEventListener("blur", () => { const v = i.value.trim(); renaming = null; if (v) { S.contacts.find((x) => x.uin === e.uin).nick = v; save(); } render(); list.focus(); });
        row.append(i); setTimeout(() => { i.focus(); i.select(); }, 0);
      } else row.append(el("span", { text: e.nick }));
      return row;
    })];
  const searchIn = el("input", { type: "text", oninput: (e) => (kw = e.target.value) });
  searchIn.setAttribute("placeholder", tr("Enter Search Keyword"));
  const addMenu = [{ label: "Find/Add Users", action: () => findAdd() }, { label: "ICQ White Pages", disabled: true }, { label: "ICQ Chat Rooms", disabled: true }, { label: "ICQ Search", disabled: true }];
  const sysMenu = () => [{ label: "Add/Invite Users", action: () => findAdd() }, { label: "Status", submenu: statusItems() }, separator(), { label: "Preferences...", disabled: true }, { label: "Security & Privacy...", disabled: true }, { label: "View/Change My Details...", action: () => details(0) }, separator(), { label: "Help", submenu: [{ label: "About ICQ...", action: about }] }, { label: "Shut Down", action: () => w.close() }];
  const svc = ["My ICQ Page", "Reminder", "Notes", "ToDo", "Email", 'Phone - "Follow Me"', "Message Archive", "ICQ White Pages", "ICQ Active List", "E-ICQ"].map((l) => ({ label: l, disabled: true }));
  const stBtn = el("button", { class: "icq-status", type: "button" });
  const mkBtn = (label, fn, cls = "") => button(label, fn, { class: cls });
  const addBtn = mkBtn("Add Users", () => findAdd());
  const nowBtn = mkBtn("ICQ Now!", (e) => menuAt(e.currentTarget, addMenu));
  const svcBtn = mkBtn("Services", (e) => menuAt(e.currentTarget, svc), "icq-services");
  const sysBtn = mkBtn("System Menu", (e) => menuAt(e.currentTarget, sysMenu()));
  const logoBtn = mkBtn("ICQ", (e) => menuAt(e.currentTarget, [{ label: "To Advanced Mode", disabled: true }, separator(), { label: "About ICQ...", action: about }]), "icq-logo");
  stBtn.addEventListener("click", (e) => menuAt(e.currentTarget, statusItems()));
  const goBtn = button("GO", () => findAdd(kw)); goBtn.classList.add("icq-go");
  searchIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); findAdd(kw); } });
  w.setContent(el("div", { class: "icq", oncontextmenu: (e) => e.preventDefault() }, list,
    el("div", { class: "icq-search" }, searchIn, goBtn),
    el("div", { class: "icq-buttons" }, addBtn, nowBtn), el("div", { class: "icq-buttons" }, svcBtn, sysBtn), el("div", { class: "icq-buttons" }, logoBtn, stBtn)));
  list.addEventListener("keydown", (e) => {
    if (renaming !== null) return;
    const all = sorted(), on = all.filter((x) => x.status !== "offline"), off = all.filter((x) => x.status === "offline"), flat = [...on, ...off];
    const i = flat.findIndex((x) => x.uin === sel);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = Math.max(0, Math.min(flat.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))); if (flat[n]) { sel = flat[n].uin; render(); } }
    else if (sel === null) return;
    else if (e.key === "Enter") open(sel);
    else if (e.key === "Delete") del(sel);
    else if (e.key === "F2") { renaming = sel; render(); }
    else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { e.preventDefault(); const r = list.querySelector(".icq-row.highlighted")?.getBoundingClientRect(); if (r) popup(ctxMenu(sel), r.left + 20, r.bottom); }
  });
  function render() {
    if (inst.closed) return;
    const all = sorted(), on = all.filter((x) => x.status !== "offline"), off = all.filter((x) => x.status === "offline");
    const keep = list.scrollTop, had = document.activeElement === list;
    list.replaceChildren(...(on.length ? group("Online", on) : []), ...group("Offline", off));
    list.scrollTop = keep; if (had) list.focus();
    stBtn.replaceChildren(sicon(S.status), document.createTextNode(statusLabel(S.status)));
  }
  const paintMail = () => { for (const r of rows()) { const u = Number(r.dataset.uin), img = r.querySelector("img"); if (!img) continue; const st = r.classList.contains("icq-off") ? "offline" : null; img.src = S.unread[u] && blink ? "/assets/icons/icq-mail-16x16.png" : img.dataset.src; } };
  const blinker = setInterval(() => { if (inst.closed) return clearInterval(blinker); const any = Object.values(S.unread).some(Boolean); if (any || blink) { blink = any ? !blink : false; paintMail(); } }, 500);
  render();
  if (!S.uin) register(); else scheduleKnock();
  return w;
}
