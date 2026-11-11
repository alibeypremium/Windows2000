// WinRAR shell extension: the "Extract..." / "Add to archive..." items WinRAR adds to the Explorer and desktop context menus.
import { basename, dirname, joinPath } from "../core/index.js";
import { separator } from "../ui/index.js";

const CTX_DEF = { 101: true, 102: true, 103: true, 106: true, 107: true, 108: true, 109: true };
/** Context menu entries for the given file-system paths (empty list when the shell integration is switched off). */
export function rarMenuItems(ctx, paths) {
  const prefs = ctx.settings.get("winrarPrefs") || {};
  if ((prefs[6]?.[119] ?? true) === false || !paths?.length) return [];
  const on = (id) => (ctx.settings.get("winrarCtx")?.[id] ?? CTX_DEF[id] ?? false);
  const arc = paths.length === 1 && /\.(rar|zip)$/i.test(paths[0]);
  const base = paths.length === 1 ? basename(paths[0]).replace(/\.[^.]*$/, "") || basename(paths[0]) : basename(dirname(paths[0])) || "Archive";
  const open = (args) => () => ctx.launch("winrar", args);
  const it = (id, label, action) => (on(id) ? [{ label, icon: "rarfile", action }] : []);
  const out = [];
  if (arc) out.push(...it(101, "Extract files...", open({ path: paths[0], extract: "dialog" })), ...it(102, "Extract Here", open({ path: paths[0], extract: "here" })), ...it(103, `Extract to "${base}\\"`, open({ path: paths[0], extract: "folder" })));
  out.push(...it(106, "Add to archive...", open({ add: paths })), ...it(107, `Add to "${base}.rar"`, open({ add: paths, quick: true })), ...it(109, "Compress and email...", open({ add: paths, email: true })), ...it(108, `Compress to "${base}.rar" and email`, open({ add: paths, email: true, quick: true })));
  return out.length ? [...out, separator()] : [];
}
