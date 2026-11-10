/** "<Saver> Setup" dialogs, built from the templates inside the Windows 2000 .scr files. */
import { dialogFromTemplate } from "../ui/dlg.js";
import { SAVER_DIALOGS } from "./saver-data.js";
import { SAVER_DEFAULTS } from "../rendering/savers.js";

const COMBOS = {
  flyingobjects: { 2002: ["Windows Logo", "Explode", "Ribbon", "Two Ribbons", "Splash", "Twist", "Textured Flag"] },
  flowerbox: { 650: ["Cube", "Tetrahedron", "Pyramids", "Cylinder", "Spring"] },
  pipes: { 2200: ["Elbow", "Ball", "Mixed", "Cycle"] },
  text3d: { 4100: ["None", "See-Saw", "Wobble", "Random"] },
  mystify: { 100: ["Polygon"] },
  marquee: { 104: ["Black", "Red", "Green", "Blue", "Yellow", "White", "Cyan", "Magenta"] },
};
// control id -> option key per saver. kind: edit | check | radio | combo | slider
const MAP = {
  mystify: [[100, "shape", "combo"], [106, "active", "check"], [104, "lines", "edit"], [102, "twoColors", "radio"], [121, "clear", "check"]],
  beziers: [[2004, "length", "edit"], [2006, "width", "edit"], [100, "speed", "slider", 0, 100]],
  starfield: [[101, "count", "edit"], [100, "speed", "slider", 0, 100]],
  marquee: [[102, "text", "edit"], [105, "centered", "radio"], [104, "bg", "combo"], [107, "speed", "slider", 0, 100]],
  text3d: [[3020, "text", "edit"], [5001, "clock", "radio"], [4100, "spin", "combo"], [2014, "size", "slider", 0, 100], [2023, "speed", "slider", 0, 100]],
  flyingobjects: [[2002, "style", "combo"], [2006, "cycle", "check"], [2005, "smooth", "check"]],
  flowerbox: [[650, "shape", "combo"], [600, "spin", "check"], [601, "bloom", "check"], [602, "twoSided", "check"]],
  pipes: [[3001, "multiple", "radio"], [2200, "joint", "combo"], [3101, "flex", "radio"]],
  maze: [[2008, "overlay", "check"], [2000, "size", "slider", 0, 100]],
};

export function hasSaverSettings(type) {
  return !!SAVER_DIALOGS[type];
}

/** Opens the Setup dialog; persists to settings.saverOptions[type] on OK. */
export function openSaverSettings(ctx, type, { onOk } = {}) {
  const tpl = SAVER_DIALOGS[type];
  if (!tpl) return ctx.dialogs.message("This screen saver has no options that you can set.", { title: "Screen Saver" });
  const saved = { ...SAVER_DEFAULTS[type], ...((ctx.settings.get("saverOptions") || {})[type] || {}) };
  const draft = { ...saved };
  const values = {}, checked = {}, sliders = {}, groups = [];
  const radios = [];
  for (const [id, key, kind, min, max] of MAP[type] || []) {
    if (kind === "edit" || kind === "combo") values[id] = String(saved[key]);
    else if (kind === "check") checked[id] = !!saved[key];
    else if (kind === "radio") radios.push([id, key]);
    else if (kind === "slider") sliders[id] = { min, max, value: Number(saved[key]), onchange: (v) => (draft[key] = v) };
  }
  // radio pairs: the listed id is the "true" option, its sibling is the other one
  const sib = { 102: 103, 105: 106, 5001: 5000, 3001: 3000, 3101: 3100 };
  for (const [id, key] of radios) { checked[id] = !!saved[key]; checked[sib[id]] = !saved[key]; groups.push([id, sib[id]]); }
  const ctl = {};
  let w;
  w = dialogFromTemplate(ctx, tpl, {
    ctlOut: ctl, values, checked, sliders, groups, combos: COMBOS[type],
    on: {
      1: () => {
        for (const [id, key, kind] of MAP[type] || []) {
          if (kind === "edit") { const v = ctl[id].value; draft[key] = typeof SAVER_DEFAULTS[type][key] === "number" ? Math.max(1, Number(v) || SAVER_DEFAULTS[type][key]) : v; }
          else if (kind === "combo") draft[key] = ctl[id].value || saved[key];
          else if (kind === "check") draft[key] = w.on(id);
          else if (kind === "radio") draft[key] = w.on(id);
        }
        const all = { ...(ctx.settings.get("saverOptions") || {}), [type]: draft };
        ctx.settings.set("saverOptions", all);
        w.close();
        onOk?.();
      },
      2: () => w.close(),
    },
  });
  return w;
}
