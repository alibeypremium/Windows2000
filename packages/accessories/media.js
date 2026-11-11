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
import { wmpOpen, wmpAbout, wmpStats, wmpProps, wmpOptions } from "./wmp-dialogs.js";
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
    width: 600,
    height: 455,
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
    status = statusBar("Stopped");
  video.volume = ctx.settings.get("volume") / 100;
  video.muted = ctx.settings.get("muted");
  const format = (s) =>
    !Number.isFinite(s)
      ? "00:00"
      : String(Math.floor(s / 60)).padStart(2, "0") +
        ":" +
        String(Math.floor(s % 60)).padStart(2, "0");
  const showSub = () => { const t = curSub ? curSub.at(video.currentTime) : ""; if (subEl.textContent !== t) subEl.textContent = t; };
  const addTrack = (t) => { tracks.push(t); curSub = t; showSub(); status.children[0].textContent = "Captions: " + t.name; };
  const entryUrl = (p) => (typeof p === "string" ? (/^https?:\/\//i.test(p) ? p : null) : p?.url || null);
  const entryTitle = (p) => (typeof p === "string" ? p.split("/").pop() : p?.title || p?.url || "");
  const load = async (p, autoplay = false) => {
    const url = entryUrl(p);
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
    chList = openChannelList(ctx, { getList: () => playlist.map((e) => (typeof e === "string" ? { title: entryTitle(e), group: "" } : e)), getIndex: () => index, play: async (i) => { index = i; await load(playlist[i], true); }, loadUrl: loadListUrl, openFile: openListFile, onClose: () => { chList = null; } });
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
  const draw = () => {
    if (w.closed) return;
    canvasCtx.fillStyle = "#081008";
    canvasCtx.fillRect(0, 0, 560, 245);
    if (analyser) analyser.getByteFrequencyData(bars);
    for (let i = 0; i < 56; i++) {
      const h = (bars[i * 2] || 0) * 0.72,
        x = i * 9 + 25;
      for (let y = 0; y < h; y += 7) {
        canvasCtx.fillStyle =
          y > 150 ? "#d5ce30" : y > 80 ? "#49b924" : "#07840a";
        canvasCtx.fillRect(x, 215 - y, 6, 5);
      }
    }
    canvasCtx.fillStyle = "#263e24";
    canvasCtx.font = "11px Tahoma";
    canvasCtx.textAlign = "center";
    canvasCtx.fillText(
      video.paused ? "WINDOWS MEDIA PLAYER" : "SPECTRUM ANALYZER",
      280,
      235,
    );
    raf = requestAnimationFrame(draw);
  };
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
  let onTop = false, mute = false, viewMode = "standard";
  const setView = (m) => {
    viewMode = m;
    const r = w.el.querySelector(".wmp-root");
    if (r) r.dataset.view = m;
    if (!w.el.classList.contains("maximized")) w.el.style.height = (m === "standard" ? 455 : m === "compact" ? 385 : 335) + "px";
  };
  w.setMenu({
    File: [
      { label: "Open...", shortcut: "Ctrl+O", action: () => wmpOpen(ctx, (v) => openAny(v), async (dlg) => { dlg.close(); await importMedia(); }) },
      { label: "Open Channel List...", action: () => { showChannels(); } },
      { label: "Open Playlist...", action: openListFile },
      { label: "Close", disabled: !current, action: () => { video.pause(); video.removeAttribute("src"); video.load(); current = null; tracks = []; curSub = null; subEl.textContent = ""; } },
      separator(),
      { label: "Save As...", shortcut: "Ctrl+S", disabled: true },
      separator(),
      {
        label: "Properties",
        action: () => {
          const n = current && ctx.fs.exists(current) ? ctx.fs.stat(current) : null;
          wmpProps(ctx, { name: n?.name || "Windows Welcome", type: n?.mime || "Wave Sound", size: n?.size ? n.size + " bytes" : "", length: format(video.duration), videoSize: video.videoWidth ? video.videoWidth + " x " + video.videoHeight : "" });
        },
      },
      { label: "More Information", submenu: [off("Show"), off("Clip"), off("Banner")] },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    View: () => [
      { label: "Standard", shortcut: "Ctrl+1", checked: viewMode === "standard", action: () => setView("standard") },
      { label: "Compact", shortcut: "Ctrl+2", checked: viewMode === "compact", action: () => setView("compact") },
      { label: "Minimal", shortcut: "Ctrl+3", checked: viewMode === "minimal", action: () => setView("minimal") },
      separator(),
      { label: "Full Screen", shortcut: "Alt+Enter", action: () => w.maximize() },
      { label: "Zoom", submenu: [off("50%", { shortcut: "Alt+1" }), { label: "100%", shortcut: "Alt+2", checked: true, action: () => {} }, off("200%", { shortcut: "Alt+3" })] },
      separator(),
      { label: "Statistics", action: () => wmpStats(ctx, video) },
      separator(),
      off("Settings", { submenu: [] }),
      separator(),
      { label: "Captions", submenu: capMenu },
      { label: "Channel List", shortcut: "Ctrl+H", action: showChannels },
      { label: "Always on Top", shortcut: "Ctrl+T", checked: onTop, action: () => (onTop = !onTop) },
      { label: "Options...", action: () => wmpOptions(ctx, { onTop }, (st) => (onTop = !!st.onTop)) },
    ],
    Play: () => [
      { label: "Play/Pause", shortcut: "Space", action: () => toggle() },
      { label: "Stop", shortcut: "Period", action: () => { video.pause(); video.currentTime = 0; } },
      separator(),
      { label: "Skip Back", shortcut: "Page Up", action: () => { if (index > 0) load(playlist[--index], true); else video.currentTime = 0; } },
      { label: "Skip Forward", shortcut: "Page Down", action: () => { if (index < playlist.length - 1) load(playlist[++index], true); } },
      { label: "Rewind", shortcut: "Ctrl+Left", action: () => (video.currentTime = Math.max(0, video.currentTime - 5)) },
      { label: "Fast Forward", shortcut: "Ctrl+Right", action: () => (video.currentTime = Math.min(video.duration || 0, video.currentTime + 5)) },
      separator(),
      off("Preview", { shortcut: "Ctrl+V" }),
      off("Go to...", { shortcut: "Ctrl+G" }),
      separator(),
      { label: "Language", submenu: [off("(not available)")] },
      {
        label: "Volume",
        submenu: [
          { label: "Up", shortcut: "Up Arrow", action: () => ctx.settings.set("volume", Math.min(100, (ctx.settings.get("volume") ?? 65) + 10)) },
          { label: "Down", shortcut: "Down Arrow", action: () => ctx.settings.set("volume", Math.max(0, (ctx.settings.get("volume") ?? 65) - 10)) },
          { label: "Mute", shortcut: "Ctrl+M", checked: !!ctx.settings.get("muted"), action: () => ctx.settings.set("muted", !ctx.settings.get("muted")) },
        ],
      },
    ],
    Favorites: [off("Add to Favorites...")],
    Go: [
      off("Back", { shortcut: "Alt+Left" }),
      off("Forward", { shortcut: "Alt+Right" }),
      separator(),
      off("Media Guide", { shortcut: "Ctrl+Home" }),
      off("Music", { shortcut: "Ctrl+U" }),
      off("Radio", { shortcut: "Ctrl+F" }),
      off("Windows Media Player Home Page"),
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "media" }) },
      separator(),
      off("Check for Player Upgrade"),
      { label: "About Windows Media Player", action: () => wmpAbout(ctx) },
    ],
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
  const spr = (n, i, dis) => ({ backgroundImage: `url(assets/wmp/bmp${n}.png)`, backgroundPosition: `-${i * 20}px 0` });
  const wbs = [];
  const wb = (i, titleText, fn) => {
    const b = el("button", { class: "wmp-btn", title: titleText, "aria-label": titleText, onclick: fn });
    b.dataset.i = i;
    Object.assign(b.style, spr(5208, i));
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
    const off = { 1: video.paused, 2: idle, 3: false, 4: idle, 5: idle, 6: playlist.length < 2 };
    for (const b of wbs) {
      const i = +b.dataset.i, dis = !!off[i];
      b.disabled = dis;
      b.style.backgroundImage = `url(assets/wmp/bmp${dis ? 5209 : 5208}.png)`;
    }
    visual.style.visibility = idle ? "hidden" : "visible";
  };
  video.addEventListener("play", sync);
  video.addEventListener("pause", sync);
  const info = (k, v) => el("div", { class: "wmp-info-row" }, el("span", { class: "wmp-info-k", text: k }), el("span", { class: "wmp-info-v" }, v));
  const vol = el("div", { class: "wmp-vol" });
  const volImg = el("div", { class: "wmp-vol-icon" });
  Object.assign(volImg.style, { backgroundImage: "url(assets/wmp/bmp5212.png)", backgroundPosition: "0 0" });
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
  const syncMute = () => (volImg.style.backgroundPosition = ctx.settings.get("muted") ? "-40px 0" : "0 0");
  w.addCleanup(ctx.bus.on("settings:change", syncMute));
  syncMute();
  seek.className = "wmp-seek";
  w.setContent(
    el("div", { class: "wmp-root", "data-view": "standard" },
      el("div", { class: "wmp-screen" }, video, visual, logo, subEl),
      el("div", { class: "wmp-seekrow" }, seek),
      el("div", { class: "wmp-controls" },
        wmpPlay,
        wmpPause,
        wb(2, "Stop", () => { video.pause(); video.currentTime = 0; sync(); }),
        el("span", { class: "wmp-sep" }),
        wb(3, "Skip Back", skipBack),
        wb(4, "Rewind", () => (video.currentTime = Math.max(0, video.currentTime - 5))),
        wb(5, "Fast Forward", () => (video.currentTime = Math.min(video.duration || 0, video.currentTime + 5))),
        wb(6, "Skip Forward", skipFwd),
        el("span", { class: "wmp-flex" }),
        el("button", { class: "wmp-txtbtn", type: "button", title: "Channel list", onclick: showChannels, text: "TV" }),
        el("button", { class: "wmp-txtbtn", type: "button", title: "Captions", text: "CC", onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); popup(capMenu(), r.left, r.top - 4, {}); } }),
        vol,
      ),
      el("div", { class: "wmp-info" }, info("Show:", ""), info("Clip:", (title.className = "wmp-clip", title)), info("Author:", ""), info("Copyright:", "")),
    ),
    status,
  );
  status.children[1] && (status.children[1].textContent = "");
  video.addEventListener("timeupdate", () => status.children[1] && (status.children[1].textContent = time.textContent));
  sync();
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
  await load(path);
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
