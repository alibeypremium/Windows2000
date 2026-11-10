// VLC media player 0.8.6 look-alike. Playback uses the browser's HTML5 media engine (mp4/webm/ogg/mp3/wav/...).
import { el, button, menuBar } from "../ui/index.js";
import { basename, normalizePath, pickFiles, DOCS } from "../core/index.js";

const svg = (inner, w = 16, h = 16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 16 16">${inner}</svg>`;
const K = "#555";
const G = {
  play: svg(`<path d="M4 2l10 6-10 6z" fill="${K}"/>`),
  pause: svg(`<rect x="3" y="2" width="4" height="12" fill="${K}"/><rect x="9" y="2" width="4" height="12" fill="${K}"/>`),
  stop: svg(`<rect x="3" y="3" width="10" height="10" fill="${K}"/>`),
  prev: svg(`<rect x="2" y="3" width="2" height="10" fill="${K}"/><path d="M8 3L3.5 8 8 13zM14 3L9.5 8 14 13z" fill="${K}"/>`),
  next: svg(`<rect x="12" y="3" width="2" height="10" fill="${K}"/><path d="M2 3l4.5 5L2 13zM8 3l4.5 5L8 13z" fill="${K}"/>`),
  slower: svg('<path d="M8 4L2 8l6 4zM14 4L8 8l6 4z" fill="#a0a0a0"/>'),
  faster: svg('<path d="M2 4l6 4-6 4zM8 4l6 4-6 4z" fill="#a0a0a0"/>'),
  video: svg(`<rect x="1.5" y="3.5" width="13" height="9" fill="#fff" stroke="${K}"/><rect x="4" y="5.5" width="8" height="5" fill="none" stroke="${K}"/>`),
  list: svg(`<rect x="2" y="3" width="2" height="2" fill="${K}"/><rect x="5.5" y="3" width="8" height="2" fill="${K}"/><rect x="2" y="7" width="2" height="2" fill="${K}"/><rect x="5.5" y="7" width="8" height="2" fill="${K}"/><rect x="2" y="11" width="2" height="2" fill="${K}"/><rect x="5.5" y="11" width="8" height="2" fill="${K}"/>`),
  eq: svg(`<path d="M4 2v12M8 2v12M12 2v12" stroke="${K}" stroke-width="1.4"/><rect x="2.5" y="9" width="3" height="2.5" fill="${K}"/><rect x="6.5" y="4" width="3" height="2.5" fill="${K}"/><rect x="10.5" y="7" width="3" height="2.5" fill="${K}"/>`),
  vol: svg(`<path d="M1 6h3l4-3v10l-4-3H1z" fill="${K}"/><path d="M10.5 5c1.7 1.7 1.7 4.3 0 6M12.5 3c3 3 3 7 0 10" stroke="${K}" fill="none" stroke-width="1.2"/>`),
  mute: svg(`<path d="M1 6h3l4-3v10l-4-3H1z" fill="${K}"/><path d="M10 5.5l4 5M14 5.5l-4 5" stroke="#c00000" stroke-width="1.5"/>`),
};
const gi = (n, s = 16) => el("img", { src: "data:image/svg+xml;utf8," + encodeURIComponent(G[n]), width: s, height: s, alt: "", draggable: "false" });
const WEDGE = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="24" viewBox="0 0 80 24"><defs><linearGradient id="vw" x1="0" x2="1"><stop offset="0" stop-color="#3cb43c"/><stop offset=".5" stop-color="#e6e600"/><stop offset="1" stop-color="#ff4000"/></linearGradient><clipPath id="vc"><rect class="vlc-wedge-clip" x="0" y="0" width="40" height="24"/></clipPath></defs><polygon points="0.5,23.5 79.5,23.5 79.5,1.5" fill="#ece9e0" stroke="#808080"/><polygon points="1,23 79,23 79,2" fill="url(#vw)" clip-path="url(#vc)"/></svg>`;
const CONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120"><defs><linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#ff9a1a"/><stop offset="1" stop-color="#e06a00"/></linearGradient></defs><path d="M50 4L88 98H12z" fill="url(#c)"/><path d="M42 30h16l4 12H38zM33 54h34l5 14H28zM24 78h52l5 14H19z" fill="#fff" opacity=".85"/><path d="M4 100h92l-8 14H12z" fill="#f0f0f0"/><path d="M4 100h92" stroke="#c0c0c0"/></svg>`;
const fmtTime = (s) => {
  if (!isFinite(s) || s < 0) return "--:--";
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60, p2 = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p2(m)}:${p2(x)}` : `${p2(m)}:${p2(x)}`;
};
const AV = /\.(mp3|wav|ogg|oga|ogv|opus|flac|m4a|aac|mp4|m4v|webm|mov|mkv|avi|wmv|wma|mid|midi)$/i;

export function openVLC(ctx, { path = null } = {}) {
  const w = ctx.wm.create({ title: "VLC media player", icon: "vlc", width: 364, height: 131, x: 150, y: 60, appId: "vlc" });
  const st = Object.assign({ volume: 100, recent: [] }, ctx.settings.get("vlc") || {});
  let list = [], idx = -1, muted = false, loop = false, random = false, aspect = "default", current = null, blobUrl = null, ac = null, gain = null, plWin = null, drawPl = () => {};
  const video = el("video", { class: "vlc-video", playsinline: "true" });
  const cone = el("div", { class: "vlc-cone" });
  cone.innerHTML = CONE;
  const screen = el("div", { class: "vlc-screen" }, cone, video);
  screen.style.display = "none";
  const slider = el("input", { class: "vlc-seek", type: "range", min: "0", max: "1000", value: "0", "aria-label": "Seek", disabled: true });
  const timeTxt = el("div", { class: "vlc-time vlc-field", text: "--:--/--:--" });
  const wedgeBox = el("div", { class: "vlc-wedge", role: "slider", "aria-label": "Volume", tabindex: "0" });
  wedgeBox.innerHTML = WEDGE;
  const volTxt = el("span", { class: "vlc-voltxt", text: "100%" });
  wedgeBox.append(volTxt);
  const status = el("div", { class: "vlc-status vlc-field", text: "" });
  const rate = el("button", { class: "vlc-rate vlc-field", type: "button", text: "1.00x", title: "Normal speed" });
  let baseGeo = null;
  const showVideo = (on) => {
    if (on && screen.style.display === "none") {
      baseGeo = { ...w.geometry };
      screen.style.display = "flex";
      w.geometry = { ...w.geometry, width: Math.max(w.geometry.width, 480), height: w.geometry.height + 260 };
      ctx.wm.applyGeometry(w);
    } else if (!on && screen.style.display !== "none") {
      screen.style.display = "none";
      if (baseGeo) { w.geometry = { ...w.geometry, width: baseGeo.width, height: baseGeo.height }; ctx.wm.applyGeometry(w); baseGeo = null; }
    }
  };
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
    const pct = muted ? 0 : st.volume;
    volTxt.textContent = pct + "%";
    wedgeBox.querySelector(".vlc-wedge-clip")?.setAttribute("width", String((pct / 200) * 80));
    wedgeBox.setAttribute("aria-valuenow", String(pct));
    speaker.replaceChildren(gi(muted || pct === 0 ? "mute" : "vol"));
  };
  const setVolume = (n) => { st.volume = Math.max(0, Math.min(200, Math.round(n))); muted = false; ctx.settings.set("vlc", st); applyVolume(); };

  // ---------- playback ----------
  const setStatus = (t) => { status.textContent = t; };
  const tick = () => {
    const d = video.duration, t = video.currentTime;
    if (isFinite(d) && d > 0) { if (document.activeElement !== slider) slider.value = String(Math.round((t / d) * 1000)); timeTxt.textContent = `${fmtTime(t)}/${fmtTime(d)}`; }
    else timeTxt.textContent = `${fmtTime(t)}/--:--`;
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
      slider.disabled = false; showVideo(true);
      if (current.path || current.url) { st.recent = [{ title: current.title, path: current.path, url: current.url }, ...(st.recent || []).filter((r) => (r.path || r.url) !== (current.path || current.url))].slice(0, 8); ctx.settings.set("vlc", st); }
      w.setTitle(`${current.title} - VLC media player`);
      setStatus(`Playing ${current.title}`);
    } catch (e) {
      if (e?.name === "NotAllowedError") return;
      setStatus("Stopped");
      await err(`VLC is unable to open the MRL '${current.url || current.path || current.title}'.\n\nCheck the log for details.${e?.message ? "\n\n" + e.message : ""}`);
    }
    drawPl();
  };
  const stop = () => { video.pause(); video.removeAttribute("src"); video.load(); cone.style.display = ""; slider.value = "0"; slider.disabled = true; showVideo(false); timeTxt.textContent = "--:--/--:--"; w.setTitle("VLC media player"); setStatus("Stopped"); };
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
  const speed = (f) => { video.playbackRate = f === 0 ? 1 : Math.max(0.25, Math.min(4, video.playbackRate * f)); rate.textContent = video.playbackRate.toFixed(2) + "x"; };

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
  const info = (t, m) => ctx.dialogs.message(m, { title: t, icon: "info" });
  const about = () => ctx.dialogs.message("VLC media player 0.9.2\nGrishenko\n\n(c) 1996-2008 the VideoLAN team\n\nThis is a browser re-creation. Playback uses the formats your browser supports.", { title: "About VLC media player", icon: "vlc" });
  const recent = () => (st.recent?.length ? st.recent.map((r) => ({ label: r.title, action: () => add(r, true) })) : [{ label: "(empty)", disabled: true }]);
  const snapshot = () => {
    if (!video.videoWidth) return;
    const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    const a = el("a", { href: c.toDataURL("image/png"), download: "vlcsnap-" + Date.now() + ".png" }); a.click();
  };
  const savePlaylist = () => {
    const m3u = "#EXTM3U\n" + list.map((e) => `#EXTINF:-1,${e.title}\n${e.path || e.url || e.title}`).join("\n") + "\n";
    el("a", { href: URL.createObjectURL(new Blob([m3u], { type: "audio/x-mpegurl" })), download: "playlist.m3u" }).click();
  };
  const skip = (s) => { video.currentTime = Math.max(0, video.currentTime + s); };
  const menus = menuBar({
    Media: () => [
      { label: "Open File...", shortcut: "Ctrl+O", action: openFile },
      { label: "Open File from your computer...", action: openLocal },
      { label: "Open Directory...", shortcut: "Ctrl+F", action: () => info("Open Directory", "Directories can be added from the playlist with 'Add File...'.") },
      { label: "Open Disc...", shortcut: "Ctrl+D", action: () => info("VLC media player", "There is no disc in the drive.") },
      { label: "Open Network Stream...", shortcut: "Ctrl+N", action: openNetwork },
      { label: "Open Capture Device...", shortcut: "Ctrl+C", action: () => info("VLC media player", "No capture device was found.") },
      { label: "Open Recent Media", submenu: recent },
      { separator: true },
      { label: "Save Playlist to File...", shortcut: "Ctrl+Y", action: savePlaylist },
      { label: "Convert / Save...", shortcut: "Ctrl+R", action: () => info("Convert", "Conversion is not available in this browser version.") },
      { label: "Streaming...", shortcut: "Ctrl+S", action: () => info("Streaming", "Streaming is not available in this browser version.") },
      { separator: true },
      { label: "Quit", shortcut: "Ctrl+Q", action: () => w.close() },
    ],
    Playback: () => [
      { label: "Title", submenu: [{ label: "(none)", disabled: true }], disabled: !current },
      { label: "Chapter", submenu: [{ label: "(none)", disabled: true }], disabled: !current },
      { separator: true },
      { label: "Jump to Time", shortcut: "Ctrl+T", disabled: !current, action: jump },
      { label: "Skip Forward", submenu: [{ label: "10 seconds", action: () => skip(10) }, { label: "1 minute", action: () => skip(60) }, { label: "5 minutes", action: () => skip(300) }], disabled: !current },
      { label: "Skip Backward", submenu: [{ label: "10 seconds", action: () => skip(-10) }, { label: "1 minute", action: () => skip(-60) }, { label: "5 minutes", action: () => skip(-300) }], disabled: !current },
      { separator: true },
      { label: video.paused ? "Play" : "Pause", shortcut: "Space", action: togglePlay },
      { label: "Stop", shortcut: "S", disabled: !current, action: stop },
      { label: "Previous", shortcut: "P", action: prev },
      { label: "Next", shortcut: "N", action: next },
      { separator: true },
      { label: "Faster", shortcut: "+", action: () => speed(1.25) },
      { label: "Normal Speed", shortcut: "=", action: () => speed(0) },
      { label: "Slower", shortcut: "-", action: () => speed(0.8) },
      { separator: true },
      { label: "Repeat", checked: loop, action: () => { loop = !loop; } },
      { label: "Random", checked: random, action: () => { random = !random; } },
    ],
    Audio: () => [
      { label: "Increase Volume", shortcut: "Ctrl+Up", action: () => setVolume(st.volume + 10) },
      { label: "Decrease Volume", shortcut: "Ctrl+Down", action: () => setVolume(st.volume - 10) },
      { label: "Mute", shortcut: "M", checked: muted, action: () => { muted = !muted; applyVolume(); } },
      { separator: true },
      { label: "Audio Track", submenu: [{ label: "Track 1", checked: true }], disabled: !current },
      { label: "Audio Device", submenu: [{ label: "Default", checked: true }] },
      { label: "Stereo Mode", submenu: [{ label: "Stereo", checked: true }, { label: "Left" }, { label: "Right" }] },
      { label: "Visualizations", submenu: [{ label: "Disable", checked: true }, { label: "Spectrum" }, { label: "Scope" }] },
    ],
    Video: () => [
      { label: "Fullscreen", shortcut: "F", action: fullscreen },
      { label: "Always on Top", checked: false, action: () => {} },
      { separator: true },
      { label: "Video Track", submenu: [{ label: "Track 1", checked: true }], disabled: !current },
      { label: "Subtitles Track", submenu: [{ label: "Disable", checked: true }], disabled: !current },
      { separator: true },
      { label: "Aspect ratio", submenu: ["default", "1:1", "4:3", "16:9", "16:10", "2.21:1"].map((a) => ({ label: a === "default" ? "Default" : a, checked: aspect === a, action: () => setAspect(a) })) },
      { separator: true },
      { label: "Take Snapshot", shortcut: "Shift+S", disabled: !current, action: snapshot },
    ],
    Tools: () => [
      { label: "Effects and Filters", shortcut: "Ctrl+E", action: () => info("Adjustments and Effects", "The equalizer and video effects are not available in this browser version.") },
      { label: "Track Synchronization", action: () => info("Track Synchronization", "Track synchronization is not available in this browser version.") },
      { separator: true },
      { label: "Media Information", shortcut: "Ctrl+I", disabled: !current, action: () => info("Media Information", current ? `${current.title}\n\nDuration: ${fmtTime(video.duration)}\nResolution: ${video.videoWidth ? video.videoWidth + "x" + video.videoHeight : "audio only"}` : "Nothing is playing.") },
      { label: "Codec Information", shortcut: "Ctrl+J", disabled: !current, action: () => info("Codec Information", "Decoded by the browser's built-in media engine.") },
      { label: "VLM Configuration", shortcut: "Ctrl+Shift+W", action: () => info("VLM Configuration", "The VideoLAN Manager is not available in this browser version.") },
      { label: "Messages", shortcut: "Ctrl+M", action: () => info("Messages", "No messages.") },
      { separator: true },
      { label: "Preferences", shortcut: "Ctrl+P", action: () => info("Preferences", "The preferences dialog is not available in this browser version.") },
    ],
    View: () => [
      { label: "Playlist", shortcut: "Ctrl+L", action: showPlaylist },
      { label: "Advanced Controls", checked: false, action: () => info("VLC media player", "The advanced controls are not available in this browser version.") },
      { label: "Minimal Interface", shortcut: "Ctrl+H", action: () => info("VLC media player", "The minimal interface is not available in this browser version.") },
    ],
    Help: [
      { label: "Help", shortcut: "F1", action: () => info("VLC media player Help", "Use Media > Open File... or drag a file onto the window to start playback.") },
      { separator: true },
      { label: "Check for Updates...", action: () => info("VLC media player", "An internet connection is required to check for updates.") },
      { label: "About", shortcut: "Shift+F1", action: about },
    ],
  });
  const cb = (g, title, fn, cls = "") => { const b = el("button", { class: "vlc-btn " + cls, type: "button", title, "aria-label": title }, gi(g)); b.addEventListener("click", fn); return b; };
  const playBtn = cb("play", "Play", togglePlay, "vlc-play");
  const speaker = el("button", { class: "vlc-speaker", type: "button", title: "Mute", "aria-label": "Mute" });
  speaker.addEventListener("click", () => { muted = !muted; applyVolume(); });
  const slow = cb("slower", "Slower", () => speed(0.8), "vlc-sk"), fast = cb("faster", "Faster", () => speed(1.25), "vlc-sk");
  rate.addEventListener("click", () => speed(0));
  const controls = el("div", { class: "vlc-controls" }, playBtn,
    el("span", { class: "vlc-grp" }, cb("prev", "Previous", prev), cb("stop", "Stop", stop), cb("next", "Next", next)),
    el("span", { class: "vlc-grp g2" }, cb("video", "Fullscreen", fullscreen), cb("list", "Show playlist", showPlaylist), cb("eq", "Show extended settings", () => info("Adjustments and Effects", "The equalizer and video effects are not available in this browser version."))),
    el("span", { class: "vlc-sp" }), speaker, wedgeBox);
  const statusRow = el("div", { class: "vlc-statusrow" }, status, rate, timeTxt, el("span", { class: "vlc-grip" }));
  w.setContent(menus, screen, el("div", { class: "vlc-seekrow" }, slow, slider, fast), controls, statusRow);
  setStatus("");
  wedgeBox.addEventListener("pointerdown", (e) => {
    e.preventDefault(); wedgeBox.setPointerCapture(e.pointerId); wedgeBox.focus();
    const set = (ev) => { const r = wedgeBox.getBoundingClientRect(); setVolume(((ev.clientX - r.left) / r.width) * 200); };
    set(e); wedgeBox.onpointermove = set; wedgeBox.onpointerup = () => { wedgeBox.onpointermove = null; wedgeBox.onpointerup = null; };
  });
  wedgeBox.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setVolume(st.volume + 5); } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setVolume(st.volume - 5); } });
  video.addEventListener("loadedmetadata", () => { cone.style.display = video.videoWidth ? "none" : ""; });

  video.addEventListener("timeupdate", tick);
  video.addEventListener("loadedmetadata", tick);
  video.addEventListener("play", () => { playBtn.firstChild.replaceWith(gi("pause")); });
  video.addEventListener("pause", () => { playBtn.firstChild.replaceWith(gi("play")); });
  video.addEventListener("ended", () => { if (loop || idx < list.length - 1 || random) next(); else stop(); });
  video.addEventListener("error", () => { if (video.getAttribute("src")) { setStatus("Stopped"); err(`VLC is unable to open the MRL '${current?.url || current?.path || current?.title}'.\n\nThe format is not supported by this browser.`); } });
  video.addEventListener("click", togglePlay);
  video.addEventListener("dblclick", fullscreen);
  slider.addEventListener("input", () => { if (isFinite(video.duration)) video.currentTime = (slider.value / 1000) * video.duration; });
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
