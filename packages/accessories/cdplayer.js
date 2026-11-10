// CD Player (Windows 2000 "Deluxe CD"): skinned player UI from cdplayer.exe resources.
import { el, separator, safely } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { refWindow, btn } from "../control-panel/refkit.js";
import { CD_DIALOGS as D } from "./cd-data.js";
import { makeDemoAudio } from "./media.js";

const GLYPH = { play: "▶", pause: "❚❚", stop: "■", prev: "|◀", next: "▶|", back: "◀◀", fwd: "▶▶", eject: "⏏" };

export async function openCdPlayer(ctx) {
  const w = ctx.wm.create({ title: "CD Player", icon: "media", width: 420, height: 252, appId: "cdplayer", resizable: false, maximizable: false });
  const st = Object.assign({ startup: false, stopExit: false, topmost: false, taskbar: true, time: 1004, preview: 10 }, ctx.settings.get("cdplayer") || {});
  let random = false, repeat = false, intro = false, tb = true, info = true, sb = true, disc = true, url = null;
  const audio = new Audio();
  audio.preload = "auto";
  const track = { title: "Track 01", artist: "Unknown Artist", album: "Windows 2000" };
  const fmt = (s) => (!Number.isFinite(s) ? "00:00" : String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0"));
  const led = el("div", { class: "cdp-led" }), trk = el("div", { class: "cdp-trk" }), dot = el("i", { class: "cdp-dot" });
  const artist = el("input", { class: "cdp-field", value: track.artist }), title = el("input", { class: "cdp-field", value: track.album }), trackSel = el("select", { class: "cdp-field" }, el("option", { text: "01 Track 01" }));
  const status = el("div", { class: "cdp-status", text: "" });
  const sphere = (key, tip, fn) => {
    const b = el("button", { class: "cdp-btn", title: tip, "aria-label": tip, onclick: safely(fn) }, el("span", { text: GLYPH[key] }));
    b.dataset.k = key;
    return b;
  };
  const stop = () => { audio.pause(); audio.currentTime = 0; sync(); };
  const play = async () => { if (!disc) return; if (audio.paused) await audio.play(); sync(); };
  const keys = [
    sphere("play", "Play", play),
    sphere("pause", "Pause", () => { audio.pause(); sync(); }),
    sphere("stop", "Stop", stop),
    sphere("prev", "Previous Track", () => { audio.currentTime = 0; }),
    sphere("back", "Rewind", () => { audio.currentTime = Math.max(0, audio.currentTime - 5); }),
    sphere("fwd", "Fast Forward", () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); }),
    sphere("next", "Next Track", () => { audio.currentTime = audio.duration || 0; }),
    sphere("eject", "Eject", () => { stop(); disc = !disc; load(); }),
  ];
  const draw = () => {
    const d = audio.duration || 0, t = audio.currentTime || 0;
    const v = !disc ? null : st.time === 1005 ? t : st.time === 1006 ? Math.max(0, d - t) : st.time === 1007 ? Math.max(0, d - t) : t;
    led.textContent = disc ? ((st.time === 1006 || st.time === 1007) ? "-" : "") + fmt(v) : "--:--";
    trk.textContent = disc ? "[01]" : "[--]";
    dot.style.opacity = audio.paused ? 0.25 : 1;
    status.textContent = !sb ? "" : !disc ? "No disc" : audio.paused ? (audio.currentTime ? "Paused" : "Stopped") : "Playing";
  };
  function sync() {
    for (const b of keys) {
      const k = b.dataset.k;
      b.disabled = !disc && k !== "eject" ? true : (k === "pause" && audio.paused) || (k === "stop" && audio.paused && !audio.currentTime);
    }
    draw();
  }
  async function load() {
    if (disc && !url) url = URL.createObjectURL(await makeDemoAudio());
    audio.src = disc ? url : "";
    artist.disabled = title.disabled = trackSel.disabled = !disc;
    w.setTitle(disc ? "CD Player" : "CD Player");
    sync();
    if (disc && st.startup) play().catch(() => {});
  }
  audio.addEventListener("timeupdate", draw);
  audio.addEventListener("play", sync); audio.addEventListener("pause", sync);
  audio.addEventListener("ended", () => { if (repeat) { audio.currentTime = 0; audio.play(); } else stop(); });
  const sheet = (tpl, ttl, build, onOk) => {
    const W = px(tpl.cx) + 16, H = py(tpl.cy) + 22 + 4 + 40;
    const sw = refWindow(ctx, { title: ttl, icon: "media", width: W, height: H, appId: "dialog" });
    const d = dialogFromTemplate(ctx, tpl, { host: sw, ox: 8, oy: 22 + 4, ...build });
    sw.place(btn(W - 8 - 150 - 6, H - 4 - 30, 72, 23, "OK", { def: true, onclick: () => { onOk?.(d); sw.close(); } }), btn(W - 8 - 72, H - 4 - 30, 72, 23, "Cancel", { onclick: () => sw.close() }));
    return sw;
  };
  const prefs = () => sheet(D["102"], "Player Options", {
    checked: { 1001: st.startup, 1002: st.stopExit, 1003: st.topmost, 1066: st.taskbar, [st.time]: true },
    on: { 1001: () => (st.startup = !st.startup), 1002: () => (st.stopExit = !st.stopExit), 1003: () => (st.topmost = !st.topmost), 1066: () => (st.taskbar = !st.taskbar), 1004: () => (st.time = 1004), 1005: () => (st.time = 1005), 1006: () => (st.time = 1006), 1007: () => (st.time = 1007) },
    groups: [[1004, 1005, 1006, 1007]],
  }, () => { ctx.settings.set("cdplayer", st); draw(); });
  const edit = () => sheet(D["118"], "CD Playlist Editor", { values: { 2014: artist.value, 2016: title.value } }, (d) => { artist.value = d.ctl[2014]?.value ?? artist.value; title.value = d.ctl[2016]?.value ?? title.value; });
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  w.setMenu({
    Disc: [{ label: "Edit Play List...", disabled: !disc, shortcut: "Ctrl+P", action: edit }, separator(), { label: "Exit", action: () => w.close() }],
    View: () => [
      { label: "Toolbar", checked: tb, action: () => { tb = !tb; layout(); } },
      { label: "Disc/Track Info", checked: info, action: () => { info = !info; layout(); } },
      { label: "Status Bar", checked: sb, action: () => { sb = !sb; layout(); draw(); } },
      separator(),
      { label: "Track Time Elapsed", checked: st.time === 1005, action: () => { st.time = 1005; draw(); } },
      { label: "Track Time Remaining", checked: st.time === 1006, action: () => { st.time = 1006; draw(); } },
      { label: "Disc Time Remaining", checked: st.time === 1007, action: () => { st.time = 1007; draw(); } },
      separator(),
      { label: "Volume Control", action: () => ctx.launch("volume") },
    ],
    Options: () => [
      { label: "Random Order", checked: random, action: () => (random = !random) },
      { label: "Continuous Play", checked: repeat, action: () => (repeat = !repeat) },
      { label: "Intro Play", checked: intro, action: () => (intro = !intro) },
      separator(),
      { label: "Preferences...", action: prefs },
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "cdplayer" }) },
      separator(),
      { label: "About CD Player", action: () => ctx.dialogs.message("CD Player\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1990-1999 Microsoft Corp.", { title: "About CD Player", icon: "media" }) },
    ],
  });
  const bar = el("div", { class: "cdp-bar" }, ...keys), disp = el("div", { class: "cdp-disp" }, el("div", { class: "cdp-lcd" }, dot, trk, led)), infoBox = el("div", { class: "cdp-info" }, el("label", { text: "Artist:" }, artist), el("label", { text: "Title:" }, title), el("label", { text: "Track:" }, trackSel));
  const root = el("div", { class: "cdp-root" }, disp, bar, infoBox, el("img", { class: "cdp-logo", src: "assets/cdplayer/bmp216.png", alt: "" }));
  function layout() { bar.style.display = tb ? "" : "none"; infoBox.style.display = info ? "" : "none"; status.style.display = sb ? "" : "none"; }
  w.setContent(root, status);
  w.addCleanup(() => { audio.pause(); audio.removeAttribute("src"); if (url) URL.revokeObjectURL(url); if (st.stopExit) audio.pause(); });
  layout();
  await load();
  return w;
}
