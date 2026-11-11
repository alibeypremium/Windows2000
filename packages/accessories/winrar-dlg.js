// Renders the real WinRAR 4.11 dialog templates (extracted from WinRAR.exe RT_DIALOG resources into
// assets/ui/winrar/rar411/dialogs.json) as absolutely positioned HTML controls, in dialog units.
import { t as trText } from "../ui/i18n.js";
import { el } from "../ui/index.js";

const BASE = new URL("../../assets/ui/winrar/rar411/", import.meta.url).href;
let cache = null;
export const loadRar = async () => (cache ||= Object.fromEntries(await Promise.all(["dialogs", "menus", "strings"].map(async (n) => [n, await (await fetch(BASE + n + ".json")).json()]))));
export const RAR_BASE = BASE;

const DX = 1.5, DY = 1.625; // MS Sans Serif 8pt dialog units -> pixels
const px = (v, k) => Math.round(v * k);
const WS_VISIBLE = 0x10000000, WS_DISABLED = 0x08000000, WS_GROUP = 0x20000;
const mnemonic = (t) => {
  const span = document.createDocumentFragment();
  const s0 = String(t || ""), s = (() => { const p = s0.replace(/&(?=[^&])/g, ""), r = trText(p); return r !== p ? r : s0; })();
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "&") {
      if (s[i + 1] === "&") { buf += "&"; i++; continue; }
      if (buf) span.append(buf), (buf = "");
      const u = document.createElement("u"); u.textContent = s[i + 1] || ""; span.append(u); i++;
    } else buf += s[i];
  }
  if (buf) span.append(buf);
  return span;
};
const plain = (t) => String(t || "").replace(/&&/g, "\0").replace(/&/g, "").replace(/\0/g, "&");

/**
 * Build one dialog template. Returns { root, byId(id), all, title, width, height }.
 * opts.skip: ids not to render. opts.offset: [dx, dy] in dialog units (used for tab pages).
 */
export function buildDialog(spec, opts = {}) {
  const root = el("div", { class: "rd-root" });
  root.style.width = px(spec.w, DX) + "px";
  root.style.height = px(spec.h, DY) + "px";
  const map = new Map();
  const groups = [];
  let radioGroup = 0;
  spec.items.forEach((it, idx) => {
    if (opts.skip?.includes(it.id)) return;
    const st = it.style, cls = it.cls;
    let c;
    const kind = st & 0xf;
    if (cls === "button") {
      if (kind === 7) {
        c = el("div", { class: "rd-group" }, it.text ? el("span", { class: "rd-legend" }, mnemonic(it.text)) : null);
      } else if (kind === 2 || kind === 3 || kind === 5 || kind === 6) {
        const input = el("input", { type: "checkbox" });
        c = el("label", { class: "rd-check" }, input, el("span", {}, mnemonic(it.text)));
        c.input = input;
      } else if (kind === 4 || kind === 9) {
        if (st & WS_GROUP) radioGroup++;
        const input = el("input", { type: "radio", name: `rg${opts.uid || 0}-${radioGroup}` });
        c = el("label", { class: "rd-check" }, input, el("span", {}, mnemonic(it.text)));
        c.input = input;
      } else if (st & 0x00000040 || (st & 0xf00) === 0x300 || (st & 0x2000) ) {
        c = el("button", { class: "rd-icon-btn", type: "button" });
      } else {
        c = el("button", { type: "button", class: kind === 1 ? "default-button" : "" }, mnemonic(it.text));
      }
    } else if (cls === "static") {
      const ss = st & 0x1f;
      if (typeof it.text === "object") {
        c = el("div", { class: "rd-static rd-iconbox" });
        c.dataset.icon = it.text.icon;
      } else if (ss === 0x10 || ss === 0x11 || ss === 0x12) {
        c = el("div", { class: "rd-etched " + (ss === 0x11 ? "v" : ss === 0x12 ? "f" : "h") });
      } else if (ss === 7 || ss === 8 || ss === 9) {
        c = el("div", { class: "rd-frame" });
      } else if (ss === 4 || ss === 5 || ss === 6) {
        c = el("div", { class: "rd-rect r" + ss });
      } else {
        c = el("div", { class: "rd-static " + (ss === 1 ? "c" : ss === 2 ? "r" : "") + (st & 0x80 ? " nopre" : "") }, mnemonic(it.text));
        c.style.whiteSpace = String(it.text).includes("\n") ? "pre-line" : "normal";
      }
    } else if (cls === "edit") {
      if (st & 0x4) { c = el("textarea", { class: "rd-edit", readonly: !!(st & 0x800) }); }
      else c = el("input", { class: "rd-edit", type: st & 0x20 ? "password" : "text", readonly: !!(st & 0x800) });
      if (typeof it.text === "string") c.value = it.text;
      if (st & 0x800) c.classList.add("ro");
    } else if (cls === "combobox") {
      const sel = (st & 3) === 3;
      c = sel ? el("select", { class: "rd-combo" }) : el("div", { class: "rd-combo-edit" }, el("input", { type: "text" }), el("select", { tabindex: "-1" }));
      c.isDrop = !sel;
    } else if (cls === "RichEdit20W") {
      c = el("div", { class: "rd-rich" });
    } else if (cls === "msctls_progress32") {
      c = el("div", { class: "rd-progress" }, el("div", { class: "rd-progress-fill" }));
    } else if (cls === "msctls_updown32") {
      c = el("div", { class: "rd-updown" }, el("span", { text: "▲" }), el("span", { text: "▼" }));
    } else if (cls === "SysListView32") {
      c = el("div", { class: "rd-list" });
    } else if (cls === "SysTreeView32") {
      c = el("div", { class: "rd-tree" });
    } else {
      c = el("div", { class: "rd-misc" });
    }
    c.classList.add("rd-c");
    c.dataset.id = it.id;
    c.style.left = px(it.x + (opts.offset?.[0] || 0), DX) + "px";
    c.style.top = px(it.y + (opts.offset?.[1] || 0), DY) + "px";
    c.style.width = px(it.w, DX) + "px";
    c.style.height = (cls === "combobox" ? Math.min(px(it.h, DY), 21) : px(it.h, DY)) + "px";
    c.style.zIndex = String(kind === 7 && cls === "button" ? 0 : 1);
    if (!(st & WS_VISIBLE)) c.hidden = true;
    const dis = !!(st & WS_DISABLED);
    if (dis) {
      c.classList.add("disabled");
      c.querySelectorAll("input,select,textarea").forEach((i) => (i.disabled = true));
      if (c.tagName === "BUTTON") c.disabled = true;
    }
    c.spec = it;
    root.append(c);
    if (it.id !== 65535 && it.id !== -1) {
      const arr = map.get(it.id) || [];
      arr.push(c);
      map.set(it.id, arr);
    }
  });
  const byId = (id) => map.get(id)?.[0] || null;
  return { root, byId, all: map, title: spec.title, width: spec.w, height: spec.h, spec };
}

