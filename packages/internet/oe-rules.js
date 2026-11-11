// Simple "Message Rules" window for Outlook Express (mail rules applied to incoming messages).
import { el, button, field } from "../ui/index.js";
import { FOLDERS, getRules } from "./mail-server.js";

const FIELDS = { from: "From line", subject: "Subject line", to: "To line" };
const ACTIONS = { move: "Move it to the specified folder", delete: "Delete it", read: "Mark it as read" };
const describe = (r) => `Where the ${FIELDS[r.field]} contains '${r.contains}'\n${r.action === "move" ? `Move it to the '${r.folder}' folder` : ACTIONS[r.action].replace("it", "it").replace(/^./, (c) => c)}`;

export function openRules(ctx, prefill = null) {
  const w = ctx.wm.create({ title: "Message Rules", icon: "oe", width: 470, height: 360, dialog: true, resizable: false, maximizable: false, minimizable: false, appId: "dialog" });
  let rules = getRules(ctx), sel = null;
  const save = () => { ctx.settings.set("oeMailRules", rules); draw(); };
  const list = el("div", { class: "oer-list" }), desc = el("div", { class: "oer-desc" });
  const draw = () => {
    list.replaceChildren(...rules.map((r) => {
      const cb = el("input", { type: "checkbox", checked: !!r.enabled });
      cb.addEventListener("change", () => { r.enabled = cb.checked; save(); });
      const row = el("div", { class: "oer-row" + (sel === r.id ? " sel" : "") }, cb, el("span", { text: r.name }));
      row.addEventListener("click", () => { sel = r.id; draw(); });
      row.addEventListener("dblclick", () => edit(r));
      return row;
    }));
    const r = rules.find((x) => x.id === sel);
    desc.textContent = r ? describe(r) : "";
  };
  const edit = (r = null) => {
    const d = ctx.wm.create({ title: r ? "Edit Mail Rule" : "New Mail Rule", icon: "oe", width: 400, height: 250, dialog: true, resizable: false, maximizable: false, minimizable: false, appId: "dialog" });
    const sel1 = el("select", {}, ...Object.entries(FIELDS).map(([k, v]) => el("option", { value: k, text: "Where the " + v + " contains", selected: (r || prefill || {}).field === k }))),
      text = el("input", { type: "text", value: (r || prefill || {}).contains || "" }),
      act = el("select", {}, ...Object.entries(ACTIONS).map(([k, v]) => el("option", { value: k, text: v, selected: (r || prefill || {}).action === k }))),
      folder = el("select", {}, ...[...FOLDERS.filter((f) => f !== "Outbox"), ...(ctx.settings.get("oeFolders") || [])].map((f) => el("option", { value: f, text: f, selected: (r || {}).folder === f }))),
      name = el("input", { type: "text", value: r?.name || "New Mail Rule #" + (rules.length + 1) });
    d.setContent(el("div", { class: "dialog-padding" },
      field("Condition:", sel1), field("Contains:", text), field("Action:", act), field("Folder:", folder), field("Rule name:", name),
      el("div", { class: "dialog-buttons" }, button("OK", () => {
        if (!text.value.trim()) throw new Error("Enter the words the message must contain.");
        const n = { id: r?.id || crypto.randomUUID(), enabled: r?.enabled ?? true, field: sel1.value, contains: text.value.trim(), action: act.value, folder: folder.value, name: name.value || "Mail Rule" };
        rules = r ? rules.map((x) => (x.id === r.id ? n : x)) : [...rules, n];
        sel = n.id; save(); d.close();
      }), button("Cancel", () => d.close()))));
  };
  w.setContent(el("div", { class: "oer" },
    el("p", { class: "oer-p", text: "These rules will be applied to Mail messages." }),
    el("div", { class: "oer-cols" }, list, el("div", { class: "oer-btns" },
      button("New...", () => edit()),
      button("Modify...", () => { const r = rules.find((x) => x.id === sel); if (r) edit(r); }),
      button("Remove", () => { rules = rules.filter((x) => x.id !== sel); sel = null; save(); }))),
    el("p", { class: "oer-p", text: "Rule Description:" }), desc,
    el("div", { class: "dialog-buttons" }, button("OK", () => w.close()), button("Cancel", () => w.close()))));
  draw();
  if (prefill) edit();
  return w;
}
