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
  w.setMenu({
    File: [
      { label: "New Contact...", shortcut: "Ctrl+N", action: () => edit() },
      {
        label: "Export Contacts...",
        action: () =>
          downloadFile(
            "Address-Book.json",
            JSON.stringify(contacts, null, 2),
            "application/json",
          ),
      },
      { label: "Close", action: () => w.close() },
    ],
    Edit: [
      {
        label: "Properties",
        action: () => edit(contacts.find((c) => c.id === selected)),
      },
      { label: "Delete", action: remove },
    ],
    View: [
      { label: "Status Bar", action: () => countEl.classList.toggle("hidden") },
    ],
    Tools: [
      {
        label: "Send Mail",
        action: () => {
          const c = contacts.find((c) => c.id === selected);
          if (c) openMail(ctx, { compose: true, to: c.email });
        },
      },
    ],
    Help: [
      {
        label: "About Address Book",
        action: () =>
          ctx.dialogs.message(
            "Address Book\nContacts are saved to My Documents\\Address Book.json.",
            { title: "Address Book", icon: "address" },
          ),
      },
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
    b.addEventListener("click", () => !b.classList.contains("off") && action());
    return b;
  };
  const tbProps = tbBtn(63, 62, "props", "Properties", () => edit(current()), false),
    tbDelete = tbBtn(125, 62, "delete", "Delete", remove, false),
    tbPrint = tbBtn(250, 62, "print", "Print", () => window.print(), false);
  const syncButtons = () => {
    for (const b of [tbProps, tbDelete, tbPrint])
      b.classList.toggle("off", !selected);
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
    w.setMenu({
      File: [
        { label: "Save Draft", action: save },
        {
          label: "Export Message...",
          action: () =>
            downloadFile(
              "Message.eml",
              `To: ${toInput.value}\r\nCc: ${cc.value}\r\nSubject: ${subject.value}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body.value}`,
              "message/rfc822",
            ),
        },
        { label: "Close", action: () => w.close() },
      ],
      Edit: [
        { label: "Select All", action: () => body.select() },
        {
          label: "Paste",
          action: async () =>
            body.setRangeText(
              await ctx.clipboard.getText(),
              body.selectionStart,
              body.selectionEnd,
              "end",
            ),
        },
      ],
      Tools: [{ label: "Address Book", action: () => ctx.launch("address") }],
      Help: [
        {
          label: "Sending Mail",
          action: () =>
            ctx.dialogs.message(
              "This browser edition stores drafts locally and hands sending to your device’s mail application. SMTP and POP3 accounts require an external mail service.",
              { title: "Outlook Express Help", icon: "mail" },
            ),
        },
      ],
    });
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
  const im = (name, cls = "", style = {}) => el("img", { src: OE + name + ".png", class: cls, draggable: "false", alt: "", style });
  const welcome = {
    id: "welcome",
    folder: "Inbox",
    from: "Microsoft Outlook Express Team",
    to: "New Outlook Express User",
    subject: "Welcome to Outlook Express 6",
    date: Date.now(),
    unread: true,
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
            ondblclick: () => m.folder === "Drafts" && openMail(ctx, { compose: true, draft: m }),
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
  w.setMenu({
    File: [
      { label: "New", submenu: [{ label: "Mail Message", action: newMail }] },
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [{ label: "Delete", action: deleteMessage }],
    View: [{ label: "Refresh", action: render }],
    Tools: [
      { label: "Address Book...", action: () => ctx.launch("address") },
      {
        label: "Accounts...",
        action: () =>
          ctx.dialogs.message(
            "This desktop stores local drafts. Sending uses your device’s configured mail application.",
            { title: "Internet Accounts", icon: "mail" },
          ),
      },
    ],
    Message: [
      { label: "New Message", action: newMail },
      { label: "Reply", action: replyTo },
    ],
    Help: [
      { label: "Contents and Index", action: () => ctx.launch("help", { topic: "internet" }) },
      {
        label: "About Outlook Express",
        action: () =>
          ctx.dialogs.message(
            "Outlook Express\nBrowser recreation\n\nLocal messages, drafts, address book, .eml export, and mail-client handoff.",
            { title: "Outlook Express", icon: "mail" },
          ),
      },
    ],
  });
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
