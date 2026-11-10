// MSN Messenger 5.0 look-alike (offline simulation with made-up contacts).
// Menus, dialog templates, strings, icons, emoticons and sounds come from the real MSN Messenger 5.0 installer
// (msnmsgr.exe / msgslang.dll), extracted into assets/ui/msn and assets/sounds/msn.
import { el, button, popup, menuBar, icon, separator } from "../ui/index.js";
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

const CONTACTS = [
  { name: "Ayşe", email: "ayse_k@hotmail.com", status: "online", replies: ["selam! nasılsın?", "bugün ders çok sıkıcıydı :(", "akşam msn'de buluşalım mı?", "haha :D"] },
  { name: "Mehmet", email: "mehmet.c@hotmail.com", status: "busy", replies: ["şu an biraz meşgulüm", "sonra yazarım", "tamam :)"] },
  { name: "Zeynep", email: "zeynep_88@hotmail.com", status: "away", replies: ["ben yokum şu an...", "geri dönünce yazarım"] },
  { name: "Can", email: "can_gamer@hotmail.com", status: "online", replies: ["counter strike oynuyoruz, gelsene", "(H) ping 40 yaa", "lan yine mi kaybettik :@"] },
  { name: "Elif", email: "elifcim@hotmail.com", status: "phone", replies: ["telefondayım, 5 dk", "(T)"] },
  { name: "Burak", email: "burak_34@hotmail.com", status: "offline", replies: [] },
  { name: "Selin", email: "selin.y@hotmail.com", status: "offline", replies: [] },
  { name: "Okul Grubu", email: "okulgrup@hotmail.com", status: "offline", replies: [] },
];

