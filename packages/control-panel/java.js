/** Java(TM) Plug-in Control Panel (Swing "Metal" look) from reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow } from "./refkit.js";

const OX = 312,
  OY = 175;
const TABS = [
  ["Basic", 7, 42],
  ["Advanced", 50, 66],
  ["Proxies", 118, 53],
  ["Cache", 173, 45],
  ["Certificates", 221, 75],
  ["About", 298, 41],
];

export function openJavaPlugin(ctx) {
  const w = refWindow(ctx, {
    title: "Java(TM) Plug-in Control Panel",
    width: 418,
    height: 342,
    appId: "control",
    minimizable: true,
    maximizable: false,
    x: OX,
    y: OY,
  });
  w.setIcon?.("cpJava");
  const S = ctx.settings;
  const state = { enable: S.get("javaEnable") !== false, console: false, recycle: true, exception: false, params: S.get("javaParams") || "" };
  const root = el("div", { class: "jv-root" });
  const body = el("div", { class: "jv-body" });
  const at = (n, x, y, wd, h) => (Object.assign(n.style, { left: x + "px", top: y + "px", width: wd ? wd + "px" : "", height: h ? h + "px" : "" }), n);
  const apply = el("button", { class: "jv-btn", disabled: true, text: "Apply" });
  const reset = el("button", { class: "jv-btn bold", text: "Reset" });
  const dirty = () => (apply.disabled = false);
  const check = (x, y, label, key) => {
    const n = el("div", { class: "jv-check" + (state[key] ? " on" : "") }, el("span", { class: "b" }), el("span", { text: label }));
    n.addEventListener("click", () => {
      state[key] = !state[key];
      n.classList.toggle("on", state[key]);
      dirty();
    });
    return at(n, x, y);
  };
  const text = (x, y, t, cls = "") => at(el("div", { class: "jv-text " + cls, text: t }), x, y);
  const input = (x, y, wd, h, key, value) => {
    const i = el("input", { class: "jv-field", value, spellcheck: "false" });
    i.addEventListener("input", () => ((state[key] = i.value), dirty()));
    return at(i, x, y, wd, h);
  };
  const pages = {
    Basic: () => [
      check(137, 76, "Enable Java Plug-in", "enable"),
      check(137, 106, "Show Java Console", "console"),
      check(137, 136, "Recycle Classloader", "recycle"),
      check(137, 166, "Show Exception Dialog Box", "exception"),
      text(0, 210, "Java Runtime Parameters", "purple center"),
      input(36, 232, 347, 24, "params", state.params),
    ],
    Advanced: () => [
      text(30, 70, "Java Run Time Environment", "bold"),
      at(el("div", { class: "jv-box", text: "JRE 1.3.1_01 in C:\\Program Files\\JavaSoft\\JRE\\1.3.1_01" }), 30, 90, 350, 22),
      text(30, 130, "Java Runtime Parameters", "purple"),
      input(30, 150, 350, 24, "params", state.params),
    ],
    Proxies: () => [
      check(30, 70, "Use browser settings", "recycle"),
      at(el("div", { class: "jv-box tall", text: "Protocol    Proxy Address    Port" }), 30, 100, 350, 100),
    ],
    Cache: () => [
      check(30, 70, "Enable Caching", "console"),
      text(30, 110, "Location:", "bold"),
      at(el("div", { class: "jv-box", text: "C:\\Documents and Settings\\Administrator\\Application Data\\Sun\\Java\\jpi_cache" }), 30, 130, 350, 22),
      text(30, 170, "Maximum size: Unlimited", "bold"),
    ],
    Certificates: () => [
      at(el("div", { class: "jv-box tall", text: "Signed Applet    Secure Site" }), 30, 70, 350, 130),
      ...["Import", "Export", "Remove", "Details"].map((l, i) => at(el("button", { class: "jv-btn", text: l, disabled: i > 1 }), 30 + i * 88, 215, 80, 27)),
    ],
    About: () => [
      text(30, 80, "Java(TM) Plug-in Control Panel", "bold"),
      text(30, 100, "Version 1.3.1_01"),
      text(30, 130, "Copyright 1995-2001 Sun Microsystems, Inc. All rights reserved."),
    ],
  };
  let active = "Basic";
  const show = (name) => {
    active = name;
    root.replaceChildren(el("div", { class: "jv-bg" }));
    root.append(at(el("div", { class: "jv-pane" }), 3, 47, 414, 253));
    for (const [label, x, wd] of TABS) {
      const t = el("div", { class: "jv-tab" + (label === name ? " on" : ""), text: label });
      at(t, x, label === name ? 28 : 29, wd, label === name ? 20 : 19);
      t.addEventListener("click", () => show(label));
      root.append(t);
    }
    body.replaceChildren(...pages[name]());
    root.append(body);
    root.append(at(el("div", { class: "jv-sep" }), 3, 300, 414, 0), at(apply, 142, 305, 63, 27), at(reset, 212, 305, 65, 27));
  };
  reset.addEventListener("click", () => {
    Object.assign(state, { enable: true, console: false, recycle: true, exception: false, params: "" });
    show(active);
  });
  apply.addEventListener("click", () => {
    S.patch({ javaEnable: state.enable, javaParams: state.params });
    apply.disabled = true;
  });
  show("Basic");
  w.layer.append(root);
  return w;
}
