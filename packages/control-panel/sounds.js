/** Sounds and Multimedia Properties, laid out from Windows 2000 reference screenshots. */
import { el, popup } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/sounds/";
const OX = 357,
  OY = 95;
const EVENTS = [
  ["Asterisk", 1, "click"],
  ["Close program"],
  ["Critical Stop", 1, "error"],
  ["Default Beep", 1, "click"],
  ["Exclamation", 1, "click"],
  ["Exit Windows"],
  ["Low Battery Alarm"],
  ["Maximize"],
  ["Menu command"],
  ["Menu popup"],
  ["Minimize"],
  ["New Mail Notification"],
  ["Open program"],
  ["Program Error"],
  ["Question"],
  ["Restore Down"],
  ["Restore Up"],
  ["Start Windows"],
  ["System Notification"],
  ["Windows Logoff"],
  ["Windows Logon"],
];
const DEVICES = [
  ["SONY CD-ROM CDU-1000", "DVD/CD-R...", "cd16", "(Standard CD-ROM drives)", "Location 0 (0)"],
  ["Sound Blaster 16 or AWE32 or compatibl...", "Sound, vid...", "spk16", "Creative Technology Ltd.", "Location 0 (0)"],
  ["Audio Codecs", "Sound, vid...", "spk16", "(Standard system devices)", "Location 0 (0)"],
  ["Legacy Audio Drivers", "Sound, vid...", "spk16", "(Standard system devices)", "Location 0 (0)"],
  ["Media Control Devices", "Sound, vid...", "spk16", "(Standard system devices)", "Location 0 (0)"],
  ["Legacy Video Capture Devices", "Sound, vid...", "spk16", "(Standard system devices)", "Location 0 (0)"],
  ["Video Codecs", "Sound, vid...", "spk16", "(Standard system devices)", "Location 0 (0)"],
];

