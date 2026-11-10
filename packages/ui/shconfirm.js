/** Shell "Confirm File/Folder/Multiple File Delete" dialogs, built from shell32.dll templates 1011-1013. */
import { dialogFromTemplate, px, py } from "./dlg.js";
import { icon, fileIcon } from "./index.js";
import { SH_CONFIRM } from "./shconfirm-data.js";

const STR_65 = "all its contents?"; // shell32 string 66
const STR_67 = "move all its contents to the Recycle Bin?"; // shell32 string 68

/**
 * @param opts {names:string[], folders?:boolean[], permanent?:boolean, emptyBin?:boolean}
 * @returns Promise<boolean>
 */
export function confirmDelete(ctx, { names, folders = [], permanent = false, emptyBin = false }) {
  const multi = emptyBin || names.length > 1;
  const folder = !multi && folders[0];
  const key = multi ? "1013" : folder ? "1012" : "1011";
  const tpl = structuredClone(SH_CONFIRM[key]);
  const labels = {};
  const hidden = [];
  let show;
  if (multi) {
    show = emptyBin ? 12294 : permanent ? 12295 : 12291;
    labels[show] = (tpl.controls.find((c) => c.id === show).text).replace("%1", String(names.length));
    hidden.push(...[12291, 12294, 12295].filter((i) => i !== show));
  } else if (folder) {
    show = 12291;
    labels[show] = tpl.controls.find((c) => c.id === show).text.replace("%1", names[0]).replace("%3", permanent ? STR_65 : STR_67);
    hidden.push(12292, 12293);
  } else {
    show = permanent ? 12295 : 12291;
    labels[show] = tpl.controls.find((c) => c.id === show).text.replace("%1", names[0]);
    hidden.push(...[12291, 12292, 12293, 12294, 12295].filter((i) => i !== show));
  }
  if (!multi) { // only Yes / No are used for a single item
    hidden.push(12807, 2);
    for (const c of tpl.controls) { if (c.id === 6) c.x = 157; if (c.id === 7) c.x = 215; }
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; w.onClose = null; w.close(); resolve(v); };
    ctx.sound?.play?.("exclamation");
    const w = dialogFromTemplate(ctx, tpl, {
      labels, hidden, iconBase: "/assets/shconfirm/",
      on: { 6: () => finish(true), 7: () => finish(false), 2: () => finish(false) },
    });
    w.onClose = () => { resolve(false); return true; };
    w.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "Enter" && e.target.tagName !== "BUTTON") finish(true);
    });
    queueMicrotask(() => w.layer.querySelector("button")?.focus());
  });
}

const fmtInfo = (n) => {
  if (!n) return "(unknown date and size)";
  const size = n.type === "folder" ? "" : `${Math.max(1, Math.ceil((n.size || 0) / 1024)).toLocaleString("en-US")} KB`; // shell32 string 62
  const when = new Date(n.modified || Date.now()).toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return `${size}${size ? "\n" : ""}modified: ${when}`; // shell32 string 64
};

/**
 * Confirm File Replace / Confirm Folder Replace (shell32.dll templates 1014/1015).
 * @returns Promise<"yes"|"all"|"no"|"cancel">
 */
export function confirmReplace(ctx, { name, folder = false, src, dst, multi = false }) {
  const tpl = structuredClone(SH_CONFIRM[folder ? "1015" : "1014"]);
  const hidden = folder ? [] : [12292, 12293];
  if (!multi) hidden.push(12807);
  const labels = {};
  if (folder) labels[12291] = tpl.controls.find((c) => c.id === 12291).text.replace("%2", name);
  else {
    labels[12291] = tpl.controls.find((c) => c.id === 12291).text.replace("%2", name);
    labels[12302] = fmtInfo(dst); // existing file
    labels[12303] = fmtInfo(src); // file being moved/copied
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (done) return; done = true; w.onClose = null; w.close(); resolve(v); };
    ctx.sound?.play?.("exclamation");
    const w = dialogFromTemplate(ctx, tpl, {
      labels, hidden, iconBase: "/assets/shconfirm/",
      on: { 6: () => finish("yes"), 12807: () => finish("all"), 7: () => finish("no"), 2: () => finish("cancel") },
    });
    if (!folder) // file icons beside the two descriptions (controls 12300 / 12301)
      for (const [id, st] of [[12300, dst], [12301, src]]) {
        const c = tpl.controls.find((x) => x.id === id);
        w.place(icon(fileIcon(st || { name, type: "file" }), 32).cloneNode(true));
        const img = w.layer.lastElementChild;
        Object.assign(img.style, { position: "absolute", left: px(c.x) + 4 + "px", top: py(c.y) + 22 + "px" });
      }
    w.onClose = () => { resolve("cancel"); return true; };
    w.el.addEventListener("keydown", (e) => { if (e.key === "Escape") finish("cancel"); });
    queueMicrotask(() => w.layer.querySelector("button")?.focus());
  });
}
