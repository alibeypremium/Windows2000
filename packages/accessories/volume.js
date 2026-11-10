// Volume Control (sndvol32.exe): strips and dialogs built from the ISO templates.
import { el, separator } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { refWindow, hslider, btn } from "../control-panel/refkit.js";
import { VOL_DIALOGS as D } from "./volume-data.js";

const FX = 4, FY = 22, MENU = 20;
const STRIPS = [
  { id: "master", label: "Volume Control", key: "volume", def: 65, tpl: "101", mute: "muted", muteLabel: "Mute all" },
  { id: "wave", label: "Wave", key: "waveVolume", def: 100, tpl: "102", mute: "waveMuted", muteLabel: "Mute" },
  { id: "synth", label: "SW Synth", key: "synthVolume", def: 100, tpl: "102", mute: "synthMuted", muteLabel: "Mute" },
  { id: "cd", label: "CD Player", key: "cdVolume", def: 100, tpl: "102", mute: "cdMuted", muteLabel: "Mute" },
  { id: "line", label: "Line In", key: "lineVolume", def: 0, tpl: "102", mute: "lineMuted", muteLabel: "Mute" },
];

function vslider(x, y, h, value, onchange) {
  const n = el("div", { class: "vol-vs", style: { left: x + "px", top: y + "px", height: h + "px" } }), thumb = el("div", { class: "vol-vthumb" });
  n.append(el("div", { class: "vol-vgroove", style: { height: h - 8 + "px" } }), thumb);
  const set = (v) => { value = Math.max(0, Math.min(1, v)); thumb.style.top = Math.round((1 - value) * (h - 11)) + "px"; };
  set(value);
  const move = (e) => { const r = n.getBoundingClientRect(); set(1 - (e.clientY - r.top - 5) / (h - 11)); onchange?.(value); };
  n.addEventListener("pointerdown", (e) => { move(e); const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); }; addEventListener("pointermove", move); addEventListener("pointerup", up); });
  n.set = set;
  return n;
}

export function openVolume(ctx) {
  const vis = ctx.settings.get("volStrips") || ["master", "wave", "synth", "cd"];
  const strips = STRIPS.filter((s) => vis.includes(s.id));
  const SW = px(61) + 1;
  const w = refWindow(ctx, { title: "Volume Control", icon: "volumeApp", width: strips.length * SW + FX * 2 + 2, height: FY + MENU + py(150) + FX + 2, appId: "volume" });
  const redraw = () => {
    w.layer.replaceChildren();
    strips.forEach((s, i) => {
      const tpl = D[s.tpl], ox = FX + i * SW, oy = FY + MENU;
      const get = () => ctx.settings.get(s.key) ?? s.def;
      dialogFromTemplate(ctx, tpl, {
        host: w, ox, oy, hidden: [1001, 1002, 1005], labels: { 1004: s.label, 1000: "&" + s.muteLabel.replace(/^&/, "") },
        checked: { 1000: !!ctx.settings.get(s.mute) },
        on: { 1000: () => ctx.settings.set(s.mute, !ctx.settings.get(s.mute)), 1022: () => advanced() },
      });
      const bal = tpl.controls.find((c) => c.id === 1002), vol = tpl.controls.find((c) => c.id === 1001), vu = tpl.controls.find((c) => c.id === 1005);
      if (s.id === "master") w.place(hslider(ox + px(bal.x) - 4, oy + py(bal.y) - 3, px(bal.cx) + 4, ((ctx.settings.get("balance") || 0) + 1) / 2, { onchange: (v) => ctx.settings.set("balance", Math.round((v * 2 - 1) * 10) / 10) }));
      else w.place(hslider(ox + px(bal.x) - 4, oy + py(bal.y) - 3, px(bal.cx) + 4, 0.5, {}));
      w.place(vslider(ox + px(vol.x) + 2, oy + py(vol.y), py(vol.cy), get() / 100, (v) => ctx.settings.set(s.key, Math.round(v * 100))));
      const meter = el("div", { class: "vol-vu", style: { left: ox + px(vu.x) + 2 + "px", top: oy + py(vu.y) + "px", width: px(vu.cx) + "px", height: py(vu.cy) + "px" } });
      for (let k = 0; k < 12; k++) meter.append(el("i", { class: k < 2 ? "r" : k < 5 ? "y" : "g" }));
      w.place(meter);
      w.place(el("div", { class: "vol-sep", style: { left: ox + px(61) + "px", top: oy + 2 + "px", height: py(146) + "px" } }));
    });
  };
  const advanced = () => {
    const d = dialogFromTemplate(ctx, D["110"], { title: "Advanced Controls for Volume Control", icon: "volumeApp", hidden: [1035, 1033, 1031, 1032], on: { 1: () => d.close() } });
    const bt = D["110"].controls.filter((c) => c.id === 1025 || c.id === 1026);
    bt.forEach((c) => d.place(hslider(4 + px(c.x), 22 + py(c.y) - 3, px(c.cx), (ctx.settings.get(c.id === 1025 ? "bass" : "treble") ?? 50) / 100, { ticks: [0, 0.25, 0.5, 0.75, 1], onchange: (v) => ctx.settings.set(c.id === 1025 ? "bass" : "treble", Math.round(v * 100)) })));
    return d;
  };
  const props = () => {
    const tpl = D["107"], state = new Set(vis);
    const d = dialogFromTemplate(ctx, tpl, {
      icon: "volumeApp", values: { 1012: "Browser Audio Device", 1016: "Volume" }, checked: { 1013: true },
      groups: [[1013, 1014, 1015]],
      on: { 1: () => { ctx.settings.set("volStrips", STRIPS.filter((s) => state.has(s.id)).map((s) => s.id)); d.close(); w.close(); ctx.launch("volume"); }, 2: () => d.close() },
    });
    const list = d.ctl[1017].querySelector(".rk-listbox");
    for (const s of STRIPS) {
      const row = el("label", { class: "vol-row" }, el("input", { type: "checkbox", checked: state.has(s.id), onchange: (e) => (e.target.checked ? state.add(s.id) : state.delete(s.id)) }), s.label);
      list.append(row);
    }
    return d;
  };
  w.setMenu({
    Options: [
      { label: "Properties", action: props },
      { label: "Advanced Controls", action: advanced },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "volume" }) },
      separator(),
      { label: "About Volume Control", action: () => ctx.dialogs.message("Volume Control\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1991-1999 Microsoft Corp.", { title: "About Volume Control", icon: "volumeApp" }) },
    ],
  });
  redraw();
  w.addCleanup(ctx.bus.on("settings:change", () => {}));
  return w;
}
