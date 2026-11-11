// Word helpers: .docx writer/reader (OOXML in a ZIP container) and the simple-dictionary spell checker.

// ---------------- ZIP ----------------
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const utf8 = (s) => new TextEncoder().encode(s);

/** Store-only ZIP writer. files: [{name, data: Uint8Array|string}] */
export function zipStore(files) {
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const chunks = [], central = []; let off = 0;
  for (const f of files) {
    const name = utf8(f.name), data = typeof f.data === "string" ? utf8(f.data) : f.data, crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)], out = new Uint8Array(off + csize + 22); let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}
const inflate = async (data) => new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
/** Minimal ZIP reader: returns Map(name -> () => Promise<Uint8Array>) */
export function zipRead(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let e = bytes.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("This is not a valid .docx file.");
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = new Map();
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nl));
    out.set(name, async () => { const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true), s = lo + 30 + lnl + lxl, raw = bytes.subarray(s, s + csize); return method === 0 ? raw : inflate(raw); });
    p += 46 + nl + xl + cl;
  }
  return out;
}

// ---------------- DOCX writer ----------------
const X = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const hex = (rgb) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(rgb); if (!m || (m[4] !== undefined && +m[4] === 0)) return null; return [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, "0")).join(""); };
const tw = (px) => Math.round((parseFloat(px) || 0) * 15);
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

