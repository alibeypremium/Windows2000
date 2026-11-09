// Builds Outlook Express menus from the real msoeres.dll menu resources (assets/oe/menus.json).
import { separator } from "../ui/index.js";

let cache = null;
export async function loadOeMenus() {
  return (cache ||= await (await fetch("/assets/oe/menus.json")).json());
}

const convert = (items, h) => {
  const out = [];
  for (const it of items) {
    if (it.sep) {
      if (out.length && out[out.length - 1].separator !== true) out.push(separator());
      continue;
    }
    if (it.label === "%s" || it.label === "My Online Status") continue; // Windows Messenger entries are hidden when it is not installed
    if (it.sub) {
      const sub = convert(it.sub, h);
      if (!sub.some((s) => !s.disabled && s.label)) { out.push({ label: it.label, disabled: true, submenu: [] }); continue; }
      out.push({ label: it.label, submenu: sub });
      continue;
    }
    const r = h(it.id, it);
    const row = { label: it.label, shortcut: it.shortcut };
    if (r?.action) row.action = r.action;
    else row.disabled = true;
    if (r?.disabled) row.disabled = true;
    if (r?.checked != null) row.checked = r.checked;
    out.push(row);
  }
  while (out.length && out[out.length - 1].label === undefined) out.pop();
  return out;
};

/** tree: array from menus.json; h(id,item) -> {action, checked, disabled} | undefined. Returns a w.setMenu() object. */
export function oeMenu(tree, h, extra = {}) {
  const menu = {};
  for (const top of tree) menu[top.label] = () => convert(top.sub, h);
  return { ...menu, ...extra };
}
