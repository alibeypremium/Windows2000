// DivX Player 5.x look-alike. Playback uses the browser's HTML5 media engine; the DivX codec itself is not available.
import { el, popup } from "../ui/index.js";
import { basename, normalizePath, pickFiles, DOCS } from "../core/index.js";

const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
};
const svg = (inner, w = 22, h = 22) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 22 22">${inner}</svg>`;
const D = "#2b2b2b";
const G = {
  play: svg(`<path d="M7 4.5l10 6.5-10 6.5z" fill="${D}"/>`),
  pause: svg(`<rect x="5.5" y="4.5" width="4" height="13" fill="${D}"/><rect x="12.5" y="4.5" width="4" height="13" fill="${D}"/>`),
  stop: svg(`<rect x="5.5" y="5.5" width="11" height="11" fill="${D}"/>`),
  prev: svg(`<path d="M11.5 5L4 11l7.5 6zM19 5l-7.5 6 7.5 6z" fill="${D}"/>`),
  next: svg(`<path d="M3 5l7.5 6L3 17zM10.5 5l7.5 6-7.5 6z" fill="${D}"/>`),
  aspect: svg(`<rect x="4.5" y="5.5" width="13" height="11" fill="none" stroke="${D}" stroke-width="1.6"/><rect x="8" y="8.5" width="6" height="5" fill="none" stroke="${D}" stroke-width="1.4"/>`),
  eject: svg(`<path d="M11 4.5l6.5 7h-13z" fill="${D}"/><rect x="4.5" y="14" width="13" height="3" fill="${D}"/>`),
  vol: svg(`<path d="M2 8.5h3.5l4-3.5v12l-4-3.5H2z" fill="${D}"/><path d="M12.5 7.5c2 2 2 5 0 7" stroke="${D}" fill="none" stroke-width="1.6"/>`),
  mute: svg(`<path d="M2 8.5h3.5l4-3.5v12l-4-3.5H2z" fill="${D}"/><path d="M12.5 8l5 6M17.5 8l-5 6" stroke="#c00000" stroke-width="1.8"/>`),
};
const gi = (n, s = 22) => el("img", { src: "data:image/svg+xml;utf8," + encodeURIComponent(G[n]), width: s, height: s, alt: "", draggable: "false" });
// DivX logo shown in the idle video area (drawn from the reference screenshot).
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 100" width="210" height="64"><defs><linearGradient id="dxg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2f66ad"/><stop offset="1" stop-color="#a9d6f6"/></linearGradient></defs>
<path fill="#fff" fill-rule="evenodd" d="M0 24H46C68 24 80 36 80 50S68 76 46 76H0ZM18 39V61H44C53 61 60 57 60 50S53 39 44 39Z"/>
<rect x="94" y="24" width="19" height="52" fill="#fff"/>
<path fill="#fff" d="M120 24h25l15 33 15-33h25l-30 52h-20z"/>
<path d="M204 77L236 77 326 3 296 3Z" fill="url(#dxg)"/>
<path d="M216 24L246 24 272 77 242 77Z" fill="#6aa4dc" opacity=".92"/>
<text x="298" y="68" font-family="Arial" font-size="15" fill="#fff">®</text></svg>`;

export function openDivX(ctx, { path = null } = {}) {
  const w = ctx.wm.create({ title: "DivX Player™", icon: "divx", width: 460, height: 322, x: 170, y: 60, appId: "divx", maximizable: false, className: "dx-window" });
  const st = Object.assign({ volume: 80, recent: [] }, ctx.settings.get("divx") || {});
  let list = [], idx = -1, muted = false, blobUrl = null, current = null;
  const video = el("video", { class: "dx-video", playsinline: "true" });
  const logo = el("div", { class: "dx-logo" });
  logo.innerHTML = LOGO;
  const screen = el("div", { class: "dx-screen" }, logo, video);
  const seek = el("input", { class: "dx-seek", type: "range", min: "0", max: "1000", value: "0", "aria-label": "Seek" });
  const vol = el("input", { class: "dx-vol", type: "range", min: "0", max: "100", value: String(st.volume), "aria-label": "Volume" });
  const tCur = el("span", { text: "00:00:00" }), tTot = el("span", { text: "00:00:00" });
  const lcd = el("div", { class: "dx-lcd" },
    el("div", { class: "dx-lcd-row" }, tCur, el("span", { text: "(current time)" })),
    el("div", { class: "dx-lcd-row" }, tTot, el("span", { text: "(total time)" })));
  const err = (m) => ctx.dialogs.message(m, { title: "DivX Player", icon: "error" });
  const saveSt = () => ctx.settings.set("divx", st);

  const applyVolume = () => { video.volume = muted ? 0 : st.volume / 100; vol.value = String(muted ? 0 : st.volume); speaker.replaceChildren(gi(muted || st.volume === 0 ? "mute" : "vol", 16)); };
  const tick = () => {
    tCur.textContent = fmt(video.currentTime);
    tTot.textContent = fmt(video.duration);
    if (isFinite(video.duration) && video.duration > 0 && document.activeElement !== seek) seek.value = String(Math.round((video.currentTime / video.duration) * 1000));
  };
  const sourceUrl = async (e) => {
    if (e.file) return { url: URL.createObjectURL(e.file), blob: true };
    if (e.url) return { url: e.url, blob: false };
    const c = ctx.fs.stat(e.path).content || "";
    if (/^data:/.test(c)) return { url: URL.createObjectURL(await (await fetch(c)).blob()), blob: true };
    throw new Error("This file does not contain playable media.");
  };
  const remember = (e) => {
    if (!e.path && !e.url) return;
    st.recent = [{ title: e.title, path: e.path, url: e.url }, ...st.recent.filter((r) => (r.path || r.url) !== (e.path || e.url))].slice(0, 5);
    saveSt();
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
      remember(current);
      w.setTitle(`DivX Player™ - ${current.title}`);
    } catch (e) {
      if (e?.name === "NotAllowedError") return;
      await err(`DivX Player cannot play '${current.title}'.\n\nThe video or audio format is not supported (the DivX codec is not available in this browser version).`);
    }
  };
  const stop = () => { video.pause(); video.removeAttribute("src"); video.load(); logo.style.display = ""; seek.value = "0"; tCur.textContent = "00:00:00"; tTot.textContent = "00:00:00"; w.setTitle("DivX Player™"); };
  const toggle = () => { if (!video.src) return list.length ? playIndex(Math.max(idx, 0)) : openFile(); video.paused ? video.play() : video.pause(); };
  const next = () => list.length && playIndex((idx + 1) % list.length), prev = () => list.length && playIndex((idx - 1 + list.length) % list.length);
  const add = (e, play) => { list.push(e); if (play) playIndex(list.length - 1); };
  const openFile = async () => { const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Open" }); if (p) add({ title: basename(p), path: normalizePath(p) }, true); };
  const openLocal = async () => { const fs = await pickFiles({ accept: "audio/*,video/*,.avi,.divx", multiple: true }); fs.forEach((f, i) => add({ title: f.name, file: f }, i === 0)); };
  const openUrl = async () => { const v = await ctx.dialogs.prompt("Enter the URL of the file to open:", "http://", { title: "Open URL" }); if (v && v !== "http://") add({ title: v, url: v }, true); };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : screen.requestFullscreen?.());
  const setAspect = (a) => { video.style.objectFit = a === "original" ? "contain" : "fill"; video.style.aspectRatio = a === "original" ? "" : a.replace(":", "/"); };
  const info = () => ctx.dialogs.message(current ? `File: ${current.title}\nLength: ${fmt(video.duration)}\nSize: ${video.videoWidth ? video.videoWidth + " x " + video.videoHeight : "audio only"}\nCodec: browser built-in` : "No file is loaded.", { title: "Playback Properties", icon: "info" });
  const about = () => ctx.dialogs.message("DivX® Player 5.x\n\nDivX is a trademark of DivX, Inc. This is a browser re-creation; playback uses the formats your browser supports.", { title: "About DivX Player", icon: "divx" });
  const note = (m) => ctx.dialogs.message(m, { title: "DivX Player", icon: "info" });

  const menuItems = () => [
    { label: "Open...", shortcut: "Ctrl+O", action: openFile },
    { label: "Open URL...", action: openUrl },
    { label: "Open Recent File", submenu: () => (st.recent.length ? st.recent.map((r) => ({ label: r.title, action: () => add(r, true) })) : [{ label: "(empty)", disabled: true }]) },
    { separator: true },
    { label: "Show Playback Properties", shortcut: "Alt+P", disabled: !current, action: info },
    { label: "Choose Player Skin...", action: () => note("The skin 'DivX Player Default' is the only skin installed.") },
    { separator: true },
    { label: "Playback", submenu: [
      { label: video.paused ? "Play" : "Pause", action: toggle }, { label: "Stop", action: stop },
      { label: "Previous", action: prev }, { label: "Next", action: next },
      { separator: true },
      { label: "Skip Forward 10 s", action: () => { video.currentTime += 10; } }, { label: "Skip Back 10 s", action: () => { video.currentTime -= 10; } },
    ] },
    { label: "Video Display", submenu: [
      { label: "Full Screen", shortcut: "Alt+Enter", action: fullscreen },
      { separator: true },
      { label: "Original Aspect Ratio", action: () => setAspect("original") },
      { label: "4:3", action: () => setAspect("4:3") },
      { label: "16:9", action: () => setAspect("16:9") },
    ] },
    { separator: true },
    { label: "Preferences...", shortcut: "Ctrl+P", action: () => note("DivX Player preferences are not available in this browser version.") },
    { separator: true },
    { label: "DivX Video on Demand", submenu: [{ label: "Register this player...", action: () => note("DivX Video on Demand requires an internet connection to the DivX servers.") }, { label: "About DivX VOD...", action: () => note("DivX Video on Demand is not available offline.") }] },
    { separator: true },
    { label: "Help", submenu: [{ label: "DivX Player Help", shortcut: "F1", action: () => note("Open a movie with Open... or drag it onto the player.") }, { label: "About DivX Player...", action: about }] },
    { label: "Sign up for the DivX newsletter...", action: () => note("An internet connection is required to sign up for the newsletter.") },
    { separator: true },
    { label: "Exit", shortcut: "Alt+F4", action: () => w.close() },
  ];
  const showMenu = (x, y) => { const m = popup(menuItems(), x, y, {}); m.classList.add("dx-skin-menu"); };

  const rb = (g, title, fn, cls = "", size) => { const b = el("button", { class: "dx-rb " + cls, type: "button", title, "aria-label": title }, gi(g, size)); b.addEventListener("click", fn); return b; };
  const playBtn = rb("play", "Play", toggle, "dx-play", 22), stopBtn = rb("stop", "Stop", stop, "dx-stop", 16);
  const prevB = rb("prev", "Previous", prev, "", 16), nextB = rb("next", "Next", next, "", 16);
  const speaker = el("button", { class: "dx-speaker", type: "button", title: "Mute", "aria-label": "Mute" });
  speaker.addEventListener("click", () => { muted = !muted; applyVolume(); });
  const bars = el("span", { class: "dx-bars" });
  const left = el("div", { class: "dx-left" }, seek, playBtn, stopBtn, el("div", { class: "dx-pill" }, prevB, nextB),
    rb("aspect", "Full Screen", fullscreen, "dx-aspect", 14), speaker, bars, vol, rb("eject", "Open", openFile, "dx-eject", 14));
  w.setContent(el("div", { class: "dx-skin" }, screen, el("div", { class: "dx-bottom" }, left, lcd)));

  // the title-bar ▼ button opens the DivX menu instead of the Windows system menu
  const sysBtn = w.titlebar.querySelector(".caption-icon");
  sysBtn.addEventListener("click", (e) => { e.stopImmediatePropagation(); e.preventDefault(); const r = w.el.getBoundingClientRect(); showMenu(r.left + 14, r.top + 28); }, true);
  w.titlebar.addEventListener("contextmenu", (e) => { e.stopImmediatePropagation(); e.preventDefault(); showMenu(e.clientX, e.clientY); }, true);

  video.addEventListener("timeupdate", tick); video.addEventListener("loadedmetadata", tick);
  video.addEventListener("play", () => playBtn.replaceChildren(gi("pause", 22))); video.addEventListener("pause", () => playBtn.replaceChildren(gi("play", 22)));
  video.addEventListener("ended", () => (idx < list.length - 1 ? next() : stop()));
  video.addEventListener("error", () => { if (video.getAttribute("src")) { err(`DivX Player cannot play '${current?.title}'.\n\nThe video or audio format is not supported (the DivX codec is not available in this browser version).`); } });
  video.addEventListener("click", toggle); video.addEventListener("dblclick", fullscreen);
  screen.addEventListener("contextmenu", (e) => { e.preventDefault(); showMenu(e.clientX, e.clientY); });
  seek.addEventListener("input", () => { if (isFinite(video.duration)) video.currentTime = (seek.value / 1000) * video.duration; });
  vol.addEventListener("input", () => { st.volume = Number(vol.value); muted = false; saveSt(); applyVolume(); });
  w.el.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === " ") { e.preventDefault(); toggle(); } else if (k === "f" || (e.altKey && k === "enter")) fullscreen();
    else if (k === "m") { muted = !muted; applyVolume(); } else if (k === "arrowright") video.currentTime += 10; else if (k === "arrowleft") video.currentTime -= 10;
    else if (k === "arrowup") { st.volume = Math.min(100, st.volume + 5); applyVolume(); } else if (k === "arrowdown") { st.volume = Math.max(0, st.volume - 5); applyVolume(); }
    else if (e.ctrlKey && k === "o") { e.preventDefault(); openFile(); }
    else if (e.altKey && k === "p" && current) { e.preventDefault(); info(); }
  });
  w.onClose = () => { try { video.pause(); if (blobUrl) URL.revokeObjectURL(blobUrl); } catch { /* ignore */ } return true; };
  applyVolume();
  if (path && ctx.fs.exists(path)) add({ title: basename(path), path: normalizePath(path) }, true);
  return w;
}
