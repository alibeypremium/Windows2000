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
import { openMail } from "./oe-mail.js";
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

export { openMail };
