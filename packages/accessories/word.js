// Microsoft Word 2000 re-creation. Layout (menu bar with MDI close box, shared Standard/Formatting toolbar row, rulers,
// grey workspace with a white page, view buttons, status bar) follows the user's Word 2000 reference screenshots; the toolbar
// bitmaps are cut from those screenshots. Editing uses the browser's contenteditable engine; documents are saved as Word-style HTML in .doc files.
import { el, button, menuBar, popup, icon } from "../ui/index.js";
import { basename, normalizePath, extension, DOCS, pickFiles } from "../core/index.js";

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
const PAGE_W = 816, PAGE_H = 1056, MARGIN_X = 120, MARGIN_Y = 96;
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
const wordHtml = (title, body) =>
  `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n<head>\n<meta http-equiv=Content-Type content="text/html; charset=utf-8">\n<meta name=ProgId content=Word.Document>\n<meta name=Generator content="Microsoft Word 9">\n<title>${escapeHtml(title)}</title>\n<style>p{margin:0}body{font:12pt "Times New Roman"}</style>\n</head>\n<body lang=EN-US>\n<div class=Section1>\n${body}\n</div>\n</body>\n</html>`;

export function openWord(ctx, { path = null } = {}) {
  const docNo = ++docCounter;
  const w = ctx.wm.create({ title: `Document${docNo} - Microsoft Word`, icon: "word", width: 1010, height: 700, x: 2, y: 2, appId: "word", className: "wd-window" });
  const st = Object.assign({ view: "print", ruler: true }, ctx.settings.get("word") || {});
  let filename = null, saved = "", zoom = 1, view = "print", overwrite = false, lastSel = null, painter = null, lastHi = "#ffff00", lastFg = "#ff0000";
  let docTitle = `Document${docNo}`;

  const page = el("div", { class: "wd-page", contenteditable: "true", role: "textbox", "aria-multiline": "true", "aria-label": "Document", spellcheck: "true" });
  const sheet = el("div", { class: "wd-sheet" }, page);
  const scroller = el("div", { class: "wd-scroller" }, sheet);
  document.execCommand?.("defaultParagraphSeparator", false, "p");
  document.execCommand?.("styleWithCSS", false, true);
  page.innerHTML = "<p><br></p>";

  const note = (m, t = "Microsoft Word") => ctx.dialogs.message(m, { title: t, icon: "info" });
  const na = (what) => note(`${what} is not available in this version of Microsoft Word.`);

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
  const dirty = () => page.innerHTML !== saved;
  const setTitleFromState = () => { docTitle = filename ? basename(filename) : `Document${docNo}`; w.setTitle(`${docTitle} - Microsoft Word`); };
  const loadContent = (raw) => {
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
    page.innerHTML = "<p><br></p>"; filename = null; saved = page.innerHTML; setTitleFromState(); status();
  };
  const openDoc = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Open" });
    if (!p) return;
    if (!dirty() && !filename) { loadPath(p); } else ctx.launch("word", { path: p });
  };
  const loadPath = (p) => {
    try { loadContent(ctx.fs.readFile(p)); } catch (e) { ctx.dialogs.message(`Word cannot open '${basename(p)}'.\n\n${e.message || e}`, { title: "Microsoft Word", icon: "error" }); return; }
    filename = normalizePath(p); saved = page.innerHTML; setTitleFromState(); status();
    const rec = ctx.settings.get("recentFiles") || []; ctx.settings.set("recentFiles", [filename, ...rec.filter((x) => x !== filename)].slice(0, 12));
  };
  const save = async (as = false) => {
    let target = filename;
    if (as || !target) target = await ctx.dialogs.file({ mode: "save", path: DOCS, name: target ? basename(target) : `${docTitle}.doc`, normalizeName: (n) => (extension(n) ? n : n + ".doc"), title: "Save As" });
    if (!target) return false;
    const html = page.innerHTML;
    const ext = extension(target);
    await ctx.fs.writeFile(target, ext === "txt" ? page.innerText : wordHtml(basename(target), html), { mime: ext === "txt" ? "text/plain" : "application/msword" });
    filename = normalizePath(target); saved = html; setTitleFromState(); return true;
  };
  const discard = async () => {
    if (!dirty()) return true;
    const a = await ctx.dialogs.message(`Do you want to save the changes to ${docTitle}?`, { title: "Microsoft Word", icon: "warning", buttons: ["Yes", "No", "Cancel"] });
    return a === "Yes" ? await save() : a === "No";
  };
  const printDoc = () => { try { ctx.printHTML?.(`<div style="font:12pt 'Times New Roman'">${page.innerHTML}</div>`); } catch (e) { ctx.dialogs.error(e); } };

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
  const tableDlg = () => dlg("Insert Table", 330, 190, (done) => {
    const c = num(2), r = num(2);
    return el("div", { class: "wd-dlg" }, el("fieldset", {}, el("legend", { text: "Table size" }), row(el("label", { text: "Number of columns:" }), c), row(el("label", { text: "Number of rows:" }), r)),
      btns(done, () => {
        const cols = Math.max(1, Math.min(63, parseInt(c.value) || 1)), rows = Math.max(1, Math.min(500, parseInt(r.value) || 1));
        const cell = `<td style="border:1px solid #000;width:${Math.floor((576 / cols))}px;padding:0 7px;vertical-align:top">&nbsp;</td>`;
        run("insertHTML", `<table style="border-collapse:collapse;border:1px solid #000"><tbody>${`<tr>${cell.repeat(cols)}</tr>`.repeat(rows)}</tbody></table><p><br></p>`); done(true);
      }));
  });
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
  const insertPicture = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Insert Picture" });
    if (!p) return;
    const c = ctx.fs.readFile(p);
    if (/^data:image\//.test(c)) run("insertHTML", `<img src="${c}">`); else note("The picture file could not be inserted.");
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
    const mk = () => { const c = cell.cloneNode(false); c.innerHTML = "&nbsp;"; return c; };
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

  // ---------- zoom / view ----------
  const pageCount = () => Math.max(1, Math.ceil((page.scrollHeight) / PAGE_H));
  const setZoom = (z) => { zoom = Math.max(0.1, Math.min(5, z)); page.style.zoom = zoom; zoomInput.value = Math.round(zoom * 100) + "%"; layout(); };
  const setView = (v) => { view = v; w.el.classList.toggle("wd-normal", v === "normal" || v === "web"); viewBtns.forEach(([k, b]) => b.classList.toggle("on", k === v)); layout(); };

  // ---------- rulers ----------
  const hruler = el("div", { class: "wd-hruler" }), vruler = el("div", { class: "wd-vruler" });
  const hInner = el("div", { class: "wd-hinner" }), vInner = el("div", { class: "wd-vinner" });
  hruler.append(hInner); vruler.append(vInner);
  const drawH = () => {
    const z = view === "print" ? zoom : zoom, pw = (view === "print" ? PAGE_W : page.offsetWidth) * z, lm = (view === "print" ? MARGIN_X : 0) * z, rm = pw - lm * 1, parts = [];
    const textR = pw - lm;
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
    const z = zoom, ph = PAGE_H * z * pageCount(), tm = MARGIN_Y * z, parts = [`<rect x="0" y="0" width="15" height="${ph}" fill="#808080"/><rect x="0" y="${tm}" width="15" height="${ph - tm * 2}" fill="#fff"/>`];
    for (let i = -Math.floor(tm / (12 * z)); (tm + i * 12 * z) <= ph; i++) {
      const y = tm + i * 12 * z; if (y < 0) continue; const inw = y >= tm && y <= ph - tm, c = inw ? "#000" : "#fff";
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
    align(); drawH(); drawV(); syncBars();
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
  tb("new", "New", newDocument); tb("open", "Open", openDoc); tb("save", "Save", () => save()); tb("email", "E-mail", () => note("No e-mail program is configured.")); sep();
  tb("print", "Print", printDoc); tb("preview", "Print Preview", () => note("Print Preview is not available; use Print to open the print dialog.")); tb("spell", "Spelling and Grammar", () => note("The spelling and grammar check is complete.")); sep();
  tb(SVG.cut, "Cut", () => run("cut")); tb(SVG.copy, "Copy", () => run("copy")); tb(SVG.paste, "Paste", async () => { try { run("insertText", await ctx.clipboard.getText?.() ?? await navigator.clipboard.readText()); } catch { run("paste"); } });
  tb("painter", "Format Painter", () => { restoreSel(); const s = window.getSelection(), e = s.anchorNode?.parentElement; if (!e) return; const cs = getComputedStyle(e); painter = { name: cs.fontFamily.split(",")[0].replace(/["']/g, ""), size: Math.round(parseFloat(cs.fontSize) * 0.75), color: cs.color, bold: +cs.fontWeight >= 600, italic: cs.fontStyle === "italic", underline: /underline/.test(cs.textDecorationLine) }; page.style.cursor = "copy"; });
  sep();
  tb(SVG.undo, "Undo", () => run("undo")); dd("Undo list", () => note("Nothing to undo.")); tb(SVG.redo, "Redo", () => run("redo")); dd("Redo list", () => note("Nothing to redo.")); sep();
  tb("web", "Web Toolbar", () => na("The Web toolbar")); sep();
  tb("tables", "Tables and Borders", () => na("The Tables and Borders toolbar")); tb("instable", "Insert Table", tableDlg); tb("excel", "Insert Microsoft Excel Worksheet", () => na("Inserting a worksheet")); tb("columns", "Columns", () => na("Columns")); tb("drawing", "Drawing", () => na("The Drawing toolbar")); sep();
  tb("docmap", "Document Map", () => na("Document Map")); sep();
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
  const borders = tb("borders", "Outside Border", () => { for (const b of topBlocks()) b.style.border = b.style.border ? "" : "1px solid #000"; status(); }); dd("Border options", () => na("Border options"));
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
  const menus = menuBar({
    File: () => [
      { label: "New...", shortcut: "Ctrl+N", action: newDocument }, { label: "Open...", shortcut: "Ctrl+O", action: openDoc }, { label: "Close", action: closeDoc }, { separator: true },
      { label: "Save", shortcut: "Ctrl+S", action: () => save() }, { label: "Save As...", action: () => save(true) }, { label: "Save as Web Page...", action: () => na("Save as Web Page") }, { label: "Versions...", disabled: true }, { separator: true },
      { label: "Web Page Preview", action: () => na("Web Page Preview") }, { separator: true },
      { label: "Page Setup...", action: () => na("Page Setup") }, { label: "Print Preview", action: () => note("Print Preview is not available; use Print to open the print dialog.") }, { label: "Print...", shortcut: "Ctrl+P", action: printDoc }, { separator: true },
      { label: "Send To", submenu: [{ label: "Mail Recipient", action: () => note("No e-mail program is configured.") }, { label: "My Documents", action: async () => { const t = DOCS + "/" + (filename ? basename(filename) : docTitle + ".doc"); await ctx.fs.writeFile(t, wordHtml(basename(t), page.innerHTML), { mime: "application/msword" }); } }] },
      { label: "Properties", action: () => note(`${docTitle}\n\nType: Microsoft Word Document\nLocation: ${filename || "(not saved)"}\nSize: ${page.innerHTML.length} bytes`, "Properties") }, { separator: true },
      ...recentDocs().flatMap((p, i) => [{ label: `${i + 1} ${basename(p)}`, action: () => ctx.launch("word", { path: p }) }]), ...(recentDocs().length ? [{ separator: true }] : []),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => run("undo") }, { label: "Repeat", shortcut: "Ctrl+Y", action: () => run("redo") }, { separator: true },
      { label: "Cut", shortcut: "Ctrl+X", action: () => run("cut") }, { label: "Copy", shortcut: "Ctrl+C", action: () => run("copy") }, { label: "Office Clipboard...", action: () => na("The Office Clipboard") }, { label: "Paste", shortcut: "Ctrl+V", action: async () => { try { run("insertText", await navigator.clipboard.readText()); } catch { run("paste"); } } },
      { label: "Paste Special...", action: () => na("Paste Special") }, { label: "Paste as Hyperlink", disabled: true }, { label: "Clear", submenu: [{ label: "Formats", shortcut: "Ctrl+Shift+Z", action: () => run("removeFormat") }, { label: "Contents", shortcut: "Del", action: () => run("delete") }] },
      { label: "Select All", shortcut: "Ctrl+A", action: () => { page.focus(); document.execCommand("selectAll"); saveSel(); } }, { separator: true },
      { label: "Find...", shortcut: "Ctrl+F", action: () => showFind("find") }, { label: "Replace...", shortcut: "Ctrl+H", action: () => showFind("replace") }, { label: "Go To...", shortcut: "Ctrl+G", action: gotoDlg }, { separator: true },
      { label: "Links...", disabled: true }, { label: "Object", disabled: true },
    ],
    View: () => [
      { label: "Normal", checked: view === "normal", action: () => setView("normal") }, { label: "Web Layout", checked: view === "web", action: () => setView("web") }, { label: "Print Layout", checked: view === "print", action: () => setView("print") }, { label: "Outline", action: () => na("Outline view") }, { separator: true },
      { label: "Master Document", disabled: true }, { separator: true },
      { label: "Toolbars", submenu: [{ label: "Standard", checked: true }, { label: "Formatting", checked: true }, { label: "Tables and Borders" }, { label: "Web" }, { label: "Drawing" }] },
      { label: "Ruler", checked: st.ruler, action: () => { st.ruler = !st.ruler; ctx.settings.set("word", st); w.el.classList.toggle("wd-no-ruler", !st.ruler); } }, { label: "Document Map", action: () => na("Document Map") }, { separator: true },
      { label: "Header and Footer", action: () => na("Header and Footer") }, { label: "Footnotes", disabled: true }, { label: "Comments", disabled: true }, { separator: true },
      { label: "Full Screen", action: () => na("Full Screen view") }, { label: "Zoom...", action: zoomDlg },
    ],
    Insert: () => [
      { label: "Break...", action: breakDlg }, { label: "Page Numbers...", action: () => na("Page Numbers") }, { label: "Date and Time...", action: dateDlg }, { label: "AutoText", submenu: [{ label: "Normal", action: () => {} }] }, { label: "Field...", action: () => na("Fields") }, { label: "Symbol...", action: symbolDlg }, { separator: true },
      { label: "Comment", action: () => na("Comments") }, { label: "Footnote...", action: () => na("Footnotes") }, { label: "Caption...", action: () => na("Captions") }, { label: "Cross-reference...", action: () => na("Cross-references") }, { label: "Index and Tables...", action: () => na("Index and Tables") }, { separator: true },
      { label: "Picture", submenu: [{ label: "From File...", action: insertPicture }, { label: "Clip Art...", action: () => na("Clip Art") }] }, { label: "Text Box", action: () => na("Text Box") }, { label: "File...", action: async () => { const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Insert File" }); if (p) run("insertText", ctx.fs.readFile(p)); } }, { label: "Object...", action: () => na("Objects") }, { label: "Bookmark...", action: () => na("Bookmarks") }, { separator: true },
      { label: "Hyperlink", shortcut: "Ctrl+K", action: insertLink },
    ],
    Format: () => [
      { label: "Font...", action: fontDlg }, { label: "Paragraph...", action: paraDlg }, { label: "Bullets and Numbering...", action: () => run("insertUnorderedList") }, { label: "Borders and Shading...", action: () => na("Borders and Shading") }, { label: "Columns...", action: () => na("Columns") }, { label: "Tabs...", action: () => na("Tabs") }, { label: "Drop Cap...", action: () => na("Drop Cap") }, { label: "Text Direction...", action: () => na("Text Direction") },
      { label: "Change Case...", submenu: [{ label: "Sentence case.", action: () => changeCase("sentence") }, { label: "lowercase", action: () => changeCase("lower") }, { label: "UPPERCASE", action: () => changeCase("upper") }, { label: "Title Case", action: () => changeCase("title") }, { label: "tOGGLE cASE", action: () => changeCase("toggle") }] }, { separator: true },
      { label: "Background", submenu: [{ label: "No Fill", action: () => { page.style.background = ""; } }, { label: "Fill Effects...", action: () => na("Fill Effects") }] }, { label: "Theme...", action: () => na("Themes") }, { label: "Frames", submenu: [{ label: "New Frame", disabled: true }] }, { label: "AutoFormat...", action: () => na("AutoFormat") }, { label: "Style Gallery...", action: () => na("Style Gallery") }, { label: "Style...", action: () => na("Styles") }, { label: "Object...", disabled: true },
    ],
    Tools: () => [
      { label: "Spelling and Grammar...", shortcut: "F7", action: () => note("The spelling and grammar check is complete.") }, { label: "Language", submenu: [{ label: "English (U.S.)", checked: true }] }, { label: "Word Count...", action: wordCount }, { label: "AutoSummarize...", action: () => na("AutoSummarize") }, { label: "Merge Documents...", action: () => na("Merge Documents") }, { label: "Protect Document...", action: () => na("Document protection") }, { separator: true },
      { label: "Online Collaboration", submenu: [{ label: "Meet Now", disabled: true }] }, { separator: true },
      { label: "Mail Merge...", action: () => na("Mail Merge") }, { label: "Envelopes and Labels...", action: () => na("Envelopes and Labels") }, { label: "Letter Wizard...", action: () => na("Letter Wizard") }, { separator: true },
      { label: "Macro", submenu: [{ label: "Macros...", shortcut: "Alt+F8", action: () => na("Macros") }, { label: "Record New Macro...", action: () => na("Macro recording") }] }, { label: "Templates and Add-Ins...", action: () => na("Templates and Add-Ins") }, { label: "Customize...", action: () => na("Customize") }, { label: "Options...", action: () => na("Options") },
    ],
    Table: () => [
      { label: "Draw Table", action: () => na("Draw Table") }, { label: "Insert", submenu: [{ label: "Table...", action: tableDlg }, { label: "Columns to the Left", action: () => tableOp("colLeft") }, { label: "Columns to the Right", action: () => tableOp("colRight") }, { label: "Rows Above", action: () => tableOp("rowAbove") }, { label: "Rows Below", action: () => tableOp("rowBelow") }] },
      { label: "Delete", submenu: [{ label: "Table", action: () => tableOp("delTable") }, { label: "Columns", action: () => tableOp("delCol") }, { label: "Rows", action: () => tableOp("delRow") }] },
      { label: "Select", submenu: [{ label: "Table", action: () => tableOp("selTable") }, { label: "Row", action: () => tableOp("selRow") }, { label: "Cell", action: () => tableOp("selCell") }] }, { separator: true },
      { label: "Merge Cells", disabled: true }, { label: "Split Cells...", disabled: true }, { separator: true }, { label: "Table AutoFormat...", action: () => na("Table AutoFormat") }, { label: "AutoFit", disabled: true }, { label: "Heading Rows Repeat", disabled: true }, { label: "Convert", disabled: true }, { label: "Sort...", action: () => na("Sort") }, { label: "Formula...", action: () => na("Formula") }, { label: "Hide Gridlines", action: () => page.classList.toggle("wd-nogrid") }, { separator: true }, { label: "Table Properties...", disabled: true },
    ],
    Window: () => [{ label: "New Window", action: () => ctx.launch("word") }, { label: "Arrange All", disabled: true }, { label: "Split", disabled: true }, { separator: true }, { label: `1 ${docTitle}`, checked: true }],
    Help: [
      { label: "Microsoft Word Help", shortcut: "F1", action: () => note("Use the menus and toolbars to create and format your document.", "Microsoft Word Help") }, { label: "Show the Office Assistant", action: () => na("The Office Assistant") }, { label: "What's This?", shortcut: "Shift+F1", action: () => na("What's This?") }, { separator: true },
      { label: "Office on the Web", action: () => note("An internet connection is required.") }, { separator: true }, { label: "Detect and Repair...", action: () => na("Detect and Repair") }, { label: "About Microsoft Word", action: () => ctx.dialogs.message("Microsoft® Word 2000\n\nVersion 9.0.2812\nCopyright © 1983-1999 Microsoft Corporation. All rights reserved.\n\nThis is a browser re-creation for the Windows2000 simulator.", { title: "About Microsoft Word", icon: "word" }) },
    ],
  });
  menus.prepend(el("span", { class: "wd-mgrip" }));
  const mdiClose = el("button", { class: "wd-mdi-close", type: "button", title: "Close Window", "aria-label": "Close Window", text: "×" });
  mdiClose.addEventListener("click", () => closeDoc());
  menus.append(mdiClose);
  async function closeDoc() { if (await discard()) { page.innerHTML = "<p><br></p>"; filename = null; saved = page.innerHTML; setTitleFromState(); status(); } }

  // ---------- views, status ----------
  const viewBtns = [["normal", "Normal View"], ["web", "Web Layout View"], ["print", "Print Layout View"], ["outline", "Outline View"]].map(([k, t]) => {
    const b = el("button", { class: "wd-vb " + k, type: "button", title: t, "aria-label": t }); b.addEventListener("click", () => (k === "outline" ? na("Outline view") : setView(k))); return [k, b];
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
      ln = Math.max(1, Math.round((y - (pg - 1) * PAGE_H - MARGIN_Y) / lh) + 1);
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
  page.addEventListener("input", () => { fixSizes(); status(); syncBars(); drawV(); });
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
    if (e.key === "Tab") { e.preventDefault(); document.execCommand("insertText", false, "\t"); }
  });
  w.el.addEventListener("keydown", (e) => {
    if (!e.ctrlKey || e.altKey) { if (e.key === "F7") { e.preventDefault(); note("The spelling and grammar check is complete."); } return; }
    const k = e.key.toLowerCase(), map = { n: newDocument, o: openDoc, s: () => save(), p: printDoc, f: () => showFind("find"), h: () => showFind("replace"), g: gotoDlg, k: insertLink, l: () => run("justifyLeft"), e: () => run("justifyCenter"), r: () => run("justifyRight"), j: () => run("justifyFull") };
    if (map[k]) { e.preventDefault(); map[k](); }
  });
  page.addEventListener("paste", () => setTimeout(() => { fixSizes(); status(); }));
  new ResizeObserver(() => { layout(); }).observe(scroller);
  new ResizeObserver(() => { syncBars(); drawV(); }).observe(page);
  w.onClose = async () => { if (await discard()) { findWin && !findWin.closed && findWin.close(); return true; } return false; };

  if (path && ctx.fs.exists(path)) loadPath(path);
  saved = page.innerHTML; setTitleFromState();
  setView(st.view === "normal" || st.view === "web" ? st.view : "print"); w.el.classList.toggle("wd-no-ruler", !st.ruler); setZoom(1);
  queueMicrotask(() => { page.focus(); const r = document.createRange(); r.selectNodeContents(page.firstChild || page); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); saveSel(); status(); });
  return w;
}
