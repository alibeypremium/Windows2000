/** Location Information and LAN status dialogs, from Windows 2000 reference screenshots. */
import { el, popup } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";

const IMG = "/assets/ui/net/";
const COUNTRIES = ["Australia", "Austria", "Belgium", "Brazil", "Canada", "China", "Denmark", "Finland", "France", "Germany", "Greece", "India", "Ireland", "Italy", "Japan", "Mexico", "Netherlands", "Norway", "Poland", "Portugal", "Russia", "Spain", "Sweden", "Switzerland", "Turkey", "United Kingdom", "United States of America"];

export function openLocationInformation(ctx) {
  const OX = 317,
    OY = 63,
    k = kit(0, 0),
    w = refWindow(ctx, { title: "Location Information", width: 462, height: 349, appId: "control", help: true, noIcon: true, x: OX, y: OY });
  const S = ctx.settings;
  const state = { country: S.get("phoneCountry") || "Turkey", area: S.get("phoneArea") || "", out: S.get("phoneOutside") || "", tone: S.get("phoneTone") !== false };
  const field = (x, y, wd, h, key) => {
    const i = el("input", { class: "rk-field", value: state[key], spellcheck: "false" });
    Object.assign(i.style, { left: x + "px", top: y + "px", width: wd + "px", height: h + "px" });
    i.addEventListener("input", () => (state[key] = i.value));
    return i;
  };
  const country = k.combo(165, 113, 269, 19, "");
  country.firstChild.nodeValue = "";
  const label = el("span", { class: "dt-sel wide", text: state.country });
  country.prepend(label);
  country.addEventListener("click", () => {
    const r = country.getBoundingClientRect();
    popup(COUNTRIES.map((c) => ({ label: c, action: () => ((state.country = c), (label.textContent = c)) })), r.left, r.bottom);
  });
  w.place(
    k.img(19, 39, IMG + "location-banner.png", 132, 252),
    k.text(165, 47, "Before you can make any phone or modem connections,\nWindows needs the following information about your current\nlocation."),
    k.text(165, 94, "What country/region are you in now?"),
    country,
    k.text(165, 143, "What area code (or city code) are you in now?"),
    field(165, 162, 59, 18, "area"),
    k.text(165, 190, "If you dial a number to access an outside line, what is it?"),
    field(165, 211, 59, 18, "out"),
    k.text(165, 240, "The phone system at this location uses:"),
    k.radio(165, 260, "Tone dialing", { checked: state.tone, onchange: () => (state.tone = true) }),
    k.radio(268, 260, "Pulse dialing", { checked: !state.tone, onchange: () => (state.tone = false) }),
    k.btn(292, 307, 74, 22, "OK", {
      def: true,
      onclick: () => {
        S.patch({ phoneCountry: state.country, phoneArea: state.area, phoneOutside: state.out, phoneTone: state.tone });
        w.close();
      },
    }),
    k.btn(373, 307, 74, 22, "Cancel", { onclick: () => w.close() }),
  );
  return w;
}

export function openLanStatus(ctx) {
  const OX = 427,
    OY = 268,
    k = kit(0, 0),
    w = refWindow(ctx, { title: "Local Area Connection 2 Status", width: 342, height: 344, appId: "control", help: true, noIcon: true, x: OX, y: OY });
  const started = Date.now() - 661000;
  const online = navigator.onLine;
  const dur = () => {
    const s = Math.floor((Date.now() - started) / 1000);
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":");
  };
  const right = (x, y, t) => k.text(x - 100, y, t, { w: 100, align: "right" });
  const durEl = right(304, 103, dur());
  const iv = setInterval(() => (w.el.isConnected ? (durEl.textContent = dur()) : clearInterval(iv)), 1000);
  const bar = (x, y, wd, h) => {
    const n = el("div", { class: "ns-bar" });
    Object.assign(n.style, { left: x + "px", top: y + "px", width: wd + "px", height: h + "px" });
    return n;
  };
  const tab = k.tabs({
    top: 30,
    pane: [10, 48, 326, 257],
    tabs: [
      {
        label: "General",
        x: 11,
        w: 53,
        content: () => [
          k.group(25, 70, 293, 73, "Connection", 9),
          k.text(40, 84, "Status:"),
          right(304, 84, online ? "Connected" : "Disconnected"),
          k.text(40, 103, "Duration:"),
          durEl,
          k.text(40, 123, "Speed:"),
          right(304, 123, "10.0 Mbps"),
          k.group(25, 160, 293, 83, "Activity", 9),
          k.text(136, 175, "Sent"),
          bar(163, 180, 20, 2),
          k.img(188, 165, IMG + "lan.png", 33, 30),
          bar(224, 180, 19, 2),
          k.text(257, 175, "Received"),
          k.text(40, 204, "Packets:"),
          right(186, 204, "31"),
          bar(203, 204, 2, 14),
          right(304, 204, "9"),
          k.btn(25, 252, 75, 23, "Properties", { onclick: () => ctx.launch("control", { page: "internet" }) }),
          k.btn(104, 252, 83, 23, "Disable", { onclick: () => ctx.dialogs.message("Disabling the network connection is not available in this virtual desktop.", { title: "Network and Dial-up Connections" }) }),
        ],
      },
    ],
  });
  w.place(tab, k.btn(261, 312, 75, 23, "Close", { onclick: () => w.close() }));
  return w;
}
