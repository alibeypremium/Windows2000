// Disk Cleanup (cleanmgr.exe). Dialog layouts and texts come from the Windows 2000 SP4 ISO's cleanmgr.exe (cleanmgr-data.js).
// The cleaning handlers (Temporary files, Recycle Bin, ...) act on the virtual file system.
import { el } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { refWindow, tabControl, btn } from "../control-panel/refkit.js";
import { CLEANMGR as D } from "./cleanmgr-data.js";

const MB = (n) => (n / 1048576).toFixed(2) + " MB";
const bytesOf = (n) => (n.type === "folder" ? 0 : n.size ?? (n.content ? String(n.content).length : 0));
const tree = (ctx, path) => { const out = []; const walk = (p) => { for (const n of ctx.fs.list(p)) { if (n.type === "folder") walk(n.path); else out.push(n); } }; if (ctx.fs.get(path)?.type === "folder") walk(path); return out; };

/** Cleaning handlers: [{ id, name, desc, files() , run(), open() }] */
const handlers = (ctx) => [
  { id: "dpf", name: "Downloaded Program Files", desc: "Downloaded Program Files are ActiveX controls and Java applets downloaded automatically from the Internet when you view certain pages. They are temporarily stored in the Downloaded Program Files folder on your hard disk.", path: "C:/WINNT/Downloaded Program Files", on: true },
  { id: "tif", name: "Temporary Internet Files", desc: "The Temporary Internet Files folder contains Web pages stored on your hard disk for quick viewing. Your personalized settings for Web pages will be left intact.", path: "C:/Documents and Settings/Administrator/Local Settings/Temporary Internet Files", on: true },
  { id: "bin", name: "Recycle Bin", desc: "The Recycle Bin contains files you have deleted from your computer. These files are not permanently removed until you empty the Recycle Bin.", on: false, special: "bin" },
  { id: "tmp", name: "Temporary files", desc: "Programs sometimes store temporary information in a TEMP folder. Before a program exits, it usually deletes this information. You can safely delete temporary files that have not been modified in over a week.", path: "C:/Temp", on: false },
  { id: "cmp", name: "Compress old files", desc: "Windows can compress files that you have not used in a while. Compressing files does not delete them, and you will still be able to use them.", on: false, special: "compress" },
  { id: "idx", name: "Catalog files for the Content Indexer", desc: "The Indexing Service speeds up and enhances file searches by maintaining an index of the files on the disk. These files remain from a previous indexing and can safely be deleted.", path: "C:/catalog.wci", on: false },
].map((h) => ({
  ...h,
  files: () => (h.special === "bin" ? ctx.fs.recycled().flatMap((r) => (r.type === "folder" ? tree(ctx, r.path).concat([r]) : [r])) : h.special === "compress" ? [] : h.path ? tree(ctx, h.path) : []),
  size() { return h.special === "bin" ? ctx.fs.recycled().reduce((s, r) => s + (r.type === "folder" ? tree(ctx, r.path).reduce((a, n) => a + bytesOf(n), 0) : bytesOf(r)), 0) : this.files().reduce((s, n) => s + bytesOf(n), 0); },
  async run() {
    if (h.special === "bin") return ctx.fs.emptyRecycleBin();
    if (h.special === "compress" || !h.path) return;
    for (const n of ctx.fs.list(h.path)) await ctx.fs.remove(n.path, { permanent: true });
  },
  open() { if (h.special === "bin") ctx.launch("explorer", { path: "recycle" }); else if (h.path && ctx.fs.exists(h.path)) ctx.launch("explorer", { path: h.path }); },
}));

