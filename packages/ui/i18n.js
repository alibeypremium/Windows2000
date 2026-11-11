// Runtime interface language (Turkish / English). English text stays in the source code; when the language is
// Turkish every text node and tooltip is looked up in the dictionary (packages/ui/tr/*.js) as it appears.
// Originals are remembered so switching back to English restores everything. Unknown strings stay English.
import { DICT, RULES } from "./tr/index.js";

let lang = "tr", settings = null, observer = null;
const textRec = new WeakMap(), attrRec = new WeakMap();
const ATTRS = ["title", "placeholder", "aria-label", "alt"];
const SKIP = "script,style,textarea,input,canvas,iframe,[contenteditable],[contenteditable] *,.no-i18n,.no-i18n *,[translate=no],[translate=no] *,.term-output,.term-output *";
export const misses = new Set();
const norm = (s) => s.replace(/&(?=[A-Za-z0-9])/g, "");

function lookupLine(line) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(line), core = m[2];
  if (!core || !/[A-Za-z]/.test(core)) return null;
  const c = norm(core);
  let r = DICT.get(c);
  if (r == null) {
    const e = /(\.\.\.|…|:)$/.exec(c);
    if (e) { const b = DICT.get(c.slice(0, -e[1].length).trimEnd()); if (b != null) r = b + e[1]; }
  }
  if (r == null) for (const [rx, fn] of RULES) { const x = rx.exec(c); if (x) { const v = fn(...x.slice(1)); if (v != null) { r = v; break; } } }
  return r == null ? null : m[1] + r + m[3];
}
export function t(s) {
  if (lang !== "tr" || typeof s !== "string") return s;
  const whole = lookupLine(s);
  if (whole != null) return whole;
  if (!s.includes("\n")) return s;
  let hit = false;
  const out = s.split("\n").map((l) => { const r = lookupLine(l); if (r != null) { hit = true; return r; } return l; }).join("\n");
  return hit ? out : s;
}
function doText(n) {
  const v = n.nodeValue, rec = textRec.get(n);
  if (rec && v === rec.t) return;
  const r = t(v);
  if (r !== v) { textRec.set(n, { o: v, t: r }); n.nodeValue = r; }
  else { if (rec) textRec.delete(n); if (misses && /[A-Za-z]{3}/.test(v)) misses.add(v.trim()); }
}
function doAttrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a);
    if (v == null) continue;
    let m = attrRec.get(el);
    const rec = m?.get(a);
    if (rec && v === rec.t) continue;
    const r = t(v);
    if (r !== v) { if (!m) attrRec.set(el, (m = new Map())); m.set(a, { o: v, t: r }); el.setAttribute(a, r); }
    else if (rec) m.delete(a);
  }
}
// Labels split by an accelerator underline (<u>N</u>ame:) are translated as one whole label.
const mnRec = new WeakMap();
function doMn(el) {
  if (mnRec.has(el) || !el.querySelector?.(":scope > u")) return false;
  for (const c of el.childNodes) if (c.nodeType !== 3 && c.nodeName !== "U") return false;
  const label = el.textContent, r = t(label);
  if (r === label) return false;
  mnRec.set(el, { kids: [...el.childNodes], tr: r });
  el.replaceChildren(document.createTextNode(r));
  return true;
}
function walk(root) {
  if (root.nodeType === 3) { const p = root.parentElement; if (!p?.closest(SKIP)) { if (p && doMn(p)) return; doText(root); } return; }
  if (root.nodeType !== 1 || root.matches?.(SKIP) || root.closest?.(SKIP)) return;
  if (doMn(root)) return;
  doAttrs(root);
  for (const c of root.childNodes) walk(c);
}
function restore(root) {
  if (root.nodeType === 3) { const r = textRec.get(root); if (r && root.nodeValue === r.t) root.nodeValue = r.o; textRec.delete(root); return; }
  if (root.nodeType !== 1) return;
  const mr = mnRec.get(root);
  if (mr) { if (root.textContent === mr.tr) root.replaceChildren(...mr.kids); mnRec.delete(root); }
  const m = attrRec.get(root);
  if (m) { for (const [a, r] of m) if (root.getAttribute(a) === r.t) root.setAttribute(a, r.o); attrRec.delete(root); }
  for (const c of root.childNodes) restore(c);
}
function start() {
  if (observer) return;
  observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "childList") m.addedNodes.forEach((n) => walk(n));
      else if (m.type === "characterData") { if (!m.target.parentElement?.closest(SKIP)) doText(m.target); }
      else if (m.type === "attributes") { if (!m.target.closest?.(SKIP)) doAttrs(m.target); }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  walk(document.body);
}
export const getLang = () => lang;
// Label with an accelerator-underlined first letter: translated labels are used whole (no underline).
export function mn(label, doc = document) {
  const tr = t(label);
  if (tr !== label) return [tr];
  const u = doc.createElement("u"); u.textContent = label[0];
  return [u, label.slice(1)];
}
export function setLang(l) {
  if (l === lang) return;
  lang = l;
  settings?.set("lang", l);
  document.documentElement.lang = l;
  if (l === "tr") { start(); walk(document.body); }
  else { observer?.disconnect(); observer = null; restore(document.body); }
  settings?.bus?.emit?.("lang:change", l);
}
export function initI18n(s) {
  settings = s;
  lang = s.get("lang") === "en" ? "en" : "tr";
  document.documentElement.lang = lang;
  if (lang === "tr") start();
  window.__i18n = { t, misses, setLang, getLang };
}
