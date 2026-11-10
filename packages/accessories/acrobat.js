// Adobe Acrobat Reader 5.0 look-alike. Documents are rendered with pdf.js (Apache-2.0, assets/vendor/pdfjs).
import { el, button, menuBar, icon } from "../ui/index.js";
import { basename, dirname, normalizePath, pickFiles, DOCS } from "../core/index.js";

const V = new URL("../../assets/vendor/pdfjs/", import.meta.url).href;
let pdfjs = null;
const loadPdfjs = async () => {
  if (pdfjs) return pdfjs;
  pdfjs = await import(V + "pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = V + "pdf.worker.min.mjs";
  return pdfjs;
};

function dataBytes(content) {
  const m = /^data:[^,]*;base64,/.exec(content);
  if (!m) return new TextEncoder().encode(content);
  const bin = atob(content.slice(m[0].length)), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">${inner}</svg>`;
const G = {
  open: svg('<path d="M2 16V5h5l2 2h7v9z" fill="#f0d060" stroke="#806000"/><path d="M2 16l3-6h13l-3 6z" fill="#fff0a0" stroke="#806000"/>'),
  save: svg('<rect x="3" y="3" width="14" height="14" fill="#4060a0" stroke="#102040"/><rect x="6" y="3" width="8" height="5" fill="#e0e0e0"/><rect x="6" y="11" width="8" height="6" fill="#fff"/>'),
  print: svg('<rect x="3" y="8" width="14" height="7" fill="#c0c0c0" stroke="#404040"/><rect x="6" y="3" width="8" height="5" fill="#fff" stroke="#404040"/><rect x="6" y="12" width="8" height="5" fill="#fff" stroke="#404040"/>'),
  search: svg('<circle cx="8" cy="8" r="5" fill="#d8ecff" stroke="#303040" stroke-width="2"/><path d="M12 12l6 6" stroke="#303040" stroke-width="3"/>'),
  hand: svg('<path d="M6 17c-2-3-3-5-3-7 1-1 2 0 3 1V5c1-1 2-1 2 0v4V4c1-1 2-1 2 0v5V5c1-1 2-1 2 0v5V8c1-1 2 0 2 1v4c0 3-2 4-4 4z" fill="#fff" stroke="#303030"/>'),
  text: svg('<path d="M5 3h10M10 3v14M7 17h6" stroke="#202020" stroke-width="2" fill="none"/>'),
  zoomin: svg('<circle cx="8" cy="8" r="5" fill="#d8ecff" stroke="#303040" stroke-width="2"/><path d="M12 12l6 6" stroke="#303040" stroke-width="3"/><path d="M5.5 8h5M8 5.5v5" stroke="#000" stroke-width="1.5"/>'),
  zoomout: svg('<circle cx="8" cy="8" r="5" fill="#d8ecff" stroke="#303040" stroke-width="2"/><path d="M12 12l6 6" stroke="#303040" stroke-width="3"/><path d="M5.5 8h5" stroke="#000" stroke-width="1.5"/>'),
  actual: svg('<rect x="4" y="2" width="12" height="16" fill="#fff" stroke="#303030"/><text x="10" y="13" font-size="8" text-anchor="middle" font-family="Arial" fill="#000">1:1</text>'),
  fitpage: svg('<rect x="4" y="2" width="12" height="16" fill="#fff" stroke="#303030"/><path d="M2 2v16M18 2v16" stroke="#c03030" stroke-width="1.5"/>'),
  fitwidth: svg('<rect x="5" y="2" width="10" height="16" fill="#fff" stroke="#303030"/><path d="M1 9l3 1.5L1 12M19 9l-3 1.5 3 1.5" stroke="#c03030" fill="none" stroke-width="1.5"/>'),
  first: svg('<path d="M5 4v12M16 4l-8 6 8 6z" fill="#202020" stroke="#202020" stroke-width="1.5"/>'),
  prev: svg('<path d="M15 4l-9 6 9 6z" fill="#202020"/>'),
  next: svg('<path d="M5 4l9 6-9 6z" fill="#202020"/>'),
  last: svg('<path d="M15 4v12M4 4l8 6-8 6z" fill="#202020" stroke="#202020" stroke-width="1.5"/>'),
  rotate: svg('<path d="M15 10a5 5 0 1 1-2-4" fill="none" stroke="#202020" stroke-width="2"/><path d="M11 2l5 1-3 4z" fill="#202020"/>'),
};
const img = (name) => el("img", { src: "data:image/svg+xml;utf8," + encodeURIComponent(G[name]), width: 20, height: 20, alt: "", draggable: "false" });

export async function openAcrobat(ctx, { path = null } = {}) {
  const w = ctx.wm.create({ title: "Acrobat Reader", icon: "acrobat", width: 780, height: 560, x: 60, y: 40, appId: "acrobat" });
  let doc = null, name = "", fileBytes = null, filePath = null;
  let zoom = "width"; // "width" | "page" | number (1 = 100%)
  let rotation = 0, cur = 0, pages = [], tool = "hand", findState = { q: "", page: -1, idx: -1 }, textCache = [], history = [], histPos = -1;
  const SCALE_DPI = 96 / 72;

  const view = el("div", { class: "ar-view", tabindex: "0" });
  const pane = el("div", { class: "ar-pane" });
  const navTabs = el("div", { class: "ar-navtabs" });
  const navBody = el("div", { class: "ar-navbody" });
  const left = el("div", { class: "ar-left" }, navTabs, navBody);
  left.style.display = "none";
  const split = el("div", { class: "ar-split" }, left, view);
  const err = (e) => ctx.dialogs.message(e?.message || String(e), { title: "Adobe Acrobat Reader", icon: "error" });

  // ---- status bar ----
  const pageInput = el("input", { class: "ar-pg", type: "text", value: "", "aria-label": "Page" });
  const ofTxt = el("span", { class: "ar-of", text: "" });
  const zoomSel = el("select", { class: "ar-zoom", "aria-label": "Zoom" }, ...[["page", "Fit Page"], ["width", "Fit Width"], [0.25, "25%"], [0.5, "50%"], [0.75, "75%"], [1, "100%"], [1.25, "125%"], [1.5, "150%"], [2, "200%"], [3, "300%"], [4, "400%"]].map(([v, t]) => el("option", { value: String(v), text: t })));
  const sizeTxt = el("div", { class: "ar-size", text: "" });
  const sbtn = (g, title, fn) => { const b = el("button", { class: "ar-sb", type: "button", title, "aria-label": title }, img(g)); b.addEventListener("click", fn); return b; };

  // ---- rendering ----
  const pageScale = (p) => {
    const vp0 = p.baseViewport;
    const rot = (rotation % 180) !== 0, pw = rot ? vp0.height : vp0.width, ph = rot ? vp0.width : vp0.height;
    const aw = view.clientWidth - 24, ah = view.clientHeight - 16;
    if (zoom === "width") return aw / pw;
    if (zoom === "page") return Math.min(aw / pw, ah / ph);
    return zoom * SCALE_DPI;
  };
  const layout = () => {
    for (const p of pages) {
      const s = pageScale(p), vp = p.page.getViewport({ scale: s, rotation });
      p.scale = s; p.vp = vp; p.rendered = false;
      p.div.style.width = Math.floor(vp.width) + "px"; p.div.style.height = Math.floor(vp.height) + "px";
      p.canvas.replaceWith(p.canvas = el("canvas", { class: "ar-canvas" }));
      p.text.replaceChildren();
    }
    renderVisible();
    zoomSel.value = typeof zoom === "number" ? String(zoom) : zoom;
    if (typeof zoom === "number" && ![...zoomSel.options].some((o) => o.value === String(zoom))) zoomSel.append(el("option", { value: String(zoom), text: Math.round(zoom * 100) + "%", selected: true }));
  };
  const renderPage = async (p) => {
    if (p.rendered || p.rendering) return;
    p.rendering = true;
    const dpr = window.devicePixelRatio || 1, vp = p.vp;
    p.canvas.width = Math.floor(vp.width * dpr); p.canvas.height = Math.floor(vp.height * dpr);
    p.canvas.style.width = Math.floor(vp.width) + "px"; p.canvas.style.height = Math.floor(vp.height) + "px";
    try {
      await p.page.render({ canvasContext: p.canvas.getContext("2d"), viewport: p.page.getViewport({ scale: p.scale * dpr, rotation }) }).promise;
      p.text.style.setProperty("--total-scale-factor", String(p.scale)); p.text.style.setProperty("--scale-factor", String(p.scale));
      p.text.replaceChildren();
      const tl = new pdfjs.TextLayer({ textContentSource: p.page.streamTextContent(), container: p.text, viewport: vp });
      await tl.render();
      p.rendered = true;
      if (findState.page === p.index) highlight(p);
    } catch (e) { /* cancelled by a newer layout */ }
    p.rendering = false;
  };
  const renderVisible = () => {
    const top = view.scrollTop, bot = top + view.clientHeight;
    for (const p of pages) {
      const y = p.div.offsetTop - view.offsetTop, h = p.div.offsetHeight;
      if (y + h > top - 400 && y < bot + 400) renderPage(p);
    }
    // current page = the one covering the middle of the viewport
    const mid = top + view.clientHeight / 3;
    let c = 0;
    for (const p of pages) if (p.div.offsetTop - view.offsetTop <= mid) c = p.index;
    if (c !== cur) { cur = c; syncPage(); }
  };
  const syncPage = () => {
    pageInput.value = doc ? String(cur + 1) : "";
    ofTxt.textContent = doc ? `of ${doc.numPages}` : "";
    for (const t of navBody.querySelectorAll(".ar-thumb")) t.classList.toggle("sel", Number(t.dataset.i) === cur);
    if (doc && pages[cur]) {
      const vp = pages[cur].baseViewport, rot = rotation % 180 !== 0;
      const wi = (rot ? vp.height : vp.width) / 96, he = (rot ? vp.width : vp.height) / 96;
      sizeTxt.textContent = `${wi.toFixed(2)} x ${he.toFixed(2)} in`;
    }
  };
  const goPage = (n, push = true) => {
    if (!doc) return;
    n = Math.max(0, Math.min(doc.numPages - 1, n));
    if (push) { history = history.slice(0, histPos + 1); history.push(n); histPos = history.length - 1; }
    view.scrollTop = pages[n].div.offsetTop - view.offsetTop - 6;
    cur = n; syncPage(); renderVisible();
  };
  const setZoom = (z) => { zoom = z; layout(); syncPage(); };
  const curScale = () => (typeof zoom === "number" ? zoom : (pages[cur]?.scale || SCALE_DPI) / SCALE_DPI);

  // ---- loading ----
  const loadBytes = async (bytes, label, p = null) => {
    try {
      const lib = await loadPdfjs();
      const loading = lib.getDocument({ data: bytes.slice(), standardFontDataUrl: V + "standard_fonts/", wasmUrl: V + "wasm/" });
      const d = await loading.promise;
      doc = d; name = label; fileBytes = bytes; filePath = p;
      pages = []; view.replaceChildren(); cur = 0; history = [0]; histPos = 0; rotation = 0;
      for (let i = 1; i <= d.numPages; i++) {
        const page = await d.getPage(i), baseViewport = page.getViewport({ scale: SCALE_DPI });
        const rec = { index: i - 1, page, baseViewport, div: el("div", { class: "ar-page" }), canvas: el("canvas", { class: "ar-canvas" }), text: el("div", { class: "ar-text" }), rendered: false };
        rec.div.append(rec.canvas, rec.text);
        view.append(rec.div); pages.push(rec);
      }
      textCache = [];
      w.setTitle(`Acrobat Reader - [${label}]`);
      layout();
      buildNav(d);
      syncPage();
    } catch (e) {
      await ctx.dialogs.message(`There was an error opening this document. ${e?.name === "PasswordException" ? "The document is password protected." : "The file is damaged and could not be repaired."}`, { title: "Adobe Acrobat Reader", icon: "error" });
    }
  };
  const openPath = async (p) => {
    p = normalizePath(p);
    await loadBytes(dataBytes(ctx.fs.stat(p).content), basename(p), p);
  };
  const buildNav = async (d) => {
    navTabs.replaceChildren(); navBody.replaceChildren();
    const outline = await d.getOutline().catch(() => null);
    const showTab = (which) => {
      for (const b of navTabs.children) b.classList.toggle("on", b.dataset.t === which);
      navBody.replaceChildren();
      if (which === "bm") {
        if (!outline?.length) navBody.append(el("div", { class: "ar-empty", text: "No bookmarks" }));
        const add = (items, depth) => items.forEach((it) => {
          const row = el("div", { class: "ar-bm", style: { paddingLeft: 6 + depth * 14 + "px" } }, el("span", { class: "ar-bm-icon" }), el("span", { text: it.title }));
          row.addEventListener("click", async () => {
            try { const dest = typeof it.dest === "string" ? await d.getDestination(it.dest) : it.dest; if (dest) goPage(await d.getPageIndex(dest[0])); } catch { /* ignore */ }
          });
          navBody.append(row); if (it.items?.length) add(it.items, depth + 1);
        });
        if (outline?.length) add(outline, 0);
      } else {
        pages.forEach((p) => {
          const t = el("div", { class: "ar-thumb" + (p.index === cur ? " sel" : ""), "data-i": String(p.index) }, el("canvas", {}), el("div", { text: String(p.index + 1) }));
          t.addEventListener("click", () => goPage(p.index));
          navBody.append(t);
          const cv = t.firstChild, vp = p.page.getViewport({ scale: 70 / p.baseViewport.width * SCALE_DPI });
          cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
          p.page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise.catch(() => {});
        });
      }
    };
    for (const [k, label] of [["bm", "Bookmarks"], ["th", "Thumbnails"]]) {
      const b = el("button", { class: "ar-ntab", type: "button", "data-t": k, text: label });
      b.addEventListener("click", () => { left.style.display = ""; showTab(k); layoutSoon(); });
      navTabs.append(b);
    }
    showTab(outline?.length ? "bm" : "th");
    left.style.display = outline?.length ? "" : "none";
    layoutSoon();
  };
  const layoutSoon = () => setTimeout(() => { if (doc) { layout(); } }, 0);

  // ---- text search ----
  const pageText = async (i) => {
    if (textCache[i] != null) return textCache[i];
    const tc = await (await doc.getPage(i + 1)).getTextContent();
    return (textCache[i] = tc.items.map((x) => x.str).join(" "));
  };
  const clearHighlight = () => view.querySelectorAll(".ar-hit").forEach((s) => s.classList.remove("ar-hit"));
  const highlight = (p) => {
    clearHighlight();
    const q = findState.q.toLowerCase();
    for (const s of p.text.querySelectorAll("span")) if (s.textContent.toLowerCase().includes(q)) s.classList.add("ar-hit");
  };
  const find = async (q, { back = false, matchCase = false, whole = false } = {}, again = false) => {
    if (!doc || !q) return false;
    if (!again) findState = { q, page: cur - (back ? 0 : 1), idx: -1 };
    findState.q = q;
    const n = doc.numPages, step = back ? -1 : 1;
    const re = new RegExp((whole ? "\\b" : "") + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (whole ? "\\b" : ""), matchCase ? "" : "i");
    for (let k = 1; k <= n; k++) {
      const i = (((findState.page + step * k) % n) + n) % n;
      if (re.test(await pageText(i))) {
        findState.page = i; goPage(i);
        const p = pages[i]; if (p.rendered) highlight(p); else { await renderPage(p); }
        return true;
      }
    }
    return false;
  };
  const findDialog = () => {
    const d = ctx.wm.create({ title: "Find", noIcon: true, width: 360, height: 215, dialog: true, resizable: false, minimizable: false, maximizable: false, appId: "dialog" });
    const input = el("input", { type: "text", value: findState.q || "", style: { width: "100%" }, "aria-label": "Find What" });
    const chk = (t) => el("label", { class: "wr-chk" }, el("input", { type: "checkbox" }), " " + t);
    const whole = chk("Match Whole Word Only"), mc = chk("Match Case"), back = chk("Find Backwards");
    const status = el("div", { class: "ar-find-status" });
    const run = async () => {
      const ok = await find(input.value, { whole: whole.firstChild.checked, matchCase: mc.firstChild.checked, back: back.firstChild.checked });
      status.textContent = ok ? "" : "Acrobat has finished searching the document. No matches were found.";
    };
    d.setContent(el("div", { class: "wr-dlg" }, el("div", { text: "Find What:" }), input, whole, mc, back, status, el("div", { class: "dialog-buttons" }, button("Find", run, { class: "default-button" }), button("Cancel", () => d.close()))));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
    input.focus(); input.select();
  };

  // ---- commands ----
  const need = () => { if (!doc) { ctx.dialogs.message("No document is open.", { title: "Adobe Acrobat Reader", icon: "info" }); return false; } return true; };
  const doOpen = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: path ? dirname(path) : DOCS, title: "Open" });
    if (p) { path = p; await openPath(p); }
  };
  const doOpenLocal = async () => {
    const [f] = await pickFiles({ accept: ".pdf,application/pdf" });
    if (f) await loadBytes(new Uint8Array(await f.arrayBuffer()), f.name);
  };
  const doSave = () => {
    if (!need()) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([fileBytes], { type: "application/pdf" })); a.download = name;
    document.body.append(a); a.click(); a.remove();
  };
  const doPrint = () => {
    if (!need()) return;
    const url = URL.createObjectURL(new Blob([fileBytes], { type: "application/pdf" }));
    const f = el("iframe", { src: url, style: "position:fixed;left:-9999px;width:1px;height:1px" });
    document.body.append(f);
    f.addEventListener("load", () => { try { f.contentWindow.print(); } catch { window.open(url); } setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60000); });
  };
  const goDialog = async () => {
    if (!need()) return;
    const v = await ctx.dialogs.prompt(`Go to page (1 - ${doc.numPages}):`, String(cur + 1), { title: "Go To Page" });
    const n = parseInt(v, 10);
    if (n >= 1 && n <= doc.numPages) goPage(n - 1);
  };
  const docInfo = async () => {
    if (!need()) return;
    const meta = await doc.getMetadata().catch(() => ({ info: {} })), i = meta.info || {};
    await ctx.dialogs.message(`File: ${name}\nPath: ${filePath ? filePath.replace(/\//g, "\\") : "(opened from your computer)"}\nFile Size: ${(fileBytes.length / 1024).toFixed(1)} KB (${fileBytes.length} bytes)\nNumber of Pages: ${doc.numPages}\n\nTitle: ${i.Title || ""}\nAuthor: ${i.Author || ""}\nSubject: ${i.Subject || ""}\nKeywords: ${i.Keywords || ""}\nCreator: ${i.Creator || ""}\nProducer: ${i.Producer || ""}\nPDF Version: ${i.PDFFormatVersion || ""}`, { title: "Document Info - General", icon: "info" });
  };
  const about = () => ctx.dialogs.message("Adobe® Acrobat® Reader 5.0\n\nCopyright © 1987-2001 Adobe Systems Incorporated and its licensors. All rights reserved.\n\nThis is a browser look-alike that renders PDF files with pdf.js.", { title: "About Adobe Acrobat Reader", icon: "acrobat" });
  const setTool = (t) => { tool = t; view.dataset.tool = t; view.style.cursor = t === "hand" ? "grab" : "text"; };
  const togglePane = () => { if (!doc) return; left.style.display = left.style.display === "none" ? "" : "none"; layoutSoon(); };
  const nextPage = () => goPage(cur + 1), prevPage = () => goPage(cur - 1);

  const menus = menuBar({
    File: [
      { label: "Open...", shortcut: "Ctrl+O", action: doOpen },
      { label: "Open from your computer...", action: doOpenLocal },
      { label: "Close", shortcut: "Ctrl+W", action: () => { doc = null; pages = []; view.replaceChildren(); left.style.display = "none"; w.setTitle("Acrobat Reader"); syncPage(); } },
      { label: "Save a Copy...", shortcut: "Ctrl+S", action: doSave },
      { separator: true },
      { label: "Document Info", action: docInfo },
      { separator: true },
      { label: "Print...", shortcut: "Ctrl+P", action: doPrint },
      { separator: true },
      { label: "Exit", shortcut: "Ctrl+Q", action: () => w.close() },
    ],
    Edit: [
      { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
      { label: "Select All", shortcut: "Ctrl+A", action: () => { const r = document.createRange(); r.selectNodeContents(view); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } },
      { separator: true },
      { label: "Find...", shortcut: "Ctrl+F", action: () => need() && findDialog() },
      { label: "Search...", action: () => need() && findDialog() },
      { label: "Find Again", shortcut: "Ctrl+G", action: () => findState.q && find(findState.q, {}, true) },
    ],
    Document: [
      { label: "First Page", shortcut: "Home", action: () => goPage(0) },
      { label: "Previous Page", shortcut: "Page Up", action: prevPage },
      { label: "Next Page", shortcut: "Page Down", action: nextPage },
      { label: "Last Page", shortcut: "End", action: () => doc && goPage(doc.numPages - 1) },
      { label: "Go To Page...", shortcut: "Ctrl+Shift+N", action: goDialog },
      { separator: true },
      { label: "Previous View", shortcut: "Alt+Left", action: () => { if (histPos > 0) goPage(history[--histPos], false); } },
      { label: "Next View", shortcut: "Alt+Right", action: () => { if (histPos < history.length - 1) goPage(history[++histPos], false); } },
      { separator: true },
      { label: "Rotate Pages Clockwise", shortcut: "Ctrl+Shift++", action: () => { rotation = (rotation + 90) % 360; layout(); syncPage(); } },
      { label: "Rotate Pages Counterclockwise", shortcut: "Ctrl+Shift+-", action: () => { rotation = (rotation + 270) % 360; layout(); syncPage(); } },
    ],
    View: [
      { label: "Go To Page...", action: goDialog },
      { separator: true },
      { label: "Actual Size", shortcut: "Ctrl+1", action: () => setZoom(1) },
      { label: "Fit Page", shortcut: "Ctrl+0", action: () => setZoom("page") },
      { label: "Fit Width", shortcut: "Ctrl+2", action: () => setZoom("width") },
      { separator: true },
      { label: "Zoom To...", shortcut: "Ctrl+M", action: async () => { const v = await ctx.dialogs.prompt("Zoom to (%):", String(Math.round(curScale() * 100)), { title: "Zoom To" }); const n = parseFloat(v); if (n >= 5 && n <= 800) setZoom(n / 100); } },
      { label: "Zoom In", shortcut: "Ctrl++", action: () => setZoom(Math.min(8, curScale() * 1.25)) },
      { label: "Zoom Out", shortcut: "Ctrl+-", action: () => setZoom(Math.max(0.1, curScale() / 1.25)) },
      { separator: true },
      { label: "Show/Hide Navigation Pane", shortcut: "F4", action: togglePane },
    ],
    Tools: [
      { label: "Hand", shortcut: "H", action: () => setTool("hand") },
      { label: "Zoom In", shortcut: "Z", action: () => setZoom(Math.min(8, curScale() * 1.25)) },
      { label: "Text Select", shortcut: "V", action: () => setTool("text") },
      { separator: true },
      { label: "Search...", action: () => need() && findDialog() },
    ],
    Window: [
      { label: "Cascade", action: () => {} },
      { label: "Show/Hide Navigation Pane", shortcut: "F4", action: togglePane },
    ],
    Help: [
      { label: "Reader Online Guide", shortcut: "F1", action: () => ctx.launch("help", { topic: "intro" }) },
      { separator: true },
      { label: "About Acrobat Reader...", action: about },
    ],
  });
  const tb = (g, title, fn, extra = "") => { const b = el("button", { class: "ar-tb " + extra, type: "button", title, "aria-label": title }, img(g)); b.addEventListener("click", fn); return b; };
  const toolbar1 = el("div", { class: "ar-bar" },
    tb("open", "Open", doOpen), tb("save", "Save a Copy", doSave), tb("print", "Print", doPrint), tb("search", "Search", () => need() && findDialog()),
    el("span", { class: "ar-sep" }),
    tb("hand", "Hand Tool", () => setTool("hand")), tb("zoomin", "Zoom In Tool", () => setZoom(Math.min(8, curScale() * 1.25))), tb("text", "Text Select Tool", () => setTool("text")),
    el("span", { class: "ar-sep" }),
    tb("first", "First Page", () => goPage(0)), tb("prev", "Previous Page", prevPage), tb("next", "Next Page", nextPage), tb("last", "Last Page", () => doc && goPage(doc.numPages - 1)),
    el("span", { class: "ar-sep" }),
    tb("zoomout", "Zoom Out", () => setZoom(Math.max(0.1, curScale() / 1.25))), tb("actual", "Actual Size", () => setZoom(1)), tb("fitpage", "Fit Page", () => setZoom("page")), tb("fitwidth", "Fit Width", () => setZoom("width")), tb("rotate", "Rotate Clockwise", () => { rotation = (rotation + 90) % 360; layout(); syncPage(); }));
  const statusbar = el("div", { class: "ar-status" }, zoomSel, sizeTxt, el("span", { class: "ar-flex" }), sbtn("first", "First Page", () => goPage(0)), sbtn("prev", "Previous Page", prevPage), pageInput, ofTxt, sbtn("next", "Next Page", nextPage), sbtn("last", "Last Page", () => doc && goPage(doc.numPages - 1)));
  w.setContent(menus, toolbar1, split, statusbar);

  zoomSel.addEventListener("change", () => { const v = zoomSel.value; setZoom(v === "page" || v === "width" ? v : parseFloat(v)); });
  pageInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && doc) { const n = parseInt(pageInput.value, 10); if (n >= 1) goPage(n - 1); } });
  view.addEventListener("scroll", () => renderVisible());
  new ResizeObserver(() => { if (doc && (zoom === "width" || zoom === "page")) { clearTimeout(w._arT); w._arT = setTimeout(layout, 120); } }).observe(view);
  // hand tool: drag to scroll
  view.addEventListener("pointerdown", (e) => {
    view.focus({ preventScroll: true });
    if (tool !== "hand" || e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY, sl = view.scrollLeft, st = view.scrollTop;
    view.style.cursor = "grabbing";
    const mv = (m) => { view.scrollLeft = sl - (m.clientX - sx); view.scrollTop = st - (m.clientY - sy); };
    const up = () => { view.style.cursor = "grab"; removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
    addEventListener("pointermove", mv); addEventListener("pointerup", up);
    e.preventDefault();
  });
  view.addEventListener("keydown", (e) => {
    if (!doc) return;
    const k = e.key;
    if (k === "PageDown" || (k === "ArrowRight" && !e.altKey)) { e.preventDefault(); nextPage(); }
    else if (k === "PageUp" || (k === "ArrowLeft" && !e.altKey)) { e.preventDefault(); prevPage(); }
    else if (k === "Home") { e.preventDefault(); goPage(0); } else if (k === "End") { e.preventDefault(); goPage(doc.numPages - 1); }
    else if (e.ctrlKey && k.toLowerCase() === "f") { e.preventDefault(); findDialog(); }
    else if (e.ctrlKey && k.toLowerCase() === "g") { e.preventDefault(); findState.q && find(findState.q, {}, true); }
    else if (e.ctrlKey && k.toLowerCase() === "o") { e.preventDefault(); doOpen(); }
    else if (e.ctrlKey && (k === "+" || k === "=")) { e.preventDefault(); setZoom(Math.min(8, curScale() * 1.25)); }
    else if (e.ctrlKey && k === "-") { e.preventDefault(); setZoom(Math.max(0.1, curScale() / 1.25)); }
    else if (e.ctrlKey && k === "1") { e.preventDefault(); setZoom(1); } else if (e.ctrlKey && k === "0") { e.preventDefault(); setZoom("page"); } else if (e.ctrlKey && k === "2") { e.preventDefault(); setZoom("width"); }
    else if (k === "F4") togglePane();
    else if (k.toLowerCase() === "h" && !e.ctrlKey) setTool("hand"); else if (k.toLowerCase() === "v" && !e.ctrlKey) setTool("text");
  });
  view.addEventListener("wheel", (e) => { if (e.ctrlKey && doc) { e.preventDefault(); setZoom(Math.max(0.1, Math.min(8, curScale() * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))); } }, { passive: false });
  setTool("hand");
  zoomSel.value = "width";
  if (path && ctx.fs.exists(path)) await openPath(path);
  return w;
}
