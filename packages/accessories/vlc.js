// VLC media player 0.8.6 look-alike. Playback uses the browser's HTML5 media engine (mp4/webm/ogg/mp3/wav/...).
import { el, button, menuBar } from "../ui/index.js";
import { basename, normalizePath, pickFiles, DOCS } from "../core/index.js";

const svg = (inner, w = 16, h = 16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 16 16">${inner}</svg>`;
const G = {
  play: svg('<path d="M4 2l10 6-10 6z" fill="#101010"/>'),
  pause: svg('<rect x="3" y="2" width="4" height="12" fill="#101010"/><rect x="9" y="2" width="4" height="12" fill="#101010"/>'),
  stop: svg('<rect x="3" y="3" width="10" height="10" fill="#101010"/>'),
  prev: svg('<rect x="2" y="2" width="2" height="12" fill="#101010"/><path d="M14 2L5 8l9 6z" fill="#101010"/>'),
  next: svg('<rect x="12" y="2" width="2" height="12" fill="#101010"/><path d="M2 2l9 6-9 6z" fill="#101010"/>'),
  slower: svg('<path d="M8 3L2 8l6 5z M14 3L8 8l6 5z" fill="#101010"/>'),
  faster: svg('<path d="M2 3l6 5-6 5z M8 3l6 5-6 5z" fill="#101010"/>'),
  list: svg('<rect x="2" y="3" width="12" height="2" fill="#101010"/><rect x="2" y="7" width="12" height="2" fill="#101010"/><rect x="2" y="11" width="12" height="2" fill="#101010"/>'),
  full: svg('<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="#101010" stroke-width="2" fill="none"/>'),
  vol: svg('<path d="M2 6h3l4-3v10l-4-3H2z" fill="#101010"/><path d="M11 5c2 2 2 4 0 6" stroke="#101010" fill="none" stroke-width="1.5"/>'),
  mute: svg('<path d="M2 6h3l4-3v10l-4-3H2z" fill="#101010"/><path d="M11 5l4 6M15 5l-4 6" stroke="#c00000" stroke-width="1.5"/>'),
};
const gi = (n) => el("img", { src: "data:image/svg+xml;utf8," + encodeURIComponent(G[n]), width: 16, height: 16, alt: "", draggable: "false" });
const CONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120"><defs><linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#ff9a1a"/><stop offset="1" stop-color="#e06a00"/></linearGradient></defs><path d="M50 4L88 98H12z" fill="url(#c)"/><path d="M42 30h16l4 12H38zM33 54h34l5 14H28zM24 78h52l5 14H19z" fill="#fff" opacity=".85"/><path d="M4 100h92l-8 14H12z" fill="#f0f0f0"/><path d="M4 100h92" stroke="#c0c0c0"/></svg>`;
const fmtTime = (s) => {
  if (!isFinite(s) || s < 0) return "-:--";
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
};
const AV = /\.(mp3|wav|ogg|oga|ogv|opus|flac|m4a|aac|mp4|m4v|webm|mov|mkv|avi|wmv|wma|mid|midi)$/i;

export function openVLC(ctx, { path = null } = {}) {
  const w = ctx.wm.create({ title: "VLC media player", icon: "vlc", width: 560, height: 420, x: 150, y: 60, appId: "vlc" });
  const st = Object.assign({ volume: 100 }, ctx.settings.get("vlc") || {});
  let list = [], idx = -1, muted = false, loop = false, random = false, aspect = "default", current = null, blobUrl = null, ac = null, gain = null, plWin = null, drawPl = () => {};
  const video = el("video", { class: "vlc-video", playsinline: "true" });
  const cone = el("div", { class: "vlc-cone" });
  cone.innerHTML = CONE;
  const screen = el("div", { class: "vlc-screen" }, cone, video);
  const slider = el("input", { class: "vlc-seek", type: "range", min: "0", max: "1000", value: "0", "aria-label": "Seek" });
  const timeTxt = el("div", { class: "vlc-time", text: "0:00" });
  const vol = el("input", { class: "vlc-vol", type: "range", min: "0", max: "200", value: String(st.volume), "aria-label": "Volume" });
  const volTxt = el("span", { class: "vlc-voltxt", text: st.volume + "%" });
  const status = el("div", { class: "vlc-status", text: "" });
  const err = (m) => ctx.dialogs.message(m, { title: "VLC media player", icon: "error" });

  // ---------- volume (0-200 %) ----------
  const applyVolume = () => {
    const v = muted ? 0 : st.volume / 100;
    video.volume = Math.min(1, v);
    if (v > 1 && blobUrl) {
      try {
        ac ||= new (window.AudioContext || window.webkitAudioContext)();
        if (!gain) { const src = ac.createMediaElementSource(video); gain = ac.createGain(); src.connect(gain).connect(ac.destination); }
        ac.resume(); gain.gain.value = v;
      } catch { /* keep video.volume */ }
    } else if (gain) gain.gain.value = Math.max(0.0001, v <= 1 ? v : 1), video.volume = 1;
    volTxt.textContent = (muted ? 0 : st.volume) + "%";
    vol.value = String(muted ? 0 : st.volume);
  };
  const setVolume = (n) => { st.volume = Math.max(0, Math.min(200, Math.round(n))); muted = false; ctx.settings.set("vlc", st); applyVolume(); };

  // ---------- playback ----------
  const setStatus = (t) => { status.textContent = t; };
  const tick = () => {
    const d = video.duration, t = video.currentTime;
    if (isFinite(d) && d > 0) { if (document.activeElement !== slider) slider.value = String(Math.round((t / d) * 1000)); timeTxt.textContent = `${fmtTime(t)}/${fmtTime(d)}`; }
    else timeTxt.textContent = fmtTime(t);
  };
  const sourceUrl = async (e) => {
    if (e.url) return { url: e.url, blob: false };
    if (e.file) return { url: URL.createObjectURL(e.file), blob: true };
    const n = ctx.fs.stat(e.path), c = n.content || "";
    if (/^data:/.test(c)) { const b = await (await fetch(c)).blob(); return { url: URL.createObjectURL(b), blob: true }; }
    throw new Error("This file does not contain playable media.");
  };
  const playIndex = async (i) => {
    if (i < 0 || i >= list.length) return;
    idx = i; current = list[i];
    try {
      const { url, blob } = await sourceUrl(current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = blob ? url : null;
      video.src = url;
      applyVolume();
      await video.play();
      cone.style.display = "none";
      w.setTitle(`${current.title} - VLC media player`);
      setStatus(`Playing ${current.title}`);
    } catch (e) {
      if (e?.name === "NotAllowedError") return;
      setStatus("Stopped");
      await err(`VLC is unable to open the MRL '${current.url || current.path || current.title}'.\n\nCheck the log for details.${e?.message ? "\n\n" + e.message : ""}`);
    }
    drawPl();
  };
  const stop = () => { video.pause(); video.removeAttribute("src"); video.load(); cone.style.display = ""; slider.value = "0"; timeTxt.textContent = "0:00"; w.setTitle("VLC media player"); setStatus("Stopped"); };
  const togglePlay = () => {
    if (!list.length) return openFile();
    if (!video.src) return playIndex(Math.max(idx, 0));
    if (video.paused) { video.play(); setStatus("Playing"); } else { video.pause(); setStatus("Paused"); }
  };
  const next = () => { if (!list.length) return; playIndex(random ? Math.floor(Math.random() * list.length) : (idx + 1) % list.length); };
  const prev = () => { if (!list.length) return; playIndex((idx - 1 + list.length) % list.length); };
  const add = (e, play = false) => { list.push(e); drawPl(); if (play) playIndex(list.length - 1); };
  const fileEntry = (p) => ({ title: basename(p), path: normalizePath(p) });
  const openFile = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Open File..." });
    if (p) add(fileEntry(p), true);
  };
  const openLocal = async () => {
    const files = await pickFiles({ accept: "audio/*,video/*", multiple: true });
    files.forEach((f, i) => add({ title: f.name, file: f }, i === 0));
  };
  const openNetwork = async () => {
    const v = await ctx.dialogs.prompt("Please enter a network address (HTTP, HTTPS or a direct media URL):", "http://", { title: "Open Network Stream" });
    if (v && v !== "http://") add({ title: v, url: v }, true);
  };
  const jump = async () => {
    const v = await ctx.dialogs.prompt("Jump to time (mm:ss):", fmtTime(video.currentTime), { title: "Jump to time" });
    if (!v) return;
    const parts = v.split(":").map(Number).reverse();
    const s = (parts[0] || 0) + (parts[1] || 0) * 60 + (parts[2] || 0) * 3600;
    if (isFinite(s)) video.currentTime = s;
  };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : screen.requestFullscreen?.());
  const setAspect = (a) => { aspect = a; video.style.aspectRatio = a === "default" ? "" : a.replace(":", "/"); video.style.objectFit = a === "default" ? "contain" : "fill"; };
  const speed = (f) => { video.playbackRate = Math.max(0.25, Math.min(4, video.playbackRate * f)); setStatus(`Speed: ${video.playbackRate.toFixed(2)}x`); };

  // ---------- playlist window ----------
  const showPlaylist = () => {
    if (plWin && !plWin.closed) { plWin.focus(); return; }
    plWin = ctx.wm.create({ title: "Playlist", icon: "vlc", width: 420, height: 320, x: 220, y: 120, appId: "vlc-playlist" });
    const body = el("div", { class: "vlc-pl" });
    drawPl = () => {
      if (!plWin || plWin.closed) return;
      body.replaceChildren(...list.map((e, i) => {
        const row = el("div", { class: "vlc-pl-row" + (i === idx ? " cur" : "") }, el("span", { text: e.title }));
        row.addEventListener("dblclick", () => playIndex(i));
        row.addEventListener("click", () => { [...body.children].forEach((r) => r.classList.remove("sel")); row.classList.add("sel"); row.dataset.i = i; });
        row.dataset.i = i;
        return row;
      }));
      if (!list.length) body.append(el("div", { class: "vlc-pl-empty", text: "The playlist is empty." }));
    };
    const del = () => { const r = body.querySelector(".sel"); if (!r) return; const i = Number(r.dataset.i); list.splice(i, 1); if (i < idx) idx--; else if (i === idx) { idx = -1; stop(); } drawPl(); };
    const pm = menuBar({
      Manage: [
        { label: "Add File...", action: openFile },
        { label: "Add from your computer...", action: openLocal },
        { label: "Add MRL...", action: openNetwork },
        { separator: true },
        { label: "Delete selection", shortcut: "Del", action: del },
        { label: "Clear playlist", action: () => { list = []; idx = -1; stop(); drawPl(); } },
        { separator: true },
        { label: "Close", action: () => plWin.close() },
      ],
      Sort: [
        { label: "Sort by title", action: () => { const cur = current; list.sort((a, b) => a.title.localeCompare(b.title)); idx = list.indexOf(cur); drawPl(); } },
        { label: "Randomize", action: () => { list.sort(() => Math.random() - 0.5); idx = list.indexOf(current); drawPl(); } },
      ],
    });
    const bar = el("div", { class: "vlc-pl-bar" }, button("Add", openFile), button("Delete", del), button(loop ? "Repeat: on" : "Repeat: off", (e) => { loop = !loop; e.target.textContent = loop ? "Repeat: on" : "Repeat: off"; }), button(random ? "Random: on" : "Random: off", (e) => { random = !random; e.target.textContent = random ? "Random: on" : "Random: off"; }));
    plWin.setContent(pm, body, bar);
    drawPl();
  };

  // ---------- window ----------
  const about = () => ctx.dialogs.message("VLC media player 0.8.6\nJanus\n\n(c) 1996-2007 the VideoLAN team\n\nThis is a browser look-alike. Playback uses the formats your browser supports.", { title: "About VLC media player", icon: "vlc" });
  const menus = menuBar({
    File: [
      { label: "Open File...", shortcut: "Ctrl+O", action: openFile },
      { label: "Open from your computer...", action: openLocal },
      { label: "Open Disc...", shortcut: "Ctrl+D", action: () => ctx.dialogs.message("There is no disc in the drive.", { title: "VLC media player", icon: "info" }) },
      { label: "Open Network Stream...", shortcut: "Ctrl+N", action: openNetwork },
      { label: "Open Capture Device...", shortcut: "Ctrl+C", action: () => ctx.dialogs.message("No capture device was found.", { title: "VLC media player", icon: "info" }) },
      { separator: true },
      { label: "Quit", shortcut: "Ctrl+Q", action: () => w.close() },
    ],
    View: [
      { label: "Playlist...", shortcut: "Ctrl+L", action: showPlaylist },
      { label: "Messages...", shortcut: "Ctrl+M", action: () => ctx.dialogs.message("No messages.", { title: "Messages", icon: "info" }) },
      { label: "Stream and Media Info...", shortcut: "Ctrl+J", action: () => ctx.dialogs.message(current ? `${current.title}\n\nDuration: ${fmtTime(video.duration)}\nResolution: ${video.videoWidth ? video.videoWidth + "x" + video.videoHeight : "audio only"}` : "Nothing is playing.", { title: "Stream and Media Info", icon: "info" }) },
    ],
    Settings: [
      { label: "Extended GUI", shortcut: "Ctrl+E", action: () => ctx.dialogs.message("The extended GUI is not available in this browser version.", { title: "VLC media player", icon: "info" }) },
      { label: "Preferences...", shortcut: "Ctrl+S", action: () => ctx.dialogs.message("The preferences dialog is not available in this browser version.", { title: "VLC media player", icon: "info" }) },
    ],
    Audio: [
      { label: "Volume Up", shortcut: "Ctrl+Up", action: () => setVolume(st.volume + 10) },
      { label: "Volume Down", shortcut: "Ctrl+Down", action: () => setVolume(st.volume - 10) },
      { label: "Mute", shortcut: "M", action: () => { muted = !muted; applyVolume(); } },
    ],
    Video: [
      { label: "Fullscreen", shortcut: "F", action: fullscreen },
      { separator: true },
      { label: "Aspect ratio: Default", action: () => setAspect("default") },
      { label: "Aspect ratio: 4:3", action: () => setAspect("4:3") },
      { label: "Aspect ratio: 16:9", action: () => setAspect("16:9") },
    ],
    Navigation: [
      { label: "Previous", shortcut: "P", action: prev },
      { label: "Next", shortcut: "N", action: next },
      { separator: true },
      { label: "Jump to time...", shortcut: "Ctrl+T", action: jump },
      { label: "Faster", action: () => speed(1.25) },
      { label: "Slower", action: () => speed(0.8) },
    ],
    Help: [
      { label: "About...", shortcut: "F1", action: about },
    ],
  });
  const cb = (g, title, fn) => { const b = el("button", { class: "vlc-btn", type: "button", title, "aria-label": title }, gi(g)); b.addEventListener("click", fn); return b; };
  const playBtn = cb("play", "Play/Pause", togglePlay);
  const muteBtn = cb("vol", "Mute", () => { muted = !muted; applyVolume(); });
  const controls = el("div", { class: "vlc-controls" }, playBtn, cb("stop", "Stop", stop), cb("prev", "Previous", prev), cb("next", "Next", next), cb("slower", "Slower", () => speed(0.8)), cb("faster", "Faster", () => speed(1.25)),
    el("span", { class: "vlc-sp" }), cb("list", "Playlist", showPlaylist), cb("full", "Fullscreen", fullscreen), el("span", { class: "vlc-sp" }), muteBtn, vol, volTxt);
  w.setContent(menus, screen, el("div", { class: "vlc-seekrow" }, slider, timeTxt), controls, el("div", { class: "vlc-statusbar" }, status));
  setStatus("");

  video.addEventListener("timeupdate", tick);
  video.addEventListener("loadedmetadata", tick);
  video.addEventListener("play", () => { playBtn.firstChild.replaceWith(gi("pause")); });
  video.addEventListener("pause", () => { playBtn.firstChild.replaceWith(gi("play")); });
  video.addEventListener("ended", () => { if (loop || idx < list.length - 1 || random) next(); else stop(); });
  video.addEventListener("error", () => { if (video.getAttribute("src")) { setStatus("Stopped"); err(`VLC is unable to open the MRL '${current?.url || current?.path || current?.title}'.\n\nThe format is not supported by this browser.`); } });
  video.addEventListener("click", togglePlay);
  video.addEventListener("dblclick", fullscreen);
  slider.addEventListener("input", () => { if (isFinite(video.duration)) video.currentTime = (slider.value / 1000) * video.duration; });
  vol.addEventListener("input", () => setVolume(Number(vol.value)));
  w.el.addEventListener("keydown", (e) => {
    if (e.target.closest("input[type=text]")) return;
    const k = e.key.toLowerCase();
    if (k === " ") { e.preventDefault(); togglePlay(); }
    else if (k === "f") fullscreen(); else if (k === "m") { muted = !muted; applyVolume(); } else if (k === "n") next(); else if (k === "p") prev();
    else if (k === "arrowright") video.currentTime += 10; else if (k === "arrowleft") video.currentTime -= 10;
    else if (e.ctrlKey && k === "arrowup") setVolume(st.volume + 10); else if (e.ctrlKey && k === "arrowdown") setVolume(st.volume - 10);
    else if (e.ctrlKey && k === "o") { e.preventDefault(); openFile(); } else if (e.ctrlKey && k === "l") { e.preventDefault(); showPlaylist(); }
  });
  const prevClose = w.onClose;
  w.onClose = () => { try { video.pause(); if (blobUrl) URL.revokeObjectURL(blobUrl); if (plWin && !plWin.closed) plWin.close(); } catch { /* ignore */ } return prevClose ? prevClose() : true; };
  applyVolume();
  if (path && ctx.fs.exists(path)) add(fileEntry(path), true);
  return w;
}
