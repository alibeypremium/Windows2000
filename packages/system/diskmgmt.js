// Disk Management (diskmgmt.msc / dmdskres.dll, dmdskmgr.dll). Templates and strings from dmdskres.dll (Windows 2000 SP4).
import { el, popup, separator } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { refWindow, btn } from "../control-panel/refkit.js";
import { DM_DIALOGS as D } from "./diskmgmt-data.js";

const A = "assets/diskmgmt/";
const n0 = (n) => Math.round(n).toLocaleString("en-US");
const DISK_MB = 4095, CD_MB = 598;
const FS = ["FAT", "FAT32", "NTFS"];
const UNITS = ["Default", "512", "1024", "2048", "4096", "8192", "16K", "32K", "64K"];
const DEFAULT_STATE = () => ({ parts: [{ kind: "primary", letter: "C", label: "", fs: "NTFS", mb: 2047, active: true, system: true, boot: true, pagefile: true }], pending: [] });

export function driveLetters(ctx) {
  // extra (user-created) drives, used by My Computer
  const st = ctx.settings.get("diskMgmt");
  if (!st) return [];
  const out = [];
  for (const p of st.parts) {
    if (p.kind === "primary" && p.letter && p.letter !== "C") out.push(p);
    if (p.kind === "extended") for (const l of p.logicals || []) if (l.letter) out.push(l);
  }
  return out.sort((a, b) => a.letter.localeCompare(b.letter));
}

