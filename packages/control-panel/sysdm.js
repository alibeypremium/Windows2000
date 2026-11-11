// System Properties sub-dialogs built from the Windows 2000 SP4 ISO's sysdm.cpl templates (sysdm-data.js):
// Performance Options, Virtual Memory, Environment Variables, Startup and Recovery, Hardware Profiles, profile dialogs.
import { el } from "../ui/index.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { SYSDM } from "./sysdm-data.js";

export const ENV_SYSTEM = {
  ComSpec: "%SystemRoot%\\system32\\cmd.exe", NUMBER_OF_PROCESSORS: "1", OS: "Windows_NT", Os2LibPath: "%SystemRoot%\\system32\\os2\\dll;",
  Path: "%SystemRoot%\\system32;%SystemRoot%;%SystemRoot%\\System32\\Wbem", PATHEXT: ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH",
  PROCESSOR_ARCHITECTURE: "x86", PROCESSOR_IDENTIFIER: "x86 Family 15 Model 6 Stepping 3, GenuineIntel", PROCESSOR_LEVEL: "15", PROCESSOR_REVISION: "0603",
  TEMP: "%SystemRoot%\\TEMP", TMP: "%SystemRoot%\\TEMP", windir: "%SystemRoot%",
};
export const ENV_USER = { TEMP: "%USERPROFILE%\\Local Settings\\Temp", TMP: "%USERPROFILE%\\Local Settings\\Temp" };
export const getEnv = (ctx) => ({ user: ctx.settings.get("envUser") || { ...ENV_USER }, system: ctx.settings.get("envSystem") || { ...ENV_SYSTEM } });
const RAM_MB = 512, SPACE_MB = 1624;

const msg = (ctx, t, title, icon = "info") => ctx.dialogs.message(t, { title, icon });
/** Fills a template list control with a header and rows. Returns {select(i), get selected(), refresh(rows)}. */
function listView(node, cols, rows, { onSelect, onOpen } = {}) {
  const box = node.querySelector?.(".rk-listbox") || node;
  box.style.overflow = "auto";
  let sel = -1, data = rows;
  const widths = cols.map((c) => c[1]);
  const api = {
    get selected() { return sel; },
    select(i) { sel = i; draw(); onSelect?.(i); },
    refresh(r, keep = -1) { data = r; sel = keep; draw(); },
  };
  const draw = () => {
    box.replaceChildren(
      el("div", { class: "sd-head" }, ...cols.map(([t, w], k) => el("div", { style: k === cols.length - 1 ? { flex: "1 1 auto", minWidth: w + "px" } : { width: w + "px" }, text: t }))),
      ...data.map((r, i) => {
        const row = el("div", { class: "sd-row" + (i === sel ? " sel" : "") }, ...r.map((t, k) => el("div", { style: k === cols.length - 1 ? { flex: "1 1 auto", minWidth: widths[k] + "px" } : { width: widths[k] + "px" }, title: String(t), text: t })));
        row.addEventListener("pointerdown", () => api.select(i));
        row.addEventListener("dblclick", () => onOpen?.(i));
        return row;
      }),
    );
  };
  draw();
  return api;
}
const radioState = (ctl, id) => ctl[id]?.classList.contains("checked");