export async function openMessenger(ctx) {
  const R = await load();
  const saved = ctx.settings.get("msn") || {};
  const w = ctx.wm.create({ title: "MSN Messenger", icon: "msn", width: 246, height: 500, x: 700, y: 40, appId: "msn", maximizable: false });
  let me = null; // { email, name, status }
  let contacts = CONTACTS.map((c) => ({ ...c }));
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
  const na = (what) => note(`${what} is not available in this version of MSN Messenger.`);

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
        el("div", { class: "msn-note", text: "Not signed in to .NET Messenger Service" }),
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
      const arrow = sprite("be402", 22, 17, collapsed[key] ? 15 : 16, "msn-arrow");
      const head = el("div", { class: "msn-group" }, arrow, el("span", { text: `${label} (${list.length})` }));
      head.addEventListener("click", () => { collapsed[key] = !collapsed[key]; listView(); });
      const rows = collapsed[key] ? [] : list.map((c) => {
        const r = el("div", { class: "msn-contact" + (key === "offline" ? " off" : ""), tabindex: "0" }, statusIcon(c.status), el("span", { class: "msn-cname", text: c.name }), c.status !== "online" && key === "online" ? el("span", { class: "msn-cst", text: ` (${STATUS[c.status].label})` }) : null);
        r.title = `${c.name}\n${c.email}`;
        r.addEventListener("dblclick", () => openConversation(c));
        r.addEventListener("click", () => { body.querySelectorAll(".msn-contact.sel").forEach((x) => x.classList.remove("sel")); r.classList.add("sel"); sel = c; });
        r.addEventListener("contextmenu", (e) => { e.preventDefault(); sel = c; popup(contactMenu(c), e.clientX, e.clientY, {}); });
        return r;
      });
      return el("div", { class: "msn-grp" }, head, ...rows);
    };
    const listBox = el("div", { class: "msn-list" }, group("online", "Online", online), group("offline", "Not Online", offline));
    const acts = el("div", { class: "msn-acts" }, el("div", { class: "msn-acts-h", text: "I want to..." }),
      ...[["Add a Contact", 1, addContact], ["Send an Instant Message", 2, () => (sel ? openConversation(sel) : note("Please select a contact first."))], ["Send a File or Photo", 3, () => na("Sending files")], ["Send E-mail", 8, () => (sel ? (location.href = "mailto:" + sel.email) : note("Please select a contact first."))], ["Send a Message to a Mobile Device", 7, () => na("Mobile messaging")]]
        .map(([t, i, fn]) => { const a = el("div", { class: "msn-act" }, sprite("be291", 16, 16, i), el("a", { href: "#", text: t })); a.addEventListener("click", (e) => { e.preventDefault(); fn(); }); return a; }));
    body.replaceChildren(header, mail, listBox, acts);
    w.setTitle(`${me.name} - MSN Messenger`);
    statusBar.textContent = me.status === "offline" ? "Appearing offline" : "Signed in as " + me.email;
  };
  let sel = null;

  // ---------- menus (real resources) ----------
  const T = (m) => m.label.split("\t");
  const conv = (list, acts) => list.map((m) => {
    if (m.sep) return { separator: true };
    if (m.popup) return { label: plain(m.popup).trim(), submenu: conv(m.items, acts) };
    const [lab, sc] = T(m);
    const text = plain(lab).trim();
    if (text.length <= 1) return null; // runtime-filled items (original shows state-dependent text)
    return { label: text, shortcut: sc, action: acts[m.id] || (() => na(text)), disabled: !acts[m.id] && !!m.flags && !!(m.flags & 3) };
  }).filter(Boolean);
  const statusItems = () => Object.entries(STATUS).map(([k, s]) => ({ label: s.label, checked: me?.status === k, action: () => setStatus(k) }));
  const setStatus = (k) => { if (!me) return; me.status = k; listView(); };
  const mainActs = {
    40003: () => w.close(), 40210: () => signOut(), 40282: () => addContact(), 40004: () => (sel ? openConversation(sel) : note("Please select a contact first.")),
    40205: () => (sel ? (location.href = "mailto:" + sel.email) : note("Please select a contact first.")), 40268: () => options(), 40000: () => about(), 40157: () => ctx.launch("help", { topic: "intro" }),
    40278: () => window.open("https://www.msn.com/", "_blank", "noopener,noreferrer"), 40198: () => window.open("https://outlook.live.com/", "_blank", "noopener,noreferrer"),
    40289: () => removeContact(), 40283: () => (sel ? note(`${sel.name}\n${sel.email}`, "View Profile") : note("Please select a contact first.")), 40284: () => (sel ? note(`${sel.name}\n${sel.email}\n\nStatus: ${STATUS[sel.status].label}`, "Properties") : note("Please select a contact first.")),
    40285: () => {}, 40286: () => {}, 40044: () => {},
    40166: () => setStatus("online"), 40168: () => setStatus("busy"), 40169: () => setStatus("brb"), 40170: () => setStatus("away"), 40171: () => setStatus("phone"), 40172: () => setStatus("lunch"), 40167: () => setStatus("offline"),
    40041: () => (sel ? note(`${sel.name}\n${sel.email}`, "Properties") : 0), 40040: () => (sel ? openConversation(sel) : 0), 40043: () => removeContact(), 40197: () => (sel ? (location.href = "mailto:" + sel.email) : 0),
  };
  const contactMenu = (c) => conv(R.menus["208"], { ...mainActs, 40040: () => openConversation(c), 40043: () => removeContact(c), 40197: () => (location.href = "mailto:" + c.email), 40041: () => note(`${c.name}\n${c.email}\n\nStatus: ${STATUS[c.status].label}`, "Properties"), 40241: () => note(`${c.name}\n${c.email}`, "View Profile") });
  const helpItems = () => conv(R.menus["299"], mainActs);
  const menus = menuBar({
    File: () => conv(R.menus["200"][0].items.filter((m) => !(m.sep === undefined && m.id === 40001 && false)), mainActs).map((i) => (i.label === "My Status" ? { ...i, submenu: statusItems(), disabled: !me } : i)),
    Actions: () => conv(R.menus["200"][1].items, mainActs),
    Tools: () => conv(R.menus["200"][2].items, mainActs),
    Help: helpItems,
  });
  const clickSignIn = () => (me ? note("You are already signed in.") : doSignIn());

  // ---------- sign in / out ----------
  const doSignIn = async () => {
    const dlg = buildDialog(R.dialogs["201"], { uid: 11 });
    ctl.value(dlg.byId(1000), saved.email || "");
    ctl.value(dlg.byId(1001), saved.pass || "");
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
    me = { email: r.email, name: (nm || "Me").replace(/\b\w/g, (c) => c.toUpperCase()), status: "online" };
    contacts = CONTACTS.map((c) => ({ ...c }));
    play("online");
    listView();
    // a contact signs in later, like the real thing
    later(() => { const c = contacts.find((x) => x.name === "Burak"); if (me && c && c.status === "offline") { c.status = "online"; play("online"); listView(); toast(`${c.name} has just signed in.`, c); } }, 9000);
  };
  const signOut = () => { for (const c of convs.values()) c.win.close(); convs.clear(); me = null; sel = null; signInView(); };

  const toast = (text, c) => {
    const t = el("div", { class: "msn-toast" }, el("img", { src: U + "p773.png", alt: "" }), el("div", {}, el("div", { class: "msn-toast-h", text: "MSN Messenger" }), el("div", { text })));
    w.el.append(t);
    t.addEventListener("click", () => { t.remove(); if (c) openConversation(c); });
    later(() => t.remove(), 6000);
  };

  // ---------- contacts ----------
  const addContact = async () => {
    if (!me) return note("You must sign in before you can add a contact.");
    const email = await ctx.dialogs.prompt("Please type your contact's complete e-mail address:\nExample: name_123@hotmail.com", "", { title: "Add a Contact" });
    if (!email) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return note("The e-mail address you typed is not valid.", "Add a Contact", "error");
    const e = email.trim();
    if (contacts.some((c) => c.email.toLowerCase() === e.toLowerCase())) return note(`${e} is already in your contact list.`, "Add a Contact");
    contacts.push({ name: e.split("@")[0], email: e, status: "offline", replies: [] });
    listView();
  };
  const removeContact = async (c = sel) => {
    if (!c) return note("Please select a contact first.");
    if ((await ctx.dialogs.message(`Are you sure you want to delete ${c.name} from your contact list?`, { title: "Delete a Contact", icon: "question", buttons: ["Yes", "No"], defaultButton: 1 })) !== "Yes") return;
    contacts = contacts.filter((x) => x !== c); convs.get(c.email)?.win.close(); sel = null; listView();
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
    modal("Options", t.root, { collect: () => { if (firstEdit && me && ctl.value(firstEdit).trim()) { me.name = ctl.value(firstEdit).trim(); listView(); } return true; } });
  };

  // ---------- conversation window ----------
  const openConversation = (c) => {
    if (!me) return note("You must sign in first.");
    if (convs.has(c.email)) { convs.get(c.email).win.focus?.(); return; }
    const cw = ctx.wm.create({ title: `${c.name} - Conversation`, icon: "msn", width: 560, height: 430, x: 90 + convs.size * 26, y: 60 + convs.size * 26, appId: "msn-chat" });
    const log = el("div", { class: "msn-log" });
    const typing = el("div", { class: "msn-typing" });
    const input = el("div", { class: "msn-input", contenteditable: "true", spellcheck: "false", role: "textbox", "aria-label": "Message" });
    let emoOn = true, started = false;
    const add = (who, html, self) => {
      const line = el("div", { class: "msn-line" });
      line.innerHTML = `<div class="msn-from">${esc(who)} says:</div><div class="msn-txt">${html}</div>`;
      log.append(line); log.scrollTop = log.scrollHeight;
    };
    const sys = (t) => { const d = el("div", { class: "msn-sys", text: t }); log.append(d); log.scrollTop = log.scrollHeight; };
    const textOf = () => input.innerText.replace(/\u00a0/g, " ").trim();
    const reply = () => {
      if (c.status === "offline") return;
      const pool = c.replies.length ? c.replies : ["..."];
      typing.textContent = `${c.name} is typing a message.`;
      later(() => { typing.textContent = ""; add(c.name, withEmoticons(pool[Math.floor(Math.random() * pool.length)]), false); play("type"); }, 1200 + Math.random() * 1500);
    };
    const send = () => {
      const t = input.innerHTML.includes("<img") ? [...input.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : n.alt || n.innerText || "")).join("") : textOf();
      const txt = t.trim();
      if (!txt) return;
      if (!started) { started = true; }
      add(me.name, emoOn ? withEmoticons(txt) : esc(txt), true);
      input.innerHTML = ""; input.focus();
      if (c.status === "offline") sys(`${c.name} appears to be offline and will receive your messages when he or she signs in.`);
      else if (["busy", "away", "brb", "lunch", "phone"].includes(c.status) && Math.random() < 0.5) later(() => { sys(`Auto-Reply from ${c.name}: I'm ${STATUS[c.status].label.toLowerCase()} right now.`); }, 900);
      else reply();
    };
    const insertEmo = (i) => {
      input.focus();
      const code = EMOS[i]?.[0] || "";
      document.execCommand("insertText", false, code + " ");
    };
    const emoPalette = (anchor) => {
      const r = anchor.getBoundingClientRect();
      const grid = el("div", { class: "msn-emo-grid" }, ...Array.from({ length: 47 }, (_, i) => { const b = el("button", { type: "button", class: "msn-emo-b", title: EMOS[i]?.[0] || "" }, el("img", { src: `${U}emo/${i}.png`, width: 19, height: 19, alt: "" })); b.addEventListener("click", () => { grid.remove(); insertEmo(i); }); return b; }));
      grid.style.cssText = `position:fixed;left:${r.left}px;top:${Math.max(0, r.top - 128)}px;z-index:99999`;
      document.body.append(grid);
      const off = (e) => { if (!grid.contains(e.target)) { grid.remove(); document.removeEventListener("pointerdown", off, true); } };
      setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
    };
    const tb = (idx, label, fn, dd = false) => { const b = el("button", { type: "button", class: "msn-tb" }, sprite("bl2", 30, 28, idx), el("span", { text: label })); b.addEventListener("click", () => fn(b)); return b; };
    const convActs = {
      40017: () => cw.close(), 40014: () => saveConv(), 40015: () => saveConv(), 40211: () => na("Changing the font"), 40020: () => { emoOn = !emoOn; },
      40263: () => {}, 40276: () => note(`${c.name} has been blocked.`, "Block"), 40265: () => note(`${c.name}\n${c.email}`, "View Profile"), 40045: () => note(`${c.name}\n${c.email}`, "Properties"),
      40205: () => (location.href = "mailto:" + c.email), 40222: () => { const rg = document.createRange(); rg.selectNodeContents(log); const s = getSelection(); s.removeAllRanges(); s.addRange(rg); }, 40219: () => document.execCommand("copy"), 40218: () => document.execCommand("cut"), 40220: () => document.execCommand("paste"), 40221: () => document.execCommand("delete"), 40223: () => document.execCommand("undo"),
      40027: () => {}, 40450: () => {}, 40452: () => side.classList.toggle("hidden"),
      40157: () => ctx.launch("help", { topic: "intro" }),
    };
    const saveConv = async () => {
      const p = await ctx.dialogs.file({ mode: "save", path: "C:/Documents and Settings/Administrator/My Documents", name: `${c.name}.txt` });
      if (p) ctx.fs.writeFile(p, log.innerText);
    };
    const m = R.menus["109"];
    const cmenus = menuBar({
      File: () => conv(m[0].items, convActs),
      Edit: () => conv(m[1].items, convActs),
      View: () => conv(m[2].items, convActs).filter((i) => !/Video|Audio|Picture-in-Picture/.test(i.label)).map((i) => (i.label === "Enable Emoticons" ? { ...i, checked: emoOn } : i)),
      Actions: () => conv(m[3].items, convActs),
      Help: () => conv(R.menus["299"], mainActs),
    });
    const toolbar = el("div", { class: "msn-toolbar" },
      tb(1, "Invite", () => na("Inviting someone to a conversation")), tb(0, "Send Files", () => na("Sending files")), tb(6, "E-mail", () => (location.href = "mailto:" + c.email)),
      tb(8, "Call", () => na("Phone calls")), tb(3, "Block", () => note(`${c.name} has been blocked.`, "Block")),
    );
    const side = el("div", { class: "msn-side" },
      el("div", { class: "msn-pic" }, el("img", { src: U + "be724.png", alt: "" })),
      el("div", { class: "msn-pic-me" }, el("img", { src: U + "be724.png", alt: "" })),
    );
    const emoBtn = el("button", { type: "button", class: "msn-fbtn", title: "Emoticons" }, sprite("bl2", 30, 28, 11));
    emoBtn.addEventListener("click", () => emoPalette(emoBtn));
    const fontBtn = el("button", { type: "button", class: "msn-fbtn", title: "Change font" }, sprite("bl2", 30, 28, 10));
    fontBtn.addEventListener("click", () => na("Changing the font"));
    const sendBtn = button("Send", send, { class: "msn-send" });
    const toBar = el("div", { class: "msn-to" }, el("b", { text: "To: " }), el("span", { text: `${c.name} <${c.email}>` }));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    cw.setContent(cmenus, toolbar, toBar, el("div", { class: "msn-conv" },
      el("div", { class: "msn-main" }, log, typing, el("div", { class: "msn-fmt" }, fontBtn, emoBtn), el("div", { class: "msn-edit" }, input, sendBtn)),
      side,
    ), el("div", { class: "msn-status" }, el("span", { text: `Last message received: ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` })));
    cw.onClose = () => { convs.delete(c.email); return true; };
    convs.set(c.email, { win: cw });
    sys(c.status === "offline" ? `${c.name} appears to be offline.` : `Conversation with ${c.name} started.`);
    setTimeout(() => input.focus(), 60);
    if (c.status === "online" && Math.random() < 0.6) later(() => { add(c.name, withEmoticons("hey " + me.name + "! :)"), false); play("type"); }, 1500);
  };

  w.setContent(menus, body, statusBar);
  w.onClose = () => { for (const t of bgTimers) clearTimeout(t); for (const c of convs.values()) c.win.close(); return true; };
  body.addEventListener("click", (e) => { if (e.target.closest(".msn-signin-text")) clickSignIn(); });
  signInView();
  return w;
}