/** Value helpers for a controls group (check/radio/edit/combobox) addressed by control id. */
export const ctl = {
  checked(c, v) { const i = c?.input; if (!i) return null; if (v !== undefined) i.checked = !!v; return i.checked; },
  value(c, v) {
    if (!c) return "";
    const i = c.tagName === "INPUT" || c.tagName === "TEXTAREA" || c.tagName === "SELECT" ? c : c.querySelector("input");
    if (!i) return "";
    if (v !== undefined) i.value = v;
    return i.value;
  },
  options(c, list, selected) {
    const s = c?.tagName === "SELECT" ? c : c?.querySelector("select");
    if (!s) return;
    s.replaceChildren(...list.map((o) => el("option", { text: o })));
    if (c.isDrop && !s.dataset.wired) { s.dataset.wired = "1"; s.selectedIndex = -1; s.addEventListener("change", () => { c.querySelector("input").value = s.value; }); }
    if (selected != null) { if (c.isDrop) c.querySelector("input").value = list[selected] ?? selected; else s.selectedIndex = typeof selected === "number" ? selected : list.indexOf(selected); }
  },
  setEnabled(c, on) { if (!c) return; c.classList.toggle("disabled", !on); c.querySelectorAll("input,select,textarea").forEach((i) => (i.disabled = !on)); if (c.tagName === "BUTTON") c.disabled = !on; },
};
export { plain, mnemonic };

/** Make a tab control from dialog specs. Returns {root, pages:[{spec, dlg}] , select(i)}. */
export function buildTabs(specs, { labels, width, height, uid = 0 } = {}) {
  const pw = Math.max(...specs.map((s) => s.w)), ph = Math.max(...specs.map((s) => s.h));
  const root = el("div", { class: "rd-tabs" });
  const strip = el("div", { class: "rd-tabstrip" });
  const body = el("div", { class: "rd-tabbody" });
  const pages = specs.map((s, i) => buildDialog(s, { uid: uid * 10 + i }));
  pages.forEach((p) => { p.root.hidden = true; body.append(p.root); });
  const tabs = specs.map((s, i) => { const b = el("button", { type: "button", class: "rd-tab" }, mnemonic(labels?.[i] ?? s.title)); b.addEventListener("click", () => select(i)); strip.append(b); return b; });
  let current = 0;
  const select = (i) => { current = i; pages.forEach((p, k) => (p.root.hidden = k !== i)); tabs.forEach((b, k) => b.classList.toggle("on", k === i)); };
  select(0);
  root.append(strip, body);
  root.style.width = px(width ?? pw, DX) + "px";
  body.style.height = px(height ?? ph, DY) + "px";
  return { root, pages, select, get current() { return current; } };
}

/** Create a modal window around built content and size the window to the content. */
export function openDlgWindow(ctx, { title, content, buttons = null, resizable = false }) {
  const d = ctx.wm.create({ title, noIcon: true, width: 400, height: 300, dialog: true, resizable, minimizable: false, maximizable: false, appId: "dialog" });
  const wrap = el("div", { class: "rd-wrap" }, content);
  if (buttons) wrap.append(buttons);
  d.setContent(wrap);
  // measure chrome (window size - content size) and fit
  requestAnimationFrame(() => {
    const wr = d.el.getBoundingClientRect(), host = wrap.parentElement;
    const cw = wrap.offsetWidth, ch = wrap.offsetHeight;
    const dw = wr.width - host.clientWidth, dh = wr.height - host.clientHeight;
    d.geometry = { ...(d.geometry || {}), width: Math.round(cw + dw), height: Math.round(ch + dh) };
    ctx.wm.applyGeometry?.(d);
  });
  return d;
}
