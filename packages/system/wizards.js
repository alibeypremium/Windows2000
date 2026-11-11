// Windows 2000 "Wizard97" engine plus two wizards whose page layouts and texts come from the ISO:
// Network Connection Wizard (netshell.dll) and Internet Connection Wizard (icwconn1.exe). See wizards-data.js.
import { el } from "../ui/index.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { refWindow, btn, text } from "../control-panel/refkit.js";
import { DESKTOP, joinPath } from "../core/index.js";
import { WIZ } from "./wizards-data.js";

const DLG = "/assets/ui/dialogs/";

/**
 * pages: [{ kind: "welcome" | "finish" | "page", title, subtitle, tpl, opts(state), init(ctl,state,page), next(ctl,state) -> bool|undefined|Promise, skip(state) }]
 */
function wizard97(ctx, { title, appId, pages, onFinish, state = {}, W = 501, H = 383 }) {
  const w = refWindow(ctx, { title, width: W, height: H, appId, noIcon: true, className: "ref-dialog wiz-dialog" });
  const stage = el("div", { class: "wiz-stage", style: { position: "absolute", left: 0, top: 0, width: W + "px", height: H + "px" } });
  w.place(stage);
  const rule = el("div", { class: "wiz-rule", style: { top: H - 48 + "px", width: W - 4 + "px" } });
  let idx = 0, ctl = {};
  const hist = [];
  const back = btn(W - 243, H - 33, 75, 23, "< Back", { onclick: () => { idx = hist.pop() ?? 0; show(); } });
  const nextB = btn(W - 168, H - 33, 75, 23, "Next >", { def: true, onclick: () => go() });
  const cancel = btn(W - 83, H - 33, 75, 23, "Cancel", { onclick: () => w.close() });
  w.place(rule, back, nextB, cancel);

  const collect = (page) => {
    const nodes = [];
    ctl = {};
    const full = page.kind !== "page";
    const tpl = WIZ[page.group][page.tpl];
    dialogFromTemplate(ctx, tpl, { ...(page.opts?.(state) || {}), ctlOut: ctl, host: { place: (...n) => nodes.push(...n.flat(Infinity)), el: null }, ox: full ? 4 : 13, oy: full ? 23 : 88 });
    return nodes;
  };
  const show = () => {
    const page = pages[idx];
    const nodes = [];
    if (page.kind === "page") {
      nodes.push(
        el("div", { class: "wiz-header", style: { width: W - 4 + "px" } }),
        el("div", { class: "wiz-rule", style: { top: "80px", width: W - 4 + "px" } }),
        el("div", { class: "wiz-title", style: { left: "15px", top: "29px", font: "bold 11px Tahoma, sans-serif" } }, page.title),
        text(30, 46, page.subtitle, { w: W - 120 }),
        el("img", { src: DLG + "wiz-components-banner.png", style: { position: "absolute", left: W - 59 + "px", top: "26px", width: "49px", height: "49px" } }),
      );
    } else {
      nodes.push(el("div", { class: "wiz-white", style: { left: "2px", top: "21px", width: W - 4 + "px", height: H - 70 + "px" } }), el("div", { style: { position: "absolute", left: "4px", top: "23px", width: "164px", height: H - 70 - 2 + "px", background: `#000080 url(${DLG}wiz-hardware-side.png) no-repeat top left` } }));
    }
    const sub = nodes.find((n) => n.textContent === page.subtitle);
    if (sub) Object.assign(sub.style, { whiteSpace: "pre-wrap", width: W - 120 + "px" });
    nodes.push(...collect(page));
    for (const n of nodes) if (n.classList) { n.classList.remove("disabled"); n.querySelectorAll?.(".disabled").forEach((d) => d.classList.remove("disabled")); }
    stage.replaceChildren(...nodes);
    for (const t of [page.big ?? 21116, 1000]) if (page.kind !== "page" && ctl[t]) Object.assign(ctl[t].style, { font: "bold 18px/22px Verdana, Tahoma, sans-serif", whiteSpace: "pre-wrap" });
    page.init?.(ctl, state, page);
    back.disabled = hist.length === 0; back.classList.toggle("disabled", back.disabled);
    nextB.querySelector?.("span") ? (nextB.querySelector("span").textContent = page.kind === "finish" ? "Finish" : "Next >") : (nextB.textContent = page.kind === "finish" ? "Finish" : "Next >");
  };
  const go = async () => {
    const page = pages[idx];
    if (page.next && (await page.next(ctl, state)) === false) return;
    if (page.kind === "finish") { await onFinish?.(state); return w.close(); }
    hist.push(idx);
    do idx++; while (pages[idx]?.skip?.(state));
    show();
  };
  show();
  return w;
}
const checked = (c) => !!c?.classList.contains("checked");

/* ---------- Network Connection Wizard (Make New Connection) ---------- */
const NCW_TYPES = [["21118", "Dial-up to private network"], ["21119", "Dial-up to the Internet"], ["21120", "Connect to a private network through the Internet (VPN)"], ["21121", "Accept incoming connections"], ["21122", "Connect directly to another computer"]];