export function openDiskManager(ctx) {
  const w = ctx.wm.create({ title: "Disk Management", icon: "drive", width: 720, height: 480, appId: "diskmanager" });
  const state = () => ctx.settings.get("diskMgmt") || DEFAULT_STATE();
  let st = JSON.parse(JSON.stringify(state()));
  const save = () => { ctx.settings.set("diskMgmt", JSON.parse(JSON.stringify(st))); view(); };
  let sel = null, topView = "volumes", botView = "graphical", busy = "";
  // model --------------------------------------------------------------
  const ext = () => st.parts.find((p) => p.kind === "extended");
  const allocated = () => st.parts.reduce((s, p) => s + p.mb, 0);
  const unalloc = () => DISK_MB - allocated();
  const extFree = () => (ext() ? ext().mb - (ext().logicals || []).reduce((s, l) => s + l.mb, 0) : 0);
  const usedLetters = () => new Set(["A", "D", ...st.parts.flatMap((p) => (p.kind === "extended" ? p.logicals || [] : [p])).map((p) => p.letter).filter(Boolean)]);
  const freeLetters = () => "EFGHIJKLMNOPQRSTUVWXYZ".split("").filter((c) => !usedLetters().has(c));
  const usedMb = () => 802 + Math.round(new TextEncoder().encode(JSON.stringify(ctx.fs.snapshot())).length / 1048576);
  const freeOf = (v) => (v.letter === "C" ? Math.max(64, v.mb - usedMb()) : Math.max(0, v.mb - (v.fs ? 0 : 0) - (v.used || 0)));
  const status = (v) => (busy === v ? "Formatting" : v.system ? "Healthy (System)" : v.boot ? "Healthy (Boot)" : "Healthy");
  const volumes = () => {
    const out = [];
    for (const p of st.parts) {
      if (p.kind === "primary") out.push({ ...p, ref: p, layout: "Partition" });
      else for (const l of p.logicals || []) out.push({ ...l, ref: l, layout: "Partition" });
    }
    out.push({ letter: "D", label: "", fs: "CDFS", mb: CD_MB, cd: true, ref: null, layout: "Partition", free: 0 });
    return out.sort((a, b) => a.letter.localeCompare(b.letter));
  };
  const vname = (v) => (v.label ? v.label + " " : "") + "(" + v.letter + ":)";
  // sync helpers with fs / explorer ------------------------------------
  const ensureRoot = async (letter) => { try { await ctx.fs.mkdir(letter + ":/"); } catch {} };
  const wipe = async (letter) => { for (const n of [...ctx.fs.nodes.values()]) if (n.path.toUpperCase().startsWith(letter + ":/") && n.path.length > 3) { try { await ctx.fs.remove(n.path, { permanent: true }); } catch {} } };
  // ui ----------------------------------------------------------------------
  const top = el("div", { class: "dm-top" }), bot = el("div", { class: "dm-bot" }), sbar = el("div", { class: "statusbar" });
  const regionKey = (r) => r && (r.kind + ":" + (r.letter || r.disk || ""));
  const isSel = (r) => sel && regionKey(sel) === regionKey(r);
  const regions = () => {
    const r = [];
    for (const p of st.parts) {
      if (p.kind === "primary") r.push({ ...p, ref: p, kind: "primary" });
      else { r.push({ kind: "extended-bar", ref: p, mb: p.mb, ext: p, items: [...(p.logicals || []).map((l) => ({ ...l, ref: l, kind: "logical", parent: p })), ...(extFree() > 0 ? [{ kind: "free", mb: extFree(), parent: p }] : [])] }); }
    }
    if (unalloc() > 0) r.push({ kind: "unalloc", mb: unalloc() });
    return r;
  };
  const weight = (mb) => Math.log2(mb + 4);
  const body = (r) => {
    if (r.kind === "unalloc") return ["Unallocated", n0(r.mb) + " MB"];
    if (r.kind === "free") return ["Free Space", n0(r.mb) + " MB"];
    return [(r.label ? r.label + " " : "") + "(" + r.letter + ":)", n0(r.mb) + " MB " + r.fs, status(r.ref)];
  };
  const regionEl = (r) => {
    const colors = { primary: "#000080", logical: "#5f9ea0", free: "#9fdc9f", unalloc: "#000" };
    const [a, b, c] = body(r);
    const n = el("div", { class: "dm-reg" + (isSel(r) ? " sel" : ""), style: { flex: weight(r.mb) + " 1 0" }, onclick: (e) => { e.stopPropagation(); sel = r; view(); }, oncontextmenu: (e) => { e.preventDefault(); e.stopPropagation(); sel = r; view(); menuFor(r, e.clientX, e.clientY); }, ondblclick: () => { if (r.letter) open(r); } },
      el("div", { class: "bar" + (r.kind === "free" ? " hatch" : ""), style: { background: colors[r.kind] } }), el("div", { class: "txt" }, el("b", { text: a }), el("div", { text: b }), c ? el("div", { text: c }) : null));
    return n;
  };
  const graphical = (host) => {
    const mk = (labelNodes, regs, icon) => el("div", { class: "dm-disk" }, el("div", { class: "dm-dl", onclick: () => { sel = { kind: "disk" }; view(); }, oncontextmenu: (e) => { e.preventDefault(); sel = { kind: "disk" }; view(); menuFor({ kind: "disk" }, e.clientX, e.clientY); } }, el("img", { src: A + "ico/" + icon + ".png" }), ...labelNodes), el("div", { class: "dm-regs" }, ...regs));
    const disk0 = regions().map((r) => (r.kind === "extended-bar" ? el("div", { class: "dm-ext", style: { flex: weight(r.mb) + " 1 0" }, onclick: (e) => { e.stopPropagation(); sel = { kind: "extended", ref: r.ext, mb: r.mb }; view(); }, oncontextmenu: (e) => { e.preventDefault(); e.stopPropagation(); sel = { kind: "extended", ref: r.ext, mb: r.mb }; view(); menuFor(sel, e.clientX, e.clientY); } }, el("div", { class: "bar", style: { background: "#3cb371" } }), el("div", { class: "dm-extin" }, ...r.items.map(regionEl))) : regionEl(r)));
    const cd = [regionEl({ kind: "primary", letter: "D", fs: "CDFS", mb: CD_MB, ref: { cd: true }, label: "" })];
    host.replaceChildren(
      mk([el("b", { text: "Disk 0" }), el("div", { text: "Basic" }), el("div", { text: n0(DISK_MB) + " MB" }), el("div", { text: "Online" })], disk0, "362"),
      mk([el("b", { text: "CD-ROM 0" }), el("div", { text: "CD-ROM (D:)" }), el("div", { text: "Online" })], cd, "370"),
    );
  };
  const listHost = (kind) => {
    const h = el("div", { class: "dm-list" });
    const mkTable = (cols, rows) => {
      h.append(el("div", { class: "dm-lh" }, ...cols.map(([t, wd]) => el("span", { style: { width: wd + "px" }, text: t }))));
      for (const r of rows) h.append(r);
    };
    if (kind === "volumes") {
      const cols = [["Volume", 110], ["Layout", 64], ["Type", 50], ["File System", 78], ["Status", 110], ["Capacity", 80], ["Free Space", 80], ["% Free", 52], ["Fault Tolerance", 98], ["Overhead", 62]];
      mkTable(cols, volumes().map((v) => {
        const fr = v.cd ? 0 : freeOf(v), r = { kind: v.cd ? "primary" : "primary", letter: v.letter, ref: v.ref || { cd: true }, mb: v.mb, fs: v.fs, label: v.label };
        return el("div", { class: "dm-lr" + (sel && sel.letter === v.letter ? " sel" : ""), onclick: () => { sel = { ...r, kind: v.ref && st.parts.includes(v.ref) ? "primary" : "logical" }; view(); }, oncontextmenu: (e) => { e.preventDefault(); sel = { ...r, kind: v.cd ? "primary" : v.ref && st.parts.includes(v.ref) ? "primary" : "logical" }; view(); menuFor(sel, e.clientX, e.clientY); } },
          ...[[el("span", { class: "c" }, el("i", { class: "vi" + (v.cd ? " cd" : "") }), vname(v)), 110], ["Partition", 64], ["Basic", 50], [v.fs, 78], [v.cd ? "Healthy" : status(v.ref), 110], [n0(v.mb) + " MB", 80], [n0(fr) + " MB", 80], [v.mb ? Math.round((fr / v.mb) * 100) + " %" : "0 %", 52], ["No", 98], ["0%", 62]].map(([t, wd]) => el("span", { style: { width: wd + "px" } }, t)));
      }));
    } else {
      const cols = [["Disk", 90], ["Type", 60], ["Capacity", 80], ["Unallocated Space", 120], ["Status", 70], ["Device Type", 90], ["Hardware Vendor", 120]];
      mkTable(cols, [
        ["Disk 0", "Basic", n0(DISK_MB) + " MB", n0(unalloc()) + " MB", "Online", "IDE", ""],
        ["CD-ROM 0", "CD-ROM", n0(CD_MB) + " MB", "0 MB", "Online", "IDE", ""],
      ].map((r, i) => el("div", { class: "dm-lr" + (sel && sel.kind === "disk" && i === 0 ? " sel" : ""), onclick: () => { sel = { kind: "disk" }; view(); }, oncontextmenu: (e) => { e.preventDefault(); sel = { kind: "disk" }; view(); menuFor(sel, e.clientX, e.clientY); } }, ...r.map((t, j) => el("span", { style: { width: cols[j][1] + "px" } }, j === 0 ? el("span", { class: "c" }, el("i", { class: "vi di" }), t) : t)))));
    }
    return h;
  };
  const pane = (kind) => { if (kind === "graphical") { const g = el("div", { class: "dm-graph" }); graphical(g); return g; } return listHost(kind); };
  const legend = () => el("div", { class: "dm-legend" }, ...[["#000", "Unallocated"], ["#000080", "Primary Partition"], ["#3cb371", "Extended Partition"], ["#9fdc9f", "Free Space"], ["#5f9ea0", "Logical Drive"]].map(([c, t]) => el("span", {}, el("i", { style: { background: c } }), t)));
  function view() {
    top.replaceChildren(pane(topView));
    bot.hidden = botView === "hidden";
    bot.replaceChildren(...(botView === "hidden" ? [] : [pane(botView), botView === "graphical" ? legend() : null].filter(Boolean)));
    if (botView === "graphical" && topView === "graphical") bot.replaceChildren(pane("volumes"), legend());
    sbar.textContent = "";
  }
  // actions -----------------------------------------------------------------
  const open = (r) => ctx.launch("explorer", { path: r.letter + ":/" });
  const yn = (m, t) => ctx.dialogs.message(m, { title: t, icon: "warning", buttons: ["Yes", "No"] }).then((v) => v === "Yes");
  const sysBlocked = (r) => r.letter === "C";
  const letterOf = (r) => r.letter;
  const findRef = (r) => r.ref;
  const del = async (r) => {
    if (r.kind === "extended") {
      if ((r.ref.logicals || []).length) return ctx.dialogs.message("Cannot delete the extended partition while it contains logical drives. Delete the logical drives first.", { title: "Delete Partition", icon: "warning" });
      if (await yn(`All data on the extended partition will be lost.\n\nAre you sure you want to delete the selected extended partition?`, "Delete extended partition")) { st.parts = st.parts.filter((p) => p !== r.ref); sel = null; save(); }
      return;
    }
    if (sysBlocked(r)) return ctx.dialogs.message("Cannot delete the partition that contains your Windows 2000 system files.", { title: "Delete Partition", icon: "warning" });
    const kind = r.kind === "logical" ? "logical drive" : "primary partition";
    if (!(await yn(`All data on ${r.label ? r.label + " " : ""}(${r.letter}:) will be lost.\n\nAre you sure you want to delete the selected ${kind}?`, "Delete " + kind[0].toUpperCase() + kind.slice(1)))) return;
    await wipe(r.letter);
    if (r.kind === "logical") ext().logicals = ext().logicals.filter((l) => l.letter !== r.letter);
    else st.parts = st.parts.filter((p) => p.letter !== r.letter);
    sel = null; save();
  };
  const markActive = (r) => { for (const p of st.parts) p.active = false; r.ref.active = true; save(); };
  const format = (r) => {
    if (sysBlocked(r)) return ctx.dialogs.message("Cannot format the partition that contains your Windows 2000 system files.", { title: "Format", icon: "warning" });
    if (r.ref?.cd) return;
    const d = dialogFromTemplate(ctx, D["172"], {
      title: "Format:  " + vname(r), icon: "drive",
      values: { 252: r.label || "", 247: r.fs, 248: "Default" }, combos: { 247: FS, 248: UNITS },
      on: { 1: async () => {
        const label = d.ctl[252].value, fs = d.ctl[247].value;
        d.close();
        if ((await ctx.dialogs.message("WARNING: Formatting will erase ALL data on this volume.\nTo format the volume, click OK.  To quit, click CANCEL.", { title: "Format " + r.letter + ":", icon: "warning", buttons: ["OK", "Cancel"] })) !== "OK") return;
        busy = r.ref; view();
        setTimeout(async () => { await wipe(r.letter); r.ref.label = label; r.ref.fs = fs; busy = ""; save(); }, 1500);
      }, 2: () => d.close() },
    });
  };
  const letterDlg = (r, mode, cur) => {
    const letters = [...(mode === "edit" ? [cur] : []), ...freeLetters()];
    const d = dialogFromTemplate(ctx, D["361"], {
      title: mode === "edit" ? "Edit Drive Letter or Path" : "Add New Drive Letter or Path", icon: "drive",
      labels: { 263: (mode === "edit" ? "Edit the drive letter or drive path for " : "Add a new drive letter or drive path for ") + vname(r) + "." }, values: { 266: letters[0] || "" }, combos: { 266: letters }, checked: { 1160: true }, groups: [[1160, 1104]],
      on: { 1: async () => {
        const L = d.ctl[266].value; d.close(); if (!L || L === cur) return;
        if (mode === "edit" && !(await yn("Changing the drive letter of a volume may cause programs to no longer run. Are you sure you want to change this drive letter?", "Confirm"))) return;
        r.ref.letter = L; await ensureRoot(L); sel = null; save();
      }, 2: () => d.close() },
    });
  };
  const changeLetter = (r) => {
    if (r.ref?.cd) return ctx.dialogs.message("The drive letter of a CD-ROM cannot be changed in this version.", { title: "Disk Management", icon: "warning" });
    const d = dialogFromTemplate(ctx, D["363"], {
      title: "Change Drive Letter and Paths for " + vname(r), icon: "drive",
      on: { 1090: () => letterDlg(r, "add"), 1091: () => { if (sysBlocked(r)) return ctx.dialogs.message("Cannot modify the drive letter of your system or boot volume.", { title: "Disk Management", icon: "warning" }); d.close(); letterDlg(r, "edit", r.letter); }, 1093: () => { if (sysBlocked(r)) return ctx.dialogs.message("Cannot remove the drive letter of your system or boot volume.", { title: "Disk Management", icon: "warning" }); yn("Removing the drive letter of a volume may cause programs to no longer run. Are you sure you want to remove this drive letter?", "Confirm").then((ok) => { if (ok) { d.close(); r.ref.letter = ""; sel = null; save(); } }); }, 1: () => d.close() },
    });
    const lv = d.ctl[306]?.querySelector?.(".rk-listbox");
    if (lv) lv.append(el("div", { class: "ie-fold sel", style: { paddingLeft: "4px" }, text: r.letter + ":\\" }));
  };
  const props = (r) => {
    if (r.kind === "disk") return diskProps();
    ctx.dialogs.message(`${vname(r)}\n\nType: Local Disk\nFile system: ${r.fs}\nCapacity: ${n0(r.mb)} MB\nStatus: ${status(r.ref || {})}`, { title: vname(r) + " Properties", icon: "drive" });
  };
  const diskProps = () => {
    const d = dialogFromTemplate(ctx, D["348"], { title: "Disk 0 Properties", icon: "drive", labels: { 1071: "Disk 0", 1072: "Basic", 1074: "Online", 290: n0(DISK_MB) + " MB", 1073: n0(unalloc()) + " MB", 1075: "UNKNOWN", 1078: "", 1079: "Primary Channel, Port Number: 0" }, on: { 1090: () => {} } });
    const lv = d.ctl[306]?.querySelector?.(".rk-listbox");
    if (lv) lv.replaceChildren(...volumes().filter((v) => !v.cd).map((v) => el("div", { class: "ie-fold", style: { paddingLeft: "4px" }, text: vname(v) })));
    // Disk property page lacks buttons in the template: add OK/Cancel
    const W = px(228) + 8, y = py(207) + 22 - 28;
    d.place(btn(W - 8 - 2 * 72 - 6, y, 72, 23, "OK", { def: true, onclick: () => d.close() }), btn(W - 8 - 72, y, 72, 23, "Cancel", { onclick: () => d.close() }));
  };
  const rescan = () => {
    const d = dialogFromTemplate(ctx, D["345"], { title: "Rescanning Disks", icon: "drive", iconBase: A });
    setTimeout(() => { d.close(); view(); }, 1200);
  };
  // wizard -------------------------------------------------------------
  const wizard = (kind) => {
    const maxMb = kind === "logical" ? extFree() : unalloc();
    const cfg = { kind, size: maxMb, assign: "letter", letter: freeLetters()[0], format: true, fs: "NTFS", unit: "Default", label: "New Volume", quick: false, comp: false };
    const W = px(317) + 8, WH = py(193) + 44 + 26;
    const wz = refWindow(ctx, { title: "Create Partition Wizard", icon: "drive", width: W, height: WH, appId: "dialog" });
    const page = el("div", { class: "rk-pane" }), head = el("div", { class: "rk-pane dm-wzhead" });
    Object.assign(page.style, { left: "4px", top: "22px", width: px(317) + "px", height: py(193) + "px" });
    wz.place(head, page);
    const build = (k) => (k === "extended" ? ["welcome", "type", "size", "done"] : k === "logical" ? ["welcome", "size", "assign", "format", "done"] : ["welcome", "type", "size", "assign", "format", "done"]);
    let seq = build(kind);
    let idx = 0, out = {};
    const T = { type: ["Select Partition Type", "You can specify what type of partition to create."], size: ["Specify Partition Size", "How big do you want the partition to be?"], assign: ["Assign Drive Letter or Path", "You can assign a drive letter or drive path to a partition."], format: ["Format Partition", "You can customize the formatting of the partition."] };
    const nextBtn = btn(W - 8 - 3 * 75 - 12 - 4, WH - 22 - 4 - 30 + 22 - 22, 75, 23, "Next >", { def: true, onclick: () => go(1) }), backBtn = btn(W - 8 - 3 * 75 - 12 - 4 - 75, WH - 22 - 4 - 30, 75, 23, "< Back", { onclick: () => go(-1) }), cancelBtn = btn(W - 8 - 75 - 4, WH - 22 - 4 - 30, 75, 23, "Cancel", { onclick: () => wz.close() });
    nextBtn.style.top = backBtn.style.top;
    wz.place(backBtn, nextBtn, cancelBtn);
    const host = { place: (...n) => page.append(...n.flat(Infinity).filter(Boolean)) };
    const tplFor = (k) => ({ welcome: "353", type: "355", size: "356", assign: "357", format: "358", done: "359" }[k]);
    const render = () => {
      const k = seq[idx];
      page.replaceChildren(); head.replaceChildren();
      head.style.display = seq[idx] === "welcome" || seq[idx] === "done" ? "none" : "";
      const tpl = D[tplFor(k)]; out = {};
      const welcome = k === "welcome" || k === "done";
      page.style.top = welcome ? "22px" : 22 + py(50) + "px";
      page.style.height = py(welcome ? 193 : 143) + "px";
      if (!welcome) head.append(el("div", { class: "t", text: T[k][0] }), el("div", { class: "s", text: T[k][1] }), el("img", { class: "ic", src: A + "bmp135.png" }));
      const common = { host, ox: 0, oy: 0, ctlOut: out };
      const base = {
        welcome: { },
        type: { checked: { [{ primary: 291, extended: 292, logical: 293 }[cfg.kind]]: true }, groups: [[291, 292, 293]], on: { 291: () => { cfg.kind = "primary"; desc(); }, 292: () => { cfg.kind = "extended"; desc(); }, 293: () => { cfg.kind = "logical"; desc(); } } },
        size: { values: { 1086: String(cfg.size) }, labels: { 1096: n0(maxMb) + " MB", 1098: "8 MB" } },
        assign: { checked: { [{ letter: 1034, none: 1035 }[cfg.assign]]: true }, groups: [[1034, 1104, 1035]], values: { 1099: cfg.letter || "" }, combos: { 1099: freeLetters() }, on: { 1034: () => (cfg.assign = "letter"), 1035: () => (cfg.assign = "none"), 1104: () => (cfg.assign = "letter") } },
        format: { checked: { [cfg.format ? 1034 : 1100]: true, 221: cfg.quick, 222: cfg.comp }, groups: [[1100, 1034]], values: { 201: cfg.fs, 202: cfg.unit, 187: cfg.label }, combos: { 201: FS, 202: UNITS }, on: { 1100: () => (cfg.format = false), 1034: () => (cfg.format = true), 221: () => (cfg.quick = !cfg.quick), 222: () => (cfg.comp = !cfg.comp) } },
        done: {},
      }[k];
      dialogFromTemplate(ctx, tpl, { ...common, ...base });
      if (k === "size") { out[1086].oninput = () => (cfg.size = +out[1086].value || 0); }
      if (k === "assign") { out[1099].onchange = () => (cfg.letter = out[1099].value); }
      if (k === "format") { out[201].onchange = () => (cfg.fs = out[201].value); out[202].onchange = () => (cfg.unit = out[202].value); out[187].oninput = () => (cfg.label = out[187].value); }
      if (welcome) {
        page.prepend(el("div", { class: "dm-wzside" }, el("img", { src: A + "ico/362.png" })));
        if (out[1189]) Object.assign(out[1189].style, { fontWeight: "bold", fontSize: "16px", lineHeight: "20px" });
      }
      if (k === "type") desc();
      if (k === "done") fill();
      nextBtn.textContent = k === "done" ? "Finish" : "Next >"; backBtn.disabled = idx === 0 || k === "done" && false;
      backBtn.disabled = idx === 0;
    };
    const desc = () => { seq = build(cfg.kind); const d = out[214]; if (d) d.textContent = cfg.kind === "primary" ? "A primary partition is a volume you create using free space on a basic disk. Windows 2000 and other operating systems can start from a primary partition. You can create up to four primary partitions on a basic disk, or you can make three primary partitions and an extended partition." : cfg.kind === "extended" ? "An extended partition is a portion of a basic disk that can contain logical drives. Use an extended partition if you want to have more than four volumes on your basic disk." : "A logical drive is a volume you create within an extended partition on a basic disk."; };
    const fill = () => {
      const lv = out[309]?.querySelector?.(".rk-listbox"); if (!lv) return;
      const rows = [["Partition type: ", { primary: "Primary partition", extended: "Extended partition", logical: "Logical drive" }[cfg.kind]], ["Partition size: ", n0(cfg.size) + " MB"]];
      if (cfg.kind !== "extended") {
        rows.push(["Drive letter or path: ", cfg.assign === "letter" ? cfg.letter + ":" : "None"]);
        if (cfg.format) rows.push(["File System: ", cfg.fs], ["Allocation Unit Size: ", cfg.unit], ["Volume Label: ", cfg.label], ["Quick format: ", cfg.quick ? "Yes" : "No"], ["Enable file and folder compression: ", cfg.comp ? "Yes" : "No"]);
        else rows.push(["Format: ", "Do not format"]);
      }
      lv.replaceChildren(...rows.map(([a, b]) => el("div", { class: "ie-fold", style: { paddingLeft: "4px" }, text: a + b })));
    };
    const finish = async () => {
      wz.close();
      const size = Math.min(maxMb, Math.max(8, Math.round(cfg.size)));
      if (cfg.kind === "extended") { st.parts.push({ kind: "extended", mb: size, logicals: [] }); save(); return; }
      const part = { kind: "primary", mb: size, letter: cfg.assign === "letter" ? cfg.letter : "", label: cfg.format ? cfg.label : "", fs: cfg.format ? cfg.fs : "RAW", compress: cfg.comp };
      if (cfg.kind === "logical") ext().logicals.push(part); else st.parts.push(part);
      if (part.letter) await ensureRoot(part.letter);
      if (cfg.format && !cfg.quick) { busy = part; save(); setTimeout(() => { busy = ""; view(); }, 1800); } else save();
      sel = null;
    };
    const go = (d) => {
      const k = seq[idx];
      if (d > 0) {
        if (k === "size") { const v = Math.round(+out[1086].value); if (!(v >= 8 && v <= maxMb)) return ctx.dialogs.message(`Please enter an integer between 8 and ${n0(maxMb)}.`, { title: "Create Partition Wizard", icon: "warning" }); cfg.size = v; }
        if (k === "assign" && cfg.assign === "letter") cfg.letter = out[1099].value;
        if (k === "format") { cfg.label = out[187].value; cfg.fs = out[201].value; cfg.unit = out[202].value; }
        if (k === "done") return finish();
      }
      idx = Math.max(0, Math.min(seq.length - 1, idx + d)); render();
    };
    render();
  };
  // menus -------------------------------------------------------------
  const help = () => ctx.launch("help", { topic: "diskmgmt" });
  const dis = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const menuFor = (r, x, y) => {
    let items;
    if (r.kind === "unalloc") items = [{ label: "Create Partition...", action: () => wizard(canPrimary() ? "primary" : "extended") }, separator(), { label: "Help", action: help }];
    else if (r.kind === "free") items = [{ label: "Create Logical Drive...", action: () => wizard("logical") }, separator(), { label: "Help", action: help }];
    else if (r.kind === "extended") items = [{ label: "Delete Partition...", action: () => del(r) }, separator(), { label: "Help", action: help }];
    else if (r.kind === "disk") items = [{ label: "Upgrade to Dynamic Disk...", action: () => ctx.dialogs.message("Dynamic disks are not supported in this version.", { title: "Upgrade to Dynamic Disk", icon: "warning" }) }, separator(), { label: "Properties", action: diskProps }, separator(), { label: "Help", action: help }];
    else {
      const cd = r.ref?.cd, prim = r.kind === "primary";
      items = [
        { label: "Open", action: () => open(r) }, { label: "Explore", action: () => open(r) }, separator(),
        cd ? dis("Mark Partition Active") : { label: "Mark Partition Active", disabled: !prim || !!r.ref.active, action: () => markActive(r) },
        { label: "Change Drive Letter and Path...", action: () => changeLetter(r) },
        { label: "Format...", disabled: cd, action: () => format(r) },
        separator(),
        { label: r.kind === "logical" ? "Delete Logical Drive..." : "Delete Partition...", disabled: cd, action: () => del(r) },
        separator(), { label: "Properties", action: () => props(r) }, separator(), { label: "Help", action: help },
      ];
    }
    popup(items, x, y);
  };
  const canPrimary = () => st.parts.length < 4 && !(st.parts.length === 3 && !ext() && false);
  const allTasks = () => {
    const r = sel;
    if (!r) return [dis("Create Partition..."), dis("Delete Partition..."), dis("Format...")];
    if (r.kind === "unalloc") return [{ label: "Create Partition...", action: () => wizard(canPrimary() ? "primary" : "extended") }];
    if (r.kind === "free") return [{ label: "Create Logical Drive...", action: () => wizard("logical") }];
    if (r.kind === "extended") return [{ label: "Delete Partition...", action: () => del(r) }];
    if (r.kind === "disk") return [{ label: "Properties", action: diskProps }];
    return [{ label: "Open", action: () => open(r) }, { label: "Explore", action: () => open(r) }, separator(), { label: "Change Drive Letter and Path...", action: () => changeLetter(r) }, { label: "Format...", disabled: r.ref?.cd, action: () => format(r) }, { label: "Delete Partition...", disabled: r.ref?.cd, action: () => del(r) }, { label: "Properties", action: () => props(r) }];
  };
  const radio = (label, on, fn) => ({ label, checked: on, action: fn });
  w.setMenu({
    Action: () => [
      { label: "Refresh", shortcut: "F5", action: view },
      { label: "Rescan Disks", action: rescan },
      dis("Restore Basic Disk Configuration..."),
      dis("Import Foreign Disks..."),
      separator(),
      { label: "All Tasks", submenu: allTasks() },
      separator(),
      { label: "Help", action: help },
    ],
    View: () => [
      { label: "Top", submenu: [radio("Disk List", topView === "disks", () => ((topView = "disks"), view())), radio("Volume List", topView === "volumes", () => ((topView = "volumes"), view())), radio("Graphical View", topView === "graphical", () => ((topView = "graphical"), view()))] },
      { label: "Bottom", submenu: [radio("Disk List", botView === "disks", () => ((botView = "disks"), view())), radio("Volume List", botView === "volumes", () => ((botView = "volumes"), view())), radio("Graphical View", botView === "graphical", () => ((botView = "graphical"), view())), radio("Hidden", botView === "hidden", () => ((botView = "hidden"), view()))] },
      separator(),
      { label: "Settings...", action: settings },
      dis("All Drive Paths..."),
      separator(),
      dis("Customize..."),
    ],
    Help: [{ label: "Help Topics", action: help }, separator(), { label: "About Disk Management", action: () => ctx.dialogs.message("Disk Management\r\nVersion 5.00.2195.6610\r\n\r\nDynamic disk and volume management provided to Microsoft by VERITAS Software Corporation.", { title: "About Disk Management", icon: "drive" }) }],
  });
  const settings = () => {
    ctx.dialogs.message("Display proportions: according to capacity, using logarithmic scaling.\nDisk region colors and patterns follow the Windows 2000 defaults.", { title: "View Settings", icon: "drive" });
  };
  top.addEventListener("contextmenu", (e) => { if (e.target === top) e.preventDefault(); });
  const tree = el("div", { class: "svc-tree" }, el("div", { class: "svc-node sub cur", text: "Disk Management" }));
  w.setContent(el("div", { class: "svc-root dm-root" }, tree, el("div", { class: "dm-right" }, el("div", { class: "dfg-title", text: "Disk Management" }), top, bot)), sbar);
  view();
  return w;
}
