import { el, button, icon, menuBar, popup, separator } from "../ui/index.js";
import { COMMON_LINKS } from "./netscape-sites.js";

const KEY = "nsBM2";
let uid = 0;
const mk = (n) => ({ id: "b" + Date.now().toString(36) + ++uid, ...n });
const link = (title, url, wb) => mk({ type: "link", title, url, added: Date.now(), ...(wb ? { wb } : {}) });
const folder = (title, children = [], open = true) => mk({ type: "folder", title, children, open });

function defaults() {
  return folder("Bookmarks", [
    link("Netscape Netcenter", "about:home"),
    ...COMMON_LINKS.map((c) => link(c.title, c.url)),
    folder("Reference", [link("Wikipedia", "https://www.wikipedia.org/"), link("The Internet Archive", "https://archive.org/"), link("Wayback Machine", "https://web.archive.org/")]),
  ]);
}

export function loadBM(ctx) {
  let root = ctx.settings.get(KEY);
  if (!root) {
    root = defaults();
    const old = ctx.settings.get("nsBookmarks"); // earlier flat list
    if (Array.isArray(old) && old.length) root.children = old.map((b) => link(b.title || b.url, b.url));
    ctx.settings.set(KEY, root);
  }
  return root;
}
export const saveBM = (ctx, root) => ctx.settings.set(KEY, root);

export function walk(node, fn, parent = null) {
  fn(node, parent);
  if (node.type === "folder") node.children.forEach((c) => walk(c, fn, node));
}
const find = (root, id) => { let r = null; walk(root, (n, p) => { if (n.id === id) r = { node: n, parent: p }; }); return r; };
const contains = (node, id) => { let r = false; walk(node, (n) => { if (n.id === id) r = true; }); return r; };

/** Items for the Bookmarks drop-down (folders become cascading submenus). */
export function bookmarkItems(ctx, root, go, dateOf = (d) => d) {
  const conv = (list) => list.map((n) => n.type === "sep" ? separator() : n.type === "folder"
    ? { label: n.title, icon: "folder", submenu: n.children.length ? conv(n.children) : [{ label: "(Empty)", disabled: true }] }
    : { label: (n.title || n.url) + (n.wb ? " (" + dateOf(String(n.wb)) + ")" : ""), icon: "nshtml", action: () => go(n.url, n) });
  return conv(root.children);
}

export function addBookmark(ctx, title, url, into = null, wb = "") {
  const root = loadBM(ctx);
  const target = (into && find(root, into)?.node) || root;
  target.children.push(link(title || url, url, wb));
  saveBM(ctx, root);
}
export function folderChoices(ctx, title, url, wb = "") {
  const root = loadBM(ctx), out = [];
  const rec = (f, d) => { out.push({ label: f.title, icon: "folder", action: () => addBookmark(ctx, title, url, f.id, wb) }); f.children.filter((c) => c.type === "folder").forEach((c) => rec(c, d + 1)); };
  rec(root, 0);
  return out;
}

