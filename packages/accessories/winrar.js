// WinRAR 3.20 look-alike. ZIP is read/written with fflate (MIT) and RAR is read with the unrar WebAssembly build
// (node-unrar-js, MIT/unrar licence). Both are vendored in assets/vendor/winrar. RAR archives cannot be created.
import { el, button, menuBar, icon, fileIcon, statusBar } from "../ui/index.js";
import { basename, dirname, extension, joinPath, normalizePath, pickFiles, DOCS } from "../core/index.js";

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
  const w = ctx.wm.create({ title: "WinRAR", icon: "winrar", width: 640, height: 450, x: 120, y: 70, appId: "winrar" });
  const st = Object.assign({ sortKey: "name", sortDir: 1 }, ctx.settings.get("winrar") || {});
  let cwd = DOCS; // file-manager folder, "" = drives
  let arc = null; // { path, kind, data, entries, inner }
  let items = [], selected = new Set(), last = null;

  const toolbtn = (name, label, action) => {
    const b = el("button", { class: "wr-tool", title: label, type: "button" }, el("img", { src: `/assets/ui/winrar/${name}.png`, width: 32, height: 32, alt: "", draggable: "false" }), el("span", { text: label }));
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
          c.append(it.drive ? icon("drive") : (ext === "zip" || ext === "rar") && !it.dir ? el("img", { class: "icon", src: "/assets/ui/winrar/archive16.png", width: 16, height: 16, alt: "" }) : icon(fileIcon({ name: it.name, type: it.dir ? "folder" : "file" })), el("span", { text: v }));
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
  const progress = (title, text) => {
    const bar = el("div", { class: "wr-bar" }, el("div", { class: "wr-bar-fill" }));
    const label = el("div", { class: "wr-prog-text", text }), name = el("div", { class: "wr-prog-name" });
    const pw = ctx.wm.create({ title, noIcon: true, width: 380, height: 150, dialog: true, resizable: false, minimizable: false, maximizable: false, appId: "dialog" });
    let cancelled = false;
    pw.setContent(el("div", { class: "wr-prog" }, label, name, bar, el("div", { class: "dialog-buttons" }, button("Cancel", () => { cancelled = true; }))));
    return { set: (n, f) => { name.textContent = n; bar.firstChild.style.width = Math.round(f * 100) + "%"; }, get cancelled() { return cancelled; }, close: () => pw.close() };
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
  const extractTo = async (dest, names) => {
    const pr = progress(`Extracting from ${basename(arc.path)}`, `Extracting from ${basename(arc.path)}`);
    try {
      const strip = names && arc.inner ? arc.inner + "/" : "";
      const list = await readEntries(names, (n, f) => pr.set(n, f));
      for (const f of list) {
        if (pr.cancelled) break;
        const rel = strip && f.name.toLowerCase().startsWith(strip.toLowerCase()) ? f.name.slice(strip.length) : f.name;
        const target = joinPath(dest, rel);
        if (f.dir) await mkdirs(target); else await putFile(target, f.bytes);
      }
    } catch (e) { pr.close(); return errBox(e); }
    pr.close();
  };
  const folderDialog = (title, initial) => new Promise((resolve) => {
    const d = ctx.wm.create({ title, noIcon: true, width: 420, height: 380, dialog: true, resizable: false, minimizable: false, maximizable: false, appId: "dialog" });
    const input = el("input", { type: "text", value: dispPath(initial), "aria-label": "Destination path", style: { width: "100%" } });
    const tree = el("div", { class: "wr-tree inset" });
    const showTree = (open) => {
      tree.replaceChildren();
      const add = (p, depth) => {
        const n = ctx.fs.get(p);
        if (!n || n.type !== "folder") return;
        const row = el("div", { class: "wr-tree-row" + (normalizePath(p) === normalizePath(open) ? " sel" : ""), style: { paddingLeft: 4 + depth * 14 + "px" } }, icon(normalizePath(p) === normalizePath(open) ? "folderOpen" : "folder"), el("span", { text: depth === 0 ? p.slice(0, 2) : basename(p) }));
        row.addEventListener("click", () => { input.value = dispPath(p); showTree(p); });
        tree.append(row);
        const parts = normalizePath(open).toLowerCase();
        if (parts === p.toLowerCase() || parts.startsWith(p.toLowerCase().replace(/\/$/, "") + "/") || depth === 0) {
          for (const c of ctx.fs.list(p).filter((x) => x.type === "folder")) add(c.path, depth + 1);
        }
      };
      add("C:/", 0); add("D:/", 0);
    };
    showTree(initial);
    let done = false;
    const finish = (v) => { if (done) return; done = true; d.onClose = null; d.close(); resolve(v); };
    d.setContent(el("div", { class: "wr-dlg" },
      el("div", { text: "Destination path (will be created if does not exist)" }), input,
      el("div", { class: "wr-grp" }, el("div", { text: "Update mode" }), el("label", {}, el("input", { type: "radio", name: "um", checked: true }), " Extract and replace files"), el("label", {}, el("input", { type: "radio", name: "um" }), " Extract and update files"), el("label", {}, el("input", { type: "radio", name: "um" }), " Fresh existing files only")),
      el("div", { text: "Folders" }), tree,
      el("div", { class: "dialog-buttons" }, button("OK", () => finish(normalizePath(input.value.replace(/\\/g, "/"))), { class: "default-button" }), button("Cancel", () => finish(null)), button("Help", () => ctx.launch("help", { topic: "intro" })))));
    d.onClose = () => { resolve(null); return true; };
    input.focus(); input.select();
  });

  // ---------- commands ----------
  const selNames = () => [...selected];
  const needArc = (what) => { if (!arc) { ctx.dialogs.message(`${what} is available only inside an archive. Open an archive first.`, { title: "WinRAR", icon: "info" }); return false; } return true; };
  const doExtract = async () => {
    if (!needArc("Extract")) return;
    const dest = await folderDialog("Extraction path and options", dirname(arc.path));
    if (!dest) return;
    await extractTo(dest, selected.size ? selNames() : null);
    render();
  };
  const doTest = async () => {
    if (!needArc("Test")) return;
    const pr = progress("Testing", `Testing ${basename(arc.path)}`);
    let bad = 0, count = 0;
    try {
      const L = await loadLibs();
      const list = await readEntries(null, (n, f) => pr.set(n, f));
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
  const addDialog = (defName, files, folder) => new Promise((resolve) => {
    const d = ctx.wm.create({ title: "Archive name and parameters", noIcon: true, width: 440, height: 400, dialog: true, resizable: false, minimizable: false, maximizable: false, appId: "dialog" });
    const name = el("input", { type: "text", value: defName, style: { width: "100%" }, "aria-label": "Archive name" });
    const method = el("select", {}, ...["Store", "Fastest", "Fast", "Normal", "Good", "Best"].map((m) => el("option", { text: m, selected: m === "Normal" })));
    const chk = (t, c = false, dis = false) => el("label", { class: "wr-chk" }, el("input", { type: "checkbox", checked: c, disabled: dis }), " " + t);
    const del = chk("Delete files after archiving");
    const rarR = el("input", { type: "radio", name: "fmt", disabled: true }), zipR = el("input", { type: "radio", name: "fmt", checked: true });
    let done = false;
    const finish = (v) => { if (done) return; done = true; d.onClose = null; d.close(); resolve(v); };
    d.setContent(el("div", { class: "wr-dlg" },
      el("div", { text: "Archive name" }), name,
      el("div", { class: "wr-grp" }, el("div", { text: "Archive format" }), el("label", { title: "RAR archives can not be created in this browser version" }, rarR, " RAR (read only)"), el("label", {}, zipR, " ZIP")),
      el("div", { class: "wr-grp" }, el("div", { text: "Compression method" }), method),
      el("div", { class: "wr-grp" }, el("div", { text: "Archiving options" }), del, chk("Create SFX archive", false, true), chk("Create solid archive", false, true), chk("Put authenticity verification", false, true), chk("Lock archive", false, true)),
      el("div", { class: "dialog-buttons" }, button("OK", () => finish({ name: name.value.trim(), level: ["Store", "Fastest", "Fast", "Normal", "Good", "Best"].indexOf(method.value), del: del.firstChild.checked }), { class: "default-button" }), button("Cancel", () => finish(null)), button("Help", () => ctx.launch("help", { topic: "intro" })))));
    d.onClose = () => { resolve(null); return true; };
    name.focus(); name.select();
  });
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
    const r = await addDialog(joinPath(cwd, base + ".zip").replace(/\//g, "\\"), paths, cwd);
    if (!r || !r.name) return;
    target = normalizePath(r.name.replace(/\\/g, "/"));
    if (!/\.zip$/i.test(target)) target += ".zip";
    const files = await collectFs(paths);
    await saveZip(target, files, [0, 1, 3, 6, 8, 9][r.level]);
    if (r.del) for (const p of paths) await ctx.fs.remove(p);
    render();
  };
  const saveZip = async (target, files, level) => {
    const pr = progress("Adding to archive", `Creating ${basename(target)}`);
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
  const about = () => ctx.dialogs.message("WinRAR 3.20\n32 bit version\n\nCopyright © 1993-2002 Alexander Roshal\n\nThis is a browser look-alike. It reads ZIP and RAR archives and creates ZIP archives.", { title: "About WinRAR", icon: "winrar" });

  // ---------- window ----------
  const menus = menuBar({
    File: [
      { label: "Open archive", shortcut: "Ctrl+O", action: doOpen },
      { label: "Change drive", shortcut: "Ctrl+D", action: () => { arc = null; cwd = ""; render(); } },
      { label: "Save archive copy as...", disabled: !arc, action: async () => { if (!arc) return; const p = await ctx.dialogs.file({ mode: "save", path: DOCS, name: basename(arc.path) }); if (p) ctx.fs.writeFile(p, bytesDataUrl(arc.data), { encoding: "data-url", mime: "application/octet-stream" }); } },
      { separator: true },
      { label: "Select all", shortcut: "Ctrl+A", action: selectAll },
      { label: "Invert selection", shortcut: "Ctrl+Alt+A", action: () => { selected = new Set(items.filter((i) => !selected.has(i.name)).map((i) => i.name)); markSel(); } },
      { separator: true },
      { label: "Exit", action: () => w.close() },
    ],
    Commands: [
      { label: "Add files to archive", shortcut: "Alt+A", action: doAdd },
      { label: "Extract to specified folder", shortcut: "Alt+E", action: doExtract },
      { label: "Test archived files", shortcut: "Alt+T", action: doTest },
      { label: "View file", shortcut: "Alt+V", action: doView },
      { label: "Delete files", shortcut: "Del", action: doDelete },
      { separator: true },
      { label: "Show information", shortcut: "Alt+I", action: doInfo },
      { label: "Scan archive for viruses", action: () => unavailable("Virus scanning") },
      { label: "Add archive comment", action: () => unavailable("Archive comments") },
      { label: "Protect archive from damage", action: () => unavailable("Recovery records") },
      { label: "Convert archive to SFX", action: () => unavailable("SFX conversion") },
    ],
    Tools: [
      { label: "Wizard", shortcut: "Alt+W", action: doAdd },
      { label: "Find files", shortcut: "Alt+F", action: doFind },
      { label: "Generate report", action: () => unavailable("Reports") },
      { label: "Benchmark and hardware test", action: () => unavailable("The benchmark") },
      { label: "Convert archives", action: () => unavailable("Archive conversion") },
      { label: "Repair archive", shortcut: "Alt+R", action: () => unavailable("Archive repair") },
    ],
    Favorites: [
      { label: "Add to favorites...", shortcut: "Ctrl+F", action: () => unavailable("Favorites") },
      { label: "Organize favorites...", action: () => unavailable("Favorites") },
      { separator: true },
      { label: "My Documents", action: () => { arc = null; cwd = DOCS; render(); } },
      { label: "Desktop", action: () => { arc = null; cwd = "C:/Documents and Settings/Administrator/Desktop"; render(); } },
    ],
    Options: [
      { label: "Settings...", shortcut: "Ctrl+S", action: () => unavailable("The settings dialog") },
      { label: "Import/export", action: () => unavailable("Import/export") },
      { label: "View log...", action: () => unavailable("The log") },
    ],
    Help: [
      { label: "Help topics", shortcut: "F1", action: () => ctx.launch("help", { topic: "intro" }) },
      { separator: true },
      { label: "About WinRAR...", action: about },
    ],
  });
  const up = el("button", { class: "wr-up", type: "button", title: "Up one level", "aria-label": "Up one level" }, el("img", { src: "/assets/ui/winrar/up16.png", width: 16, height: 16, alt: "" }));
  up.addEventListener("click", goUp);
  addr.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const p = normalizePath(addr.value.replace(/\\/g, "/"));
    if (ctx.fs.exists(p) && ctx.fs.stat(p).type === "folder") { arc = null; cwd = p; render(); }
    else if (ctx.fs.exists(p) && isArchive(p)) openArchive(p);
    else errBox(new Error(`Cannot find ${addr.value}`));
  });
  const tools = el("div", { class: "wr-tools" },
    toolbtn("add", "Add", doAdd), toolbtn("extract", "Extract To", doExtract), toolbtn("test", "Test", doTest), toolbtn("view", "View", doView), toolbtn("delete", "Delete", doDelete),
    el("span", { class: "wr-tsep" }), toolbtn("find", "Find", doFind), toolbtn("wizard", "Wizard", doAdd), toolbtn("info", "Info", doInfo), toolbtn("repair", "Repair", () => unavailable("Archive repair")));
  w.setContent(menus, tools, el("div", { class: "wr-addrbar" }, up, el("span", { class: "wr-addr-icon" }, el("img", { src: "/assets/ui/winrar/archive16.png", width: 16, height: 16, alt: "" })), addr), body, status);
  body.addEventListener("keydown", (e) => {
    if (e.key === "Backspace") { e.preventDefault(); goUp(); }
    else if (e.key === "Enter") { const it = items.find((i) => selected.has(i.name)); if (it) activate(it); }
    else if (e.key === "Delete") doDelete();
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
