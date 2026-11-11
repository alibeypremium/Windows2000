import { el, button, icon, field, toolbar, statusBar, separator, popup } from "../ui/index.js";
import { DOCS, downloadFile, pickFiles } from "../core/index.js";
import { loadOeMenus, oeMenu } from "./oe-menu.js";
import { oeAbout, oeNewFolder, oeFind, oeLayout, oeOptions } from "./oe-dialogs.js";
import { openRules } from "./oe-rules.js";
import { MAIL, CONTACTS, addr, emailOf, nameOf, splitAddrs, checkMail, flushOutbox, sendLaterToOutbox, applyRules, fmtSize } from "./mail-server.js";

const read = (ctx, path, initial) => {
  try {
    return JSON.parse(ctx.fs.readFile(path));
  } catch {
    return initial;
  }
};
const ATT_DIR = DOCS + "/Mail Attachments";
const TEXT_EXT = /\.(txt|json|wdoc|html?|csv|log|ini|md|xml)$/i;
const me = (ctx) => addr(ctx.settings.get("username") || "Administrator", "kullanici@hotmail.com");
const quote = (m) => `\n\n-----Original Message-----\nFrom: ${m.from || ""}\nSent: ${new Date(m.date).toLocaleString("en-US")}\nTo: ${m.to || ""}\nSubject: ${m.subject || ""}\n\n${m.body || ""}`;
const readFileAs = (f, asText) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; asText ? r.readAsText(f) : r.readAsDataURL(f); });

async function saveAtt(ctx, att) {
  if (!ctx.fs.exists(ATT_DIR)) await ctx.fs.mkdir(ATT_DIR);
  const path = ATT_DIR + "/" + ctx.fs.uniqueName(ATT_DIR, att.name);
  await ctx.fs.writeFile(path, att.data, { mime: att.mime, encoding: att.enc === "data-url" ? "data-url" : undefined });
  return path;
}
const openAtt = async (ctx, att) => ctx.openFile(await saveAtt(ctx, att));
async function saveAllAtts(ctx, atts) {
  if (!atts?.length) return ctx.dialogs.message("This message has no attachments.", { title: "Outlook Express", icon: "oe" });
  for (const a of atts) await saveAtt(ctx, a);
  ctx.dialogs.message(`${atts.length} attachment(s) saved to My Documents\\Mail Attachments.`, { title: "Save Attachments", icon: "oe" });
}
const attLine = (ctx, atts) =>
  atts?.length
    ? el("div", { class: "oe-attrow" }, el("span", { class: "lbl", text: "Attach:" }), ...atts.map((a) => { const s = el("span", { class: "oe-att", title: "Open " + a.name }, icon(/\.(png|jpe?g|gif|bmp)$/i.test(a.name) ? "paint" : "document", 16), `${a.name} (${fmtSize(a.size || a.data?.length || 0)})`); s.addEventListener("dblclick", () => openAtt(ctx, a).catch((e) => ctx.dialogs.error(e))); s.addEventListener("click", () => openAtt(ctx, a).catch((e) => ctx.dialogs.error(e))); return s; }))
    : null;

async function addSender(ctx, m) {
  const e = emailOf(m.from);
  if (!e.includes("@")) return;
  const list = read(ctx, CONTACTS, []);
  if (list.some((c) => (c.email || "").toLowerCase() === e)) return ctx.dialogs.message(`${nameOf(m.from)} is already in your Address Book.`, { title: "Address Book", icon: "address" });
  await ctx.fs.updateJSON(CONTACTS, (l) => [...(Array.isArray(l) ? l : []), { id: crypto.randomUUID(), name: nameOf(m.from), email: e, phone: "", home: "", company: "" }]);
  ctx.dialogs.message(`${nameOf(m.from)} was added to your Address Book.`, { title: "Address Book", icon: "address" });
}

function pickRecipients(ctx, apply) {
  const contacts = read(ctx, CONTACTS, []);
  const d = ctx.wm.create({ title: "Select Recipients", icon: "address", width: 470, height: 320, dialog: true, resizable: false, maximizable: false, minimizable: false, appId: "dialog" });
  const sel = new Set(), to = [], cc = [];
  const list = el("div", { class: "oer-list", style: { height: "200px" } }), boxTo = el("div", { class: "oer-desc" }), boxCc = el("div", { class: "oer-desc" });
  const draw = () => {
    list.replaceChildren(...contacts.map((c) => { const r = el("div", { class: "oer-row" + (sel.has(c.id) ? " sel" : "") }, icon("address", 16), el("span", { text: `${c.name}  ${c.email || ""}` })); r.addEventListener("click", () => { sel.has(c.id) ? sel.delete(c.id) : sel.add(c.id); draw(); }); return r; }));
    boxTo.textContent = "Message recipients:  " + to.map((c) => c.name).join("; ");
    boxCc.textContent = "Copy recipients:  " + cc.map((c) => c.name).join("; ");
  };
  const add = (arr) => { for (const c of contacts) if (sel.has(c.id) && !arr.includes(c)) arr.push(c); sel.clear(); draw(); };
  d.setContent(el("div", { class: "oer" }, el("p", { class: "oer-p", text: "Type a name or select from the list (click names to select several):" }),
    el("div", { class: "oer-cols" }, list, el("div", { class: "oer-btns" }, button("To ->", () => add(to)), button("Cc ->", () => add(cc)))),
    boxTo, boxCc,
    el("div", { class: "dialog-buttons" }, button("OK", () => { apply(to.map((c) => addr(c.name, c.email)), cc.map((c) => addr(c.name, c.email))); d.close(); }), button("Cancel", () => d.close()))));
  draw();
}

