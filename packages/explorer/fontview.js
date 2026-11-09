import { el } from "../ui/index.js";

let INFO = null;
const loadInfo = () => (INFO ? Promise.resolve(INFO) : fetch("/assets/fontinfo.json").then((r) => r.json()).then((d) => (INFO = d)).catch(() => (INFO = {})));
const BITMAP = /(8,10,12|10,12,15)|^(Modern|Roman|Script|Small Fonts|Terminal)$/;

/** Font viewer (fontview.exe): typeface details above a specimen sheet. */
export function openFontViewer(ctx, { name = "Arial" } = {}) {
  const bitmap = BITMAP.test(name);
  const w = ctx.wm.create({
    title: `${name} (${bitmap ? "Bitmap" : "TrueType"})`,
    icon: bitmap ? "fontBmp" : "fontTT",
    width: 479,
    height: 520,
    x: 270,
    y: 60,
    appId: "fontview",
    maximizable: true,
  });
  const family = name.replace(/ (Bold Italic|Bold|Italic|Regular)$/, "").replace(/ \d.*$/, "");
  const style = `font-family:"${family}",Tahoma,sans-serif;` + (/Bold/.test(name) ? "font-weight:bold;" : "") + (/Italic/.test(name) ? "font-style:italic;" : "");
  const head = el("div", { class: "fv-head" });
  const sheet = el("div", { class: "fv-sheet" });
  const root = el("div", { class: "fv-root" }, head, sheet);
  const info = (k, v) => el("div", {}, el("b", { text: k + " " }), el("span", { text: v }));
  const fill = (i = {}) => {
    head.replaceChildren(
      info("Typeface name:", i.family ? i.family + (i.sub && i.sub !== "Regular" ? " " + i.sub : "") : name),
      info("File size:", (i.kb ?? "?") + " KB"),
      info("Version:", i.ver ?? "Version 1.00"),
      el("div", { class: "fv-copy", text: i.copy ? "© " + i.copy.replace(/^©\s*/, "") : "" }),
      el("div", { class: "fv-btns" }, el("button", { text: "Done", class: "fv-done", onclick: () => w.close() }), el("button", { text: "Print", onclick: () => ctx.printText?.(name, name) })),
    );
  };
  const line = (size, text) => el("div", { class: "fv-line", style: style + `font-size:${size}px;`, text: (size > 12 ? size + " " : "") + text });
  sheet.append(
    el("div", { class: "fv-line", style, text: "abcdefghijklmnopqrstuvwxyz" }),
    el("div", { class: "fv-line", style, text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" }),
    el("div", { class: "fv-line", style, text: "1234567890.:,; ' \" (!?) +-*/=" }),
    ...[12, 18, 24, 36, 48, 60, 72].map((s) => line(s, "The quick brown fox jumps over the lazy dog. 1234567890")),
  );
  fill({});
  loadInfo().then((d) => fill(d[name]));
  w.setContent(root);
  return w;
}
