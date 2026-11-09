/**
 * Small toolkit for dialogs laid out at fixed pixel positions measured from
 * Windows 2000 reference screenshots. Coordinates are relative to the outer
 * top-left corner of the window (the same origin the screenshots use after
 * subtracting the window position).
 */
import { el, button, icon } from "../ui/index.js";

const at = (x, y, w, h) => {
  const s = { left: x + "px", top: y + "px" };
  if (w != null) s.width = w + "px";
  if (h != null) s.height = h + "px";
  return s;
};

export const text = (x, y, str, { bold, disabled, w, align } = {}) =>
  el("div", {
    class: "rk-text" + (disabled ? " disabled" : "") + (bold ? " bold" : ""),
    style: { ...at(x, y, w), textAlign: align || "left" },
    text: str,
  });

export const link = (x, y, str, onclick) => {
  const n = el("span", {
    class: "rk-link",
    style: at(x, y),
    role: "link",
    tabindex: 0,
    text: str,
  });
  n.addEventListener("click", onclick);
  return n;
};

export const group = (x, y, w, h, label, labelX = 9) => [
  el("div", { class: "rk-group", style: at(x, y, w, h) }),
  label
    ? el("div", {
        class: "rk-group-label",
        style: { left: x + labelX + "px", top: y - 6 + "px" },
        text: label,
      })
    : null,
];

export const check = (
  x,
  y,
  label,
  { checked = false, disabled = false, onchange, kind = "check" } = {},
) => {
  const box = el("span", { class: "box" }),
    n = el(
      "div",
      {
        class:
          `rk-${kind}` + (checked ? " checked" : "") + (disabled ? " disabled" : ""),
        style: at(x, y),
        role: kind === "check" ? "checkbox" : "radio",
        "aria-checked": checked,
        tabindex: disabled ? -1 : 0,
      },
      box,
      el("span", { text: label }),
    );
  if (!disabled) {
    n.addEventListener("click", () => {
      if (kind === "radio") {
        if (checked) return;
        checked = true;
      } else checked = !checked;
      n.classList.toggle("checked", checked);
      n.setAttribute("aria-checked", checked);
      onchange?.(checked, n);
    });
    n.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        e.preventDefault();
        n.click();
      }
    });
  }
  return n;
};
export const radio = (x, y, label, o = {}) =>
  check(x, y, label, { ...o, kind: "radio" });

export const btn = (
  x,
  y,
  w,
  h,
  label,
  { def = false, disabled = false, onclick } = {},
) => {
  const b = button(
    label,
    () => {
      if (!b.classList.contains("disabled")) onclick?.();
    },
    {
      class:
        "rk-btn" + (def ? " default-button" : "") + (disabled ? " disabled" : ""),
      style: at(x, y, w, h),
    },
  );
  return b;
};

export const combo = (x, y, w, h, label, { disabled = false } = {}) =>
  el(
    "div",
    {
      class: "rk-combo" + (disabled ? " disabled" : ""),
      style: at(x, y, w, h),
    },
    label,
    el("span", { class: "drop" }),
  );

export const sunken = (x, y, w, h, ...children) =>
  el("div", { class: "rk-sunken", style: at(x, y, w, h) }, ...children);

export const img = (x, y, src, w, h) =>
  el("img", {
    class: "rk-img",
    style: at(x, y, w, h),
    src,
    alt: "",
    draggable: "false",
  });

export const sprite = (x, y, name, size = 32) => {
  const i = icon(name, size);
  i.classList.add("rk-img");
  Object.assign(i.style, at(x, y));
  return i;
};

/**
 * Tab control. `tabs` is [{ label, x, w, content }] where x/w are screen
 * coordinates of each tab header; `pane` is the page rectangle and `top` the
 * y of the header row. content() returns an array of positioned elements.
 */
export function tabControl({ top, headerH = 21, pane, tabs, active = 0 }) {
  const root = el("div", { class: "rk-pane" }),
    strip = el("div", { class: "rk-pane" }),
    body = el("div", { class: "rk-pane" });
  const show = (i) => {
    active = i;
    strip.replaceChildren();
    const [px, py, pw, ph] = pane;
    strip.append(
      el("div", { class: "rk-tabpane", style: at(px, py, pw, ph) }),
    );
    tabs.forEach((t, j) => {
      const on = j === i,
        grow = on ? 2 : 0;
      const tab = el("div", {
        class: "rk-tab" + (on ? " active" : ""),
        style: {
          left: t.x - grow + "px",
          top: top + (on ? 0 : 2) + "px",
          width: t.w + grow * 2 + "px",
          height: headerH + (on ? 1 : 0) + "px",
          paddingTop: on ? "3px" : "2px",
        },
        role: "tab",
        text: t.label,
      });
      tab.addEventListener("click", () => show(j));
      strip.append(tab);
    });
    // hide the pane's top border beneath the active tab
    const t = tabs[i];
    strip.append(
      el("div", {
        style: {
          position: "absolute",
          left: t.x - 1 + "px",
          top: py + "px",
          width: t.w + 2 + "px",
          height: "2px",
          background: "var(--face)",
          zIndex: 3,
        },
      }),
    );
    body.replaceChildren(
      ...[].concat(tabs[i].content()).flat(Infinity).filter(Boolean),
    );
  };
  root.append(strip, body);
  show(active);
  root.select = show;
  return root;
}

/** Create a window whose client area is an absolutely positioned layer. */
export function refWindow(ctx, opts) {
  const w = ctx.wm.create({
    dialog: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    className: "ref-dialog",
    ...opts,
  });
  const layer = el("div", { class: "rk-layer" });
  w.el.append(layer);
  w.layer = layer;
  w.place = (...nodes) => layer.append(...nodes.flat(Infinity).filter(Boolean));
  return w;
}

/** Offset every builder so callers can use screenshot (screen) coordinates. */
export const kit = (ox, oy) => ({
  text: (x, y, ...a) => text(x - ox, y - oy, ...a),
  link: (x, y, ...a) => link(x - ox, y - oy, ...a),
  group: (x, y, ...a) => group(x - ox, y - oy, ...a),
  check: (x, y, ...a) => check(x - ox, y - oy, ...a),
  radio: (x, y, ...a) => radio(x - ox, y - oy, ...a),
  btn: (x, y, ...a) => btn(x - ox, y - oy, ...a),
  combo: (x, y, ...a) => combo(x - ox, y - oy, ...a),
  sunken: (x, y, ...a) => sunken(x - ox, y - oy, ...a),
  img: (x, y, ...a) => img(x - ox, y - oy, ...a),
  sprite: (x, y, ...a) => sprite(x - ox, y - oy, ...a),
  vscroll: (x, y, ...a) => vscroll(x - ox, y - oy, ...a),
  tabs: (o) =>
    tabControl({
      ...o,
      top: o.top - oy,
      pane: [o.pane[0] - ox, o.pane[1] - oy, o.pane[2], o.pane[3]],
      tabs: o.tabs.map((t) => ({ ...t, x: t.x - ox })),
    }),
});

/** Static-looking vertical scroll bar (Windows 2000 style) at screen coords. */
export const vscroll = (x, y, h, thumbTop, thumbH, { disabled = false } = {}) => {
  const n = el(
    "div",
    { class: "rk-vscroll" + (disabled ? " disabled" : "") },
    el("span", { class: "sb up" }),
    el("span", { class: "sb down" }),
    disabled ? null : el("span", { class: "thumb", style: { top: thumbTop + "px", height: thumbH + "px" } }),
  );
  Object.assign(n.style, at(x, y, 16, h));
  return n;
};