// ---------- Performance Options + Virtual Memory ----------
const vmDefaults = () => ({ init: Math.round(RAM_MB * 1.5), max: Math.round(RAM_MB * 3) });
const vmTotal = (ctx) => (ctx.settings.get("vmem") || vmDefaults()).init;
export function openVirtualMemory(ctx, { onDone } = {}) {
  const ctl = {};
  let cur = { ...(ctx.settings.get("vmem") || vmDefaults()) };
  const row = () => [`C:  [Win2000]`, cur.init + " - " + cur.max];
  let list;
  const d = dialogFromTemplate(ctx, SYSDM["41"], {
    title: "Virtual Memory", appId: "control", ctlOut: ctl,
    labels: { 1161: "C:  [Win2000]", 1162: SPACE_MB + " MB", 1166: "2 MB", 1167: Math.round(RAM_MB * 1.5) + " MB", 1168: cur.init + " MB", 1175: "5 MB" },
    values: { 1163: String(cur.init), 1164: String(cur.max), 1173: String(ctx.settings.get("registryMax") || 25) },
    on: {
      1165: () => {
        const i = Number(ctl[1163].value), m = Number(ctl[1164].value);
        if (!(i >= 2 && i <= SPACE_MB)) return msg(ctx, `The initial paging file size must be between 2 MB and ${SPACE_MB} MB, and cannot exceed the amount of free space on the drive you have selected.`, "System Properties", "warning");
        if (!(m >= i && m <= SPACE_MB)) return msg(ctx, "The maximum paging file size must be at least as large as the initial size, and cannot exceed the free space on the drive.", "System Properties", "warning");
        cur = { init: i, max: m }; list.refresh([row()], 0); ctl[1168].textContent = cur.init + " MB";
      },
      1: () => {
        const changed = JSON.stringify(cur) !== JSON.stringify(ctx.settings.get("vmem") || vmDefaults());
        ctx.settings.set("vmem", cur); ctx.settings.set("registryMax", Number(ctl[1173].value) || 25);
        d.close(); onDone?.();
        if (changed) msg(ctx, "You must restart your computer before the new settings will take effect.", "System Control Panel Applet");
      },
      2: () => d.close(),
    },
  });
  // the listbox shows the header of the real dialog (labels 1140/1142 above it)
  list = listView(ctl[1160], [["", 0]], [row()]);
  ctl[1160].querySelector(".sd-head")?.remove();
  list = (() => { const box = ctl[1160].querySelector(".rk-listbox"); const draw = () => box.replaceChildren(el("div", { class: "sd-row sel" }, el("div", { style: { width: "104px" }, text: "C:  [Win2000]" }), el("div", { text: cur.init + " - " + cur.max }))); draw(); return { refresh: draw }; })();
  return d;
}
export function openPerformanceOptions(ctx) {
  const ctl = {};
  const apps = ctx.settings.get("perfOptimize") !== "services";
  const d = dialogFromTemplate(ctx, SYSDM["103"], {
    title: "Performance Options", appId: "control", ctlOut: ctl, checked: apps ? { 204: true } : { 205: true }, groups: [[204, 205]],
    labels: { 202: vmTotal(ctx) + " MB" },
    on: {
      201: () => openVirtualMemory(ctx, { onDone: () => { ctl[202].textContent = vmTotal(ctx) + " MB"; } }),
      1: () => { ctx.settings.set("perfOptimize", radioState(ctl, 205) ? "services" : "applications"); d.close(); },
      2: () => d.close(),
    },
  });
  return d;
}

// ---------- Environment Variables ----------
export function openEnvironmentVariables(ctx) {
  const ctl = {};
  const env = getEnv(ctx);
  const user = ctx.settings.get("username") || "Administrator";
  const toRows = (o) => Object.entries(o).map(([k, v]) => [k, v]);
  const lists = {};
  const editVar = (kind, existing) => {
    const dc = {};
    const title = (existing ? "Edit " : "New ") + (kind === "user" ? "User" : "System") + " Variable";
    const e = dialogFromTemplate(ctx, SYSDM["42"], {
      title, appId: "control", ctlOut: dc, values: { 101: existing?.[0] || "", 103: existing?.[1] || "" },
      on: {
        1: () => {
          const name = dc[101].value.trim();
          if (!name) return;
          const o = env[kind];
          if (existing && existing[0] !== name) delete o[existing[0]];
          o[name] = dc[103].value;
          lists[kind].refresh(toRows(o), Object.keys(o).indexOf(name));
          e.close();
        },
        2: () => e.close(),
      },
    });
    dc[101]?.focus?.();
  };
  const bind = (kind, listId, nId, eId, dId) => {
    const l = lists[kind] = listView(ctl[listId], [["Variable", 100], ["Value", 120]], toRows(env[kind]), { onOpen: () => ctl[eId].click() });
    return { [nId]: () => editVar(kind, null), [eId]: () => { const r = toRows(env[kind])[l.selected]; if (r) editVar(kind, r); }, [dId]: () => { const r = toRows(env[kind])[l.selected]; if (r) { delete env[kind][r[0]]; l.refresh(toRows(env[kind])); } } };
  };
  const on = { 1: () => { ctx.settings.set("envUser", env.user); ctx.settings.set("envSystem", env.system); d.close(); }, 2: () => d.close() };
  const d = dialogFromTemplate(ctx, SYSDM["105"], { title: "Environment Variables", appId: "control", ctlOut: ctl, labels: { 411: `User variables for ${user}` }, on });
  Object.assign(on, bind("user", 402, 412, 413, 414), bind("system", 400, 407, 408, 409));
  for (const [id, fn] of Object.entries(on)) ctl[id]?.addEventListener("click", fn);
  return d;
}

