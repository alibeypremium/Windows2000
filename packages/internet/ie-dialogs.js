// Internet Explorer 5.01 dialogs built from inetcplc.dll / shdoclc.dll templates.
import { el } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { btn, refWindow, sunken } from "../control-panel/refkit.js";
import { IE_DIALOGS as D } from "./ie-data.js";
import { oeSheet } from "./oe-dialogs.js";

const ICONS = "assets/ie/icons/";

function std(ctx, key, opts = {}) {
  const tpl = D[key], has = tpl.controls.some((c) => c.id === 1);
  const d = dialogFromTemplate(ctx, tpl, { icon: "ie", iconBase: ICONS, ...opts, on: { 1: () => { opts.ok?.(d); d.close(); }, 2: () => d.close(), ...(opts.on || {}) } });
  if (!has) {
    const W = px(tpl.cx) + 8, y = py(tpl.cy) + 22 - 28;
    d.place(btn(W - 8 - 2 * 72 - 6, y, 72, 23, "OK", { def: true, onclick: () => { opts.ok?.(d); d.close(); } }), btn(W - 8 - 72, y, 72, 23, "Cancel", { onclick: () => d.close() }));
  }
  return d;
}

const ADV = [
  ["Accessibility", [["Always expand ALT text for images", 0], ["Move system caret with focus/selection changes", 0]]],
  ["Browsing", [["Automatically check for Internet Explorer updates", 1], ["Close unused folders in History and Favorites", 0], ["Disable script debugging", 1], ["Display a notification about every script error", 0], ["Enable Install On Demand", 1], ["Enable page transitions", 1], ["Enable Personalized Favorites Menu", 1], ["Launch browser windows in a separate process", 0], ["Notify when downloads complete", 1], ["Reuse windows for launching shortcuts", 1], ["Show friendly HTTP error messages", 1], ["Show friendly URLs", 1], ["Show Go button in Address bar", 1], ["Use inline AutoComplete", 1], ["Use smooth scrolling", 1], ["Underline links", "r:Always|Never|Hover"]]],
  ["HTTP 1.1 settings", [["Use HTTP 1.1", 1], ["Use HTTP 1.1 through proxy connections", 0]]],
  ["Multimedia", [["Play animations", 1], ["Play sounds", 1], ["Play videos", 1], ["Show image download placeholders", 1], ["Show pictures", 1], ["Smart image dithering", 1]]],
  ["Printing", [["Print background colors and images", 0]]],
  ["Search from the Address bar", [["When searching", "r:Display results, and go to the most likely site|Do not search from the Address bar|Just display the results in the main window|Just go to the most likely site"]]],
  ["Security", [["Check for publisher's certificate revocation", 0], ["Check for server certificate revocation (requires restart)", 0], ["Do not save encrypted pages to disk", 0], ["Empty Temporary Internet Files folder when browser is closed", 0], ["Enable Profile Assistant", 1], ["Use SSL 2.0", 1], ["Use SSL 3.0", 1], ["Use TLS 1.0", 0], ["Warn about invalid site certificates", 1], ["Warn if changing between secure and not secure mode", 0], ["Warn if forms submittal is being redirected", 1]]],
];

