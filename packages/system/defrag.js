// Disk Defragmenter (dfrg.msc / dfrgui.dll). Strings, dialogs and colour bitmaps from DfrgRes.dll (Windows 2000 SP4).
import { el, button, separator } from "../ui/index.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { downloadFile } from "../core/index.js";
import { DEFRAG_DIALOGS as D } from "./defrag-data.js";

const A = "assets/defrag/";
const COLS = 156, ROWS = 17, CELL = 3, N = COLS * ROWS;
// legend / map colours: bitmaps 141..146 of DfrgRes.dll
const KIND = { F: ["144", "Fragmented files"], C: ["145", "Contiguous files"], S: ["102", "System files"], D: ["142", "Directories"], P: ["143", "Page file"], R: ["141", "Reserved system space"], " ": ["146", "Free space"] };
const COLOR = { F: "#ff0000", C: "#0000ff", S: "#00ff00", D: "#ffff00", P: "#00ffff", R: "#00ff00", " ": "#ffffff" };
const n0 = (n) => Math.round(n).toLocaleString("en-US");
const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export function openDefrag(ctx) {
  const w = ctx.wm.create({ title: "Disk Defragmenter", icon: "defragApp", width: 668, height: 482, appId: "defrag" });
  const live = () => [...ctx.fs.nodes.values()].filter((n) => !n.trashed);
  const frag = ctx.settings.get("defragState") || { done: false };
  const vol = () => {
    const used = 802 + Math.round(new TextEncoder().encode(JSON.stringify(ctx.fs.snapshot())).length / 1048576);
    const cap = 2047, free = Math.max(64, cap - used);
    return { cap, used, free, pct: Math.round((free / cap) * 100) };
  };
  // model ---------------------------------------------------------------
  const files = () => live().filter((n) => n.type !== "dir" && n.path.length > 3);
  const layout = (afterDefrag) => {
    const out = new Array(N).fill(" "), v = vol(), usedCells = Math.min(N - 8, Math.round((v.used / v.cap) * N));
    let i = 0;
    for (; i < Math.round(N * 0.08); i++) out[i] = "R";
    for (let k = 0; k < 3 && i < N; k++, i++) out[i] = "S";
    for (let k = 0; k < 6; k++) out[Math.min(N - 1, i + k)] = "P";
    const fl = files().map((f) => hash(f.path));
    for (let c = 0; i < usedCells; i++, c++) {
      const h = hash("c" + c) % 100;
      out[i] = h < 6 ? "D" : h < (afterDefrag ? 6 : 20) ? (afterDefrag ? "C" : "F") : "C";
      if (!afterDefrag && fl.length && fl[c % fl.length] % 11 === 0 && h > 85) out[i] = "F";
    }
    if (!afterDefrag) { out[i + 3] = "F"; out[i + 9] = "F"; }
    return out;
  };
  const stats = (after) => {
    const v = vol(), f = files(), dirs = live().filter((n) => n.type === "dir").length;
    const totalFiles = 3120 + f.length, fragFiles = after ? 0 : 51 + f.filter((x) => hash(x.path) % 17 === 0).length;
    const excess = after ? 0 : Math.round(fragFiles * 3.2);
    return { v, totalFiles, fragFiles, excess, dirs: 230 + dirs, fragPct: after ? 0 : 4, filePct: after ? 0 : 8, avg: Math.round((v.used * 1024) / totalFiles) };
  };
  const reportText = (st) => {
    const { v } = st;
    return [
      "Volume Local Disk (C:):", `    Volume size                  = ${n0(v.cap)} MB`, "    Cluster size                 = 4 KB", `    Used space                   = ${n0(v.used)} MB`, `    Free space                   = ${n0(v.free)} MB`, `    Percent free space           = ${v.pct} %`, "",
      "Volume fragmentation", `    Total fragmentation          = ${st.fragPct} %`, `    File fragmentation           = ${st.filePct} %`, "    Free space fragmentation     = 0 %", "",
      "File fragmentation", `    Total files                  = ${n0(st.totalFiles)}`, `    Average file size            = ${n0(st.avg)} KB`, `    Total fragmented files       = ${n0(st.fragFiles)}`, `    Total excess fragments       = ${n0(st.excess)}`, `    Average fragments per file   = ${(1 + st.excess / st.totalFiles).toFixed(2)}`, "",
      "Pagefile fragmentation", "    Pagefile size                = 96 MB", "    Total fragments              = 1", "",
      "Directory fragmentation", `    Total directories            = ${n0(st.dirs)}`, "    Fragmented directories       = 0", "    Excess directory fragments   = 0", "",
      "Master File Table (MFT) fragmentation", "    Total MFT size               = 3 MB", `    MFT record count             = ${n0(st.totalFiles + st.dirs)}`, "    Percent MFT in use           = 99 %", "    Total MFT fragments          = 2", "",
    ].join("\r\n");
  };
  const fragList = (after) => (after
    ? [["C:\\$Mft", 2, "3 MB"], ["C:\\pagefile.sys", 1, "96 MB"]]
    : [["C:\\WINNT\\system32\\config\\SYSTEM", 9, "1,360 KB"], ["C:\\WINNT\\system32\\config\\software", 7, "5,184 KB"], ["C:\\WINNT\\Prefetch\\Layout.ini", 5, "26 KB"], ["C:\\WINNT\\system32\\drivers\\etc\\services", 4, "11 KB"], ...files().filter((x) => hash(x.path) % 17 === 0).slice(0, 8).map((x) => [x.path.replace(/\//g, "\\"), 2 + (hash(x.path) % 5), "—"])]
  ).sort((a, b) => b[1] - a[1]);

  // state ---------------------------------------------------------------
  let busy = null, paused = false, status = "", timer = 0, before = null, after = null, shown = null, progress = 0, hasReport = false, analysed = false, defragged = frag.done;
  const canvas = (id) => { const c = el("canvas", { width: COLS * CELL, height: ROWS * CELL, class: "dfg-map" }); c.id = id; return c; };
  const mapA = canvas("a"), mapB = canvas("b");
  const paint = (c, cells, upTo) => {
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    if (!cells) return;
    const n = Math.min(N, upTo ?? N);
    for (let i = 0; i < n; i++) {
      const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * CELL, k = cells[i];
      if (k === " ") continue;
      g.fillStyle = COLOR[k]; g.fillRect(x, y, CELL, CELL);
      if (k === "R") { g.fillStyle = "#006400"; g.fillRect(x, y, 1, 1); g.fillRect(x + 2, y + 2, 1, 1); }
    }
  };
  const vl = el("div", { class: "dfg-list" });
  const btns = {};
  const row = () => {
    const v = vol(), st = status;
    vl.replaceChildren(
      el("div", { class: "dfg-head" }, ...["Volume", "Session Status", "File System", "Capacity", "Free Space", "% Free Space"].map((t, i) => el("span", { class: "c" + i, text: t }))),
      el("div", { class: "dfg-row sel" }, el("span", { class: "c0" }, el("img", { src: "assets/icons/hard-disk-drive-16x16.png" }), "Local Disk (C:)"), el("span", { class: "c1", text: st }), el("span", { class: "c2", text: "NTFS" }), el("span", { class: "c3", text: n0(v.cap) + " MB" }), el("span", { class: "c4", text: n0(v.free) + " MB" }), el("span", { class: "c5", text: v.pct + " %" })),
    );
  };
  const sync = () => {
    row();
    btns.analyze.disabled = !!busy; btns.defrag.disabled = !!busy;
    btns.pause.disabled = !busy; btns.pause.textContent = paused ? "Resume" : "Pause"; btns.stop.disabled = !busy; btns.report.disabled = !hasReport || !!busy;
    sb.textContent = busy ? (busy === "a" ? "Analyzing..." : "Defragmenting...") : "";
  };
  // dialogs -------------------------------------------------------------
  const report = (isDefrag, then) => {
    const st = stats(defragged), tpl = isDefrag ? D["105"] : D["104"];
    const d = dialogFromTemplate(ctx, tpl, {
      title: isDefrag ? "Defragmentation Report" : "Analysis Report", icon: "defragApp", iconBase: A + "ico/",
      labels: { 1002: isDefrag ? "Defragmentation is complete for: Local Disk (C:)" : "Analysis is complete for: Local Disk (C:)\r\n" + (st.fragFiles > 0 ? "It is recommended that you defragment this volume." : "This volume does not need defragmenting.") },
      values: { 203: reportText(st) },
      on: { 2: () => d.close(), 1014: () => ctx.printText?.(reportText(st), "Defragmenter Report"), 1013: () => downloadFile("Defragmenter Report.txt", reportText(st), "text/plain"), 201: () => { d.close(); start("d"); } },
    });
    const lv = d.ctl[204]?.querySelector?.(".rk-listbox");
    if (lv) lv.replaceChildren(el("div", { class: "dfg-lvh" }, el("span", { text: "File Name" }), el("span", { text: "Fragments" }), el("span", { text: "File Size" })), ...fragList(defragged).map((r) => el("div", { class: "dfg-lvr" }, ...r.map((c) => el("span", { text: String(c) })))));
    return d;
  };
  const complete = (isDefrag) => {
    const need = stats(defragged).fragFiles > 0;
    const d = dialogFromTemplate(ctx, isDefrag ? D["102"] : D["106"], {
      title: isDefrag ? "Defragmentation Complete" : "Analysis Complete", icon: "defragApp",
      labels: { 1008: "Defragmentation is complete for:\r\nLocal Disk (C:)", 1007: "Analysis is complete for:\r\nLocal Disk (C:)\r\n\r\n" + (need ? "It is recommended that you defragment this volume." : "This volume does not need defragmenting.") },
      on: { 2: () => d.close(), 205: () => { d.close(); report(isDefrag); }, 201: () => { d.close(); start("d"); } },
    });
    return d;
  };
  // engine --------------------------------------------------------------
  const stop = (final) => { clearInterval(timer); timer = 0; busy = null; paused = false; if (final) status = final; sync(); };
  function start(kind) {
    if (busy) return;
    busy = kind === "a" ? "a" : "d"; paused = false; progress = 0; hasReport = false;
    status = kind === "a" ? "Analyzing..." : "Defragmenting...";
    const dir = defragged && kind === "d";
    before = layout(defragged);
    if (kind === "a") paint(mapB, null);
    else { after = null; paint(mapB, null); }
    paint(mapA, null);
    sync();
    timer = setInterval(() => {
      if (paused) return;
      progress += 90;
      if (kind === "a") paint(mapA, before, progress);
      else { paint(mapA, before); paint(mapB, layout(true), progress); }
      if (progress >= N) {
        const isD = kind === "d";
        if (isD) { defragged = true; ctx.settings.set("defragState", { done: true }); before = layout(true); paint(mapA, before); }
        analysed = true; hasReport = true; stop(isD ? "Defragmented" : "Analyzed");
        complete(isD);
        hasReport = true; lastWasDefrag = isD; sync();
      }
    }, 40);
  }
  let lastWasDefrag = false;
  const doStop = () => { if (busy) stop("Stopped"); };
  const doPause = () => { if (busy) { paused = !paused; sync(); } };
  const doReport = () => { if (hasReport) report(lastWasDefrag); };
  // UI ------------------------------------------------------------------
  const mk = (label, fn) => { const b = el("button", { type: "button", class: "dfg-btn", onclick: fn }, label); return b; };
  btns.analyze = mk("Analyze", () => start("a")); btns.defrag = mk("Defragment", () => start("d")); btns.pause = mk("Pause", doPause); btns.stop = mk("Stop", doStop); btns.report = mk("View Report", doReport);
  const legend = el("div", { class: "dfg-legend" }, ...["F", "C", "S", "D", "P", "R", " "].slice(0).filter((k) => ["F", "C", "S", " "].includes(k)).map((k) => el("span", { class: "dfg-leg" }, el("img", { src: A + "bmp" + KIND[k][0] + ".png" }), KIND[k][1])));
  const sb = el("div", { class: "statusbar" });
  const right = el("div", { class: "dfg-right" },
    el("div", { class: "dfg-title", text: "Disk Defragmenter" }),
    vl,
    el("div", { class: "dfg-lbl", text: "Analysis display:" }), el("div", { class: "dfg-mapbox" }, mapA),
    el("div", { class: "dfg-lbl", text: "Defragmentation display:" }), el("div", { class: "dfg-mapbox" }, mapB),
    el("div", { class: "dfg-btns" }, btns.analyze, btns.defrag, btns.pause, btns.stop, btns.report),
    legend,
  );
  const tree = el("div", { class: "svc-tree" }, el("div", { class: "svc-node sub cur", text: "Disk Defragmenter" }));
  w.setMenu({
    Action: () => [
      { label: "Analyze", disabled: !!busy, action: () => start("a") },
      { label: "Defragment", disabled: !!busy, action: () => start("d") },
      { label: paused ? "Resume" : "Pause", disabled: !busy, action: doPause },
      { label: "Stop", disabled: !busy, action: doStop },
      separator(),
      { label: "View Report", disabled: !hasReport || !!busy, action: doReport },
      separator(),
      { label: "Refresh", shortcut: "F5", action: () => { row(); } },
      separator(),
      { label: "Help", action: () => ctx.launch("help", { topic: "defrag" }) },
    ],
    View: [{ label: "Large Icons", disabled: true }, { label: "Small Icons", disabled: true }, { label: "List", disabled: true }, { label: "Detail", checked: true }, separator(), { label: "Customize...", disabled: true }],
    Help: [{ label: "Help Topics", action: () => ctx.launch("help", { topic: "defrag" }) }, separator(), { label: "About Disk Defragmenter", action: () => ctx.dialogs.message("Windows 2000 Disk Defragmenter\r\n©1999 Microsoft Corp., and Executive Software Int'l Inc.\r\nDeveloped by the makers of Diskeeper®.", { title: "About Disk Defragmenter", icon: "defragApp" }) }],
  });
  w.setContent(el("div", { class: "svc-root dfg-root" }, tree, right), sb);
  w.addCleanup?.(() => clearInterval(timer));
  paint(mapA, null); paint(mapB, null); sync();
  return w;
}
