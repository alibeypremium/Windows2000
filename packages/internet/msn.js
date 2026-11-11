// MSN Messenger 5.0 look-alike (offline simulation with made-up contacts).
// Menus, dialog templates, strings, icons, emoticons and sounds come from the real MSN Messenger 5.0 installer
// (msnmsgr.exe / msgslang.dll), extracted into assets/ui/msn and assets/sounds/msn.
import { el, button, popup, menuBar, icon, separator } from "../ui/index.js";
import { DIRECTORY, GROUPS, DISPLAY_PICS, avatar, pickReply } from "./msn-data.js";
import { buildDialog, buildTabs, openDlgWindow, ctl, plain, mnemonic } from "../accessories/winrar-dlg.js";

const U = "/assets/ui/msn/";
const SND = "/assets/sounds/msn/";
let data = null;
const load = async () => (data ||= Object.fromEntries(await Promise.all(["dialogs", "menus", "strings"].map(async (n) => [n, await (await fetch(new URL(`../../assets/ui/msn/${n}.json`, import.meta.url))).json()]))));

// status -> icon index in be402 (17px strip) and label
const STATUS = {
  online: { label: "Online", icon: 0, id: 40166 },
  busy: { label: "Busy", icon: 2, id: 40168 },
  brb: { label: "Be Right Back", icon: 3, id: 40169 },
  away: { label: "Away", icon: 3, id: 40170 },
  phone: { label: "On The Phone", icon: 2, id: 40171 },
  lunch: { label: "Out To Lunch", icon: 3, id: 40172 },
  offline: { label: "Appear Offline", icon: 1, id: 40167 },
};
const BY_ID = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [v.id, k]));

const EMOS = [
  [":)", ":-)"], [":D", ":-D"], [";)", ";-)"], [":O", ":-O"], [":P", ":-P"], ["(H)"], [":@", ":-@"], [":$", ":-$"], [":S", ":-S"], [":(", ":-("], [":'("], [":|", ":-|"], ["(6)"], ["(@)"], ["(L)"], ["(U)"],
  ["(A)"], ["(&)"], ["(S)"], ["(*)"], ["(~)"], ["(8)"], ["(E)"], ["(F)"], ["(W)"], ["(O)"], ["(K)"], ["(G)"], ["(^)"], ["(P)"], ["(I)"], ["(C)"], ["(T)"], ["({)"], ["(})"], ["(B)"], ["(D)"], ["(Z)"], ["(X)"], ["(Y)"], ["(N)"], [":["], ["(?)"], ["(%)"], ["(#)"], ["(R)"],
];
const emoHtml = (i) => `<img class="msn-emo" src="${U}emo/${i}.png" width="19" height="19" alt="${EMOS[i]?.[0] || ""}">`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const withEmoticons = (text) => {
  let out = esc(text);
  const pairs = [];
  EMOS.slice(0, 46).forEach((codes, i) => codes.forEach((c) => pairs.push([esc(c), i])));
  pairs.sort((a, b) => b[0].length - a[0].length);
  for (const [c, i] of pairs) out = out.split(c).join(`\u0001${i}\u0002`);
  return out.replace(/\u0001(\d+)\u0002/g, (_, i) => emoHtml(+i));
};