export function ieOptions(ctx, tab = 0) {
  const home = () => ctx.settings.get("homePage") || "about:home";
  const sub = (key, o = {}) => () => std(ctx, key, o);
  const dlg = (ctx2, key, o) => std(ctx2, key, o);
  const confirm = (msg, then) => async () => { if (await ctx.dialogs.confirm(msg, "Microsoft Internet Explorer")) then?.(); };
  const stored = ctx.settings.get("ieAdvanced") || {};
  let homeInput = null;
  const w = oeSheet(ctx, {
    title: "Internet Options", cx: 252, cy: 218, active: tab,
    store: {},
    onApply: (st) => { const h = homeInput?.value; if (h != null) ctx.settings.set("homePage", h); },
    pages: [
      { label: "General", tpl: D.c100, opts: { iconBase: ICONS, values: { 1487: home(), 1492: "20" } },
        after: (ctl) => { homeInput = ctl[1487]; },
        on: (ctl) => ({
          1486: () => (ctl[1487].value = home()), 1485: () => (ctl[1487].value = "about:home"), 404: () => (ctl[1487].value = "about:blank"),
          624: confirm("Delete all files in the Temporary Internet Files folder?"),
          1490: sub("c700"), 1489: confirm("Are you sure you want to delete your History folder?"),
          1483: sub("c102"), 1494: sub("c1000"), 1495: sub("c4448"), 1496: sub("c4457"),
        }) },
      { label: "Security", tpl: D.c500, opts: { iconBase: ICONS },
        after: (ctl) => {
          const list = ctl[1566].querySelector(".rk-listbox");
          list.classList.add("ie-adv", "ie-zones");
          for (const z of ["Internet", "Local intranet", "Trusted sites", "Restricted sites"]) list.append(el("div", { class: "ie-zone" }, el("img", { src: ICONS + "1315.png" }), z));
        } },
      { label: "Content", tpl: D.c4454, opts: { iconBase: ICONS } },
      { label: "Connections", tpl: D.c200, opts: { iconBase: ICONS } },
      { label: "Programs", tpl: D.c300, opts: { iconBase: ICONS, values: { 1610: "Notepad", 301: "Outlook Express", 302: "Outlook Express", 313: "Microsoft NetMeeting", 304: "", 306: "Address Book" } } },
      { label: "Advanced", tpl: D.c600, opts: { iconBase: ICONS },
        after: (ctl) => {
          const list = ctl[1439].querySelector(".rk-listbox");
          list.classList.add("ie-adv");
          for (const [cat, items] of ADV) {
            list.append(el("div", { class: "ie-adv-c" }, el("img", { src: ICONS + "1322.png" }), cat));
            for (const [label, val] of items) {
              if (typeof val === "string") {
                list.append(el("div", { class: "ie-adv-i" }, label));
                val.slice(2).split("|").forEach((o, i) => list.append(el("label", { class: "ie-adv-i r" }, el("input", { type: "radio", name: cat + label, checked: i === 0 }), o)));
              } else {
                const key = label, on = stored[key] ?? val;
                list.append(el("label", { class: "ie-adv-i" }, el("input", { type: "checkbox", checked: !!on, onchange: (e) => { stored[key] = e.target.checked ? 1 : 0; ctx.settings.set("ieAdvanced", stored); } }), label));
              }
            }
          }
        },
        on: () => ({ 1526: () => { for (const k of Object.keys(stored)) delete stored[k]; ctx.settings.set("ieAdvanced", stored); } }) },
    ],
  });
  return w;
}

export function ieOpen(ctx, onOpen, onBrowse) {
  const d = dialogFromTemplate(ctx, D.s4464, { title: "Open", icon: "ie", iconBase: ICONS, on: { 1: () => { const v = d.ctl[4467].value.trim(); d.close(); if (v) onOpen(v); }, 2: () => d.close(), 4469: () => onBrowse?.(d) } });
  d.ctl[4467]?.focus();
  return d;
}

export function ieNewFolder(ctx, onOk) {
  const d = dialogFromTemplate(ctx, D.s4480, { title: "Create New Folder", icon: "ie", on: { 1: () => { const v = d.ctl[4354]?.value?.trim?.(); d.close(); if (v) onOk(v); }, 2: () => d.close() } });
  setTimeout(() => d.ctl[4354]?.focus?.(), 30);
  return d;
}

export function ieRename(ctx, name, onOk) {
  const d = dialogFromTemplate(ctx, D.b258, { title: "Rename", icon: "ie", iconBase: ICONS, values: { 320: name }, on: { 1: () => { const v = d.ctl[320].value.trim(); d.close(); if (v) onOk(v); }, 2: () => d.close() } });
  setTimeout(() => { d.ctl[320]?.focus?.(); d.ctl[320]?.select?.(); }, 30);
  return d;
}

export function ieAddFavorite(ctx, { name, folders, onOk }) {
  let folder = "";
  const d = dialogFromTemplate(ctx, D.s21400, {
    title: "Add Favorite", icon: "ie", iconBase: ICONS, values: { 1005: name }, labels: { 1006: "Create in >>" },
    on: { 1: () => { const v = d.ctl[1005].value.trim(); d.close(); if (v) onOk(v, folder); }, 2: () => d.close(), 1007: () => ieNewFolder(ctx, (n) => { folders.push(n); renderTree(); }) },
  });
  const list = d.ctl[14145]?.querySelector?.(".rk-listbox");
  const renderTree = () => {
    if (!list) return;
    list.replaceChildren(...["Favorites", ...folders].map((f, i) => el("div", { class: "ie-fold" + (f === (folder || "Favorites") ? " sel" : ""), onclick: () => { folder = i ? f : ""; renderTree(); } }, f)));
  };
  renderTree();
  return d;
}

export function ieProps(ctx, { url, title }) {
  const ext = /\.(\w+)$/.exec(url.split("?")[0])?.[1];
  const d = dialogFromTemplate(ctx, D.s21080, { title: "Properties", icon: "ie", values: { 21283: title }, labels: { 21085: ext && ext !== "htm" ? ext.toUpperCase() + " File" : "HTML Document", 21087: "(unknown)", 21286: url } });
  const W = px(227) + 8, y = py(215) + 22 - 28;
  d.place(btn(W - 8 - 3 * 72 - 12, y, 72, 23, "OK", { def: true, onclick: () => d.close() }), btn(W - 8 - 2 * 72 - 6, y, 72, 23, "Cancel", { onclick: () => d.close() }), btn(W - 8 - 72, y, 72, 23, "Apply", {}));
  return d;
}