export function openMail(ctx, { compose = false, to = "", reply = null, replyAll = false, forward = null, draft: existingDraft = null, subject: subj = "", body: bodyText = "", attachments: preAtts = [] } = {}) {
  if (compose) return openCompose(ctx, { to, reply, replyAll, forward, existingDraft, subj, bodyText, preAtts });
  return openInbox(ctx);
}

/* ======================================================================= compose */
function openCompose(ctx, { to, reply, replyAll, forward, existingDraft, subj = "", bodyText = "", preAtts = [] }) {
  const w = ctx.wm.create({ title: "New Message", icon: "mail", width: 650, height: 480, appId: "compose" });
  const sig = (ctx.settings.get("oeOptions") || {})[5] || {};
  const sigText = sig[1099] && sig.sigText ? "\n\n-- \n" + sig.sigText : "";
  const seed = existingDraft
    ? { ...existingDraft }
    : reply
      ? {
          to: replyAll ? [reply.from, ...splitAddrs(reply.to).filter((x) => emailOf(x) !== "kullanici@hotmail.com")].join("; ") : reply.from || "",
          cc: replyAll ? reply.cc || "" : "",
          subject: /^re:/i.test(reply.subject || "") ? reply.subject : "Re: " + (reply.subject || ""),
          body: (sig[1100] ? "" : sigText) + quote(reply),
          attachments: [],
        }
      : forward
        ? { to: "", cc: "", subject: /^fw:/i.test(forward.subject || "") ? forward.subject : "Fw: " + (forward.subject || ""), body: sigText + quote(forward), attachments: forward.attachments || [] }
        : { to: to || "", cc: "", subject: subj, body: bodyText ? bodyText + sigText : sigText, attachments: preAtts };
  if (seed.subject) w.setTitle?.(seed.subject);
  const contacts = read(ctx, CONTACTS, []);
  const dl = el("datalist", { id: "oe-ac-" + Math.random().toString(36).slice(2) }, ...contacts.flatMap((c) => [c.email ? el("option", { value: c.email }) : null, c.name ? el("option", { value: c.name }) : null]));
  const toInput = el("input", { value: seed.to || "", "aria-label": "To", list: dl.id }),
    cc = el("input", { value: seed.cc || "", "aria-label": "Cc", list: dl.id }),
    subject = el("input", { value: seed.subject || "", "aria-label": "Subject" }),
    body = el("textarea", { class: "mail-compose-body", "aria-label": "Message body", spellcheck: true, value: seed.body || "" });
  let atts = [...(seed.attachments || [])];
  const attBox = el("div", { class: "mail-attach hidden" });
  const drawAtts = () => {
    attBox.classList.toggle("hidden", !atts.length);
    attBox.replaceChildren(el("b", { text: "Attach:" }), ...atts.map((a, i) => {
      const c = el("span", { class: "chip", title: "Double-click to open, right-click to remove" }, icon("document", 16), `${a.name} (${fmtSize(a.size || 0)})`);
      c.addEventListener("dblclick", () => openAtt(ctx, a).catch((e) => ctx.dialogs.error(e)));
      c.addEventListener("contextmenu", (e) => { e.preventDefault(); popup([{ label: "Open", action: () => openAtt(ctx, a) }, { label: "Remove", action: () => { atts.splice(i, 1); drawAtts(); } }], e.clientX, e.clientY); });
      return c;
    }));
  };
  const attach = async () => {
    const files = await pickFiles({ multiple: true });
    for (const f of files) {
      if (f.size > 3 * 1024 * 1024) { ctx.dialogs.message(`${f.name} is larger than 3 MB and cannot be attached.`, { title: "Outlook Express", icon: "oe" }); continue; }
      const text = TEXT_EXT.test(f.name);
      atts.push({ name: f.name, mime: f.type || "application/octet-stream", enc: text ? "text" : "data-url", data: await readFileAs(f, text), size: f.size });
    }
    drawAtts();
  };
  drawAtts();
  const id = existingDraft?.id || crypto.randomUUID();
  const fields = () => ({ to: toInput.value, cc: cc.value, subject: subject.value, body: body.value, attachments: atts });
  const sigOf = () => JSON.stringify({ ...fields(), attachments: atts.map((a) => a.name + a.size) });
  let baseline = sigOf(), stored = existingDraft ? JSON.stringify(existingDraft) : null, closing = false;
  const dirty = () => sigOf() !== baseline;
  const build = (folder) => ({ id, folder, ...fields(), date: Date.now(), from: me(ctx), unread: false });
  const upsert = async (message) => {
    await ctx.fs.updateJSON(MAIL, (mail) => {
      if (!Array.isArray(mail)) throw new Error("The mail store has an invalid format.");
      const old = mail.find((m) => m.id === id);
      if (stored && old && JSON.stringify(old) !== stored) throw new Error("This draft changed in another window. Reopen it before saving further changes.");
      return old ? mail.map((m) => (m.id === id ? message : m)) : [...mail, message];
    });
    stored = JSON.stringify(message);
    ctx.bus.emit("mail:change");
  };
  const save = async () => { const m = build("Drafts"); await upsert(m); baseline = sigOf(); return m; };
  const checkNames = (quiet = false) => {
    const out = [];
    for (const raw of splitAddrs(toInput.value)) {
      if (raw.includes("@")) { out.push(raw); continue; }
      const c = contacts.find((x) => (x.name || "").toLowerCase() === raw.toLowerCase()) || contacts.find((x) => (x.name || "").toLowerCase().includes(raw.toLowerCase()));
      if (!c || !c.email) { if (!quiet) ctx.dialogs.message(`Outlook Express could not resolve '${raw}'. Check the name or type an e-mail address.`, { title: "Check Names", icon: "oe" }); return false; }
      out.push(addr(c.name, c.email));
    }
    toInput.value = out.join("; ");
    return true;
  };
  const prepare = () => {
    if (!checkNames(true)) throw new Error("Outlook Express could not resolve one of the recipients. Use full e-mail addresses (name@example.com).");
    if (!splitAddrs(toInput.value).length) throw new Error("Enter an e-mail address in the To field.");
    const bad = [...splitAddrs(toInput.value), ...splitAddrs(cc.value)].find((x) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailOf(x)));
    if (bad) throw new Error(`The address '${bad}' is not a valid e-mail address.`);
  };
  const send = async () => {
    prepare();
    await upsert(build("Outbox"));
    closing = true;
    setTimeout(() => flushOutbox(ctx, 0).then(() => ctx.bus.emit("mail:change")).catch(() => {}), 1400);
    w.close();
  };
  const sendLater = async () => { prepare(); await sendLaterToOutbox(ctx, build("Outbox")); closing = true; ctx.bus.emit("mail:change"); w.close(); };
  const exportEml = () => downloadFile("Message.eml", `From: ${me(ctx)}\r\nTo: ${toInput.value}\r\nCc: ${cc.value}\r\nSubject: ${subject.value}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body.value}`, "message/rfc822");
  const paste = async () => body.setRangeText(await ctx.clipboard.getText(), body.selectionStart, body.selectionEnd, "end");
  const ed = (cmd) => ({ action: () => (body.focus(), document.execCommand(cmd)) });
  const recipients = () => pickRecipients(ctx, (t, c) => { if (t.length) toInput.value = [toInput.value, ...t].filter(Boolean).join("; "); if (c.length) cc.value = [cc.value, ...c].filter(Boolean).join("; "); });
  const err = (f) => () => f().catch((e) => ctx.dialogs.error(e));
  const cids = {
    40465: { action: () => openMail(ctx, { compose: true }) }, 40170: { action: () => openMail(ctx, { compose: true }) },
    40411: { action: err(send) }, 40225: { action: err(sendLater) }, 40227: { action: err(save) }, 40477: { action: exportEml },
    40228: { action: () => w.close() },
    40482: { action: async () => { await ctx.fs.updateJSON(MAIL, (m) => m.filter((x) => x.id !== id)); closing = true; ctx.bus.emit("mail:change"); w.close(); } },
    40229: ed("undo"), 40230: ed("cut"), 40484: ed("copy"), 40231: { action: paste },
    40125: { action: () => body.select() },
    40237: { action: err(attach) }, 40242: { action: () => (sigText ? body.setRangeText(sigText, body.selectionStart, body.selectionEnd, "end") : ctx.dialogs.message("No signature is configured. Choose Tools > Options > Signatures to create one.", { title: "Outlook Express", icon: "oe" })) },
    40264: { action: () => checkNames() }, 40265: { action: recipients },
    40199: { action: () => ctx.launch("address") },
  };
  loadOeMenus().then((m) => w.setMenu(oeMenu(m.compose, (cid) => cids[cid], {
    Help: [{ label: "Contents and Index", action: () => ctx.launch("help", { topic: "outlook" }) }, separator(), { label: "About Outlook Express", action: () => oeAbout(ctx) }],
  })));
  w.setContent(
    toolbar([
      { icon: "mail", label: "Send", action: err(send) },
      { icon: "document", label: "Attach", action: err(attach) },
      { icon: "document", label: "Save", action: err(save) },
      { icon: "address", label: "Addresses", action: recipients },
    ]),
    el("div", { class: "mail-compose-fields" }, field("To:", toInput), field("Cc:", cc), field("Subject:", subject)),
    attBox,
    body,
    dl,
    statusBar("Compose a message"),
  );
  w.onClose = async () => {
    if (closing || !dirty()) return true;
    const a = await ctx.dialogs.message("Do you want to save changes to this message?", { title: "Outlook Express", buttons: ["Yes", "No", "Cancel"] });
    if (a === "Yes") { await save(); return !dirty(); }
    return a === "No";
  };
  w.el.addEventListener("keydown", async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); try { await save(); } catch (error) { ctx.dialogs.error(error); } }
  });
  return w;
}

