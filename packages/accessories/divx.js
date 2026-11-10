// DivX Player 5.x look-alike. Playback uses the browser's HTML5 media engine; the DivX codec itself is not available.
import { el, popup } from "../ui/index.js";
import { basename, normalizePath, pickFiles, DOCS } from "../core/index.js";

const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
};
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">${inner}</svg>`;
const G = {
  play: svg('<path d="M7 4l11 7-11 7z" fill="#e8e8f0"/>'),
  pause: svg('<rect x="5" y="4" width="4" height="14" fill="#e8e8f0"/><rect x="13" y="4" width="4" height="14" fill="#e8e8f0"/>'),
  stop: svg('<rect x="5" y="5" width="12" height="12" fill="#e8e8f0"/>'),
  prev: svg('<rect x="4" y="4" width="2" height="14" fill="#e8e8f0"/><path d="M18 4L8 11l10 7z" fill="#e8e8f0"/>'),
  next: svg('<rect x="16" y="4" width="2" height="14" fill="#e8e8f0"/><path d="M4 4l10 7-10 7z" fill="#e8e8f0"/>'),
  open: svg('<path d="M3 17V6h6l2 2h8v9z" fill="#e8e8f0"/>'),
  full: svg('<path d="M3 8V3h5M14 3h5v5M19 14v5h-5M8 19H3v-5" stroke="#e8e8f0" stroke-width="2" fill="none"/>'),
  vol: svg('<path d="M3 8h4l5-4v14l-5-4H3z" fill="#e8e8f0"/><path d="M15 7c3 3 3 5 0 8" stroke="#e8e8f0" fill="none" stroke-width="2"/>'),
  mute: svg('<path d="M3 8h4l5-4v14l-5-4H3z" fill="#e8e8f0"/><path d="M15 8l5 6M20 8l-5 6" stroke="#ff6060" stroke-width="2"/>'),
  menu: svg('<rect x="4" y="5" width="14" height="2" fill="#e8e8f0"/><rect x="4" y="10" width="14" height="2" fill="#e8e8f0"/><rect x="4" y="15" width="14" height="2" fill="#e8e8f0"/>'),
};
const gi = (n) => el("img", { src: "data:image/svg+xml;utf8," + encodeURIComponent(G[n]), width: 22, height: 22, alt: "", draggable: "false" });

