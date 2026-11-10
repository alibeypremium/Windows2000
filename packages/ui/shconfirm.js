/** Shell "Confirm File/Folder/Multiple File Delete" dialogs, built from shell32.dll templates 1011-1013. */
import { dialogFromTemplate } from "./dlg.js";
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
