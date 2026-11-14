import {
  el,
  button,
  icon,
  toolbar,
  statusBar,
  separator,
  field,
  checkbox,
  safely,
  popup,
} from "../ui/index.js";
import {
  normalizePath,
  basename,
  extension,
  downloadFile,
  pickFiles,
  DOCS,
} from "../core/index.js";
import { openChannelList } from "./channel-list.js";
import { sourceFor, siblingSubtitles, loadSubtitleFile, subtitleFromFile, SUB_RE, loadHls, isHls, parseM3U, fetchPlaylistText, isHlsManifest } from "./media-engine.js";
import { wmpOpen, wmpAbout, wmpStats, wmpProps, wmpOptions, wmpGoto, wmpError } from "./wmp-dialogs.js";
import { ieAddFavorite, ieOrganize } from "../internet/ie-dialogs.js";
import { RADIO_STATIONS, fetchDecadeStations } from "./radio-data.js";
export function encodeWav(channels, sampleRate) {
  const length = channels[0].length,
    count = channels.length,
    bytes = new ArrayBuffer(44 + length * count * 2),
    view = new DataView(bytes);
  const text = (p, s) =>
    [...s].forEach((c, i) => view.setUint8(p + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + length * count * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * count * 2, true);
  let offset = 44;
  for (let i = 0; i < length; i++)
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += 2;
    }
  return new Blob([bytes], { type: "audio/wav" });
}
export async function makeDemoAudio() {
  const rate = 22050,
    duration = 12,
    data = new Float32Array(rate * duration),
    notes = [
      261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66, 261.63, 329.63,
      392, 523.25, 587.33, 523.25, 392, 329.63,
    ];
  for (let i = 0; i < data.length; i++) {
    const t = i / rate,
      note = Math.floor(t / 0.75) % notes.length,
      local = t % 0.75,
      env = Math.min(1, local / 0.02) * Math.exp(-local * 3);
    data[i] =
      Math.sin(2 * Math.PI * notes[note] * t) * env * 0.19 +
      Math.sin(2 * Math.PI * 130.815 * t) *
        0.035 *
        Math.sin((Math.PI * t) / duration);
  }
  return encodeWav([data], rate);
}
const blobData = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
export async function openMediaPlayer(ctx, { path = null, cd = false } = {}) {
  const w = ctx.wm.create({
    title: cd ? "CD Player" : "Windows Media Player",
    icon: "media",
    width: cd ? 600 : 386,
    height: cd ? 455 : 530,
    appId: cd ? "cdplayer" : "mediaplayer",
  });
  let current = path,
    objectURL = null,
    playlist = [],
    index = -1,
    repeat = false,
    ac = null,
    analyser = null,
    panner = null,
    source = null,
    raf = 0,
    hls = null,
    directUrl = false,
    tracks = [],
    curSub = null,
    chList = null;
  const video = el("video", {
      class: "media-video",
      playsinline: true,
      "aria-label": "Media playback",
    }),
    visual = el("canvas", {
      class: "media-visual",
      width: 560,
      height: 245,
      "aria-label": "Audio visualization",
    }),
    subEl = el("div", { class: "wmp-sub" }),
    canvasCtx = visual.getContext("2d"),
    title = el("div", { class: "media-now-playing", text: "Windows Welcome" }),
    seek = el("input", {
      type: "range",
      min: 0,
      max: 1000,
      value: 0,
      "aria-label": "Playback position",
    }),
    time = el("span", { class: "media-time", text: "00:00 / 00:00" }),
    playButton = button("▶", () => toggle(), {
      title: "Play",
      "aria-label": "Play",
      class: "media-control",
    }),
    stopButton = button(
      "■",
      () => {
        video.pause();
        video.currentTime = 0;
      },
      { title: "Stop", "aria-label": "Stop", class: "media-control" },
    ),
    status = cd ? statusBar("Stopped") : el("div", { class: "wmp-status" }, el("span", { class: "wmp-st-text", text: "Stopped" }), el("span", { class: "wmp-st-time" }));
  const hist = { back: [], fwd: [] };
  let capEl = null, afterLoad = () => {}, curEntry, navigating = false;
  video.volume = ctx.settings.get("volume") / 100;
  video.muted = ctx.settings.get("muted");
  const format = (s) =>
    !Number.isFinite(s)
      ? "00:00"
      : String(Math.floor(s / 60)).padStart(2, "0") +
        ":" +
        String(Math.floor(s % 60)).padStart(2, "0");
  const showSub = () => { const t = curSub ? curSub.at(video.currentTime) : ""; if (subEl.textContent !== t) subEl.textContent = t; if (capEl && capEl.textContent !== t) capEl.textContent = t; };
  const addTrack = (t) => { tracks.push(t); curSub = t; showSub(); status.children[0].textContent = "Captions: " + t.name; };
  const entryUrl = (p) => (typeof p === "string" ? (/^https?:\/\//i.test(p) ? p : null) : p?.url || null);
  const entryTitle = (p) => (typeof p === "string" ? p.split("/").pop() : p?.title || p?.url || "");
  const load = async (p, autoplay = false) => {
    const url = entryUrl(p);
    if (!navigating && curEntry != null && curEntry !== p) { hist.back.push(curEntry); hist.fwd.length = 0; }
    curEntry = p;
    directUrl = false;
    video.removeAttribute("crossorigin");
    current = url ? null : p;
    tracks = []; curSub = null; subEl.textContent = "";
    if (hls) { hls.destroy(); hls = null; }
    if (objectURL) {
      URL.revokeObjectURL(objectURL);
      objectURL = null;
    }
    if (url) {
      title.textContent = entryTitle(p);
      video.hidden = false;
      visual.hidden = true;
      if (isHls(url) && !video.canPlayType("application/vnd.apple.mpegurl")) {
        try {
          status.children[0].textContent = "Buffering...";
          const Hls = await loadHls();
          if (!Hls.isSupported()) throw new Error("HLS is not supported");
          hls = new Hls({ lowLatencyMode: true });
          hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) status.children[0].textContent = "The stream could not be played (" + d.details + ")."; });
          hls.loadSource(url);
          hls.attachMedia(video);
        } catch { status.children[0].textContent = "The stream could not be played."; }
      } else { directUrl = true; if (ac) video.crossOrigin = "anonymous"; video.src = url; }
    } else if (p) {
      const node = ctx.fs.stat(p);
      try { const r = await sourceFor(ctx, { path: p }); video.src = r.url; if (r.blob) objectURL = r.url; } catch { video.src = node.content; }
      title.textContent = node.name;
      video.hidden = !(node.mime?.startsWith("video/") || /\.(mp4|webm|ogv|m4v|mov|mkv)$/i.test(node.name));
      visual.hidden = !video.hidden;
      for (const sp of siblingSubtitles(ctx, p)) { try { tracks.push(loadSubtitleFile(ctx, sp)); } catch { /* skip */ } }
      if (tracks.length) { curSub = tracks[0]; }
    } else {
      objectURL = URL.createObjectURL(await makeDemoAudio());
      video.src = objectURL;
      title.textContent = "Windows Welcome — a desktop melody";
      video.hidden = true;
      visual.hidden = false;
    }
    w.setTitle(
      title.textContent + " - " + (cd ? "CD Player" : "Windows Media Player"),
    );
    chList?.refresh();
    afterLoad();
    if (autoplay) await toggle(true);
  };
  const setupAudio = async () => {
    // a cross-origin stream played through Web Audio is silent: leave such streams on the plain element
    if (!ac && directUrl) return;
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      source = ac.createMediaElementSource(video);
      analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      if (ac.createStereoPanner) {
        panner = ac.createStereoPanner();
        panner.pan.value = ctx.settings.get("balance") || 0;
        analyser.connect(panner);
        panner.connect(ac.destination);
      } else analyser.connect(ac.destination);
    }
    await ac.resume();
  };
  const toggle = async (force = false) => {
    if (video.paused || force) {
      await setupAudio();
      await video.play().catch((e) => { if (e?.name !== "AbortError") status.children[0].textContent = "The media could not be played."; });
    } else video.pause();
  };
  const open = async () => {
    const p = await ctx.dialogs.file({
      filter: (n) =>
        n.mime?.startsWith("audio/") ||
        n.mime?.startsWith("video/") ||
        /\.(wav|mp3|ogg|mp4|webm|m4a)$/i.test(n.name),
    });
    if (p) {
      playlist.push(p);
      index = playlist.length - 1;
      await load(p, true);
    }
  };
  const importMedia = async () => {
    const files = await pickFiles({
      accept: "audio/*,video/*",
      multiple: true,
    });
    for (const file of files)
      playlist.push(await ctx.fs.importFile(file));
    if (files.length) {
      index = playlist.length - files.length;
      await load(playlist[index], true);
    }
  };
  video.addEventListener("play", () => {
    playButton.textContent = "Ⅱ";
    playButton.title = "Pause";
    playButton.setAttribute("aria-label", "Pause");
    status.children[0].textContent = "Playing";
  });
  video.addEventListener("pause", () => {
    playButton.textContent = "▶";
    playButton.title = "Play";
    playButton.setAttribute("aria-label", "Play");
    status.children[0].textContent = "Paused";
  });
  video.addEventListener("timeupdate", () => {
    showSub();
    seek.value = video.duration
      ? String((video.currentTime / video.duration) * 1000)
      : "0";
    time.textContent =
      format(video.currentTime) + " / " + format(video.duration);
  });
  seek.addEventListener("input", () => {
    if (Number.isFinite(video.duration))
      video.currentTime = (+seek.value / 1000) * video.duration;
  });
  video.addEventListener(
    "ended",
    safely(async () => {
      if (index < playlist.length - 1) await load(playlist[++index], true);
      else if (repeat) {
        video.currentTime = 0;
        await video.play();
      } else status.children[0].textContent = "Stopped";
    }),
  );
  video.addEventListener("error", () => {
    status.children[0].textContent =
      "This media format could not be played by your browser.";
    if (video.getAttribute("src") || hls) wmpError(ctx, { message: "The file or stream cannot be played.", details: "Clip: " + title.textContent + "\nThe format or the address is not supported by this player, or the server is not reachable." });
  });
  const addSubFile = async () => {
    const p = await ctx.dialogs.file({ title: "Open Captions File", filter: (n) => SUB_RE.test(n.name) });
    if (!p) return;
    try { addTrack(loadSubtitleFile(ctx, p)); } catch (e) { ctx.dialogs.message(e.message || String(e), { title: "Windows Media Player", icon: "error" }); }
  };
  const addSubLocal = async () => {
    const [f] = await pickFiles({ accept: ".srt,.vtt,.sub" }); if (!f) return;
    try { addTrack(await subtitleFromFile(f)); } catch (e) { ctx.dialogs.message(e.message || String(e), { title: "Windows Media Player", icon: "error" }); }
  };
  const capMenu = () => [
    { label: "Off", checked: !curSub, action: () => { curSub = null; showSub(); } },
    ...tracks.map((t) => ({ label: t.name, checked: curSub === t, action: () => { curSub = t; showSub(); } })),
    separator(), { label: "Add Captions File...", action: addSubFile }, { label: "Add Captions from your computer...", action: addSubLocal },
  ];
  const showChannels = () => {
    if (chList && !chList.win.closed) { chList.win.focus(); chList.refresh(); return; }
    chList = openChannelList(ctx, { stop: () => { video.pause(); video.currentTime = 0; }, mute: () => A.mute.run(), getList: () => playlist.map((e) => (typeof e === "string" ? { title: entryTitle(e), group: "" } : e)), getIndex: () => index, play: async (i) => { index = i; await load(playlist[i], true); }, loadUrl: loadListUrl, openFile: openListFile, onClose: () => { chList = null; } });
  };
  const addEntries = async (items) => {
    const first = playlist.length;
    items.forEach((e) => playlist.push(e.url ? e : e.path));
    showChannels(); chList?.refresh();
    if (video.paused && !video.currentTime) { index = first; await load(playlist[first], true); }
  };
  const loadListText = async (text, base, label) => {
    const items = parseM3U(text, base, (q) => ctx.fs.exists(q));
    if (!items.length) return ctx.dialogs.message(`The playlist '${label}' does not contain any playable items.`, { title: "Windows Media Player", icon: "error" });
    await addEntries(items);
  };
  const loadListUrl = async (v) => {
    try { await loadListText(await fetchPlaylistText(v), "", v); }
    catch (e) { ctx.dialogs.message(`The channel list '${v}' could not be read.\n\n${e?.message || e}\n\nThe server may not allow access from a web page; download the list and use File > Open instead.`, { title: "Windows Media Player", icon: "error" }); }
  };
  const openListFile = async () => {
    const p = await ctx.dialogs.file({ title: "Open Playlist", filter: (n) => /\.(m3u8?|pls)$/i.test(n.name) });
    if (p) await openList(p);
  };
  const openList = async (p) => loadListText(ctx.fs.readFile(p), normalizePath(p).replace(/\/[^/]*$/, ""), p);
  // an address or path typed into File > Open: media file, stream, playlist or channel list
  const openAny = async (v) => {
    if (/^https?:\/\//i.test(v) && (isHls(v) || /\.pls(\?|#|$)/i.test(v))) {
      try { const t = await fetchPlaylistText(v); if (!isHlsManifest(t)) return loadListText(t, "", v); } catch { /* try as a stream */ }
    }
    if (/^https?:\/\//i.test(v)) { playlist.push({ url: v, title: v, live: true }); index = playlist.length - 1; return load(playlist[index], true); }
    if (!ctx.fs.exists(v)) return ctx.dialogs.message(`Windows Media Player cannot find '${v}'.`, { title: "Windows Media Player", icon: "error" });
    if (/\.(m3u8?|pls)$/i.test(v)) return openList(v);
    playlist.push(v); index = playlist.length - 1; await load(v, true);
  };
  const bars = new Uint8Array(128);
  // ---- visualizations (View > Visualizations, or click the picture): real FFT data when the audio is routed through Web Audio,
  // an animated stand-in for cross-origin radio streams, which the browser will not let us analyse ----
  const VIS = [["bars", "Spectrum Analyzer"], ["scope", "Oscilloscope"], ["ambience", "Ambience"], ["particles", "Particles"]];
  let vis = ctx.settings.get("wmpVis") || "bars";
  const setVis = (v) => { vis = v; ctx.settings.set("wmpVis", v); };
  const wave = new Uint8Array(128);
  const fake = (t, i) => { const e = 0.55 + 0.35 * Math.sin(t * 2.1 + i * 0.35) * Math.sin(t * 0.7 + i * 0.1); return Math.max(0, 255 * e * (1 - i / 140) * (0.75 + 0.25 * Math.sin(t * 6 + i))); };
  const parts = Array.from({ length: 70 }, () => ({ a: Math.random() * 6.28, r: Math.random(), s: 0.2 + Math.random() * 0.8 }));
  let lvl = 0;
  const draw = () => {
    if (w.closed) return;
    const c = canvasCtx, W = 560, H = 245, t = performance.now() / 1000, playing = !video.paused;
    let real = false;
    if (analyser && playing) { analyser.getByteFrequencyData(bars); analyser.getByteTimeDomainData(wave); real = bars.some((x) => x > 0); }
    if (!real) for (let i = 0; i < 128; i++) { bars[i] = playing ? fake(t, i) : 0; wave[i] = 128 + (playing ? Math.sin(t * 9 + i * 0.3) * 40 * Math.sin(t * 1.3 + i * 0.05) + Math.sin(t * 17 + i * 0.9) * 18 : 0); }
    let sum = 0; for (let i = 0; i < 32; i++) sum += bars[i]; lvl += (sum / 32 / 255 - lvl) * 0.25;
    if (vis === "bars") {
      c.fillStyle = "#081008"; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 56; i++) {
        const h = (bars[i * 2] || 0) * 0.72, x = i * 9 + 25;
        for (let y = 0; y < h; y += 7) { c.fillStyle = y > 150 ? "#d5ce30" : y > 80 ? "#49b924" : "#07840a"; c.fillRect(x, 215 - y, 6, 5); }
      }
    } else if (vis === "scope") {
      c.fillStyle = "rgba(0,12,0,.35)"; c.fillRect(0, 0, W, H);
      c.strokeStyle = "#0a3a0a"; c.lineWidth = 1; c.beginPath();
      for (let x = 0; x <= W; x += 40) { c.moveTo(x, 0); c.lineTo(x, H); }
      for (let y = 0; y <= H; y += 40) { c.moveTo(0, y); c.lineTo(W, y); }
      c.stroke();
      c.strokeStyle = "#39ff39"; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i < 128; i++) { const x = (i / 127) * W, y = H / 2 + (wave[i] - 128) * 0.9; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    } else if (vis === "ambience") {
      c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(0, 0, W, H);
      for (let k = 0; k < 6; k++) {
        const x = W / 2 + Math.cos(t * (0.4 + k * 0.13) + k) * (150 + lvl * 90), y = H / 2 + Math.sin(t * (0.5 + k * 0.11) + k * 2) * (60 + lvl * 50), r = 30 + lvl * 90 + (bars[k * 6] || 0) * 0.25;
        const g = c.createRadialGradient(x, y, 0, x, y, r); const hue = (t * 40 + k * 60) % 360;
        g.addColorStop(0, `hsla(${hue},90%,60%,.55)`); g.addColorStop(1, `hsla(${hue},90%,50%,0)`);
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.29); c.fill();
      }
    } else {
      c.fillStyle = "rgba(0,0,10,.3)"; c.fillRect(0, 0, W, H);
      for (const p of parts) {
        p.r += p.s * (playing ? 0.006 + lvl * 0.03 : 0.0008); if (p.r > 1) { p.r = 0.02; p.a = Math.random() * 6.28; }
        const x = W / 2 + Math.cos(p.a) * p.r * W * 0.6, y = H / 2 + Math.sin(p.a) * p.r * H * 0.9, z = 1 + p.r * 3;
        c.fillStyle = `hsl(${(p.a * 57 + t * 30) % 360},90%,${55 + p.r * 30}%)`; c.fillRect(x, y, z, z);
      }
    }
    c.fillStyle = "#263e24"; c.font = "11px Tahoma"; c.textAlign = "center";
    if (vis === "bars") c.fillText(playing ? "SPECTRUM ANALYZER" : "WINDOWS MEDIA PLAYER", 280, 235);
    raf = requestAnimationFrame(draw);
  };
  visual.addEventListener("click", () => setVis(VIS[(VIS.findIndex(([k]) => k === vis) + 1) % VIS.length][0]));
  const volume = el("input", {
    type: "range",
    min: 0,
    max: 100,
    value: ctx.settings.get("volume"),
    "aria-label": "Volume",
    oninput: (e) => ctx.settings.set("volume", Number(e.target.value)),
  });
  const applyVolume = () => {
    const master = ctx.settings.get("volume") ?? 65;
    const wave = ctx.settings.get("waveVolume") ?? 100;
    video.volume = Math.max(0, Math.min(1, (master * wave) / 10000));
    video.muted = !!ctx.settings.get("muted");
    volume.value = master;
    if (panner) panner.pan.value = ctx.settings.get("balance") || 0;
  };
  applyVolume();
  w.addCleanup(ctx.bus.on("settings:change", applyVolume));
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const MODES = {
    standard: { nav: true, controls: true, display: true, captions: false, goto: true, status: true },
    compact: { nav: false, controls: true, display: false, captions: false, goto: false, status: true },
    minimal: { nav: false, controls: true, display: false, captions: false, goto: false, status: false },
  };
  let onTop = false, mute = false, viewMode = ctx.settings.get("wmpMode") || "standard";
  let panels = { ...MODES[viewMode], ...(ctx.settings.get("wmpPanels") || {}) };
  let layoutHook = null;
  const setView = (m, p) => layoutHook?.(m, p || MODES[m]);
  const togglePanel = (k) => layoutHook?.(viewMode, { ...panels, [k]: !panels[k] });
  // ---- menus, context menu and accelerators come from the msdxm.ocx resources (assets/wmp/menus2.json) ----
  const favorites = () => ctx.settings.get("favorites") || [];
  const mediaFavs = () => favorites().filter((f) => f.media);
  const favFolders = () => [...new Set(["Media", ...(ctx.settings.get("favFolders") || []), ...favorites().map((f) => f.folder).filter(Boolean)])];
  const organize = () => ieOrganize(ctx, { get: favorites, set: (v) => ctx.settings.set("favorites", v), folders: favFolders, setFolders: (v) => ctx.settings.set("favFolders", v), open: (u) => { const f = favorites().find((x) => x.url === u); if (f?.media) playFav(f); } });
  const playFav = async (f) => { const it = f.media; if (it === "@welcome") return ctx.launch("mediaplayer"); playlist.push(it); index = playlist.length - 1; await load(it, true); };
  let zoom = 100;
  const setZoom = (z) => { zoom = z; video.style.transform = z === 100 ? "" : `scale(${z / 100})`; };
  const saveAs = () => {
    if (!current || !ctx.fs.exists(current)) return;
    const n = ctx.fs.stat(current);
    const a = el("a", { href: n.content, download: n.name }); a.click();
  };
  const goTo = () => wmpGoto(ctx, playlist.length ? playlist.map(entryTitle) : [title.textContent], Math.max(index, 0), async (i) => { if (!playlist.length) return toggle(true); index = i; await load(playlist[i], true); });
  const addFavorite = () => {
    const it = playlist[index] ?? current ?? "@welcome";
    const loc = entryUrl(it) || (typeof it === "string" ? it : it.path || it.url || title.textContent);
    ieAddFavorite(ctx, { name: title.textContent, folders: favFolders(), onOk: (name, folder) => ctx.settings.set("favorites", [...favorites(), { title: name, url: String(loc), media: typeof it === "string" ? it : (entryUrl(it) || loc), folder: folder || "Media" }]) });
  };
  const props = () => {
    const n = current && ctx.fs.exists(current) ? ctx.fs.stat(current) : null;
    wmpProps(ctx, { name: n?.name || title.textContent, type: n?.mime || "Wave Sound", size: n?.size ? n.size + " bytes" : "", length: format(video.duration), videoSize: video.videoWidth ? video.videoWidth + " x " + video.videoHeight : "" });
  };
  const closeClip = () => { video.pause(); video.removeAttribute("src"); video.load(); current = null; tracks = []; curSub = null; subEl.textContent = ""; };
  const volStep = (d) => ctx.settings.set("volume", Math.max(0, Math.min(100, (ctx.settings.get("volume") ?? 65) + d)));
  const openDlg = () => wmpOpen(ctx, (v) => openAny(v), async (dlg) => { dlg.close(); await importMedia(); });
  const M = { guide: "http://www.windowsmedia.com/", music: "http://www.windowsmedia.com/music/" };
  const histGo = async (from, to) => {
    const e = from.pop();
    if (e == null) return;
    if (curEntry != null) to.push(curEntry);
    const i = playlist.indexOf(e); if (i >= 0) index = i;
    navigating = true;
    try { await load(e, true); } finally { navigating = false; }
  };
  const A = {
    open: { run: openDlg }, close: { run: closeClip, off: () => !current && !entryUrl(playlist[index]) }, saveas: { run: saveAs, off: () => !current || !ctx.fs.exists(current) }, exit: { run: () => w.close() },
    props: { run: props }, stats: { run: () => wmpStats(ctx, video) }, options: { run: () => wmpOptions(ctx, { onTop }, (st) => (onTop = !!st.onTop)) },
    std: { run: () => setView("standard"), chk: () => viewMode === "standard" }, compact: { run: () => setView("compact"), chk: () => viewMode === "compact" }, min: { run: () => setView("minimal"), chk: () => viewMode === "minimal" },
    full: { run: () => w.maximize() }, z50: { run: () => setZoom(50), chk: () => zoom === 50 }, z100: { run: () => setZoom(100), chk: () => zoom === 100 }, z200: { run: () => setZoom(200), chk: () => zoom === 200 },
    top: { run: () => (onTop = !onTop), chk: () => onTop },
    play: { run: () => toggle() }, stop: { run: () => { video.pause(); video.currentTime = 0; } },
    skipback: { run: () => { if (index > 0) load(playlist[--index], true); else video.currentTime = 0; } }, skipfwd: { run: () => { if (index < playlist.length - 1) load(playlist[++index], true); } },
    rewind: { run: () => (video.currentTime = Math.max(0, video.currentTime - 5)) }, ff: { run: () => (video.currentTime = Math.min(video.duration || 0, video.currentTime + 5)) },
    goto: { run: goTo },
    volup: { run: () => volStep(10) }, voldown: { run: () => volStep(-10) }, mute: { run: () => ctx.settings.set("muted", !ctx.settings.get("muted")), chk: () => !!ctx.settings.get("muted") },
    radio: { run: () => showRadio() }, help: { run: () => ctx.launch("help", { topic: "media" }) }, about: { run: () => wmpAbout(ctx) },
    upgrade: { run: () => ctx.dialogs.message("You already have the most recent version of Windows Media Player installed.", { title: "Windows Media Player", icon: "info" }) },
    errdetails: { run: () => wmpError(ctx, { message: status.children[0].textContent, details: `Clip: ${title.textContent}\nLocation: ${entryUrl(playlist[index]) || current || "(none)"}` }) },
    back: { run: () => histGo(hist.back, hist.fwd), off: () => !hist.back.length },
    fwd: { run: () => histGo(hist.fwd, hist.back), off: () => !hist.fwd.length },
    guide: { run: () => importMedia() }, music: { run: () => importMedia() }, home: { run: () => ctx.launch("ie", { url: "http://www.windowsmedia.com/" }) },
    tv: { run: () => showChannels() },
  };
  const BY_ID = { 3009: "open", 3022: "close", 3010: "saveas", 1010: "saveas", 3008: "exit", 3036: "props", 1009: "props", 3061: "stats", 3209: "stats", 3031: "options", 1007: "options", 3044: "std", 3045: "compact", 3046: "min", 3042: "full", 3203: "full", 3039: "z50", 3200: "z50", 3040: "z100", 3201: "z100", 3041: "z200", 3202: "z200", 3032: "top", 3047: "play", 3204: "play", 3048: "stop", 1002: "stop", 3049: "skipback", 3205: "skipback", 3050: "skipfwd", 3206: "skipfwd", 3051: "rewind", 1004: "rewind", 3052: "ff", 1003: "ff", 3054: "goto", 3208: "goto", 3055: "volup", 3213: "volup", 3056: "voldown", 3214: "voldown", 3057: "mute", 3215: "mute", 129: "radio", 127: "guide", 128: "music", 150: "home", 3062: "help", 3035: "about", 1008: "about", 3064: "upgrade", 3216: "errdetails", 125: "back", 126: "fwd" };
  const handle = (id, it, ctxMenu) => {
    if (it.label.replace("&", "") === "Captions") return { submenu: capMenu };
    const a = A[ctxMenu && id === 3003 ? "help" : BY_ID[id]];
    if (!a) return undefined;
    return { action: a.run, disabled: a.off?.(), checked: a.chk ? a.chk() : undefined };
  };
  const build = (items, ctxMenu) => {
    const out = [];
    for (const it of items) {
      if (it.sep) { if (out.length && !out.at(-1).separator) out.push(separator()); continue; }
      if (it.id === 127) continue;
      if (it.id === 128) { out.push({ label: "Music and Video...", action: () => importMedia() }); continue; }
      if (it.sub && it.label === "Settings") { out.push({ label: "Settings", submenu: [["nav", "Navigation panel"], ["controls", "Controls panel"], ["display", "Display panel"], ["captions", "Captions panel"], ["goto", "Go To panel"], ["status", "Status panel"]].map(([k, l]) => ({ label: l, checked: !!panels[k], action: () => togglePanel(k) })) }); continue; }
      if (it.sub) { const sub = build(it.sub, ctxMenu); out.push(sub.some((s) => s.label && !s.disabled) ? { label: it.label, submenu: sub } : { label: it.label, disabled: true }); continue; }
      const r = handle(it.id, it, ctxMenu);
      if (r?.submenu) { out.push({ label: it.label, submenu: r.submenu }); continue; }
      out.push({ label: it.label, shortcut: it.shortcut, ...(r?.action ? { action: r.action } : { disabled: true }), ...(r?.disabled ? { disabled: true } : {}), ...(r?.checked != null ? { checked: r.checked } : {}) });
    }
    while (out.length && out.at(-1).separator) out.pop();
    return out;
  };
  // ---- Radio (Go > Radio, Ctrl+F): preset stations plus your own .m3u address ----
  let radio = null, radioIdx = -1, radioLoaded = false;
  const stations = RADIO_STATIONS.map((x) => ({ ...x }));
  const showRadio = () => {
    if (radio && !radio.win.closed) { radio.win.focus(); return; }
    radio = openChannelList(ctx, {
      title: "Radio Tuner", stop: () => { video.pause(); video.currentTime = 0; }, mute: () => A.mute.run(), getList: () => stations, getIndex: () => radioIdx,
      play: async (i) => { radioIdx = i; await load(stations[i], true); radio?.refresh(); },
      loadUrl: async (v) => { try { const items = parseM3U(await fetchPlaylistText(v), "", () => false); items.forEach((e) => stations.push({ ...e, group: e.group || "Benim İstasyonlarım", live: true })); radio?.refresh(); } catch (e) { ctx.dialogs.message(`The station list '${v}' could not be read.\n\n${e?.message || e}`, { title: "Windows Media Player", icon: "error" }); } },
      onClose: () => { radio = null; },
    });
    if (!radioLoaded) { radioLoaded = true; fetchDecadeStations().then((l) => { if (!l.length) { radioLoaded = false; return; } const mine = stations.filter((x) => x.group === "Benim İstasyonlarım"); stations.splice(0, stations.length, ...l, ...mine); radio?.refresh(); }); }
  };
  w.addCleanup(() => { if (radio && !radio.win.closed) radio.win.close(); });
  const strip = (items) => items.map((i) => ({ ...i, label: i.label?.replace(/&/g, ""), ...(i.sub ? { sub: strip(i.sub) } : {}) }));
  const menuTree = Object.fromEntries(Object.entries(await (await fetch("/assets/wmp/menus2.json")).json()).map(([k, v]) => [k, strip(v)]));
  const mainMenu = {};
  for (const top of menuTree["9102"]) mainMenu[top.label] = () => build(top.sub, false);
  mainMenu["Favorites"] = () => {
    const fo = favFolders().map((n) => ({ label: n, submenu: mediaFavs().filter((f) => (f.folder || "Media") === n).map((f) => ({ label: f.title, action: () => playFav(f) })) })).filter((m) => m.submenu.length);
    return [{ label: "Add to Favorites...", action: addFavorite }, { label: "Organize Favorites...", action: organize }, separator(), ...(fo.length ? fo : [{ label: "(Empty)", disabled: true }])];
  };
  { const base = mainMenu["View"]; mainMenu["View"] = () => { const m = base ? base() : []; const i = m.findIndex((x) => x.label === "Captions"); const sub = { label: "Visualizations", submenu: VIS.map(([k, l]) => ({ label: l, checked: vis === k, action: () => setVis(k) })) }; m.splice(i < 0 ? m.length : i, 0, sub); return m; }; }
  mainMenu["Go"] = () => { const m = build(menuTree["9102"].find((t) => t.label === "Go").sub, false); const r = m.findIndex((x) => x.label === "Radio"); m.splice(r + 1, 0, { label: "TV Channels...", action: () => showChannels() }); return m; };
  w.setMenu(mainMenu);
  w.el.addEventListener("contextmenu", (e) => {
    if (!e.target.closest(".wmp-screen")) return;
    e.preventDefault();
    popup(build(menuTree["102"], true), e.clientX, e.clientY, {});
  });
  // accelerator tables 113 / 2700 of msdxm.ocx: [virtual key, modifiers (1 ctrl, 2 alt, 4 shift), command id]
  const ACCEL = [[49,1,3044],[50,1,3045],[51,1,3046],[79,1,3009],[83,1,3010],[84,1,3032],[36,1,127],[85,1,128],[70,1,129],[37,2,125],[39,2,126],[190,0,1002],[77,1,3215],[77,0,3215],[37,1,1004],[39,1,1003],[49,2,3200],[50,2,3201],[51,2,3202],[38,0,3213],[40,0,3214],[13,2,3203],[34,0,3206],[33,0,3205],[71,1,3208]];
  w.el.addEventListener("keydown", (e) => {
    if (e.target.matches?.("input, textarea, select")) return;
    const mod = (e.ctrlKey ? 1 : 0) | (e.altKey ? 2 : 0) | (e.shiftKey ? 4 : 0);
    const hit = ACCEL.find(([k, m]) => k === e.keyCode && m === mod);
    const a = hit && A[BY_ID[hit[2]]];
    if (a && !a.off?.()) { e.preventDefault(); a.run(); }
  });
  if (cd)
    w.setMenu({
      Disc: [off("Edit Play List..."), separator(), { label: "Exit", action: () => w.close() }],
      View: [
        off("Toolbar", { checked: true }),
        off("Disc/Track Info", { checked: true }),
        off("Status Bar", { checked: true }),
        separator(),
        off("Track Time Elapsed", { checked: true }),
        off("Track Time Remaining"),
        off("Disc Time Remaining"),
        separator(),
        { label: "Volume Control", action: () => ctx.launch("volume") },
      ],
      Options: [
        { label: "Random Order", checked: false, action: () => {} },
        { label: "Continuous Play", checked: repeat, action: () => (repeat = !repeat) },
        off("Intro Play"),
        separator(),
        off("Preferences..."),
      ],
      Help: [
        { label: "Help Topics", action: () => ctx.launch("help", { topic: "cdplayer" }) },
        separator(),
        { label: "About CD Player", action: () => ctx.dialogs.message("CD Player\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1990-1999 Microsoft Corp.", { title: "About CD Player", icon: "media" }) },
      ],
    });
  if (cd) {
  w.setContent(
      title,
      el("div", { class: "media-display" }, video, visual),
      el(
        "div",
        { class: "media-transport" },
        seek,
        el(
          "div",
          { class: "media-buttons" },
          playButton,
          stopButton,
          button(
            "◀|",
            () => {
              if (index > 0) load(playlist[--index], true);
              else video.currentTime = 0;
            },
            { class: "media-control", title: "Previous" },
          ),
          button(
            "|▶",
            () => {
              if (index < playlist.length - 1) load(playlist[++index], true);
            },
            { class: "media-control", title: "Next" },
          ),
          time,
          icon("speaker"),
          volume,
        ),
      ),
      status,
    );
    } else {
  // ---- Windows Media Player 6.4 layout: menu, navigation bar, screen, seek bar, controls, Go To bar, display, captions, status ----
  const used = (p, m) => (p.nav ? 24 : 0) + (p.controls ? 26 + (m === "minimal" ? 0 : 19) : 0) + (p.goto ? 29 : 0) + (p.display ? 74 : 0) + (p.captions ? 40 : 0) + (p.status ? 23 : 0);
  const sprite = (url, x, y) => ({ backgroundImage: `url(${url})`, backgroundPosition: `-${x}px -${y}px` });
  const wbs = [];
  const wb = (i, titleText, fn) => {
    const b = el("button", { class: "wmp-btn", type: "button", title: titleText, "aria-label": titleText, onclick: fn });
    b.dataset.i = i;
    Object.assign(b.style, sprite("assets/wmp/bmp5208.png", i * 20, 0));
    wbs.push(b);
    return b;
  };
  const wmpPlay = wb(0, "Play", () => toggle(true));
  const wmpPause = wb(1, "Pause", () => video.pause());
  const logo = el("img", { class: "wmp-logo", src: "assets/wmp/bmp140.png", alt: "" });
  const skipBack = () => (index > 0 ? load(playlist[--index], true) : (video.currentTime = 0));
  const skipFwd = () => index < playlist.length - 1 && load(playlist[++index], true);
  const sync = () => {
    const idle = video.paused && !video.currentTime;
    logo.hidden = !idle;
    const off = { 1: video.paused, 2: idle, 3: false, 4: idle, 5: idle, 6: playlist.length < 2, 7: true };
    for (const b of wbs) {
      const i = +b.dataset.i, dis = !!off[i];
      b.disabled = dis;
      b.style.backgroundImage = `url(assets/wmp/bmp${dis ? 5209 : 5208}.png)`;
    }
    visual.style.visibility = idle ? "hidden" : "visible";
  };
  video.addEventListener("play", sync);
  video.addEventListener("pause", sync);
  // navigation bar: Back / Forward (bmp116 cells 24x22: rows grey, outline, colour, hot) and the Radio / TV / Music / Media Guide links
  const navCell = (img) => el("span", { class: "wmp-ni", style: { backgroundImage: `url(${img})` } });
  const navButtons = [];
  const navBtn = (img, col, label, fn, { text, tip, off } = {}) => {
    const b = el("button", { class: "wmp-nav-btn" + (text ? " wmp-link" : ""), type: "button", title: tip || label, "aria-label": label, onclick: fn }, navCell(img), text ? el("span", { text }) : null);
    b.style.setProperty("--c", col);
    b.off = off;
    navButtons.push(b);
    return b;
  };
  const navSync = () => {
    for (const b of navButtons) {
      const dis = !!b.off?.();
      b.disabled = dis;
    }
  };
  const nav = el("div", { class: "wmp-nav" },
    navBtn("assets/wmp/bmp116.png", 0, "Back", () => A.back.run(), { off: A.back.off }),
    navBtn("assets/wmp/bmp116.png", 1, "Forward", () => A.fwd.run(), { off: A.fwd.off }),
    el("span", { class: "wmp-flex" }),
    navBtn("assets/wmp/bmp116.png", 4, "Radio", () => A.radio.run(), { text: "Radio", tip: "Radio Tuner (Ctrl+F)" }),
    navBtn("assets/wmp/tv.png", 0, "TV", () => A.tv.run(), { text: "TV", tip: "TV Channels" }),
    navBtn("assets/wmp/bmp116.png", 3, "Music and Video", () => A.music.run(), { text: "Music and Video", tip: "Add music or video files from your computer and play them" }),
  );
  // seek bars: one above the controls, one inside them in the Minimal view
  const seek2 = el("input", { type: "range", min: 0, max: 1000, value: 0, "aria-label": "Playback position", class: "wmp-seek" });
  seek.className = "wmp-seek";
  seek2.addEventListener("input", () => { seek.value = seek2.value; seek.dispatchEvent(new Event("input")); });
  video.addEventListener("timeupdate", () => (seek2.value = seek.value));
  const seekRow = el("div", { class: "wmp-seekrow" }, seek);
  // volume: speaker (mute) + triangle
  const vol = el("div", { class: "wmp-vol" });
  const volImg = el("button", { class: "wmp-vol-icon", type: "button", title: "Mute", "aria-label": "Mute" });
  Object.assign(volImg.style, sprite("assets/wmp/bmp5212.png", 0, 0));
  volImg.onclick = () => ctx.settings.set("muted", !ctx.settings.get("muted"));
  const tri = el("div", { class: "wmp-tri" }), knob = el("div", { class: "wmp-knob" });
  tri.append(knob);
  const setVol = (e) => {
    const r = tri.getBoundingClientRect();
    ctx.settings.set("volume", Math.max(0, Math.min(100, Math.round(((e.clientX - r.left - 4) / 31) * 100))));
  };
  tri.addEventListener("pointerdown", (e) => {
    tri.setPointerCapture(e.pointerId);
    setVol(e);
    tri.onpointermove = setVol;
  });
  tri.addEventListener("pointerup", () => (tri.onpointermove = null));
  const syncKnob = () => (knob.style.left = 2 + ((ctx.settings.get("volume") ?? 65) / 100) * 31 + "px");
  w.addCleanup(ctx.bus.on("settings:change", syncKnob));
  syncKnob();
  vol.append(volImg, tri);
  const syncMute = () => (volImg.style.backgroundPosition = ctx.settings.get("muted") ? "-20px 0" : "0 0");
  w.addCleanup(ctx.bus.on("settings:change", syncMute));
  syncMute();
  const ccBtn = el("button", { class: "wmp-btn wmp-cc", type: "button", title: "Captions", "aria-label": "Captions", text: "CC", onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); popup(capMenu(), r.left, r.top - 4, {}); } });
  const controls = el("div", { class: "wmp-controls" },
    wmpPlay, wmpPause,
    wb(2, "Stop", () => { video.pause(); video.currentTime = 0; sync(); }),
    el("i", { class: "wmp-sep" }),
    wb(3, "Skip Back", skipBack), wb(4, "Rewind", () => (video.currentTime = Math.max(0, video.currentTime - 5))), wb(5, "Fast Forward", () => (video.currentTime = Math.min(video.duration || 0, video.currentTime + 5))), wb(6, "Skip Forward", skipFwd),
    el("i", { class: "wmp-sep" }),
    wb(7, "Preview", () => {}),
    el("i", { class: "wmp-sep" }),
    el("span", { class: "wmp-seek2" }, seek2),
    el("span", { class: "wmp-flex" }),
    ccBtn,
    vol,
  );
  // Go To bar: the clips of the play list / channel list
  const gotoSel = el("select", { "aria-label": "Go To", class: "wmp-goto-sel" });
  gotoSel.addEventListener("change", async () => { const i = gotoSel.selectedIndex; if (playlist.length && i >= 0) { index = i; await load(playlist[i], true); } });
  const gotoBar = el("div", { class: "wmp-goto" }, gotoSel);
  // display (Show / Clip / Author / Copyright) and captions panels: white on black
  const showEl = el("span", { class: "wmp-d-v" }), authorEl = el("span", { class: "wmp-d-v" }), copyEl = el("span", { class: "wmp-d-v" });
  title.className = "wmp-d-v";
  const drow = (k, v, cls = "") => el("div", { class: "wmp-d-row " + cls }, el("span", { class: "wmp-d-k", text: k }), v);
  const display = el("div", { class: "wmp-display" }, drow("Show:", showEl, "first"), el("div", { class: "wmp-d-rule" }), drow("Clip:", title), drow("Author:", authorEl), drow("Copyright:", copyEl));
  capEl = el("div", { class: "wmp-captions", "aria-label": "Captions" });
  const syncInfo = () => {
    const e = playlist[index];
    showEl.textContent = (e && typeof e === "object" && e.group) || (current ? basename(current).replace(/\.[^.]*$/, "") : title.textContent.split(" — ")[0]);
    gotoSel.replaceChildren(...(playlist.length ? playlist.map((p, i) => el("option", { value: i, text: entryTitle(p), selected: i === index })) : [el("option", { text: title.textContent })]));
    gotoSel.disabled = !playlist.length;
    navSync();
  };
  afterLoad = syncInfo;
  const root = el("div", { class: "wmp-root mp", "data-view": viewMode },
    nav,
    el("div", { class: "wmp-screen" }, video, visual, logo, subEl),
    seekRow, controls, gotoBar, display, capEl, status,
  );
  const panelEls = { nav, controls, goto: gotoBar, display, captions: capEl, status };
  const apply = () => {
    root.dataset.view = viewMode;
    root.dataset.cap = panels.captions ? "on" : "";
    for (const [k, e] of Object.entries(panelEls)) e.hidden = !panels[k];
    seekRow.hidden = !panels.controls || viewMode === "minimal";
  };
  layoutHook = (m, p) => {
    const before = used(panels, viewMode);
    viewMode = m; panels = { ...p };
    ctx.settings.set("wmpMode", m); ctx.settings.set("wmpPanels", panels);
    apply();
    if (!w.el.classList.contains("maximized")) w.el.style.height = Math.max(120, w.el.offsetHeight + used(panels, m) - before) + "px";
  };
  w.setContent(root);
  video.addEventListener("timeupdate", () => { status.children[1].textContent = time.textContent; });
  apply(); sync(); syncInfo();
  // start in the remembered view: the window was created for the Standard layout
  if (used(panels, viewMode) !== used(MODES.standard, "standard")) w.el.style.height = Math.max(120, 470 + used(panels, viewMode) - used(MODES.standard, "standard")) + "px";
  }
  w.addCleanup(() => {
    cancelAnimationFrame(raf);
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (objectURL) URL.revokeObjectURL(objectURL);
    ac?.close();
    if (hls) hls.destroy();
    if (chList && !chList.win.closed) chList.win.close();
  });
  w.el.addEventListener(
    "keydown",
    safely((e) => {
      if (e.code === "Space" && !e.target.matches("input")) {
        e.preventDefault();
        return toggle();
      }
    }),
  );
  if (path) { playlist.push(path); index = 0; }
  await load(path, !!path);
  draw();
  return w;
}

