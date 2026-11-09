/** Display Properties, laid out from Windows 2000 reference screenshots. */
import { el, popup } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/display/";
const OX = 227,
  OY = 61;

import { WALLPAPER_FILES } from "../rendering/wallpapers.js";
const WALLPAPERS = [
  ["Blue Lace 16", "tile"],
  ["Boiling Point", "paint"],
  ["Chateau", "paint"],
  ["Coffee Bean", "tile"],
  ["Fall Memories", "paint"],
  ["FeatherTexture", "tile"],
  ["Gone Fishing", "paint"],
  ["Greenstone", "paint"],
  ["Prairie Wind", "paint"],
  ["Rhododendron", "paint"],
  ["River Sumida", "paint"],
  ["Santa Fe Stucco", "tile"],
  ["Soap Bubbles", "paint"],
  ["Straw Mat", "tile"],
  ["Winter", "paint"],
  ["Zapotec", "tile"],
];
const SAVERS = [
  ["none", "(None)"],
  ["starfield", "3D Flying Objects"],
  ["pipes", "Mystify Your Mind"],
  ["blank", "Blank Screen"],
];
const COLORS = ["16 Colors", "256 Colors", "High Color (16 bit)", "True Color (24 bit)", "True Color (32 bit)"];

export function openDisplayProperties(ctx, { schemes = {}, applyTheme, tab = 0 } = {}) {
  const k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Display Properties",
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
    wallpaperName: S.get("wallpaperName") || "(None)",
    color: S.get("desktopColor") || "#3a6ea5",
    scheme: S.get("scheme") || "Windows Standard",
    saver: S.get("screensaver") || "none",
    minutes: Number(S.get("screenSaverMinutes")) || 15,
    transitions: S.get("animations") !== false,
    smooth: false,
    large: !!S.get("fxLargeIcons"),
    allColors: true,
    drag: S.get("dragFullWindows") !== false,
    hideKeys: true,
    fade: "Fade effect",
    colors: "True Color (32 bit)",
  };
  let active = tab,
    tc;
  const dirty = () => w.setDirty?.(true);
  const redraw = () => tc.select(active);
  const pos = (n, x, y, wd, h) => (
    Object.assign(n.style, { left: x - OX + "px", top: y - OY + "px", width: wd + "px", height: h != null ? h + "px" : "" }), n
  );

  // dropdown that opens a popup list under itself
  const dd = (x, y, wd, h, label, items, pick, disabled = false) => {
    const c = k.combo(x, y, wd, h, label, { disabled });
    if (!disabled)
      c.addEventListener("click", () => {
        const r = c.getBoundingClientRect();
        popup(
          items.map(([v, l]) => ({ label: l, action: () => pick(v, l) })),
          r.left,
          r.bottom,
        );
      });
    return c;
  };
  const spinBox = (x, y, wd, h, value, { disabled = false, onchange } = {}) => {
    const input = el("input", { class: "rk-field", value: String(value) });
    input.disabled = disabled;
    if (onchange) input.addEventListener("input", () => onchange(input.value));
    const n = el("div", { class: "rk-spin" + (disabled ? " disabled" : "") }, input, el("span", { class: "up" }), el("span", { class: "down" }));
    return pos(n, x, y, wd, h);
  };
  const gray = (n) => ((n.style.background = "#d4d0c8"), n);
  const colorBtn = (x, y, color) => {
    const b = k.btn(x, y, 41, 20, "", { disabled: !color });
    const sw = pos(el("div", { class: "dp-swatch" + (color ? "" : " off"), style: color ? { background: color } : {} }), x + 5, y + 5, 24, 13);
    const ar = pos(el("div", { class: "dp-arrow" + (color ? "" : " off") }), x + 32, y + 9, 0, 0);
    return [b, sw, ar];
  };
  const hscroll = (x, y, wd, thumbW) => {
    const n = el(
      "div",
      { class: "rk-hscroll" },
      el("span", { class: "sb left" }),
      el("span", { class: "sb right" }),
      el("span", { class: "thumb", style: { width: thumbW + "px" } }),
    );
    return pos(n, x, y, wd, 16);
  };
  const monitor = (screen) => [
    pos(el("div", { class: "dp-screen", style: { background: state.color } }), 353, 142, 154, 114),
    screen || null,
    k.img(338, 126, IMG + "monitor.png", 184, 170),
  ];

  /* ---------- Background ---------- */
  const background = () => {
    const rows = [["(None)", "none"], ...WALLPAPERS],
      ROW = 17,
      VIS = 112 - 4,
      max = Math.max(0, rows.length * ROW - VIS);
    let top = 0;
    const list = el("div", { class: "dp-list" }),
      inner = el("div", { class: "dp-rows" });
    pos(list, 254, 345, 252, 108);
    const sb = k.vscroll(506, 345, 110, 17, 28);
    const sync = () => {
      inner.style.top = -top + "px";
      const thumb = sb.querySelector(".thumb"),
        track = 110 - 32 - 28;
      thumb.style.top = 16 + (max ? Math.round((top / max) * track) : 0) + "px";
    };
    const draw = () => {
      inner.replaceChildren(
        ...rows.map(([name, kind]) => {
          const on = name === state.wallpaperName;
          const r = el(
            "div",
            { class: "dp-row", style: { top: rows.findIndex((x) => x[0] === name) * ROW + "px" } },
            el("img", { src: IMG + "wp-" + kind + ".png", alt: "", draggable: "false" }),
            el("span", { class: on ? "sel" : "", text: name }),
          );
          r.addEventListener("click", () => {
            state.wallpaperName = name;
            draw();
            dirty();
          });
          return r;
        }),
      );
      sync();
    };
    list.append(inner);
    list.addEventListener("wheel", (e) => {
      e.preventDefault();
      top = Math.max(0, Math.min(max, top + Math.sign(e.deltaY) * ROW * 3));
      sync();
    });
    sb.querySelector(".up").addEventListener("click", () => ((top = Math.max(0, top - ROW)), sync()));
    sb.querySelector(".down").addEventListener("click", () => ((top = Math.min(max, top + ROW)), sync()));
    draw();
    return [
      ...monitor(),
      k.text(252, 327, "Select a background picture or HTML document as Wallpaper:"),
      k.sunken(252, 343, 272, 112),
      list,
      sb,
      k.btn(534, 343, 75, 23, "Browse...", {
        onclick: () => ctx.dialogs.message("Browse is not available in this virtual desktop.", { title: "Browse" }),
      }),
      k.text(535, 381, "Picture Display:", { disabled: true }),
      k.combo(534, 397, 75, 20, "Center", { disabled: true }),
      k.btn(534, 430, 75, 23, "Pattern...", {
        onclick: () => ctx.dialogs.message("Patterns are not available in this virtual desktop.", { title: "Pattern" }),
      }),
    ];
  };

  /* ---------- Screen Saver ---------- */
  const screenSaver = () => {
    const none = state.saver === "none";
    return [
      ...monitor(),
      k.group(252, 304, 357, 71, "Screen Saver", 9),
      dd(261, 316, 171, 19, SAVERS.find((s) => s[0] === state.saver)?.[1] || "(None)", SAVERS, (v) => {
        state.saver = v;
        dirty();
        redraw();
      }),
      k.btn(439, 313, 75, 23, "Settings...", { disabled: none }),
      k.btn(520, 313, 75, 23, "Preview", { disabled: none, onclick: () => ctx.previewScreensaver?.(state.saver) }),
      k.check(261, 348, "Password protected", { disabled: none }),
      k.text(472, 349, "Wait:", { disabled: none }),
      spinBox(502, 345, 42, 19, state.minutes, {
        disabled: none,
        onchange: (v) => {
          state.minutes = Math.max(1, Number(v) || 1);
          dirty();
        },
      }),
      k.text(552, 349, "minutes", { disabled: none }),
      k.group(252, 385, 357, 77, "Energy saving features of monitor", 9),
      k.img(281, 396, IMG + "energy.png", 71, 43),
      k.text(369, 394, "To adjust the power settings for your monitor,\nclick Power."),
      k.btn(519, 435, 75, 23, "Power...", { onclick: () => ctx.launch?.("control", { page: "power" }) }),
    ];
  };

  /* ---------- Appearance ---------- */
  const appearance = () => [
    pos(el("div", { class: "dp-screen", style: { background: state.color } }), 253, 122, 355, 192),
    k.img(253, 122, IMG + "appearance.png", 355, 192),
    k.text(252, 325, "Scheme:"),
    dd(252, 342, 195, 20, state.scheme, Object.keys(schemes).map((n) => [n, n]), (v) => {
      state.scheme = v;
      state.color = schemes[v]?.desktopColor || state.color;
      dirty();
      redraw();
    }),
    k.btn(454, 341, 75, 23, "Save As..."),
    k.btn(534, 341, 75, 23, "Delete"),
    k.text(252, 372, "Item:"),
    k.combo(252, 388, 195, 20, "Desktop"),
    k.text(454, 372, "Size:", { disabled: true }),
    spinBox(454, 388, 55, 20, "", { disabled: true }),
    k.text(517, 372, "Color:"),
    colorBtn(517, 388, state.color),
    k.text(566, 372, "Color 2:", { disabled: true }),
    colorBtn(566, 388, null),
    k.text(252, 420, "Font:", { disabled: true }),
    k.combo(252, 436, 195, 20, "", { disabled: true }),
    k.text(454, 420, "Size:", { disabled: true }),
    k.combo(454, 436, 55, 20, "", { disabled: true }),
    k.text(517, 420, "Color:", { disabled: true }),
    colorBtn(517, 436, null),
    k.btn(565, 436, 21, 20, "B", { disabled: true }),
    k.btn(587, 436, 20, 20, "I", { disabled: true }),
  ];

  /* ---------- Web ---------- */
  const web = () => [
    ...monitor(),
    k.check(252, 325, "Show Web content on my Active Desktop"),
    gray(k.sunken(252, 343, 272, 112)),
    k.check(258, 349, "My Current Home Page", { checked: true }),
    k.btn(534, 343, 75, 23, "New...", { disabled: true }),
    k.btn(534, 372, 75, 23, "Delete", { disabled: true }),
    k.btn(534, 401, 75, 23, "Properties", { disabled: true }),
  ];

  /* ---------- Effects ---------- */
  const effects = () => {
    const ic = (x, name, file, label, y2) => [
      k.img(x, 145, IMG + file, 32, 32),
      ...label.split("\n").map((t, i) => k.text(x - 21, 182 + i * 13, t, { w: 74, align: "center" })),
    ];
    const clip = el("div", { class: "dp-fxclip" });
    pos(clip, 266, 143, 328, 71);
    return [
      k.group(252, 128, 355, 146, "Desktop icons", 9),
      k.sunken(264, 141, 332, 90),
      clip,
      ...ic(287, "", "fx-mycomputer.png", "My Computer"),
      ...ic(362, "", "fx-mydocs.png", "My Documents"),
      ...ic(437, "", "fx-network.png", "My Network\nPlaces"),
      ...ic(515, "", "fx-recycle.png", "Recycle Bin\n(full)"),
      hscroll(266, 214, 328, 280),
      k.btn(408, 238, 90, 23, "Change Icon..."),
      k.btn(505, 238, 90, 23, "Default Icon"),
      k.group(252, 291, 355, 153, "Visual effects", 9),
      k.check(265, 307, "Use transition effects for menus and tooltips", {
        checked: state.transitions,
        onchange: (v) => ((state.transitions = v), dirty()),
      }),
      dd(501, 303, 96, 20, state.fade, [["Fade effect", "Fade effect"], ["Scroll effect", "Scroll effect"]], (v) => {
        state.fade = v;
        dirty();
        redraw();
      }),
      k.check(265, 330, "Smooth edges of screen fonts", { checked: state.smooth, onchange: (v) => ((state.smooth = v), dirty()) }),
      k.check(265, 352, "Use large icons", { checked: state.large, onchange: (v) => ((state.large = v), dirty()) }),
      k.check(265, 375, "Show icons using all possible colors", { checked: state.allColors, onchange: (v) => ((state.allColors = v), dirty()) }),
      k.check(265, 398, "Show window contents while dragging", { checked: state.drag, onchange: (v) => ((state.drag = v), dirty()) }),
      k.check(265, 421, "Hide keyboard navigation indicators until I use the Alt key", {
        checked: state.hideKeys,
        onchange: (v) => ((state.hideKeys = v), dirty()),
      }),
    ];
  };

  /* ---------- Settings ---------- */
  const settingsTab = () => [
    ...monitor(k.img(353, 142, IMG + "screen-settings.png", 154, 114)),
    k.text(252, 316, "Display:"),
    k.text(252, 331, "Default Monitor on VBE Miniport - Standard PCI Graphics Adapter (VGA)"),
    k.group(252, 365, 173, 62, "Colors", 9),
    dd(261, 376, 155, 20, state.colors, COLORS.map((c) => [c, c]), (v) => {
      state.colors = v;
      dirty();
      redraw();
    }),
    k.img(261, 404, IMG + "colorbar.png", 155, 15),
    k.group(435, 365, 173, 62, "Screen area", 9),
    k.text(444, 376, "Less"),
    k.text(570, 376, "More"),
    k.img(480, 372, IMG + "slider.png", 80, 36),
    k.text(435, 408, `${screen.width || 1024} by ${screen.height || 768} pixels`, { w: 173, align: "center" }),
    k.btn(433, 438, 84, 23, "Troubleshoot...", { onclick: () => ctx.launch?.("help") }),
    k.btn(523, 438, 84, 23, "Advanced...", { onclick: () => ctx.launch?.("systeminfo") }),
  ];

  const apply = () => {
    const wp = state.wallpaperName === "(None)" || WALLPAPER_FILES[state.wallpaperName] ? "none" : WALLPAPERS.find((x) => x[0] === state.wallpaperName)?.[1] === "tile" ? "pattern" : "waves";
    S.patch({
      wallpaper: wp,
      wallpaperName: state.wallpaperName,
      desktopColor: state.color,
      scheme: state.scheme,
      screensaver: state.saver,
      screenSaverMinutes: state.minutes,
      animations: state.transitions,
      fxLargeIcons: state.large,
      dragFullWindows: state.drag,
    });
    applyTheme?.(S);
  };

  tc = k.tabs({
    top: 92,
    pane: [237, 111, 385, 358],
    active,
    tabs: [
      { label: "Background", x: 240, w: 69, content: background },
      { label: "Screen Saver", x: 309, w: 77, content: screenSaver },
      { label: "Appearance", x: 386, w: 70, content: appearance },
      { label: "Web", x: 456, w: 41, content: web },
      { label: "Effects", x: 497, w: 46, content: effects },
      { label: "Settings", x: 543, w: 52, content: settingsTab },
    ].map((t, i) => ({ ...t, content: () => ((active = i), t.content()) })),
  });
  w.place(tc, sheetButtons(w, k, { ok: apply, apply, y: 476, xs: [386, 467, 548] }));
  return w;
}
