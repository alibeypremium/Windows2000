import {
  el,
  button,
  icon,
  field,
  toolbar,
  statusBar,
  separator,
} from "../ui/index.js";
import { DOCS, downloadFile } from "../core/index.js";
import { loadOeMenus, oeMenu } from "./oe-menu.js";
import { oeAbout, oeNewFolder, oeFind, oeLayout, oeOptions, oeRules } from "./oe-dialogs.js";
const CONTACTS = DOCS + "/Address Book.json",
  MAIL = DOCS + "/Mail.json";
const read = (ctx, path, initial) => {
  try {
    return JSON.parse(ctx.fs.readFile(path));
  } catch {
    return initial;
  }
};
export function openAddressBook(ctx) {
  const w = ctx.wm.create({
    title: "Address Book - Main Identity",
    icon: "address",
    width: 742,
    height: 550,
    x: 148,
    y: 59,
    appId: "address",
  });
  let contacts = read(ctx, CONTACTS, []),
    selected = null,
    query = "";
  const search = el("input", {
      "aria-label": "Type name or select from list",
      oninput: (e) => {
        query = e.target.value.toLowerCase();
        render();
      },
    });
  const changeContacts = async (update) => {
    await ctx.fs.updateJSON(CONTACTS, (list) => {
      if (!Array.isArray(list))
        throw new Error("The address book has an invalid format.");
      return update(list);
    });
  };
  const edit = (contact = null) => {
    const d = ctx.wm.create({
        title: contact ? "Properties" : "New Contact",
        icon: "address",
        width: 420,
        height: 330,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "contact",
      }),
      name = el("input", {
        value: contact?.name || "",
        "aria-label": "Display name",
      }),
      email = el("input", {
        type: "email",
        value: contact?.email || "",
        "aria-label": "E-mail address",
      }),
      phone = el("input", {
        value: contact?.phone || "",
        "aria-label": "Business phone",
      }),
      home = el("input", {
        value: contact?.home || "",
        "aria-label": "Home phone",
      }),
      company = el("input", {
        value: contact?.company || "",
        "aria-label": "Company",
      });
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Display name:", name),
        field("E-mail address:", email),
        field("Business phone:", phone),
        field("Home phone:", home),
        field("Company:", company),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("OK", async () => {
          if (!name.value.trim()) throw new Error("Enter a display name.");
          const item = {
            id: contact?.id || crypto.randomUUID(),
            name: name.value,
            email: email.value,
            phone: phone.value,
            home: home.value,
            company: company.value,
          };
          await changeContacts((list) =>
            contact
              ? list.map((c) => (c.id === contact.id ? item : c))
              : [...list, item],
          );
          d.close();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  const remove = async () => {
    if (
      selected &&
      (await ctx.dialogs.confirm("Delete this contact?", "Address Book"))
    ) {
      const id = selected;
      await changeContacts((list) => list.filter((c) => c.id !== id));
    }
  };
  let render;
  const has = () => !!contacts.find((c) => c.id === selected);
  const exportBook = () => downloadFile("Address-Book.json", JSON.stringify(contacts, null, 2), "application/json");
  const mailTo = () => {
    const c = contacts.find((c) => c.id === selected);
    if (c) openMail(ctx, { compose: true, to: c.email });
  };
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  w.setMenu({
    File: () => [
      { label: "New Contact...", shortcut: "Ctrl+N", action: () => edit() },
      off("New Group...", { shortcut: "Ctrl+G" }),
      off("New Folder...", { shortcut: "Ctrl+R" }),
      separator(),
      { label: "Properties", shortcut: "Alt+Enter", disabled: !has(), action: () => edit(contacts.find((c) => c.id === selected)) },
      { label: "Delete", disabled: !has(), action: remove },
      separator(),
      { label: "Import", submenu: [off("Address Book (WAB)..."), off("Business Card (vCard)..."), off("Other Address Book...")] },
      { label: "Export", submenu: [{ label: "Address Book (WAB)...", action: exportBook }, off("Business Card (vCard)..."), off("Other Address Book...")] },
      separator(),
      { label: "Print...", shortcut: "Ctrl+P", action: () => ctx.printText(contacts.map((c) => `${c.name}\t${c.email || ""}\t${c.phone || ""}`).join("\n"), "Address Book") },
      separator(),
      off("Switch Identity..."),
      off("Show All Contents"),
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      off("Copy", { shortcut: "Ctrl+C" }),
      off("Paste", { shortcut: "Ctrl+V" }),
      separator(),
      off("Select All", { shortcut: "Ctrl+A" }),
      separator(),
      off("Profile..."),
      separator(),
      off("Find People...", { shortcut: "Ctrl+F" }),
    ],
    View: () => [
      off("Toolbar", { checked: true }),
      { label: "Status Bar", checked: !countEl.classList.contains("hidden"), action: () => countEl.classList.toggle("hidden") },
      off("Folders and Groups", { checked: true }),
      separator(),
      off("Large Icon"),
      off("Small Icon"),
      off("List"),
      off("Details", { checked: true }),
      separator(),
      { label: "Sort By", submenu: [off("Name", { checked: true }), off("E-Mail Address"), off("Business Phone"), off("Home Phone"), separator(), off("First Name"), off("Last Name", { checked: true }), separator(), off("Ascending", { checked: true }), off("Descending")] },
      separator(),
      { label: "Refresh", shortcut: "F5", action: () => render() },
    ],
    Tools: () => [
      off("Accounts..."),
      separator(),
      off("Options..."),
      separator(),
      { label: "Action", submenu: [{ label: "Send Mail", disabled: !has(), action: mailTo }, off("Send Mail To", { submenu: [] }), off("Dial..."), off("Internet Call")] },
      separator(),
      off("Synchronize Now"),
    ],
    Help: [
      { label: "Contents and Index", shortcut: "F1", action: () => ctx.launch("help", { topic: "outlook" }) },
      separator(),
      { label: "About Address Book", action: () => ctx.dialogs.message("Microsoft Windows Address Book\nVersion 5.50.4807.1700\n\nCopyright © 1981-2000 Microsoft Corp.", { title: "About Address Book", icon: "address" }) },
    ],
  });
  const current = () => contacts.find((c) => c.id === selected);
  const sendMail = () => {
    const c = current();
    if (c) openMail(ctx, { compose: true, to: c.email });
  };
  const tbBtn = (left, w, img, label, action, enabled) => {
    const b = el(
      "div",
      { class: "ab-tb" + (enabled ? "" : " off"), style: { left: left + "px", width: w + "px" } },
      el("img", { src: "/assets/ui/ab/" + img + ".png", alt: "" }),
      el("span", { text: label }),
    );
    // wab32res.dll bitmaps 4136 (cold) / 4137 (hot) / 4138 (disabled)
    const pic = b.querySelector("img");
    b.paint = (hot) => { pic.src = `/assets/ui/ab/iso/${img}-${b.classList.contains("off") ? "off" : hot ? "hot" : "cold"}.png`; };
    b.addEventListener("mouseenter", () => b.paint(true));
    b.addEventListener("mouseleave", () => b.paint(false));
    b.paint(false);
    b.addEventListener("click", () => !b.classList.contains("off") && action());
    return b;
  };
  const tbProps = tbBtn(63, 62, "props", "Properties", () => edit(current()), false),
    tbDelete = tbBtn(125, 62, "delete", "Delete", remove, false),
    tbPrint = tbBtn(250, 62, "print", "Print", () => window.print(), false);
  const syncButtons = () => {
    for (const b of [tbProps, tbDelete, tbPrint])
      (b.classList.toggle("off", !selected), b.paint(false));
  };
  const countEl = el("div", { class: "ab-status", text: "0 items" });
  const nodeShared = el("div", { class: "ab-node" }, el("img", { src: "/assets/ui/ab/shared.png", alt: "" }), el("span", { text: "Shared Contacts" })),
    nodeMain = el("div", { class: "ab-node sel", style: { top: "17px" } }, el("img", { src: "/assets/ui/ab/folder.png", alt: "" }), el("span", { text: "Main Identity's Contacts" }));
  const cols = [
    ["Name", 150, true],
    ["E-Mail Address", 150],
    ["Business Phone", 99],
    ["Home Phone", 101],
  ];
  const head = el(
    "div",
    { class: "ab-head" },
    ...cols.map(([t, wd, sort]) =>
      el("div", { class: "ab-th", style: { width: wd + "px" } }, el("span", { text: t }), sort ? el("i", { class: "ab-sort" }) : null),
    ),
    el("div", { class: "ab-th", style: { flex: 1 } }),
  );
  const listBody = el("div", { class: "ab-rows" });
  render = function () {
    contacts = read(ctx, CONTACTS, []);
    if (selected && !contacts.some((c) => c.id === selected)) selected = null;
    const rows = contacts
      .filter((c) => (c.name + " " + c.email).toLowerCase().includes(query))
      .sort((x, y) => x.name.localeCompare(y.name));
    listBody.replaceChildren(
      ...rows.map((c) =>
        el(
          "div",
          {
            class: "ab-row" + (c.id === selected ? " sel" : ""),
            onclick: () => {
              selected = c.id;
              render();
            },
            ondblclick: () => edit(c),
          },
          el("div", { style: { width: cols[0][1] + "px" } }, icon("address", 16), c.name),
          el("div", { style: { width: cols[1][1] + "px" }, text: c.email || "" }),
          el("div", { style: { width: cols[2][1] + "px" }, text: c.phone || "" }),
          el("div", { style: { width: cols[3][1] + "px" }, text: c.home || "" }),
        ),
      ),
    );
    countEl.textContent = rows.length + (rows.length === 1 ? " item" : " items");
    syncButtons();
  };
  w.setContent(
    el(
      "div",
      { class: "ab-root" },
      el(
        "div",
        { class: "ab-toolbar" },
        tbBtn(8, 52, "new", "New", () => edit(), true),
        tbProps,
        tbDelete,
        tbBtn(185, 68, "find", "Find People", () => search.focus(), true),
        tbPrint,
        tbBtn(312, 60, "action", "Action", sendMail, true),
      ),
      el("div", { class: "ab-tree" }, nodeShared, nodeMain),
      el("div", { class: "ab-searchrow" }, el("label", { text: "Type name or select from list:" }), search),
      el("div", { class: "ab-list" }, head, listBody),
      countEl,
    ),
  );
  w.addCleanup(ctx.bus.on("fs:change", render));
  render();
  return w;
}

export function openMail(
  ctx,
  { compose = false, to = "", reply = null, draft: existingDraft = null } = {},
) {
  if (compose) {
    const w = ctx.wm.create({
        title: "New Message",
        icon: "mail",
        width: 650,
        height: 450,
        appId: "compose",
      }),
      toInput = el("input", {
        value: existingDraft?.to || to || reply?.from || "",
        "aria-label": "To",
      }),
      cc = el("input", { value: existingDraft?.cc || "", "aria-label": "Cc" }),
      subject = el("input", {
        value: existingDraft?.subject || (reply ? "Re: " + reply.subject : ""),
        "aria-label": "Subject",
      }),
      body = el("textarea", {
        class: "mail-compose-body",
        "aria-label": "Message body",
        spellcheck: true,
        value: existingDraft?.body || "",
      });
    const id = existingDraft?.id || crypto.randomUUID();
    const fields = () => ({
      to: toInput.value,
      cc: cc.value,
      subject: subject.value,
      body: body.value,
    });
    let baseline = JSON.stringify(
      existingDraft ? fields() : { to: "", cc: "", subject: "", body: "" },
    );
    let storedMessage = existingDraft ? JSON.stringify(existingDraft) : null;
    const dirty = () => JSON.stringify(fields()) !== baseline;
    const draft = () => ({
      id,
      folder: "Drafts",
      ...fields(),
      date: Date.now(),
      from: ctx.settings.get("username"),
    });
    const save = async () => {
      const snapshot = fields(),
        message = { ...draft(), ...snapshot };
      await ctx.fs.updateJSON(MAIL, (mail) => {
        if (!Array.isArray(mail))
          throw new Error("The mail store has an invalid format.");
        const old = mail.find((m) => m.id === id);
        if (storedMessage && JSON.stringify(old) !== storedMessage)
          throw new Error(
            "This draft changed in another window. Reopen it before saving further changes.",
          );
        return old
          ? mail.map((m) => (m.id === id ? message : m))
          : [...mail, message];
      });
      baseline = JSON.stringify(snapshot);
      storedMessage = JSON.stringify(message);
      ctx.bus.emit("mail:change");
      return message;
    };
    const send = async () => {
      if (!toInput.value.trim())
        throw new Error("Enter an e-mail address in the To field.");
      const message = await save();
      const url =
        "mailto:" +
        encodeURIComponent(message.to) +
        "?cc=" +
        encodeURIComponent(message.cc) +
        "&subject=" +
        encodeURIComponent(message.subject) +
        "&body=" +
        encodeURIComponent(message.body);
      location.href = url;
      ctx.dialogs.message(
        "A draft has been saved. Complete sending in your device’s mail application.",
        { title: "Outlook Express", icon: "mail" },
      );
    };
    const exportEml = () =>
      downloadFile(
        "Message.eml",
        `To: ${toInput.value}\r\nCc: ${cc.value}\r\nSubject: ${subject.value}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body.value}`,
        "message/rfc822",
      );
    const paste = async () => body.setRangeText(await ctx.clipboard.getText(), body.selectionStart, body.selectionEnd, "end");
    const ed = (cmd) => ({ action: () => (body.focus(), document.execCommand(cmd)) });
    const cids = {
      40465: { action: () => openMail(ctx, { compose: true }) }, 40170: { action: () => openMail(ctx, { compose: true }) },
      40411: { action: () => send().catch((e) => ctx.dialogs.error(e)) }, 40225: { action: () => save().catch((e) => ctx.dialogs.error(e)) },
      40227: { action: () => save().catch((e) => ctx.dialogs.error(e)) }, 40477: { action: exportEml },
      40228: { action: () => w.close() },
      40229: ed("undo"), 40230: ed("cut"), 40484: ed("copy"), 40231: { action: paste },
      40125: { action: () => body.select() },
      40199: { action: () => ctx.launch("address") }, 40265: { action: () => ctx.launch("address") },
    };
    loadOeMenus().then((m) => w.setMenu(oeMenu(m.compose, (id) => cids[id], {
      Help: [
        { label: "Contents and Index", action: () => ctx.launch("help", { topic: "outlook" }) },
        separator(),
        {
          label: "About Outlook Express",
          action: () => oeAbout(ctx),
        },
      ],
    })));
  applyLayout(layout);
    w.setContent(
      toolbar([
        { icon: "mail", label: "Send", action: send },
        { icon: "document", label: "Save Draft", action: save },
        {
          icon: "address",
          label: "Addresses",
          action: () => ctx.launch("address"),
        },
      ]),
      el(
        "div",
        { class: "mail-compose-fields" },
        field("To:", toInput),
        field("Cc:", cc),
        field("Subject:", subject),
      ),
      body,
      statusBar("Compose a message"),
    );
    w.onClose = async () => {
      if (!dirty()) return true;
      const a = await ctx.dialogs.message(
        "Do you want to save changes to this message?",
        { title: "Outlook Express", buttons: ["Yes", "No", "Cancel"] },
      );
      if (a === "Yes") {
        await save();
        return !dirty();
      }
      return a === "No";
    };
    w.el.addEventListener("keydown", async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        try {
          await save();
        } catch (error) {
          ctx.dialogs.error(error);
        }
      }
    });
    return w;
  }
  const w = ctx.wm.create({
    title: "Inbox - Outlook Express",
    icon: "oe",
    width: 903,
    height: 652,
    x: 67,
    y: 22,
    appId: "outlook",
  });
  let folder = "Inbox",
    selected = null;
  const OE = "/assets/ui/oe/";
  // msoeres.dll toolbar bitmaps 38/39 (and 27/28): grey picture normally, coloured "hot" picture under the pointer
  const ISO_OE = new Set(["new", "reply", "replyall", "fwd", "print", "delete", "sendrecv", "addr", "find", "prev", "next"]);
  const hotTb = (b, name) => {
    if (!ISO_OE.has(name)) return;
    const pic = b.querySelector("img"), set = (t) => { if (!b.classList.contains("off")) pic.src = `/assets/ui/oe/iso/${name}-${t}.png`; };
    pic.src = `/assets/ui/oe/iso/${name}-cold.png`;
    b.addEventListener("mouseenter", () => set("hot"));
    b.addEventListener("mouseleave", () => set("cold"));
  };
  const im = (name, cls = "", style = {}) => el("img", { src: OE + name + ".png", class: cls, draggable: "false", alt: "", style });
  const welcome = {
    id: "welcome",
    folder: "Inbox",
    from: "Microsoft Outlook Express Team",
    to: "New Outlook Express User",
    subject: "Welcome to Outlook Express 6",
    date: Date.now(),
    unread: !ctx.settings.get("mailWelcomeRead"),
    welcome: true,
    body: "",
  };
  const messages = () => [
    ...read(ctx, MAIL, []),
    ...(ctx.settings.get("mailWelcomeDeleted") ? [] : [welcome]),
  ];
  const root = el("div", { class: "oe-root" }),
    toolbarEl = el("div", { class: "oe-toolbar" }),
    band = el("div", { class: "oe-band" }),
    foldersEl = el("div", { class: "oe-folders" }),
    contacts = el("div", { class: "oe-contacts" }),
    listEl = el("div", { class: "oe-list" }),
    rowsEl = el("div", { class: "oe-rows" }),
    preview = el("div", { class: "oe-preview" }),
    pvHead = el("div", { class: "oe-pvhead" }),
    pvBody = el("div", { class: "oe-pvbody" }),
    status = el("div", { class: "oe-status" });
  const tbtn = (cx, icon, label, { off = false, arrow = false, action } = {}) => {
    const b = el("div", { class: "oe-tb" + (off ? " off" : ""), style: { left: cx - 40 + "px" }, onclick: () => !off && action?.() }, im(icon), el("span", { text: label }));
    hotTb(b, icon);
    if (arrow) b.append(el("i", { class: "oe-arrow", style: { left: arrow - (cx - 40) + "px" } }));
    return b;
  };
  const newMail = () => openMail(ctx, { compose: true }),
    replyTo = () => openMail(ctx, { compose: true, reply: messages().find((m) => m.id === selected) });
  const sep = (x) => el("div", { class: "oe-sep", style: { left: x + "px" } });
  toolbarEl.append(
    tbtn(41, "new", "Create Mail", { arrow: 78, action: newMail }),
    tbtn(115, "reply", "Reply", { action: replyTo }),
    tbtn(176, "replyall", "Reply All", { action: replyTo }),
    tbtn(237, "fwd", "Forward", { action: replyTo }),
    sep(272),
    tbtn(305, "print", "Print", { action: () => ctx.printText(pvBody.innerText, "Outlook Express") }),
    tbtn(367, "delete", "Delete", { off: true, action: () => deleteMessage() }),
    sep(402),
    tbtn(436, "sendrecv", "Send/Recv", { arrow: 473, off: true }),
    sep(484),
    tbtn(518, "addr", "Addresses", { action: () => ctx.launch("address") }),
    tbtn(578, "find", "Find", { arrow: 616 }),
  );
  const render = () => {
    w.setTitle?.(folder + " - Outlook Express");
    const all = messages();
    const unread = all.filter((m) => m.folder === "Inbox" && m.unread).length;
    band.replaceChildren(im("inboxband"), el("span", { text: folder }));
    const FOLDERS = [
      ["Inbox", "inbox16", 203],
      ["Outbox", "outbox16", 221],
      ["Sent Items", "sent16", 239],
      ["Deleted Items", "deleted16", 257],
      ["Drafts", "drafts16", 275],
    ];
    for (const f of ctx.settings.get("oeFolders") || []) FOLDERS.push([f, "outbox16", 275 + 18 * (FOLDERS.length - 4)]);
    foldersEl.replaceChildren(
      el("div", { class: "oe-phead" }, el("span", { text: "Folders" }), el("b", { class: "oe-x", text: "×" })),
      el("div", { class: "oe-fl oe-root-f" }, im("oe16"), el("span", { text: "Outlook Express" })),
      el("div", { class: "oe-fl oe-local" }, el("i", { class: "oe-minus" }), im("local16"), el("span", { text: "Local Folders" })),
      el("div", { class: "oe-dots" }),
      ...FOLDERS.map(([f, ico], i) =>
        el(
          "div",
          { class: "oe-fl oe-sub", style: { top: 52 + i * 18 + "px" }, onclick: () => ((folder = f), (selected = null), render()) },
          im(ico),
          el("span", { class: folder === f ? "sel" : "", text: f }),
          f === "Inbox" && unread ? el("em", { text: " (" + unread + ")" }) : null,
        ),
      ),
    );
    const list = all.filter((m) => m.folder === folder);
    const message = list.find((m) => m.id === selected) || list[0];
    selected = message?.id ?? null;
    rowsEl.replaceChildren(
      ...list.map((m) =>
        el(
          "div",
          {
            class: "oe-row" + (m.unread ? " unread" : "") + (selected === m.id ? " sel" : ""),
            onclick: () => ((selected = m.id), render()),
            ondblclick: () => (m.folder === "Drafts" ? openMail(ctx, { compose: true, draft: m }) : openRead(m)),
          },
          el("div", { class: "c1" }, im("env16"), el("span", { text: m.from || m.to || "" })),
          el("div", { class: "c2", text: m.subject || "(No subject)" }),
          el("div", { class: "c3", text: (() => { const d = new Date(m.date); return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`; })() }),
        ),
      ),
    );
    if (message) {
      pvHead.replaceChildren(
        el("div", {}, el("b", { text: "From: " }), message.from || "", message.to ? el("span", {}, el("b", { text: "   To: " }), message.to) : null),
        el("div", {}, el("b", { text: "Subject: " }), message.subject || ""),
      );
      pvBody.replaceChildren(
        message.welcome
          ? welcomeBody()
          : el("pre", { text: message.body }),
      );
    } else (pvHead.replaceChildren(), pvBody.replaceChildren());
    status.replaceChildren(
      el("div", { class: "s1", text: list.length + " message(s)" + (folder === "Inbox" ? ", " + unread + " unread" : "") }),
      el("div", { class: "s2" }, im("online16"), el("span", { text: "Working Online" })),
      el("div", { class: "s3" }, im("nomail16"), el("span", { text: "No new messages" })),
    );
  };
  const welcomeBody = () =>
    el(
      "div",
      { class: "oe-welcome" },
      im("banner", "oe-banner"),
      el("div", { class: "oe-feat", text: "Featuring" }),
      el("div", { class: "oe-featline" }),
      el(
        "ul",
        {},
        ...["E-mail and Newsgroups", "Multiple accounts and Identities", "HTML message support", "Address Book and directory services", "Offline synchronization", "Improved Inbox rules", "Message-level security", "Stationery and file attachments"].map((t) => el("li", {}, el("i"), t)),
      ),
      el(
        "div",
        { class: "oe-msn" },
        im("msn"),
        el("p", {}, "Tired of sharing your e-", el("br"), "mail account with others", el("br"), "in your household? ", el("u", { text: "Get a" }), el("br"), el("u", { text: "free Hotmail account!" }), el("br"), "Then read your mail from", el("br"), "any place on earth. ", el("u", { text: "Click" }), el("br"), el("u", { text: "here to sign up" }), " right now!"),
      ),
    );
  const openRead = async (m) => {
    if (m.unread) {
      if (m.welcome) ctx.settings.set("mailWelcomeRead", true);
      else await ctx.fs.updateJSON(MAIL, (mail) => mail.map((x) => (x.id === m.id ? { ...x, unread: false } : x)));
      ctx.bus.emit?.("mail:change");
    }
    const rw = ctx.wm.create({ title: m.subject || "(No subject)", icon: "oe", width: 700, height: 500, x: 90 + Math.random() * 40, y: 50 + Math.random() * 30, appId: "readmsg" });
    let cur = m;
    const hdrBox = el("div", { class: "oe-rh" }), bodyBox = el("div", { class: "oe-rbody" }), tbar = el("div", { class: "oe-toolbar oe-rtoolbar" });
    const fmtD = (t) => {
      const d = new Date(t), days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], mon = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      return `${days[d.getDay()]}, ${mon[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
    };
    const siblings = () => messages().filter((x) => x.folder === cur.folder);
    const go = (d) => { const l = siblings(), i = l.findIndex((x) => x.id === cur.id), n = l[i + d]; if (n) { cur = n; show(); } };
    const show = () => {
      rw.setTitle?.(cur.subject || "(No subject)");
      const row = (k, v) => el("div", { class: "oe-rhr" }, el("span", { class: "k", text: k }), el("span", { class: "v", text: v }));
      hdrBox.replaceChildren(row("From:", cur.from || ""), row("Date:", fmtD(cur.date)), row("To:", cur.to || ""), row("Subject:", cur.subject || ""));
      bodyBox.replaceChildren(cur.welcome ? welcomeBody() : el("pre", { text: cur.body }));
    };
    const mtb = (cx, icon, label, o = {}) => {
      const b = el("div", { class: "oe-tb" + (o.off ? " off" : ""), style: { left: cx - 40 + "px" }, onclick: () => !o.off && o.action?.() }, im(icon), el("span", { text: label }));
      hotTb(b, icon);
      return b;
    };
    const rep = () => openMail(ctx, { compose: true, reply: cur });
    tbar.append(
      mtb(41, "reply", "Reply", { action: rep }),
      mtb(102, "replyall", "Reply All", { action: rep }),
      mtb(163, "fwd", "Forward", { action: rep }),
      sep(198),
      mtb(231, "print", "Print", { action: () => ctx.printText(bodyBox.innerText, cur.subject) }),
      mtb(293, "delete", "Delete", { action: async () => { selected = cur.id; await deleteMessage(); rw.close(); } }),
      sep(328),
      mtb(361, "prev", "Previous", { off: !siblings().length }),
      mtb(422, "next", "Next", {}),
      sep(458),
      mtb(494, "addr", "Addresses", { action: () => ctx.launch("address") }),
    );
    rw.setContent(el("div", { class: "oe-read" }, tbar, hdrBox, bodyBox));
    const rid = {
      40465: { action: newMail }, 40170: { action: newMail }, 40228: { action: () => rw.close() },
      40482: { action: async () => { selected = cur.id; await deleteMessage(); rw.close(); } },
      40116: { action: () => ctx.printText(bodyBox.innerText, cur.subject) },
      40484: { action: () => document.execCommand("copy") }, 40125: { action: () => document.execCommand("selectAll") },
      40145: { action: () => go(-1) }, 40146: { action: () => go(1) },
      40176: { action: rep }, 40177: { action: rep }, 40180: { action: rep },
      40199: { action: () => ctx.launch("address") },
      40483: { action: () => ctx.dialogs.message(`Type: ${cur.welcome ? "Message" : "Mail"}\nFrom: ${cur.from || ""}\nSubject: ${cur.subject || ""}`, { title: "Properties", icon: "oe" }) },
    };
    loadOeMenus().then((mm) => rw.setMenu(oeMenu(mm.read, (id) => rid[id], { Help: [{ label: "Contents and Index", action: () => ctx.launch("help", { topic: "outlook" }) }, separator(), { label: "About Outlook Express", action: () => ctx.dialogs.message("Microsoft Outlook Express\nVersion 5.50.4807.1700\n\nCopyright © 1981-2000 Microsoft Corp.", { title: "About Outlook Express", icon: "oe" }) }] })));
    show();
  };
  const deleteMessage = async () => {
    if (!selected) return;
    if (selected === "welcome") {
      ctx.settings.set("mailWelcomeDeleted", true);
    } else {
      const id = selected;
      await ctx.fs.updateJSON(MAIL, (mail) =>
        mail.map((m) => (m.id === id ? { ...m, folder: "Deleted Items" } : m)),
      );
    }
    selected = null;
    render();
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
  const ids = {
    40204: { action: () => oeOptions(ctx, ctx.settings.get("oeOptions") || {}, (st) => ctx.settings.set("oeOptions", st)) },
    40132: { action: () => oeFind(ctx, findMessages) }, 40489: { action: () => oeFind(ctx, findMessages) },
    40288: { action: () => oeNewFolder(ctx, (n) => { ctx.settings.set("oeFolders", [...(ctx.settings.get("oeFolders") || []), n]); render(); }) },
    40366: { action: () => oeNewFolder(ctx, (n) => { ctx.settings.set("oeFolders", [...(ctx.settings.get("oeFolders") || []), n]); render(); }) },
    40442: { action: () => oeRules(ctx, ctx.settings.get("oeRules") || {}, (st) => ctx.settings.set("oeRules", st)) },
    40443: { action: () => oeRules(ctx, ctx.settings.get("oeRules") || {}, (st) => ctx.settings.set("oeRules", st)) },
    40445: { action: () => oeRules(ctx, ctx.settings.get("oeRules") || {}, (st) => ctx.settings.set("oeRules", st)) },
    40455: { action: () => oeLayout(ctx, { ...layout, ...(ctx.settings.get("oeLayout") || {}) }, applyLayout) },
    40145: { action: () => {}, disabled: true },
    40465: { action: newMail }, 40170: { action: newMail }, 40017: undefined,
    40123: { action: () => w.close() },
    40128: { action: deleteMessage, disabled: !selected }, 40433: undefined,
    40176: { action: replyTo, disabled: !selected }, 40177: { action: replyTo, disabled: !selected },
    40199: { action: () => ctx.launch("address") }, 40364: { action: () => ctx.launch("address") },
    40158: { action: render }, 40193: { action: render }, 40194: { action: render }, 40195: { action: render },
    40121: { action: () => ctx.settings.set("oeOffline", !ctx.settings.get("oeOffline")), checked: !!ctx.settings.get("oeOffline") },
    40203: { action: () => ctx.dialogs.message("This desktop stores local drafts. Sending uses your device’s configured mail application.", { title: "Internet Accounts", icon: "mail" }) },
  };
  loadOeMenus().then((m) => w.setMenu(oeMenu(m.main, (id) => { const r = ids[id]; return r && { ...r, disabled: r.disabled }; }, {
      Help: [
        { label: "Contents and Index", action: () => ctx.launch("help", { topic: "outlook" }) },
        separator(),
        {
          label: "About Outlook Express",
          action: () => ctx.dialogs.message("Microsoft Outlook Express\nVersion 5.50.4807.1700\n\nCopyright © 1981-2000 Microsoft Corp.", { title: "About Outlook Express", icon: "oe" }),
        },
      ],
    })));
  w.el.querySelector(":scope > .menu-bar")?.append(im("throbber", "throbber oe-throbber"), el("i", { class: "oe-mgrip" }));
  contacts.append(
    el("div", { class: "oe-phead" }, el("span", {}, el("u", { text: "C" }), "ontacts"), el("i", { class: "oe-dd" }), el("b", { class: "oe-x", text: "×" })),
    el("div", { class: "oe-cbody", text: "There are no contacts to display. Click on Contacts to create a new contact." }),
  );
  const hdr = (cls, inner) => el("div", { class: "oe-h " + cls }, ...inner);
  listEl.append(
    el(
      "div",
      { class: "oe-lhead" },
      hdr("h1", [im("hdr1")]),
      hdr("h2", [im("hdr2")]),
      hdr("h3", [im("hdr3")]),
      hdr("h4", [el("span", { text: "From" })]),
      hdr("h5", [el("span", { text: "Subject" })]),
      hdr("h6", [el("span", { text: "Received" }), el("i", { class: "oe-sort" })]),
      hdr("h7", []),
    ),
    rowsEl,
  );
  preview.append(pvHead, pvBody, vscrollBar());
  function vscrollBar() {
    return el("div", { class: "rk-vscroll oe-vs" }, el("span", { class: "sb up" }), el("span", { class: "sb down" }), el("span", { class: "thumb", style: { top: "16px", height: "62px" } }));
  }
  root.append(toolbarEl, band, foldersEl, contacts, listEl, preview, status);
  w.setContent(root);
  w.addCleanup(ctx.bus.on("mail:change", render));
  w.addCleanup(ctx.bus.on("fs:change", render));
  render();
  return w;
}