/* ======================================================================= main window */
function openInbox(ctx) {
  const w = ctx.wm.create({ title: "Inbox - Outlook Express", icon: "oe", width: 903, height: 652, x: 67, y: 22, appId: "outlook" });
  let folder = "Inbox", selected = null, sortAsc = true, lastNew = 0, markTimer = null;
  const OE = "/assets/ui/oe/";
  const ISO_OE = new Set(["new", "reply", "replyall", "fwd", "print", "delete", "sendrecv", "addr", "find", "prev", "next"]);
  const hotTb = (b, name) => {
    if (!ISO_OE.has(name)) return;
    const pic = b.querySelector("img"), set = (t) => { if (!b.classList.contains("off")) pic.src = `/assets/ui/oe/iso/${name}-${t}.png`; };
    pic.src = `/assets/ui/oe/iso/${name}-cold.png`;
    b.addEventListener("mouseenter", () => set("hot"));
    b.addEventListener("mouseleave", () => set("cold"));
  };
  const im = (name, cls = "", style = {}) => el("img", { src: OE + name + ".png", class: cls, draggable: "false", alt: "", style });
  const welcome = { id: "welcome", folder: "Inbox", from: "Microsoft Outlook Express Team", to: "New Outlook Express User", subject: "Welcome to Outlook Express 6", date: (ctx.settings.get("oeInstall") || ctx.settings.set("oeInstall", Date.now() - 6 * 86400000) || ctx.settings.get("oeInstall")), unread: !ctx.settings.get("mailWelcomeRead"), welcome: true, body: "", attachments: [] };
  const messages = () => [...read(ctx, MAIL, []), ...(ctx.settings.get("mailWelcomeDeleted") ? [] : [welcome])];
  const root = el("div", { class: "oe-root" }), toolbarEl = el("div", { class: "oe-toolbar" }), band = el("div", { class: "oe-band" }), foldersEl = el("div", { class: "oe-folders" }),
    contacts = el("div", { class: "oe-contacts" }), listEl = el("div", { class: "oe-list" }), rowsEl = el("div", { class: "oe-rows" }), preview = el("div", { class: "oe-preview" }),
    pvHead = el("div", { class: "oe-pvhead" }), pvBody = el("div", { class: "oe-pvbody" }), status = el("div", { class: "oe-status" }), cbody = el("div", { class: "oe-cbody" });
  const cur = () => messages().find((m) => m.id === selected);
  const customFolders = () => ctx.settings.get("oeFolders") || [];
  const allFolders = () => ["Inbox", "Outbox", "Sent Items", "Deleted Items", "Drafts", ...customFolders()];

  const patch = (id, fn) => ctx.fs.updateJSON(MAIL, (mail) => mail.map((m) => (m.id === id ? fn(m) : m)));
  const markRead = async (m, read_ = true) => {
    if (!m || !!m.unread === !read_) return;
    if (m.welcome) ctx.settings.set("mailWelcomeRead", read_);
    else await patch(m.id, (x) => ({ ...x, unread: !read_ }));
    ctx.bus.emit?.("mail:change");
  };
  const moveTo = async (m, f) => { if (!m || m.welcome) return; await patch(m.id, (x) => ({ ...x, folder: f })); selected = null; ctx.bus.emit("mail:change"); };
  const deleteMessage = async (m = cur()) => {
    if (!m) return;
    if (m.welcome) { ctx.settings.set("mailWelcomeDeleted", true); selected = null; return render(); }
    if (m.folder === "Deleted Items") {
      if (!(await ctx.dialogs.confirm("Are you sure you want to permanently delete this message?", "Outlook Express"))) return;
      await ctx.fs.updateJSON(MAIL, (mail) => mail.filter((x) => x.id !== m.id));
      selected = null; return ctx.bus.emit("mail:change");
    }
    await moveTo(m, "Deleted Items");
  };
  const emptyDeleted = async () => {
    if (!(await ctx.dialogs.confirm("Are you sure you want to permanently delete all the messages in the 'Deleted Items' folder?", "Outlook Express"))) return;
    await ctx.fs.updateJSON(MAIL, (mail) => mail.filter((x) => x.folder !== "Deleted Items"));
    selected = null; ctx.bus.emit("mail:change");
  };
  const newMail = () => openMail(ctx, { compose: true });
  const replyTo = (all = false) => { const m = cur(); if (m) openMail(ctx, { compose: true, reply: m, replyAll: all }); };
  const fwd = () => { const m = cur(); if (m) openMail(ctx, { compose: true, forward: m }); };
  const sep = (x) => el("div", { class: "oe-sep", style: { left: x + "px" } });

  const sendRecv = async (mode = "all") => {
    if (ctx.settings.get("oeOffline")) return ctx.dialogs.message("Outlook Express is working offline. On the File menu, clear 'Work Offline' and try again.", { title: "Outlook Express", icon: "oe" });
    const d = ctx.wm.create({ title: "Send/Receive", icon: "oe", width: 340, height: 130, dialog: true, resizable: false, maximizable: false, minimizable: false, appId: "dialog" });
    const line = el("div", { class: "ln" }), bar = el("progress", { max: 100, value: 0 });
    d.setContent(el("div", { class: "oe-sr" }, line, bar));
    const step = (t, v, ms) => { line.textContent = t; bar.value = v; return new Promise((r) => setTimeout(r, ms)); };
    let got = [];
    try {
      await step("Connecting to mail.hotmail.com...", 10, 600);
      if (mode !== "recv") { await step("Sending messages...", 35, 500); await flushOutbox(ctx, 0, true); }
      if (mode !== "send") { await step("Checking for new messages...", 60, 700); got = await checkMail(ctx, { force: true }); await step("Receiving messages...", 90, 500); }
      await step("Done.", 100, 250);
    } finally { d.close(); }
    lastNew = got.filter((m) => m.folder === "Inbox").length;
    if (lastNew) ctx.sound.play("mail");
    ctx.bus.emit("mail:change");
  };

  const tbtn = (cx, icn, label, { off = false, arrow = false, action } = {}) => {
    const b = el("div", { class: "oe-tb" + (off ? " off" : ""), style: { left: cx - 40 + "px" }, onclick: () => !b.classList.contains("off") && action?.() }, im(icn), el("span", { text: label }));
    hotTb(b, icn);
    if (arrow) b.append(el("i", { class: "oe-arrow", style: { left: arrow - (cx - 40) + "px" } }));
    return b;
  };
  const tbDelete = tbtn(367, "delete", "Delete", { off: true, action: () => deleteMessage() });
  toolbarEl.append(
    tbtn(41, "new", "Create Mail", { arrow: 78, action: newMail }),
    tbtn(115, "reply", "Reply", { action: () => replyTo() }),
    tbtn(176, "replyall", "Reply All", { action: () => replyTo(true) }),
    tbtn(237, "fwd", "Forward", { action: fwd }),
    sep(272),
    tbtn(305, "print", "Print", { action: () => ctx.printText(pvBody.innerText, "Outlook Express") }),
    tbDelete,
    sep(402),
    tbtn(436, "sendrecv", "Send/Recv", { arrow: 473, action: () => sendRecv() }),
    sep(484),
    tbtn(518, "addr", "Addresses", { action: () => ctx.launch("address") }),
    tbtn(578, "find", "Find", { arrow: 616, action: () => oeFind(ctx, findMessages) }),
  );

  const select = (m) => {
    selected = m.id; clearTimeout(markTimer); render();
    if (m.unread) markTimer = setTimeout(() => { if (selected === m.id) markRead(cur()); }, 1500);
  };
  const rowMenu = (e, m) => {
    e.preventDefault(); selected = m.id; render();
    popup([
      { label: "Open", action: () => (m.folder === "Drafts" ? openMail(ctx, { compose: true, draft: m }) : openRead(m)) },
      separator(),
      { label: "Reply to Sender", action: () => replyTo() }, { label: "Reply to All", action: () => replyTo(true) }, { label: "Forward", action: fwd },
      separator(),
      { label: m.unread ? "Mark as Read" : "Mark as Unread", action: () => markRead(m, !!m.unread) },
      { label: "Add Sender to Address Book", disabled: !m.from || m.welcome, action: () => addSender(ctx, m) },
      { label: "Move to", submenu: allFolders().filter((f) => f !== m.folder).map((f) => ({ label: f, action: () => moveTo(m, f) })) },
      separator(),
      { label: "Delete", action: () => deleteMessage(m) },
    ], e.clientX, e.clientY);
  };
  const FIND_TXT = (m) => `${m.from || ""} ${m.to || ""} ${m.subject || ""} ${m.body || ""}`;
  void FIND_TXT;

  const render = () => {
    w.setTitle?.(folder + " - Outlook Express");
    const all = messages();
    const unread = all.filter((m) => m.folder === "Inbox" && m.unread).length;
    band.replaceChildren(im("inboxband"), el("span", { text: folder }));
    const FOLDERS = [["Inbox", "inbox16"], ["Outbox", "outbox16"], ["Sent Items", "sent16"], ["Deleted Items", "deleted16"], ["Drafts", "drafts16"], ...customFolders().map((f) => [f, "outbox16"])];
    const count = (f) => all.filter((m) => m.folder === f && m.unread).length;
    foldersEl.replaceChildren(
      el("div", { class: "oe-phead" }, el("span", { text: "Folders" }), el("b", { class: "oe-x", text: "×" })),
      el("div", { class: "oe-fl oe-root-f" }, im("oe16"), el("span", { text: "Outlook Express" })),
      el("div", { class: "oe-fl oe-local" }, el("i", { class: "oe-minus" }), im("local16"), el("span", { text: "Local Folders" })),
      el("div", { class: "oe-dots" }),
      ...FOLDERS.map(([f, ico], i) => {
        const n = count(f), r = el("div", { class: "oe-fl oe-sub", style: { top: 52 + i * 18 + "px" }, onclick: () => { folder = f; selected = null; render(); } }, im(ico), el("span", { class: folder === f ? "sel" : "", text: f }), n ? el("em", { text: " (" + n + ")" }) : null);
        r.style.fontWeight = n ? "bold" : "";
        if (f === "Deleted Items") r.addEventListener("contextmenu", (e) => { e.preventDefault(); popup([{ label: "Empty 'Deleted Items' Folder", action: emptyDeleted }], e.clientX, e.clientY); });
        return r;
      }),
    );
    const list = all.filter((m) => m.folder === folder).sort((a, b) => (sortAsc ? a.date - b.date : b.date - a.date));
    const message = list.find((m) => m.id === selected) || list[sortAsc ? list.length - 1 : 0];
    selected = message?.id ?? null;
    tbDelete.classList.toggle("off", !message);
    const d2 = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`; };
    rowsEl.replaceChildren(...list.map((m) => {
      const r = el("div", { class: "oe-row" + (m.unread ? " unread" : "") + (selected === m.id ? " sel" : ""), onclick: () => select(m), ondblclick: () => (m.folder === "Drafts" ? openMail(ctx, { compose: true, draft: m }) : openRead(m)) },
        m.attachments?.length ? el("img", { class: "oe-clip", src: "/assets/ui/oe/clip16.png", alt: "", style: { left: "-44px" } }) : null,
        el("div", { class: "c1" }, im("env16"), el("span", { text: nameOf((folder === "Sent Items" || folder === "Outbox" || folder === "Drafts" ? m.to : m.from) || "") })),
        el("div", { class: "c2", text: m.subject || "(No subject)" }), el("div", { class: "c3", text: d2(m.date) }));
      r.addEventListener("contextmenu", (e) => rowMenu(e, m));
      return r;
    }));
    pvHead.classList.toggle("att", !!message?.attachments?.length);
    if (message) {
      pvHead.replaceChildren(
        el("div", {}, el("b", { text: "From: " }), message.from || "", message.to ? el("span", {}, el("b", { text: "   To: " }), message.to) : null),
        el("div", {}, el("b", { text: "Subject: " }), message.subject || ""),
        ...[attLine(ctx, message.attachments)].filter(Boolean),
      );
      pvBody.replaceChildren(message.welcome ? welcomeBody() : el("pre", { text: message.body || "" }));
      pvBody.scrollTop = 0;
    } else (pvHead.replaceChildren(), pvBody.replaceChildren());
    status.replaceChildren(
      el("div", { class: "s1", text: list.length + " message(s)" + (folder === "Inbox" ? ", " + unread + " unread" : "") }),
      el("div", { class: "s2" }, im("online16"), el("span", { text: ctx.settings.get("oeOffline") ? "Working Offline" : "Working Online" })),
      el("div", { class: "s3" }, im("nomail16"), el("span", { text: lastNew ? `${lastNew} new message(s)` : "No new messages" })),
    );
    drawContacts();
  };
  function drawContacts() {
    const list = read(ctx, CONTACTS, []);
    cbody.replaceChildren(...(list.length ? list.map((c) => { const r = el("div", { class: "oe-ct", title: c.email || "" }, icon("address", 16), c.name); r.addEventListener("dblclick", () => openMail(ctx, { compose: true, to: c.email ? addr(c.name, c.email) : c.name })); return r; }) : [el("div", { class: "oe-cempty", text: "There are no contacts to display. Click on Contacts to create a new contact." })]));
  }
  const welcomeBody = () => el("div", { class: "oe-welcome" }, im("banner", "oe-banner"), el("div", { class: "oe-feat", text: "Featuring" }), el("div", { class: "oe-featline" }),
    el("ul", {}, ...["E-mail and Newsgroups", "Multiple accounts and Identities", "HTML message support", "Address Book and directory services", "Offline synchronization", "Improved Inbox rules", "Message-level security", "Stationery and file attachments"].map((t) => el("li", {}, el("i"), t))),
    el("div", { class: "oe-msn" }, im("msn"), el("p", {}, "Tired of sharing your e-", el("br"), "mail account with others", el("br"), "in your household? ", el("u", { text: "Get a" }), el("br"), el("u", { text: "free Hotmail account!" }), el("br"), "Then read your mail from", el("br"), "any place on earth. ", el("u", { text: "Click" }), el("br"), el("u", { text: "here to sign up" }), " right now!")));

  /* ------------------------------------------------------------- read window */
  const openRead = async (m) => {
    if (m.unread) await markRead(m);
    const rw = ctx.wm.create({ title: m.subject || "(No subject)", icon: "oe", width: 700, height: 500, x: 90 + Math.random() * 40, y: 50 + Math.random() * 30, appId: "readmsg" });
    let c = m;
    const hdrBox = el("div", { class: "oe-rh" }), bodyBox = el("div", { class: "oe-rbody" }), tbar = el("div", { class: "oe-toolbar oe-rtoolbar" });
    const fmtD = (t) => { const d = new Date(t), days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], mon = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; return `${days[d.getDay()]}, ${mon[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`; };
    const siblings = () => messages().filter((x) => x.folder === c.folder).sort((a, b) => a.date - b.date);
    const go = (dd) => { const l = siblings(), i = l.findIndex((x) => x.id === c.id), n = l[i + dd]; if (n) { c = n; if (n.unread) markRead(n); show(); } };
    const show = () => {
      rw.setTitle?.(c.subject || "(No subject)");
      const row = (k, v) => el("div", { class: "oe-rhr" }, el("span", { class: "k", text: k }), el("span", { class: "v", text: v }));
      hdrBox.replaceChildren(row("From:", c.from || ""), row("Date:", fmtD(c.date)), row("To:", c.to || ""), ...(c.cc ? [row("Cc:", c.cc)] : []), row("Subject:", c.subject || ""), ...(c.attachments?.length ? [attLine(ctx, c.attachments)] : []));
      bodyBox.replaceChildren(c.welcome ? welcomeBody() : el("pre", { text: c.body || "" }));
    };
    const mtb = (cx, icn, label, o = {}) => { const b = el("div", { class: "oe-tb" + (o.off ? " off" : ""), style: { left: cx - 40 + "px" }, onclick: () => !o.off && o.action?.() }, im(icn), el("span", { text: label })); hotTb(b, icn); return b; };
    const rep = (all) => openMail(ctx, { compose: true, reply: c, replyAll: all === true });
    const fw = () => openMail(ctx, { compose: true, forward: c });
    const del = async () => { await deleteMessage(c); rw.close(); };
    tbar.append(mtb(41, "reply", "Reply", { action: () => rep() }), mtb(102, "replyall", "Reply All", { action: () => rep(true) }), mtb(163, "fwd", "Forward", { action: fw }), sep(198),
      mtb(231, "print", "Print", { action: () => ctx.printText(bodyBox.innerText, c.subject) }), mtb(293, "delete", "Delete", { action: del }), sep(328),
      mtb(361, "prev", "Previous", { action: () => go(-1) }), mtb(422, "next", "Next", { action: () => go(1) }), sep(458), mtb(494, "addr", "Addresses", { action: () => ctx.launch("address") }));
    rw.setContent(el("div", { class: "oe-read" }, tbar, hdrBox, bodyBox));
    const rid = {
      40465: { action: newMail }, 40170: { action: newMail }, 40228: { action: () => rw.close() }, 40482: { action: del },
      40116: { action: () => ctx.printText(bodyBox.innerText, c.subject) },
      40477: { action: () => downloadFile((c.subject || "Message") + ".eml", `From: ${c.from}\r\nTo: ${c.to}\r\nSubject: ${c.subject}\r\nDate: ${new Date(c.date).toUTCString()}\r\n\r\n${c.body}`, "message/rfc822") },
      40478: { action: () => saveAllAtts(ctx, c.attachments) },
      40480: { action: () => popup(allFolders().filter((f) => f !== c.folder).map((f) => ({ label: f, action: async () => { await moveTo(c, f); rw.close(); } })), 120, 120) },
      40484: { action: () => document.execCommand("copy") }, 40125: { action: () => document.execCommand("selectAll") },
      40145: { action: () => go(-1) }, 40146: { action: () => go(1) },
      40176: { action: () => rep() }, 40177: { action: () => rep(true) }, 40180: { action: fw },
      40199: { action: () => ctx.launch("address") }, 40200: { action: () => addSender(ctx, c) },
      40318: { action: () => openRules(ctx, { field: "from", contains: emailOf(c.from), action: "move" }) },
      40294: { action: () => openRules(ctx, { field: "from", contains: emailOf(c.from), action: "delete" }) },
      40483: { action: () => ctx.dialogs.message(`Type: Mail\nFrom: ${c.from || ""}\nSubject: ${c.subject || ""}\nAttachments: ${c.attachments?.length || 0}`, { title: "Properties", icon: "oe" }) },
    };
    loadOeMenus().then((mm) => rw.setMenu(oeMenu(mm.read, (id) => rid[id], { Help: [{ label: "Contents and Index", action: () => ctx.launch("help", { topic: "outlook" }) }, separator(), { label: "About Outlook Express", action: () => oeAbout(ctx) }] })));
    show();
  };

  const layout = Object.assign({ contacts: true, folderBar: true, folderList: false, outlookBar: false, statusBar: true, toolbar: true, viewsBar: false, infoPane: false, preview: true, pvSide: false, pvHeader: true }, ctx.settings.get("oeLayout") || {});
  const applyLayout = (st) => {
    ctx.settings.set("oeLayout", st);
    contacts.style.display = st.contacts ? "" : "none";
    status.style.display = st.statusBar ? "" : "none";
    toolbarEl.style.display = st.toolbar ? "" : "none";
    pvHead.style.display = st.pvHeader ? "" : "none";
    preview.style.display = st.preview ? "" : "none";
  };
  const findMessages = (q) => {
    const has = (a, b) => !b || String(a || "").toLowerCase().includes(b.toLowerCase());
    const hits = messages().filter((m) => has(m.from, q.from) && has(m.to, q.to) && has(m.subject, q.subject) && has(m.body, q.body));
    const rw = ctx.wm.create({ title: "Find Message - " + hits.length + " found", icon: "oe", width: 520, height: 240, appId: "dialog" });
    rw.setContent(el("div", { class: "oe-find" }, el("div", { class: "oe-find-h" }, ...["From", "Subject", "Received"].map((t) => el("span", { text: t }))), ...hits.map((m) => el("div", { class: "oe-find-r", ondblclick: () => openRead(m) }, el("span", { text: m.from || m.to || "" }), el("span", { text: m.subject || "" }), el("span", { text: new Date(m.date).toLocaleString("en-US") })))));
  };
  const addFolder = () => oeNewFolder(ctx, (n) => { ctx.settings.set("oeFolders", [...customFolders(), n]); render(); });
  const goNext = (unreadOnly) => {
    const l = messages().filter((m) => m.folder === folder).sort((a, b) => a.date - b.date), i = l.findIndex((m) => m.id === selected);
    const n = unreadOnly ? l.slice(i + 1).find((m) => m.unread) || l.find((m) => m.unread) : l[i + 1];
    if (n) select(n);
  };
  const cmd = (id) => {
    const m = cur(), has = !!m;
    const t = {
      40204: { action: () => oeOptions(ctx, ctx.settings.get("oeOptions") || {}, (st) => ctx.settings.set("oeOptions", st)) },
      40132: { action: () => oeFind(ctx, findMessages) }, 40489: { action: () => oeFind(ctx, findMessages) },
      40288: { action: addFolder }, 40366: { action: addFolder },
      40442: { action: () => openRules(ctx) }, 40443: { action: () => openRules(ctx) }, 40445: { action: () => openRules(ctx) }, 40444: { action: () => openRules(ctx) },
      40318: { action: () => m && openRules(ctx, { field: "from", contains: emailOf(m.from), action: "move" }), disabled: !has },
      40294: { action: () => m && openRules(ctx, { field: "from", contains: emailOf(m.from), action: "delete" }), disabled: !has },
      40455: { action: () => oeLayout(ctx, { ...layout, ...(ctx.settings.get("oeLayout") || {}) }, applyLayout) },
      40145: { action: () => { const l = messages().filter((x) => x.folder === folder).sort((a, b) => a.date - b.date), i = l.findIndex((x) => x.id === selected); if (i > 0) select(l[i - 1]); } },
      40146: { action: () => goNext(false) }, 40147: { action: () => goNext(true) },
      40465: { action: newMail }, 40170: { action: newMail }, 40123: { action: () => w.close() },
      40100: { action: () => m && (m.folder === "Drafts" ? openMail(ctx, { compose: true, draft: m }) : openRead(m)), disabled: !has },
      40102: { action: () => m && saveAllAtts(ctx, m.attachments), disabled: !has },
      40101: { action: () => m && downloadFile((m.subject || "Message") + ".eml", `From: ${m.from}\r\nTo: ${m.to}\r\nSubject: ${m.subject}\r\nDate: ${new Date(m.date).toUTCString()}\r\n\r\n${m.body}`, "message/rfc822"), disabled: !has },
      40116: { action: () => ctx.printText(pvBody.innerText, "Outlook Express") },
      40128: { action: () => deleteMessage(), disabled: !has }, 40433: undefined,
      40129: { action: () => m && moveTo(m, "Inbox"), disabled: !has || folder !== "Deleted Items" },
      40130: { action: emptyDeleted }, 40131: { action: emptyDeleted },
      40124: { action: () => document.execCommand("copy") }, 40125: { action: () => { const r = document.createRange(); r.selectNodeContents(pvBody); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } },
      40127: { action: () => m && popup(allFolders().filter((f) => f !== m.folder).map((f) => ({ label: f, action: () => moveTo(m, f) })), 200, 120), disabled: !has },
      40186: { action: () => m && markRead(m), disabled: !has }, 40187: { action: () => m && markRead(m, false), disabled: !has },
      40189: { action: async () => { for (const x of messages().filter((y) => y.folder === folder && y.unread)) await markRead(x); } },
      40176: { action: () => replyTo(), disabled: !has }, 40177: { action: () => replyTo(true), disabled: !has }, 40180: { action: fwd, disabled: !has },
      40199: { action: () => ctx.launch("address") }, 40364: { action: () => ctx.launch("address") }, 40200: { action: () => m && addSender(ctx, m), disabled: !has },
      40142: { action: () => ((sortAsc = true), render()) }, 40143: { action: () => ((sortAsc = false), render()) },
      40158: { action: render }, 40193: { action: () => sendRecv("all") }, 40194: { action: () => sendRecv("recv") }, 40195: { action: () => sendRecv("send") },
      40121: { action: () => { ctx.settings.set("oeOffline", !ctx.settings.get("oeOffline")); render(); }, checked: !!ctx.settings.get("oeOffline") },
      40203: { action: () => ctx.dialogs.message("Mail account: Kullanıcı <kullanici@hotmail.com>\nIncoming mail: mail.hotmail.com (simulated)\n\nThis desktop uses a local simulated mail server; no real e-mail is sent or received.", { title: "Internet Accounts", icon: "mail" }) },
    };
    return t[id];
  };
  loadOeMenus().then((mm) => w.setMenu(oeMenu(mm.main, cmd, { Help: [{ label: "Contents and Index", action: () => ctx.launch("help", { topic: "outlook" }) }, separator(), { label: "About Outlook Express", action: () => oeAbout(ctx) }] })));
  w.el.querySelector(":scope > .menu-bar")?.append(im("throbber", "throbber oe-throbber"), el("i", { class: "oe-mgrip" }));
  contacts.append(el("div", { class: "oe-phead" }, el("span", {}, el("u", { text: "C" }), "ontacts"), el("i", { class: "oe-dd" }), el("b", { class: "oe-x", text: "×" })), cbody);
  const hdr = (cls, inner) => el("div", { class: "oe-h " + cls }, ...inner);
  listEl.append(el("div", { class: "oe-lhead" }, hdr("h1", [im("hdr1")]), hdr("h2", [im("hdr2")]), hdr("h3", [im("hdr3")]), hdr("h4", [el("span", { text: "From" })]), hdr("h5", [el("span", { text: "Subject" })]), hdr("h6", [el("span", { text: "Received" }), el("i", { class: "oe-sort" })]), hdr("h7", [])), rowsEl);
  preview.append(pvHead, pvBody);
  root.append(toolbarEl, band, foldersEl, contacts, listEl, preview, status);
  w.setContent(root);
  applyLayout(layout);
  w.addCleanup(ctx.bus.on("mail:change", render));
  w.addCleanup(ctx.bus.on("fs:change", render));
  // background "server": deliver queued/new mail while Outlook Express is open
  const tick = async (first = false) => {
    if (ctx.settings.get("oeOffline") || !w.el.isConnected) return;
    try {
      const sent = await flushOutbox(ctx, 4000);
      const got = (await checkMail(ctx)).filter((m) => m.folder === "Inbox");
      if (got.length) { lastNew = got.length; if (!first) ctx.sound.play("mail"); }
      if (got.length || sent.length || first) ctx.bus.emit("mail:change");
    } catch {}
  };
  const timer = setInterval(tick, 30000);
  w.addCleanup(() => clearInterval(timer));
  render();
  setTimeout(() => tick(true), 500);
  void applyRules;
  return w;
}
