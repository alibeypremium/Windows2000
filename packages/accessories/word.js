// Microsoft Word 2000 re-creation. Layout (menu bar with MDI close box, shared Standard/Formatting toolbar row, rulers,
// grey workspace with a white page, view buttons, status bar) follows the user's Word 2000 reference screenshots; the toolbar
// bitmaps are cut from those screenshots. Editing uses the browser's contenteditable engine; documents are saved as Word-style HTML in .doc files.
import { el, button, menuBar, popup, icon } from "../ui/index.js";
import { basename, normalizePath, extension, DOCS, pickFiles } from "../core/index.js";
import { buildDocx, parseDocx, bytesToDataUrl, dataUrlToBytes, loadDict, isCorrect, suggest, WORD_RE } from "./word-io.js";

const IM = "/assets/ui/word/";
const svgUri = (inner) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">${inner}</svg>`);
const SVG = {
  cut: svgUri('<path d="M4.5 1l4.2 8.5M11.5 1L7.3 9.5" stroke="#000" stroke-width="1.3" fill="none"/><circle cx="5" cy="12.5" r="2.1" fill="none" stroke="#000080" stroke-width="1.5"/><circle cx="11" cy="12.5" r="2.1" fill="none" stroke="#000080" stroke-width="1.5"/>'),
  copy: svgUri('<rect x="1.5" y="1.5" width="7" height="9" fill="#fff" stroke="#000"/><rect x="6.5" y="5.5" width="8" height="9" fill="#fff" stroke="#000"/><path d="M8.5 8h4M8.5 10h4M8.5 12h4" stroke="#808080"/>'),
  paste: svgUri('<rect x="2.5" y="2.5" width="10" height="12" fill="#c08040" stroke="#000"/><rect x="5" y="1" width="5" height="3" fill="#a0a0a0" stroke="#000"/><rect x="6.5" y="6.5" width="8" height="8" fill="#fff" stroke="#000"/><path d="M8 9h5M8 11h5" stroke="#808080"/>'),
  undo: svgUri('<path d="M4 6.5h6a3.2 3.2 0 010 6.4H6" fill="none" stroke="#0000c0" stroke-width="2"/><path d="M1.5 6.5L6 2.5v8z" fill="#0000c0"/>'),
  redo: svgUri('<path d="M12 6.5H6a3.2 3.2 0 000 6.4h4" fill="none" stroke="#0000c0" stroke-width="2"/><path d="M14.5 6.5L10 2.5v8z" fill="#0000c0"/>'),
};
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const PAPERS = { Letter: [816, 1056], A4: [794, 1123], Legal: [816, 1344], A5: [559, 794] };
const TFMT = [["grid", "Table Grid"], ["none", "Table Simple (no borders)"], ["classic", "Table Classic (shaded heading)"], ["banded", "Table Columns (banded rows)"]];
const FONTS = ["Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia", "Impact", "Lucida Console", "Symbol", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const STYLES = [["Normal", "p"], ["Heading 1", "h1"], ["Heading 2", "h2"], ["Heading 3", "h3"], ["Default Paragraph Font", null]];
const ZOOMS = ["500%", "200%", "150%", "100%", "75%", "50%", "25%", "10%", "Page Width", "Whole Page", "Two Pages"];
const COLORS = ["#000000", "#993300", "#333300", "#003300", "#003366", "#000080", "#333399", "#333333", "#800000", "#ff6600", "#808000", "#008000", "#008080", "#0000ff", "#666699", "#808080", "#ff0000", "#ff9900", "#99cc00", "#339966", "#33cccc", "#3366ff", "#800080", "#969696", "#ff00ff", "#ffcc00", "#ffff00", "#00ff00", "#00ffff", "#00ccff", "#993366", "#c0c0c0"];
let docCounter = 0;

const sanitize = (html) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,link,meta,style,title,form,base").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((n) => {
    for (const a of [...n.attributes]) {
      if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    }
  });
  return doc.body.innerHTML;
};
const printable = (raw) => {
  // crude text extraction for binary .doc files: printable runs (ASCII or UTF-16LE)
  const runs = (raw.match(/[\x20-\x7e -ɏ\r\n\t]{6,}/g) || []).filter((s) => /[a-zA-Z]{3}/.test(s));
  return runs.join("\n");
};
const escapeHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const wordHtml = (title, body, meta = "") =>
  `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n<head>\n<meta http-equiv=Content-Type content="text/html; charset=utf-8">\n<meta name=ProgId content=Word.Document>\n<meta name=Generator content="Microsoft Word 9">\n${meta ? `<meta name=wd-layout content="${encodeURIComponent(meta)}">\n` : ""}<title>${escapeHtml(title)}</title>\n<style>p{margin:0}body{font:12pt "Times New Roman"}</style>\n</head>\n<body lang=EN-US>\n<div class=Section1>\n${body}\n</div>\n</body>\n</html>`;