const progressBar = (x, y, w, h) => {
  const fill = el("i");
  const node = el("div", { class: "cm-prog", style: { left: x + "px", top: y + "px", width: w + "px", height: h + "px" } }, fill);
  return { node, set: (f) => (fill.style.width = Math.round(f * 100) + "%") };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function runningDialog(ctx, tplId, { statusId, title }) {
  const ctl = {};
  const d = dialogFromTemplate(ctx, D[tplId], { title, icon: "drive", appId: "dialog", ctlOut: ctl, labels: statusId ? {} : {}, on: {} });
  const prog = progressBar(px(7) + 4, py(tplId === 109 ? 48 : 48) + 22, px(151), py(7));
  d.place(prog.node);
  return { d, ctl, prog, cancelled: () => !d.el.isConnected };
}

async function selectDrive(ctx) {
  return new Promise((resolve) => {
    const ctl = {};
    let done = false;
    const fin = (v) => { if (done) return; done = true; d.close(); resolve(v); };
    const d = dialogFromTemplate(ctx, D["116"], { title: "Select Drive", icon: "drive", appId: "dialog", ctlOut: ctl, values: { 999: "Win2000 (C:)" }, combos: { 999: ["Win2000 (C:)"] }, on: { 1: () => fin("C"), 2: () => fin(null) } });
    d.onClose = () => { if (!done) { done = true; resolve(null); } return true; };
  });
}

export async function openDiskCleanup(ctx, { drive = null } = {}) {
  drive ||= await selectDrive(ctx);
  if (!drive) return null;
  const letter = drive[0].toUpperCase();
  const hs = handlers(ctx);
  // 1. calculating
  const calc = runningDialog(ctx, "102", { title: "Disk Cleanup" });
  calc.ctl[1005].textContent = `Disk Cleanup is calculating how much space you can free on Drive ${letter}.`;
  for (let i = 0; i < hs.length; i++) { calc.ctl[1012].textContent = hs[i].name; calc.prog.set((i + 1) / hs.length); await wait(220); if (calc.cancelled()) return null; }
  calc.d.close();
  const sizes = hs.map((h) => h.size());
  const checked = hs.map((h) => !!h.on);
  // 2. main sheet
  const t1 = D["101"], t2 = D["110"];
  const pw = px(t1.cx) + 8, ph = py(t1.cy) + 8;
  const FX = 4, FY = 22, PX = FX + 8, W = pw + PX * 2, top = FY + 8, PY = top + 21, H = PY + ph + 10 + 23 + 14;
  const w = refWindow(ctx, { title: `Disk Cleanup for Win2000 (${letter}:)`, icon: "drive", width: W, height: H, appId: "diskcleanup" });
  const nodes = (tpl, opts) => { const out = []; const ctl = {}; dialogFromTemplate(ctx, tpl, { ...opts, ctlOut: ctl, host: { place: (...n) => out.push(...n.flat(Infinity)), el: null }, ox: PX, oy: PY }); return { out, ctl }; };
  let sel = 0, first;
  const refresh = () => {
    const total = hs.reduce((s, h, i) => s + (checked[i] ? sizes[i] : 0), 0);
    first.ctl[1026].textContent = MB(total);
    first.ctl[1001].textContent = `You can use Disk Cleanup to free up to ${MB(sizes.reduce((a, b) => a + b, 0))} of disk space on drive ${letter}.`;
    first.ctl[1003].textContent = hs[sel].desc;
    first.ctl[1002].disabled = !(hs[sel].special === "bin" || hs[sel].path);
    first.ctl[1002].classList.toggle("disabled", first.ctl[1002].disabled);
  };
  const drawList = () => {
    const box = first.ctl[1000].querySelector(".rk-listbox");
    box.replaceChildren(...hs.map((h, i) => {
      const cb = el("input", { type: "checkbox", checked: checked[i] });
      cb.addEventListener("change", () => { checked[i] = cb.checked; refresh(); });
      const row = el("div", { class: "cm-row" + (i === sel ? " sel" : "") }, cb, el("span", { class: "cm-name", text: h.name }), el("span", { class: "cm-size", text: MB(sizes[i]) }));
      row.addEventListener("pointerdown", () => { sel = i; drawList(); refresh(); });
      return row;
    }));
  };
  first = nodes(t1, { values: {}, on: { 1002: () => hs[sel].open() } });
  const second = nodes(t2, { on: { 1019: () => ctx.launch("control", { page: "programs" }), 1025: () => ctx.launch("control", { page: "programs" }) } });
  const tabs = [{ label: "Disk Cleanup", x: PX, w: 76, content: () => first.out }, { label: "More Options", x: PX + 76, w: 76, content: () => second.out }];
  w.place(tabControl({ top, pane: [PX, PY, pw, ph], tabs }));
  drawList(); refresh();
  const by = PY + ph + 10;
  const close = () => w.close();
  w.place(
    btn(W - PX - 3 * 75 + 0 - 6 + 0 - 0, by, 75, 23, "OK", { def: true, onclick: async () => {
      const total = hs.reduce((s, h, i) => s + (checked[i] ? sizes[i] : 0), 0);
      if (!checked.some(Boolean)) return close();
      const yes = await ctx.dialogs.message("Are you sure you want to delete files ?", { title: "Disk Cleanup", icon: "question", buttons: ["Yes", "No"] });
      if (yes !== "Yes") return;
      close();
      const run = runningDialog(ctx, "106", { title: "Disk Cleanup" });
      run.ctl[1008].textContent = `Cleaning up drive ${letter}:`;
      const todo = hs.filter((h, i) => checked[i]);
      for (let i = 0; i < todo.length; i++) { run.ctl[1011].textContent = todo[i].name; await todo[i].run(); run.prog.set((i + 1) / todo.length); await wait(300); if (run.cancelled()) return; }
      await wait(250); run.d.close();
      ctx.bus?.emit?.("settings:change", { key: "diskcleanup" });
    } }),
    btn(W - PX - 2 * 75 - 6 + 0, by, 75, 23, "Cancel", { onclick: close }),
  );
  return w;
}