export function openNetworkConnectionWizard(ctx) {
  return wizard97(ctx, {
    title: "Network Connection Wizard",
    appId: "ncw",
    pages: [
      { group: "NCW", tpl: "21006", kind: "welcome", opts: () => ({ labels: { 21115: "The Network Connection Wizard will help you to connect to other computers and to the Internet, or let other computers connect to yours." } }) },
      {
        group: "NCW", tpl: "21005", kind: "page", title: "Network Connection Type", subtitle: "You can choose the type of network connection you want to create, based on your network configuration and your networking needs.",
        opts: (s) => ({ groups: [NCW_TYPES.map(([id]) => id)], checked: { [s.type || "21118"]: true } }),
        next: (ctl, s) => { s.type = NCW_TYPES.map(([id]) => id).find((id) => checked(ctl[id])) || "21118"; },
      },
      {
        group: "NCW", tpl: "21001", kind: "finish",
        opts: (s) => ({ values: { 21101: (s.name ||= uniqueConn(ctx, s)) } }),
        next: (ctl, s) => {
          const name = ctl[21101].value.trim();
          if (!name || /[\\/:*?<>|"\t]/.test(name)) { ctx.dialogs.message("The connection name specified is invalid.", { title: "Network Connection Wizard", icon: "error" }); return false; }
          if ((ctx.settings.get("connections") || []).some((c) => c.name.toLowerCase() === name.toLowerCase())) { ctx.dialogs.message("A connection with the specified name already exists.  Please provide a unique connection name.", { title: "Network Connection Wizard", icon: "error" }); return false; }
          s.name = name; s.shortcut = checked(ctl[21005]);
        },
      },
    ],
    onFinish: async (s) => {
      const list = [...(ctx.settings.get("connections") || []), { name: s.name, type: NCW_TYPES.find(([id]) => id === s.type)?.[1] || "Dial-up", created: Date.now() }];
      ctx.settings.set("connections", list);
      if (s.shortcut) await ctx.fs.writeFile(joinPath(DESKTOP, ctx.fs.uniqueName(DESKTOP, s.name + ".lnk")), JSON.stringify({ command: "connections" }), { mime: "application/x-win2k-shortcut" });
      ctx.bus?.emit?.("fs:change", {});
    },
  });
}
const uniqueConn = (ctx, s) => {
  const base = { "21118": "Dial-up Connection", "21119": "Dial-up Connection", "21120": "Virtual Private Connection", "21121": "Incoming Connections", "21122": "Direct Connection" }[s.type] || "Dial-up Connection";
  const used = new Set((ctx.settings.get("connections") || []).map((c) => c.name.toLowerCase()));
  let n = base, i = 2;
  while (used.has(n.toLowerCase())) n = `${base} ${i++}`;
  return n;
};

/* ---------- Internet Connection Wizard ---------- */
export function openInternetConnectionWizard(ctx) {
  const manual = (s) => s.choice === "1003";
  return wizard97(ctx, {
    title: "Internet Connection Wizard",
    appId: "icw",
    W: 523, H: 424,
    pages: [
      {
        group: "ICW", tpl: "103", kind: "welcome", big: 1000,
        opts: (s) => ({ groups: [["1001", "1002", "1003"]], checked: { [s.choice || "1003"]: true }, on: { 1028: () => ctx.dialogs.message("The Internet tutorial is not installed on this computer.", { title: "Internet Connection Wizard", icon: "info" }) } }),
        next: (ctl, s) => { s.choice = ["1001", "1002", "1003"].find((id) => checked(ctl[id])) || "1003"; },
      },
      {
        group: "ICW", tpl: "100", kind: "page", title: "Setting up your Internet connection", subtitle: "Choose how you connect to the Internet.", skip: (s) => !manual(s),
        opts: (s) => ({ groups: [["1026", "1025"]], checked: { [s.lan ? "1025" : "1026"]: true }, labels: { 1053: "Select the way you connect to the Internet.  If you use a modem and a phone line, Windows dials your Internet service provider; on a LAN, Windows uses the network settings you choose in Internet Options." } }),
        next: (ctl, s) => { s.lan = checked(ctl[1025]); },
      },
      {
        group: "ICW", tpl: "101", kind: "page", title: "Dialing information", subtitle: "Choose the location you are dialing from.", skip: (s) => manual(s),
        opts: () => ({ values: { 1006: "212", 1029: "United States of America (1)", 1050: "My Location" }, combos: { 1050: ["My Location"] } }),
      },
      {
        group: "ICW", tpl: "104", kind: "finish",
        next: (ctl, s) => { s.connectNow = checked(ctl[1051]); },
        opts: () => ({ labels: { 1031: "You have successfully completed the Internet Connection wizard.\nYour computer is now configured to connect to your new Internet account." } }),
      },
    ],
    onFinish: (s) => {
      ctx.settings.set("internetConnection", { type: s.lan ? "lan" : "modem", wizard: true });
      if (s.connectNow) ctx.launch?.("ie");
    },
  });
}