// ---------- Startup and Recovery ----------
const DUMPS = ["(None)", "Small Memory Dump (64 KB)", "Kernel Memory Dump", "Complete Memory Dump"];
export function openStartupRecovery(ctx) {
  const ctl = {};
  const s = Object.assign({ os: "Microsoft Windows 2000 Professional", list: true, secs: 30, log: true, alert: true, reboot: true, dump: DUMPS[1], file: "%SystemRoot%\\Minidump", over: true }, ctx.settings.get("startupRecovery") || {});
  const sync = () => {
    const small = ctl[610].value === DUMPS[1], none = ctl[610].value === DUMPS[0];
    ctl[611].textContent = small ? "Small Dump Directory:" : "Dump File:";
    if (small && /MEMORY\.DMP$/i.test(ctl[606].value)) ctl[606].value = "%SystemRoot%\\Minidump";
    else if (!small && !none && /Minidump$/i.test(ctl[606].value)) ctl[606].value = "%SystemRoot%\\MEMORY.DMP";
    ctl[606].disabled = none; ctl[607].classList.toggle("disabled", none || small);
  };
  const d = dialogFromTemplate(ctx, SYSDM["104"], {
    title: "Startup and Recovery", appId: "control", ctlOut: ctl,
    checked: { 303: s.list, 603: s.log, 604: s.alert, 608: s.reboot, 607: s.over },
    values: { 300: s.os, 301: String(s.secs), 610: s.dump, 606: s.file }, combos: { 300: ["Microsoft Windows 2000 Professional"], 610: DUMPS },
    labels: { 611: s.dump === DUMPS[1] ? "Small Dump Directory:" : "Dump File:" },
    on: {
      1: () => {
        const secs = Math.max(0, Math.min(999, Number(ctl[301].value) || 0));
        ctx.settings.set("startupRecovery", { os: ctl[300].value, list: !!ctl[303]?.classList.contains("checked"), secs, log: ctl[603].classList.contains("checked"), alert: ctl[604].classList.contains("checked"), reboot: ctl[608].classList.contains("checked"), dump: ctl[610].value, file: ctl[606].value, over: ctl[607].classList.contains("checked") });
        d.close();
      },
      2: () => d.close(),
    },
  });
  ctl[610]?.addEventListener("change", sync); sync();
  return d;
}