export function openImaging(ctx, { path = null } = {}) {
  const w = ctx.wm.create({
    title: path ? basename(path) + " - Imaging" : "Imaging",
    icon: "imagingApp",
    width: 646,
    height: 485,
    x: 174,
    y: 78,
    appId: "imaging",
  });
  let current = path,
    rotation = 0,
    zoom = 1;
  const image = el("img", { class: "imaging-image", alt: "", hidden: true }),
    stage = el("div", { class: "imaging-stage" }, image),
    status = el(
      "div",
      { class: "img-status" },
      el("span", { class: "img-status-text", text: "For Help, press F1" }),
      el("span", { class: "img-panel", style: { right: "230px", width: "54px" } }),
      el("span", { class: "img-panel", style: { right: "19px", width: "208px" } }),
    );
  const load = (p) => {
    const node = ctx.fs.stat(p);
    if (!node.content.startsWith("data:image/"))
      throw new Error("Select an image file.");
    current = p;
    image.src = node.content;
    image.alt = node.name;
    image.hidden = false;
    w.setTitle(node.name + " - Imaging");
    status.children[0].textContent = "For Help, press F1";
  };
  const update = () =>
    (image.style.transform = `rotate(${rotation}deg) scale(${zoom})`);
  const open = async () => {
    const p = await ctx.dialogs.file({
      filter: (n) => n.mime?.startsWith("image/"),
    });
    if (p) load(p);
  };
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const rot = (deg) => ({ label: deg === 90 ? "Right" : deg === 270 ? "Left" : "180°", action: () => ((rotation += deg), update()) });
  const zs = (label, z) => ({ label, action: () => ((zoom = z), update()) });
  w.setMenu({
    File: () => [
      off("New...", { shortcut: "Ctrl+N" }),
      { label: "Open...", shortcut: "Ctrl+O", action: open },
      off("Save", { shortcut: "Ctrl+S" }),
      {
        label: "Save As...",
        disabled: !current,
        action: () => {
          if (current) {
            const n = ctx.fs.stat(current);
            downloadFile(n.name, n.content, n.mime);
          }
        },
      },
      separator(),
      {
        label: "Acquire Image...",
        action: async () => {
          const [file] = await pickFiles({ accept: "image/*" });
          if (file) load(await ctx.fs.importFile(file));
        },
      },
      off("Select Device..."),
      separator(),
      { label: "Properties", disabled: !current, action: () => ctx.dialogs.message(`Name: ${ctx.fs.stat(current).name}`, { title: "Properties", icon: "imagingApp" }) },
      separator(),
      { label: "Print...", shortcut: "Ctrl+P", disabled: !current, action: () => ctx.printImage(image.src) },
      off("Color Management..."),
      off("Send..."),
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      off("Undo", { shortcut: "Ctrl+Z" }),
      off("Redo", { shortcut: "Ctrl+Y" }),
      separator(),
      off("Cut", { shortcut: "Ctrl+X" }),
      off("Copy", { shortcut: "Ctrl+C" }),
      off("Copy Page"),
      off("Paste", { shortcut: "Ctrl+V" }),
      off("Clear", { shortcut: "Del" }),
      off("Delete Page"),
      separator(),
      { label: "Drag", checked: true, action: () => {} },
      off("Select Image", { shortcut: "Ctrl+Space" }),
      off("Select Annotations"),
    ],
    View: [
      off("Scale to Gray"),
      separator(),
      { label: "One Page", checked: true, action: () => {} },
      off("Thumbnails"),
      off("Page and Thumbnails"),
      separator(),
      { label: "Full Screen", shortcut: "Ctrl+F", action: () => w.maximize() },
      separator(),
      off("Toolbars..."),
    ],
    Page: [
      off("Previous", { shortcut: "Ctrl+Page Up" }),
      off("Next", { shortcut: "Ctrl+Page Down" }),
      off("First"),
      off("Last"),
      separator(),
      off("Go To..."),
      off("Go Back"),
      separator(),
      { label: "Print Page", disabled: !current, action: () => ctx.printImage(image.src) },
      separator(),
      { label: "Rotate Page", submenu: [rot(270), rot(90), rot(180)] },
      { label: "Rotate All Pages", submenu: [rot(270), rot(90), rot(180)] },
      separator(),
      { label: "Insert", submenu: [off("Acquire Image..."), off("Existing Page...")] },
      { label: "Append", submenu: [off("Acquire Image..."), off("Existing Page...")] },
      separator(),
      off("Reacquire..."),
      separator(),
      off("Properties"),
    ],
    Zoom: [
      { label: "Zoom In", shortcut: "Ctrl+Up", action: () => ((zoom = Math.min(5, zoom + 0.25)), update()) },
      { label: "Zoom Out", shortcut: "Ctrl+Down", action: () => ((zoom = Math.max(0.25, zoom - 0.25)), update()) },
      off("Zoom to Selection"),
      separator(),
      off("Fit to Height"),
      off("Fit to Width"),
      { label: "Best Fit", action: () => ((zoom = 1), update()) },
      { label: "Actual Size", action: () => ((zoom = 1), update()) },
      separator(),
      zs("25%", 0.25), zs("50%", 0.5), zs("75%", 0.75), zs("100%", 1), zs("200%", 2), zs("400%", 4),
      off("Custom..."),
    ],
    Tools: [off("General Options..."), off("Scan Options..."), off("Thumbnail Size...")],
    Annotation: [
      off("Show Annotations"),
      off("Make Annotations Permanent"),
      separator(),
      off("Select Annotations"),
      off("Freehand Line"),
      off("Highlighter"),
      off("Straight Line"),
      off("Hollow Rectangle"),
      off("Filled Rectangle"),
      off("Typed Text"),
      off("Attach-a-Note"),
      off("Text From File"),
      off("Rubber Stamps..."),
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "imaging" }) },
      separator(),
      { label: "About Imaging", action: () => ctx.dialogs.message("Imaging for Windows\nVersion 2.0\n\nCopyright © 1992-1999 Eastman Software, Inc.", { title: "About Imaging", icon: "imagingApp" }) },
    ],
  });
  const hit = (x, y, wd, title, action) => {
    const b = el("div", { class: "img-hit", style: { left: x + "px", top: y + "px", width: wd + "px" }, title, role: "button" });
    b.addEventListener("click", action);
    return b;
  };
  const edit = () => current && ctx.launch("paint", { path: current });
  const header = el(
    "div",
    { class: "img-header" },
    hit(6, 4, 23, "Open", open),
    hit(30, 4, 23, "Open", open),
    hit(86, 4, 23, "Print", () => current && ctx.printImage(image.src)),
    hit(254, 4, 23, "Zoom In", () => ((zoom = Math.min(5, zoom + 0.25)), update())),
    hit(278, 4, 23, "Zoom Out", () => ((zoom = Math.max(0.25, zoom - 0.25)), update())),
    hit(326, 4, 23, "Best Fit", () => ((zoom = 1), update())),
    hit(350, 4, 23, "Fit to Width", () => ((zoom = 1), update())),
    hit(236, 34, 23, "Edit in Paint", edit),
    hit(260, 34, 23, "Rotate", () => ((rotation += 90), update())),
  );
  w.setContent(
    el(
      "div",
      { class: "img-root" },
      header,
      el("div", { class: "img-canvas" }, stage),
      el("div", { class: "img-anno" }),
      status,
    ),
  );
  if (path) load(path);
  image.addEventListener("load", () => {
    status.children[2].textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
  });
  return w;
}
