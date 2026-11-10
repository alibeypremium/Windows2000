// WinRAR 4.11 look-alike (menus, dialogs, toolbar bitmaps and icons come from the real WinRAR.exe resources). ZIP is read/written with fflate (MIT) and RAR is read with the unrar WebAssembly build
// (node-unrar-js, MIT/unrar licence). Both are vendored in assets/vendor/winrar. RAR archives cannot be created.
import { el, button, menuBar, icon, fileIcon, statusBar } from "../ui/index.js";
import { basename, dirname, extension, joinPath, normalizePath, pickFiles, DOCS } from "../core/index.js";
import { loadRar, buildDialog, buildTabs, openDlgWindow, ctl, plain, RAR_BASE } from "./winrar-dlg.js";

const RB = "/assets/ui/winrar/rar411/";

const V = new URL("../../assets/vendor/winrar/", import.meta.url).href;
let libs = null;
const loadLibs = async () => (libs ||= { fflate: await import(V + "fflate.mjs"), unrar: await import(V + "unrar.mjs") });

const TEXT = /^(txt|log|ini|csv|json|js|html?|css|md|bat|reg|inf|cfg|xml|c|h|cpp|java|php|cmd)$/i;
const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const dispPath = (p) => p.replace(/\//g, "\\").replace(/\\$/, "") || "";
const fmtDate = (d) => {
  if (!d) return "";
  d = new Date(d);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const typeOf = (name, dir) => {
  if (dir) return "File folder";
  const e = extension(name);
  if (e === "zip") return "WinRAR ZIP archive";
  if (e === "rar") return "WinRAR archive";
  return e ? e.toUpperCase() + " File" : "File";
};
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const crcHex = (n) => (n >>> 0).toString(16).toUpperCase().padStart(8, "0");

function dataBytes(content) {
  const m = /^data:[^,]*;base64,/.exec(content);
  if (!m) return new TextEncoder().encode(content);
  const bin = atob(content.slice(m[0].length)), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesDataUrl(bytes, mime = "application/octet-stream") {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(s)}`;
}
const nodeBytes = (n) => (n.encoding === "data-url" || (/^data:/.test(n.content || "") && !/^text\//.test(n.mime || "")) ? dataBytes(n.content) : new TextEncoder().encode(n.content || ""));

/** Minimal ZIP central directory reader: names, sizes, CRC and times for the list view. */
function readZipDirectory(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let e = u8.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("not a zip");
  const n = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const out = [], dec = new TextDecoder();
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), time = dv.getUint16(p + 12, true), date = dv.getUint16(p + 14, true);
    const crc = dv.getUint32(p + 16, true), packed = dv.getUint32(p + 20, true), size = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)).replace(/\\/g, "/");
    const mtime = new Date(1980 + (date >> 9), ((date >> 5) & 15) - 1, date & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2).getTime();
    out.push({ name: name.replace(/\/$/, ""), dir: name.endsWith("/"), size, packed, crc, method, mtime, encrypted: !!(flags & 1) });
    p += 46 + nl + xl + cl;
  }
  return out;
}

export async function openWinRAR(ctx, { path = null } = {}) {
  const RS = await loadRar();
  const w = ctx.wm.create({ title: "WinRAR", icon: "winrar", width: 640, height: 450, x: 120, y: 70, appId: "winrar" });
  const st = Object.assign({ sortKey: "name", sortDir: 1 }, ctx.settings.get("winrar") || {});
  let cwd = DOCS; // file-manager folder, "" = drives
  let arc = null; // { path, kind, data, entries, inner }
  let items = [], selected = new Set(), last = null;

  const toolbtn = (img, label, action) => {
    const b = el("button", { class: "wr-tool", title: label, type: "button" }, el("img", { src: `${RB}b${img}.png`, width: 48, height: 36, alt: "", draggable: "false" }), el("span", { text: label }));
    b.addEventListener("click", action);
    return b;
  };

  const status = statusBar("", "");
  const statusText = status.children[0];
  const addr = el("input", { class: "wr-addr", spellcheck: false, "aria-label": "Path" });
  const body = el("div", { class: "wr-list", tabindex: "0" });
  const head = el("div", { class: "wr-head" });
  const rowsBox = el("div", { class: "wr-rows" });
  body.append(head, rowsBox);

  const errBox = (e) => ctx.dialogs.message(e?.message || String(e), { title: "WinRAR", icon: "error" });

  // ---------- data ----------
  const fsNodes = () => {
    if (cwd === "") return ["C:/", "D:/"].map((p) => ({ name: p.slice(0, 2), path: p, dir: true, drive: true, size: 0, mtime: 0 }));
    return ctx.fs.list(cwd).map((n) => ({ name: n.name, path: n.path, dir: n.type === "folder", size: n.type === "folder" ? 0 : n.size, mtime: n.modified, node: n }));
  };
  const arcNodes = () => {
    const base = arc.inner ? arc.inner + "/" : "", seen = new Map();
    for (const e of arc.entries) {
      if (!e.name.toLowerCase().startsWith(base.toLowerCase()) || e.name.length === base.length - 0 && e.dir && e.name + "/" === base) continue;
      const rest = e.name.slice(base.length);
      if (!rest) continue;
      const slash = rest.indexOf("/");
      if (slash < 0) {
        if (e.dir) seen.set(rest.toLowerCase(), { name: rest, dir: true, size: 0, packed: 0, mtime: e.mtime, entry: e });
        else seen.set(rest.toLowerCase(), { name: rest, dir: false, size: e.size, packed: e.packed, crc: e.crc, mtime: e.mtime, entry: e });
      } else {
        const d = rest.slice(0, slash);
        if (!seen.has(d.toLowerCase())) seen.set(d.toLowerCase(), { name: d, dir: true, size: 0, packed: 0, mtime: e.mtime, entry: null });
      }
    }
    return [...seen.values()];
  };
  const sortItems = (list) => {
    const k = st.sortKey, d = st.sortDir;
    return list.sort((a, b) => {
      if (a.dir !== b.dir) return a.dir ? -1 : 1;
      let r;
      if (k === "name") r = a.name.localeCompare(b.name, undefined, { numeric: true });
      else if (k === "size") r = (a.size || 0) - (b.size || 0);
      else if (k === "packed") r = (a.packed || 0) - (b.packed || 0);
      else if (k === "type") r = typeOf(a.name, a.dir).localeCompare(typeOf(b.name, b.dir));
      else if (k === "crc") r = (a.crc || 0) - (b.crc || 0);
      else r = (a.mtime || 0) - (b.mtime || 0);
      return r * d || a.name.localeCompare(b.name);
    });
  };

  // ---------- rendering ----------
  const cols = () => (arc ? [["name", "Name", 230], ["size", "Size", 70], ["packed", "Packed", 70], ["type", "Type", 110], ["mtime", "Modified", 100], ["crc", "CRC32", 70]] : [["name", "Name", 250], ["size", "Size", 80], ["type", "Type", 130], ["mtime", "Modified", 120]]);
  const drawHead = () => {
    head.replaceChildren(...cols().map(([k, label, wd]) => {
      const h = el("div", { class: "wr-th" + (k === "size" || k === "packed" ? " num" : ""), style: { width: wd + "px" }, text: label + (st.sortKey === k ? (st.sortDir > 0 ? " ▲" : " ▼") : "") });
      h.addEventListener("click", () => { st.sortDir = st.sortKey === k ? -st.sortDir : 1; st.sortKey = k; ctx.settings.set("winrar", st); render(); });
      return h;
    }));
  };
  const updateStatus = () => {
    const sel = items.filter((i) => selected.has(i.name));
    const set = sel.length ? sel : items;
    const files = set.filter((i) => !i.dir), dirs = set.filter((i) => i.dir);
    const bytes = files.reduce((s, i) => s + (i.size || 0), 0);
    const part = (n, one, many) => (n ? `${n} ${n === 1 ? one : many}` : "");
    const what = [part(dirs.length, "folder", "folders"), files.length ? `${fmtNum(bytes)} bytes in ${files.length} ${files.length === 1 ? "file" : "files"}` : ""].filter(Boolean).join(" and ");
    statusText.textContent = (sel.length ? "Selected " : "Total ") + (what || "0 bytes in 0 files");
  };
  const markSel = () => {
    [...rowsBox.children].forEach((r, i) => r.classList.toggle("sel", selected.has(items[i]?.name)));
    updateStatus();
  };
  const render = () => {
    items = sortItems(arc ? arcNodes() : fsNodes());
    drawHead();
    rowsBox.replaceChildren(...items.map((it) => {
      const cells = cols().map(([k, , wd]) => {
        let v = "";
        if (k === "name") v = it.name;
        else if (k === "size") v = it.dir ? "" : fmtNum(it.size || 0);
        else if (k === "packed") v = it.dir ? "" : fmtNum(it.packed || 0);
        else if (k === "type") v = it.drive ? "Local Disk" : typeOf(it.name, it.dir);
        else if (k === "mtime") v = it.drive ? "" : fmtDate(it.mtime);
        else if (k === "crc") v = it.dir || it.crc == null ? "" : crcHex(it.crc);
        const c = el("div", { class: "wr-td" + (k === "size" || k === "packed" ? " num" : ""), style: { width: wd + "px" } });
        if (k === "name") {
          const ext = extension(it.name);
          c.append(it.drive ? icon("drive") : (ext === "zip" || ext === "rar") && !it.dir ? el("img", { class: "icon", src: "/assets/icons/rarfile-16x16.png", width: 16, height: 16, alt: "" }) : icon(fileIcon({ name: it.name, type: it.dir ? "folder" : "file" })), el("span", { text: v }));
        } else c.textContent = v;
        return c;
      });
      const row = el("div", { class: "wr-row" + (selected.has(it.name) ? " sel" : "") }, ...cells);
      row.addEventListener("pointerdown", (e) => {
        if (e.shiftKey && last) {
          const a = items.findIndex((x) => x.name === last), b = items.indexOf(it);
          selected = new Set(items.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.name));
        } else if (e.ctrlKey) {
          selected.has(it.name) ? selected.delete(it.name) : selected.add(it.name);
          last = it.name;
        } else { selected = new Set([it.name]); last = it.name; }
        markSel();
      });
      row.addEventListener("dblclick", () => activate(it));
      return row;
    }));
    addr.value = arc ? dispPath(arc.path) + (arc.inner ? "\\" + arc.inner.replace(/\//g, "\\") : "") : dispPath(cwd);
    updateStatus();
    w.setTitle(arc ? `${basename(arc.path)} - WinRAR` : "WinRAR");
  };

  // ---------- navigation ----------
  const isArchive = (n) => /^(zip|rar)$/.test(extension(n));
  const openArchive = async (p) => {
    p = normalizePath(p);
    try {
      const node = ctx.fs.stat(p), data = nodeBytes(node), L = await loadLibs();
      let entries, kind;
      if (/\.rar$/i.test(p) || (data[0] === 0x52 && data[1] === 0x61 && data[2] === 0x72)) {
        kind = "rar";
        const ex = await L.unrar.createExtractorFromData({ data: data.slice().buffer, wasmBinary: await (await fetch(V + "unrar.wasm")).arrayBuffer() });
        const list = ex.getFileList();
        entries = [...list.fileHeaders].map((h) => ({ name: h.name.replace(/\\/g, "/"), dir: h.flags.directory, size: h.unpSize, packed: h.packSize, crc: h.crc, mtime: h.time ? new Date(h.time).getTime() : 0, encrypted: h.flags.encrypted }));
      } else { kind = "zip"; entries = readZipDirectory(data); }
      arc = { path: p, kind, data, entries, inner: "", size: data.length };
      selected = new Set(); last = null;
      render();
    } catch (e) {
      await ctx.dialogs.message(`${p.replace(/\//g, "\\")}\n\nCannot open file ${p.replace(/\//g, "\\")}\nIt is not a valid RAR or ZIP archive, or the archive is corrupt.`, { title: "WinRAR: Diagnostic messages", icon: "error" });
    }
  };
  const goUp = () => {
    selected = new Set();
    if (arc) {
      if (arc.inner) arc.inner = arc.inner.includes("/") ? arc.inner.slice(0, arc.inner.lastIndexOf("/")) : "";
      else { cwd = dirname(arc.path); arc = null; }
    } else if (cwd !== "") cwd = /^[a-z]:\/?$/i.test(cwd) ? "" : dirname(cwd);
    render();
  };
  const activate = (it) => {
    selected = new Set();
    if (arc) { if (it.dir) { arc.inner = (arc.inner ? arc.inner + "/" : "") + it.name; render(); } else viewEntry(it); return; }
    if (it.dir) { cwd = it.path; render(); return; }
    if (isArchive(it.name)) return openArchive(it.path);
    return ctx.openFile(it.path);
  };

  // ---------- extraction ----------
  const mkdirs = async (folder) => {
    folder = normalizePath(folder);
    const parts = folder.split("/").filter(Boolean);
    let cur = parts[0] + "/";
    for (const p of parts.slice(1)) {
      cur = joinPath(cur, p);
      if (!ctx.fs.exists(cur)) await ctx.fs.mkdir(cur);
    }
  };
  const putFile = async (path, bytes) => {
    await mkdirs(dirname(path));
    if (TEXT.test(extension(path))) await ctx.fs.writeFile(path, new TextDecoder().decode(bytes), { mime: "text/plain" });
    else await ctx.fs.writeFile(path, bytesDataUrl(bytes), { mime: "application/octet-stream", encoding: "data-url" });
  };
  // ---------- real dialog helpers ----------
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
    dlg.byId(111).addEventListener("click", () => { paused = !paused; dlg.byId(111).lastChild && (dlg.byId(111).textContent = paused ? "Resume" : "Pause"); });
    dlg.byId(110).addEventListener("click", () => d.minimize?.());
    dlg.byId(9).addEventListener("click", () => ctx.launch("help", { topic: "intro" }));
    return {
      line: (t) => { log.append(t + "\n"); log.scrollTop = log.scrollHeight; },
      set: (n, f) => { pct.textContent = Math.round(f * 100) + "%"; bar.style.width = Math.round(f * 100) + "%"; },
      get cancelled() { return cancelled; }, get paused() { return paused; },
      close: () => d.close(),
    };
  };
  /** Returns [{name,dir,bytes|null}] for the requested archive entries (selection = names relative to arc.inner). */
  const readEntries = async (wanted, onProgress, test = false) => {
    const L = await loadLibs(), out = [];
    const want = (e) => !wanted || wanted.some((n) => { const full = (arc.inner ? arc.inner + "/" : "") + n; return e.name.toLowerCase() === full.toLowerCase() || e.name.toLowerCase().startsWith(full.toLowerCase() + "/"); });
    if (arc.kind === "zip") {
      const files = L.fflate.unzipSync(arc.data, { filter: (f) => want({ name: f.name.replace(/\/$/, "").replace(/\\/g, "/") }) && !f.name.endsWith("/") });
      let i = 0; const total = Object.keys(files).length;
      for (const [name, bytes] of Object.entries(files)) { out.push({ name: name.replace(/\\/g, "/"), dir: false, bytes }); onProgress?.(name, ++i / total); await new Promise((r) => setTimeout(r)); }
      for (const e of arc.entries) if (e.dir && want(e)) out.push({ name: e.name, dir: true, bytes: null });
    } else {
      const ex = await L.unrar.createExtractorFromData({ data: arc.data.slice().buffer, wasmBinary: await (await fetch(V + "unrar.wasm")).arrayBuffer() });
      const names = arc.entries.filter(want).map((e) => e.name);
      const res = ex.extract({ files: names.map((n) => n) });
      let i = 0;
      for (const f of res.files) {
        const h = f.fileHeader, nm = h.name.replace(/\\/g, "/");
        out.push({ name: nm, dir: h.flags.directory, bytes: h.flags.directory ? null : (f.extraction instanceof Uint8Array ? f.extraction : f.extraction?.data) || new Uint8Array(0) });
        onProgress?.(nm, ++i / Math.max(1, names.length)); await new Promise((r) => setTimeout(r));
      }
    }
    return out;
  };
  const extractTo = async (dest, names, opts = {}) => {
    const pr = progress(`Extracting from ${basename(arc.path)}`);
    pr.line(`Extracting from ${basename(arc.path)}\n`);
    try {
      const strip = names && arc.inner ? arc.inner + "/" : "";
      const list = await readEntries(names, (n, f) => pr.set(n, f));
      for (const f of list) {
        if (pr.cancelled) break;
        const rel = strip && f.name.toLowerCase().startsWith(strip.toLowerCase()) ? f.name.slice(strip.length) : f.name;
        let target = joinPath(dest, rel);
        if (!f.dir && ctx.fs.exists(target)) {
          const m = opts.overwrite || "ask";
          if (opts.update === "fresh" && false) continue;
          if (m === "skip") { pr.line(`Skipping  ${rel}`); continue; }
          if (m === "rename") { let n = 1; const base = target.replace(/(\.[^./]*)?$/, ""), ext = (target.match(/(\.[^./]*)$/) || [""])[0]; while (ctx.fs.exists(`${base}(${n})${ext}`)) n++; target = `${base}(${n})${ext}`; }
          else if (m === "ask" && (await ctx.dialogs.message(`${dispPath(target)}\n\nAlready exists. Do you want to replace it?`, { title: "Confirm file replace", icon: "question", buttons: ["Yes", "No"], defaultButton: 1 })) !== "Yes") { pr.line(`Skipping  ${rel}`); continue; }
        }
        pr.line(`Extracting  ${rel.replace(/\//g, "\\")}`);
        if (f.dir) await mkdirs(target); else await putFile(target, f.bytes);
      }
    } catch (e) { pr.close(); return errBox(e); }
    pr.close();
  };
  const folderDialog = (title, initial) => {
    const t = buildTabs([RS.dialogs[11836], RS.dialogs[11860]], { labels: ["General", "Advanced"], uid: 2 });
    const g = t.pages[0];
    const pathBox = g.byId(101), tree = g.byId(104);
    ctl.value(pathBox, dispPath(initial));
    ctl.checked(g.byId(109), true); ctl.checked(g.byId(105), true);
    const showTree = (open) => {
      tree.replaceChildren();
      const add = (p, depth) => {
        const n = ctx.fs.get(p);
        if (!n || n.type !== "folder") return;
        const cur = normalizePath(p) === normalizePath(open);
        const row = el("div", { class: "wr-tree-row" + (cur ? " sel" : ""), style: { paddingLeft: 4 + depth * 14 + "px" } }, icon(cur ? "folderOpen" : "folder"), el("span", { text: depth === 0 ? p.slice(0, 2) : basename(p) }));
        row.addEventListener("click", () => { ctl.value(pathBox, dispPath(p)); showTree(p); });
        tree.append(row);
        const parts = normalizePath(open).toLowerCase();
        if (parts === p.toLowerCase() || parts.startsWith(p.toLowerCase().replace(/\/$/, "") + "/") || depth === 0) for (const c of ctx.fs.list(p).filter((x) => x.type === "folder")) add(c.path, depth + 1);
      };
      add("C:/", 0); add("D:/", 0);
    };
    showTree(initial);
    g.byId(102).addEventListener("click", () => showTree(normalizePath(ctl.value(pathBox).replace(/\\/g, "/"))));
    g.byId(103).addEventListener("click", async () => {
      const name = await ctx.dialogs.prompt("New folder name:", "", { title: "Create folder" });
      if (!name) return;
      const p = joinPath(normalizePath(ctl.value(pathBox).replace(/\\/g, "/")), name);
      try { await mkdirs(p); ctl.value(pathBox, dispPath(p)); showTree(p); } catch (e) { errBox(e); }
    });
    g.byId(115).addEventListener("click", () => ctx.settings.set("winrarExtract", { path: ctl.value(pathBox) }));
    return modal(title, t.root, { collect: () => {
      const radio = (ids) => ids.find((i) => ctl.checked(g.byId(i)));
      return {
        dest: normalizePath(ctl.value(pathBox).replace(/\\/g, "/")),
        update: { 109: "replace", 110: "update", 111: "fresh" }[radio([109, 110, 111])],
        overwrite: { 105: "ask", 106: "yes", 107: "skip", 108: "rename" }[radio([105, 106, 107, 108])],
        subfolder: ctl.checked(g.byId(112)), explorer: ctl.checked(g.byId(114)),
      };
    } });
  };

  // ---------- commands ----------
  const selNames = () => [...selected];
  const needArc = (what) => { if (!arc) { ctx.dialogs.message(`${what} is available only inside an archive. Open an archive first.`, { title: "WinRAR", icon: "info" }); return false; } return true; };
  const doExtract = async () => {
    if (!needArc("Extract")) return;
    const r = await folderDialog("Extraction path and options", dirname(arc.path));
    if (!r || !r.dest) return;
    const dest = r.subfolder ? joinPath(r.dest, basename(arc.path).replace(/\.[^.]*$/, "")) : r.dest;
    await extractTo(dest, selected.size ? selNames() : null, r);
    if (r.explorer) ctx.launch("explorer", { path: dest });
    render();
  };
  const doTest = async () => {
    if (!needArc("Test")) return;
    const pr = progress(`Testing ${basename(arc.path)}`);
    pr.line(`Testing archive ${basename(arc.path)}\n`);
    let bad = 0, count = 0;
    try {
      const L = await loadLibs();
      const list = await readEntries(null, (n, f) => { pr.set(n, f); pr.line(`Testing     ${n.replace(/\//g, "\\")}`.padEnd(40) + "OK"); });
      for (const f of list) {
        if (f.dir) continue;
        count++;
        const meta = arc.entries.find((e) => e.name.toLowerCase() === f.name.toLowerCase());
        if (meta && meta.crc != null && crc32(f.bytes) !== meta.crc >>> 0) bad++;
      }
    } catch (e) { bad++; }
    pr.close();
    await ctx.dialogs.message(bad ? `${basename(arc.path)}: ${bad} ${bad === 1 ? "error" : "errors"} found.` : `No errors found in ${basename(arc.path)}\n\nTested ${count} ${count === 1 ? "file" : "files"}.`, { title: "WinRAR: Diagnostic messages", icon: bad ? "error" : "info" });
  };
  const viewEntry = async (it) => {
    if (!arc || !it || it.dir) return;
    const full = (arc.inner ? arc.inner + "/" : "") + it.name;
    try {
      const [f] = await readEntries([it.name]);
      if (!f?.bytes) return;
      if (TEXT.test(extension(it.name))) return ctx.launch("notepad", { text: new TextDecoder().decode(f.bytes) });
      const tmp = joinPath("C:/Temp", it.name);
      await putFile(tmp, f.bytes);
      ctx.openFile(tmp);
    } catch (e) { errBox(e); }
  };
  const doView = () => {
    const it = items.find((i) => selected.has(i.name));
    if (!arc) { if (it && !it.dir) ctx.openFile(it.path); return; }
    viewEntry(it);
  };
  const collectFs = async (paths) => {
    const out = {};
    const walk = (p, rel) => {
      const n = ctx.fs.get(p);
      if (!n) return;
      if (n.type === "folder") { for (const c of ctx.fs.list(p)) walk(c.path, rel + "/" + c.name); if (!ctx.fs.list(p).length) out[rel + "/"] = new Uint8Array(0); }
      else out[rel] = nodeBytes(n);
    };
    for (const p of paths) walk(p, basename(p));
    return out;
  };
  const addDialog = (defName) => {
    const ids = [11528, 11562, 11542, 11582, 11628, 11606, 11654];
    const t = buildTabs(ids.map((i) => RS.dialogs[i]), { labels: ["General", "Advanced", "Options", "Files", "Backup", "Time", "Comment"], uid: 1 });
    const g = t.pages[0];
    ctl.value(g.byId(101), defName);
    ctl.options(g.byId(112), ["Store", "Fastest", "Fast", "Normal", "Good", "Best"], 3);
    ctl.options(g.byId(117), ["Add and replace files", "Add and update files", "Fresh existing files only", "Synchronize archive contents"], 0);
    ctl.options(g.byId(107), ["B", "KB", "MB", "GB"], 2);
    ctl.checked(g.byId(114), true);
    const rar = g.byId(113);
    rar.title = "RAR archives can not be created in this browser version";
    ctl.setEnabled(rar, false);
    for (const i of [109, 110, 108, 104, 116, 106, 107, 105]) ctl.setEnabled(g.byId(i), false);
    g.byId(102).addEventListener("click", async () => { const p = await ctx.dialogs.file({ mode: "save", path: dirname(normalizePath(ctl.value(g.byId(101)).replace(/\\/g, "/"))) || DOCS, name: basename(ctl.value(g.byId(101))) }); if (p) ctl.value(g.byId(101), dispPath(p)); });
    g.byId(115).addEventListener("click", () => unavailable("Compression profiles"));
    return modal("Archive name and parameters", t.root, { collect: () => ({ name: ctl.value(g.byId(101)).trim(), level: ["Store", "Fastest", "Fast", "Normal", "Good", "Best"].indexOf(ctl.value(g.byId(112))), del: ctl.checked(g.byId(111)) }) });
  };
  const doAdd = async () => {
    let paths = [], target;
    if (arc) {
      if (arc.kind !== "zip") return ctx.dialogs.message("WinRAR cannot modify RAR archives in this browser version.", { title: "WinRAR", icon: "info" });
      const picked = await pickFiles({ multiple: true });
      if (!picked.length) return;
      const L = await loadLibs();
      const files = { ...L.fflate.unzipSync(arc.data) };
      for (const f of picked) files[(arc.inner ? arc.inner + "/" : "") + f.name] = new Uint8Array(await f.arrayBuffer());
      return saveZip(arc.path, files, 6);
    }
    const sel = items.filter((i) => selected.has(i.name) && !i.drive);
    if (!sel.length) { await ctx.dialogs.message("Select files or folders to add first.", { title: "WinRAR", icon: "info" }); return; }
    paths = sel.map((i) => i.path);
    const base = sel.length === 1 ? sel[0].name.replace(/\.[^.]*$/, "") || sel[0].name : basename(cwd) || "Archive";
    const r = await addDialog(joinPath(cwd, base + ".zip").replace(/\//g, "\\"));
    if (!r || !r.name) return;
    target = normalizePath(r.name.replace(/\\/g, "/"));
    if (!/\.zip$/i.test(target)) target += ".zip";
    const files = await collectFs(paths);
    await saveZip(target, files, [0, 1, 3, 6, 8, 9][r.level]);
    if (r.del) for (const p of paths) await ctx.fs.remove(p);
    render();
  };
  const saveZip = async (target, files, level) => {
    const pr = progress(`Adding to archive ${basename(target)}`);
    pr.line(`Creating archive ${basename(target)}\n`);
    try {
      const L = await loadLibs();
      pr.set(basename(target), 0.5);
      await new Promise((r) => setTimeout(r));
      const zipped = L.fflate.zipSync(files, { level });
      await ctx.fs.writeFile(target, bytesDataUrl(zipped, "application/zip"), { mime: "application/zip", encoding: "data-url" });
      pr.set(basename(target), 1);
      if (arc && normalizePath(arc.path).toLowerCase() === normalizePath(target).toLowerCase()) await openArchive(target);
    } catch (e) { pr.close(); return errBox(e); }
    pr.close();
  };
  const doDelete = async () => {
    if (!needArc("Delete")) return;
    if (arc.kind !== "zip") return ctx.dialogs.message("WinRAR cannot modify RAR archives in this browser version.", { title: "WinRAR", icon: "info" });
    if (!selected.size) return;
    if ((await ctx.dialogs.message("Are you sure you want to delete the selected files from the archive?", { title: "Confirm delete", icon: "question", buttons: ["Yes", "No"], defaultButton: 1 })) !== "Yes") return;
    const L = await loadLibs(), files = L.fflate.unzipSync(arc.data), base = arc.inner ? arc.inner + "/" : "";
    for (const n of Object.keys(files)) {
      const rel = n.slice(base.length);
      if (!n.toLowerCase().startsWith(base.toLowerCase())) continue;
      if ([...selected].some((s) => rel.toLowerCase() === s.toLowerCase() || rel.toLowerCase().startsWith(s.toLowerCase() + "/"))) delete files[n];
    }
    selected = new Set();
    await saveZip(arc.path, files, 6);
  };
  const doFind = async () => {
    const q = await ctx.dialogs.prompt("Find files (name contains):", "", { title: "Find files" });
    if (!q) return;
    const hits = arc ? arc.entries.filter((e) => e.name.toLowerCase().includes(q.toLowerCase())).map((e) => e.name) : ctx.fs.search(q).map((n) => n.path);
    await ctx.dialogs.message(hits.length ? hits.slice(0, 30).join("\n") + (hits.length > 30 ? `\n... ${hits.length - 30} more` : "") : "No files found.", { title: "Find files", icon: "info" });
  };
  const doInfo = async () => {
    if (!arc) return ctx.dialogs.message("Open an archive to see its information.", { title: "WinRAR", icon: "info" });
    const files = arc.entries.filter((e) => !e.dir), tot = files.reduce((s, e) => s + e.size, 0), pk = files.reduce((s, e) => s + e.packed, 0);
    await ctx.dialogs.message(`${dispPath(arc.path)}\n\nArchive type: ${arc.kind.toUpperCase()}\nFiles: ${files.length}\nFolders: ${arc.entries.length - files.length}\nTotal size: ${fmtNum(tot)}\nPacked size: ${fmtNum(pk)}\nRatio: ${tot ? Math.round((pk / tot) * 100) : 0}%\nArchive size: ${fmtNum(arc.size)} bytes`, { title: `Information about ${basename(arc.path)}`, icon: "info" });
  };
  const doOpen = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: arc ? dirname(arc.path) : cwd || DOCS, title: "Select archive to open" });
    if (p) openArchive(p);
  };
  const unavailable = (what) => ctx.dialogs.message(`${what} is not available in this browser version of WinRAR.`, { title: "WinRAR", icon: "info" });
  const selectAll = () => { selected = new Set(items.map((i) => i.name)); markSel(); };
  const about = () => {
    const dlg = buildDialog(RS.dialogs[11890], { uid: 3 });
    const set = (id, t) => { const c = dlg.byId(id); if (c) c.textContent = t; };
    const bmp = dlg.byId(109); bmp.replaceChildren(el("img", { src: RB + "b104.png", alt: "" })); bmp.firstChild.style.cssText = "width:100%;height:100%;object-fit:contain;object-position:left";
    set(107, "WinRAR 4.11 (32-bit)"); set(108, "Copyright © 1993-2011 by"); set(105, ""); set(106, "");
    const big = dlg.byId(101); big.replaceChildren(el("img", { src: "/assets/icons/winrar-32x32.png", alt: "" })); big.style.cssText += ";background:none;border:0";
    dlg.byId(110).addEventListener("click", async () => { try { ctx.launch("notepad", { text: await (await fetch(RB + "License.txt")).text() }); } catch (e) { errBox(e); } });
    dlg.byId(111).addEventListener("click", () => ctx.dialogs.message("WinRAR uses the following components:\n\nunrar and fflate (browser ports)\n\nZIP archives are created in the browser.", { title: "Acknowledgments", icon: "info" }));
    dlg.byId(112).addEventListener("click", () => window.open("https://www.rarlab.com/", "_blank", "noopener,noreferrer"));
    modal("About WinRAR", dlg.root, { buttons: false, bind: ({ done }) => dlg.byId(1).addEventListener("click", () => done(null)) });
  };

  // ---------- window ----------
  const doRename = async () => {
    const it = items.find((i) => selected.has(i.name));
    if (!it) return;
    if (arc || it.drive) return ctx.dialogs.message("Files inside archives cannot be renamed in this browser version.", { title: "WinRAR", icon: "info" });
    const dlg = buildDialog(RS.dialogs[12014], { uid: 4 });
    ctl.value(dlg.byId(101), it.name); ctl.value(dlg.byId(102), it.name);
    const r = await modal("Rename", dlg.root, { buttons: false, collect: () => ctl.value(dlg.byId(102)).trim(), bind: ({ ok, done }) => { dlg.byId(1).addEventListener("click", ok); dlg.byId(2).addEventListener("click", () => done(null)); setTimeout(() => dlg.byId(102).select(), 50); } });
    if (!r || r === it.name) return;
    try { await ctx.fs.rename(it.path, joinPath(dirname(it.path), r)); render(); } catch (e) { errBox(e); }
  };
  const drives = () => ["C:", "D:"].map((d) => ({ label: d + "\\", action: () => { arc = null; cwd = d + "/"; render(); } }));
  const ACTIONS = {
    101: doOpen, 106: selectAll, 107: selectAll, 108: () => { selected = new Set(); markSel(); }, 109: () => { selected = new Set(items.filter((i) => !selected.has(i.name)).map((i) => i.name)); markSel(); },
    102: async () => { if (!arc) return; const p = await ctx.dialogs.file({ mode: "save", path: DOCS, name: basename(arc.path) }); if (p) ctx.fs.writeFile(p, bytesDataUrl(arc.data), { encoding: "data-url", mime: "application/octet-stream" }); },
    110: () => w.close(),
    120: doAdd, 130: doExtract, 131: doTest, 127: doView, 128: doDelete, 123: doRename, 124: () => { const it = items.find((i) => selected.has(i.name)); if (it && !it.dir && !arc) ctx.openFile(it.path); },
    129: doExtract, 140: doAdd, 143: doFind, 141: doInfo, 184: about,
    180: () => ctx.launch("help", { topic: "intro" }), 181: () => window.open("https://www.rarlab.com/", "_blank", "noopener,noreferrer"),
    165: () => {}, 164: () => {}, 163: () => {},
  };
  const NA = { 105: "Setting a default password", 230: "Copying files to the clipboard", 231: "Pasting files from the clipboard", 132: "Archive comments", 133: "Recovery records", 134: "Locking archives", 145: "Virus scanning", 144: "Archive conversion", 121: "Archive repair", 135: "SFX conversion", 142: "Reports", 146: "The benchmark", 150: "Favorites", 151: "Favorites", 160: "The settings dialog", 161: "Export settings", 162: "Import settings", 166: "The folder tree", 167: "The folder tree", 168: "Themes", 169: "Themes", 170: "Themes", 171: "The log", 172: "The log" };
  const convMenu = (list) => list.map((m) => {
    if (m.sep) return { separator: true };
    if (m.popup) return { label: plain(m.popup.split("\t")[0]).trim(), submenu: /Change &drive/.test(m.popup) ? drives() : convMenu(m.items) };
    const [label, sc] = m.label.split("\t");
    const act = ACTIONS[m.id] || (() => unavailable(NA[m.id] || plain(label).trim()));
    return { label: plain(label).trim(), shortcut: sc, action: act, disabled: m.id === 103 };
  });
  const menus = menuBar({
    File: () => convMenu(RS.menus["11780"][0].items).map((m) => (m.label === "Change drive" ? { ...m, submenu: drives(), disabled: false } : m)),
    Commands: () => convMenu(RS.menus["11780"][1].items),
    Tools: () => convMenu(RS.menus["11780"][2].items),
    Favorites: () => [...convMenu(RS.menus["11780"][3].items), { label: "My Documents", action: () => { arc = null; cwd = DOCS; render(); } }, { label: "Desktop", action: () => { arc = null; cwd = "C:/Documents and Settings/Administrator/Desktop"; render(); } }],
    Options: () => convMenu(RS.menus["11780"][4].items),
    Help: () => convMenu(RS.menus["11780"][5].items),
  });
  const up = el("button", { class: "wr-up", type: "button", title: "Up one level", "aria-label": "Up one level" }, el("img", { src: RB + "up.png", width: 16, height: 16, alt: "" }));
  up.addEventListener("click", goUp);
  addr.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const p = normalizePath(addr.value.replace(/\\/g, "/"));
    if (ctx.fs.exists(p) && ctx.fs.stat(p).type === "folder") { arc = null; cwd = p; render(); }
    else if (ctx.fs.exists(p) && isArchive(p)) openArchive(p);
    else errBox(new Error(`Cannot find ${addr.value}`));
  });
  const tools = el("div", { class: "wr-tools" },
    toolbtn(110, "Add", doAdd), toolbtn(114, "Extract To", doExtract), toolbtn(121, "Test", doTest), toolbtn(122, "View", doView), toolbtn(112, "Delete", doDelete),
    el("span", { class: "wr-tsep" }), toolbtn(125, "Find", doFind), toolbtn(123, "Wizard", doAdd), toolbtn(116, "Info", doInfo), toolbtn(119, "Repair", () => unavailable("Archive repair")));
  w.setContent(menus, tools, el("div", { class: "wr-addrbar" }, up, el("span", { class: "wr-addr-icon" }, el("img", { src: "/assets/icons/rarfile-16x16.png", width: 16, height: 16, alt: "" })), addr), body, status);
  body.addEventListener("keydown", (e) => {
    if (e.key === "Backspace") { e.preventDefault(); goUp(); }
    else if (e.key === "Enter") { const it = items.find((i) => selected.has(i.name)); if (it) activate(it); }
    else if (e.key === "Delete") doDelete();
    else if (e.key === "F2") doRename();
    else if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); selectAll(); }
    else if (e.altKey && e.key.toLowerCase() === "e") doExtract();
    else if (e.altKey && e.key.toLowerCase() === "t") doTest();
    else if (e.altKey && e.key.toLowerCase() === "v") doView();
    else if (e.altKey && e.key.toLowerCase() === "a") doAdd();
    else if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); doOpen(); }
  });
  rowsBox.addEventListener("pointerdown", (e) => { if (e.target === rowsBox) { selected = new Set(); markSel(); } });
  body.addEventListener("pointerdown", () => queueMicrotask(() => body.focus()));

  if (path && ctx.fs.exists(path)) {
    const n = ctx.fs.stat(path);
    if (n.type === "folder") cwd = normalizePath(path);
    else { cwd = dirname(path); await openArchive(path); }
  }
  if (!arc) render();
  return w;
}