export function openDivX(ctx, { path = null } = {}) {
  const w = ctx.wm.create({ title: "DivX Player", icon: "divx", width: 520, height: 400, x: 170, y: 70, appId: "divx" });
  const st = Object.assign({ volume: 80 }, ctx.settings.get("divx") || {});
  let list = [], idx = -1, muted = false, blobUrl = null, current = null, aspect = "original";
  const video = el("video", { class: "dx-video", playsinline: "true" });
  const logo = el("div", { class: "dx-logo" }, el("span", { class: "dx-logo-d", text: "Div" }), el("span", { class: "dx-logo-x", text: "X" }), el("div", { class: "dx-logo-sub", text: "Player" }));
  const screen = el("div", { class: "dx-screen" }, logo, video);
  const seek = el("input", { class: "dx-seek", type: "range", min: "0", max: "1000", value: "0", "aria-label": "Seek" });
  const vol = el("input", { class: "dx-vol", type: "range", min: "0", max: "100", value: String(st.volume), "aria-label": "Volume" });
  const lcd = el("div", { class: "dx-lcd" }, el("div", { class: "dx-lcd-time", text: "00:00:00" }), el("div", { class: "dx-lcd-name", text: "" }));
  const err = (m) => ctx.dialogs.message(m, { title: "DivX Player", icon: "error" });

  const applyVolume = () => { video.volume = muted ? 0 : st.volume / 100; vol.value = String(muted ? 0 : st.volume); muteBtn.firstChild.replaceWith(gi(muted ? "mute" : "vol")); };
  const setStatus = (name) => { lcd.querySelector(".dx-lcd-name").textContent = name || ""; };
  const tick = () => {
    lcd.querySelector(".dx-lcd-time").textContent = fmt(video.currentTime);
    if (isFinite(video.duration) && video.duration > 0 && document.activeElement !== seek) seek.value = String(Math.round((video.currentTime / video.duration) * 1000));
  };
  const sourceUrl = async (e) => {
    if (e.file) return { url: URL.createObjectURL(e.file), blob: true };
    const c = ctx.fs.stat(e.path).content || "";
    if (/^data:/.test(c)) return { url: URL.createObjectURL(await (await fetch(c)).blob()), blob: true };
    throw new Error("This file does not contain playable media.");
  };
  const playIndex = async (i) => {
    if (i < 0 || i >= list.length) return;
    idx = i; current = list[i];
    try {
      const { url, blob } = await sourceUrl(current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = blob ? url : null;
      video.src = url; applyVolume();
      await video.play();
      logo.style.display = "none";
      setStatus(current.title);
      w.setTitle(`DivX Player - ${current.title}`);
    } catch (e) {
      if (e?.name === "NotAllowedError") return;
      await err(`DivX Player cannot play '${current.title}'.\n\nThe video or audio format is not supported (the DivX codec is not available in this browser version).`);
    }
  };
  const stop = () => { video.pause(); video.removeAttribute("src"); video.load(); logo.style.display = ""; seek.value = "0"; lcd.querySelector(".dx-lcd-time").textContent = "00:00:00"; setStatus(""); w.setTitle("DivX Player"); };
  const toggle = () => { if (!video.src) return list.length ? playIndex(Math.max(idx, 0)) : openFile(); video.paused ? video.play() : video.pause(); };
  const next = () => list.length && playIndex((idx + 1) % list.length), prev = () => list.length && playIndex((idx - 1 + list.length) % list.length);
  const add = (e, play) => { list.push(e); if (play) playIndex(list.length - 1); };
  const openFile = async () => { const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Open" }); if (p) add({ title: basename(p), path: normalizePath(p) }, true); };
  const openLocal = async () => { const fs = await pickFiles({ accept: "audio/*,video/*,.avi,.divx", multiple: true }); fs.forEach((f, i) => add({ title: f.name, file: f }, i === 0)); };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : screen.requestFullscreen?.());
  const setAspect = (a) => { aspect = a; video.style.objectFit = a === "original" ? "contain" : "fill"; video.style.aspectRatio = a === "original" ? "" : a.replace(":", "/"); };
  const info = () => ctx.dialogs.message(current ? `File: ${current.title}\nLength: ${fmt(video.duration)}\nSize: ${video.videoWidth ? video.videoWidth + " x " + video.videoHeight : "audio only"}\nCodec: browser built-in` : "No file is loaded.", { title: "DivX Player - File Information", icon: "info" });
  const about = () => ctx.dialogs.message("DivX Player 5.x\n\nDivX is a trademark of DivX, Inc. This is a browser look-alike; playback uses formats your browser supports.", { title: "About DivX Player", icon: "divx" });

  const cb = (g, title, fn, cls = "") => { const b = el("button", { class: "dx-btn " + cls, type: "button", title, "aria-label": title }, gi(g)); b.addEventListener("click", fn); return b; };
  const playBtn = cb("play", "Play/Pause", toggle, "big"), muteBtn = cb("vol", "Mute", () => { muted = !muted; applyVolume(); });
  const menuItems = () => [
    { label: "Open File...", shortcut: "Ctrl+O", action: openFile },
    { label: "Open from your computer...", action: openLocal },
    { separator: true },
    { label: video.paused ? "Play" : "Pause", action: toggle },
    { label: "Stop", action: stop },
    { label: "Previous", action: prev },
    { label: "Next", action: next },
    { separator: true },
    { label: "Full Screen", action: fullscreen },
    { label: "Aspect Ratio: Original", action: () => setAspect("original") },
    { label: "Aspect Ratio: 4:3", action: () => setAspect("4:3") },
    { label: "Aspect Ratio: 16:9", action: () => setAspect("16:9") },
    { separator: true },
    { label: "File Information...", action: info },
    { label: "About DivX Player...", action: about },
    { label: "Exit", action: () => w.close() },
  ];
  const menuBtn = cb("menu", "Menu", () => { const r = menuBtn.getBoundingClientRect(); popup(menuItems(), r.left, r.top - 4, { anchor: menuBtn }); });
  const bar = el("div", { class: "dx-bar" }, cb("open", "Open", openFile), cb("prev", "Previous", prev), playBtn, cb("stop", "Stop", stop), cb("next", "Next", next), lcd, muteBtn, vol, cb("full", "Full Screen", fullscreen), menuBtn);
  w.setContent(el("div", { class: "dx-skin" }, el("div", { class: "dx-top" }, el("span", { class: "dx-brand", text: "DivX" }), el("span", { class: "dx-brand-sub", text: "Player" })), screen, seek, bar));

  video.addEventListener("timeupdate", tick); video.addEventListener("loadedmetadata", tick);
  video.addEventListener("play", () => playBtn.firstChild.replaceWith(gi("pause"))); video.addEventListener("pause", () => playBtn.firstChild.replaceWith(gi("play")));
  video.addEventListener("ended", () => (idx < list.length - 1 ? next() : stop()));
  video.addEventListener("error", () => { if (video.getAttribute("src")) { setStatus(""); err(`DivX Player cannot play '${current?.title}'.\n\nThe video or audio format is not supported (the DivX codec is not available in this browser version).`); } });
  video.addEventListener("click", toggle); video.addEventListener("dblclick", fullscreen);
  screen.addEventListener("contextmenu", (e) => { e.preventDefault(); popup(menuItems(), e.clientX, e.clientY, {}); });
  seek.addEventListener("input", () => { if (isFinite(video.duration)) video.currentTime = (seek.value / 1000) * video.duration; });
  vol.addEventListener("input", () => { st.volume = Number(vol.value); muted = false; ctx.settings.set("divx", st); applyVolume(); });
  w.el.addEventListener("keydown", (e) => {
    if (e.target.closest("input[type=text]")) return;
    const k = e.key.toLowerCase();
    if (k === " ") { e.preventDefault(); toggle(); } else if (k === "f" || (e.altKey && k === "enter")) fullscreen();
    else if (k === "m") { muted = !muted; applyVolume(); } else if (k === "arrowright") video.currentTime += 10; else if (k === "arrowleft") video.currentTime -= 10;
    else if (k === "arrowup") { st.volume = Math.min(100, st.volume + 5); applyVolume(); } else if (k === "arrowdown") { st.volume = Math.max(0, st.volume - 5); applyVolume(); }
    else if (e.ctrlKey && k === "o") { e.preventDefault(); openFile(); }
  });
  w.onClose = () => { try { video.pause(); if (blobUrl) URL.revokeObjectURL(blobUrl); } catch { /* ignore */ } return true; };
  applyVolume();
  if (path && ctx.fs.exists(path)) add({ title: basename(path), path: normalizePath(path) }, true);
  return w;
}
