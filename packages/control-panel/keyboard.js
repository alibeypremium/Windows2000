/** Keyboard Properties, laid out from Windows 2000 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/keyboard/";
const OX = 389,
  OY = 75;
const ticks = (n) => Array.from({ length: n }, (_, i) => i / (n - 1));

export function openKeyboardProperties(ctx, { tab = 0 } = {}) {
  const k = kit(0, 0),
    w = refWindow(ctx, {
      title: "Keyboard Properties",
      width: 404,
      height: 480,
      appId: "control",
      help: true,
      noIcon: true,
      x: OX,
      y: OY,
    });
  const S = ctx.settings;
  const state = { delay: 0.66, rate: 0.97, blink: 0.6, caps: 0 };
  let tc,
    blinkTimer;
  const dirty = () => w.setDirty?.(true);
  const hdr = (x, wd, label) => {
    const n = el("div", { class: "rk-hdr left", text: label });
    Object.assign(n.style, { left: x + "px", top: "80px", width: wd + "px", height: "17px" });
    return n;
  };

  const speed = () => {
    const bar = el("div", { class: "kb-caret" });
    Object.assign(bar.style, { left: "58px", top: "346px" });
    clearInterval(blinkTimer);
    blinkTimer = setInterval(() => {
      if (!w.el.isConnected) return clearInterval(blinkTimer);
      bar.style.visibility = bar.style.visibility === "hidden" ? "visible" : "hidden";
    }, 1100 - state.blink * 900);
    const test = el("input", { class: "rk-field", spellcheck: "false", "aria-label": "Test repeat rate" });
    Object.assign(test.style, { left: "46px", top: "256px", width: "313px", height: "21px" });
    return [
      k.group(25, 70, 355, 229, "Character repeat", 9),
      k.img(47, 92, IMG + "delay.png", 36, 34),
      k.text(98, 92, "Repeat delay:"),
      k.text(98, 115, "Long"),
      k.text(329, 115, "Short"),
      k.hslider(135, 116, 184, state.delay, { ticks: [0.03, 0.35, 0.66, 0.97], tickY: 14, onchange: (v) => ((state.delay = v), dirty()) }),
      k.img(46, 171, IMG + "rate.png", 36, 26),
      k.text(98, 167, "Repeat rate:"),
      k.text(98, 190, "Slow"),
      k.text(329, 190, "Fast"),
      k.hslider(135, 192, 184, state.rate, { ticks: ticks(31), tickY: 13, onchange: (v) => ((state.rate = v), dirty()) }),
      k.text(46, 240, "Click here and hold down a key to test repeat rate:"),
      test,
      k.group(25, 314, 355, 71, "Cursor blink rate", 9),
      bar,
      k.text(98, 339, "Slow"),
      k.text(329, 339, "Fast"),
      k.hslider(135, 341, 184, state.blink, {
        ticks: ticks(11),
        tickY: 14,
        onchange: (v) => {
          state.blink = v;
          dirty();
          tc.select(0);
        },
      }),
    ];
  };

  const locales = () => {
    const sel1 = el("div", { class: "kb-row sel" }, el("span", { class: "en", text: "EN" }), el("span", { class: "lang", text: "English (United States)" }), el("span", { class: "lay", text: "US" }));
    Object.assign(sel1.style, { left: "36px", top: "99px", width: "333px" });
    const hot = (label, y, on) => {
      const r = el("div", { class: "kb-hot" + (on ? " sel" : "") }, el("span", { text: label }), el("span", { class: "r", text: "(None)" }));
      Object.assign(r.style, { left: "38px", top: y + "px", width: "331px" });
      return r;
    };
    return [
      k.group(25, 70, 355, 156, "Installed input locales", 9),
      k.text(35, 81, "Input language"),
      k.text(268, 81, "Keyboard layout/IME", { w: 100, align: "right" }),
      k.sunken(35, 98, 335, 61),
      sel1,
      k.btn(35, 167, 104, 22, "Add...", { onclick: () => ctx.dialogs.message("Adding input locales is not available in this virtual desktop.", { title: "Add Input Locale" }) }),
      k.btn(152, 167, 104, 22, "Remove", { disabled: true }),
      k.btn(268, 167, 104, 22, "Properties...", { onclick: () => ctx.dialogs.message("Input locale properties are not available in this virtual desktop.", { title: "Input Locale Properties" }) }),
      k.btn(268, 195, 104, 22, "Set as Default", { disabled: true }),
      k.group(25, 241, 355, 34, "To turn off Caps Lock", 9),
      k.radio(36, 253, "Press CAPS LOCK key", { checked: state.caps === 0, onchange: () => ((state.caps = 0), dirty()) }),
      k.radio(201, 253, "Press SHIFT key", { checked: state.caps === 1, onchange: () => ((state.caps = 1), dirty()) }),
      k.group(25, 288, 355, 113, "Hot keys for input locales", 9),
      k.text(35, 300, "Item"),
      k.text(300, 300, "Key sequence", { w: 70, align: "right" }),
      k.sunken(35, 315, 335, 43),
      hot("Switch between input locales", 317, true),
      hot("Switch to English (United States) - US", 337, false),
      k.btn(242, 374, 129, 22, "Change Key Sequence..."),
      k.check(25, 412, "Enable indicator on taskbar", { disabled: true }),
    ];
  };

  const hardware = () => {
    const row = el("div", { class: "up-row sel" }, el("img", { src: IMG + "kbd16.png", alt: "", draggable: "false" }), el("span", { class: "n", text: "PC/AT Enhanced PS/2 Keyboard (101/102-K..." }), el("span", { class: "g", text: "Keyboards" }));
    Object.assign(row.style, { left: "30px", top: "99px", width: "334px" });
    row.querySelector(".g").style.left = "255px";
    return [
      k.text(26, 63, "Devices:"),
      k.sunken(25, 78, 356, 75),
      hdr(26, 252, "Name"),
      hdr(278, 85, "Type"),
      hdr(363, 17, ""),
      row,
      k.group(25, 176, 356, 219, "Device Properties", 9),
      k.text(35, 191, "Manufacturer: (Standard keyboards)"),
      k.text(35, 210, "Hardware Revision: Not available"),
      k.text(35, 230, "Location: Unknown"),
      k.text(35, 249, "Device Status: This device is working properly."),
      k.btn(205, 361, 80, 23, "Troubleshoot...", { onclick: () => ctx.launch?.("help") }),
      k.btn(296, 361, 75, 23, "Properties", { onclick: () => ctx.dialogs.message("Device properties are not available in this virtual desktop.", { title: "Keyboard Properties" }) }),
    ];
  };

  tc = k.tabs({
    top: 30,
    pane: [10, 49, 386, 391],
    active: tab,
    tabs: [
      { label: "Speed", x: 11, w: 45, content: speed },
      { label: "Input Locales", x: 56, w: 75, content: locales },
      { label: "Hardware", x: 131, w: 59, content: hardware },
    ],
  });
  w.place(tc, sheetButtons(w, k, { y: 446, xs: [159, 240, 321] }));
  return w;
}
