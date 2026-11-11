// WinRAR 4.11 look-alike (menus, dialogs, toolbar bitmaps and icons come from the real WinRAR.exe resources). ZIP is read/written with fflate (MIT) and RAR is read with the unrar WebAssembly build
// (node-unrar-js, MIT/unrar licence). Both are vendored in assets/vendor/winrar. RAR archives cannot be created.
import { el, button, menuBar, icon, fileIcon, statusBar } from "../ui/index.js";
import { basename, dirname, extension, joinPath, normalizePath, pickFiles, DOCS } from "../core/index.js";
import { loadRar, buildDialog, buildTabs, openDlgWindow, ctl, plain, RAR_BASE } from "./winrar-dlg.js";
import { VENDOR, loadLibs, fmtNum, dispPath, crc32, bytesDataUrl, nodeBytes, buildRar, createUi, addToArchive, compressAndEmail, makeArchiveBytes, collectFs } from "./winrar-ops.js";

const RB = "/assets/ui/winrar/rar411/";
const V = VENDOR;

let showSec = false, upperOk = false;
const TEXT = /^(txt|log|ini|csv|json|js|html?|css|md|bat|reg|inf|cfg|xml|c|h|cpp|java|php|cmd|srt|vtt|sub|m3u|m3u8|pls|wdoc|url|lnk)$/i;
const fmtDate = (d) => {
  if (!d) return "";
  d = new Date(d);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}${showSec ? ":" + String(d.getSeconds()).padStart(2, "0") : ""}`;
};
const typeOf = (name, dir) => {
  if (dir) return "File folder";
  const e = extension(name);
  if (e === "zip") return "WinRAR ZIP archive";
  if (e === "rar") return "WinRAR archive";
  return e ? e.toUpperCase() + " File" : "File";
};
const crcHex = (n) => (n >>> 0).toString(16).toUpperCase().padStart(8, "0");

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

export async function openWinRAR(ctx, { path = null, add = null, email = false, quick = false, extract = null } = {}) {
  if (add?.length) { // shell extension: "Add to archive..." / "Add to <name>.rar" / "Compress and email"
    const o = { paths: add, dialog: !quick, format: "rar" };
    if (email) await compressAndEmail(ctx, o); else await addToArchive(ctx, o);
    return null;
  }
  const RS = await loadRar();
  const w = ctx.wm.create({ title: "WinRAR", icon: "winrar", width: 640, height: 450, x: 120, y: 70, appId: "winrar" });
  if (extract) w.el.style.display = "none";
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
      if (!arc && pref(3, 111) && !a.dir && isArchive(a.name) !== isArchive(b.name)) return isArchive(a.name) ? -1 : 1;
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
  const loadArc = async (p) => {
    const node = ctx.fs.stat(p), data = nodeBytes(node), L = await loadLibs();
    let entries, kind;
    if (/\.rar$/i.test(p) || (data[0] === 0x52 && data[1] === 0x61 && data[2] === 0x72)) {
      kind = "rar";
      const ex = await L.unrar.createExtractorFromData({ data: data.slice().buffer, wasmBinary: await (await fetch(V + "unrar.wasm")).arrayBuffer() });
      const list = ex.getFileList();
      entries = [...list.fileHeaders].map((h) => ({ name: h.name.replace(/\\/g, "/"), dir: h.flags.directory, size: h.unpSize, packed: h.packSize, crc: h.crc, mtime: h.time ? new Date(h.time).getTime() : 0, encrypted: h.flags.encrypted }));
    } else { kind = "zip"; entries = readZipDirectory(data); }
    return { path: p, kind, data, entries, inner: "", size: data.length };
  };
  const openArchive = async (p) => {
    p = normalizePath(p);
    try {
      arc = await loadArc(p);
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
  const { modal, progress } = createUi(ctx, RS);
  /** Returns [{name,dir,bytes|null}] for the requested archive entries (selection = names relative to arc.inner). */
  const readEntries = async (wanted, onProgress, test = false, A = arc) => {
    const L = await loadLibs(), out = [];
    const want = (e) => !wanted || wanted.some((n) => { const full = (A.inner ? A.inner + "/" : "") + n; return e.name.toLowerCase() === full.toLowerCase() || e.name.toLowerCase().startsWith(full.toLowerCase() + "/"); });
    if (A.kind === "zip") {
      const files = L.fflate.unzipSync(A.data, { filter: (f) => want({ name: f.name.replace(/\/$/, "").replace(/\\/g, "/") }) && !f.name.endsWith("/") });
      let i = 0; const total = Object.keys(files).length;
      for (const [name, bytes] of Object.entries(files)) { out.push({ name: name.replace(/\\/g, "/"), dir: false, bytes }); onProgress?.(name, ++i / total); await new Promise((r) => setTimeout(r)); }
      for (const e of A.entries) if (e.dir && want(e)) out.push({ name: e.name, dir: true, bytes: null });
    } else {
      const ex = await L.unrar.createExtractorFromData({ data: A.data.slice().buffer, wasmBinary: await (await fetch(V + "unrar.wasm")).arrayBuffer() });
      const names = A.entries.filter(want).map((e) => e.name);
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
  // add files to the open archive / create a new archive from the selection (ZIP or RAR)
  const rewriteArchive = async (mutate) => {
    const list = await readEntries(null);
    for (const e of arc.entries) if (e.dir && !list.some((x) => x.name.toLowerCase() === e.name.toLowerCase())) list.push({ name: e.name, dir: true, bytes: null });
    const next = mutate(list);
    const pr = progress(`Updating archive ${basename(arc.path)}`);
    pr.line(`Updating archive ${basename(arc.path)}\n`);
    try {
      await new Promise((r) => setTimeout(r));
      const bytes = await makeArchiveBytes(next, arc.kind, 6), mime = arc.kind === "rar" ? "application/x-rar-compressed" : "application/zip";
      await ctx.fs.writeFile(arc.path, bytesDataUrl(bytes, mime), { mime, encoding: "data-url" });
      pr.set("", 1);
    } catch (e) { pr.close(); return errBox(e); }
    pr.close();
    const keep = arc.inner, p = arc.path;
    await openArchive(p); arc.inner = keep; render();
  };
  const doAdd = async () => {
    if (arc) {
      const picked = await pickFiles({ multiple: true });
      if (!picked.length) return;
      const added = [];
      for (const f of picked) added.push({ name: (arc.inner ? arc.inner + "/" : "") + f.name, dir: false, bytes: new Uint8Array(await f.arrayBuffer()), mtime: f.lastModified });
      return rewriteArchive((list) => [...list.filter((e) => !added.some((a) => a.name.toLowerCase() === e.name.toLowerCase())), ...added]);
    }
    const sel = items.filter((i) => selected.has(i.name) && !i.drive);
    if (!sel.length) { await ctx.dialogs.message("Select files or folders to add first.", { title: "WinRAR", icon: "info" }); return; }
    const t = await addToArchive(ctx, { paths: sel.map((i) => i.path), folder: cwd, dialog: true, format: st.format || "rar" });
    if (t) { selected = new Set([basename(t)]); render(); }
  };
  const doDelete = async () => {
    if (!needArc("Delete")) return;
    if (!selected.size) return;
    if ((await ctx.dialogs.message("Are you sure you want to delete the selected files from the archive?", { title: "Confirm delete", icon: "question", buttons: ["Yes", "No"], defaultButton: 1 })) !== "Yes") return;
    const base = arc.inner ? arc.inner + "/" : "", sel = [...selected].map((x) => (base + x).toLowerCase());
    selected = new Set();
    await rewriteArchive((list) => list.filter((e) => { const n = e.name.toLowerCase(); return !sel.some((s) => n === s || n.startsWith(s + "/")); }));
  };
  // ---------- Find files ----------
  const maskTest = (mask) => {
    const parts = (mask || "*").split(/[;,]+/).map((x) => x.trim()).filter(Boolean);
    const res = parts.map((m) => new RegExp("^" + (/[*?]/.test(m) ? m : "*" + m + "*").replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i"));
    return (n) => res.some((r) => r.test(n));
  };
  const needle = (str, hex, matchCase) => {
    if (!str) return null;
    if (hex) { const b = (str.match(/[0-9a-f]{2}/gi) || []).map((h) => parseInt(h, 16)); return { bytes: new Uint8Array(b) }; }
    return { text: matchCase ? str : str.toLowerCase(), matchCase };
  };
  const hasNeedle = (bytes, nd) => {
    if (!nd) return true;
    if (nd.bytes) { if (!nd.bytes.length) return false; outer: for (let i = 0; i <= bytes.length - nd.bytes.length; i++) { for (let k = 0; k < nd.bytes.length; k++) if (bytes[i + k] !== nd.bytes[k]) continue outer; return true; } return false; }
    const t = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return (nd.matchCase ? t : t.toLowerCase()).includes(nd.text);
  };
  const searchResults = (title, hits) => new Promise((resolve) => {
    const dlg = buildDialog(RS.dialogs[13104], { uid: 7 });
    const list = dlg.byId(102), stat = dlg.byId(155);
    list.style.overflow = "auto"; list.style.fontSize = "12px";
    const head = el("div", { class: "wr-head" }, ...[["Name", 150], ["Path", 190], ["Size", 70], ["Modified", 100]].map(([t, w]) => el("div", { class: "wr-th", style: { width: w + "px" }, text: t })));
    const rows = el("div", { class: "wr-rows", style: { position: "static" } });
    list.append(head, rows);
    let sel = null, d = null, n = 0;
    const api = {
      add(h) {
        n++;
        const row = el("div", { class: "wr-row" }, ...[[h.name, 150], [h.where, 190], [h.size == null ? "" : fmtNum(h.size), 70], [fmtDate(h.mtime), 100]].map(([t, w], i) => el("div", { class: "wr-td" + (i === 2 ? " num" : ""), style: { width: w + "px" }, title: t, text: t })));
        row.addEventListener("pointerdown", () => { sel?.classList.remove("sel"); sel = row; row.classList.add("sel"); });
        row.addEventListener("dblclick", () => { d.close(); resolve(h); });
        rows.append(row);
        stat.textContent = `${n} ${n === 1 ? "file" : "files"} found`;
      },
      status: (t) => { stat.textContent = t; },
      get cancelled() { return cancelled; },
      done: () => { stat.textContent = n ? `${n} ${n === 1 ? "item" : "items"} found` : "No files found"; cancelBtn.textContent = "Close"; closed = true; },
    };
    let cancelled = false, closed = false;
    const cancelBtn = dlg.byId(2);
    cancelBtn.addEventListener("click", () => { cancelled = true; d.close(); resolve(null); });
    dlg.byId(111).addEventListener("click", () => { api.paused = !api.paused; dlg.byId(111).textContent = api.paused ? "Resume" : "Pause"; });
    dlg.byId(110).addEventListener("click", () => d.minimize?.());
    dlg.byId(9).addEventListener("click", () => ctx.launch("help", { topic: "intro" }));
    d = openDlgWindow(ctx, { title, content: dlg.root });
    d.onClose = () => { cancelled = true; resolve(null); return true; };
    hits(api);
  });
  const doFind = async () => {
    const t = buildDialog(RS.dialogs[13084], { uid: 8 });
    const sv = ctx.settings.get("winrarFind") || {};
    ctl.options(t.byId(101), sv.names || ["*"], 0); ctl.value(t.byId(101), sv.name || "*");
    ctl.options(t.byId(107), sv.strs || [], null); ctl.value(t.byId(107), "");
    const here = arc ? dispPath(arc.path) : dispPath(cwd || "C:/");
    ctl.options(t.byId(105), [here, "C:\\", "D:\\", dispPath(DOCS)], null); ctl.value(t.byId(105), here);
    ctl.options(t.byId(106), ["*.rar;*.zip", "*.rar", "*.zip", "*.*"], 0); ctl.value(t.byId(106), "*.rar;*.zip");
    ctl.checked(t.byId(102), true); ctl.checked(t.byId(103), true); ctl.checked(t.byId(104), !!arc);
    ctl.setEnabled(t.byId(109), false);
    const r = await modal("Find files", t.root, { buttons: false, collect: () => ({ mask: ctl.value(t.byId(101)).trim() || "*", str: ctl.value(t.byId(107)), cs: ctl.checked(t.byId(108)), hex: ctl.checked(t.byId(110)), where: ctl.value(t.byId(105)).trim(), arcTypes: ctl.value(t.byId(106)), sub: ctl.checked(t.byId(102)), inFiles: ctl.checked(t.byId(103)), inArcs: ctl.checked(t.byId(104)) }),
      bind: ({ ok, done }) => { t.byId(1).addEventListener("click", ok); t.byId(2).addEventListener("click", () => done(null)); t.byId(111).addEventListener("click", () => ctx.settings.set("winrarFind", { name: ctl.value(t.byId(101)) })); t.byId(9).addEventListener("click", () => ctx.launch("help", { topic: "intro" })); } });
    if (!r) return;
    ctx.settings.set("winrarFind", { name: r.mask, names: [r.mask, ...(sv.names || []).filter((x) => x !== r.mask)].slice(0, 8), strs: r.str ? [r.str, ...(sv.strs || []).filter((x) => x !== r.str)].slice(0, 8) : sv.strs || [] });
    const nameOk = maskTest(r.mask), arcOk = maskTest(r.arcTypes), nd = needle(r.str, r.hex, r.cs);
    const hit = await searchResults("Search results", async (api) => {
      const tick = async () => { while (api.paused && !api.cancelled) await new Promise((x) => setTimeout(x, 100)); await new Promise((x) => setTimeout(x)); };
      try {
        const inArchive = async (a, where) => {
          const names = a.entries.filter((e) => !e.dir && nameOk(basename(e.name)));
          let data = null;
          if (nd) { try { data = await readEntries(null, null, false, a); } catch { data = []; } }
          for (const e of names) {
            if (api.cancelled) return;
            if (nd) { const f = data.find((x) => x.name.toLowerCase() === e.name.toLowerCase()); if (!f?.bytes || !hasNeedle(f.bytes, nd)) continue; }
            api.add({ name: basename(e.name), where: where + "\\" + dirname("/" + e.name).slice(1).replace(/\//g, "\\"), size: e.size, mtime: e.mtime, archive: a.path, entry: e.name });
          }
        };
        if (arc && normalizePath(r.where.replace(/\\/g, "/")).toLowerCase() === normalizePath(arc.path).toLowerCase()) await inArchive(arc, dispPath(arc.path));
        else {
          const start = normalizePath(r.where.replace(/\\/g, "/"));
          let count = 0;
          const walk = async (p, depth) => {
            for (const n of ctx.fs.list(p)) {
              if (api.cancelled) return;
              if (++count % 40 === 0) { api.status("Searching " + dispPath(p)); await tick(); }
              if (n.type === "folder") { if (r.sub) await walk(n.path, depth + 1); continue; }
              if (nameOk(n.name) && (!nd || (r.inFiles && hasNeedle(nodeBytes(n), nd)))) api.add({ name: n.name, where: dispPath(p), size: n.size, mtime: n.modified, path: n.path });
              if (r.inArcs && /\.(zip|rar)$/i.test(n.name) && arcOk(n.name)) { try { await inArchive(await loadArc(n.path), dispPath(n.path)); } catch { /* damaged archive */ } }
            }
          };
          if (ctx.fs.exists(start)) await walk(start, 0);
        }
      } catch (e) { api.status("Search failed: " + (e.message || e)); return; }
      api.done();
    });
    if (!hit) return;
    if (hit.archive) { await openArchive(hit.archive); const i = hit.entry.lastIndexOf("/"); arc.inner = i < 0 ? "" : hit.entry.slice(0, i); selected = new Set([basename(hit.entry)]); render(); }
    else { arc = null; cwd = dirname(hit.path); selected = new Set([hit.name]); render(); }
  };

  // ---------- Info ----------
  const doInfo = async () => {
    const tabs = [], labels = [];
    if (arc) { tabs.push(RS.dialogs[12104]); labels.push("Archive"); }
    tabs.push(RS.dialogs[12114]); labels.push(arc ? "Folder" : "Statistics");
    const t = buildTabs(tabs, { labels, uid: 9 });
    const set = (pg, id, v) => { const c = pg.byId(id); if (c) c.textContent = v; };
    let pg = 0;
    if (arc) {
      const g = t.pages[0], files = arc.entries.filter((e) => !e.dir), tot = files.reduce((x, e) => x + e.size, 0), pk = files.reduce((x, e) => x + e.packed, 0);
      set(g, 101, basename(arc.path)); set(g, 102, arc.kind === "rar" ? "2.9" : "2.0"); set(g, 103, "Windows");
      set(g, 104, fmtNum(files.length)); set(g, 105, fmtNum(tot)); set(g, 106, fmtNum(pk)); set(g, 107, (tot ? Math.round((pk / tot) * 100) : 100) + "%");
      set(g, 108, "0"); set(g, 109, "No"); set(g, 110, arc.entries.some((e) => e.encrypted) ? "Yes" : "No");
      set(g, 112, "No"); set(g, 114, arc.kind === "rar" ? "64 KB" : "32 KB"); set(g, 116, "No"); set(g, 118, "None");
      const lv = g.byId(119); if (lv) lv.textContent = "";
      pg = 1;
    }
    const f = t.pages[pg];
    let nFiles = 0, nDirs = 0, nArcs = 0, size = 0, bytesAll = [];
    const sel = items.filter((i) => selected.has(i.name) && !i.drive), roots = sel.length ? sel : items.filter((i) => !i.drive);
    if (arc) {
      for (const e of arc.entries) if (e.dir) nDirs++; else { nFiles++; size += e.size; if (/\.(zip|rar)$/i.test(e.name)) nArcs++; }
    } else {
      const walk = (p) => { for (const n of ctx.fs.list(p)) { if (n.type === "folder") { nDirs++; walk(n.path); } else { nFiles++; size += n.size || 0; if (/\.(zip|rar)$/i.test(n.name)) nArcs++; bytesAll.push(n); } } };
      for (const r of roots) { if (r.dir) { nDirs++; walk(r.path); } else { nFiles++; size += r.size || 0; if (isArchive(r.name)) nArcs++; bytesAll.push(r.node || ctx.fs.get(r.path)); } }
    }
    set(f, 101, "Done"); set(f, 102, fmtNum(nFiles)); set(f, 103, fmtNum(nDirs)); set(f, 104, fmtNum(nArcs)); set(f, 105, fmtNum(size));
    const cl = 4096; set(f, 106, fmtNum(cl)); const real = Math.ceil(size / cl) * cl; set(f, 107, fmtNum(real)); set(f, 108, fmtNum(real - size));
    set(f, 111, "Idle"); set(f, 112, ""); set(f, 113, ""); set(f, 114, "");
    const est = async () => {
      set(f, 111, "Working"); const bar = f.byId(115)?.firstChild;
      let raw = 0, packed = 0, i = 0;
      const L = await loadLibs(), t0 = performance.now();
      for (const n of bytesAll.slice(0, 200)) {
        const b = n.content != null ? nodeBytes(n) : new Uint8Array(0); raw += b.length;
        packed += b.length ? L.fflate.deflateSync(b.length > 4_000_000 ? b.subarray(0, 4_000_000) : b, { level: 6 }).length : 0;
        if (bar) bar.style.width = Math.round((++i / Math.min(bytesAll.length, 200)) * 100) + "%";
        if (i % 5 === 0) await new Promise((x) => setTimeout(x));
      }
      set(f, 111, "Done"); set(f, 112, (raw ? Math.round((packed / raw) * 100) : 100) + "%"); set(f, 113, fmtNum(packed)); set(f, 114, Math.max(0.01, (performance.now() - t0) / 1000).toFixed(2) + " s");
    };
    f.byId(117)?.addEventListener("click", est);
    if (f.byId(118) && ctl.checked(f.byId(118))) est();
    await modal(arc ? `Information about ${basename(arc.path)}` : "Information", t.root, {});
  };

  // ---------- Settings ----------
  const PAGES = [[12450, "General"], [12478, "Compression"], [12514, "Paths"], [12538, "File list"], [12560, "Viewer"], [12586, "Security"], [12616, "Integration"]];
  const PREF_DEF = { 0: { 102: true, 103: true, 106: true, 113: true, 118: true, 119: true, 120: true }, 1: { 107: true, 108: true }, 2: { 102: true, 105: true }, 3: { 102: true, 106: true, 107: true, 111: true, 104: true }, 4: { 101: true, 106: true, 107: false }, 5: { 104: true }, 6: { 101: true, 102: true, 119: true, 121: true, 116: true, 117: true } };
  const getPrefs = () => ctx.settings.get("winrarPrefs") || {};
  const pref = (pg, id) => { const v = getPrefs()[pg]?.[id]; return v !== undefined ? v : PREF_DEF[pg]?.[id]; };
  const CTX_DEF = { 101: true, 102: true, 103: true, 106: true, 107: true, 108: true, 109: true, 112: true, 113: false, 114: false };
  const applyPrefs = () => {
    body.classList.toggle("wr-grid", !!pref(3, 103));
    tools.classList.toggle("nolabel", !pref(0, 106));
    tools.classList.toggle("large", !!pref(0, 105));
    showSec = !!pref(3, 115); upperOk = !!pref(3, 112);
    w.el.classList.toggle("wr-underline-all", !!pref(3, 109));
  };
  const pageValues = (dlg) => { const o = {}; for (const [id, [c]] of dlg.all) { if (c.input) o[id] = c.input.checked; else if (c.classList.contains("rd-edit")) o[id] = c.value; else if (c.classList.contains("rd-combo-edit")) o[id] = c.querySelector("input").value; } return o; };
  const fillPage = (dlg, pg) => { const sv = getPrefs()[pg] || {}; for (const [id, [c]] of dlg.all) { const v = sv[id] !== undefined ? sv[id] : PREF_DEF[pg]?.[id]; if (v === undefined) continue; if (c.input) c.input.checked = !!v; else if (c.classList.contains("rd-edit")) c.value = v; else if (c.classList.contains("rd-combo-edit")) c.querySelector("input").value = v; } };
  const ctxItemsDialog = async () => {
    const dlg = buildDialog(RS.dialogs[13058], { uid: 12 });
    const sv = ctx.settings.get("winrarCtx") || {};
    for (const [id, [c]] of dlg.all) if (c.input) c.input.checked = sv[id] !== undefined ? sv[id] : !!CTX_DEF[id];
    const r = await modal("Context menu items", dlg.root, { buttons: false, collect: () => { const o = {}; for (const [id, [c]] of dlg.all) if (c.input) o[id] = c.input.checked; return o; }, bind: ({ ok, done }) => { dlg.byId(1).addEventListener("click", ok); dlg.byId(2).addEventListener("click", () => done(null)); dlg.byId(9).addEventListener("click", () => ctx.launch("help", { topic: "intro" })); } });
    if (r) ctx.settings.set("winrarCtx", r);
  };
  const doSettings = async () => {
    const t = buildTabs(PAGES.map(([id]) => RS.dialogs[id]), { labels: PAGES.map((p) => p[1]), uid: 11 });
    t.pages.forEach((pg, i) => fillPage(pg, i));
    const cp = t.pages[1], ps = t.pages[2], vw = t.pages[4], gn = t.pages[0], ig = t.pages[6];
    if (!ctl.value(cp.byId(103))) ctl.value(cp.byId(103), dispPath(cwd || DOCS));
    const pickFolder = async (box) => { const p = await ctx.dialogs.file({ mode: "open", path: normalizePath(ctl.value(box).replace(/\\/g, "/")) || DOCS, title: "Select folder", foldersOnly: true }); if (p) ctl.value(box, dispPath(p)); };
    cp.byId(104).addEventListener("click", () => pickFolder(cp.byId(103))); cp.byId(106).addEventListener("click", () => pickFolder(cp.byId(105)));
    ps.byId(103).addEventListener("click", () => pickFolder(ps.byId(101))); ps.byId(106).addEventListener("click", () => pickFolder(ps.byId(104)));
    vw.byId(111).addEventListener("click", () => ctx.dialogs.message("External viewers are not available in the browser. Files open in the matching built-in program.", { title: "WinRAR", icon: "info" }));
    cp.byId(109).addEventListener("click", () => ctx.dialogs.message("Volumes are not supported in this browser version of WinRAR.", { title: "WinRAR", icon: "info" }));
    for (const i of [101, 102]) cp.byId(i).addEventListener("click", () => ctx.dialogs.message("Compression profiles are not available in this browser version of WinRAR.", { title: "WinRAR", icon: "info" }));
    gn.byId(115).addEventListener("click", () => ctx.dialogs.message("Use View > Toolbars: the toolbar shows large buttons with text. Toggle the text with \"Show buttons text\".", { title: "WinRAR", icon: "info" }));
    gn.byId(116).addEventListener("click", () => ctx.dialogs.message("The toolbar buttons are fixed in this version.", { title: "WinRAR", icon: "info" }));
    t.pages[3].byId(110)?.addEventListener("click", () => ctx.dialogs.message("The list font is fixed (MS Sans Serif 8pt) in this version.", { title: "WinRAR", icon: "info" }));
    ig.byId(122).addEventListener("click", () => { for (let i = 101; i <= 114; i++) { const c = ig.byId(i); if (c?.input) c.input.checked = true; } });
    ig.byId(123).addEventListener("click", ctxItemsDialog);
    const r = await modal("Settings", t.root, { collect: () => t.pages.map(pageValues) });
    if (!r) return;
    ctx.settings.set("winrarPrefs", Object.fromEntries(r.map((o, i) => [i, o])));
    applyPrefs(); render();
  };

  // ---------- Wizard ----------
  const doWizard = async () => {
    const state = { op: "unpack", name: "", dest: "", files: [], fast: false, del: false };
    let step = "op", d, fin = false;
    const content = el("div", { class: "rd-wizard" }), btnRow = el("div", { class: "rd-btnrow" });
    const back = button("< Back", () => go(-1)), next = button("Next >", () => go(1), { class: "default-button" }), cancel = button("Cancel", () => close()), help = button("Help", () => ctx.launch("help", { topic: "intro" }));
    btnRow.append(back, next, cancel, help);
    const close = () => { if (!fin) { fin = true; d.onClose = null; d.close(); } };
    d = openDlgWindow(ctx, { title: "Wizard", content, buttons: btnRow });
    d.onClose = () => { fin = true; return true; };
    let dlg = null;
    const bmp = (x) => { const b = x.byId(100); if (b) { b.replaceChildren(el("img", { src: "/assets/icons/winrar-32x32.png", alt: "", width: 32, height: 32 })); b.style.cssText += ";background:none;border:0;display:flex;align-items:flex-start;justify-content:center"; } };
    const flow = () => (state.op === "unpack" ? ["op", "arc", "dest"] : ["op", "arc", "files", "opts"]);
    const show = () => {
      const spec = { op: 12946, arc: 12966, dest: 12986, opts: 13008 }[step];
      if (step === "files") {
        dlg = null;
        const list = el("div", { class: "rd-wz-files" }), render2 = () => { list.replaceChildren(...state.files.map((p) => el("div", { text: dispPath(p) }))); };
        const addBtn = button("Add files...", async () => { const p = await ctx.dialogs.file({ mode: "open", path: state.files.length ? dirname(state.files[0]) : cwd || DOCS, title: "Select files to add" }); if (p && !state.files.includes(normalizePath(p))) { state.files.push(normalizePath(p)); render2(); } });
        const addFolder = button("Add folder...", async () => { const p = await ctx.dialogs.file({ mode: "open", path: cwd || DOCS, title: "Select folder to add", foldersOnly: true }); if (p && !state.files.includes(normalizePath(p))) { state.files.push(normalizePath(p)); render2(); } });
        render2();
        content.replaceChildren(el("div", { class: "rd-wz-top" }, el("img", { src: "/assets/icons/winrar-32x32.png", alt: "" }), el("p", { text: "Choose the files and folders to add to the archive, then press \"Next\"." })), list, el("div", { class: "rd-wz-btns" }, addBtn, addFolder));
      } else {
        dlg = buildDialog(RS.dialogs[spec], { uid: 20 + spec % 7 });
        bmp(dlg);
        content.replaceChildren(dlg.root);
        if (step === "op") ctl.checked(dlg.byId({ unpack: 101, create: 102, add: 103 }[state.op]), true);
        if (step === "arc") {
          const msg = { unpack: "Please enter the name of the archive to unpack, or press \"Browse\" to find it. Then press \"Next\".", create: "Please enter the name of the archive to create, or press \"Browse\" to choose a folder. Then press \"Next\".", add: "Please enter the name of the existing archive to which you want to add files, or press \"Browse\" to find it." }[state.op];
          dlg.byId(101).textContent = msg;
          ctl.value(dlg.byId(102), state.name || (state.op === "create" ? joinPath(cwd || DOCS, "Archive.rar").replace(/\//g, "\\") : arc ? dispPath(arc.path) : ""));
          dlg.byId(103).addEventListener("click", async () => { const p = await ctx.dialogs.file({ mode: state.op === "create" ? "save" : "open", path: cwd || DOCS, name: state.op === "create" ? "Archive.rar" : undefined, title: "Archive" }); if (p) ctl.value(dlg.byId(102), dispPath(p)); });
        }
        if (step === "dest") {
          ctl.value(dlg.byId(101), state.dest || dispPath(dirname(state.name) + "/" + basename(state.name).replace(/\.[^.]*$/, "")));
          dlg.byId(102).addEventListener("click", async () => { const p = await ctx.dialogs.file({ mode: "open", path: dirname(state.name), title: "Select folder", foldersOnly: true }); if (p) ctl.value(dlg.byId(101), dispPath(p)); });
        }
        if (step === "opts") {
          ctl.checked(dlg.byId(101), state.fast); ctl.checked(dlg.byId(102), state.del);
          for (const i of [103, 104, 105, 106, 107]) ctl.setEnabled(dlg.byId(i), false);
        }
      }
      const f = flow(), i = f.indexOf(step);
      back.disabled = i === 0; next.textContent = i === f.length - 1 ? "Finish" : "Next >";
    };
    const read = () => {
      if (step === "op") state.op = ctl.checked(dlg.byId(101)) ? "unpack" : ctl.checked(dlg.byId(102)) ? "create" : "add";
      else if (step === "arc") state.name = normalizePath(ctl.value(dlg.byId(102)).replace(/\\/g, "/"));
      else if (step === "dest") state.dest = normalizePath(ctl.value(dlg.byId(101)).replace(/\\/g, "/"));
      else if (step === "opts") { state.fast = ctl.checked(dlg.byId(101)); state.del = ctl.checked(dlg.byId(102)); }
    };
    const go = async (dir) => {
      read();
      const f = flow(), i = f.indexOf(step);
      if (dir > 0 && step === "arc") {
        if (!state.name || state.name === "/") return ctx.dialogs.message("Please enter the archive name.", { title: "WinRAR", icon: "info" });
        if (state.op !== "create" && !(ctx.fs.exists(state.name) && ctx.fs.stat(state.name).type === "file")) return ctx.dialogs.message(`Cannot find ${dispPath(state.name)}`, { title: "WinRAR", icon: "error" });
      }
      if (dir > 0 && step === "files" && !state.files.length) return ctx.dialogs.message("Please add at least one file or folder.", { title: "WinRAR", icon: "info" });
      if (dir > 0 && i === f.length - 1) { fin = true; d.onClose = null; await d.close(); return finish(); }
      step = f[i + dir]; show();
    };
    const finish = async () => {
      try {
        if (state.op === "unpack") {
          arc = await loadArc(state.name); selected = new Set(); await extractTo(state.dest, null, { overwrite: "yes" }); render();
          ctx.launch("explorer", { path: state.dest });
        } else if (state.op === "create") {
          const fmt = /\.zip$/i.test(state.name) ? "zip" : "rar";
          const target = await addToArchive(ctx, { paths: state.files, folder: dirname(state.name), name: basename(state.name).replace(/\.[^.]*$/, ""), format: fmt, level: state.fast ? 1 : 3, del: state.del });
          if (target) { cwd = dirname(target); arc = null; selected = new Set([basename(target)]); render(); }
        } else {
          arc = await loadArc(state.name); const base = arc.inner, kind = arc.kind;
          const added = collectFs(ctx, state.files);
          await rewriteArchive((list) => [...list.filter((e) => !added.some((a) => a.name.toLowerCase() === e.name.toLowerCase())), ...added]);
          if (state.del) for (const p of state.files) await ctx.fs.remove(p);
        }
      } catch (e) { errBox(e); }
    };
    show();
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
    129: doExtract, 140: doWizard, 143: doFind, 141: doInfo, 160: doSettings, 184: about,
    180: () => ctx.launch("help", { topic: "intro" }), 181: () => window.open("https://www.rarlab.com/", "_blank", "noopener,noreferrer"),
    165: () => {}, 164: () => {}, 163: () => {},
  };
  const NA = { 105: "Setting a default password", 230: "Copying files to the clipboard", 231: "Pasting files from the clipboard", 132: "Archive comments", 133: "Recovery records", 134: "Locking archives", 145: "Virus scanning", 144: "Archive conversion", 121: "Archive repair", 135: "SFX conversion", 142: "Reports", 146: "The benchmark", 150: "Favorites", 151: "Favorites", 161: "Export settings", 162: "Import settings", 166: "The folder tree", 167: "The folder tree", 168: "Themes", 169: "Themes", 170: "Themes", 171: "The log", 172: "The log" };
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
    el("span", { class: "wr-tsep" }), toolbtn(125, "Find", doFind), toolbtn(123, "Wizard", doWizard), toolbtn(116, "Info", doInfo), toolbtn(119, "Repair", () => unavailable("Archive repair")));
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
  applyPrefs();
  if (!path && pref(2, 105) !== false && pref(2, 104)) { const sp = normalizePath(String(pref(2, 104)).replace(/\\/g, "/")); if (ctx.fs.exists(sp) && ctx.fs.stat(sp).type === "folder") cwd = sp; }
  if (!arc) render();
  if (extract && arc) { // shell extension: "Extract files..." / "Extract Here" / "Extract to <folder>\\"
    if (extract === "dialog") { await doExtract(); w.close(); }
    else { w.el.style.display = "none"; const dest = extract === "here" ? dirname(arc.path) : joinPath(dirname(arc.path), basename(arc.path).replace(/\.[^.]*$/, "")); await extractTo(dest, null, { overwrite: "ask" }); w.close(); }
    return null;
  }
  if (!path && pref(0, 112)) setTimeout(doWizard, 50);
  return w;
}