let open = null;
export function openBookmarkWindow(ctx, { go, current }) {
  if (open && open.w.el.isConnected) { open.w.focus?.(); open.render(); return open.w; }
  const w = ctx.wm.create({ title: "Bookmarks", icon: "netscape", width: 480, height: 420, x: 140, y: 80, appId: "netscape-bookmarks" });
  const tree = el("div", { class: "nsb-tree", tabindex: 0 });
  const status = el("div", { class: "nsb-status", text: "" });
  let root = loadBM(ctx), sel = null;
  const save = () => { saveBM(ctx, root); render(); };

  const dropOn = (target, where, dragId) => {
    if (!dragId || dragId === target.id) return;
    const src = find(root, dragId);
    if (!src || !src.parent || contains(src.node, target.id)) return;
    src.parent.children.splice(src.parent.children.indexOf(src.node), 1);
    if (where === "in") { target.children.push(src.node); target.open = true; }
    else {
      const tp = find(root, target.id).parent;
      tp.children.splice(tp.children.indexOf(target) + (where === "after" ? 1 : 0), 0, src.node);
    }
    save();
  };

  function row(n, depth) {
    const isF = n.type === "folder";
    const r = el("div", { class: "nsb-row" + (sel === n.id ? " sel" : ""), draggable: "true", "data-id": n.id, style: { paddingLeft: 4 + depth * 16 + "px" } });
    if (n.type === "sep") { r.append(el("span", { class: "nsb-arrow" }), el("hr", { class: "nsb-hr" })); }
    else r.append(el("span", { class: "nsb-arrow", text: isF ? (n.open ? "▾" : "▸") : "" }), icon(isF ? (n.open ? "folderOpen" : "folder") : "nshtml", 16), el("span", { class: "nsb-name", text: n.title || n.url }));
    r.addEventListener("pointerdown", () => { sel = n.id; tree.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel")); r.classList.add("sel"); status.textContent = n.url || ""; });
    r.querySelector(".nsb-arrow").addEventListener("click", (e) => { if (isF) { e.stopPropagation(); n.open = !n.open; save(); } });
    r.addEventListener("dblclick", () => { if (isF) { n.open = !n.open; save(); } else if (n.type === "link") go(n.url, n); });
    r.addEventListener("contextmenu", (e) => { e.preventDefault(); sel = n.id; render(); popup([
      n.type === "link" ? { label: "Go to Bookmark", action: () => go(n.url, n) } : isF ? { label: n.open ? "Collapse" : "Expand", action: () => { n.open = !n.open; save(); } } : null,
      n.type !== "sep" ? separator() : null,
      { label: "Delete Bookmark", action: () => del() },
      { label: "Bookmark Properties...", disabled: n.type === "sep", action: () => props(n) },
    ].filter(Boolean), e.clientX, e.clientY); });
    r.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", n.id); e.dataTransfer.effectAllowed = "move"; });
    r.addEventListener("dragover", (e) => {
      e.preventDefault();
      const b = r.getBoundingClientRect(), y = (e.clientY - b.top) / b.height;
      r.classList.remove("d-in", "d-before", "d-after");
      r.classList.add(isF && y > 0.25 && y < 0.75 ? "d-in" : y < 0.5 ? "d-before" : "d-after");
    });
    r.addEventListener("dragleave", () => r.classList.remove("d-in", "d-before", "d-after"));
    r.addEventListener("drop", (e) => {
      e.preventDefault();
      const where = r.classList.contains("d-in") ? "in" : r.classList.contains("d-before") ? "before" : "after";
      r.classList.remove("d-in", "d-before", "d-after");
      dropOn(n, where, e.dataTransfer.getData("text/plain"));
    });
    return r;
  }
  function render() {
    root = loadBM(ctx);
    tree.replaceChildren();
    const rec = (f, d) => f.children.forEach((c) => { tree.append(row(c, d)); if (c.type === "folder" && c.open) rec(c, d + 1); });
    tree.append(el("div", { class: "nsb-row nsb-root" }, icon("folderOpen", 16), el("span", { class: "nsb-name", text: root.title })));
    rec(root, 1);
  }
  const selected = () => (sel && find(root, sel)) || null;
  const container = () => { const s = selected(); return s ? (s.node.type === "folder" ? s.node : s.parent || root) : root; };
  const del = () => { const s = selected(); if (!s || !s.parent) return; s.parent.children.splice(s.parent.children.indexOf(s.node), 1); sel = null; save(); };
  const props = (n) => {
    const d = ctx.wm.create({ title: "Bookmark Properties", icon: "netscape", width: 380, height: n.type === "folder" ? 150 : 190, dialog: true, resizable: false, maximizable: false });
    const name = el("input", { type: "text", value: n.title || "", class: "nsb-in" }), url = el("input", { type: "text", value: n.url || "", class: "nsb-in" });
    const added = n.added ? new Date(n.added).toLocaleString() : "";
    d.setContent(el("div", { class: "nsb-props" },
      el("label", { text: "Name:" }), name,
      n.type === "link" ? [el("label", { text: "Location (URL):" }), url] : null,
      n.type === "link" ? el("div", { class: "nsb-meta", text: "Added on: " + added }) : null,
      el("div", { class: "nsb-btns" }, button("OK", () => { n.title = name.value; if (n.type === "link") n.url = url.value; saveBM(ctx, root); render(); d.close(); }, { class: "default" }), button("Cancel", () => d.close()))));
    name.focus();
  };
  const newItem = (n) => { container().children.push(n); if (n.type === "folder") container().open = true; sel = n.id; save(); return n; };

  const menus = menuBar({
    File: [
      { label: "New Bookmark...", action: async () => { const u = await ctx.dialogs.prompt("Location (URL):", "http://", { title: "New Bookmark" }); if (u) newItem(link(u, u)); } },
      { label: "New Folder...", action: async () => { const t = await ctx.dialogs.prompt("Folder name:", "New Folder", { title: "New Folder" }); if (t) newItem(folder(t, [], true)); } },
      { label: "New Separator", action: () => newItem(mk({ type: "sep" })) },
      separator(),
      { label: "Go to Bookmark", action: () => { const s = selected(); if (s?.node.type === "link") go(s.node.url, s.node); } },
      separator(),
      { label: "Close", shortcut: "Ctrl+W", action: () => w.close() },
    ],
    Edit: [
      { label: "Delete", shortcut: "Del", action: del },
      separator(),
      { label: "Bookmark Properties...", action: () => { const s = selected(); if (s && s.node.type !== "sep") props(s.node); } },
      { label: "Select All", disabled: true },
    ],
    View: [
      { label: "Expand All", action: () => { walk(root, (n) => { if (n.type === "folder") n.open = true; }); save(); } },
      { label: "Collapse All", action: () => { walk(root, (n) => { if (n.type === "folder" && n !== root) n.open = false; }); save(); } },
      separator(),
      { label: "Sort by Name", action: () => { const f = container(); f.children.sort((a, b) => (a.type === "folder" ? 0 : 1) - (b.type === "folder" ? 0 : 1) || (a.title || "").localeCompare(b.title || "")); save(); } },
    ],
    Help: [{ label: "About Bookmarks", action: () => ctx.dialogs.message("Netscape Bookmarks\n\nDrag items to rearrange them. Drop onto a folder to move an item inside it.", { title: "Bookmarks", icon: "info" }) }],
  });
  tree.addEventListener("keydown", (e) => { if (e.key === "Delete") del(); });
  w.setContent(menus, tree, status);
  w.onClose = () => { open = null; return true; };
  open = { w, render };
  render();
  return w;
}