export function buildDocx(root, L) {
  const media = [], rels = [];
  let imgId = 0;
  const textRun = (txt, cs, el0) => {
    let rp = "";
    const font = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    if (font) rp += `<w:rFonts w:ascii="${X(font)}" w:hAnsi="${X(font)}" w:cs="${X(font)}"/>`;
    if (+cs.fontWeight >= 600) rp += "<w:b/>";
    if (cs.fontStyle === "italic") rp += "<w:i/>";
    if (/line-through/.test(cs.textDecorationLine)) rp += "<w:strike/>";
    const c = hex(cs.color); if (c && c !== "000000") rp += `<w:color w:val="${c}"/>`;
    rp += `<w:sz w:val="${Math.round(parseFloat(cs.fontSize) * 1.5)}"/>`;
    const bg = hex(cs.backgroundColor); if (bg) rp += `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`;
    if (/underline/.test(cs.textDecorationLine) || el0.closest("a")) rp += '<w:u w:val="single"/>';
    if (el0.closest("sup")) rp += '<w:vertAlign w:val="superscript"/>'; else if (el0.closest("sub")) rp += '<w:vertAlign w:val="subscript"/>';
    return txt.split(/(\t)/).map((part) => (part === "\t" ? `<w:r><w:rPr>${rp}</w:rPr><w:tab/></w:r>` : part ? `<w:r><w:rPr>${rp}</w:rPr><w:t xml:space="preserve">${X(part)}</w:t></w:r>` : "")).join("");
  };
  const imageRun = (img) => {
    const m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/s.exec(img.getAttribute("src") || ""); if (!m) return "";
    const ext = m[1] === "jpg" ? "jpeg" : m[1], bin = atob(m[2]), data = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
    const id = ++imgId, rid = "rIdImg" + id, name = `image${id}.${ext}`;
    media.push({ name: "word/media/" + name, data }); rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
    const cs = getComputedStyle(img), wpx = parseFloat(cs.width) || img.naturalWidth || 100, hpx = parseFloat(cs.height) || img.naturalHeight || 100, cx = Math.round(wpx * 9525), cy = Math.round(hpx * 9525);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Picture ${id}" descr="${X(img.alt || "")}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${X(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  };
  const inline = (node) => {
    let out = "";
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) { const t = ch.nodeValue.replace(/[\r\n]+/g, " ").replace(/ /g, " "); if (t) out += textRun(t, getComputedStyle(ch.parentElement), ch.parentElement); }
      else if (ch.nodeType === 1) {
        if (ch.tagName === "BR") out += "<w:r><w:br/></w:r>"; else if (ch.tagName === "IMG") out += imageRun(ch); else if (!/^(TABLE|UL|OL)$/.test(ch.tagName)) out += inline(ch);
      }
    }
    return out;
  };
  const jc = (a) => ({ center: "center", right: "right", end: "right", justify: "both" })[a] || "left";
  const para = (node, { style = null, extra = "", ind = null, runsXml = null } = {}) => {
    const cs = getComputedStyle(node);
    let pp = style ? `<w:pStyle w:val="${style}"/>` : "";
    if (/page-break/.test(node.getAttribute?.("style") || "")) pp += "<w:pageBreakBefore/>";
    const bt = tw(cs.marginTop), bb = tw(cs.marginBottom), lh = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
    pp += `<w:spacing w:before="${bt}" w:after="${bb}"${lh > 1.2 && lh < 4 ? ` w:line="${Math.round(lh * 240)}" w:lineRule="auto"` : ""}/>`;
    const left = ind ? ind.left : tw(cs.marginLeft), first = parseFloat(cs.textIndent) || 0;
    pp += `<w:ind w:left="${left}" ${ind?.hanging ? `w:hanging="${ind.hanging}"` : first < 0 ? `w:hanging="${tw(-first)}"` : `w:firstLine="${tw(first)}"`} w:right="${tw(cs.marginRight)}"/>`;
    pp += `<w:jc w:val="${jc(cs.textAlign)}"/>` + extra;
    return `<w:p><w:pPr>${pp}</w:pPr>${runsXml ?? inline(node)}</w:p>`;
  };
  const blocks = (container, depth = 0) => {
    let out = "", pending = [];
    const flush = () => { if (pending.some((n) => n.nodeType === 1 || (n.nodeValue || "").trim())) { const tmp = document.createElement("div"); pending.forEach((n) => tmp.append(n.cloneNode(true))); out += `<w:p>${inline(tmp.childNodes.length ? { childNodes: pending } : tmp)}</w:p>`; } pending = []; };
    for (const ch of container.childNodes) {
      if (ch.nodeType === 3) { pending.push(ch); continue; }
      if (ch.nodeType !== 1) continue;
      const tag = ch.tagName;
      if (/^(P|H[1-6]|PRE|BLOCKQUOTE)$/.test(tag)) { flush(); out += para(ch, { style: /^H[1-3]$/.test(tag) ? "Heading" + tag[1] : null }); }
      else if (tag === "DIV") { flush(); if (/page-break/.test(ch.getAttribute("style") || "")) out += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; else if ([...ch.children].some((c) => /^(P|H[1-6]|DIV|UL|OL|TABLE)$/.test(c.tagName))) out += blocks(ch, depth); else out += para(ch); }
      else if (tag === "UL" || tag === "OL") { flush(); let n = 0; for (const li of ch.children) { if (li.tagName !== "LI") continue; n++; const sub = [...li.children].filter((c) => /^(UL|OL)$/.test(c.tagName)); const mark = tag === "UL" ? "•" : n + "."; const left = 720 * (depth + 1); out += para(li, { ind: { left, hanging: 360 }, runsXml: textRun(mark + "\t", getComputedStyle(li), li) + inline(li) }); sub.forEach((s) => { out += blocks({ childNodes: [s] }, depth + 1); }); } }
      else if (tag === "TABLE") { flush(); out += table(ch); }
      else if (tag === "HR") { flush(); out += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>'; }
      else pending.push(ch);
    }
    flush(); return out;
  };
  const table = (t) => {
    const rows = [...t.rows]; if (!rows.length) return "";
    const first = getComputedStyle(rows[0].cells[0] || t), bw = parseFloat(first.borderTopWidth) > 0, bc = hex(first.borderTopColor) || "auto";
    const b = (n) => `<w:${n} w:val="${bw ? "single" : "nil"}" w:sz="4" w:space="0" w:color="${bc}"/>`;
    const grid = [...rows[0].cells].map((c) => tw(parseFloat(getComputedStyle(c).width) || 96));
    let x = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(b).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join("")}</w:tblGrid>`;
    for (const r of rows) {
      x += "<w:tr>";
      for (const c of r.cells) {
        const cs = getComputedStyle(c), bg = hex(cs.backgroundColor), inner = blocks(c) || "<w:p/>";
        x += `<w:tc><w:tcPr><w:tcW w:w="${tw(parseFloat(cs.width) || 96)}" w:type="dxa"/>${c.colSpan > 1 ? `<w:gridSpan w:val="${c.colSpan}"/>` : ""}${bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>` : ""}</w:tcPr>${/<w:p[ >]/.test(inner) ? inner : "<w:p/>"}</w:tc>`;
      }
      x += "</w:tr>";
    }
    return x + "</w:tbl><w:p/>";
  };

  const bodyXml = blocks(root) || "<w:p/>";
  const hf = (tag, text, align) => {
    if (!text) return "";
    const parts = String(text).split("{PAGE}").map((t) => (t ? `<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>` : ""));
    const fld = '<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${tag} ${NS}><w:p><w:pPr><w:jc w:val="${align === "center" ? "center" : align === "right" ? "right" : "left"}"/></w:pPr>${parts.join(fld)}</w:p></w:${tag}>`;
  };
  const files = [];
  const hdr = hf("hdr", L.header, L.headerAlign), ftr = hf("ftr", L.footer, L.footerAlign);
  let refs = "";
  if (hdr) { files.push({ name: "word/header1.xml", data: hdr }); rels.push('<Relationship Id="rIdHdr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'); refs += '<w:headerReference w:type="default" r:id="rIdHdr1"/>'; }
  if (ftr) { files.push({ name: "word/footer1.xml", data: ftr }); rels.push('<Relationship Id="rIdFtr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'); refs += '<w:footerReference w:type="default" r:id="rIdFtr1"/>'; }
  const sect = `<w:sectPr>${refs}<w:pgSz w:w="${tw(L.pw)}" w:h="${tw(L.ph)}"${L.pw > L.ph ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${tw(L.mt)}" w:right="${tw(L.mr)}" w:bottom="${tw(L.mb)}" w:left="${tw(L.ml)}" w:header="720" w:footer="720" w:gutter="0"/>${L.cols > 1 ? `<w:cols w:num="${L.cols}" w:space="720"/>` : ""}</w:sectPr>`;
  const hd = (n, sz, ital) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="60"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/>${ital ? "<w:i/>" : ""}<w:sz w:val="${sz}"/></w:rPr></w:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${hd(1, 32)}${hd(2, 28, true)}${hd(3, 26)}</w:styles>`;
  const exts = new Set(media.map((m) => m.name.split(".").pop()));
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...exts].map((e) => `<Default Extension="${e}" ContentType="image/${e}"/>`).join("")}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${hdr ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}${ftr ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ""}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  return zipStore([
    { name: "[Content_Types].xml", data: ct },
    { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
    { name: "docProps/core.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${X(L.title || "")}</dc:title><dc:creator>Windows2000 Word</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>` },
    { name: "word/document.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${bodyXml}${sect}</w:body></w:document>` },
    { name: "word/styles.xml", data: styles },
    { name: "word/_rels/document.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.join("")}</Relationships>` },
    ...files, ...media,
  ]);
}

