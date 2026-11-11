// File / folder / drive Properties sheets. Layouts and texts come from shell32.dll of the Windows 2000 SP4 ISO (props-data.js).
import { el, icon, fileIcon } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { refWindow, tabControl, btn } from "../control-panel/refkit.js";
import { SHELL32 as T } from "./props-data.js";

const nf = (n) => n.toLocaleString("en-US");
const human = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(2) + " MB" : n >= 1024 ? (n / 1024).toFixed(2) + " KB" : n + " bytes");
const sizeText = (n) => (n < 1024 ? `${nf(n)} bytes` : `${human(n)} (${nf(n)} bytes)`);
const onDisk = (n) => Math.ceil(n / 4096) * 4096;
const dt = (t) => new Date(t).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
const bytesOf = (n) => (n.type === "folder" ? 0 : n.size ?? 0);
const walk = (ctx, path, acc = { size: 0, files: 0, folders: 0, disk: 0 }) => {
  for (const n of ctx.fs.list(path, { includeHidden: true })) {
    if (n.type === "folder") { acc.folders++; walk(ctx, n.path, acc); } else { acc.files++; acc.size += bytesOf(n); acc.disk += onDisk(bytesOf(n)); }
  }
  return acc;
};
export const typeName = (n) => {
  if (n.type === "folder") return "File Folder";
  const m = /\.([^.\\/]+)$/.exec(n.name);
  const known = { txt: "Text Document", htm: "HTML Document", html: "HTML Document", bmp: "Bitmap Image", doc: "Microsoft Word Document", rtf: "Rich Text Format", exe: "Application", dll: "Application Extension", ini: "Configuration Settings", wav: "Wave Sound", mp3: "MP3 Format Sound", jpg: "JPEG Image", gif: "GIF Image", zip: "WinRAR ZIP archive", rar: "WinRAR archive", lnk: "Shortcut" };
  return m ? known[m[1].toLowerCase()] || m[1].toUpperCase() + " File" : "File";
};
const opensWith = (n) => ({ txt: "Notepad", htm: "Internet Explorer", html: "Internet Explorer", bmp: "Paint", wav: "Windows Media Player", mp3: "Windows Media Player", rar: "WinRAR", zip: "WinRAR", doc: "WordPad", rtf: "WordPad", exe: "", dll: "" })[(/\.([^.]+)$/.exec(n.name)?.[1] || "").toLowerCase()] ?? "";

/** Place a template's controls on a tab pane; returns { out, ctl }. */
const nodes = (ctx, tpl, opts, ox, oy) => {
  const out = []; const ctl = {};
  dialogFromTemplate(ctx, tpl, { ...opts, ctlOut: ctl, host: { place: (...n) => out.push(...n.flat(Infinity)), el: null }, ox, oy });
  return { out, ctl };
};

const pie = (used, size = 82) => {
  const a = used * Math.PI * 2, r = size / 2, cx = r, cy = r;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a), big = used > 0.5 ? 1 : 0;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", size); svg.setAttribute("height", size + 8); svg.setAttribute("viewBox", `0 0 ${size} ${size + 8}`);
  svg.innerHTML = `<ellipse cx="${cx}" cy="${cy + 7}" rx="${r}" ry="${r * 0.55}" fill="#800080"/><ellipse cx="${cx}" cy="${cy + 4}" rx="${r}" ry="${r * 0.55}" fill="#ff00ff"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.55}" fill="#ff00ff" stroke="#000" stroke-width=".5"/>` +
    `<path d="M${cx} ${cy} L${cx} ${cy - r * 0.55} A${r} ${r * 0.55} 0 ${big} 1 ${cx + r * 0.55 * 0 + r * Math.sin(a)} ${cy - r * 0.55 * Math.cos(a)} Z" fill="#0000ff" stroke="#000" stroke-width=".5"/>`;
  return svg;
};

