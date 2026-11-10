// Internet Explorer 5.01 dialogs built from inetcplc.dll / shdoclc.dll templates.
import { el } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { btn } from "../control-panel/refkit.js";
import { IE_DIALOGS as D } from "./ie-data.js";
import { oeSheet } from "./oe-dialogs.js";

const ICONS = "assets/ie/icons/";

function std(ctx, key, opts = {}) {
  const tpl = D[key], has = tpl.controls.some((c) => c.id === 1);
  const d = dialogFromTemplate(ctx, tpl, { icon: "ie", iconBase: ICONS, ...opts, on: { 1: () => { opts.ok?.(d); d.close(); }, 2: () => d.close(), ...(opts.on || {}) } });
  if (!has) {
    const W = px(tpl.cx) + 8, y = py(tpl.cy) + 22 - 28;
    d.place(btn(W - 8 - 2 * 72 - 6, y, 72, 23, "OK", { def: true, onclick: () => { opts.ok?.(d); d.close(); } }), btn(W - 8 - 72, y, 72, 23, "Cancel", { onclick: () => d.close() }));
  }
  return d;
}

const ADV = [
  ["Accessibility", [["Always expand ALT text for images", 0], ["Move system caret with focus/selection changes", 0]]],
  ["Browsing", [["Automatically check for Internet Explorer updates", 1], ["Close unused folders in History and Favorites", 0], ["Disable script debugging", 1], ["Display a notification about every script error", 0], ["Enable Install On Demand", 1], ["Enable page transitions", 1], ["Enable Personalized Favorites Menu", 1], ["Launch browser windows in a separate process", 0], ["Notify when downloads complete", 1], ["Reuse windows for launching shortcuts", 1], ["Show friendly HTTP error messages", 1], ["Show friendly URLs", 1], ["Show Go button in Address bar", 1], ["Use inline AutoComplete", 1], ["Use smooth scrolling", 1], ["Underline links", "r:Always|Never|Hover"]]],
  ["HTTP 1.1 settings", [["Use HTTP 1.1", 1], ["Use HTTP 1.1 through proxy connections", 0]]],
  ["Multimedia", [["Play animations", 1], ["Play sounds", 1], ["Play videos", 1], ["Show image download placeholders", 1], ["Show pictures", 1], ["Smart image dithering", 1]]],
  ["Printing", [["Print background colors and images", 0]]],
  ["Search from the Address bar", [["When searching", "r:Display results, and go to the most likely site|Do not search from the Address bar|Just display the results in the main window|Just go to the most likely site"]]],
  ["Security", [["Check for publisher's certificate revocation", 0], ["Check for server certificate revocation (requires restart)", 0], ["Do not save encrypted pages to disk", 0], ["Empty Temporary Internet Files folder when browser is closed", 0], ["Enable Profile Assistant", 1], ["Use SSL 2.0", 1], ["Use SSL 3.0", 1], ["Use TLS 1.0", 0], ["Warn about invalid site certificates", 1], ["Warn if changing between secure and not secure mode", 0], ["Warn if forms submittal is being redirected", 1]]],
];

export function ieOptions(ctx, tab = 0) {
  const home = () => ctx.settings.get("homePage") || "about:home";
  const sub = (key, o = {}) => () => std(ctx, key, o);
  const dlg = (ctx2, key, o) => std(ctx2, key, o);
  const confirm = (msg, then) => async () => { if (await ctx.dialogs.confirm(msg, "Microsoft Internet Explorer")) then?.(); };
  const stored = ctx.settings.get("ieAdvanced") || {};
  let homeInput = null;
  const w = oeSheet(ctx, {
    title: "Internet Options", cx: 252, cy: 218, active: tab,
    store: {},
    onApply: (st) => { const h = homeInput?.value; if (h != null) ctx.settings.set("homePage", h); },
    pages: [
      { label: "General", tpl: D.c100, opts: { iconBase: ICONS, values: { 1487: home(), 1492: "20" } },
        after: (ctl) => { homeInput = ctl[1487]; },
        on: (ctl) => ({
          1486: () => (ctl[1487].value = home()), 1485: () => (ctl[1487].value = "about:home"), 404: () => (ctl[1487].value = "about:blank"),
          624: confirm("Delete all files in the Temporary Internet Files folder?"),
          1490: sub("c700"), 1489: confirm("Are you sure you want to delete your History folder?"),
          1483: sub("c102"), 1494: sub("c1000"), 1495: sub("c4448"), 1496: sub("c4457"),
        }) },
      { label: "Security", tpl: D.c500, opts: { iconBase: ICONS },
        after: (ctl) => {
          const list = ctl[1566].querySelector(".rk-listbox");
          list.classList.add("ie-adv", "ie-zones");
          for (const z of ["Internet", "Local intranet", "Trusted sites", "Restricted sites"]) list.append(el("div", { class: "ie-zone" }, el("img", { src: ICONS + "1315.png" }), z));
        } },
      { label: "Content", tpl: D.c4454, opts: { iconBase: ICONS } },
      { label: "Connections", tpl: D.c200, opts: { iconBase: ICONS } },
      { label: "Programs", tpl: D.c300, opts: { iconBase: ICONS, values: { 1610: "Notepad", 301: "Outlook Express", 302: "Outlook Express", 313: "Microsoft NetMeeting", 304: "", 306: "Address Book" } } },
      { label: "Advanced", tpl: D.c600, opts: { iconBase: ICONS },
        after: (ctl) => {
          const list = ctl[1439].querySelector(".rk-listbox");
          list.classList.add("ie-adv");
          for (const [cat, items] of ADV) {
            list.append(el("div", { class: "ie-adv-c" }, el("img", { src: ICONS + "1322.png" }), cat));
            for (const [label, val] of items) {
              if (typeof val === "string") {
                list.append(el("div", { class: "ie-adv-i" }, label));
                val.slice(2).split("|").forEach((o, i) => list.append(el("label", { class: "ie-adv-i r" }, el("input", { type: "radio", name: cat + label, checked: i === 0 }), o)));
              } else {
                const key = label, on = stored[key] ?? val;
                list.append(el("label", { class: "ie-adv-i" }, el("input", { type: "checkbox", checked: !!on, onchange: (e) => { stored[key] = e.target.checked ? 1 : 0; ctx.settings.set("ieAdvanced", stored); } }), label));
              }
            }
          }
        },
        on: () => ({ 1526: () => { for (const k of Object.keys(stored)) delete stored[k]; ctx.settings.set("ieAdvanced", stored); } }) },
    ],
  });
  return w;
}

export function ieOpen(ctx, onOpen, onBrowse) {
  const d = dialogFromTemplate(ctx, D.s4464, { title: "Open", icon: "ie", iconBase: ICONS, on: { 1: () => { const v = d.ctl[4467].value.trim(); d.close(); if (v) onOpen(v); }, 2: () => d.close(), 4469: () => onBrowse?.(d) } });
  d.ctl[4467]?.focus();
  return d;
}

export function ieNewFolder(ctx, onOk) {
  const d = dialogFromTemplate(ctx, D.s4480, { title: "Create New Folder", icon: "ie", on: { 1: () => { const v = d.ctl[4481]?.value?.trim?.(); d.close(); if (v) onOk(v); }, 2: () => d.close() } });
  return d;
}