export function openSoundsProperties(ctx, { tab = 0 } = {}) {
  const k = kit(0, 0),
    w = refWindow(ctx, { title: "Sounds and Multimedia Properties", width: 369, height: 450, appId: "control", help: true, noIcon: true, x: OX, y: OY });
  const S = ctx.settings;
  const state = { vol: (S.get("volume") ?? 65) / 100, tray: S.get("volumeTray") !== false, evt: 0, dev: 0 };
  let tc;
  const dirty = () => w.setDirty?.(true);

  /** A white list with absolutely placed rows, clipped, with a wheel/arrow-scrolled bar. */
  const scrollList = ({ x, y, w: lw, h, rowH, count, bar, make, th = 12 }) => {
    const list = el("div", { class: "dp-list" }),
      inner = el("div", { class: "dp-rows" });
    Object.assign(list.style, { left: x + "px", top: y + "px", width: lw + "px", height: h + "px" });
    for (let i = 0; i < count; i++) inner.append(make(i));
    list.append(inner);
    const max = Math.max(0, count * rowH - h);
    let top = 0;
    const sb = k.vscroll(bar[0], bar[1], bar[2], 17, th);
    const thumb = sb.querySelector(".thumb"),
      room = bar[2] - 32 - th;
    const sync = () => {
      inner.style.top = -top + "px";
      thumb.style.top = 16 + Math.round(max ? (top / max) * room : 0) + "px";
    };
    const go = (d) => ((top = Math.max(0, Math.min(max, top + d))), sync());
    list.addEventListener("wheel", (e) => (e.preventDefault(), go(Math.sign(e.deltaY) * rowH * 2)));
    sb.querySelector(".up").addEventListener("click", () => go(-rowH));
    sb.querySelector(".down").addEventListener("click", () => go(rowH));
    sync();
    return { list, sb, inner };
  };

  const sounds = () => {
    const rows = [];
    const sel = (i) => {
      state.evt = i;
      rows.forEach((r, j) => r.querySelector("span").classList.toggle("sel", j === i));
      const ev = i ? EVENTS[i - 1] : null;
      const on = !!(ev && ev[1]);
      [name, play, browse].forEach((n) => n.classList.toggle("disabled", !on));
      name.firstChild.nodeValue = on ? "chimes.wav" : "(None)";
      if (ev && ev[2]) ctx.sound.play(ev[2]);
    };
    const name = k.combo(34, 218, 193, 21, "(None)", { disabled: true }),
      play = k.btn(233, 218, 22, 21, "", { disabled: true, onclick: () => EVENTS[state.evt - 1]?.[2] && ctx.sound.play(EVENTS[state.evt - 1][2]) }),
      browse = k.btn(259, 218, 74, 21, "Browse...", { disabled: true });
    play.append(el("span", { class: "sm-play" }));
    const { list, sb } = scrollList({
      x: 35,
      y: 82,
      w: 281,
      h: 113,
      rowH: 16,
      count: EVENTS.length + 1,
      bar: [316, 82, 113],
      make: (i) => {
        const ev = i ? EVENTS[i - 1] : null;
        const r = el(
          "div",
          { class: "sm-row", style: { top: i * 16 + "px" } },
          el("img", { src: IMG + (i ? "spk16.png" : "win16.png"), style: { left: (i ? 20 : 1) + "px", top: "1px", display: i && !ev[1] ? "none" : "" } }),
          el("span", { text: i ? ev[0] : "Windows", style: { left: (i ? 40 : 21) + "px" } }),
        );
        r.addEventListener("click", () => sel(i));
        rows.push(r);
        return r;
      },
    });
    rows[0].querySelector("span").classList.add("sel");
    const scheme = k.combo(34, 266, 299, 19, "");
    scheme.style.background = "#fff";
    return [
      k.group(25, 69, 319, 250, "Sound Events", 8),
      k.sunken(34, 81, 299, 115),
      list,
      sb,
      k.text(34, 203, "Name:", { disabled: true }),
      name,
      play,
      browse,
      k.text(34, 248, "Scheme:"),
      scheme,
      k.btn(178, 291, 75, 22, "Save As...", { onclick: () => ctx.dialogs.message("Sound schemes cannot be saved in this virtual desktop.", { title: "Save Scheme As" }) }),
      k.btn(257, 291, 75, 22, "Delete", { onclick: dirty }),
      k.group(25, 333, 319, 65, "Sound Volume", 8),
      k.text(34, 352, "Low"),
      k.text(316, 352, "High"),
      k.hslider(66, 349, 237, state.vol, { ticks: Array.from({ length: 11 }, (_, i) => i / 10), tickY: 2, onchange: (v) => ((state.vol = v), dirty()) }),
      k.check(34, 379, "Show volume control on the taskbar", { checked: state.tray, onchange: (v) => ((state.tray = v), dirty()) }),
      k.img(318, 374, IMG + "tray.png", 16, 16),
    ];
  };

  const audio = () => {
    const dev = (x, y, label, sel, items) => {
      const c = k.combo(x, y, 259, 19, "");
      c.firstChild.nodeValue = "";
      c.prepend(sel ? el("span", { class: "dt-sel wide", text: label }) : document.createTextNode(label));
      return c;
    };
    return [
      k.group(25, 69, 319, 91, "Sound Playback", 8),
      k.img(33, 83, IMG + "spk32.png", 32, 32),
      k.text(74, 84, "Preferred device:"),
      dev(75, 102, "Sound Blaster 16", true),
      k.btn(181, 131, 75, 22, "Volume", { onclick: () => ctx.launch("volume") }),
      k.btn(260, 131, 74, 22, "Advanced", { onclick: () => ctx.launch("volume") }),
      k.group(25, 173, 319, 92, "Sound Recording", 8),
      k.img(34, 187, IMG + "mic32.png", 29, 32),
      k.text(74, 189, "Preferred device:"),
      dev(75, 208, "Sound Blaster 16", false),
      k.btn(181, 236, 75, 22, "Volume", { onclick: () => ctx.launch("volume") }),
      k.btn(260, 236, 74, 22, "Advanced"),
      k.group(25, 277, 319, 92, "MIDI Music Playback", 8),
      k.img(34, 291, IMG + "midi32.png", 32, 31),
      k.text(74, 293, "Preferred device:"),
      dev(75, 312, "Microsoft GS Wavetable SW Synth", false),
      k.btn(181, 340, 75, 22, "Volume", { onclick: () => ctx.launch("volume") }),
      k.btn(260, 340, 74, 22, "About"),
      k.check(26, 380, "Use only preferred devices", { checked: true, onchange: dirty }),
    ];
  };

  const hardware = () => {
    const rows = [];
    const props = el("div");
    const show = (i) => {
      state.dev = i;
      rows.forEach((r, j) => r.classList.toggle("on", j === i));
      const d = DEVICES[i];
      props.replaceChildren(
        k.text(35, 245, "Manufacturer: " + d[3]),
        k.text(35, 264, "Hardware Revision: Not available"),
        k.text(35, 284, "Location: " + d[4]),
        k.text(35, 303, "Device Status: This device is working properly."),
      );
    };
    const { list, sb } = scrollList({
      x: 26,
      y: 97,
      w: 300,
      h: 110,
      rowH: 17,
      count: DEVICES.length,
      bar: [327, 80, 127],
      th: 78,
      make: (i) => {
        const d = DEVICES[i];
        const r = el(
          "div",
          { class: "sm-row dev", style: { top: i * 17 + "px", height: "17px" } },
          el("img", { src: IMG + d[2] + ".png", style: { left: "3px", top: "1px" } }),
          el("span", { text: d[0], style: { left: "18px" } }),
          el("em", { text: d[1], style: { left: "231px" } }),
        );
        r.addEventListener("click", () => show(i));
        rows.push(r);
        return r;
      },
    });
    const hdr = (x, wd, t) => {
      const n = el("div", { class: "sm-hdr", text: t });
      Object.assign(n.style, { left: x + "px", top: "80px", width: wd + "px" });
      return n;
    };
    show(state.dev);
    return [
      k.text(25, 62, "Devices:"),
      k.sunken(25, 79, 318, 129),
      hdr(26, 225, "Name"),
      hdr(252, 75, "Type"),
      list,
      sb,
      k.group(25, 231, 319, 164, "Device Properties", 8),
      props,
      k.btn(168, 361, 81, 22, "Troubleshoot...", { onclick: () => ctx.dialogs.message("No problems were detected with this device.", { title: "Troubleshooter" }) }),
      k.btn(259, 361, 75, 22, "Properties", { onclick: () => ctx.dialogs.message("Device properties are not available in this virtual desktop.", { title: "Properties" }) }),
    ];
  };

  const apply = () => S.patch({ volume: Math.round(state.vol * 100), volumeTray: state.tray });

  tc = k.tabs({
    top: 31,
    pane: [9, 47, 350, 363],
    active: tab,
    tabs: [
      { label: "Sounds", x: 12, w: 66, content: sounds },
      { label: "Audio", x: 78, w: 63, content: audio },
      { label: "Hardware", x: 142, w: 69, content: hardware },
    ],
  });
  w.place(tc, sheetButtons(w, k, { ok: apply, apply, y: 416, xs: [122, 203, 284] }));
  return w;
}