export function openWord(ctx, { path = null } = {}) {
  const docNo = ++docCounter;
  const w = ctx.wm.create({ title: `Document${docNo} - Microsoft Word`, icon: "word", width: 1010, height: 700, x: 2, y: 2, appId: "word", className: "wd-window" });
  const st = Object.assign({ view: "print", ruler: true }, ctx.settings.get("word") || {});
  let filename = null, saved = "", zoom = 1, view = "print", overwrite = false, lastSel = null, painter = null, lastHi = "#ffff00", lastFg = "#ff0000";
  let docTitle = `Document${docNo}`;
  let PAGE_W = 816, PAGE_H = 1056, ML = 120, MR = 120, MT = 96, MB = 96, paper = "Letter", landscape = false;
  let hf = { header: "", footer: "", headerAlign: "left", footerAlign: "center" };
  let selImg = null, ready = false;
  const layoutState = () => ({ paper, landscape, ML, MR, MT, MB, hf });
  const snap = () => page.innerHTML + "\u0000" + JSON.stringify(layoutState());

  const page = el("div", { class: "wd-page", contenteditable: "true", role: "textbox", "aria-multiline": "true", "aria-label": "Document", spellcheck: "true" });
  const layer = el("div", { class: "wd-hf-layer" });
  const wrap = el("div", { class: "wd-pagewrap" }, page, layer);
  const sheet = el("div", { class: "wd-sheet" }, wrap);
  const scroller = el("div", { class: "wd-scroller" }, sheet);
  document.execCommand?.("defaultParagraphSeparator", false, "p");
  document.execCommand?.("styleWithCSS", false, true);
  page.innerHTML = "<p><br></p>";

  const note = (m, t = "Microsoft Word") => ctx.dialogs.message(m, { title: t, icon: "info" });

  // ---------- generic dialog helper ----------
  const dlg = (title, width, height, build) =>
    new Promise((resolve) => {
      const d = ctx.wm.create({ title, noIcon: true, width, height, dialog: true, resizable: false, minimizable: false, maximizable: false, appId: "dialog" });
      let fin = false;
      const done = async (v) => { if (fin) return; fin = true; d.onClose = null; await d.close(); resolve(v); };
      d.setContent(build(done, d));
      d.onClose = () => { resolve(null); return true; };
      d.el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); done(null); } });
    });
  const row = (...c) => el("div", { class: "wd-row" }, ...c);
  const sel = (opts, value, attrs = {}) => { const s = el("select", attrs, ...opts.map((o) => el("option", { value: Array.isArray(o) ? o[0] : o, text: Array.isArray(o) ? o[1] : o }))); if (value != null) s.value = value; return s; };
  const num = (v, attrs = {}) => el("input", { type: "text", value: String(v), class: "wd-num", ...attrs });
  const btns = (done, ok, okLabel = "OK") => el("div", { class: "dialog-buttons" }, button(okLabel, async () => { await done(true); setTimeout(ok, 0); }, { class: "default-button" }), button("Cancel", () => done(null)));

  // ---------- selection helpers ----------
  const inPage = (n) => n && page.contains(n);
  const saveSel = () => { const s = window.getSelection(); if (s.rangeCount && inPage(s.anchorNode)) lastSel = s.getRangeAt(0).cloneRange(); };
  const restoreSel = () => { page.focus({ preventScroll: true }); if (lastSel) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(lastSel); } };
  const fixSizes = () => {
    page.querySelectorAll("span[style*='xxx-large']").forEach((sp) => { if (/xxx-large/.test(sp.style.fontSize)) sp.style.fontSize = pendingPt + "pt"; });
    page.querySelectorAll('font[size="7"]').forEach((f) => { const sp = document.createElement("span"); sp.style.fontSize = (f.dataset.pt || f.getAttribute("data-pt") || pendingPt) + "pt"; sp.innerHTML = f.innerHTML; f.replaceWith(sp); });
    page.querySelectorAll("font[face]").forEach((f) => { const sp = document.createElement("span"); sp.style.fontFamily = f.getAttribute("face"); sp.innerHTML = f.innerHTML; f.replaceWith(sp); });
  };
  let pendingPt = 12;
  const run = (cmd, val = null) => { restoreSel(); document.execCommand(cmd, false, val); fixSizes(); saveSel(); changed(); status(); };
  const setSize = (pt) => { pendingPt = pt; restoreSel(); document.execCommand("fontSize", false, "7"); fixSizes(); saveSel(); changed(); status(); };
  const topBlocks = () => {
    restoreSel();
    const s = window.getSelection(); if (!s.rangeCount) return [];
    const r = s.getRangeAt(0), top = (n) => { while (n && n.parentNode !== page) n = n.parentNode; return n; };
    const a = top(r.startContainer), b = top(r.endContainer), out = [];
    if (!a || !b) return [];
    for (let n = a; n; n = n.nextSibling) { if (n.nodeType === 1) out.push(n); if (n === b) break; }
    return out;
  };

  // ---------- document state ----------
  const changed = () => { /* dirty is derived from content */ };
  const dirty = () => snap() !== saved;
  const setTitleFromState = () => { docTitle = filename ? basename(filename) : `Document${docNo}`; w.setTitle(`${docTitle} - Microsoft Word`); };
  const loadContent = (raw) => {
    const lm = /<meta name=["']?wd-layout["']? content=["']([^"']*)["']/i.exec(raw.slice(0, 6000));
    let lay = null; try { lay = lm ? JSON.parse(decodeURIComponent(lm[1])) : null; } catch { /* ignore */ }
    setLayout(lay || {});
    if (/<html|<body|<p[ >]|<div/i.test(raw.slice(0, 4000))) {
      const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(raw);
      page.innerHTML = sanitize(body ? body[1] : raw) || "<p><br></p>";
      const sec = page.children.length === 1 && page.firstElementChild.matches("div.Section1") ? page.firstElementChild : null;
      if (sec) page.innerHTML = sec.innerHTML.trim() || "<p><br></p>";
    } else {
      const text = /^data:/.test(raw) || /[\x00-\x08]/.test(raw.slice(0, 2000)) ? printable(raw) : raw;
      page.innerHTML = text.split(/\r?\n/).map((l) => `<p>${escapeHtml(l) || "<br>"}</p>`).join("");
    }
  };
  const newDocument = async () => {
    if (!(await discard())) return;
    page.innerHTML = "<p><br></p>"; setLayout({}); filename = null; saved = snap(); setTitleFromState(); status();
  };
  const openDoc = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Open", types: [["All Word Documents", ["doc", "docx", "htm", "html", "txt"]], ["Word Documents (*.doc)", ["doc"]], ["Word 2007 Documents (*.docx)", ["docx"]], ["Web Pages (*.htm;*.html)", ["htm", "html"]], ["Text Files (*.txt)", ["txt"]], ["All Files (*.*)", null]] });
    if (!p) return;
    if (!dirty() && !filename) { loadPath(p); } else ctx.launch("word", { path: p });
  };
  const loadPath = async (p) => {
    try {
      const raw = ctx.fs.readFile(p);
      if (extension(p) === "docx") {
        const r = await parseDocx(dataUrlToBytes(raw));
        setLayout(r.layout || {}); page.innerHTML = sanitize(r.html) || "<p><br></p>";
      } else loadContent(raw);
    } catch (e) { ctx.dialogs.message(`Word cannot open '${basename(p)}'.\n\n${e.message || e}`, { title: "Microsoft Word", icon: "error" }); return; }
    filename = normalizePath(p); saved = snap(); setTitleFromState(); status();
    const rec = ctx.settings.get("recentFiles") || []; ctx.settings.set("recentFiles", [filename, ...rec.filter((x) => x !== filename)].slice(0, 12));
  };
  const SAVE_TYPES = [["Word Document (*.doc)", ["doc"]], ["Word Document (*.docx)", ["docx"]], ["Web Page (*.htm;*.html)", ["htm", "html"]], ["Text Only (*.txt)", ["txt"]]];
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const save = async (as = false, forceExt = null) => {
    let target = filename;
    if (as || !target) target = await ctx.dialogs.file({ mode: "save", path: DOCS, name: target ? basename(target) : `${docTitle}.${forceExt || "doc"}`, types: SAVE_TYPES, normalizeName: (n) => (extension(n) ? n : n + ".doc"), title: "Save As" });
    if (!target) return false;
    const ext = extension(target);
    try {
      if (ext === "docx") {
        selectImg(null);
        const bytes = buildDocx(page, { ...docLayout(), title: basename(target) });
        await ctx.fs.writeFile(target, bytesToDataUrl(bytes, DOCX_MIME), { mime: DOCX_MIME, encoding: "data-url" });
      } else if (ext === "txt") await ctx.fs.writeFile(target, page.innerText, { mime: "text/plain" });
      else await ctx.fs.writeFile(target, wordHtml(basename(target), page.innerHTML, JSON.stringify(layoutState())), { mime: /^html?$/.test(ext) ? "text/html" : "application/msword" });
    } catch (e) { ctx.dialogs.error(e); return false; }
    filename = normalizePath(target); saved = snap(); setTitleFromState(); return true;
  };
  const discard = async () => {
    if (!dirty()) return true;
    const a = await ctx.dialogs.message(`Do you want to save the changes to ${docTitle}?`, { title: "Microsoft Word", icon: "warning", buttons: ["Yes", "No", "Cancel"] });
    return a === "Yes" ? await save() : a === "No";
  };
  const printDoc = () => {
    try {
      selImg = null;
      const cssStr = (t) => '"' + String(t).replace(/["\\]/g, "").replace(/\{PAGE\}/g, '" counter(page) "') + '"';
      const box = (pos, t, a) => (t ? `@${pos}-${a === "right" ? "right" : a === "center" ? "center" : "left"}{content:${cssStr(t)};font:10pt 'Times New Roman'}` : "");
      const css = `@page{size:${PAGE_W}px ${PAGE_H}px;margin:${MT}px ${MR}px ${MB}px ${ML}px;${box("top", hf.header, hf.headerAlign)}${box("bottom", hf.footer, hf.footerAlign)}}body{margin:0!important}`;
      ctx.printHTML?.(`<style>${css}</style><div style="font:12pt 'Times New Roman'">${page.innerHTML}</div>`);
    } catch (e) { ctx.dialogs.error(e); }
  };

  // ---------- find / replace ----------
  let findWin = null;
  const findIn = (text, { matchCase = false, whole = false, backwards = false } = {}) => {
    if (!text) return false;
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT), nodes = []; let full = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { nodes.push({ n, start: full.length }); full += n.nodeValue + (n.parentNode.closest("p,div,li,h1,h2,h3,td")?.lastChild === n ? "\n" : ""); }
    const hay = matchCase ? full : full.toLowerCase(), needle = matchCase ? text : text.toLowerCase();
    const s = window.getSelection(), cur = lastSel || (s.rangeCount ? s.getRangeAt(0) : null);
    const off = (node, o) => { const f = nodes.find((x) => x.n === node); return f ? f.start + o : 0; };
    const from = cur ? (backwards ? off(cur.startContainer, cur.startOffset) - 1 : off(cur.endContainer, cur.endOffset)) : 0;
    const ok = (i) => i >= 0 && (!whole || (!/\w/.test(hay[i - 1] || "") && !/\w/.test(hay[i + needle.length] || "")));
    let i = -1, pos = from;
    for (let pass = 0; pass < 2 && i < 0; pass++) {
      let k = backwards ? hay.lastIndexOf(needle, pos) : hay.indexOf(needle, pos);
      while (k >= 0 && !ok(k)) k = backwards ? (k > 0 ? hay.lastIndexOf(needle, k - 1) : -1) : hay.indexOf(needle, k + 1);
      if (k >= 0) i = k; else pos = backwards ? hay.length : 0;
    }
    if (i < 0) return false;
    const loc = (idx) => { for (let j = nodes.length - 1; j >= 0; j--) if (nodes[j].start <= idx) return [nodes[j].n, Math.min(idx - nodes[j].start, nodes[j].n.nodeValue.length)]; return [nodes[0].n, 0]; };
    const [sn, so] = loc(i), [en, eo] = loc(i + needle.length - (i + needle.length > full.length ? 0 : 0));
    const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, eo);
    s.removeAllRanges(); s.addRange(r); lastSel = r.cloneRange();
    r.startContainer.parentElement?.scrollIntoView({ block: "center" });
    return true;
  };
  const showFind = (mode = "find") => {
    if (findWin && !findWin.closed) { findWin.focus(); return; }
    findWin = ctx.wm.create({ title: "Find and Replace", noIcon: true, width: 440, height: 250, x: 260, y: 160, resizable: false, minimizable: false, maximizable: false, appId: "dialog" });
    const what = el("input", { type: "text", class: "wd-wide" }), rep = el("input", { type: "text", class: "wd-wide" });
    const mc = el("input", { type: "checkbox" }), ww = el("input", { type: "checkbox" });
    const opts = () => ({ matchCase: mc.checked, whole: ww.checked });
    const finish = () => note("Word has finished searching the document.");
    const next = () => { if (!findIn(what.value, opts())) finish(); };
    const replaceOne = () => { saveSel(); const s = window.getSelection(); if (s.toString().toLowerCase() === what.value.toLowerCase() && inPage(s.anchorNode)) { document.execCommand("insertText", false, rep.value); saveSel(); } next(); };
    const replaceAll = () => {
      let n = 0; lastSel = null; page.focus();
      const s = window.getSelection(); const r = document.createRange(); r.setStart(page, 0); r.collapse(true); s.removeAllRanges(); s.addRange(r); lastSel = r.cloneRange();
      while (n < 5000 && findIn(what.value, opts())) { const sel0 = window.getSelection(); if (sel0.toString() === "") break; document.execCommand("insertText", false, rep.value); lastSel = window.getSelection().getRangeAt(0).cloneRange(); n++; if (rep.value.toLowerCase().includes(what.value.toLowerCase()) && n > 1000) break; }
      note(`Word has completed its search and has made ${n} replacements.`);
    };
    findWin.setContent(el("div", { class: "wd-dlg" },
      row(el("label", { text: "Find what:" }), what), row(el("label", { text: "Replace with:" }), rep),
      row(el("label", { class: "wd-check" }, mc, " Match case"), el("label", { class: "wd-check" }, ww, " Find whole words only")),
      el("div", { class: "dialog-buttons" }, button("Find Next", next, { class: "default-button" }), button("Replace", replaceOne), button("Replace All", replaceAll), button("Cancel", () => findWin.close()))));
    findWin.onClose = () => true;
    queueMicrotask(() => { (mode === "replace" ? rep : what).focus(); const t = window.getSelection().toString(); if (t && t.length < 80) what.value = t; });
  };
  const gotoDlg = () => dlg("Find and Replace", 330, 150, (done) => {
    const n = num(1);
    return el("div", { class: "wd-dlg" }, row(el("label", { text: "Enter page number:" }), n),
      btns(done, () => { const p = Math.max(1, parseInt(n.value) || 1); scroller.scrollTop = (p - 1) * PAGE_H * zoom; done(true); }, "Go To"));
  });

  // ---------- dialogs: font, paragraph, table, date, symbol, zoom, break ----------
  const fontDlg = () => {
    restoreSel();
    const el0 = window.getSelection().anchorNode?.parentElement || page, cs = getComputedStyle(el0);
    const cur = { name: cs.fontFamily.split(",")[0].replace(/["']/g, ""), size: Math.round(parseFloat(cs.fontSize) * 0.75), bold: +cs.fontWeight >= 600, italic: cs.fontStyle === "italic", underline: /underline/.test(cs.textDecorationLine) };
    return dlg("Font", 420, 400, (done) => {
      const fam = sel(FONTS, FONTS.includes(cur.name) ? cur.name : "Times New Roman", { size: 6 }), style = sel([["r", "Regular"], ["i", "Italic"], ["b", "Bold"], ["bi", "Bold Italic"]], cur.bold && cur.italic ? "bi" : cur.bold ? "b" : cur.italic ? "i" : "r", { size: 6 }),
        sz = sel(SIZES.map(String), String(cur.size), { size: 6 }), ul = sel([["n", "(none)"], ["s", "Single"]], cur.underline ? "s" : "n"), col = sel([["#000000", "Black"], ["#ff0000", "Red"], ["#0000ff", "Blue"], ["#008000", "Green"], ["#808080", "Gray"], ["#800000", "Dark Red"], ["#000080", "Dark Blue"]], "#000000");
      const eff = {}; const checks = [["strike", "Strikethrough"], ["sup", "Superscript"], ["sub", "Subscript"], ["caps", "All caps"], ["small", "Small caps"]].map(([k, l]) => { eff[k] = el("input", { type: "checkbox" }); return el("label", { class: "wd-check" }, eff[k], " " + l); });
      const prev = el("div", { class: "wd-preview", text: "AaBbYyZz" });
      const upd = () => { prev.style.cssText = `font-family:${fam.value};font-size:${Math.min(+sz.value, 28)}pt;font-weight:${/b/.test(style.value) ? 700 : 400};font-style:${/i/.test(style.value) ? "italic" : "normal"};color:${col.value};text-decoration:${ul.value === "s" ? "underline" : "none"}${eff.strike.checked ? " line-through" : ""};text-transform:${eff.caps.checked ? "uppercase" : "none"};font-variant:${eff.small.checked ? "small-caps" : "normal"}`; };
      [fam, style, sz, ul, col, ...Object.values(eff)].forEach((c) => c.addEventListener("change", upd)); upd();
      const ok = () => {
        restoreSel();
        document.execCommand("fontName", false, fam.value);
        const wantB = /b/.test(style.value), wantI = /i/.test(style.value);
        if (document.queryCommandState("bold") !== wantB) document.execCommand("bold");
        if (document.queryCommandState("italic") !== wantI) document.execCommand("italic");
        if (document.queryCommandState("underline") !== (ul.value === "s")) document.execCommand("underline");
        if (document.queryCommandState("strikeThrough") !== eff.strike.checked) document.execCommand("strikeThrough");
        if (eff.sup.checked !== document.queryCommandState("superscript")) document.execCommand("superscript");
        if (eff.sub.checked !== document.queryCommandState("subscript")) document.execCommand("subscript");
        document.execCommand("foreColor", false, col.value);
        pendingPt = +sz.value; document.execCommand("fontSize", false, "7"); fixSizes();
        if (eff.caps.checked || eff.small.checked) { const sp = document.createElement("span"); sp.style.textTransform = eff.caps.checked ? "uppercase" : ""; sp.style.fontVariant = eff.small.checked ? "small-caps" : ""; const r = window.getSelection().getRangeAt(0); if (!r.collapsed) r.surroundContents(sp); }
        saveSel(); status(); done(true);
      };
      return el("div", { class: "wd-dlg" },
        el("div", { class: "wd-cols" }, el("div", {}, el("label", { text: "Font:" }), fam), el("div", {}, el("label", { text: "Font style:" }), style), el("div", {}, el("label", { text: "Size:" }), sz)),
        row(el("div", {}, el("label", { text: "Underline style:" }), ul), el("div", {}, el("label", { text: "Font color:" }), col)),
        el("fieldset", {}, el("legend", { text: "Effects" }), el("div", { class: "wd-cols2" }, checks)),
        el("fieldset", {}, el("legend", { text: "Preview" }), prev),
        btns(done, ok));
    });
  };
  const paraDlg = () => {
    const blocks = topBlocks(), b0 = blocks[0] || page, cs = getComputedStyle(b0);
    return dlg("Paragraph", 420, 330, (done) => {
      const al = sel([["left", "Left"], ["center", "Centered"], ["right", "Right"], ["justify", "Justified"]], cs.textAlign === "start" ? "left" : cs.textAlign),
        li = num((parseFloat(cs.marginLeft) / 96).toFixed(2) + '"'), ri = num((parseFloat(cs.marginRight) / 96).toFixed(2) + '"'),
        sp = sel([["none", "(none)"], ["first", "First line"], ["hang", "Hanging"]], parseFloat(cs.textIndent) > 0 ? "first" : parseFloat(cs.textIndent) < 0 ? "hang" : "none"), by = num((Math.abs(parseFloat(cs.textIndent)) / 96).toFixed(2) + '"'),
        bf = num(Math.round(parseFloat(cs.marginTop) * 0.75) + " pt"), af = num(Math.round(parseFloat(cs.marginBottom) * 0.75) + " pt"),
        ls = sel([["normal", "Single"], ["1.5", "1.5 lines"], ["2", "Double"]], "normal");
      const inch = (v) => (parseFloat(String(v).replace(/[^\d.\-]/g, "")) || 0) * 96;
      const ok = () => {
        for (const b of blocks) {
          b.style.textAlign = al.value; b.style.marginLeft = inch(li.value) + "px"; b.style.marginRight = inch(ri.value) + "px";
          b.style.textIndent = sp.value === "none" ? "0" : (sp.value === "hang" ? -1 : 1) * inch(by.value) + "px";
          b.style.marginTop = (parseFloat(bf.value) || 0) / 0.75 + "px"; b.style.marginBottom = (parseFloat(af.value) || 0) / 0.75 + "px";
          b.style.lineHeight = ls.value === "normal" ? "" : ls.value;
        }
        status(); done(true);
      };
      return el("div", { class: "wd-dlg" }, el("fieldset", {}, el("legend", { text: "General" }), row(el("label", { text: "Alignment:" }), al)),
        el("fieldset", {}, el("legend", { text: "Indentation" }), row(el("label", { text: "Left:" }), li, el("label", { text: "Special:" }), sp), row(el("label", { text: "Right:" }), ri, el("label", { text: "By:" }), by)),
        el("fieldset", {}, el("legend", { text: "Spacing" }), row(el("label", { text: "Before:" }), bf, el("label", { text: "Line spacing:" }), ls), row(el("label", { text: "After:" }), af)),
        btns(done, ok));
    });
  };
  const fmtTable = (t, f) => {
    const bd = f === "none" ? "" : "1px solid #000";
    t.classList.toggle("wd-noborder", f === "none"); t.style.border = bd; t.style.borderCollapse = "collapse";
    [...t.rows].forEach((r, ri) => [...r.cells].forEach((c) => {
      c.style.border = bd; c.style.background = f === "classic" && ri === 0 ? "#c0c0c0" : f === "banded" && ri % 2 === 1 ? "#e0e0e0" : "";
      c.style.fontWeight = f === "classic" && ri === 0 ? "bold" : "";
    }));
  };
  const tableHtml = (cols, rows, f = "grid") => {
    const t = document.createElement("table"), tb = t.createTBody(), cw = Math.floor((PAGE_W - ML - MR) / cols);
    for (let r = 0; r < rows; r++) { const tr = tb.insertRow(); for (let c = 0; c < cols; c++) { const td = tr.insertCell(); td.style.cssText = `width:${cw}px;padding:0 7px;vertical-align:top`; td.innerHTML = "<br>"; } }
    fmtTable(t, f); return t.outerHTML + "<p><br></p>";
  };
  const insertTable = (cols, rows, f = "grid") => {
    run("insertHTML", tableHtml(Math.max(1, Math.min(20, cols)), Math.max(1, Math.min(200, rows)), f).replace("<table", '<table data-new="1"'));
    const t = page.querySelector("table[data-new]");
    if (t) { t.removeAttribute("data-new"); const c = t.rows[0]?.cells[0]; if (c) { const r = document.createRange(); r.selectNodeContents(c); r.collapse(true); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); saveSel(); } }
    fit();
  };
  const tableDlg = () => dlg("Insert Table", 340, 230, (done) => {
    const c = num(2), r = num(2), f = sel(TFMT, "grid");
    return el("div", { class: "wd-dlg" }, el("fieldset", {}, el("legend", { text: "Table size" }), row(el("label", { text: "Number of columns:" }), c), row(el("label", { text: "Number of rows:" }), r)),
      row(el("label", { text: "Table format:" }), f),
      btns(done, () => insertTable(parseInt(c.value) || 1, parseInt(r.value) || 1, f.value)));
  });
  const curCell = () => { restoreSel(); const sl = window.getSelection(), n = sl.anchorNode; const c = (n?.nodeType === 1 ? n : n?.parentElement)?.closest("td,th"); return c && inPage(c) ? c : null; };
  const autoFormatDlg = () => {
    const cell = curCell(); if (!cell) return note("The cursor is not in a table.");
    const table = cell.closest("table");
    return dlg("Table AutoFormat", 330, 170, (done) => {
      const f = sel(TFMT, table.classList.contains("wd-noborder") ? "none" : "grid");
      return el("div", { class: "wd-dlg" }, row(el("label", { text: "Formats:" }), f), btns(done, () => { fmtTable(table, f.value); status(); }));
    });
  };
  const mergeCells = () => {
    restoreSel(); const sl = window.getSelection(); if (!sl.rangeCount) return;
    const r = sl.getRangeAt(0), up = (n) => (n?.nodeType === 1 ? n : n?.parentElement)?.closest("td,th"), a = up(r.startContainer), b = up(r.endContainer);
    if (!a || !b || a === b || a.parentElement !== b.parentElement) return note("Select two or more cells in the same row to merge them.");
    const cells = [...a.parentElement.children], i0 = cells.indexOf(a), i1 = cells.indexOf(b), group = cells.slice(Math.min(i0, i1), Math.max(i0, i1) + 1), first = group[0];
    let span = 0, html = [];
    for (const c of group) { span += c.colSpan || 1; const h = c.innerHTML.replace(/&nbsp;|<br>/g, "").trim(); if (h) html.push(c.innerHTML); if (c !== first) c.remove(); }
    first.colSpan = span; first.style.width = ""; first.innerHTML = html.join("<br>") || "<br>"; saveSel(); status();
  };
  const splitCell = () => {
    const c = curCell(); if (!c) return note("The cursor is not in a table.");
    if ((c.colSpan || 1) < 2) return note("This cell is not merged. Use Table > Insert > Columns to add columns.");
    const n = c.colSpan; c.colSpan = 1;
    for (let k = 1; k < n; k++) { const x = c.cloneNode(false); x.innerHTML = "<br>"; c.after(x); }
    status();
  };
  const autoFit = () => { const c = curCell(); if (!c) return note("The cursor is not in a table."); const t = c.closest("table"); t.style.width = "100%"; [...t.rows].forEach((r) => [...r.cells].forEach((x) => { x.style.width = ""; })); status(); };
  const tableGrid = (anchor) => {
    const r = anchor.getBoundingClientRect(); saveSel();
    const R = 5, C = 5, label = el("div", { class: "wd-tg-label", text: "Cancel" }), grid = el("div", { class: "wd-tgrid" });
    const box = el("div", { class: "wd-tgpop" }, grid, label);
    const cells = [];
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const c = el("div", { class: "wd-tgc" }); c.dataset.x = x; c.dataset.y = y; cells.push(c); grid.append(c); }
    grid.style.gridTemplateColumns = `repeat(${C}, 16px)`;
    const hover = (x, y) => { cells.forEach((c) => c.classList.toggle("on", +c.dataset.x <= x && +c.dataset.y <= y)); label.textContent = x < 0 ? "Cancel" : `${y + 1} x ${x + 1} Table`; };
    grid.addEventListener("mousemove", (e) => { const c = e.target.closest(".wd-tgc"); if (c) hover(+c.dataset.x, +c.dataset.y); });
    grid.addEventListener("mouseleave", () => hover(-1, -1));
    grid.addEventListener("click", (e) => { const c = e.target.closest(".wd-tgc"); box.remove(); if (c) insertTable(+c.dataset.x + 1, +c.dataset.y + 1); });
    box.style.left = r.left + "px"; box.style.top = r.bottom + "px"; box.addEventListener("mousedown", (e) => e.preventDefault());
    document.querySelector("#menu-layer").append(box);
    const away = (e) => { if (!box.contains(e.target)) { box.remove(); document.removeEventListener("pointerdown", away, true); } }; setTimeout(() => document.addEventListener("pointerdown", away, true));
  };
  const dateDlg = () => dlg("Date and Time", 360, 300, (done) => {
    const d = new Date(), z = (n) => String(n).padStart(2, "0"), months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const h12 = d.getHours() % 12 || 12, ap = d.getHours() < 12 ? "AM" : "PM";
    const fmts = [`${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`, `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`, `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`, `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`, `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`, `${h12}:${z(d.getMinutes())} ${ap}`, `${h12}:${z(d.getMinutes())}:${z(d.getSeconds())} ${ap}`, `${z(d.getHours())}:${z(d.getMinutes())}`];
    const list = sel(fmts, fmts[0], { size: 9, class: "wd-list" });
    return el("div", { class: "wd-dlg" }, el("label", { text: "Available formats:" }), list, btns(done, () => { run("insertText", list.value); done(true); }));
  });
  const symbolDlg = () => dlg("Symbol", 400, 310, (done) => {
    let pick = "©"; const chars = [..."©®™°±×÷µ¶§•…–—‘’“”«»¡¿€£¥¢¼½¾ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿαβγδεζηθλμπσφωΩ←↑→↓↔∞≈≠≤≥∑√∫"];
    const grid = el("div", { class: "wd-symgrid" }, chars.map((c) => { const b = el("button", { type: "button", class: "wd-sym", text: c, onclick: () => { pick = c; [...grid.children].forEach((x) => x.classList.toggle("sel", x === b)); } }); return b; }));
    return el("div", { class: "wd-dlg" }, grid, btns(done, () => { run("insertText", pick); done(true); }, "Insert"));
  });
  const zoomDlg = () => dlg("Zoom", 330, 230, (done) => {
    const opts = [200, 100, 75].map((v) => [String(v), v + "%"]).concat([["custom", "Percent:"]]);
    let v = String(Math.round(zoom * 100)); const pct = num(v);
    const radios = opts.map(([val, label]) => { const r = el("input", { type: "radio", name: "z", value: val, checked: val === (["200", "100", "75"].includes(v) ? v : "custom") }); return el("label", { class: "wd-check" }, r, " " + label); });
    return el("div", { class: "wd-dlg" }, el("fieldset", {}, el("legend", { text: "Zoom to" }), el("div", { class: "wd-cols2" }, radios), pct), btns(done, () => { const r = radios.map((l) => l.firstChild).find((x) => x.checked); setZoom((r.value === "custom" ? parseInt(pct.value) || 100 : +r.value) / 100); done(true); }));
  });
  const breakDlg = () => dlg("Break", 300, 220, (done) => {
    const opts = [["page", "Page break"], ["column", "Column break"], ["text", "Text wrapping break"]];
    const radios = opts.map(([v, l], i) => el("label", { class: "wd-check" }, el("input", { type: "radio", name: "b", value: v, checked: i === 0 }), " " + l));
    return el("div", { class: "wd-dlg" }, el("fieldset", {}, el("legend", { text: "Insert" }), ...radios.map((r) => el("div", {}, r))), btns(done, () => {
      const v = radios.map((l) => l.firstChild).find((x) => x.checked).value;
      run("insertHTML", v === "page" ? '<div style="page-break-before:always;border-top:1px dotted #000;margin:8px 0;height:0;text-align:center"></div><p><br></p>' : "<br>"); done(true);
    }));
  });
  const wordCount = () => {
    const t = page.innerText.replace(/ /g, " "), words = (t.match(/\S+/g) || []).length;
    const stats = [["Pages", pageCount()], ["Words", words], ["Characters (no spaces)", t.replace(/\s/g, "").length], ["Characters (with spaces)", t.replace(/[\r\n]/g, "").length], ["Paragraphs", page.querySelectorAll("p,h1,h2,h3,li").length], ["Lines", Math.max(1, Math.round(page.scrollHeight / (14 * 1.15 * 96 / 72)))]];
    return dlg("Word Count", 300, 270, (done) => el("div", { class: "wd-dlg" }, el("fieldset", {}, el("legend", { text: "Statistics" }), ...stats.map(([k, v]) => row(el("span", { class: "wd-stat", text: k + ":" }), el("b", { text: String(v) })))), el("div", { class: "dialog-buttons" }, button("Close", () => done(null), { class: "default-button" }))));
  };
  const fitImage = (dataUrl) => new Promise((resolve) => {
    const im = new Image();
    im.onload = () => { const maxW = PAGE_W - ML - MR; let wpx = im.naturalWidth || 100, hpx = im.naturalHeight || 100; if (wpx > maxW) { hpx = Math.round(hpx * maxW / wpx); wpx = maxW; } resolve(`<img src="${dataUrl}" width="${wpx}" height="${hpx}" style="width:${wpx}px;height:${hpx}px">`); };
    im.onerror = () => resolve(null); im.src = dataUrl;
  });
  const addImage = async (dataUrl) => { const h = await fitImage(dataUrl); if (!h) return note("The picture file could not be inserted. The file may be damaged or is not a supported picture format."); run("insertHTML", h); };
  const insertPicture = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Insert Picture", filter: (n) => /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(n.name) || /^image\//.test(n.mime || "") });
    if (!p) return;
    let c = ctx.fs.readFile(p);
    if (/^\s*<(\?xml|svg)/i.test(c)) c = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(c);
    if (/^data:image\//.test(c)) await addImage(c); else note("The picture file could not be inserted.");
  };
  const insertPictureFromComputer = async () => {
    saveSel();
    const [f] = await pickFiles({ accept: "image/*" }); if (!f) return;
    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(f); });
    await addImage(url);
  };
  // picture selection + resize handle
  const selBox = el("div", { class: "wd-selbox" }), selHandle = el("div", { class: "wd-selhandle", title: "Resize" });
  selBox.append(selHandle); layer.append(selBox);
  const placeSel = () => {
    if (!selImg || !selImg.isConnected) { selBox.style.display = "none"; return; }
    const ir = selImg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    Object.assign(selBox.style, { display: "block", left: (ir.left - wr.left) / zoom + "px", top: (ir.top - wr.top) / zoom + "px", width: ir.width / zoom + "px", height: ir.height / zoom + "px" });
  };
  const selectImg = (img) => { selImg = img; placeSel(); };
  selHandle.addEventListener("pointerdown", (e) => {
    if (!selImg) return; e.preventDefault(); e.stopPropagation(); selHandle.setPointerCapture(e.pointerId);
    const img = selImg, w0 = img.getBoundingClientRect().width / zoom, ratio = img.getBoundingClientRect().height / img.getBoundingClientRect().width, x0 = e.clientX;
    const mv = (ev) => { const nw = Math.max(8, Math.round(w0 + (ev.clientX - x0) / zoom)); img.style.width = nw + "px"; img.style.height = Math.round(nw * ratio) + "px"; img.setAttribute("width", nw); img.setAttribute("height", Math.round(nw * ratio)); placeSel(); };
    const up = () => { selHandle.removeEventListener("pointermove", mv); selHandle.removeEventListener("pointerup", up); fit(); };
    selHandle.addEventListener("pointermove", mv); selHandle.addEventListener("pointerup", up);
  });
  const pictureDlg = () => {
    if (!selImg) return note("Click a picture first, then choose Format > Picture.");
    const img = selImg, r = img.getBoundingClientRect(), wi = r.width / zoom, hi = r.height / zoom;
    return dlg("Format Picture", 340, 220, (done) => {
      const w1 = num((wi / 96).toFixed(2) + '"'), h1 = num((hi / 96).toFixed(2) + '"'), lock = el("input", { type: "checkbox", checked: true }), alt = el("input", { type: "text", class: "wd-wide", value: img.alt || "" });
      const ratio = hi / wi;
      w1.addEventListener("change", () => { if (lock.checked) h1.value = ((parseFloat(w1.value) || 1) * ratio).toFixed(2) + '"'; });
      h1.addEventListener("change", () => { if (lock.checked) w1.value = ((parseFloat(h1.value) || 1) / ratio).toFixed(2) + '"'; });
      return el("div", { class: "wd-dlg" }, el("fieldset", {}, el("legend", { text: "Size" }), row(el("label", { text: "Width:" }), w1, el("label", { text: "Height:" }), h1), el("label", { class: "wd-check" }, lock, " Lock aspect ratio")), row(el("label", { text: "Alternative text:" }), alt),
        btns(done, () => { const nw = Math.max(8, Math.round((parseFloat(w1.value) || 1) * 96)), nh = Math.max(8, Math.round((parseFloat(h1.value) || 1) * 96)); img.style.width = nw + "px"; img.style.height = nh + "px"; img.setAttribute("width", nw); img.setAttribute("height", nh); img.alt = alt.value; placeSel(); fit(); }));
    });
  };
  const insertLink = async () => {
    const v = await ctx.dialogs.prompt("Link to file or URL:", "http://", { title: "Insert Hyperlink" });
    if (v) run("createLink", v);
  };
  const changeCase = (kind) => {
    restoreSel(); const s = window.getSelection(); if (s.isCollapsed) return; const t = s.toString();
    const out = { upper: t.toUpperCase(), lower: t.toLowerCase(), title: t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()), sentence: t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\w)/g, (m, a, b) => a + b.toUpperCase()), toggle: [...t].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("") }[kind];
    document.execCommand("insertText", false, out); saveSel();
  };
  const tableOp = (op) => {
    restoreSel(); const s = window.getSelection(), cell = (s.anchorNode?.nodeType === 1 ? s.anchorNode : s.anchorNode?.parentElement)?.closest("td,th");
    if (!cell || !inPage(cell)) return note("The cursor is not in a table.");
    const tr = cell.parentElement, table = cell.closest("table"), ci = [...tr.children].indexOf(cell), rows = [...table.rows];
    const mk = () => { const c = cell.cloneNode(false); c.innerHTML = "<br>"; return c; };
    if (op === "rowAbove") tr.before(Object.assign(tr.cloneNode(false), { innerHTML: [...tr.children].map(() => mk().outerHTML).join("") }));
    else if (op === "rowBelow") tr.after(Object.assign(tr.cloneNode(false), { innerHTML: [...tr.children].map(() => mk().outerHTML).join("") }));
    else if (op === "colLeft") rows.forEach((r) => r.children[ci]?.before(mk()));
    else if (op === "colRight") rows.forEach((r) => r.children[ci]?.after(mk()));
    else if (op === "delRow") { tr.remove(); if (!table.rows.length) table.remove(); }
    else if (op === "delCol") { rows.forEach((r) => r.children[ci]?.remove()); if (!table.rows[0]?.children.length) table.remove(); }
    else if (op === "delTable") table.remove();
    else if (op === "selTable") { const r = document.createRange(); r.selectNode(table); s.removeAllRanges(); s.addRange(r); }
    else if (op === "selRow") { const r = document.createRange(); r.selectNodeContents(tr); s.removeAllRanges(); s.addRange(r); }
    else if (op === "selCell") { const r = document.createRange(); r.selectNodeContents(cell); s.removeAllRanges(); s.addRange(r); }
    saveSel(); status();
  };

  // ---------- page setup / header & footer ----------
  const docLayout = () => ({ pw: PAGE_W, ph: PAGE_H, ml: ML, mr: MR, mt: MT, mb: MB, header: hf.header, footer: hf.footer, headerAlign: hf.headerAlign, footerAlign: hf.footerAlign, cols: 1 });
  const setLayout = (o = {}) => {
    paper = PAPERS[o.paper] ? o.paper : "Letter"; landscape = !!o.landscape;
    const nz = (v, d) => (Number.isFinite(+v) && +v >= 0 && v !== null && v !== undefined ? +v : d);
    ML = nz(o.ML ?? o.ml, 120); MR = nz(o.MR ?? o.mr, 120); MT = nz(o.MT ?? o.mt, 96); MB = nz(o.MB ?? o.mb, 96);
    if (o.pw && o.ph && !o.paper) { const k = Object.entries(PAPERS).find(([, [a, b]]) => (Math.abs(a - o.pw) < 6 && Math.abs(b - o.ph) < 6) || (Math.abs(b - o.pw) < 6 && Math.abs(a - o.ph) < 6)); paper = k ? k[0] : "Letter"; landscape = o.pw > o.ph; }
    const [pw, ph] = PAPERS[paper]; PAGE_W = landscape ? ph : pw; PAGE_H = landscape ? pw : ph;
    hf = { header: o.hf?.header || "", footer: o.hf?.footer || "", headerAlign: o.hf?.headerAlign || "left", footerAlign: o.hf?.footerAlign || "center" };
    applyPageSetup();
  };
  const hfText = (t, n) => String(t).replace(/\{PAGE\}/g, String(n));
  const renderHF = () => {
    layer.querySelectorAll(".wd-hf").forEach((n) => n.remove());
    if (view !== "print") return;
    const pc = pageCount();
    const mk = (cls, text, align, top, up) => { const d = el("div", { class: "wd-hf " + cls, text }); Object.assign(d.style, { left: ML + "px", width: PAGE_W - ML - MR + "px", textAlign: align, top: top + "px", transform: up ? "translateY(-100%)" : "" }); layer.append(d); };
    if (hf.header) mk("h", hfText(hf.header, 1), hf.headerAlign, Math.min(48, MT / 2));
    if (hf.footer) mk("f", hfText(hf.footer, pc), hf.footerAlign, pc * PAGE_H - Math.min(48, MB / 2), true);
  };
  function fit() { // make the sheet a whole number of pages tall so the footer sits at the bottom of the last page
    if (view === "print") { page.style.minHeight = PAGE_H + "px"; const pc = Math.max(1, Math.ceil(page.scrollHeight / PAGE_H)); page.style.minHeight = pc * PAGE_H + "px"; } else page.style.minHeight = "";
    renderHF(); placeSel();
  }
  function applyPageSetup() {
    const st0 = page.style; st0.setProperty("--pw", PAGE_W + "px"); st0.setProperty("--ph", PAGE_H + "px"); st0.setProperty("--pt", MT + "px"); st0.setProperty("--pr", MR + "px"); st0.setProperty("--pb", MB + "px"); st0.setProperty("--pl", ML + "px");
    if (ready) { fit(); layout(); }
  }
  const pageSetupDlg = () => dlg("Page Setup", 380, 340, (done) => {
    const inch = (v) => (v / 96).toFixed(2) + '"', top = num(inch(MT)), bot = num(inch(MB)), left = num(inch(ML)), right = num(inch(MR));
    const pap = sel(Object.keys(PAPERS), paper), port = el("input", { type: "radio", name: "ori", checked: !landscape }), land = el("input", { type: "radio", name: "ori", checked: landscape });
    const px = (t, d) => { const n = parseFloat(String(t).replace(/[^\d.]/g, "")); return Number.isFinite(n) ? Math.max(0, Math.min(4, n)) * 96 : d; };
    return el("div", { class: "wd-dlg" },
      el("fieldset", {}, el("legend", { text: "Margins" }), row(el("label", { text: "Top:" }), top, el("label", { text: "Bottom:" }), bot), row(el("label", { text: "Left:" }), left, el("label", { text: "Right:" }), right)),
      el("fieldset", {}, el("legend", { text: "Paper size" }), row(el("label", { text: "Paper size:" }), pap)),
      el("fieldset", {}, el("legend", { text: "Orientation" }), row(el("label", { class: "wd-check" }, port, " Portrait"), el("label", { class: "wd-check" }, land, " Landscape"))),
      btns(done, () => { setLayout({ paper: pap.value, landscape: land.checked, ML: px(left.value, ML), MR: px(right.value, MR), MT: px(top.value, MT), MB: px(bot.value, MB), hf }); status(); }));
  });
  const headerFooterDlg = () => dlg("Header and Footer", 400, 300, (done) => {
    const h = el("input", { type: "text", class: "wd-wide", value: hf.header }), f = el("input", { type: "text", class: "wd-wide", value: hf.footer });
    const ha = sel([["left", "Left"], ["center", "Centered"], ["right", "Right"]], hf.headerAlign), fa = sel([["left", "Left"], ["center", "Centered"], ["right", "Right"]], hf.footerAlign);
    const addNum = (inp) => button("Insert Page Number", () => { inp.value += "{PAGE}"; inp.focus(); });
    return el("div", { class: "wd-dlg" },
      el("fieldset", {}, el("legend", { text: "Header" }), row(h), row(el("label", { text: "Alignment:" }), ha, addNum(h))),
      el("fieldset", {}, el("legend", { text: "Footer" }), row(f), row(el("label", { text: "Alignment:" }), fa, addNum(f))),
      btns(done, () => { hf = { header: h.value, footer: f.value, headerAlign: ha.value, footerAlign: fa.value }; fit(); status(); }));
  });
  const pageNumbersDlg = () => dlg("Page Numbers", 320, 190, (done) => {
    const pos = sel([["footer", "Bottom of page (Footer)"], ["header", "Top of page (Header)"]], "footer"), al = sel([["left", "Left"], ["center", "Center"], ["right", "Right"]], "center");
    return el("div", { class: "wd-dlg" }, row(el("label", { text: "Position:" }), pos), row(el("label", { text: "Alignment:" }), al),
      btns(done, () => { hf = { ...hf, [pos.value]: "{PAGE}", [pos.value + "Align"]: al.value }; fit(); }));
  });

  // ---------- spelling ----------
  let spellWin = null;
  const spellCheck = async () => {
    if (spellWin && !spellWin.closed) { spellWin.focus(); return; }
    let dict; try { dict = await loadDict(); } catch (e) { return note(e.message || String(e)); }
    const customKey = "wordCustomDict", custom = new Set(ctx.settings.get(customKey) || []), ignored = new Set(), autoChange = new Map();
    const done = () => { if (spellWin && !spellWin.closed) spellWin.close(); spellWin = null; note("The spelling and grammar check is complete."); };
    const startRange = () => { const r = document.createRange(); if (lastSel && inPage(lastSel.startContainer)) { r.setStart(lastSel.startContainer, lastSel.startOffset); } else r.setStart(page, 0); r.collapse(true); return r; };
    let cur = startRange(), hit = null;
    const findNext = () => {
      const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode(), off = 0, guard = 0;
      while (node && cur.comparePoint(node, node.nodeValue.length) < 0) node = walker.nextNode();
      if (node && node === cur.endContainer) off = cur.endOffset;
      while (node && guard++ < 100000) {
        const text = node.nodeValue, re = new RegExp(WORD_RE.source, "g"); re.lastIndex = off; let m;
        while ((m = re.exec(text))) {
          const word = m[0], a = m.index, b = a + word.length;
          if (/\d/.test(text[a - 1] || "") || /\d/.test(text[b] || "")) continue;
          const lw = word.toLowerCase();
          if (autoChange.has(lw)) { const r = document.createRange(); r.setStart(node, a); r.setEnd(node, b); const sl = window.getSelection(); page.focus(); sl.removeAllRanges(); sl.addRange(r); document.execCommand("insertText", false, autoChange.get(lw)); const sl2 = window.getSelection().getRangeAt(0); cur = sl2.cloneRange(); cur.collapse(false); return findNext(); }
          if (ignored.has(lw) || isCorrect(word, dict, custom)) continue;
          const r = document.createRange(); r.setStart(node, a); r.setEnd(node, b); return { range: r, word, text, a, b };
        }
        node = walker.nextNode(); off = 0;
      }
      return null;
    };
    const win = spellWin = ctx.wm.create({ title: "Spelling and Grammar: English (U.S.)", noIcon: true, width: 480, height: 330, x: 220, y: 140, resizable: false, minimizable: false, maximizable: false, appId: "dialog" });
    const ctxBox = el("div", { class: "wd-spctx" }), change = el("input", { type: "text", class: "wd-wide" }), list = el("select", { size: 6, class: "wd-list" });
    const show = () => {
      hit = findNext();
      if (!hit) return done();
      const sl = window.getSelection(); page.focus(); sl.removeAllRanges(); sl.addRange(hit.range); lastSel = hit.range.cloneRange(); hit.range.startContainer.parentElement?.scrollIntoView({ block: "center" });
      ctxBox.replaceChildren(document.createTextNode(hit.text.slice(Math.max(0, hit.a - 40), hit.a)), el("span", { class: "wd-spbad", text: hit.word }), document.createTextNode(hit.text.slice(hit.b, hit.b + 40)));
      const sug = suggest(hit.word, dict); list.replaceChildren(...(sug.length ? sug : ["(no suggestions)"]).map((x) => el("option", { value: x, text: x }))); if (sug.length) list.selectedIndex = 0;
      change.value = sug[0] || hit.word;
    };
    list.addEventListener("change", () => { if (list.value && list.value !== "(no suggestions)") change.value = list.value; });
    list.addEventListener("dblclick", () => doChange());
    const replaceHit = (txt) => { const sl = window.getSelection(); page.focus(); sl.removeAllRanges(); sl.addRange(hit.range); document.execCommand("insertText", false, txt); const r = window.getSelection().getRangeAt(0).cloneRange(); r.collapse(false); cur = r; lastSel = r.cloneRange(); };
    const doChange = () => { if (!hit) return; replaceHit(change.value); show(); };
    const advance = () => { cur = hit.range.cloneRange(); cur.collapse(false); show(); };
    const btnCol = el("div", { class: "wd-spbtns" },
      button("Ignore Once", advance), button("Ignore All", () => { ignored.add(hit.word.toLowerCase()); advance(); }),
      button("Add", () => { custom.add(hit.word.toLowerCase()); ctx.settings.set(customKey, [...custom]); advance(); }),
      button("Change", doChange), button("Change All", () => { autoChange.set(hit.word.toLowerCase(), change.value); doChange(); }),
      button("Close", () => win.close()));
    win.setContent(el("div", { class: "wd-dlg wd-sp-dlg" }, el("label", { text: "Not in Dictionary:" }), ctxBox, el("div", { class: "wd-spmain" }, el("div", {}, el("label", { text: "Change to:" }), change, el("label", { text: "Suggestions:" }), list), btnCol)));
    win.onClose = () => { spellWin = null; return true; };
    show();
  };

  // ---------- zoom / view ----------
  const pageCount = () => Math.max(1, Math.ceil(page.scrollHeight / PAGE_H - 0.01));
  const setZoom = (z) => { zoom = Math.max(0.1, Math.min(5, z)); wrap.style.zoom = zoom; placeSel(); zoomInput.value = Math.round(zoom * 100) + "%"; layout(); };
  const setView = (v) => { view = v; w.el.classList.toggle("wd-normal", v === "normal" || v === "web"); viewBtns.forEach(([k, b]) => b.classList.toggle("on", k === v)); fit(); layout(); };

  // ---------- rulers ----------
  const hruler = el("div", { class: "wd-hruler" }), vruler = el("div", { class: "wd-vruler" });
  const hInner = el("div", { class: "wd-hinner" }), vInner = el("div", { class: "wd-vinner" });
  hruler.append(hInner); vruler.append(vInner);
  const drawH = () => {
    const z = view === "print" ? zoom : zoom, pw = (view === "print" ? PAGE_W : page.offsetWidth) * z, lm = (view === "print" ? ML : 0) * z, parts = [];
    const textR = pw - (view === "print" ? MR : 0) * z;
    parts.push(`<rect x="0" y="0" width="${lm}" height="14" fill="#808080"/><rect x="${lm}" y="0" width="${textR - lm}" height="14" fill="#fff"/><rect x="${textR}" y="0" width="${pw - textR}" height="14" fill="#808080"/>`);
    for (let i = -Math.floor(lm / (12 * z)); (lm + i * 12 * z) <= pw; i++) {
      const x = lm + i * 12 * z; if (x < 0 || x > pw) continue;
      if (i % 8 === 0) { if (i !== 0) parts.push(`<text x="${x}" y="11" text-anchor="middle" font-size="${Math.max(7, 9 * Math.min(z, 1.2))}" font-family="Arial" fill="${x < lm || x > textR ? "#fff" : "#000"}">${Math.abs(i / 8)}</text>`); }
      else if (i % 4 === 0) parts.push(`<rect x="${x}" y="5" width="1" height="4" fill="${x < lm || x > textR ? "#fff" : "#000"}"/>`);
      else parts.push(`<rect x="${x}" y="7" width="1" height="1" fill="${x < lm || x > textR ? "#fff" : "#000"}"/>`);
    }
    parts.push(`<path d="M${lm - 4} 0h8l-4 5z" fill="#fff" stroke="#000"/><path d="M${lm - 4} 10h8l-4 -5z" fill="#fff" stroke="#000"/><rect x="${lm - 4}" y="10.5" width="8" height="3.5" fill="#fff" stroke="#000"/><path d="M${textR - 4} 10h8l-4 -5z" fill="#fff" stroke="#000"/>`);
    hInner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="15">${parts.join("")}</svg>`;
  };
  const drawV = () => {
    if (view !== "print") { vInner.innerHTML = ""; return; }
    const z = zoom, ph = PAGE_H * z * pageCount(), tm = MT * z, bm = MB * z, parts = [`<rect x="0" y="0" width="15" height="${ph}" fill="#808080"/><rect x="0" y="${tm}" width="15" height="${ph - tm - bm}" fill="#fff"/>`];
    for (let i = -Math.floor(tm / (12 * z)); (tm + i * 12 * z) <= ph; i++) {
      const y = tm + i * 12 * z; if (y < 0) continue; const inw = y >= tm && y <= ph - bm, c = inw ? "#000" : "#fff";
      if (i % 8 === 0) { if (i !== 0) parts.push(`<text transform="translate(11 ${y}) rotate(-90)" text-anchor="middle" font-size="${Math.max(7, 9 * Math.min(z, 1.2))}" font-family="Arial" fill="${c}">${Math.abs(i / 8)}</text>`); }
      else if (i % 4 === 0) parts.push(`<rect x="5" y="${y}" width="4" height="1" fill="${c}"/>`); else parts.push(`<rect x="7" y="${y}" width="1" height="1" fill="${c}"/>`);
    }
    vInner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="${ph + 14}">${parts.join("")}</svg>`;
  };
  const align = () => {
    const pr = page.getBoundingClientRect(), hr = hruler.getBoundingClientRect(), vr = vruler.getBoundingClientRect();
    hInner.style.left = pr.left - hr.left + "px"; vInner.style.top = pr.top - vr.top + "px";
  };
  const layout = () => {
    align(); drawH(); drawV(); syncBars(); placeSel();
  };

  // ---------- custom scroll bars (so the browse buttons sit under the vertical one, like Word) ----------
  const vSpacer = el("div"), hSpacer = el("div");
  const vbar = el("div", { class: "wd-vbar" }, vSpacer), hbar = el("div", { class: "wd-hbar" }, hSpacer);
  let lock = false;
  const syncBars = () => {
    vSpacer.style.height = scroller.scrollHeight + "px"; hSpacer.style.width = scroller.scrollWidth + "px";
    hbar.style.visibility = scroller.scrollWidth > scroller.clientWidth ? "visible" : "hidden";
  };
  scroller.addEventListener("scroll", () => { if (lock) return; lock = true; vbar.scrollTop = scroller.scrollTop; hbar.scrollLeft = scroller.scrollLeft; lock = false; align(); });
  vbar.addEventListener("scroll", () => { if (lock) return; lock = true; scroller.scrollTop = vbar.scrollTop; lock = false; });
  hbar.addEventListener("scroll", () => { if (lock) return; lock = true; scroller.scrollLeft = hbar.scrollLeft; lock = false; });
  const browse = (dir) => { scroller.scrollBy({ top: dir * PAGE_H * zoom * 0.95, behavior: "auto" }); };
  const browseBtns = el("div", { class: "wd-browse" },
    button("", () => browse(-1), { class: "wd-bb up", title: "Previous Page" }), button("", () => note("Select Browse Object is not available."), { class: "wd-bb obj", title: "Select Browse Object" }), button("", () => browse(1), { class: "wd-bb dn", title: "Next Page" }));

  // ---------- toolbars ----------
  const items = []; // for overflow popup
  const btnImg = (src) => el("img", { src, width: 16, height: 16, alt: "", draggable: "false" });
  const tools = el("div", { class: "wd-tools" });
  const tb = (img, title, fn, { toggle = false } = {}) => {
    const b = el("button", { class: "wd-tb", type: "button", title, "aria-label": title }, btnImg(img.startsWith("data:") ? img : img === "glyph" ? BLANK : IM + img + ".png"));
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => { fn(); });
    items.push({ el: b, title, fn }); tools.append(b); return b;
  };
  const sep = () => tools.append(el("span", { class: "wd-tsep" }));
  const grip = () => tools.append(el("span", { class: "wd-tgrip" }));
  const combo = (width, cls, list, getVal, pick, { editable = true } = {}) => {
    const input = el("input", { class: "wd-cin", type: "text", spellcheck: "false", value: getVal() });
    const arrow = el("button", { class: "wd-carrow", type: "button", tabindex: "-1", "aria-label": "Dropdown" });
    arrow.addEventListener("mousedown", (e) => e.preventDefault());
    const box = el("div", { class: "wd-combo " + cls, style: { width: width + "px" } }, input, arrow);
    const open = () => { saveSel(); const r = box.getBoundingClientRect(); popup(list().map((x) => ({ label: String(x.label ?? x), action: () => { input.value = String(x.label ?? x); pick(x); page.focus(); } })), r.left, r.bottom, { anchor: arrow }); };
    arrow.addEventListener("click", open);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); pick(input.value); page.focus(); } });
    input.addEventListener("focus", () => input.select());
    tools.append(box); items.push({ el: box, title: cls, fn: open });
    return Object.assign(box, { input });
  };
  const dd = (title, fn) => { const b = el("button", { class: "wd-dd", type: "button", title, "aria-label": title }); b.addEventListener("mousedown", (e) => e.preventDefault()); b.addEventListener("click", fn); tools.append(b); return b; };
  const paletteAt = (anchor, apply) => { const r = anchor.getBoundingClientRect(); popup([{ label: "Automatic", action: () => apply(null) }, ...COLORS.map((c) => ({ label: c, icon: null, action: () => apply(c) }))].slice(0, 1), r.left, r.bottom, { anchor }); };
  const colorMenu = (anchor, apply) => {
    const r = anchor.getBoundingClientRect(); saveSel();
    const grid = el("div", { class: "wd-palette" }, COLORS.map((c) => { const b = el("button", { type: "button", style: { background: c }, title: c }); b.addEventListener("mousedown", (e) => e.preventDefault()); b.addEventListener("click", () => { apply(c); grid.remove(); }); return b; }));
    grid.style.left = r.left + "px"; grid.style.top = r.bottom + "px"; document.querySelector("#menu-layer").append(grid);
    const away = (e) => { if (!grid.contains(e.target)) { grid.remove(); document.removeEventListener("pointerdown", away, true); } }; setTimeout(() => document.addEventListener("pointerdown", away, true));
  };

  grip();
  tb("new", "New", newDocument); tb("open", "Open", openDoc); tb("save", "Save", () => save()); tb("email", "E-mail", () => mailDoc()); sep();
  tb("print", "Print", printDoc); tb("preview", "Print Preview", () => printPreview()); tb("spell", "Spelling and Grammar", () => spellCheck()); sep();
  tb(SVG.cut, "Cut", () => run("cut")); tb(SVG.copy, "Copy", () => run("copy")); tb(SVG.paste, "Paste", async () => { try { run("insertText", await ctx.clipboard.getText?.() ?? await navigator.clipboard.readText()); } catch { run("paste"); } });
  tb("painter", "Format Painter", () => { restoreSel(); const s = window.getSelection(), e = s.anchorNode?.parentElement; if (!e) return; const cs = getComputedStyle(e); painter = { name: cs.fontFamily.split(",")[0].replace(/["']/g, ""), size: Math.round(parseFloat(cs.fontSize) * 0.75), color: cs.color, bold: +cs.fontWeight >= 600, italic: cs.fontStyle === "italic", underline: /underline/.test(cs.textDecorationLine) }; page.style.cursor = "copy"; });
  sep();
  tb(SVG.undo, "Undo", () => run("undo")); tb(SVG.redo, "Redo", () => run("redo")); sep();
  const tblBtn = tb("instable", "Insert Table", () => tableGrid(tblBtn)); sep();
  const zoomInput = el("input", { class: "wd-cin", type: "text", value: "100%", spellcheck: "false" });
  const zoomBox = el("div", { class: "wd-combo wd-zoom", style: { width: "92px" } }, zoomInput, el("button", { class: "wd-carrow", type: "button", tabindex: "-1" }));
  zoomBox.querySelector("button").addEventListener("mousedown", (e) => e.preventDefault());
  zoomBox.querySelector("button").addEventListener("click", () => { saveSel(); const r = zoomBox.getBoundingClientRect(); popup(ZOOMS.map((z) => ({ label: z, action: () => applyZoomText(z) })), r.left, r.bottom, { anchor: zoomBox }); });
  const applyZoomText = (t) => { const avail = scroller.clientWidth - 40; if (/width/i.test(t)) setZoom(avail / PAGE_W); else if (/whole/i.test(t)) setZoom(Math.min((scroller.clientHeight - 20) / PAGE_H, avail / PAGE_W)); else if (/two/i.test(t)) setZoom(Math.min(avail / (PAGE_W * 2 + 20), (scroller.clientHeight - 20) / PAGE_H)); else { const n = parseInt(t); if (n) setZoom(n / 100); } };
  zoomInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { applyZoomText(zoomInput.value); page.focus(); } });
  zoomInput.addEventListener("focus", () => zoomInput.select());
  tools.append(zoomBox); items.push({ el: zoomBox, title: "Zoom", fn: () => zoomInput.focus() });
  tb("help", "Microsoft Word Help", () => note("Use the menus and toolbars to create and format your document.", "Microsoft Word Help"));
  tools.append(el("span", { class: "wd-chev", title: "Toolbar Options", text: "»" })); grip();

  const styleBox = combo(160, "wd-style", () => STYLES.map((s) => s[0]), () => "Normal", (v) => { const name = v.label ?? v; const m = STYLES.find((s) => s[0] === name); if (m?.[1]) run("formatBlock", m[1]); });
  const fontBox = combo(150, "wd-font", () => FONTS, () => "Times New Roman", (v) => run("fontName", String(v.label ?? v)));
  const sizeBox = combo(44, "wd-size", () => SIZES, () => "12", (v) => { const n = parseFloat(v.label ?? v); if (n) setSize(n); });
  sep();
  const bBtn = tb("glyph", "Bold", () => run("bold")), iBtn = tb("glyph", "Italic", () => run("italic")), uBtn = tb("glyph", "Underline", () => run("underline"));
  // B / I / U are letters, not bitmaps
  [[bBtn, "B", "bold"], [iBtn, "I", "italic"], [uBtn, "U", "underline"]].forEach(([b, t, c]) => { b.replaceChildren(el("span", { class: "wd-glyph " + c, text: t })); });
  sep();
  const aBtns = { l: tb("alignl", "Align Left", () => run("justifyLeft")), c: tb("alignc", "Center", () => run("justifyCenter")), r: tb("alignr", "Align Right", () => run("justifyRight")), j: tb("alignj", "Justify", () => run("justifyFull")) };
  sep();
  tb("numbering", "Numbering", () => run("insertOrderedList")); tb("bullets", "Bullets", () => run("insertUnorderedList")); tb("outdent", "Decrease Indent", () => run("outdent")); tb("indent", "Increase Indent", () => run("indent")); sep();
  const borders = tb("borders", "Outside Border", () => { for (const b of topBlocks()) b.style.border = b.style.border ? "" : "1px solid #000"; status(); });
  const hi = tb("highlight", "Highlight", () => run("hiliteColor", lastHi)); const hiDd = dd("Highlight color", () => colorMenu(hiDd, (c) => { lastHi = c; run("hiliteColor", c); }));
  const fc = tb("fontcolor", "Font Color", () => run("foreColor", lastFg)); const fcDd = dd("Font color", () => colorMenu(fcDd, (c) => { lastFg = c; run("foreColor", c); }));
  const chevEnd = el("button", { class: "wd-chev wd-chev-end", type: "button", title: "Toolbar Options", text: "»" });
  tools.append(chevEnd);
  chevEnd.addEventListener("click", () => {
    const r = tools.getBoundingClientRect(), hidden = items.filter((i) => i.el.getBoundingClientRect().right > r.right - 6 && !i.el.classList.contains("wd-combo"));
    const rr = chevEnd.getBoundingClientRect();
    popup(hidden.length ? hidden.map((i) => ({ label: i.title, action: i.fn })) : [{ label: "Add or Remove Buttons", disabled: true }], rr.left - 120, rr.bottom, { anchor: chevEnd });
  });

  tools.addEventListener("scroll", () => { tools.scrollLeft = 0; });

  // ---------- menus ----------
  const recentDocs = () => (ctx.settings.get("recentFiles") || []).filter((p) => /\.(doc|txt|wdoc)$/i.test(p) && ctx.fs.exists(p)).slice(0, 4);
  const nImg = (n) => ({ label: n });
  const mailDoc = () => ctx.launch("outlook", { compose: true, subject: docTitle, body: page.innerText.trim() });
  const printPreview = () => { setView("print"); applyZoomText("Whole Page"); };
  const menus = menuBar({
    File: () => [
      { label: "New...", shortcut: "Ctrl+N", action: newDocument }, { label: "Open...", shortcut: "Ctrl+O", action: openDoc }, { label: "Close", action: closeDoc }, { separator: true },
      { label: "Save", shortcut: "Ctrl+S", action: () => save() }, { label: "Save As...", action: () => save(true) }, { label: "Save as Web Page...", action: () => save(true, "htm") }, { separator: true },
      { label: "Page Setup...", action: pageSetupDlg }, { label: "Print Preview", action: printPreview }, { label: "Print...", shortcut: "Ctrl+P", action: printDoc }, { separator: true },
      { label: "Send To", submenu: [{ label: "Mail Recipient", action: mailDoc }, { label: "My Documents", action: async () => { const t = DOCS + "/" + (filename ? basename(filename) : docTitle + ".doc"); await ctx.fs.writeFile(t, wordHtml(basename(t), page.innerHTML, JSON.stringify(layoutState())), { mime: "application/msword" }); } }] },
      { label: "Properties", action: () => note(`${docTitle}\n\nType: Microsoft Word Document\nLocation: ${filename || "(not saved)"}\nPages: ${pageCount()}\nSize: ${page.innerHTML.length} bytes`, "Properties") }, { separator: true },
      ...recentDocs().flatMap((p, i) => [{ label: `${i + 1} ${basename(p)}`, action: () => ctx.launch("word", { path: p }) }]), ...(recentDocs().length ? [{ separator: true }] : []),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => run("undo") }, { label: "Repeat", shortcut: "Ctrl+Y", action: () => run("redo") }, { separator: true },
      { label: "Cut", shortcut: "Ctrl+X", action: () => run("cut") }, { label: "Copy", shortcut: "Ctrl+C", action: () => run("copy") }, { label: "Paste", shortcut: "Ctrl+V", action: async () => { try { run("insertText", await navigator.clipboard.readText()); } catch { run("paste"); } } },
      { label: "Clear", submenu: [{ label: "Formats", shortcut: "Ctrl+Shift+Z", action: () => run("removeFormat") }, { label: "Contents", shortcut: "Del", action: () => run("delete") }] },
      { label: "Select All", shortcut: "Ctrl+A", action: () => { page.focus(); document.execCommand("selectAll"); saveSel(); } }, { separator: true },
      { label: "Find...", shortcut: "Ctrl+F", action: () => showFind("find") }, { label: "Replace...", shortcut: "Ctrl+H", action: () => showFind("replace") }, { label: "Go To...", shortcut: "Ctrl+G", action: gotoDlg },
    ],
    View: () => [
      { label: "Normal", checked: view === "normal", action: () => setView("normal") }, { label: "Web Layout", checked: view === "web", action: () => setView("web") }, { label: "Print Layout", checked: view === "print", action: () => setView("print") }, { separator: true },
      { label: "Ruler", checked: st.ruler, action: () => { st.ruler = !st.ruler; ctx.settings.set("word", st); w.el.classList.toggle("wd-no-ruler", !st.ruler); } }, { separator: true },
      { label: "Header and Footer...", action: headerFooterDlg }, { label: "Zoom...", action: zoomDlg },
    ],
    Insert: () => [
      { label: "Break...", action: breakDlg }, { label: "Page Numbers...", action: pageNumbersDlg }, { label: "Date and Time...", action: dateDlg }, { label: "Symbol...", action: symbolDlg }, { separator: true },
      { label: "Picture", submenu: [{ label: "From File...", action: insertPicture }, { label: "From Computer...", action: insertPictureFromComputer }] },
      { label: "File...", action: async () => { const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Insert File" }); if (p) run("insertText", ctx.fs.readFile(p)); } }, { separator: true },
      { label: "Hyperlink", shortcut: "Ctrl+K", action: insertLink },
    ],
    Format: () => [
      { label: "Font...", action: fontDlg }, { label: "Paragraph...", action: paraDlg }, { label: "Bullets", action: () => run("insertUnorderedList") }, { label: "Numbering", action: () => run("insertOrderedList") }, { separator: true },
      { label: "Change Case", submenu: [{ label: "Sentence case.", action: () => changeCase("sentence") }, { label: "lowercase", action: () => changeCase("lower") }, { label: "UPPERCASE", action: () => changeCase("upper") }, { label: "Title Case", action: () => changeCase("title") }, { label: "tOGGLE cASE", action: () => changeCase("toggle") }] }, { separator: true },
      { label: "Picture...", disabled: !selImg, action: pictureDlg },
    ],
    Tools: () => [
      { label: "Spelling and Grammar...", shortcut: "F7", action: spellCheck }, { label: "Word Count...", action: wordCount },
    ],
    Table: () => [
      { label: "Insert", submenu: [{ label: "Table...", action: tableDlg }, { label: "Columns to the Left", action: () => tableOp("colLeft") }, { label: "Columns to the Right", action: () => tableOp("colRight") }, { label: "Rows Above", action: () => tableOp("rowAbove") }, { label: "Rows Below", action: () => tableOp("rowBelow") }] },
      { label: "Delete", submenu: [{ label: "Table", action: () => tableOp("delTable") }, { label: "Columns", action: () => tableOp("delCol") }, { label: "Rows", action: () => tableOp("delRow") }] },
      { label: "Select", submenu: [{ label: "Table", action: () => tableOp("selTable") }, { label: "Row", action: () => tableOp("selRow") }, { label: "Cell", action: () => tableOp("selCell") }] }, { separator: true },
      { label: "Merge Cells", action: mergeCells }, { label: "Split Cells", action: splitCell }, { separator: true },
      { label: "Table AutoFormat...", action: autoFormatDlg }, { label: "AutoFit to Window", action: autoFit }, { label: "Hide Gridlines", checked: page.classList.contains("wd-nogrid"), action: () => page.classList.toggle("wd-nogrid") },
    ],
    Window: () => [{ label: "New Window", action: () => ctx.launch("word") }, { separator: true }, { label: `1 ${docTitle}`, checked: true }],
    Help: [
      { label: "Microsoft Word Help", shortcut: "F1", action: () => note("Use the menus and toolbars to create and format your document.", "Microsoft Word Help") }, { separator: true },
      { label: "About Microsoft Word", action: () => ctx.dialogs.message("Microsoft® Word 2000\n\nVersion 9.0.2812\nCopyright © 1983-1999 Microsoft Corporation. All rights reserved.\n\nThis is a browser re-creation for the Windows2000 project.", { title: "About Microsoft Word", icon: "info" }) },
    ],
  });
  menus.prepend(el("span", { class: "wd-mgrip" }));
  const mdiClose = el("button", { class: "wd-mdi-close", type: "button", title: "Close Window", "aria-label": "Close Window", text: "×" });
  mdiClose.addEventListener("click", () => closeDoc());
  menus.append(mdiClose);
  async function closeDoc() { if (await discard()) { page.innerHTML = "<p><br></p>"; filename = null; saved = snap(); setTitleFromState(); status(); } }

  // ---------- views, status ----------
  const viewBtns = [["normal", "Normal View"], ["web", "Web Layout View"], ["print", "Print Layout View"]].map(([k, t]) => {
    const b = el("button", { class: "wd-vb " + k, type: "button", title: t, "aria-label": t }); b.addEventListener("click", () => setView(k)); return [k, b];
  });
  const fields = { page: el("div", { class: "wd-sp", style: { width: "66px" }, text: "Page 1" }), sec: el("div", { class: "wd-sp", style: { width: "58px" }, text: "Sec 1" }), pg: el("div", { class: "wd-sp", style: { width: "62px" }, text: "1/1" }), at: el("div", { class: "wd-sp", style: { width: "78px" }, text: 'At 1"' }), ln: el("div", { class: "wd-sp", style: { width: "54px" }, text: "Ln 1" }), col: el("div", { class: "wd-sp", style: { width: "54px" }, text: "Col 1" }) };
  const mode = (t) => { const d = el("div", { class: "wd-sp wd-mode", text: t, title: t }); d.addEventListener("dblclick", () => { if (t === "OVR") { overwrite = !overwrite; d.classList.toggle("on", overwrite); } else d.classList.toggle("on"); }); return d; };
  const statusRow = el("div", { class: "wd-status" }, ...Object.values(fields), mode("REC"), mode("TRK"), mode("EXT"), mode("OVR"), el("div", { class: "wd-sp", style: { width: "50px" } }), el("div", { class: "wd-sp", style: { width: "36px" } }), el("span", { class: "wd-sgrip" }));
  function status() {
    const s = window.getSelection(); let node = s.rangeCount && inPage(s.anchorNode) ? s : null;
    const pc = pageCount(); let pg = 1, atIn = 1, ln = 1, col = 1;
    if (node) {
      const r = s.getRangeAt(0).cloneRange(); r.collapse(true); let rect = r.getClientRects()[0];
      const pr = page.getBoundingClientRect();
      if (!rect) { const e = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement; rect = e.getBoundingClientRect(); }
      const y = (rect.top - pr.top) / zoom; pg = Math.max(1, Math.min(pc, Math.floor(y / PAGE_H) + 1));
      atIn = Math.max(0, (y - (pg - 1) * PAGE_H) / 96); const lh = (parseFloat(getComputedStyle(page).fontSize) || 16) * 1.15;
      ln = Math.max(1, Math.round((y - (pg - 1) * PAGE_H - MT) / lh) + 1);
      col = (s.anchorNode.nodeType === 3 ? s.anchorOffset : 0) + 1;
      const e = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement; const cs = getComputedStyle(e);
      const pt = Math.round(parseFloat(cs.fontSize) * 0.75), name = cs.fontFamily.split(",")[0].replace(/["']/g, "");
      if (document.activeElement !== fontBox.input) fontBox.input.value = name; if (document.activeElement !== sizeBox.input) sizeBox.input.value = String(pt);
      const blk = e.closest("h1,h2,h3"); if (document.activeElement !== styleBox.input) styleBox.input.value = blk ? { H1: "Heading 1", H2: "Heading 2", H3: "Heading 3" }[blk.tagName] : "Normal";
      for (const [b, c] of [[bBtn, "bold"], [iBtn, "italic"], [uBtn, "underline"], [aBtns.l, "justifyLeft"], [aBtns.c, "justifyCenter"], [aBtns.r, "justifyRight"], [aBtns.j, "justifyFull"]]) { try { b.classList.toggle("on", document.queryCommandState(c)); } catch { /* ignore */ } }
    }
    fields.page.textContent = `Page ${pg}`; fields.pg.textContent = `${pg}/${pc}`; fields.at.textContent = `At ${atIn < 1 ? "1" : atIn.toFixed(1).replace(/\.0$/, "")}"`;
    fields.ln.textContent = `Ln ${ln}`; fields.col.textContent = `Col ${col}`;
  }

  // ---------- assemble ----------
  const tabBtn = el("button", { class: "wd-tabsel", type: "button", title: "Left Tab", text: "L" });
  const tabKinds = [["L", "Left Tab"], ["└", "Center Tab"], ["┘", "Right Tab"], ["└.", "Decimal Tab"]]; let tk = 0;
  tabBtn.addEventListener("click", () => { tk = (tk + 1) % 4; tabBtn.textContent = tabKinds[tk][0]; tabBtn.title = tabKinds[tk][1]; });
  const rulerRow = el("div", { class: "wd-rulerrow" }, tabBtn, hruler);
  const body = el("div", { class: "wd-body" },
    el("div", { class: "wd-vr" }, vruler), scroller, el("div", { class: "wd-right" }, vbar, browseBtns),
    el("div", { class: "wd-bottom" }, el("div", { class: "wd-views" }, ...viewBtns.map(([, b]) => b)), hbar));
  w.setContent(menus, tools, rulerRow, body, statusRow);

  // ---------- events ----------
  document.addEventListener("selectionchange", () => { if (!w.closed && inPage(window.getSelection().anchorNode)) { saveSel(); status(); } });
  page.addEventListener("input", () => { fixSizes(); if (selImg && !selImg.isConnected) selectImg(null); fit(); status(); syncBars(); drawV(); });
  page.addEventListener("click", (e) => { selectImg(e.target.tagName === "IMG" && page.contains(e.target) ? e.target : null); });
  page.addEventListener("dblclick", (e) => { if (e.target.tagName === "IMG") { selectImg(e.target); pictureDlg(); } });
  page.addEventListener("keyup", status);
  page.addEventListener("mouseup", () => {
    saveSel(); status();
    if (painter && !window.getSelection().isCollapsed) {
      const p = painter; painter = null; page.style.cursor = "";
      document.execCommand("fontName", false, p.name); setSize(p.size); document.execCommand("foreColor", false, p.color);
      if (document.queryCommandState("bold") !== p.bold) document.execCommand("bold"); if (document.queryCommandState("italic") !== p.italic) document.execCommand("italic"); if (document.queryCommandState("underline") !== p.underline) document.execCommand("underline");
    }
  });
  page.addEventListener("keydown", (e) => {
    if (overwrite && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) { const s = window.getSelection(); if (s.isCollapsed && s.anchorNode?.nodeType === 3 && s.anchorOffset < s.anchorNode.nodeValue.length) s.modify("extend", "forward", "character"); }
    if (e.key === "Tab") {
      e.preventDefault();
      const c = curCell();
      if (c) {
        const cells = [...c.closest("table").querySelectorAll("td,th")], i = cells.indexOf(c) + (e.shiftKey ? -1 : 1);
        if (i >= cells.length) { tableOp("rowBelow"); const t = c.closest("table"), nc = t.rows[t.rows.length - 1].cells[0]; const r = document.createRange(); r.selectNodeContents(nc); r.collapse(true); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); saveSel(); fit(); }
        else if (i >= 0) { const r = document.createRange(); r.selectNodeContents(cells[i]); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); saveSel(); }
      } else document.execCommand("insertText", false, "\t");
    }
  });
  w.el.addEventListener("keydown", (e) => {
    if (!e.ctrlKey || e.altKey) { if (e.key === "F7") { e.preventDefault(); spellCheck(); } return; }
    const k = e.key.toLowerCase(), map = { n: newDocument, o: openDoc, s: () => save(), p: printDoc, f: () => showFind("find"), h: () => showFind("replace"), g: gotoDlg, k: insertLink, l: () => run("justifyLeft"), e: () => run("justifyCenter"), r: () => run("justifyRight"), j: () => run("justifyFull") };
    if (map[k]) { e.preventDefault(); map[k](); }
  });
  page.addEventListener("paste", (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type));
    if (f) { e.preventDefault(); const fr = new FileReader(); fr.onload = () => addImage(fr.result); fr.readAsDataURL(f); return; }
    setTimeout(() => { fixSizes(); fit(); status(); });
  });
  page.addEventListener("drop", (e) => { const f = [...(e.dataTransfer?.files || [])].find((x) => /^image\//.test(x.type)); if (f) { e.preventDefault(); const fr = new FileReader(); fr.onload = () => addImage(fr.result); fr.readAsDataURL(f); } });
  scroller.addEventListener("pointerdown", (e) => { if (!layer.contains(e.target) && e.target.tagName !== "IMG" && selImg) selectImg(null); });
  new ResizeObserver(() => { layout(); }).observe(scroller);
  new ResizeObserver(() => { syncBars(); drawV(); placeSel(); }).observe(page);
  w.onClose = async () => { if (await discard()) { findWin && !findWin.closed && findWin.close(); return true; } return false; };

  ready = true; applyPageSetup();
  if (path && ctx.fs.exists(path)) loadPath(path);
  saved = snap(); setTitleFromState();
  setView(st.view === "normal" || st.view === "web" ? st.view : "print"); w.el.classList.toggle("wd-no-ruler", !st.ruler); setZoom(1);
  queueMicrotask(() => { page.focus(); const r = document.createRange(); r.selectNodeContents(page.firstChild || page); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); saveSel(); status(); });
  return w;
}
