// Outlook Express dialogs built from the msoeres.dll templates.
import { el } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { refWindow, btn } from "../control-panel/refkit.js";
import { OE_DIALOGS as D } from "./oe-data.js";

const FX = 4, FY = 22;
const hostOf = () => { const out = []; return { out, host: { place: (...n) => out.push(...n.flat(Infinity)), el: null } }; };

export function oeAbout(ctx) {
  const d = dialogFromTemplate(ctx, D[1], { icon: "oe", title: "About Outlook Express", values: {}, labels: { 102: "Version 5.50.4807.1700" }, on: { 1: () => d.close() } });
  return d;
}

export function oeNewFolder(ctx, onOk) {
  const d = dialogFromTemplate(ctx, D[45], { title: "New Folder", icon: "oe", on: { 1: () => { const v = d.ctl[101].value.trim(); d.close(); if (v) onOk(v); }, 2: () => d.close() } });
  d.ctl[101]?.focus();
  return d;
}

export function oeFind(ctx, search) {
  const d = dialogFromTemplate(ctx, D[88], {
    title: "Find Message", icon: "oe", values: { 1021: "Inbox" },
    on: {
      1010: () => search({ from: d.ctl[1024].value, to: d.ctl[1025].value, subject: d.ctl[1026].value, body: d.ctl[1027].value, folder: d.ctl[1021].value }),
      1032: () => {}, 1033: () => ["1024", "1025", "1026", "1027"].forEach((k) => (d.ctl[k].value = "")),
    },
  });
  return d;
}

export function oeLayout(ctx, state, apply) {
  const tpl = D[152];
  const W = px(tpl.cx) + FX * 2 + 8, H = py(tpl.cy) + FY + 4 + 46;
  const w = refWindow(ctx, { title: "Window Layout Properties", icon: "oe", width: W, height: H, appId: "dialog" });
  const checked = {};
  for (const [id, k] of Object.entries({ 120: "contacts", 103: "folderBar", 102: "folderList", 119: "outlookBar", 116: "statusBar", 118: "toolbar", 121: "viewsBar", 117: "infoPane", 104: "preview", 107: "pvHeader" })) checked[id] = !!state[k];
  checked[state.pvSide ? 106 : 105] = true;
  const on = {};
  for (const [id, k] of Object.entries({ 120: "contacts", 103: "folderBar", 102: "folderList", 119: "outlookBar", 116: "statusBar", 118: "toolbar", 121: "viewsBar", 117: "infoPane", 104: "preview", 107: "pvHeader" })) on[id] = () => (state[k] = !state[k]);
  on[105] = () => (state.pvSide = false); on[106] = () => (state.pvSide = true);
  dialogFromTemplate(ctx, tpl, { host: w, ox: FX + 4, oy: FY + 4, checked, on, groups: [[105, 106]] });
  const by = H - 4 - 30;
  w.place(btn(W - 8 - 3 * 75 - 12, by, 75, 23, "OK", { def: true, onclick: () => { apply(state); w.close(); } }), btn(W - 8 - 2 * 75 - 6, by, 75, 23, "Cancel", { onclick: () => w.close() }), btn(W - 8 - 75, by, 75, 23, "Apply", { onclick: () => apply(state) }));
  return w;
}

/** Generic multi-row property sheet. pages: [{label, tpl, labels?}] */
export function oeSheet(ctx, { title, pages, store, onApply, cx = 275, cy = 210, rows = 1 }) {
  const pw = px(cx) + 8, ph = py(cy) + 8, per = Math.ceil(pages.length / rows);
  const top = FY + 8, PX = FX + 8, W = pw + PX * 2, PY = top + rows * 21, H = PY + ph + 10 + 23 + 14;
  const w = refWindow(ctx, { title, icon: "oe", width: W, height: H, appId: "dialog" });
  const state = JSON.parse(JSON.stringify(store || {}));
  const strip = el("div", { class: "rk-pane" }), body = el("div", { class: "rk-pane" }), cache = [];
  let active = 0;
  const build = (i) => {
    if (cache[i]) return cache[i];
    const { out, host } = hostOf(), tpl = pages[i].tpl, st = (state[i] ||= {});
    const on = {}, checked = {};
    for (const c of tpl.controls) if (c.class === "button" && [2, 3, 4, 5, 6, 9].includes(c.style & 0xf)) { checked[c.id] = !!st[c.id]; on[c.id] = () => (st[c.id] = !st[c.id]); }
    dialogFromTemplate(ctx, tpl, { host, ox: PX, oy: PY, checked, on, labels: pages[i].labels });
    return (cache[i] = out);
  };
  const show = (i) => {
    active = i;
    const [rowOf] = [Math.floor(i / per)];
    const order = [...Array(rows).keys()].filter((r) => r !== rowOf).concat(rowOf); // active row sits next to the pane
    strip.replaceChildren(el("div", { class: "rk-tabpane", style: { left: PX + "px", top: PY + "px", width: pw + "px", height: ph + "px" } }));
    order.forEach((r, slot) => {
      const tw = pw / per;
      for (let k = 0; k < per; k++) {
        const j = r * per + k; if (j >= pages.length) break;
        const on = j === i;
        const t = el("div", { class: "rk-tab" + (on ? " active" : ""), role: "tab", text: pages[j].label, style: { left: PX + k * tw - (on ? 2 : 0) + "px", top: top + slot * 21 + (on ? 0 : 2) + "px", width: tw + (on ? 4 : 0) + "px", height: 21 + (on ? 1 : 0) + "px", paddingTop: on ? "3px" : "2px" } });
        t.addEventListener("click", () => show(j));
        strip.append(t);
      }
    });
    body.replaceChildren(...build(i));
  };
  w.place(strip, body);
  show(0);
  const by = PY + ph + 10;
  w.place(btn(W - PX - 3 * 75 - 12, by, 75, 23, "OK", { def: true, onclick: () => { onApply?.(state); w.close(); } }), btn(W - PX - 2 * 75 - 6, by, 75, 23, "Cancel", { onclick: () => w.close() }), btn(W - PX - 75, by, 75, 23, "Apply", { onclick: () => onApply?.(state) }));
  return w;
}

export const oeOptions = (ctx, store, onApply) =>
  oeSheet(ctx, {
    title: "Options", store, onApply, rows: 2,
    pages: [["General", 51], ["Read", 50], ["Receipts", 233], ["Send", 52], ["Compose", 55], ["Signatures", 54], ["Spelling", 48], ["Security", 47], ["Connection", 49], ["Maintenance", 53]].map(([label, k]) => ({ label, tpl: D[k] })),
  });

export const oeRules = (ctx, store, onApply) =>
  oeSheet(ctx, {
    title: "Message Rules", store, onApply, cx: 288, cy: 189,
    pages: [{ label: "Mail Rules", tpl: D[201] }, { label: "News Rules", tpl: D[201], labels: { 1: "These rules will be applied to News messages." } }, { label: "Blocked Senders List", tpl: D[204] }],
  });
