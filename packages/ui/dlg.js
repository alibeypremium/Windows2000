/**
 * Builds a Windows 2000 dialog from a template extracted from the ISO
 * (see scripts/dump-dialogs.py). Template units are dialog units; for the
 * 8pt MS Shell Dlg font one unit is 1.5 px horizontally and 1.625 px vertically.
 */
import { el } from "./index.js";
import { refWindow, btn, check, radio, group, sunken, text, link } from "../control-panel/refkit.js";

export const px = (x) => Math.round((x * 6) / 4);
export const py = (y) => Math.round((y * 13) / 8);
const FRAME_X = 4, FRAME_Y = 22; // left/top frame of a fixed dialog (border + caption)

const withMnemonic = (node, label) => {
  if (!/&[^&]/.test(label)) return;
  node.replaceChildren(...label.split(/&(?=[^&])/).flatMap((part, i) => (i === 0 ? [part.replace(/&&/g, "&")] : [el("u", { text: part[0] }), part.slice(1).replace(/&&/g, "&")])));
};

/**
 * @param tpl  dialog template {cx, cy, title, controls[]}
 * @param opts {title, appId, icon, x, y, values:{id:string}, on:{id:fn}, labels:{id:string}, hidden:[ids]}
 */
export function dialogFromTemplate(ctx, tpl, opts = {}) {
  const width = px(tpl.cx) + FRAME_X * 2, height = py(tpl.cy) + FRAME_Y + 4;
  const w = refWindow(ctx, { title: opts.title ?? tpl.title, icon: opts.icon, width, height, x: opts.x, y: opts.y, appId: opts.appId || "dialog", noIcon: !opts.icon });
  const byId = {};
  for (const c of tpl.controls) {
    if (opts.hidden?.includes(c.id)) continue;
    const x = px(c.x) + FRAME_X, y = py(c.y) + FRAME_Y, cw = px(c.cx), ch = py(c.cy);
    const isIconRef = c.class === "static" && typeof c.text === "number";
    if (isIconRef) continue; // icon/bitmap resource reference
    const label = String(opts.labels?.[c.id] ?? c.text);
    const disabled = !!(c.style & 0x08000000), t = c.style & 0xf;
    let node;
    if (c.class === "button") {
      if (t === 7) node = group(x, y + 6, cw, ch - 6, label.replace(/&/g, ""), 9);
      else if (t === 2 || t === 3 || t === 5 || t === 6) node = check(x, y, label.replace(/&/g, ""), { disabled, checked: !!opts.checked?.[c.id], onchange: opts.on?.[c.id] });
      else if (t === 4 || t === 9) node = radio(x, y, label.replace(/&/g, ""), { disabled, checked: !!opts.checked?.[c.id], onchange: opts.on?.[c.id] });
      else {
        node = btn(x, y, cw, ch, label.replace(/&/g, ""), { def: t === 1, disabled, onclick: opts.on?.[c.id] });
        withMnemonic(node, label);
      }
    } else if (c.class === "edit") {
      const input = el("input", { class: "rk-input", value: opts.values?.[c.id] ?? c.text, type: c.style & 0x20 ? "password" : "text" });
      if (c.style & 0x2000) input.type = "number";
      node = sunken(x, y, cw, ch, input);
      byId[c.id] = input;
    } else if (c.class === "Link Window") {
      node = link(x, y, label.replace(/<[^>]+>/g, ""), opts.on?.[c.id] || (() => {}));
    } else if (c.class === "static") {
      const kind = c.style & 0x1f;
      if (kind === 0x12 || kind === 0x11 || kind === 0x10) node = el("div", { class: "rk-etched", style: { left: x + "px", top: y + "px", width: cw + "px", height: ch + "px" } });
      else {
        node = text(x, y, label.replace(/&/g, ""), { w: cw, align: kind === 1 ? "center" : kind === 2 ? "right" : "left", disabled });
        node.style.whiteSpace = "pre-wrap";
        withMnemonic(node, label);
        byId[c.id] = node;
      }
    }
    if (node) {
      for (const n of [node].flat()) if (n) w.place(n);
      if (!byId[c.id]) byId[c.id] = [node].flat()[0];
    }
  }
  for (const g of opts.groups || []) for (const id of g) byId[id]?.addEventListener("click", () => g.forEach((o) => byId[o]?.classList.toggle("checked", o === id)));
  w.ctl = byId;
  w.on = (id) => byId[id]?.classList.contains("checked");
  return w;
}