export async function openMessenger(ctx) {
  const R = await load();
  const saved = ctx.settings.get("msn") || {};
  const w = ctx.wm.create({ title: "MSN Messenger", icon: "msn", width: 246, height: 500, x: 700, y: 40, appId: "msn", maximizable: false });
  let me = null; // { email, name, status }
  const prof = Object.assign({ status: "online", groups: [...GROUPS], removed: [], added: [], moved: {}, byGroup: false, history: {}, blocked: [], pic: "msn", name: null }, ctx.settings.get("msnProfile") || {});
  const saveProf = () => ctx.settings.set("msnProfile", prof);
  const buildContacts = () => {
    const list = DIRECTORY.filter((d) => !d.hidden && !prof.removed.includes(d.email)).map((d) => ({ ...d }));
    for (const a of prof.added) {
      if (list.some((c) => c.email === a.email)) continue;
      const d = DIRECTORY.find((x) => x.email === a.email);
      list.push(d ? { ...d, group: a.group || d.group } : { name: a.name, email: a.email, group: a.group, status: "offline", replies: [], photo: avatar("smiley", a.email.charCodeAt(0) % 8), custom: true });
    }
    list.forEach((c) => { if (prof.moved[c.email]) c.group = prof.moved[c.email]; c.blocked = prof.blocked.includes(c.email); });
    return list;
  };
  const myPic = () => (DISPLAY_PICS.find((x) => x.id === prof.pic) || DISPLAY_PICS.find((x) => x.id === "msn")).src;
  let contacts = [];
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const buzz = () => { try { const ac = new (window.AudioContext || window.webkitAudioContext)(); const g = ac.createGain(); g.gain.value = 0.18; g.connect(ac.destination); for (let k = 0; k < 6; k++) { const o = ac.createOscillator(); o.type = "square"; o.frequency.value = k % 2 ? 140 : 95; o.connect(g); o.start(ac.currentTime + k * 0.09); o.stop(ac.currentTime + k * 0.09 + 0.07); } setTimeout(() => ac.close(), 900); } catch { /* ignore */ } };
  const shake = (win) => { const e = win.el; if (!e?.animate) return; const f = []; for (let k = 0; k < 14; k++) f.push({ transform: `translate(${k % 2 ? -9 : 9}px, ${k % 3 === 0 ? -6 : 5}px)` }); f.push({ transform: "translate(0,0)" }); e.animate(f, { duration: 750, easing: "linear" }); };
  const toText = (html) => { const t = document.createElement("div"); t.innerHTML = html; t.querySelectorAll("img").forEach((i) => i.replaceWith(i.alt || "")); return t.textContent; };
  const logHist = (email, who, text) => { const h = (prof.history[email] ||= []); h.push({ t: Date.now(), who, text }); if (h.length > 300) h.splice(0, h.length - 300); saveProf(); };
  const convs = new Map();
  const collapsed = { online: false, offline: false };
  const play = (n) => { try { const a = new Audio(SND + n + ".wav"); a.volume = 0.6; a.play().catch(() => {}); } catch {} };
  const bgTimers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { bgTimers.delete(t); fn(); }, ms); bgTimers.add(t); return t; };

  // ---------- generic modal around real dialog templates ----------
  const modal = (title, content, { collect = () => true, buttons = true, bind, okLabel = "OK" } = {}) => new Promise((resolve) => {
    let fin = false, d;
    const done = async (v) => { if (fin) return; fin = true; d.onClose = null; await d.close(); resolve(v); };
    const ok = () => { const v = collect(); if (v !== false) done(v); };
    const row = buttons ? el("div", { class: "rd-btnrow" }, button(okLabel, ok, { class: "default-button" }), button("Cancel", () => done(null))) : null;
    d = openDlgWindow(ctx, { title, content, buttons: row });
    d.onClose = () => { resolve(null); return true; };
    d.el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); done(null); } else if (e.key === "Enter" && e.target.tagName !== "BUTTON" && e.target.tagName !== "TEXTAREA") { e.preventDefault(); ok(); } });
    bind?.({ ok, done, win: d });
  });
  const note = (m, t = "MSN Messenger", i = "info") => ctx.dialogs.message(m, { title: t, icon: i });
  
  // ---------- views ----------
  const body = el("div", { class: "msn-body" });
  const statusBar = el("div", { class: "msn-status", text: "Not signed in" });

  const sprite = (file, w, h, i, cls = "") => {
    const s = el("span", { class: "msn-sp " + cls });
    s.style.cssText = `width:${w}px;height:${h}px;background:url(${U}${file}.png) -${i * w}px 0 no-repeat`;
    return s;
  };
  const statusIcon = (st) => sprite("be402", 22, 17, STATUS[st]?.icon ?? 1);

  const signInView = () => {
    body.replaceChildren(
      el("div", { class: "msn-signin" },
        el("img", { class: "msn-hero", src: U + "be607.png", alt: "", draggable: "false" }),
        el("div", { class: "msn-signin-text" },
          el("div", { class: "msn-big", text: "MSN Messenger" }),
          el("div", { text: "Click here to sign in" }),
        ),
        button("Sign In", () => doSignIn(), { class: "msn-signin-btn" }),
        el("div", { class: "msn-note", text: "Click Sign In, then OK. Any e-mail address and password will work (nothing is sent anywhere)." }),
      ),
    );
    w.setTitle("MSN Messenger");
    statusBar.textContent = "Not signed in";
  };

  const listView = () => {
    const header = el("div", { class: "msn-hdr" },
      statusIcon(me.status),
      el("div", { class: "msn-me" }, el("b", { text: me.name }), el("span", { text: ` (${STATUS[me.status].label})` })),
    );
    header.addEventListener("click", (e) => { const r = header.getBoundingClientRect(); popup(statusItems(), r.left + 6, r.bottom, { anchor: header }); });
    const mail = el("div", { class: "msn-mail" }, sprite("be291", 16, 16, 8), el("a", { href: "#", text: "My E-mail Inbox" }));
    mail.addEventListener("click", (e) => { e.preventDefault(); window.open("https://outlook.live.com/", "_blank", "noopener,noreferrer"); });
    const online = contacts.filter((c) => c.status !== "offline").sort((a, b) => a.name.localeCompare(b.name, "tr"));
    const offline = contacts.filter((c) => c.status === "offline").sort((a, b) => a.name.localeCompare(b.name, "tr"));
    const group = (key, label, list) => {
      if (typeof label === "string" && !key.startsWith("g:")) label = `${label} (${list.length})`;
      const arrow = sprite("be402", 22, 17, collapsed[key] ? 15 : 16, "msn-arrow");
      const head = el("div", { class: "msn-group" }, arrow, el("span", { text: label ?? "" }));
      if (key.startsWith("g:")) head.addEventListener("contextmenu", (e) => { e.preventDefault(); popup([{ label: "Rename Group...", action: () => renameGroup(key.slice(2)) }, { label: "Delete Group", action: () => deleteGroup(key.slice(2)) }], e.clientX, e.clientY, {}); });
      head.addEventListener("click", () => { collapsed[key] = !collapsed[key]; listView(); });
      const rows = collapsed[key] ? [] : list.map((c) => {
        const r = el("div", { class: "msn-contact" + (c.status === "offline" ? " off" : ""), tabindex: "0" }, statusIcon(c.status), el("span", { class: "msn-cname", text: c.name }), c.status !== "online" && c.status !== "offline" ? el("span", { class: "msn-cst", text: ` (${STATUS[c.status].label})` }) : null);
        r.title = `${c.name}\n${c.email}`;
        r.addEventListener("dblclick", () => openConversation(c));
        r.addEventListener("click", () => { body.querySelectorAll(".msn-contact.sel").forEach((x) => x.classList.remove("sel")); r.classList.add("sel"); sel = c; });
        r.addEventListener("contextmenu", (e) => { e.preventDefault(); sel = c; popup(contactMenu(c), e.clientX, e.clientY, {}); });
        return r;
      });
      return el("div", { class: "msn-grp" }, head, ...rows);
    };
    const byName = (a, b) => (a.status === "offline") - (b.status === "offline") || a.name.localeCompare(b.name, "tr");
    const groupList = () => { const names = [...prof.groups]; if (contacts.some((c) => !names.includes(c.group))) names.push("Other Contacts"); return names.map((g) => { const l = contacts.filter((c) => (names.includes(c.group) ? c.group : "Other Contacts") === g).sort(byName); return group("g:" + g, `${g} (${l.filter((c) => c.status !== "offline").length}/${l.length})`, l); }); };
    const listBox = el("div", { class: "msn-list" }, ...(prof.byGroup ? groupList() : [group("online", "Online", online), group("offline", "Not Online", offline)]));
    const acts = el("div", { class: "msn-acts" }, el("div", { class: "msn-acts-h", text: "I want to..." }),
      ...[["Add a Contact", 1, addContact], ["Send an Instant Message", 2, () => (sel ? openConversation(sel) : note("Please select a contact first."))], ["Send a File or Photo", 3, () => { if (!sel) return note("Please select a contact first."); openConversation(sel); convs.get(sel.email)?.sendFile(); }], ["Send E-mail", 8, () => (sel ? (location.href = "mailto:" + sel.email) : note("Please select a contact first."))]]
        .map(([t, i, fn]) => { const a = el("div", { class: "msn-act" }, sprite("be291", 16, 16, i), el("a", { href: "#", text: t })); a.addEventListener("click", (e) => { e.preventDefault(); fn(); }); return a; }));
    body.replaceChildren(header, mail, listBox, acts);
    w.setTitle(`${me.name} - MSN Messenger`);
    statusBar.textContent = me.status === "offline" ? "Appearing offline" : "Signed in as " + me.email;
  };
  let sel = null;

  // ---------- menus (real resources) ----------
  // Items whose text the original fills in at runtime (single-letter placeholders in the resource).
