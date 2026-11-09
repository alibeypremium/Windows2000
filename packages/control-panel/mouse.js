/** Mouse Properties, laid out from Windows 2000 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/mouse/";
const OX = 401,
  OY = 44;
const CURSORS = [
  ["Normal Select", "arrow", [335, 11, 16, 21]],
  ["Help Select", "help", [332, 10, 30, 28]],
  ["Working In Background", "work", [332, 10, 30, 28]],
  ["Busy", "busy", [326, 6, 23, 28]],
  ["Precision Select", "prec", [326, 7, 23, 20]],
  ["Text Select"],
  ["Handwriting"],
  ["Unavailable"],
  ["Vertical Resize"],
  ["Horizontal Resize"],
  ["Diagonal Resize 1"],
  ["Diagonal Resize 2"],
  ["Move"],
  ["Alternate Select"],
  ["Link Select"],
];

export function openMouseProperties(ctx, { tab = 0 } = {}) {
  const k = kit(0, 0),
    w = refWindow(ctx, {
      title: "Mouse Properties",
      width: 404,
      height: 448,
      appId: "control",
      help: true,
      noIcon: true,
      x: OX,
      y: OY,
    });
  const S = ctx.settings;
  const state = {
    left: !!S.get("leftHanded"),
    dbl: S.get("doubleClickSpeed") ?? 450,
    speed: S.get("mouseSpeed") ?? 5,
    accel: 1,
    snap: false,
    shadow: true,
    cursor: 0,
    scroll: 0,
  };
  let tc;
  const dirty = () => w.setDirty?.(true);
  const pbox = (x, y, wd, h) => {
    const n = el("div", { class: "rk-pbox" });
    Object.assign(n.style, { left: x + "px", top: y + "px", width: wd + "px", height: h + "px" });
    return n;
  };
  const ticks = (n) => Array.from({ length: n }, (_, i) => i / (n - 1));

  /* ---------- Buttons ---------- */
  const buttons = () => {
    const mouse = k.img(161, 114, IMG + "mouse.png", 84, 77);
    if (state.left) mouse.style.transform = "scaleX(-1)";
    const L = state.left ? ["Special Drag", "Context Menu"] : ["Normal Select", "Normal Drag"];
    const Rr = state.left ? ["Normal Select", "Normal Drag"] : ["Context Menu", "Special Drag"];
    const dbl01 = 1 - (state.dbl - 180) / (900 - 180);
    const test = k.img(322, 344, IMG + "testbox.png", 25, 20);
    test.addEventListener("dblclick", () => {
      test.style.filter = "hue-rotate(120deg)";
      setTimeout(() => (test.style.filter = ""), 900);
    });
    test.style.pointerEvents = "auto";
    return [
      k.group(25, 70, 356, 137, "Button configuration", 9),
      k.radio(35, 89, "Right-handed", { checked: !state.left, onchange: () => ((state.left = false), dirty(), tc.select(0)) }),
      k.radio(136, 89, "Left-handed", { checked: state.left, onchange: () => ((state.left = true), dirty(), tc.select(0)) }),
      k.text(34, 113, "Left Button:"),
      k.text(42, 129, "-  " + L[0]),
      k.text(42, 142, "-  " + L[1]),
      k.text(269, 113, "Right Button:"),
      k.text(277, 129, "-  " + Rr[0]),
      k.text(277, 142, "-  " + Rr[1]),
      mouse,
      k.group(25, 222, 356, 54, "Files and Folders", 9),
      k.img(42, 234, IMG + "files.png", 26, 30),
      k.radio(86, 234, "Single-click to open an item (point to select)", { checked: !!S.get("singleClick"), onchange: () => dirty() }),
      k.radio(86, 255, "Double-click to open an item (single-click to select)", { checked: !S.get("singleClick"), onchange: () => dirty() }),
      k.group(25, 293, 356, 101, "Double-click speed", 9),
      k.text(40, 334, "Slow"),
      k.text(230, 334, "Fast"),
      k.hslider(79, 334, 137, dbl01, { ticks: [0, 1], tickY: 11, onchange: (v) => ((state.dbl = Math.round(900 - v * 720)), dirty()) }),
      k.text(236, 303, "Test area:"),
      pbox(293, 301, 79, 84),
      test,
    ];
  };

  /* ---------- Pointers ---------- */
  const pointers = () => {
    const list = el("div", { class: "dp-list" });
    Object.assign(list.style, { left: "27px", top: "179px", width: "336px", height: "179px" });
    const inner = el("div", { class: "dp-rows" });
    let top = 0;
    const ROW = 34,
      max = CURSORS.length * ROW - 179;
    const sb = k.vscroll(364, 179, 179, 17, 94);
    const sync = () => {
      inner.style.top = -top + "px";
      sb.querySelector(".thumb").style.top = 16 + Math.round((top / max) * (179 - 32 - 94)) + "px";
    };
    CURSORS.forEach(([name, file, [ix, iy, iw, ih] = []], i) => {
      const r = el("div", { class: "ms-row" + (i === state.cursor ? " sel" : ""), style: { top: i * ROW + "px" } }, el("span", { text: name }));
      if (file) {
        const im = el("img", { src: IMG + (i === state.cursor && file === "arrow" ? "arrow-sel" : file) + ".png", alt: "", draggable: "false" });
        Object.assign(im.style, { left: ix - 27 + "px", top: iy - 4 + "px", width: iw + "px", height: ih + "px" });
        r.append(im);
      }
      r.addEventListener("click", () => ((state.cursor = i), tc.select(1)));
      inner.append(r);
    });
    list.append(inner);
    list.addEventListener("wheel", (e) => {
      e.preventDefault();
      top = Math.max(0, Math.min(max, top + Math.sign(e.deltaY) * ROW));
      sync();
    });
    sb.querySelector(".up").addEventListener("click", () => ((top = Math.max(0, top - ROW)), sync()));
    sb.querySelector(".down").addEventListener("click", () => ((top = Math.min(max, top + ROW)), sync()));
    sync();
    const prev = pbox(301, 70, 80, 78);
    return [
      k.group(25, 70, 266, 78, "Scheme", 9),
      (() => {
        const c = k.combo(35, 87, 246, 19, "");
        c.firstChild.nodeValue = "";
        c.prepend(el("span", { class: "dt-sel wide", text: "(None)" }));
        return c;
      })(),
      k.btn(125, 115, 75, 23, "Save As..."),
      k.btn(206, 115, 75, 23, "Delete", { disabled: true }),
      prev,
      k.img(334, 102, IMG + "arrow.png", 16, 24),
      k.text(26, 159, "Customize:"),
      k.sunken(25, 178, 356, 181),
      list,
      sb,
      k.check(26, 370, "Enable pointer shadow", { checked: state.shadow, onchange: (v) => ((state.shadow = v), dirty()) }),
      k.btn(224, 371, 75, 22, "Use Default", { disabled: true }),
      k.btn(305, 371, 75, 22, "Browse..."),
    ];
  };

  /* ---------- Motion ---------- */
  const motion = () => [
    k.group(22, 67, 355, 81, "Speed", 9),
    k.img(36, 84, IMG + "speed.png", 29, 27),
    k.text(73, 86, "Adjust how fast your pointer moves"),
    k.text(111, 126, "Slow"),
    k.text(269, 126, "Fast"),
    k.hslider(148, 114, 103, (state.speed - 1) / 9, { ticks: ticks(12), tickY: 11, onchange: (v) => ((state.speed = Math.round(1 + v * 9)), dirty()) }),
    k.group(22, 165, 355, 80, "Acceleration", 9),
    k.img(36, 184, IMG + "speed.png", 29, 27),
    k.text(73, 183, "Adjust how much your pointer accelerates as\nyou move it faster"),
    ...[
      ["None", 68, 85],
      ["Low", 151, 167],
      ["Medium", 221, 238],
      ["High", 300, 317],
    ].map(([l, cx, tx], i) => {
      const r = k.radio(cx, 225, l, { checked: state.accel === i, onchange: () => ((state.accel = i), dirty(), tc.select(2)) });
      return r;
    }),
    k.group(22, 262, 355, 72, "Snap to default", 9),
    k.img(43, 283, IMG + "snap.png", 33, 32),
    k.check(89, 288, "Move pointer to the default button in dialog boxes", { checked: state.snap, onchange: (v) => ((state.snap = v), dirty()) }),
  ];

  /* ---------- Hardware ---------- */
  const hardware = () => {
    const hdr = (x, wd, label) => {
      const n = el("div", { class: "rk-hdr left", text: label });
      Object.assign(n.style, { left: x + "px", top: "80px", width: wd + "px", height: "17px" });
      return n;
    };
    const row = el("div", { class: "up-row sel" }, el("img", { src: IMG + "ps2.png", alt: "", draggable: "false" }), el("span", { class: "n", text: "Microsoft PS/2 Mouse" }), el("span", { class: "g", text: "Mice and oth..." }));
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
      k.text(35, 191, "Manufacturer: Microsoft"),
      k.text(35, 210, "Hardware Revision: Not available"),
      k.text(35, 230, "Location: Unknown"),
      k.text(35, 249, "Device Status: This device is working properly."),
      k.btn(205, 361, 80, 23, "Troubleshoot...", { onclick: () => ctx.launch?.("help") }),
      k.btn(296, 361, 75, 23, "Properties", { onclick: () => ctx.dialogs.message("Device properties are not available in this virtual desktop.", { title: "Microsoft PS/2 Mouse Properties" }) }),
    ];
  };

  const apply = () => S.patch({ leftHanded: state.left, doubleClickSpeed: state.dbl, mouseSpeed: state.speed });

  tc = k.tabs({
    top: 30,
    pane: [10, 49, 386, 360],
    active: tab,
    tabs: [
      { label: "Buttons", x: 11, w: 50, content: buttons },
      { label: "Pointers", x: 61, w: 50, content: pointers },
      { label: "Motion", x: 111, w: 44, content: motion },
      { label: "Hardware", x: 155, w: 57, content: hardware },
    ],
  });
  w.place(tc, sheetButtons(w, k, { ok: apply, apply, y: 416, xs: [159, 240, 321] }));
  return w;
}
