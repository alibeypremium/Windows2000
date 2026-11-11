// Turkish layer for the real Windows 2000 help pages (assets/help/**/*.htm).
// Pages stay English on disk; leaf text blocks are replaced at view time from assets/help-tr/<book>.json.
const BLOCK = "p,div,li,h1,h2,h3,h4,h5,h6,td,th,dt,dd,pre,blockquote,caption,center,title";
const INLINE = new Set(["A", "B", "I", "EM", "STRONG", "SPAN", "FONT", "CODE", "TT", "U", "SUP", "SUB", "SMALL", "BIG", "CITE", "VAR", "KBD", "SAMP"]);
export const norm = (s) => s.replace(/\s+/g, " ").trim();
export const hasText = (k) => k.length > 2 && /[A-Za-z]{3}/.test(k);
export function leafBlocks(doc) {
  return [...doc.querySelectorAll(BLOCK)].filter((e) => !e.querySelector(BLOCK) && hasText(norm(e.textContent)));
}
export const inlineKids = (e) => [...e.children].filter((c) => INLINE.has(c.tagName) && norm(c.textContent));
// text with inline elements marked [[...]] (what the translator sees)
export function marked(e) {
  return norm([...e.childNodes].map((n) => (n.nodeType === 3 ? n.data : n.nodeType === 1 && inlineKids(e).includes(n) ? "[[" + norm(n.textContent) + "]]" : n.textContent || "")).join(""));
}
export function applyTr(doc, dict) {
  for (const e of leafBlocks(doc)) {
    const tr = dict[norm(e.textContent)];
    if (!tr) continue;
    const kids = inlineKids(e);
    const parts = tr.split(/\[\[(.*?)\]\]/s);
    if (kids.length && (parts.length - 1) / 2 === kids.length) {
      const nodes = [];
      parts.forEach((p, i) => {
        if (i % 2) {
          const k = kids[(i - 1) / 2];
          k.textContent = p;
          nodes.push(k);
        } else if (p) nodes.push(doc.createTextNode(p));
      });
      e.replaceChildren(...nodes);
    } else if (kids.length === 1 && norm(kids[0].textContent) === norm(e.textContent) && !tr.includes("[[")) {
      kids[0].textContent = tr;
      e.replaceChildren(kids[0]);
    } else e.textContent = tr.replace(/\[\[|\]\]/g, "");
  }
}
const cache = {};
export const loadBook = (book) => (cache[book] ??= fetch("/assets/help-tr/" + book + ".json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
export const loadNames = () => (cache.__names ??= fetch("/assets/help-tr/names.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
export const nk = (s) => norm(String(s).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&"));
