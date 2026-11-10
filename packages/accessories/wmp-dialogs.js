// Windows Media Player 6.4 dialogs built from the msdxm.ocx templates.
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { WMP_DIALOGS as D } from "./wmp-data.js";
import { refWindow, tabControl, btn } from "../control-panel/refkit.js";

export function wmpOpen(ctx, onOpen, onBrowse) {
  const d = dialogFromTemplate(ctx, D[3019], {
    title: "Open",
    icon: "media",
    on: {
      1: () => { const v = d.ctl[3018].value.trim(); d.close(); if (v) onOpen(v); },
      2: () => d.close(),
      1000: () => onBrowse?.(d),
    },
  });
  d.ctl[3018]?.focus();
  return d;
}

export function wmpAbout(ctx) {
  const d = dialogFromTemplate(ctx, D[3067], {
    icon: "media",
    values: { 0: "" },
    on: { 1: () => d.close() },
  });
  for (const n of d.el.querySelectorAll(".rk-text")) if (n.textContent === "x.xx.xx.xxxx") n.textContent = "6.4.09.1129";
  return d;
}

export function wmpStats(ctx, video) {
  const d = dialogFromTemplate(ctx, D[1103], {
    icon: "media",
    hidden: [217, 403],
    on: { 1: () => d.close() },
    values: { 248: "0", 247: "0", 251: "0", 222: "", 223: "", 220: "", 401: "", 400: "", 402: "" },
  });
  const rate = () => { const q = video.getVideoPlaybackQuality?.(); d.ctl[247].value = video.videoWidth ? "30.0" : "0"; d.ctl[251].value = video.videoWidth ? "30.0" : "0"; d.ctl[248].value = String(q?.droppedVideoFrames ?? 0); };
  rate();
  return d;
}

export function wmpProps(ctx, { name, type, size, length, videoSize }) {
  const d = dialogFromTemplate(ctx, D[312], {
    title: "Properties",
    icon: "media",
    hidden: [],
    values: { 267: name, 277: type, 278: size, 273: length, 274: videoSize, 275: "" },
  });
  // The real page is a sheet page; add the OK/Cancel row the property sheet provides.
  const h = parseInt(d.el.style.height) || 0;
  d.place(btn(px(D[312].cx) - 75 - 4, py(D[312].cy) + 26 - 37, 75, 23, "Close", { def: true, onclick: () => d.close() }));
  return d;
}

export function wmpGoto(ctx, onGo, items) {
  const d = dialogFromTemplate(ctx, D[211], {
    icon: "media",
    on: { 1: () => d.close(), 2: () => d.close() },
  });
  return d;
}

/** Options property sheet: Player / Advanced / Formats / Custom view pages. */
export function wmpOptions(ctx, state, apply) {
  const pw = px(300) + 8, ph = py(152) + 8;
  const FX = 4, FY = 22, PX = FX + 8, W = pw + PX * 2, top = FY + 8, PY = top + 21, H = PY + ph + 10 + 23 + 14;
  const w = refWindow(ctx, { title: "Options", icon: "media", width: W, height: H, appId: "dialog" });
  const pageNodes = (tpl, opts = {}) => {
    const out = [];
    dialogFromTemplate(ctx, tpl, { ...opts, host: { place: (...n) => out.push(...n.flat(Infinity)), el: null }, ox: PX, oy: PY });
    return out;
  };
  const cache = {};
  const page = (key, tpl, opts) => () => (cache[key] ||= pageNodes(tpl, opts));
  const names = ["Player", "Advanced", "Formats", "Custom"];
  const widths = [52, 64, 56, 56];
  let x = PX;
  const tabs = names.map((label, i) => { const t = { label, x, w: widths[i] }; x += widths[i]; return t; });
  tabs[0].content = page("p", D[135], { labels: { 261: "Use the same player for\neach media file played", 260: "Open a new player for\neach media file played", 323: "Allow Internet sites to\nuniquely identify your player" }, checked: { 261: !state.newPlayer, 260: !!state.newPlayer, 256: !!state.onTop, 288: false, 284: true, 323: false }, on: { 256: (v) => (state.onTop = !state.onTop), 260: () => (state.newPlayer = true), 261: () => (state.newPlayer = false) }, groups: [[261, 260]] });
  tabs[1].content = page("a", D[130]);
  tabs[2].content = page("f", D[330]);
  tabs[3].content = page("c", D[125]);
  w.place(tabControl({ top, pane: [PX, PY, pw, ph], tabs }));
  const by = PY + ph + 10;
  w.place(
    btn(W - PX - 3 * 75 - 12, by, 75, 23, "OK", { def: true, onclick: () => { apply(state); w.close(); } }),
    btn(W - PX - 2 * 75 - 6, by, 75, 23, "Cancel", { onclick: () => w.close() }),
    btn(W - PX - 75, by, 75, 23, "Apply", { onclick: () => apply(state) }),
  );
  return w;
}