// ---------- Hardware Profiles ----------
export function openHardwareProfiles(ctx) {
  const ctl = {};
  const st = Object.assign({ list: ["Profile 1 (Current)"], wait: true, secs: 30 }, ctx.settings.get("hwProfiles") || {});
  let list;
  const names = () => st.list.map((n, i) => (i === 0 ? n.replace(/ \(Current\)$/, "") + " (Current)" : n.replace(/ \(Current\)$/, "")));
  const plain = (n) => n.replace(/ \(Current\)$/, "");
  const draw = (k) => list.refresh(names().map((n) => [n]), k);
  const sel = () => list.selected;
  const rename = (copy) => {
    const i = sel(); if (i < 0) return;
    const rc = {};
    const from = plain(st.list[i]);
    const e = dialogFromTemplate(ctx, SYSDM[copy ? "108" : "107"], {
      title: copy ? "Copy Profile" : "Rename Profile", appId: "control", ctlOut: rc, labels: { 325: from, 324: from }, values: { 326: copy ? from + " Copy" : from, 327: from + " Copy" },
      on: { 1: () => {
        const v = (rc[326] || rc[327]).value.trim();
        if (!v) return;
        if (st.list.some((n, k) => plain(n).toLowerCase() === v.toLowerCase() && !(k === i && !copy))) return msg(ctx, "That profile name is already in use.", "Hardware Profiles", "warning");
        if (copy) st.list.push(v); else st.list[i] = (i === 0 ? v + " (Current)" : v);
        e.close(); draw(copy ? st.list.length - 1 : i);
      }, 2: () => e.close() },
    });
  };
  const d = dialogFromTemplate(ctx, SYSDM["106"], {
    title: "Hardware Profiles", appId: "control", ctlOut: ctl, labels: { 323: "▲", 324: "▼" }, checked: st.wait ? { 307: true } : { 308: true }, groups: [[307, 308]], values: { 309: String(st.secs) },
    on: {
      301: () => { const i = sel(); if (i >= 0) openProfileProps(ctx, plain(st.list[i])); },
      302: () => rename(true), 303: () => rename(false),
      304: async () => {
        const i = sel(); if (i < 0) return;
        if (i === 0) return msg(ctx, "You cannot delete the current hardware profile.", "Hardware Profiles", "warning");
        if (await ctx.dialogs.confirm(`Are you sure you want to delete the hardware profile "${plain(st.list[i])}"?`, "Confirm Profile Delete")) { st.list.splice(i, 1); draw(0); }
      },
      323: () => { const i = sel(); if (i > 0) { [st.list[i - 1], st.list[i]] = [st.list[i], st.list[i - 1]]; draw(i - 1); } },
      324: () => { const i = sel(); if (i >= 0 && i < st.list.length - 1) { [st.list[i + 1], st.list[i]] = [st.list[i], st.list[i + 1]]; draw(i + 1); } },
      1: () => { st.wait = radioState(ctl, 307); st.secs = Math.max(0, Number(ctl[309].value) || 30); ctx.settings.set("hwProfiles", st); d.close(); },
      2: () => d.close(),
    },
  });
  list = listView(ctl[300], [["", 400]], []);
  ctl[300].querySelector(".sd-head")?.remove();
  list.refresh(names().map((n) => [n]), 0);
  ctl[300].querySelector(".sd-head")?.remove();
  const origDraw = draw;
  return d;
}
function openProfileProps(ctx, name) {
  const rc = {};
  const s = ctx.settings.get("hwProfileProps") || {};
  const d = dialogFromTemplate(ctx, SYSDM["109"], {
    title: name + " Properties", appId: "control", ctlOut: rc, labels: { 322: name, 313: "", 315: "", 314: "", 316: "" }, checked: { 317: s.portable ?? false, 320: false, 318: true, 319: true }, groups: [[319, 320, 321]],
    on: { 1: () => d.close(), 2: () => d.close() },
  });
  return d;
}

// ---------- User Profiles (tab buttons) ----------
export function openChangeProfileType(ctx, userName) {
  const rc = {};
  const local = ctx.settings.get("profileType") !== "roaming";
  const d = dialogFromTemplate(ctx, SYSDM["110"], {
    title: "Change Profile Type", appId: "control", ctlOut: rc, checked: local ? { 1020: true } : { 1021: true }, groups: [[1021, 1020]],
    labels: { 1024: `When ${userName} logs onto this computer, should the operating system use the roaming profile or just the locally cached copy of the roaming profile.` },
    on: { 1: () => { ctx.settings.set("profileType", radioState(rc, 1021) ? "roaming" : "local"); d.close(); }, 2: () => d.close() },
  });
  return d;
}
export function openCopyProfile(ctx, userName) {
  const rc = {};
  const src = "C:/Documents and Settings/" + userName;
  const d = dialogFromTemplate(ctx, SYSDM["111"], {
    title: "Copy To", appId: "control", ctlOut: rc, values: { 1030: "" }, labels: { 1032: "Everyone" },
    on: {
      1031: async () => { const p = await ctx.dialogs.file({ mode: "open", path: "C:/", title: "Select a directory to place the profile in:", foldersOnly: true }); if (p) rc[1030].value = p.replace(/\//g, "\\"); },
      1033: () => msg(ctx, "Selecting users is not available in this virtual desktop. The copy is permitted to Everyone.", "Select User or Group"),
      1: async () => {
        const dest = rc[1030].value.trim().replace(/\\/g, "/");
        if (!dest) return;
        try {
          if (!ctx.fs.exists(dest)) await ctx.fs.mkdir(dest);
          if (ctx.fs.exists(src)) await ctx.fs.move(src, dest + "/" + ctx.fs.uniqueName(dest, userName), { copy: true });
          d.close();
        } catch (e) { msg(ctx, "Profile Error\n\n" + (e.message || e), "Copy To", "error"); }
      },
      2: () => d.close(),
    },
  });
  return d;
}