const LABELS = { 40001: "Sign In", 40053: null, 40273: "Start a Voice Conversation", 40274: "Start a Video Conversation", 40203: null, 40202: null, 40069: null, 40061: null };
const T = (m) => m.label.split("\t");
  const tidy = (arr) => { const out = []; for (const i of arr) { if (i.separator && (!out.length || out[out.length - 1].separator)) continue; out.push(i); } while (out.length && out[out.length - 1].separator) out.pop(); return out; };
  const conv = (list, acts) => tidy(list.map((m) => {
    if (m.sep) return { separator: true };
    if (m.popup) { const sub = conv(m.items, acts); return sub.length ? { label: plain(m.popup).trim(), submenu: sub } : null; }
    if (!acts[m.id]) return null;
    const [lab, sc] = T(m);
    const text = plain(lab).trim();
    const ov = LABELS[m.id];
    if (ov === null) return null;
    if (ov) return { label: ov, action: acts[m.id], disabled: ov === "Sign In" ? !!me : false };
    if (m.id === 40210) return { label: plain(lab).trim(), action: acts[m.id], disabled: !me };
    if (text.length <= 1) return null; // runtime-filled items without a known text
    return { label: text, shortcut: sc, action: acts[m.id], disabled: false };
  }).filter(Boolean));
  const statusItems = () => Object.entries(STATUS).map(([k, s]) => ({ label: s.label, checked: me?.status === k, action: () => setStatus(k) }));
  const setStatus = (k) => { if (!me) return; me.status = k; prof.status = k; saveProf(); listView(); };
  const mainActs = {
    40003: () => w.close(), 40001: () => doSignIn(), 40210: () => signOut(), 40282: () => addContact(), 40004: () => (sel ? openConversation(sel) : note("Please select a contact first.")),
    40205: () => (sel ? (location.href = "mailto:" + sel.email) : note("Please select a contact first.")), 40268: () => options(), 40000: () => about(), 40157: () => ctx.launch("help", { topic: "intro" }),
    40278: () => window.open("https://www.msn.com/", "_blank", "noopener,noreferrer"), 40198: () => window.open("https://outlook.live.com/", "_blank", "noopener,noreferrer"),
    40289: () => removeContact(), 40283: () => (sel ? note(`${sel.name}\n${sel.email}`, "View Profile") : note("Please select a contact first.")), 40284: () => (sel ? note(`${sel.name}\n${sel.email}\n\nStatus: ${STATUS[sel.status].label}`, "Properties") : note("Please select a contact first.")),
    40166: () => setStatus("online"), 40168: () => setStatus("busy"), 40169: () => setStatus("brb"), 40170: () => setStatus("away"), 40171: () => setStatus("phone"), 40172: () => setStatus("lunch"), 40167: () => setStatus("offline"),
    40041: () => (sel ? note(`${sel.name}\n${sel.email}`, "Properties") : 0), 40040: () => (sel ? openConversation(sel) : 0), 40043: () => removeContact(), 40197: () => (sel ? (location.href = "mailto:" + sel.email) : 0),
  };
  const contactMenu = (c) => [...conv(R.menus["208"], { ...mainActs, 40040: () => openConversation(c), 40043: () => removeContact(c), 40197: () => (location.href = "mailto:" + c.email), 40041: () => note(`${c.name}\n${c.email}\n\nStatus: ${STATUS[c.status].label}`, "Properties"), 40241: () => note(`${c.name}\n${c.email}`, "View Profile") }), ...contactExtra(c)];
  const helpItems = () => conv(R.menus["299"], mainActs);
  const menus = menuBar({
    File: () => tidy([...conv(R.menus["200"][0].items, mainActs).map((i) => (i.label === "My Status" ? { ...i, submenu: statusItems(), disabled: !me } : i)), { separator: true }, { label: "Change My Display Picture...", action: pictureDlg, disabled: !me }, { label: "Message History...", action: () => historyWin(), disabled: !me }]),
    Actions: () => tidy([...conv(R.menus["200"][1].items, mainActs), { separator: true }, { label: "Create a Group...", action: createGroup, disabled: !me }, { label: "Show Contacts by Group", checked: prof.byGroup, action: () => { prof.byGroup = !prof.byGroup; saveProf(); if (me) listView(); } }]),
    Tools: () => conv(R.menus["200"][2].items, mainActs),
    Help: helpItems,
  });
  const clickSignIn = () => (me ? note("You are already signed in.") : doSignIn());

  // ---------- sign in / out ----------
  const doSignIn = async () => {
    const dlg = buildDialog(R.dialogs["201"], { uid: 11 });
    ctl.value(dlg.byId(1000), saved.email || "ornek@hotmail.com");
    ctl.value(dlg.byId(1001), saved.pass || "parola");
    ctl.checked(dlg.byId(1020), !!saved.remember);
    dlg.byId(3).addEventListener("click", () => window.open("https://account.live.com/password/reset", "_blank", "noopener,noreferrer"));
    const icn = dlg.byId(1208); if (icn) icn.replaceChildren(el("img", { src: U + "p729.png", alt: "" }));
    const r = await modal("Sign in to .NET Messenger Service", dlg.root, {
      buttons: false,
      collect: () => ({ email: ctl.value(dlg.byId(1000)).trim(), pass: ctl.value(dlg.byId(1001)), remember: ctl.checked(dlg.byId(1020)) }),
      bind: ({ ok, done }) => { dlg.byId(1).addEventListener("click", ok); dlg.byId(2).addEventListener("click", () => done(null)); setTimeout(() => dlg.byId(1000).querySelector?.("input")?.focus?.() || dlg.byId(1000).focus?.(), 50); },
    });
    if (!r) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) return note("The sign-in name you typed is not valid. Please type your complete sign-in name, for example: name_123@hotmail.com.", "Sign in to .NET Messenger Service", "error").then(doSignIn);
    if (!r.pass) return note("Please type your password.", "Sign in to .NET Messenger Service", "error").then(doSignIn);
    ctx.settings.set("msn", r.remember ? { email: r.email, remember: true } : {});
    body.replaceChildren(el("div", { class: "msn-signing" }, el("img", { src: U + "be607.png", alt: "" }), el("div", { text: "Signing In..." })));
    statusBar.textContent = "Signing In...";
    await new Promise((res) => later(res, 1400));
    const nm = r.email.split("@")[0].replace(/[._\d]+/g, " ").trim();
    me = { email: r.email, name: prof.name || (nm || "Me").replace(/\b\w/g, (c) => c.toUpperCase()), status: prof.status || "online" };
    contacts = buildContacts();
    play("online");
    listView(); scheduleEvents();
    // a contact signs in later, like the real thing
    later(() => { const c = contacts.find((x) => x.name === "Burak"); if (me && c && c.status === "offline") { c.status = "online"; play("online"); listView(); toast(`${c.name} has just signed in.`, c); } }, 9000);
  };
  const signOut = () => { if (evTimer) clearTimeout(evTimer); evTimer = null; for (const c of [...convs.values()]) c.win.close(); convs.clear(); me = null; sel = null; signInView(); };

  const toast = (text, c) => {
    const t = el("div", { class: "msn-toast" }, el("img", { src: U + "p773.png", alt: "" }), el("div", {}, el("div", { class: "msn-toast-h", text: "MSN Messenger" }), el("div", { text })));
    w.el.append(t);
    t.addEventListener("click", () => { t.remove(); if (c) openConversation(c); });
    later(() => t.remove(), 6000);
  };

  // ---------- contacts ----------
  const addContact = async () => {
    if (!me) return note("You must sign in before you can add a contact.");
    const avail = DIRECTORY.filter((d) => !contacts.some((c) => c.email === d.email)).sort((a, b) => a.name.localeCompare(b.name, "tr"));
    const input = el("input", { type: "text", class: "msn-addin", "aria-label": "E-mail address" });
    const list = el("select", { size: 8, class: "msn-addlist", "aria-label": "Directory" }, ...avail.map((d) => el("option", { value: d.email, text: `${d.name}  <${d.email}>` })));
    list.addEventListener("change", () => { input.value = list.value; });
    list.addEventListener("dblclick", () => { input.value = list.value; });
    const grp = el("select", { "aria-label": "Group" }, ...prof.groups.map((g) => el("option", { text: g })));
    const content = el("div", { class: "msn-adddlg" }, el("div", { text: "Please type your contact's complete e-mail address:" }), input, el("div", { text: "Or choose someone from the directory:" }), list, el("div", { class: "msn-addgrp" }, el("span", { text: "Add to group: " }), grp));
    const r = await modal("Add a Contact", content, { okLabel: "Add", collect: () => (input.value.trim() ? { email: input.value.trim(), group: grp.value } : false), bind: () => setTimeout(() => input.focus(), 50) });
    if (!r) return;
    const e = r.email;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return note("The e-mail address you typed is not valid.", "Add a Contact", "error");
    if (contacts.some((c) => c.email.toLowerCase() === e.toLowerCase())) return note(`${e} is already in your contact list.`, "Add a Contact");
    const d = DIRECTORY.find((x) => x.email.toLowerCase() === e.toLowerCase());
    prof.removed = prof.removed.filter((x) => x !== (d?.email || e));
    prof.added.push({ email: d?.email || e, name: d?.name || e.split("@")[0], group: r.group });
    saveProf(); contacts = buildContacts(); listView();
    if (!d) note(`${e} was added to your list, but this person does not appear to be using MSN Messenger yet. You will see them online when they sign in.`, "Add a Contact");
    else toast(`${d.name} was added to your contact list.`, contacts.find((c) => c.email === d.email));
  };
  const removeContact = async (c = sel) => {
    if (!c) return note("Please select a contact first.");
    if ((await ctx.dialogs.message(`Are you sure you want to delete ${c.name} from your contact list?`, { title: "Delete a Contact", icon: "question", buttons: ["Yes", "No"], defaultButton: 1 })) !== "Yes") return;
    if (prof.added.some((a) => a.email === c.email)) prof.added = prof.added.filter((a) => a.email !== c.email); else prof.removed.push(c.email);
    delete prof.moved[c.email]; saveProf();
    contacts = contacts.filter((x) => x !== c); convs.get(c.email)?.win.close(); sel = null; listView();
  };
  const createGroup = async () => {
    const n = (await ctx.dialogs.prompt("Type a name for the new group:", "", { title: "Create a Group" }))?.trim();
    if (!n) return;
    if (prof.groups.some((g) => g.toLowerCase() === n.toLowerCase())) return note("A group with that name already exists.", "Create a Group");
    prof.groups.push(n); prof.byGroup = true; saveProf(); listView();
  };
  const renameGroup = async (g) => {
    const n = (await ctx.dialogs.prompt("Type a new name for the group:", g, { title: "Rename Group" }))?.trim();
    if (!n || n === g) return;
    if (prof.groups.some((x) => x.toLowerCase() === n.toLowerCase())) return note("A group with that name already exists.", "Rename Group");
    prof.groups = prof.groups.map((x) => (x === g ? n : x));
    for (const c of contacts) if (c.group === g) { c.group = n; prof.moved[c.email] = n; }
    for (const a of prof.added) if (a.group === g) a.group = n;
    saveProf(); listView();
  };
  const deleteGroup = async (g) => {
    if (g === "Other Contacts") return note("This group cannot be deleted.");
    if ((await ctx.dialogs.message(`Delete the group "${g}"? Its contacts will be moved to Other Contacts.`, { title: "Delete Group", icon: "question", buttons: ["Yes", "No"], defaultButton: 1 })) !== "Yes") return;
    prof.groups = prof.groups.filter((x) => x !== g);
    for (const c of contacts) if (c.group === g) { c.group = "Other Contacts"; prof.moved[c.email] = "Other Contacts"; }
    saveProf(); listView();
  };
  const contactExtra = (c) => [{ separator: true }, { label: "Move Contact to Group", submenu: [...prof.groups, "Other Contacts"].map((g) => ({ label: g, checked: c.group === g, action: () => { c.group = g; prof.moved[c.email] = g; saveProf(); listView(); } })) }, { label: c.blocked ? "Unblock" : "Block", action: () => toggleBlock(c) }, { label: "Message History...", action: () => historyWin(c) }];
  const toggleBlock = (c) => {
    c.blocked = !c.blocked; prof.blocked = prof.blocked.filter((x) => x !== c.email); if (c.blocked) prof.blocked.push(c.email); saveProf();
    convs.get(c.email)?.sysLine(c.blocked ? `You have blocked ${c.name}. He or she will no longer see you online.` : `You have unblocked ${c.name}.`);
    if (me) listView();
  };
  const pictureDlg = () => {
    if (!me) return;
    let pick = prof.pic;
    const grid = el("div", { class: "msn-pics" }, DISPLAY_PICS.map((d) => { const b = el("button", { type: "button", class: "msn-picb" + (d.id === pick ? " sel" : ""), title: d.name }, el("img", { src: d.src, width: 48, height: 48, alt: d.name })); b.addEventListener("click", () => { pick = d.id; [...grid.children].forEach((x) => x.classList.toggle("sel", x === b)); }); return b; }));
    return modal("My Display Picture", el("div", { class: "msn-pics-wrap" }, el("div", { text: "Choose the picture other people see in conversations with you:" }), grid), { collect: () => pick }).then((r) => { if (!r) return; prof.pic = r; saveProf(); for (const cv of convs.values()) cv.refreshPic(); });
  };
  const historyWin = (c0 = null) => {
    const emails = Object.keys(prof.history).filter((e) => prof.history[e]?.length);
    const name = (e) => contacts.find((c) => c.email === e)?.name || DIRECTORY.find((d) => d.email === e)?.name || e;
    const hw = ctx.wm.create({ title: "Message History", icon: "msn", width: 560, height: 380, x: 120, y: 80, appId: "msn-history" });
    const listSel = el("select", { size: 12, class: "msn-hlist", "aria-label": "Contacts" });
    const view = el("div", { class: "msn-hview" });
    const fill = () => {
      listSel.replaceChildren(...Object.keys(prof.history).filter((e) => prof.history[e]?.length).sort((a, b) => name(a).localeCompare(name(b), "tr")).map((e) => el("option", { value: e, text: name(e) })));
      show();
    };
    const show = () => {
      const e = listSel.value; view.replaceChildren();
      if (!e) { view.textContent = "There is no saved conversation history."; return; }
      let day = "";
      for (const m of prof.history[e]) {
        const d = new Date(m.t), ds = d.toLocaleDateString("tr-TR");
        if (ds !== day) { day = ds; view.append(el("div", { class: "msn-hday", text: ds })); }
        view.append(el("div", { class: "msn-hline" }, el("span", { class: "msn-ht", text: d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) + " " }), el("b", { text: m.who ? m.who + ": " : "" }), document.createTextNode(m.text)));
      }
      view.scrollTop = view.scrollHeight;
    };
    listSel.addEventListener("change", show);
    const del = button("Delete History", async () => { const e = listSel.value; if (!e) return; if ((await ctx.dialogs.message(`Delete the saved history with ${name(e)}?`, { title: "Message History", icon: "question", buttons: ["Yes", "No"], defaultButton: 1 })) === "Yes") { delete prof.history[e]; saveProf(); fill(); } });
    const exp = button("Save As...", async () => { const e = listSel.value; if (!e) return; const t = await ctx.dialogs.file({ mode: "save", path: "C:/Documents and Settings/Administrator/My Documents", name: `${name(e)} - history.txt` }); if (t) ctx.fs.writeFile(t, prof.history[e].map((m) => `[${new Date(m.t).toLocaleString("tr-TR")}] ${m.who ? m.who + ": " : ""}${m.text}`).join("\r\n")); });
    hw.setContent(el("div", { class: "msn-hist" }, listSel, el("div", { class: "msn-hright" }, view, el("div", { class: "msn-hbtns" }, del, exp, button("Close", () => hw.close())))));
    fill(); if (c0 && prof.history[c0.email]) { listSel.value = c0.email; show(); }
  };

  // ---------- background activity: contacts come and go, write to you, nudge you ----------
  let evTimer = null;
  const scheduleEvents = () => {
    if (evTimer) clearTimeout(evTimer);
    evTimer = later(() => {
      evTimer = null; if (!me) return;
      const r = Math.random(), quiet = me.status === "busy" || me.status === "offline";
      if (r < 0.45) {
        const c = rnd(contacts.filter((x) => !x.blocked)); if (c) {
          const next = rnd(c.status === "offline" ? ["online", "online", "away"] : ["online", "away", "busy", "offline", "offline"]);
          if (next !== c.status) { const was = c.status; c.status = next; listView(); if (was === "offline" && !quiet) { play("online"); toast(`${c.name} has just signed in.`, c); } }
        }
      } else if (r < 0.8 && !quiet) {
        const c = rnd(contacts.filter((x) => x.status === "online" && !x.blocked && x.replies?.length));
        if (c) { openConversation(c, { incoming: true }); const cv = convs.get(c.email); cv?.receive(rnd(c.replies)); }
      } else if (r < 0.92 && !quiet) {
        const open = [...convs.keys()].map((e) => contacts.find((x) => x.email === e)).filter((x) => x && x.status !== "offline" && !x.blocked);
        const c = open.length ? rnd(open) : null; if (c) convs.get(c.email)?.receiveNudge();
      }
      scheduleEvents();
    }, 28000 + Math.random() * 32000);
  };

  // ---------- dialogs ----------
  const about = () => {
    const dlg = buildDialog(R.dialogs["152"], { uid: 12 });
    const set = (id, t) => { const c = dlg.byId(id); if (c) c.textContent = t; };
    set(1214, "MSN Messenger"); set(1052, "Version 5.0 (5.0.0544)");
    const logo = dlg.byId(1096); if (logo) { logo.replaceChildren(el("img", { src: U + "p731.png", alt: "" })); logo.style.cssText += ";display:flex;align-items:center"; }
    modal("About MSN Messenger", dlg.root, { buttons: false, bind: ({ done }) => dlg.byId(1).addEventListener("click", () => done(null)) });
  };
  const options = () => {
    const ids = ["202", "205", "200", "207", "226", "247"];
    const labels = ["Personal", "General", "Phone", "Privacy", "Connection", "Accounts"];
    const t = buildTabs(ids.map((i) => R.dialogs[i]), { labels, uid: 13 });
    const personal = t.pages[0];
    const firstEdit = [...personal.all.values()].flat().find((c) => c.spec.cls === "edit");
    if (firstEdit && me) ctl.value(firstEdit, me.name);
    modal("Options", t.root, { collect: () => { if (firstEdit && me && ctl.value(firstEdit).trim()) { me.name = ctl.value(firstEdit).trim(); prof.name = me.name; saveProf(); listView(); } return true; } });
  };

  // ---------- conversation window ----------
  const RECV_DIR = "C:/Documents and Settings/Administrator/My Documents/My Received Files";
  const fmtSize = (n) => (n < 1024 ? `${n} bytes` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const openConversation = (c, { incoming = false } = {}) => {
    if (!me) return note("You must sign in first.");
    if (convs.has(c.email)) { if (!incoming) convs.get(c.email).win.focus?.(); return; }
    const cw = ctx.wm.create({ title: `${c.name} - Conversation`, icon: "msn", width: 560, height: 430, x: 90 + convs.size * 26, y: 60 + convs.size * 26, appId: "msn-chat" });
    const log = el("div", { class: "msn-log" });
    const typing = el("div", { class: "msn-typing" });
    const input = el("div", { class: "msn-input", contenteditable: "true", spellcheck: "false", role: "textbox", "aria-label": "Message" });
    let emoOn = true, autoSent = false, lastNudge = 0, lastRecv = Date.now();
    const timers = new Set(), cleanups = [];
    const lat = (fn, ms) => { const t = later(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const scroll = () => { log.scrollTop = log.scrollHeight; };
    const add = (who, html, self) => {
      const line = el("div", { class: "msn-line" });
      line.innerHTML = `<div class="msn-from">${esc(who)} says:</div><div class="msn-txt">${html}</div>`;
      log.append(line); scroll(); logHist(c.email, who, toText(html));
      if (!self) { lastRecv = Date.now(); status.textContent = `Last message received: ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`; }
    };
    const sysLine = (t, extra = null) => { const d = el("div", { class: "msn-sys", text: t }); if (extra) d.append(" ", extra); log.append(d); scroll(); return d; };
    const textOf = () => input.innerText.replace(/\u00a0/g, " ").trim();
    const online = () => c.status !== "offline" && !c.blocked;
    const typeThen = (fn, ms = 1200 + Math.random() * 1500) => { typing.textContent = `${c.name} is typing a message.`; lat(() => { typing.textContent = ""; fn(); }, ms); };
    const receive = (text) => { play("type"); add(c.name, withEmoticons(text), false); };
    // ----- nudge -----
    const doShake = () => { buzz(); shake(cw); };
    const sendNudge = () => {
      if (c.blocked) return sysLine(`You have blocked ${c.name}.`);
      if (Date.now() - lastNudge < 10000) return sysLine("You may not send a nudge so soon after the last one.");
      lastNudge = Date.now(); doShake(); sysLine(`You have just sent ${c.name} a nudge.`); logHist(c.email, "", "(nudge sent)");
      if (online() && Math.random() < 0.6) lat(() => { sysLine(`${c.name} sent you a nudge back.`); doShake(); }, 2500 + Math.random() * 2000);
    };
    const receiveNudge = () => { doShake(); sysLine(`${c.name} just sent you a nudge.`); logHist(c.email, "", `(${c.name} sent a nudge)`); };
    // ----- file transfer -----
    const bar = (label) => {
      const t = el("div", { class: "msn-xt", text: label }), fill = el("div", { class: "msn-xfill" }), box = el("div", { class: "msn-xfer" }, t, el("div", { class: "msn-xbar" }, fill));
      log.append(box); scroll(); return { box, set: (pct, txt) => { fill.style.width = pct + "%"; t.textContent = txt; } };
    };
    const progress = (name, size, verb, done) => {
      const b = bar(`${verb} "${name}"...`), dur = Math.max(2800, Math.min(8000, size / 20)); let pct = 0, cancelled = false;
      const link = el("a", { href: "#", text: "Cancel" }); b.box.append(el("div", { class: "msn-xc" }, link));
      const iv = setInterval(() => {
        pct = Math.min(100, pct + 100 / (dur / 120) * (0.6 + Math.random() * 0.8));
        b.set(pct, `${verb} "${name}" — ${Math.round(pct)}% (${((size / 1024) * pct / 100 / (dur / 1000)).toFixed(1)} KB/sec)`);
        if (pct >= 100) { clearInterval(iv); b.box.remove(); if (!cancelled) done(); }
      }, 120);
      cleanups.push(() => clearInterval(iv));
      link.addEventListener("click", (e) => { e.preventDefault(); cancelled = true; clearInterval(iv); b.box.remove(); sysLine(`You have canceled the transfer of "${name}".`); });
    };
    const sendFile = async () => {
      if (c.blocked) return sysLine(`You have blocked ${c.name}.`);
      if (c.status === "offline") return sysLine(`${c.name} appears to be offline. You can only send files to contacts who are online.`);
      const path = await ctx.dialogs.file({ mode: "open", path: "C:/Documents and Settings/Administrator/My Documents", title: `Send a File to ${c.name}` });
      if (!path) return;
      const node = ctx.fs.get(path); if (!node || node.type !== "file") return;
      const name = basename0(path), size = Math.max(1, (node.content || "").length);
      const cancel = el("a", { href: "#", text: "Cancel (Alt+Q)" }); let cancelled = false;
      const inv = sysLine(`You have invited ${c.name} to receive the file "${name}" (${fmtSize(size)}). Waiting for their response...`, cancel);
      cancel.addEventListener("click", (e) => { e.preventDefault(); cancelled = true; inv.replaceChildren(`You have canceled the invitation to send "${name}".`); });
      lat(() => {
        if (cancelled) return;
        if (c.status === "online" || Math.random() < 0.6) {
          inv.replaceChildren(`${c.name} accepted the invitation to receive "${name}".`);
          progress(name, size, "Sending", () => { play("newalert"); sysLine(`The file "${name}" was successfully sent.`); logHist(c.email, "", `(file sent: ${name})`); if (online() && Math.random() < 0.7) typeThen(() => receive(rnd(["teşekkürler, aldım! :)", "geldi, bakıyorum hemen (Y)", "sağol! (H)"]))); });
        } else inv.replaceChildren(`${c.name} has declined the invitation to receive "${name}".`);
      }, 1800 + Math.random() * 1800);
    };
    const FILES = (n) => [
      { name: "selam.txt", mime: "text/plain", body: `Selam ${me.name},\r\n\r\nBu dosyayı sana ${n} gönderdi.\r\nGörüşürüz!` },
      { name: `${n.split(" ")[0]} resim.svg`, mime: "image/svg+xml", body: decodeURIComponent(c.photo.slice(c.photo.indexOf(",") + 1)) },
      { name: "sarki-sozleri.txt", mime: "text/plain", body: "La la la...\r\n(bu bir deneme şarkı sözüdür)" },
    ];
    const receiveFile = () => {
      if (!online()) return;
      const f = rnd(FILES(c.name)), size = f.body.length + 200 + Math.floor(Math.random() * 40000);
      const acc = el("a", { href: "#", text: "Accept (Alt+T)" }), dec = el("a", { href: "#", text: "Decline (Alt+D)" });
      const d = sysLine(`${c.name} wants to send you the file "${f.name}" (${fmtSize(size)}). Do you want to`);
      d.append(" ", acc, " or ", dec, "?"); play("newalert"); logHist(c.email, "", `(file offered: ${f.name})`);
      dec.addEventListener("click", (e) => { e.preventDefault(); d.replaceChildren(`You have declined the file "${f.name}".`); });
      acc.addEventListener("click", async (e) => {
        e.preventDefault(); d.replaceChildren(`You have accepted the file "${f.name}".`);
        progress(f.name, size, "Receiving", async () => {
          try { if (!ctx.fs.exists(RECV_DIR)) await ctx.fs.mkdir(RECV_DIR); const dest = RECV_DIR + "/" + ctx.fs.uniqueName(RECV_DIR, f.name); await ctx.fs.writeFile(dest, f.body, { mime: f.mime }); play("newalert"); sysLine(`The file "${f.name}" was successfully received.`, Object.assign(el("a", { href: "#", text: "Open" }), { onclick: (ev) => { ev.preventDefault(); ctx.openFile(dest); } })); logHist(c.email, "", `(file received: ${f.name})`); }
          catch (err) { sysLine(`The file could not be saved: ${err.message || err}`); }
        });
      });
    };
    // ----- sending messages -----
    const send = () => {
      const t = input.innerHTML.includes("<img") ? [...input.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : n.alt || n.innerText || "")).join("") : textOf();
      const txt = t.trim();
      if (!txt) return;
      add(me.name, emoOn ? withEmoticons(txt) : esc(txt), true);
      input.innerHTML = ""; input.focus();
      if (c.blocked) return sysLine(`${c.name} is blocked and will not receive your messages.`);
      if (c.status === "offline") return sysLine(`${c.name} appears to be offline and will receive your messages when he or she signs in.`);
      const away = ["busy", "away", "brb", "lunch", "phone"].includes(c.status);
      if (away && !autoSent) { autoSent = true; lat(() => { play("type"); add(c.name, esc(`Auto-Reply: ${c.auto || `I'm ${STATUS[c.status].label.toLowerCase()} right now.`}`), false); }, 900); if (c.status === "busy" || c.status === "phone") return; }
      if (away && Math.random() < 0.5) return;
      typeThen(() => { receive(pickReply(c, txt)); if (/(dosya|resim|foto|şarkı|mp3)/i.test(txt) && Math.random() < 0.6) lat(receiveFile, 2200); });
    };
    const insertEmo = (i) => { input.focus(); document.execCommand("insertText", false, (EMOS[i]?.[0] || "") + " "); };
    const emoPalette = (anchor) => {
      const r = anchor.getBoundingClientRect();
      const grid = el("div", { class: "msn-emo-grid" }, ...Array.from({ length: 47 }, (_, i) => { const b = el("button", { type: "button", class: "msn-emo-b", title: EMOS[i]?.[0] || "" }, el("img", { src: `${U}emo/${i}.png`, width: 19, height: 19, alt: "" })); b.addEventListener("click", () => { grid.remove(); insertEmo(i); }); return b; }));
      grid.style.cssText = `position:fixed;left:${r.left}px;top:${Math.max(0, r.top - 128)}px;z-index:99999`;
      document.body.append(grid);
      const off = (e) => { if (!grid.contains(e.target)) { grid.remove(); document.removeEventListener("pointerdown", off, true); } };
      setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
    };
    const tb = (idx, label, fn) => { const b = el("button", { type: "button", class: "msn-tb" }, sprite("bl2", 30, 28, idx), el("span", { text: label })); b.addEventListener("click", () => fn(b)); return b; };
    const saveConv = async () => {
      const p = await ctx.dialogs.file({ mode: "save", path: "C:/Documents and Settings/Administrator/My Documents", name: `${c.name}.txt` });
      if (p) ctx.fs.writeFile(p, log.innerText);
    };
    const convActs = {
      40017: () => cw.close(), 40014: () => saveConv(), 40015: () => saveConv(), 40020: () => { emoOn = !emoOn; },
      40276: () => toggleBlock(c), 40265: () => note(`${c.name}\n${c.email}`, "View Profile"), 40045: () => note(`${c.name}\n${c.email}\n\nStatus: ${STATUS[c.status].label}`, "Properties"),
      40205: () => (location.href = "mailto:" + c.email), 40222: () => { const rg = document.createRange(); rg.selectNodeContents(log); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(rg); }, 40219: () => document.execCommand("copy"), 40218: () => document.execCommand("cut"), 40220: () => document.execCommand("paste"), 40221: () => document.execCommand("delete"), 40223: () => document.execCommand("undo"),
      40452: () => side.classList.toggle("hidden"),
      40157: () => ctx.launch("help", { topic: "intro" }),
    };
    const m = R.menus["109"];
    const cmenus = menuBar({
      File: () => tidy([...conv(m[0].items, convActs), { separator: true }, { label: "Send a File...", action: sendFile }, { label: "Message History...", action: () => historyWin(c) }]),
      Edit: () => conv(m[1].items, convActs),
      View: () => conv(m[2].items, convActs).map((i) => (i.label === "Enable Emoticons" ? { ...i, checked: emoOn } : i)),
      Actions: () => tidy([{ label: "Send a Nudge", action: sendNudge }, { label: "Send a File...", action: sendFile }, { separator: true }, ...conv(m[3].items, convActs)]),
      Help: () => conv(R.menus["299"], mainActs),
    });
    const toolbar = el("div", { class: "msn-toolbar" },
      tb(0, "Send Files", sendFile), tb(6, "E-mail", () => (location.href = "mailto:" + c.email)), tb(12, "Nudge", sendNudge), tb(15, "History", () => historyWin(c)), tb(3, c.blocked ? "Unblock" : "Block", (b) => { toggleBlock(c); b.querySelector("span").textContent = c.blocked ? "Unblock" : "Block"; }),
    );
    const picC = el("img", { src: c.photo, alt: c.name }), picMe = el("img", { src: myPic(), alt: me.name, title: "Click to change your display picture" });
    picMe.addEventListener("click", pictureDlg);
    const side = el("div", { class: "msn-side" }, el("div", { class: "msn-pic", title: c.name }, picC), el("div", { class: "msn-pic-me" }, picMe));
    const emoBtn = el("button", { type: "button", class: "msn-fbtn", title: "Emoticons" }, sprite("bl2", 30, 28, 11));
    emoBtn.addEventListener("click", () => emoPalette(emoBtn));
    const sendBtn = button("Send", send, { class: "msn-send" });
    const toBar = el("div", { class: "msn-to" }, el("b", { text: "To: " }), el("span", { text: `${c.name} <${c.email}>` }));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    const status = el("span", { text: `Last message received: ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` });
    cw.setContent(cmenus, toolbar, toBar, el("div", { class: "msn-conv" },
      el("div", { class: "msn-main" }, log, typing, el("div", { class: "msn-fmt" }, emoBtn), el("div", { class: "msn-edit" }, input, sendBtn)),
      side,
    ), el("div", { class: "msn-status" }, status));
    cw.onClose = () => { timers.forEach((t) => { clearTimeout(t); bgTimers.delete(t); }); cleanups.forEach((f) => f()); convs.delete(c.email); return true; };
    convs.set(c.email, { win: cw, receive, receiveNudge, receiveFile, sendFile, sysLine, refreshPic: () => { picMe.src = myPic(); } });
    const old = (prof.history[c.email] || []).slice(-4);
    if (old.length) { const h = el("div", { class: "msn-old" }, el("div", { text: "Last messages from your previous conversation:" }), ...old.map((x) => el("div", { text: `${x.who ? x.who + ": " : ""}${x.text}` }))); log.append(h); }
    sysLine(c.blocked ? `You have blocked ${c.name}.` : c.status === "offline" ? `${c.name} appears to be offline.` : `Conversation with ${c.name} started.`);
    setTimeout(() => input.focus(), 60);
    if (!incoming && c.status === "online" && !c.blocked && Math.random() < 0.6) lat(() => receive("hey " + me.name + "! :)"), 1500);
    if (!incoming && c.status === "online" && !c.blocked && Math.random() < 0.12) lat(receiveFile, 5000);
  };
  const basename0 = (p) => p.split(/[\\/]/).pop();

  w.setContent(menus, body, statusBar);
  w.onClose = () => { for (const t of bgTimers) clearTimeout(t); for (const c of convs.values()) c.win.close(); return true; };
  body.addEventListener("click", (e) => { if (e.target.closest(".msn-signin-text")) clickSignIn(); });
  signInView();
  return w;
}