export function iePageSetup(ctx, onOk) {
  const st = ctx.settings.get("iePageSetup") || { h: "&w&bPage &p of &P", f: "&u&b&d", l: "0.75", r: "0.75", t: "0.75", b: "0.75" };
  const d = dialogFromTemplate(ctx, D.s1546, { title: "Page Setup", icon: "ie", values: { 1137: "Letter", 1138: "Automatically Select", 8147: st.h, 8149: st.f, 1155: st.l, 1157: st.r, 1156: st.t, 1158: st.b }, checked: { 1056: true }, groups: [[1056, 1057]], on: { 1: () => { ctx.settings.set("iePageSetup", { h: d.ctl[8147].value, f: d.ctl[8149].value, l: d.ctl[1155].value, r: d.ctl[1157].value, t: d.ctl[1156].value, b: d.ctl[1158].value }); d.close(); onOk?.(); }, 2: () => d.close() } });
  return d;
}

export function iePrint(ctx, onOk) {
  const d = dialogFromTemplate(ctx, D.s1538, { title: "Print", icon: "ie", values: { 1139: "Browser Print (PDF)", 1152: "1", 1153: "1", 1154: "1" }, labels: { 1099: "Ready", 1098: "Browser printer", 1101: "Browser", 1100: "" }, checked: { 1056: true, 1059: true }, groups: [[1056, 1058, 1057], [1059, 1060, 1061]], on: { 1: () => { d.close(); onOk?.(); }, 2: () => d.close() } });
  return d;
}

export const IE_HELP = (ctx, about) => [
  { label: "Contents and Index", action: () => ctx.launch("help", { topic: "internet" }) },
  { label: "Product Updates", disabled: true },
  { label: "Web Tutorial", disabled: true },
  { label: "Online Support", disabled: true },
  { label: "Microsoft on the Web", submenu: ["Free Stuff", "Get Faster Internet Access", "Frequently Asked Questions", null, "Internet Start Page", "Send Feedback...", "Best of the Web", "Search the Web", null, "Microsoft Home Page"].map((l) => (l ? { label: l, disabled: true } : { separator: true })) },
  { separator: true },
  { label: "About Internet Explorer", action: about },
];

/** Browse For Folder (shell32.dll dialog 1087) over a list of favorite folders. */
export function browseFavFolder(ctx, { folders, current, onOk }) {
  let pick = current || "";
  const d = dialogFromTemplate(ctx, D.b1087, { title: "Browse For Folder", icon: "ie", iconBase: ICONS, labels: { 14146: "Select the folder you want to move the selected item to." }, values: { 14148: pick || "Favorites" },
    on: { 1: () => { d.close(); onOk(pick); }, 2: () => d.close(), 14150: () => ieNewFolder(ctx, (n) => { if (!folders.includes(n)) folders.push(n); pick = n; draw(); }) } });
  const tree = el("div", { class: "oe-fav-tree" });
  d.place(sunken(px(10) + 4, py(35) + 22, px(192), py(91), tree));
  const draw = () => { d.ctl[14148].value = pick || "Favorites"; tree.replaceChildren(...["", ...folders].map((f) => el("div", { class: "ie-org-row" + (f === pick ? " sel" : ""), style: { paddingLeft: (f ? 20 : 4) + "px" }, onclick: () => { pick = f; draw(); } }, el("span", { class: "ie-org-ic folder" }), el("span", { text: f || "Favorites" })))); };
  draw();
  return d;
}