export function openProperties(ctx, n, { onChange } = {}) {
  const drive = /^[a-z]:[\\/]?$/i.test(n.path);
  const isFolder = n.type === "folder" && !drive;
  const stat = drive ? null : ctx.fs.stat(n.path);
  const base = drive ? T["1080"] : isFolder ? T["1044"] : T["1041"];
  const gen = { ...base, controls: base.controls.filter((c) => c.cx !== 0) };
  const title = drive ? `Win2000 (${n.path[0].toUpperCase()}:) Properties` : `${n.name} Properties`;
  const pw = px(gen.cx) + 8, ph = py(gen.cy) + 8;
  const FX = 4, FY = 22, PX = FX + 8, W = pw + PX * 2, top = FY + 8, PY = top + 21, H = PY + ph + 10 + 23 + 14;
  const w = refWindow(ctx, { title, icon: drive ? "drive" : fileIcon(n), width: W, height: H, appId: "properties" });
  const apply = [];
  const tabs = [];
  let g;
  if (drive) {
    const cap = 2137000000, free = 386000000, used = cap - free;
    g = nodes(ctx, gen, { values: { 14401: "Win2000" }, labels: { 14402: "Local Disk", 14427: "NTFS", 14406: nf(used) + " bytes", 14405: human(used), 14407: nf(free) + " bytes", 14408: human(free), 14409: nf(cap) + " bytes", 14410: human(cap), 14412: `Drive ${n.path[0].toUpperCase()}:` }, checked: { 13158: true }, on: { 14428: () => ctx.launch("cleanmgr", { drive: `${n.path[0].toUpperCase()}:` }) } }, PX, PY);
    const pieHost = el("div", { style: { position: "absolute", left: PX + px(68) + "px", top: PY + py(118) + "px" } }, pie(used / cap));
    g.out.push(pieHost);
    // legend swatches (used = blue, free = magenta)
    for (const [id, color] of [[14403, "#0000ff"], [14404, "#ff00ff"]]) { const b = g.ctl[id]; if (b) { b.textContent = ""; b.style.background = color; b.style.border = "1px solid #000"; } }
    const icn = el("div", { style: { position: "absolute", left: PX + px(7) + "px", top: PY + py(7) + "px" } }, icon("drive", 32));
    g.out.push(icn);
    const t = nodes(ctx, T["1081"], { on: { 14416: () => ctx.launch("terminal", { cmd: "chkdsk" }), 14420: () => ctx.launch("defrag"), 14418: () => ctx.launch("backup") } }, PX, PY);
    tabs.push({ label: "General", x: PX, w: 62, content: () => g.out }, { label: "Tools", x: PX + 62, w: 62, content: () => t.out });
    apply.push(() => { const v = g.ctl[14401]?.value; if (v != null) ctx.settings.set("driveLabel" + n.path[0].toUpperCase(), v); });
  } else {
    let size = stat.size, disk = onDisk(size), info = null;
    if (isFolder) { info = walk(ctx, n.path); size = info.size; disk = info.disk; }
    const loc = (stat.originalPath ? stat.originalPath.replace(/\/[^/]*$/, "") : n.path.replace(/\/[^/]*$/, "")).replaceAll("/", "\\");
    const labels = { 13059: typeName(stat), 13065: loc, 13064: sizeText(size), 13106: sizeText(disk), 13072: dt(stat.created), 13073: dt(stat.modified), 13074: dt(Date.now()), 13153: opensWith(stat), 14113: info ? `${nf(info.files)} Files, ${nf(info.folders)} Folders` : "" };
    const values = { 13156: stat.name }; const ro = [13059, 13065, 13064, 13106, 13072, 13073, 13074, 13153];
    for (const id of ro) { values[id] = labels[id] ?? ""; delete labels[id]; }
    g = nodes(ctx, gen, { values, hidden: isFolder ? [] : [13077], labels, checked: { 13075: !!stat.readOnly, 13076: !!stat.hidden, 13077: stat.archive !== false }, on: { 13155: () => ctx.dialogs.message("Open With is not available for this file type.", { title: "Open With", icon: "info" }), 13154: () => openAdvanced(ctx, g, stat) } }, PX, PY);
    for (const id of ro) { const c = g.ctl[id]; if (c) { c.readOnly = true; const bx = c.parentElement; if (bx) { bx.style.border = "none"; bx.style.boxShadow = "none"; bx.style.background = "transparent"; } c.style.background = "transparent"; } }
    g.out.push(el("div", { style: { position: "absolute", left: PX + px(7) + "px", top: PY + py(7) + "px" } }, icon(drive ? "drive" : isFolder ? "folder" : fileIcon(n), 32)));
    tabs.push({ label: "General", x: PX, w: 62, content: () => g.out });
    apply.push(async () => {
      const on = (id) => g.ctl[id]?.classList.contains("checked");
      await ctx.fs.setAttrs(n.path, { readOnly: on(13075), hidden: on(13076), archive: on(13077) });
      const nm = g.ctl[13156]?.value?.trim();
      if (nm && nm !== stat.name) await ctx.fs.rename(n.path, nm);
    });
  }
  w.place(tabControl({ top, pane: [PX, PY, pw, ph], tabs }));
  const by = PY + ph + 10;
  const close = () => w.close();
  const run = async () => { for (const f of apply) await f(); onChange?.(); };
  w.place(
    btn(W - PX - 3 * 75 - 12, by, 75, 23, "OK", { def: true, onclick: async () => { await run(); close(); } }),
    btn(W - PX - 2 * 75 - 6, by, 75, 23, "Cancel", { onclick: close }),
    btn(W - PX - 75, by, 75, 23, "Apply", { onclick: run }),
  );
  return w;
}

function openAdvanced(ctx, g, stat) {
  const ctl = {};
  const t = T["1054"];
  dialogFromTemplate(ctx, t, { title: "Advanced Attributes", appId: "dialog", icon: "folder", ctlOut: ctl, checked: { 13077: g.ctl[13077]?.classList.contains("checked"), 13158: true }, on: { 1: () => { const a = ctl[13077]?.classList.contains("checked"); g.ctl[13077]?.classList.toggle("checked", !!a); ctl[1]?.closest(".window")?.querySelector(".close-button")?.click(); } } });
}