export const bytesToDataUrl = (bytes, mime) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return `data:${mime};base64,${btoa(s)}`; };
export const dataUrlToBytes = (u) => { const b = atob(u.slice(u.indexOf(",") + 1)), out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };

// ---------------- DOCX reader ----------------
export async function parseDocx(bytes) {
  const zip = zipRead(bytes), get = async (n) => (zip.has(n) ? await zip.get(n)() : null), txt = async (n) => { const b = await get(n); return b ? new TextDecoder().decode(b) : null; };
  const docXml = await txt("word/document.xml"); if (!docXml) throw new Error("This file does not contain a Word document.");
  const parse = (s) => new DOMParser().parseFromString(s, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const doc = parse(docXml), relDoc = await txt("word/_rels/document.xml.rels"), relMap = {};
  if (relDoc) for (const r of parse(relDoc).getElementsByTagName("Relationship")) relMap[r.getAttribute("Id")] = r.getAttribute("Target");
  const numXml = await txt("word/numbering.xml"), numKind = {};
  if (numXml) { const nd = parse(numXml), abs = {}; for (const a of nd.getElementsByTagNameNS(W, "abstractNum")) { const l = a.getElementsByTagNameNS(W, "lvl")[0]; abs[a.getAttributeNS(W, "abstractNumId")] = l?.getElementsByTagNameNS(W, "numFmt")[0]?.getAttributeNS(W, "val") || "bullet"; } for (const n of nd.getElementsByTagNameNS(W, "num")) numKind[n.getAttributeNS(W, "numId")] = abs[n.getElementsByTagNameNS(W, "abstractNumId")[0]?.getAttributeNS(W, "val")] === "bullet" ? "ul" : "ol"; }
  const imgs = {}, mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp" };
  const q = (n, name) => [...n.children].find((c) => c.localName === name);
  const val = (n, name, attr = "val") => q(n, name)?.getAttributeNS(W, attr);
  const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const image = async (d) => {
    const blip = d.getElementsByTagName("a:blip")[0] || [...d.getElementsByTagName("*")].find((x) => x.localName === "blip"); if (!blip) return "";
    const rid = blip.getAttribute("r:embed") || [...blip.attributes].find((a) => a.localName === "embed")?.value, target = relMap[rid]; if (!target) return "";
    const path = "word/" + target.replace(/^\//, "").replace(/^word\//, ""), ext = path.split(".").pop().toLowerCase(); if (!mime[ext] || !zip.has(path)) return "";
    imgs[path] ||= bytesToDataUrl(await zip.get(path)(), mime[ext]);
    const ex = [...d.getElementsByTagName("*")].find((x) => x.localName === "extent"), w = ex ? Math.round(+ex.getAttribute("cx") / 9525) : 0, h = ex ? Math.round(+ex.getAttribute("cy") / 9525) : 0;
    return `<img src="${imgs[path]}"${w ? ` width="${w}" height="${h}"` : ""}>`;
  };
  const run = async (r) => {
    const rp = q(r, "rPr"); let html = "";
    for (const c of r.children) {
      if (c.localName === "t") html += esc(c.textContent); else if (c.localName === "tab") html += "\t";
      else if (c.localName === "br") html += c.getAttributeNS(W, "type") === "page" ? '</p><div style="page-break-before:always;border-top:1px dotted #000;margin:8px 0;height:0"></div><p>' : "<br>";
      else if (c.localName === "drawing") html += await image(c);
    }
    if (!html) return "";
    if (!rp) return html;
    const css = [], f = q(rp, "rFonts")?.getAttributeNS(W, "ascii"); if (f) css.push(`font-family:'${f}'`);
    const sz = val(rp, "sz"); if (sz) css.push(`font-size:${+sz / 2}pt`);
    const col = val(rp, "color"); if (col && col !== "auto") css.push(`color:#${col}`);
    const hl = val(rp, "shd", "fill"); if (hl && hl !== "auto") css.push(`background-color:#${hl}`);
    const on = (n) => { const e = q(rp, n); return e && !/^(0|false|none)$/.test(e.getAttributeNS(W, "val") || "1"); };
    if (on("b")) html = `<b>${html}</b>`; if (on("i")) html = `<i>${html}</i>`; if (on("u")) html = `<u>${html}</u>`; if (on("strike")) html = `<s>${html}</s>`;
    const va = val(rp, "vertAlign"); if (va === "superscript") html = `<sup>${html}</sup>`; else if (va === "subscript") html = `<sub>${html}</sub>`;
    return css.length ? `<span style="${css.join(";")}">${html}</span>` : html;
  };
  const para = async (p) => {
    const pp = q(p, "pPr"); let inner = "";
    for (const c of p.children) { if (c.localName === "r") inner += await run(c); else if (c.localName === "hyperlink") for (const r of c.children) if (r.localName === "r") inner += await run(r); }
    const css = []; let tag = "p", list = null;
    if (pp) {
      const st = val(pp, "pStyle") || ""; const hm = /^Heading([1-3])$/i.exec(st) || /^heading ?([1-3])$/i.exec(st); if (hm) tag = "h" + hm[1];
      const jc = val(pp, "jc"); if (jc) css.push(`text-align:${jc === "both" ? "justify" : jc === "start" ? "left" : jc === "end" ? "right" : jc}`);
      const ind = q(pp, "ind"); if (ind) { const l = +ind.getAttributeNS(W, "left"), fl = +ind.getAttributeNS(W, "firstLine"), hg = +ind.getAttributeNS(W, "hanging"); if (l && !pp.getElementsByTagNameNS(W, "numPr").length) css.push(`margin-left:${l / 15}px`); if (fl) css.push(`text-indent:${fl / 15}px`); else if (hg && !pp.getElementsByTagNameNS(W, "numPr").length) css.push(`text-indent:${-hg / 15}px`); }
      const sp = q(pp, "spacing"); if (sp) { const b = sp.getAttributeNS(W, "before"), a = sp.getAttributeNS(W, "after"); if (b) css.push(`margin-top:${b / 15}px`); if (a) css.push(`margin-bottom:${a / 15}px`); }
      const num = pp.getElementsByTagNameNS(W, "numPr")[0]; if (num) { list = numKind[num.getElementsByTagNameNS(W, "numId")[0]?.getAttributeNS(W, "val")] || "ul"; }
    }
    const style = css.length ? ` style="${css.join(";")}"` : "";
    return { list, html: list ? `<li${style}>${inner || "<br>"}</li>` : `<${tag}${style}>${inner || "<br>"}</${tag}>` };
  };
  const blocks = async (parent) => {
    let out = "", curList = null;
    const closeList = () => { if (curList) { out += `</${curList}>`; curList = null; } };
    for (const c of parent.children) {
      if (c.localName === "p") { const r = await para(c); if (r.list) { if (curList !== r.list) { closeList(); out += `<${r.list}>`; curList = r.list; } } else closeList(); out += r.html; }
      else if (c.localName === "tbl") {
        closeList(); const bd = q(q(c, "tblPr") || c, "tblBorders"), bs = bd && [...bd.children].some((b) => (b.getAttributeNS(W, "val") || "") !== "nil" && (b.getAttributeNS(W, "val") || "") !== "none");
        const bdr = bs ? "border:1px solid #000;" : "";
        out += `<table style="border-collapse:collapse;${bdr}"><tbody>`;
        for (const tr of c.children) { if (tr.localName !== "tr") continue; out += "<tr>"; for (const tc of tr.children) { if (tc.localName !== "tc") continue; const pr = q(tc, "tcPr"), w = val(pr || tc, "tcW", "w"), span = val(pr || tc, "gridSpan"), fill = val(pr || tc, "shd", "fill"); out += `<td${span ? ` colspan="${span}"` : ""} style="${bdr}${w ? `width:${Math.round(w / 15)}px;` : ""}${fill && fill !== "auto" ? `background:#${fill};` : ""}padding:0 7px;vertical-align:top">${(await blocks(tc)) || "&nbsp;"}</td>`; } out += "</tr>"; }
        out += "</tbody></table><p><br></p>";
      }
    }
    closeList(); return out;
  };
  const body = doc.getElementsByTagNameNS(W, "body")[0], html = await blocks(body), sect = body.getElementsByTagNameNS(W, "sectPr")[0] || [...body.children].pop();
  let layout = null;
  const sz = sect?.getElementsByTagNameNS(W, "pgSz")[0], mg = sect?.getElementsByTagNameNS(W, "pgMar")[0];
  if (sz && mg) { const g = (n, a) => Math.round((+n.getAttributeNS(W, a) || 0) / 15); layout = { pw: g(sz, "w"), ph: g(sz, "h"), mt: g(mg, "top"), mb: g(mg, "bottom"), ml: g(mg, "left"), mr: g(mg, "right") }; }
  return { html, layout };
}

// ---------------- spell checker ----------------
let dictP = null;
export const loadDict = () => (dictP ||= fetch(new URL("../../assets/word/dict-en.txt", import.meta.url)).then((r) => { if (!r.ok) throw new Error("The spelling dictionary could not be loaded."); return r.text(); }).then((t) => { const list = t.split("\n"); return { list, set: new Set(list) }; }).catch((e) => { dictP = null; throw e; }));
export const WORD_RE = /[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*/g;
export function isCorrect(word, dict, custom) {
  let w = word.replace(/’/g, "'").toLowerCase();
  if (w.length < 2 && w !== "a" && w !== "i") return true;
  if (word === word.toUpperCase() && word.length > 1) return true; // acronyms
  if (/[a-z][A-Z]/.test(word)) return true; // camelCase
  if (dict.set.has(w) || custom.has(w)) return true;
  if (w.endsWith("'s") && (dict.set.has(w.slice(0, -2)) || custom.has(w.slice(0, -2)))) return true;
  if (w.endsWith("s'") && dict.set.has(w.slice(0, -2))) return true;
  return false;
}
const dl = (a, b, max) => { // Damerau-Levenshtein with early exit
  const n = a.length, m = b.length; if (Math.abs(n - m) > max) return max + 1;
  let p2 = null, p1 = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const c = [i]; let best = i;
    for (let j = 1; j <= m; j++) {
      let v = Math.min(p1[j] + 1, c[j - 1] + 1, p1[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
      c[j] = v; if (v < best) best = v;
    }
    if (best > max) return max + 1; p2 = p1; p1 = c;
  }
  return p1[m];
}
export function suggest(word, dict, n = 8) {
  const w = word.toLowerCase().replace(/’/g, "'"), found = [];
  for (let i = 0; i < dict.list.length; i++) {
    const c = dict.list[i]; if (Math.abs(c.length - w.length) > 2) continue;
    const d = dl(w, c, 2); if (d <= 2) found.push([d * 100000 + (c[0] === w[0] ? 0 : 20000) + i, c]);
  }
  found.sort((a, b) => a[0] - b[0]);
  const cap = /^[A-Z]/.test(word), up = word === word.toUpperCase() && word.length > 1;
  return found.slice(0, n).map(([, c]) => (up ? c.toUpperCase() : cap ? c[0].toUpperCase() + c.slice(1) : c));
}