/** Organize Favorites — layout/text from shdoclc.dll ORGFAV.DLG (41.2em x 31em, MS Shell Dlg 8pt). */
export function ieOrganize(ctx, { get, set, folders, setFolders, open }) {
  const W = 440 + 8, H = 331 + 22 + 4;
  const w = refWindow(ctx, { title: "Organize Favorites", icon: "ie", width: W, height: H, appId: "dialog" });
  let favs = get().map((f) => ({ ...f })), fl = [...new Set([...folders(), ...get().map((f) => f.folder).filter(Boolean)])];
  let sel = null; const open_ = new Set(), commit = () => { set(favs); setFolders(fl); };
  const tree = el("div", { class: "oe-fav-tree" });
  const info = el("div", { class: "oe-fav-info" });
  const sunk = sunken(204, 4, 440 - 204 - 4, 331 - 8 - 30, tree);
  const bs = { create: null, rename: null, move: null, del: null };
  const rows = () => {
    const out = [{ kind: "root", name: "Favorites", depth: 0 }];
    for (const f of fl) { out.push({ kind: "folder", name: f, depth: 1 }); if (open_.has(f)) for (const i of favs.filter((x) => x.folder === f)) out.push({ kind: "item", it: i, name: i.title, depth: 2 }); }
    for (const i of favs.filter((x) => !x.folder)) out.push({ kind: "item", it: i, name: i.title, depth: 1 });
    return out;
  };
  const same = (a, b) => a && b && a.kind === b.kind && a.name === b.name && a.it === b.it;
  const draw = () => {
    tree.replaceChildren(...rows().map((r) => {
      const n = el("div", { class: "ie-org-row" + (same(sel, r) ? " sel" : ""), style: { paddingLeft: 4 + r.depth * 16 + "px" }, ondblclick: () => { if (r.kind === "folder") { open_.has(r.name) ? open_.delete(r.name) : open_.add(r.name); draw(); } else if (r.kind === "item") open?.(r.it.url); } },
        el("span", { class: "ie-org-ic " + r.kind }), el("span", { text: r.name }));
      n.onclick = () => { sel = r; if (r.kind === "folder" && !open_.has(r.name)) open_.add(r.name); draw(); props(); };
      return n;
    }));
    for (const k of ["rename", "move", "del"]) bs[k].disabled = !sel || sel.kind === "root";
    bs.move.disabled = !sel || sel.kind !== "item";
  };
  const props = () => {
    if (!sel || sel.kind === "root") { info.replaceChildren(); return; }
    if (sel.kind === "folder") info.replaceChildren(el("b", { text: sel.name }), el("br"), "Favorites Folder", el("br"), el("br"), el("b", { text: "Modified:" }), el("br"), new Date().toLocaleDateString("en-US"));
    else info.replaceChildren(el("b", { text: sel.it.title }), el("br"), sel.it.url, el("br"), "times visited: " + (sel.it.visits || 0), el("br"), "last visited: " + (sel.it.last || "Never"));
  };
  const mk = (x, y, label, fn) => { const b = btn(x, y, 72, 23, label, { onclick: fn }); b.style.width = "92px"; return b; };
  const bx = 8, by = 108;
  bs.create = mk(bx, by, "Create Folder", () => ieNewFolder(ctx, (n) => { if (!fl.includes(n)) { fl.push(n); commit(); draw(); } }));
  bs.rename = mk(bx + 100, by, "Rename", () => {
    if (!sel || sel.kind === "root") return;
    ieRename(ctx, sel.name, (n) => {
    if (sel.kind === "folder") { fl = fl.map((f) => (f === sel.name ? n : f)); favs.forEach((f) => { if (f.folder === sel.name) f.folder = n; }); sel = { kind: "folder", name: n, depth: 1 }; } else { sel.it.title = n; sel.name = n; }
    commit(); draw(); props();
    });
  });
  bs.move = mk(bx, by + 28, "Move to Folder...", async () => {
    if (!sel || sel.kind !== "item") return;
    browseFavFolder(ctx, { folders: fl, current: sel.it.folder || "", onOk: (f) => { sel.it.folder = f || undefined; commit(); draw(); } });
  });
  bs.del = mk(bx + 100, by + 28, "Delete", async () => {
    if (!sel || sel.kind === "root") return;
    const ok = await ctx.dialogs.confirm(sel.kind === "folder" ? `Are you sure you want to remove the folder '${sel.name}' and all its contents?` : `Are you sure you want to send '${sel.name}' to the Recycle Bin?`, sel.kind === "folder" ? "Confirm Folder Delete" : "Confirm File Delete");
    if (!ok) return;
    if (sel.kind === "folder") { fl = fl.filter((f) => f !== sel.name); favs = favs.filter((f) => f.folder !== sel.name); } else favs = favs.filter((f) => f !== sel.it);
    sel = null; commit(); draw(); props();
  });
  const infoText = el("div", { class: "oe-fav-help", text: "To create a new folder, click on the Create Folder button. To rename or delete an item, select the item and click Rename or Delete." });
  Object.assign(infoText.style, { left: "8px", top: "8px", width: "190px" });
  const panel = sunken(8, 166, 190, 331 - 166 - 34, info);
  const pane = el("div", { class: "rk-pane" });
  Object.assign(pane.style, { left: "4px", top: "22px", width: "440px", height: "331px" });
  pane.append(infoText, bs.create, bs.rename, bs.move, bs.del, panel, sunk, btn(440 - 99 - 6, 331 - 23 - 6, 99, 23, "Close", { onclick: () => w.close() }));
  w.place(pane);
  draw();
  return w;
}
