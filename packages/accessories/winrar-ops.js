// WinRAR back end shared by the WinRAR window and the Explorer/desktop shell extension: archive creation (ZIP with fflate,
// RAR 2.9/3.x "store" archives written by hand), the progress / Add-to-archive dialogs and the "Add to archive" command.
import { el, button } from "../ui/index.js";
import { basename, dirname, joinPath, normalizePath, extension } from "../core/index.js";
import { loadRar, buildDialog, buildTabs, openDlgWindow, ctl } from "./winrar-dlg.js";

const V = new URL("../../assets/vendor/winrar/", import.meta.url).href;
export const VENDOR = V;
let libs = null;
export const loadLibs = async () => (libs ||= { fflate: await import(V + "fflate.mjs"), unrar: await import(V + "unrar.mjs") });
export const dispPath = (p) => p.replace(/\//g, "\\").replace(/\\$/, "") || "";
export const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function dataBytes(content) {
  const m = /^data:[^,]*;base64,/.exec(content);
  if (!m) return new TextEncoder().encode(content);
  const bin = atob(content.slice(m[0].length)), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function bytesDataUrl(bytes, mime = "application/octet-stream") {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(s)}`;
}
export const nodeBytes = (n) => (n.encoding === "data-url" || (/^data:/.test(n.content || "") && !/^text\//.test(n.mime || "")) ? dataBytes(n.content) : new TextEncoder().encode(n.content || ""));

// ---------- RAR 2.9 writer (method "store") ----------
const dosTime = (ms) => { const d = new Date(ms || Date.now()); return ((((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) << 16 | (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) >>> 0; };
/** entries: [{ name (with "/"), dir, bytes, mtime }]. Returns Uint8Array of a RAR archive that every RAR 3.x+ tool can read. */
export function buildRar(entries) {
  const parts = [new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00])];
  const block = (head, data) => {
    const crc = crc32(head.subarray(2)) & 0xffff;
    head[0] = crc & 255; head[1] = crc >> 8;
    parts.push(head); if (data?.length) parts.push(data);
  };
  block(new Uint8Array([0, 0, 0x73, 0, 0, 13, 0, 0, 0, 0, 0, 0, 0]));
  for (const e of entries) {
    const full = e.name.replace(/\/$/, "").replace(/\//g, "\\");
    const ascii = /^[\x20-\x7e]*$/.test(full);
    let nameBytes;
    if (ascii) nameBytes = new TextEncoder().encode(full);
    else { // OEM part (plain ASCII fallback), NUL, then the RAR "high byte" encoded UTF-16 name
      const fb = new TextEncoder().encode(full.replace(/[^\x20-\x7e]/g, "_")), chars = [...full].flatMap((c) => { const cp = c.codePointAt(0); return cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp]; });
      const enc = [0]; // high byte 0
      for (let i = 0; i < chars.length; i += 4) { enc.push(0xaa); for (let k = i; k < Math.min(i + 4, chars.length); k++) enc.push(chars[k] & 255, chars[k] >> 8); }
      nameBytes = new Uint8Array([...fb, 0, ...enc]);
    }
    const data = e.dir ? new Uint8Array(0) : e.bytes, hs = 32 + nameBytes.length, h = new Uint8Array(hs), dv = new DataView(h.buffer);
    dv.setUint8(2, 0x74);
    dv.setUint16(3, 0x8000 | (e.dir ? 0xe0 : 0) | (ascii ? 0 : 0x200), true);
    dv.setUint16(5, hs, true);
    dv.setUint32(7, data.length, true); dv.setUint32(11, data.length, true);
    dv.setUint8(15, 2); // host OS: Win32
    dv.setUint32(16, e.dir ? 0 : crc32(data), true);
    dv.setUint32(20, dosTime(e.mtime), true);
    dv.setUint8(24, 29); dv.setUint8(25, 0x30); // unpack version 2.9, method "store"
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint32(28, e.dir ? 0x10 : 0x20, true);
    h.set(nameBytes, 32);
    block(h, data);
  }
  block(new Uint8Array([0, 0, 0x7b, 0x00, 0x40, 0x07, 0x00]));
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// ---------- gathering files ----------
/** Files/folders from the virtual file system as archive entries (folder names are kept as the first path component). */
export function collectFs(ctx, paths) {
  const out = [];
  const walk = (p, rel) => {
    const n = ctx.fs.get(p);
    if (!n) return;
    if (n.type === "folder") { out.push({ name: rel, dir: true, bytes: null, mtime: n.modified }); for (const c of ctx.fs.list(p)) walk(c.path, rel + "/" + c.name); }
    else out.push({ name: rel, dir: false, bytes: nodeBytes(n), mtime: n.modified });
  };
  for (const p of paths) walk(p, basename(p));
  return out;
}
export async function makeArchiveBytes(entries, format, level = 6) {
  if (format === "rar") return buildRar(entries);
  const L = await loadLibs(), files = {};
  for (const e of entries) files[e.dir ? e.name.replace(/\/?$/, "/") : e.name] = e.dir ? new Uint8Array(0) : e.bytes;
  return L.fflate.zipSync(files, { level });
}
export const LEVELS = ["Store", "Fastest", "Fast", "Normal", "Good", "Best"], LEVEL_NUM = [0, 1, 3, 6, 8, 9];

// ---------- dialogs ----------
export function createUi(ctx, RS) {
  const modal = (title, content, { collect = () => true, buttons = true, bind } = {}) => new Promise((resolve) => {
    let fin = false, d;
    const done = async (v) => { if (fin) return; fin = true; d.onClose = null; await d.close(); resolve(v); };
    const ok = () => { const v = collect(); if (v !== false) done(v); };
    const row = buttons ? el("div", { class: "rd-btnrow" }, button("OK", ok, { class: "default-button" }), button("Cancel", () => done(null)), button("Help", () => ctx.launch("help", { topic: "intro" }))) : null;
    d = openDlgWindow(ctx, { title, content, buttons: row });
    d.onClose = () => { resolve(null); return true; };
    d.el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); done(null); } else if (e.key === "Enter" && e.target.tagName !== "BUTTON" && e.target.tagName !== "TEXTAREA") { e.preventDefault(); ok(); } });
    bind?.({ ok, done, win: d });
  });
  const progress = (title) => {
    const dlg = buildDialog(RS.dialogs[11934]);
    const log = dlg.byId(159), pct = dlg.byId(152), bar = dlg.byId(160).firstChild;
    let cancelled = false, paused = false;
    const d = openDlgWindow(ctx, { title, content: dlg.root });
    dlg.byId(2).addEventListener("click", () => { cancelled = true; });
    dlg.byId(111).addEventListener("click", () => { paused = !paused; dlg.byId(111).textContent = paused ? "Resume" : "Pause"; });
    dlg.byId(110).addEventListener("click", () => d.minimize?.());
    dlg.byId(9).addEventListener("click", () => ctx.launch("help", { topic: "intro" }));
    return {
      line: (t) => { log.append(t + "\n"); log.scrollTop = log.scrollHeight; },
      set: (n, f) => { pct.textContent = Math.round(f * 100) + "%"; bar.style.width = Math.round(f * 100) + "%"; },
      get cancelled() { return cancelled; }, get paused() { return paused; },
      close: () => d.close(),
    };
  };
  const errBox = (e) => ctx.dialogs.message(e?.message || String(e), { title: "WinRAR", icon: "error" });

  /** "Archive name and parameters" with the real resource dialogs. Resolves to {name, format, level, del} or null. */
  const addDialog = (defName, { format = "rar" } = {}) => {
    const ids = [11528, 11562, 11542, 11582, 11628, 11606, 11654];
    const t = buildTabs(ids.map((i) => RS.dialogs[i]), { labels: ["General", "Advanced", "Options", "Files", "Backup", "Time", "Comment"], uid: 1 });
    const g = t.pages[0], saved = ctx.settings.get("winrarAdd") || {};
    const fmt = () => (ctl.checked(g.byId(113)) ? "rar" : "zip");
    ctl.checked(g.byId(format === "zip" ? 114 : 113), true);
    ctl.value(g.byId(101), defName);
    ctl.options(g.byId(112), LEVELS, saved.level ?? 3);
    ctl.options(g.byId(117), ["Add and replace files", "Add and update files", "Fresh existing files only", "Synchronize archive contents"], 0);
    ctl.options(g.byId(107), ["B", "KB", "MB", "GB"], 2);
    ctl.checked(g.byId(111), false);
    for (const i of [109, 110, 108, 104, 116, 106, 107, 105, 103]) ctl.setEnabled(g.byId(i), false);
    const setExt = () => ctl.value(g.byId(101), ctl.value(g.byId(101)).replace(/\.(rar|zip)$/i, "") + "." + fmt());
    for (const i of [113, 114]) g.byId(i).addEventListener("change", setExt);
    g.byId(102).addEventListener("click", async () => { const p = await ctx.dialogs.file({ mode: "save", path: dirname(normalizePath(ctl.value(g.byId(101)).replace(/\\/g, "/"))), name: basename(ctl.value(g.byId(101))) }); if (p) ctl.value(g.byId(101), dispPath(p)); });
    g.byId(115).addEventListener("click", () => ctx.dialogs.message("Compression profiles are not available in this browser version of WinRAR.", { title: "WinRAR", icon: "info" }));
    const o = t.pages[2];
    ctl.checked(o.byId(101), true);
    const cm = t.pages[6], cbox = cm.byId(103); // comment page: kept in the dialog only (the archive formats written here carry no comment)
    ctl.setEnabled(cm.byId(101), false); ctl.setEnabled(cm.byId(102), false); cbox && ctl.setEnabled(cbox, false);
    return modal("Archive name and parameters", t.root, { collect: () => {
      const level = Math.max(0, LEVELS.indexOf(ctl.value(g.byId(112))));
      ctx.settings.set("winrarAdd", { level });
      return { name: ctl.value(g.byId(101)).trim(), format: fmt(), level, del: ctl.checked(g.byId(111)) };
    } });
  };
  return { modal, progress, errBox, addDialog };
}

/** Create an archive from file-system paths. Used by WinRAR, the Explorer shell extension and the wizard.
 *  opts: { paths, name?, format, level, dialog (show "Archive name and parameters"), quiet, del, folder } -> target path or null */
export async function addToArchive(ctx, opts) {
  const RS = await loadRar(), ui = createUi(ctx, RS), paths = opts.paths.map(normalizePath);
  const folder = opts.folder || dirname(paths[0]);
  const stem = opts.name || (paths.length === 1 ? basename(paths[0]).replace(/\.[^.]*$/, "") || basename(paths[0]) : basename(folder) || "Archive");
  let format = opts.format || "rar", level = opts.level ?? 3, target = joinPath(folder, stem + "." + format), del = !!opts.del;
  if (opts.dialog) {
    const r = await ui.addDialog(joinPath(folder, stem + "." + format).replace(/\//g, "\\"), { format });
    if (!r || !r.name) return null;
    format = r.format; level = r.level; del = r.del;
    target = normalizePath(r.name.replace(/\\/g, "/"));
    if (!new RegExp(`\\.${format}$`, "i").test(target)) target += "." + format;
  }
  if (ctx.fs.exists(target) && !opts.dialog) target = joinPath(dirname(target), ctx.fs.uniqueName(dirname(target), basename(target)));
  const pr = ui.progress(`Adding to archive ${basename(target)}`);
  pr.line(`Creating archive ${basename(target)}\n`);
  try {
    const entries = collectFs(ctx, paths);
    entries.forEach((e, i) => { if (!e.dir) pr.line(`Adding    ${e.name.replace(/\//g, "\\")}`); pr.set(e.name, (i + 1) / (entries.length + 1)); });
    await new Promise((r) => setTimeout(r));
    const bytes = await makeArchiveBytes(entries, format, LEVEL_NUM[level] ?? 6);
    await ctx.fs.writeFile(target, bytesDataUrl(bytes, format === "rar" ? "application/x-rar-compressed" : "application/zip"), { mime: format === "rar" ? "application/x-rar-compressed" : "application/zip", encoding: "data-url" });
    pr.set(basename(target), 1);
    pr.line(`\nDone`);
    if (del) for (const p of paths) await ctx.fs.remove(p);
  } catch (e) { pr.close(); await ui.errBox(e); return null; }
  await new Promise((r) => setTimeout(r, 250));
  pr.close();
  return target;
}

/** "Compress ... and email": archive then new Outlook Express message with the archive attached. */
export async function compressAndEmail(ctx, opts) {
  const target = await addToArchive(ctx, opts);
  if (!target) return;
  const n = ctx.fs.stat(target);
  ctx.launch("outlook", { compose: true, subject: basename(target), attachments: [{ name: basename(target), mime: n.mime || "application/octet-stream", enc: "data-url", data: n.content, size: nodeBytes(n).length }] });
}
export { extension };
