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
import { isMedia, sourceFor, siblingSubtitles, loadSubtitleFile, subtitleFromFile, SUB_RE, loadHls, isHls, parseM3U, fetchPlaylistText, isHlsManifest } from "./media-engine.js";
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
    current = url || p?.file ? null : p;
    tracks = []; curSub = null; subEl.textContent = "";
    if (hls) { hls.destroy(); hls = null; }
    if (objectURL) {
      URL.revokeObjectURL(objectURL);
      objectURL = null;
    }
    if (url) {
      title.textContent = entryTitle(p);
      video.hidden = true;
      visual.hidden = false;
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
    } else if (p?.file) {
      // a file picked from the computer is played straight from the browser (no copy into the simulated disk)
      const f = p.file, ext = (/\.([a-z0-9]+)$/i.exec(f.name) || [])[1]?.toLowerCase() || "";
      const T = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/mp4", webm: "video/webm", ogv: "video/ogg", mkv: "video/webm", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", flac: "audio/flac" };
      const type = f.type || T[ext] || "";
      objectURL = URL.createObjectURL(type && !f.type ? new Blob([f], { type }) : f);
      video.src = objectURL;
      title.textContent = f.name;
      const isVideo = type.startsWith("video/") || /^(mp4|m4v|mov|webm|ogv|mkv|avi|wmv|3gp)$/.test(ext);
      video.hidden = !isVideo; visual.hidden = isVideo;
      if (isVideo && video.canPlayType(type) === "" && !/^(mkv|mov)$/.test(ext)) status.children[0].textContent = "This format may not be supported by your browser.";
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
      filter: (n) => isMedia(n) || /\.(m3u8?|pls)$/i.test(n.name),
    });
    if (p) await openAny(p);
  };
  const musicVideo = (e) => {
    const r = e?.currentTarget?.getBoundingClientRect?.() || w.el.getBoundingClientRect();
    popup([
      { label: "From my computer (browser file picker)...", action: () => importMedia() },
      { label: "From inside the app (My Documents)...", action: () => open() },
    ], r.left, e?.currentTarget ? r.bottom : r.top + 60, {});
  };
  const importMedia = async () => {
    const files = await pickFiles({
      accept: "audio/*,video/*,.mp3,.mp4,.m4v,.m4a,.mov,.mkv,.webm,.ogg,.ogv,.oga,.opus,.wav,.flac,.aac,.avi,.wmv,.wma,.3gp",
      multiple: true,
    });
    for (const file of files)
      playlist.push({ title: file.name, file });
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
  // a stream or file without a picture (radio, music) shows the visualization; one with video shows the video
  const pic = () => { if (!video.src && !video.currentSrc) return; const v = video.videoWidth > 0; video.hidden = !v; visual.hidden = v; };
  video.addEventListener("loadedmetadata", pic); video.addEventListener("playing", pic); video.addEventListener("resize", pic);
  const bars = new Uint8Array(128);
  // ---- visualizations in the style of Windows Media Player 6.4 / 7 (View > Visualizations, or click the picture) ----
  // Real FFT/waveform data when the audio goes through Web Audio; a beat-driven stand-in for cross-origin radio streams,
  // which the browser will not let us analyse.
  const VIS = [["bars", "Bars and Waves"], ["scope", "Scope"], ["battery", "Battery"], ["ambience", "Ambience"], ["alchemy", "Alchemy"], ["spikes", "Spikes"]];
  let vis = ctx.settings.get("wmpVis"); if (!VIS.some(([k]) => k === vis)) vis = "bars";
  const setVis = (v) => { vis = v; ctx.settings.set("wmpVis", v); clearV = true; };
  const wave = new Uint8Array(128), sm = new Float32Array(128), peaks = new Float32Array(128);
  let clearV = true, lvl = 0, bass = 0, mid = 0, hi = 0, phase = 0, hue0 = 0, trail = [];
  const fake = (t) => {
    const beat = Math.pow(Math.max(0, Math.sin(t * 2 * Math.PI * 2.1)), 5), off = Math.pow(Math.max(0, Math.sin(t * 2 * Math.PI * 1.05 + 1.2)), 8);
    for (let i = 0; i < 128; i++) {
      const f = i / 128, body = 0.32 + 0.22 * Math.sin(t * 0.9 + i * 0.23) * Math.sin(t * 0.37 + i * 0.07);
      bars[i] = Math.max(0, Math.min(255, 255 * ((1 - f) * (0.35 * beat + 0.3 * off) + body * (1 - f * 0.8) * (0.7 + 0.3 * Math.sin(t * 7 + i * 1.3)) * 0.8)));
      wave[i] = 128 + 55 * (Math.sin(t * 11 + i * 0.28) * (0.5 + 0.5 * beat) + 0.5 * Math.sin(t * 23 + i * 0.7) * (0.4 + 0.6 * off));
    }
  };
  const hsl = (h, sat, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${sat}%,${l}%,${a})`;
  const draw = () => {
    if (w.closed) return;
    const c = canvasCtx, t = performance.now() / 1000, playing = !video.paused;
    const W = visual.clientWidth || 560, H = visual.clientHeight || 245;
    if (visual.width !== W || visual.height !== H) { visual.width = W; visual.height = H; clearV = true; }
    c.setTransform(1, 0, 0, 1, 0, 0);
    let real = false;
    if (analyser && playing) { analyser.getByteFrequencyData(bars); analyser.getByteTimeDomainData(wave); real = bars.some((x) => x > 0); }
    if (!real) { if (playing) fake(t); else { bars.fill(0); wave.fill(128); } }
    for (let i = 0; i < 128; i++) { sm[i] += (bars[i] - sm[i]) * (bars[i] > sm[i] ? 0.6 : 0.18); peaks[i] = Math.max(sm[i], peaks[i] - 1.6); }
    let b = 0, m = 0, h = 0; for (let i = 0; i < 8; i++) b += sm[i]; for (let i = 8; i < 40; i++) m += sm[i]; for (let i = 40; i < 100; i++) h += sm[i];
    bass += (b / 8 / 255 - bass) * 0.35; mid += (m / 32 / 255 - mid) * 0.3; hi += (h / 60 / 255 - hi) * 0.3; lvl = (bass + mid + hi) / 3;
    phase += 0.004 + lvl * 0.03; hue0 += 0.15 + bass * 1.5;
    const clear = (a) => { c.globalCompositeOperation = "source-over"; c.fillStyle = clearV ? "#000" : `rgba(0,0,0,${a})`; c.fillRect(0, 0, W, H); clearV = false; };
    if (vis === "bars") {
      // Bars and Waves: gradient columns with falling peak caps over a blue backdrop and a waveform trace
      clearV = false;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a0a3c"); g.addColorStop(1, "#000010"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const n = Math.max(24, Math.floor(W / 11)), bw = W / n;
      for (let i = 0; i < n; i++) {
        const k = Math.floor(Math.pow(i / n, 1.5) * 64), v = sm[k] / 255, ph = peaks[k] / 255, x = i * bw, hh = v * H * 0.86;
        const gg = c.createLinearGradient(0, H - hh, 0, H); gg.addColorStop(0, "#ffee55"); gg.addColorStop(0.35, "#44dd44"); gg.addColorStop(1, "#006a44");
        c.fillStyle = gg; c.fillRect(x + 1, H - hh, bw - 2, hh);
        c.fillStyle = "#ffffff"; c.fillRect(x + 1, H - ph * H * 0.86 - 3, bw - 2, 2);
      }
      c.strokeStyle = "rgba(120,200,255,.9)"; c.lineWidth = 1.5; c.beginPath();
      for (let i = 0; i < 128; i++) { const x = (i / 127) * W, y = H * 0.3 + (wave[i] - 128) * H / 400; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    } else if (vis === "scope") {
      // Scope: green phosphor oscilloscope with graticule and persistence
      clear(0.28);
      c.strokeStyle = "rgba(0,120,0,.35)"; c.lineWidth = 1; c.beginPath();
      for (let x = 0; x <= W; x += W / 10) { c.moveTo(Math.round(x) + .5, 0); c.lineTo(Math.round(x) + .5, H); }
      for (let y = 0; y <= H; y += H / 6) { c.moveTo(0, Math.round(y) + .5); c.lineTo(W, Math.round(y) + .5); }
      c.stroke();
      c.shadowColor = "#38ff38"; c.shadowBlur = 8; c.strokeStyle = "#7dff7d"; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i < 128; i++) { const x = (i / 127) * W, y = H / 2 + (wave[i] - 128) * H / 260; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke(); c.shadowBlur = 0;
    } else if (vis === "battery") {
      // Battery: pulsing rings and rotating spokes, colour-cycling with the bass
      clear(0.2); c.globalCompositeOperation = "lighter";
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.46;
      for (let k = 0; k < 3; k++) { c.strokeStyle = hsl(hue0 + k * 50, 90, 55, 0.55); c.lineWidth = 2 + bass * 6; c.beginPath(); c.arc(cx, cy, R * (0.25 + k * 0.22 + bass * 0.25), 0, 6.2832); c.stroke(); }
      const n = 48; c.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.2832 + phase * 2, v = Math.min(1, sm[Math.floor(i * 0.7)] / 200) + 0.05, r0 = R * 0.28, r1 = r0 + v * R * 0.8;
        c.strokeStyle = hsl(hue0 + i * 5, 100, 55, 0.9); c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
      }
    } else if (vis === "ambience") {
      // Ambience: slow, soft colour fields that swell with the music
      clear(0.16); c.globalCompositeOperation = "lighter";
      for (let k = 0; k < 7; k++) {
        const x = W / 2 + Math.cos(t * (0.21 + k * 0.07) + k * 1.7) * W * 0.38, y = H / 2 + Math.sin(t * (0.17 + k * 0.05) + k * 2.3) * H * 0.38;
        const r = Math.min(W, H) * (0.22 + 0.1 * Math.sin(t * 0.5 + k)) * (1 + lvl * 1.2) + sm[k * 9] * 0.25;
        const g = c.createRadialGradient(x, y, 0, x, y, r), hh = hue0 * 0.5 + k * 48;
        g.addColorStop(0, hsl(hh, 80, 48, 0.2)); g.addColorStop(1, hsl(hh, 80, 40, 0));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
      }
    } else if (vis === "alchemy") {
      // Alchemy: a glowing Lissajous curve whose shape and colour are driven by the spectrum
      clear(0.12); c.globalCompositeOperation = "lighter";
      const cx = W / 2, cy = H / 2, ax = W * 0.42, ay = H * 0.42, fa = 3 + Math.round(bass * 2), fb = 2 + Math.round(mid * 3);
      for (let pass = 0; pass < 2; pass++) {
        c.strokeStyle = hsl(hue0 + pass * 140, 100, 50, pass ? 0.22 : 0.6); c.lineWidth = pass ? 4 : 1.5; c.beginPath();
        for (let i = 0; i <= 360; i++) {
          const a = (i / 360) * 6.2832, wv = (wave[i % 128] - 128) / 128, r = 1 + wv * 0.25 + hi * 0.3;
          const x = cx + Math.sin(fa * a + phase * 3) * ax * r, y = cy + Math.sin(fb * a + phase * 2) * ay * r;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
    } else {
      // Spikes: a ring of spectrum spikes, centre glow on the beat
      clear(0.3); c.globalCompositeOperation = "lighter";
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.2 * (1 + bass * 0.4), n = 96;
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 2.2); g.addColorStop(0, hsl(hue0, 90, 55, 0.35 * (0.4 + bass))); g.addColorStop(1, hsl(hue0, 90, 40, 0)); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.2832 + phase, v = Math.min(1, sm[Math.floor((i < n / 2 ? i : n - i) * 0.9)] / 200), r1 = R + (0.06 + v) * Math.min(W, H) * 0.4;
        c.strokeStyle = hsl(hue0 + (i / n) * 200, 95, 60, 0.9); c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
      }
    }
    c.globalCompositeOperation = "source-over";
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
    guide: { run: musicVideo }, music: { run: musicVideo }, home: { run: () => ctx.launch("ie", { url: "http://www.windowsmedia.com/" }) },
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
      if (it.id === 128) { out.push({ label: "Music and Video...", action: () => musicVideo() }); continue; }
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
    if (!radioLoaded) { radioLoaded = true; fetchDecadeStations((e) => { stations.push(e); radio?.refresh(); }).then((l) => { if (!l.length) radioLoaded = false; }); }
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
    navBtn("assets/wmp/bmp116.png", 3, "Music and Video", (e) => A.music.run(e), { text: "Music and Video", tip: "Add music or video files from your computer and play them" }),
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
