// VLC media player 0.8.6 look-alike. Playback uses the browser's HTML5 media engine (mp4/webm/ogg/mp3/wav/...).
import { el, button, menuBar, popup } from "../ui/index.js";
import { basename, normalizePath, pickFiles, DOCS } from "../core/index.js";
import { AV_RE, fmtTime, sourceFor, mediaFiles, AudioChain, EQ_FREQS, EQ_LABELS, EQ_PRESETS, loadEq, saveEq, siblingSubtitles, loadSubtitleFile, subtitleFromFile, SUB_RE } from "./media-engine.js";

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
  sub: svg(`<rect x="1.5" y="3.5" width="13" height="9" rx="1" fill="#fff" stroke="${K}"/><path d="M4 8h3M9 8h3M4 10.5h5M10.5 10.5h1.5" stroke="${K}" stroke-width="1.2"/>`),
  tv: svg(`<rect x="1.5" y="4.5" width="13" height="9" fill="#fff" stroke="${K}"/><path d="M5 1.5L8 4.5l3-3" stroke="${K}" fill="none"/><rect x="3.5" y="6.5" width="9" height="5" fill="#9ec5ee" stroke="${K}"/>`),
  vol: svg(`<path d="M1 6h3l4-3v10l-4-3H1z" fill="${K}"/><path d="M10.5 5c1.7 1.7 1.7 4.3 0 6M12.5 3c3 3 3 7 0 10" stroke="${K}" fill="none" stroke-width="1.2"/>`),
  mute: svg(`<path d="M1 6h3l4-3v10l-4-3H1z" fill="${K}"/><path d="M10 5.5l4 5M14 5.5l-4 5" stroke="#c00000" stroke-width="1.5"/>`),
};
const gi = (n, s = 16) => el("img", { src: "data:image/svg+xml;utf8," + encodeURIComponent(G[n]), width: s, height: s, alt: "", draggable: "false" });
const WEDGE = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="24" viewBox="0 0 80 24"><defs><linearGradient id="vw" x1="0" x2="1"><stop offset="0" stop-color="#3cb43c"/><stop offset=".5" stop-color="#e6e600"/><stop offset="1" stop-color="#ff4000"/></linearGradient><clipPath id="vc"><rect class="vlc-wedge-clip" x="0" y="0" width="40" height="24"/></clipPath></defs><polygon points="0.5,23.5 79.5,23.5 79.5,1.5" fill="#ece9e0" stroke="#808080"/><polygon points="1,23 79,23 79,2" fill="url(#vw)" clip-path="url(#vc)"/></svg>`;
const CONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120"><defs><linearGradient id="c" x1="0" x2="1"><stop offset="0" stop-color="#ff9a1a"/><stop offset="1" stop-color="#e06a00"/></linearGradient></defs><path d="M50 4L88 98H12z" fill="url(#c)"/><path d="M42 30h16l4 12H38zM33 54h34l5 14H28zM24 78h52l5 14H19z" fill="#fff" opacity=".85"/><path d="M4 100h92l-8 14H12z" fill="#f0f0f0"/><path d="M4 100h92" stroke="#c0c0c0"/></svg>`;
let hlsLoad = null;
const loadHls = () => hlsLoad ||= new Promise((res, rej) => {
  if (window.Hls) return res(window.Hls);
  const sc = document.createElement("script");
  sc.src = new URL("../../assets/vendor/hlsjs/hls.min.js", import.meta.url).href;
  sc.onload = () => (window.Hls ? res(window.Hls) : rej(new Error("hls.js")));
  sc.onerror = () => { hlsLoad = null; rej(new Error("hls.js")); };
  document.head.append(sc);
});
const isHls = (u) => /\.m3u8?(\?|#|$)/i.test(u || "");
/** #EXTM3U / plain / .pls playlists. Keeps #EXTINF titles, group-title, tvg-logo, so IPTV lists become channel lists. */
export function parseM3U(text, base, exists = () => true) {
  const out = []; let meta = null;
  if (/^\s*\[playlist\]/i.test(text)) {
    const f = {}, t = {};
    for (const l of text.split(/\r?\n/)) { const m = /^(File|Title)(\d+)=(.*)$/i.exec(l.trim()); if (m) (m[1].toLowerCase() === "file" ? f : t)[m[2]] = m[3]; }
    return Object.keys(f).map((k) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(f[k]) ? { title: t[k] || f[k], url: f[k], live: true } : { title: t[k] || basename(f[k]), path: normalizePath(f[k].startsWith("/") || /^[A-Za-z]:/.test(f[k]) ? f[k] : base + "/" + f[k]) })).filter((e) => e.url || exists(e.path));
  }
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const l = raw.trim(); if (!l) continue;
    if (l.startsWith("#EXTINF")) {
      const comma = l.indexOf(",", l.lastIndexOf('"') + 1 || 0), c2 = comma < 0 ? l.lastIndexOf(",") : comma;
      const attrs = {}; for (const m of l.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1].toLowerCase()] = m[2];
      const dur = parseFloat(l.slice(8)) || 0;
      meta = { title: (c2 >= 0 ? l.slice(c2 + 1).trim() : "") || attrs["tvg-name"] || "", group: attrs["group-title"] || "", logo: attrs["tvg-logo"] || "", dur: dur > 0 ? dur : 0 };
    } else if (l.startsWith("#EXTGRP:")) { meta = { ...(meta || {}), group: l.slice(8).trim() }; }
    else if (l.startsWith("#")) continue;
    else {
      const isUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(l);
      const e = isUrl ? { title: meta?.title || l, url: l, live: !meta?.dur } : { title: meta?.title || basename(l), path: normalizePath(l.startsWith("/") || /^[A-Za-z]:/.test(l) ? l : base + "/" + l) };
      if (meta?.group) e.group = meta.group; if (meta?.logo) e.logo = meta.logo; if (meta?.dur) e.dur = meta.dur;
      if (e.url || exists(e.path)) out.push(e);
      meta = null;
    }
  }
  return out;
}
export function openVLC(ctx, { path = null } = {}) {
  const w = ctx.wm.create({ title: "VLC media player", icon: "vlc", width: 364, height: 131, x: 150, y: 60, appId: "vlc" });
  const st = Object.assign({ volume: 100, recent: [], autoSub: true, loop: false, random: false, fx: { brightness: 100, contrast: 100, saturate: 100, hue: 0 } }, ctx.settings.get("vlc") || {});
  const eq = loadEq(ctx);
  let hls = null, chain = null, tracks = [], curSub = null, subDelay = 0, fxWin = null, rawDrawEq = null;
  let list = [], idx = -1, muted = false, loop = !!st.loop, random = !!st.random, aspect = "default", current = null, blobUrl = null, ac = null, gain = null, plWin = null, drawPl = () => {};
  const video = el("video", { class: "vlc-video", playsinline: "true" });
  const cone = el("div", { class: "vlc-cone" });
  cone.innerHTML = CONE;
  const subEl = el("div", { class: "vlc-sub" });
  const screen = el("div", { class: "vlc-screen" }, cone, video, subEl);
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

  // ---------- volume (0-200 %) and equalizer: both go through the shared audio chain ----------
  const applyFx = () => { const f = st.fx; video.style.filter = f.brightness === 100 && f.contrast === 100 && f.saturate === 100 && f.hue === 0 ? "" : `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg)`; };
  const applyVolume = () => {
    const v = muted ? 0 : st.volume / 100;
    chain ||= new AudioChain(video);
    if ((chain.ok || v > 1 || eq.on) && blobUrl && chain.attach()) { video.volume = 1; chain.setGain(v); chain.apply(eq); }
    else video.volume = Math.min(1, v);
    const pct = muted ? 0 : st.volume;
    volTxt.textContent = pct + "%";
    wedgeBox.querySelector(".vlc-wedge-clip")?.setAttribute("width", String((pct / 200) * 80));
    wedgeBox.setAttribute("aria-valuenow", String(pct));
    speaker.replaceChildren(gi(muted || pct === 0 ? "mute" : "vol"));
  };
  const setVolume = (n) => { st.volume = Math.max(0, Math.min(200, Math.round(n))); muted = false; ctx.settings.set("vlc", st); applyVolume(); };
  const saveSt = () => ctx.settings.set("vlc", st);

  // ---------- subtitles ----------
  const showSub = () => { const t = curSub ? curSub.at(video.currentTime - subDelay) : ""; if (subEl.textContent !== t) subEl.textContent = t; };
  const addTrack = (t) => { tracks.push(t); curSub = t; showSub(); setStatus(`Subtitles: ${t.name}`); };
  const addSubFile = async () => {
    const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Open Subtitles File...", types: [["Subtitle files (*.srt;*.vtt;*.sub)", ["srt", "vtt", "sub"]], ["All Files (*.*)", null]] });
    if (!p) return;
    try { addTrack(loadSubtitleFile(ctx, p)); } catch (e) { err(e.message || String(e)); }
  };
  const addSubLocal = async () => {
    const [f] = await pickFiles({ accept: ".srt,.vtt,.sub" }); if (!f) return;
    try { addTrack(await subtitleFromFile(f)); } catch (e) { err(e.message || String(e)); }
  };
  const autoSubs = () => { if (!st.autoSub || !current?.path) return; for (const p of siblingSubtitles(ctx, current.path)) { try { tracks.push(loadSubtitleFile(ctx, p)); } catch { /* skip */ } } if (tracks.length) { curSub = tracks[0]; setStatus(`Subtitles: ${curSub.name}`); } };

  // ---------- playback ----------
  const setStatus = (t) => { status.textContent = t; };
  const tick = () => {
    showSub();
    const d = video.duration, t = video.currentTime;
    if (isFinite(d) && d > 0) { if (document.activeElement !== slider) slider.value = String(Math.round((t / d) * 1000)); timeTxt.textContent = `${fmtTime(t)}/${fmtTime(d)}`; }
    else timeTxt.textContent = current?.live ? "Live" : `${fmtTime(t)}/--:--`;
  };
  const sourceUrl = (e) => sourceFor(ctx, e);
  const playIndex = async (i) => {
    if (i < 0 || i >= list.length) return;
    idx = i; current = list[i]; tracks = []; curSub = null; subEl.textContent = "";
    try {
      const { url, blob } = await sourceUrl(current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = blob ? url : null;
      if (hls) { hls.destroy(); hls = null; }
      autoSubs();
      if (isHls(url) && !video.canPlayType("application/vnd.apple.mpegurl")) {
        setStatus("Buffering...");
        const Hls = await loadHls();
        if (!Hls.isSupported()) throw new Error("This browser cannot play HLS streams.");
        hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        await new Promise((res, rej) => { hls.on(Hls.Events.MANIFEST_PARSED, res); hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) rej(new Error(d.details || "stream error")); }); hls.loadSource(url); hls.attachMedia(video); });
      } else video.src = url;
      applyVolume();
      await video.play();
      cone.style.display = "none";
      slider.disabled = false; showVideo(true);
      if (current.path || current.url) { st.recent = [{ title: current.title, path: current.path, url: current.url }, ...(st.recent || []).filter((r) => (r.path || r.url) !== (current.path || current.url))].slice(0, 8); ctx.settings.set("vlc", st); }
      w.setTitle(`${current.title} - VLC media player`);
      setStatus(`Playing ${current.title}`);
      if (current.live) timeTxt.textContent = "Live";
    } catch (e) {
      if (e?.name === "NotAllowedError") { drawPl(); return; }
      setStatus("Stopped");
      await err(`VLC is unable to open the MRL '${current.url || current.path || current.title}'.\n\nCheck the log for details.${e?.message ? "\n\n" + e.message : ""}`);
    }
    drawPl();
  };
  const stop = () => { if (hls) { hls.destroy(); hls = null; } tracks = []; curSub = null; subEl.textContent = ""; video.pause(); video.removeAttribute("src"); video.load(); cone.style.display = ""; slider.value = "0"; slider.disabled = true; showVideo(false); timeTxt.textContent = "--:--/--:--"; w.setTitle("VLC media player"); setStatus("Stopped"); };
  const togglePlay = () => {
    if (!list.length) return openFile();
    if (!video.src) return playIndex(Math.max(idx, 0));
    if (video.paused) { video.play(); setStatus("Playing"); } else { video.pause(); setStatus("Paused"); }
  };
  const next = () => { if (!list.length) return; playIndex(random ? Math.floor(Math.random() * list.length) : (idx + 1) % list.length); };
  const prev = () => { if (!list.length) return; playIndex((idx - 1 + list.length) % list.length); };
  const add = (e, play = false) => { list.push(e); drawPl(); drawCh(); if (play) playIndex(list.length - 1); };
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
  const durOf = (e) => (e.dur ? fmtTime(e.dur) : "");
  const probe = async (e) => {
    if (e.dur !== undefined || e.url) return;
    e.dur = 0;
    try { const { url, blob } = await sourceFor(ctx, e); const a = new Audio(); a.preload = "metadata"; await new Promise((res) => { a.onloadedmetadata = res; a.onerror = res; a.src = url; setTimeout(res, 3000); }); e.dur = isFinite(a.duration) ? a.duration : 0; if (blob) URL.revokeObjectURL(url); drawPl(); } catch { /* ignore */ }
  };
  const addFolder = async () => {
    const f = await ctx.dialogs.prompt("Add all media files from this folder (and its subfolders):", DOCS, { title: "Open Directory" });
    if (!f) return;
    const found = mediaFiles(ctx, normalizePath(f));
    if (!found.length) return err(`No playable media files were found in '${f}'.`);
    found.forEach((e, i) => add(e, i === 0 && !video.src));
  };
  const openPlaylist = async (pp = null) => {
    const p = (typeof pp === "string" && pp) || await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Open Playlist...", types: [["Playlist files (*.m3u;*.m3u8;*.pls)", ["m3u", "m3u8", "pls"]], ["All Files (*.*)", null]] });
    if (!p) return;
    const base = normalizePath(p).replace(/\/[^/]*$/, ""), items = parseM3U(ctx.fs.readFile(p), base, (q) => ctx.fs.exists(q));
    if (!items.length) return err("The playlist does not contain any playable items.");
    const first = list.length; items.forEach((e) => list.push(e)); drawPl(); drawCh(); if (items.some((e) => e.group || e.live) && (!chWin || chWin.closed)) showChannels(); if (!video.src) playIndex(first);
  };
  const openChannelUrl = async () => {
    const v = await ctx.dialogs.prompt("Channel list address (.m3u / .m3u8 playlist URL):", "http://", { title: "Open Channel List" });
    if (!v || v === "http://") return;
    try {
      const r = await fetch(v); if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const items = parseM3U(await r.text(), "", () => false);
      if (!items.length) return err("The playlist does not contain any playable items.");
      items.forEach((e) => list.push(e)); drawPl(); showChannels();
    } catch (e) { err(`VLC cannot read the channel list '${v}'.\n\n${e?.message || e}\n\nThe server may not allow access from a web page; download the list and use Open Playlist instead.`); }
  };
  let chWin = null, drawCh = () => {};
  const showChannels = () => {
    if (chWin && !chWin.closed) { chWin.focus(); drawCh(); return; }
    chWin = ctx.wm.create({ title: "Channel List", icon: "vlc", width: 380, height: 400, x: 240, y: 90, appId: "vlc-channels" });
    let group = "", q = "";
    const sel = el("select", { class: "vlc-ch-group" }), search = el("input", { type: "text", class: "vlc-ch-search", placeholder: "Search channels..." }), body = el("div", { class: "vlc-pl vlc-ch" });
    const count = el("span", { class: "vlc-pl-count" });
    drawCh = () => {
      if (!chWin || chWin.closed) return;
      const groups = [...new Set(list.map((e) => e.group).filter(Boolean))];
      sel.replaceChildren(el("option", { value: "", text: "All channels" }), ...groups.map((g) => el("option", { value: g, text: g })));
      if (!groups.includes(group)) group = ""; sel.value = group;
      const rows = list.map((e, i) => [e, i]).filter(([e]) => (!group || e.group === group) && (!q || e.title.toLowerCase().includes(q)));
      body.replaceChildren(...rows.map(([e, i]) => {
        const row = el("div", { class: "vlc-pl-row" + (i === idx ? " cur" : "") }, el("span", { text: e.title }), el("span", { class: "d", text: e.group || (e.live ? "Live" : "") }));
        row.addEventListener("dblclick", () => playIndex(i));
        return row;
      }));
      if (!rows.length) body.append(el("div", { class: "vlc-pl-empty", text: list.length ? "No channel matches." : "No channel list loaded. Use Open Playlist... or Open Channel List..." }));
      count.textContent = `${rows.length} channel${rows.length === 1 ? "" : "s"}`;
    };
    sel.addEventListener("change", () => { group = sel.value; drawCh(); });
    search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); drawCh(); });
    const cm = menuBar({ File: [{ label: "Open Playlist...", action: () => openPlaylist().then(drawCh) }, { label: "Open Channel List from address...", action: openChannelUrl }, { separator: true }, { label: "Close", action: () => chWin.close() }] });
    chWin.setContent(cm, el("div", { class: "vlc-ch-bar" }, sel, search), body, el("div", { class: "vlc-pl-bar" }, button("Play", () => { const r = body.querySelector(".vlc-pl-row.cur") || body.querySelector(".vlc-pl-row"); r?.dispatchEvent(new MouseEvent("dblclick")); }), count));
    chWin.onClose = () => { chWin = null; drawCh = () => {}; return true; };
    drawCh();
  };
  const savePlaylist = async () => {
    if (!list.length) return info("Save Playlist", "The playlist is empty.");
    const p = await ctx.dialogs.file({ mode: "save", path: DOCS, name: "playlist.m3u", normalizeName: (n) => (/\.[^.]+$/.test(n) ? n : n + ".m3u"), title: "Save Playlist" });
    if (!p) return;
    const m3u = "#EXTM3U\r\n" + list.map((e) => `#EXTINF:${Math.round(e.dur || -1)},${e.title}\r\n${e.path || e.url || e.title}`).join("\r\n") + "\r\n";
    await ctx.fs.writeFile(p, m3u, { mime: "audio/x-mpegurl" });
  };
  const showPlaylist = () => {
    if (plWin && !plWin.closed) { plWin.focus(); return; }
    plWin = ctx.wm.create({ title: "Playlist", icon: "vlc", width: 480, height: 340, x: 220, y: 120, appId: "vlc-playlist" });
    const body = el("div", { class: "vlc-pl" });
    let selIdx = -1, dragFrom = -1;
    drawPl = () => {
      if (!plWin || plWin.closed) return;
      body.replaceChildren(el("div", { class: "vlc-pl-head" }, el("span", { text: "Title" }), el("span", { text: "Duration" })), ...list.map((e, i) => {
        probe(e);
        const row = el("div", { class: "vlc-pl-row" + (i === idx ? " cur" : "") + (i === selIdx ? " sel" : ""), draggable: "true" }, el("span", { text: e.title }), el("span", { class: "d", text: durOf(e) }));
        row.addEventListener("dblclick", () => playIndex(i));
        row.addEventListener("click", () => { selIdx = i; drawPl(); });
        row.addEventListener("contextmenu", (ev) => { ev.preventDefault(); selIdx = i; drawPl(); popup([{ label: "Play", action: () => playIndex(i) }, { label: "Delete", action: del }, { separator: true }, { label: "Information", action: () => info("Media Information", `${e.title}\n\n${e.path || e.url || ""}${e.dur ? "\nDuration: " + fmtTime(e.dur) : ""}`) }], ev.clientX, ev.clientY, {}); });
        row.addEventListener("dragstart", () => { dragFrom = i; });
        row.addEventListener("dragover", (ev) => ev.preventDefault());
        row.addEventListener("drop", (ev) => { ev.preventDefault(); if (dragFrom < 0 || dragFrom === i) return; const cur = current, [m] = list.splice(dragFrom, 1); list.splice(i, 0, m); idx = list.indexOf(cur); dragFrom = -1; drawPl(); });
        return row;
      }));
      if (!list.length) body.append(el("div", { class: "vlc-pl-empty", text: "The playlist is empty." }));
      count.textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;
    };
    const del = () => { if (selIdx < 0 || selIdx >= list.length) return; const i = selIdx; list.splice(i, 1); if (i < idx) idx--; else if (i === idx) { idx = -1; stop(); } selIdx = -1; drawPl(); };
    const clear = () => { list = []; idx = -1; selIdx = -1; stop(); drawPl(); };
    const sortBy = () => { const cur = current; list.sort((a, b) => a.title.localeCompare(b.title)); idx = list.indexOf(cur); drawPl(); };
    const shuffle = () => { const cur = current; list.sort(() => Math.random() - 0.5); idx = list.indexOf(cur); drawPl(); };
    const count = el("span", { class: "vlc-pl-count" });
    const pm = menuBar({
      Manage: [
        { label: "Add File...", action: openFile }, { label: "Add from your computer...", action: openLocal }, { label: "Add Folder...", action: addFolder }, { label: "Add MRL...", action: openNetwork }, { separator: true },
        { label: "Open Playlist...", action: () => openPlaylist() }, { label: "Save Playlist...", action: savePlaylist }, { separator: true },
        { label: "Delete selection", shortcut: "Del", action: del }, { label: "Clear playlist", action: clear }, { separator: true },
        { label: "Close", action: () => plWin.close() },
      ],
      Sort: [{ label: "Sort by title", action: sortBy }, { label: "Randomize", action: shuffle }],
    });
    const bar = el("div", { class: "vlc-pl-bar" }, button("Add", openFile), button("Delete", del), button("Clear", clear), button(loop ? "Repeat: on" : "Repeat: off", (e) => { loop = !loop; st.loop = loop; saveSt(); e.target.textContent = loop ? "Repeat: on" : "Repeat: off"; }), button(random ? "Random: on" : "Random: off", (e) => { random = !random; st.random = random; saveSt(); e.target.textContent = random ? "Random: on" : "Random: off"; }), count);
    plWin.setContent(pm, body, bar);
    plWin.el.addEventListener("keydown", (e) => { if (e.key === "Delete") del(); });
    plWin.onClose = () => { plWin = null; drawPl = () => {}; return true; };
    drawPl();
  };

  // ---------- adjustments and effects (equalizer, video effects, synchronization) ----------
  const showEffects = (tab = "eq") => {
    if (fxWin && !fxWin.closed) { fxWin.focus(); fxWin.__tab?.(tab); return; }
    fxWin = ctx.wm.create({ title: "Adjustments and Effects", icon: "vlc", width: 440, height: 330, x: 260, y: 100, appId: "vlc-effects", resizable: false, maximizable: false, minimizable: false });
    const pages = {}, tabsBar = el("div", { class: "vlc-fx-tabs" });
    const show = (k) => { Object.entries(pages).forEach(([n, pg]) => (pg.style.display = n === k ? "" : "none")); [...tabsBar.children].forEach((b) => b.classList.toggle("on", b.dataset.k === k)); };
    const mkTab = (k, label) => { const b = el("button", { type: "button", class: "vlc-fx-tab", text: label }); b.dataset.k = k; b.addEventListener("click", () => show(k)); tabsBar.append(b); };
    const slider = (min, max, val, on, vertical = false) => { const r = el("input", { type: "range", min: String(min), max: String(max), value: String(val), class: vertical ? "vlc-eqs" : "" }); r.addEventListener("input", () => on(+r.value)); return r; };
    // equalizer
    const onBox = el("input", { type: "checkbox", checked: eq.on }), sliders = [];
    const eqChanged = () => { saveEq(ctx, eq); applyVolume(); };
    onBox.addEventListener("change", () => { eq.on = onBox.checked; eqChanged(); if (eq.on && !chain?.ok && video.src && !blobUrl) setStatus("The equalizer works with local files and Docs files only."); });
    const preset = el("select", {}, ...Object.keys(EQ_PRESETS).map((n) => el("option", { value: n, text: n })));
    preset.value = EQ_PRESETS[eq.preset] ? eq.preset : "Flat";
    const pre = slider(-20, 20, eq.preamp, (v) => { eq.preamp = v; preLab.textContent = v + " dB"; eqChanged(); }, true), preLab = el("span", { class: "vlc-eql", text: eq.preamp + " dB" });
    const cols = [el("div", { class: "vlc-eqc" }, pre, preLab, el("span", { class: "vlc-eql", text: "Preamp" }))];
    EQ_FREQS.forEach((f, i) => { const lab = el("span", { class: "vlc-eql", text: eq.bands[i] + " dB" }); const sl = slider(-20, 20, eq.bands[i], (v) => { eq.bands[i] = v; eq.preset = "Custom"; lab.textContent = v + " dB"; eqChanged(); }, true); sliders.push([sl, lab]); cols.push(el("div", { class: "vlc-eqc" }, sl, lab, el("span", { class: "vlc-eql", text: EQ_LABELS[i] }))); });
    preset.addEventListener("change", () => { eq.preset = preset.value; eq.bands = [...EQ_PRESETS[preset.value]]; sliders.forEach(([sl, lab], i) => { sl.value = eq.bands[i]; lab.textContent = eq.bands[i] + " dB"; }); eqChanged(); });
    const spec = el("canvas", { class: "vlc-spec", width: 400, height: 40 });
    pages.eq = el("div", { class: "vlc-fx-page" }, el("div", { class: "vlc-fx-row" }, el("label", {}, onBox, " Enable"), el("label", { text: "Preset: " }), preset), el("div", { class: "vlc-eqrow" }, ...cols), spec);
    // video
    const vrow = (label, key, min, max) => { const out = el("span", { class: "vlc-fx-val", text: String(st.fx[key]) }); return el("div", { class: "vlc-fx-row" }, el("span", { class: "vlc-fx-lab", text: label }), slider(min, max, st.fx[key], (v) => { st.fx[key] = v; out.textContent = String(v); applyFx(); saveSt(); }), out); };
    pages.video = el("div", { class: "vlc-fx-page" }, vrow("Brightness", "brightness", 20, 200), vrow("Contrast", "contrast", 20, 200), vrow("Saturation", "saturate", 0, 300), vrow("Hue", "hue", 0, 360), el("div", { class: "vlc-fx-row" }, button("Reset", () => { st.fx = { brightness: 100, contrast: 100, saturate: 100, hue: 0 }; applyFx(); saveSt(); fxWin.close(); showEffects("video"); })));
    // synchronization
    const dly = el("input", { type: "number", step: "0.1", value: String(subDelay), class: "vlc-fx-num" }); dly.addEventListener("input", () => { subDelay = parseFloat(dly.value) || 0; showSub(); });
    pages.sync = el("div", { class: "vlc-fx-page" }, el("div", { class: "vlc-fx-row" }, el("span", { class: "vlc-fx-lab", text: "Subtitle track synchronization (s)" }), dly), el("div", { class: "vlc-fx-row vlc-fx-hint", text: "Positive values show the subtitles later; negative values show them earlier." }));
    mkTab("eq", "Equalizer"); mkTab("video", "Video Effects"); mkTab("sync", "Synchronization");
    fxWin.setContent(tabsBar, ...Object.values(pages));
    fxWin.__tab = show; show(tab);
    const g = spec.getContext("2d"); let raf = 0;
    const loop2 = () => { if (!fxWin || fxWin.closed) return; const lv = chain?.levels(); g.fillStyle = "#000"; g.fillRect(0, 0, 400, 40); if (lv) { g.fillStyle = "#e86a00"; for (let i = 0; i < 40; i++) { const h = (lv[i * 2] / 255) * 40; g.fillRect(i * 10, 40 - h, 8, h); } } raf = requestAnimationFrame(loop2); };
    loop2();
    fxWin.onClose = () => { cancelAnimationFrame(raf); fxWin = null; return true; };
  };
  const showPrefs = () => {
    const pw = ctx.wm.create({ title: "Preferences", icon: "vlc", width: 380, height: 250, x: 280, y: 120, appId: "vlc-prefs", resizable: false, maximizable: false, minimizable: false });
    const cb2 = (label, key, on) => { const c = el("input", { type: "checkbox", checked: !!st[key] }); c.addEventListener("change", () => { st[key] = c.checked; on?.(c.checked); saveSt(); }); return el("label", { class: "vlc-fx-row" }, c, " " + label); };
    const vol = el("input", { type: "number", min: "0", max: "200", value: String(st.volume), class: "vlc-fx-num" }); vol.addEventListener("change", () => setVolume(+vol.value || 0));
    pw.setContent(el("div", { class: "vlc-fx-page" }, el("div", { class: "vlc-fx-hint", text: "Interface settings" }), cb2("Load subtitle files next to the video automatically", "autoSub"), cb2("Repeat the playlist", "loop", (v) => { loop = v; }), cb2("Play the playlist in random order", "random", (v) => { random = v; }), el("div", { class: "vlc-fx-row" }, el("span", { class: "vlc-fx-lab", text: "Default volume (%)" }), vol), el("div", { class: "vlc-fx-row" }, button("Close", () => pw.close(), { class: "default-button" }))));
  };

  // ---------- window ----------
  const info = (t, m) => ctx.dialogs.message(m, { title: t, icon: "info" });
  const about = () => ctx.dialogs.message("VLC media player 0.9.2\nGrishenko\n\n(c) 1996-2008 the VideoLAN team\n\nThis is a browser re-creation. Playback uses the formats your browser supports.", { title: "About VLC media player", icon: "vlc" });
  const recent = () => (st.recent?.length ? st.recent.map((r) => ({ label: r.title, action: () => add(r, true) })) : [{ label: "(empty)", disabled: true }]);
  const snapshot = async () => {
    if (!video.videoWidth) return;
    const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    const dir = DOCS.replace(/\/[^/]*$/, "") + "/My Pictures", name = `vlcsnap-${Date.now()}.png`;
    try { await ctx.fs.writeFile(`${dir}/${name}`, c.toDataURL("image/png"), { mime: "image/png", encoding: "data-url" }); setStatus(`Snapshot saved to My Pictures\\${name}`); } catch { el("a", { href: c.toDataURL("image/png"), download: name }).click(); }
  };
  const skip = (s) => { video.currentTime = Math.max(0, video.currentTime + s); };
  const mediaInfo = () => { const n = current?.path ? ctx.fs.stat(current.path) : null; info("Media Information", current ? `${current.title}\n\nLocation: ${current.path || current.url || "(local file)"}\nDuration: ${fmtTime(video.duration)}\nResolution: ${video.videoWidth ? video.videoWidth + "x" + video.videoHeight : "audio only"}${n ? "\nSize: " + Math.round((n.content || "").length * 0.75 / 1024) + " KB" : ""}\nSubtitles: ${curSub ? curSub.name : "none"}` : "No media is loaded."); };
  const subMenu = () => [
    { label: "Disable", checked: !curSub, action: () => { curSub = null; showSub(); } },
    ...tracks.map((t) => ({ label: t.name, checked: curSub === t, action: () => { curSub = t; showSub(); } })),
    { separator: true }, { label: "Add Subtitle File...", action: addSubFile }, { label: "Add Subtitle from your computer...", action: addSubLocal },
  ];
  const menus = menuBar({
    Media: () => [
      { label: "Open File...", shortcut: "Ctrl+O", action: openFile },
      { label: "Open File from your computer...", action: openLocal },
      { label: "Open Directory...", shortcut: "Ctrl+F", action: addFolder },
      { label: "Open Network Stream...", shortcut: "Ctrl+N", action: openNetwork },
      { label: "Open Recent Media", submenu: recent },
      { separator: true },
      { label: "Open Playlist...", action: () => openPlaylist() },
      { label: "Open Channel List...", action: openChannelUrl },
      { label: "Save Playlist to File...", shortcut: "Ctrl+Y", action: savePlaylist },
      { separator: true },
      { label: "Quit", shortcut: "Ctrl+Q", action: () => w.close() },
    ],
    Playback: () => [
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
      { label: "Repeat", checked: loop, action: () => { loop = !loop; st.loop = loop; saveSt(); } },
      { label: "Random", checked: random, action: () => { random = !random; st.random = random; saveSt(); } },
    ],
    Audio: () => [
      { label: "Increase Volume", shortcut: "Ctrl+Up", action: () => setVolume(st.volume + 10) },
      { label: "Decrease Volume", shortcut: "Ctrl+Down", action: () => setVolume(st.volume - 10) },
      { label: "Mute", shortcut: "M", checked: muted, action: () => { muted = !muted; applyVolume(); } },
      { separator: true },
      { label: "Equalizer...", action: () => showEffects("eq") },
    ],
    Video: () => [
      { label: "Fullscreen", shortcut: "F", action: fullscreen },
      { separator: true },
      { label: "Subtitles Track", submenu: subMenu },
      { label: "Aspect ratio", submenu: ["default", "1:1", "4:3", "16:9", "16:10", "2.21:1"].map((a) => ({ label: a === "default" ? "Default" : a, checked: aspect === a, action: () => setAspect(a) })) },
      { label: "Video Effects...", action: () => showEffects("video") },
      { separator: true },
      { label: "Take Snapshot", shortcut: "Shift+S", disabled: !current, action: snapshot },
    ],
    View: () => [
      { label: "Playlist", shortcut: "Ctrl+L", action: showPlaylist },
      { label: "Channel List", shortcut: "Ctrl+H", action: showChannels },
      { separator: true },
      { label: "Media Information", shortcut: "Ctrl+I", disabled: !current, action: mediaInfo },
    ],
    Settings: () => [
      { label: "Effects and Filters", shortcut: "Ctrl+E", action: () => showEffects("eq") },
      { label: "Track Synchronization", action: () => showEffects("sync") },
      { separator: true },
      { label: "Preferences", shortcut: "Ctrl+P", action: showPrefs },
    ],
    Help: [
      { label: "Help", shortcut: "F1", action: () => info("VLC media player Help", "Use Media > Open File... to play a file from the virtual disk, or Open File from your computer. Subtitles (.srt/.vtt) next to a video load automatically, or use Video > Subtitles Track. Settings > Effects and Filters opens the equalizer.") },
      { separator: true },
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
    el("span", { class: "vlc-grp g2" }, cb("video", "Fullscreen", fullscreen), cb("list", "Show playlist", showPlaylist), cb("tv", "Channel list", showChannels), cb("sub", "Subtitles", (e) => { const r = e.currentTarget.getBoundingClientRect(); popup(subMenu(), r.left, r.bottom, {}); }), cb("eq", "Show extended settings", () => showEffects("eq"))),
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
  video.addEventListener("error", () => { if (!hls && video.getAttribute("src")) { setStatus("Stopped"); err(`VLC is unable to open the MRL '${current?.url || current?.path || current?.title}'.\n\nThe format is not supported by this browser.`); } });
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
    else if (e.ctrlKey && k === "e") { e.preventDefault(); showEffects("eq"); } else if (e.ctrlKey && k === "o") { e.preventDefault(); openFile(); } else if (e.ctrlKey && k === "l") { e.preventDefault(); showPlaylist(); }
  });
  const prevClose = w.onClose;
  w.onClose = () => { try { video.pause(); if (blobUrl) URL.revokeObjectURL(blobUrl); if (plWin && !plWin.closed) plWin.close(); if (chWin && !chWin.closed) chWin.close(); } catch { /* ignore */ } return prevClose ? prevClose() : true; };
  applyVolume(); applyFx();
  if (path && ctx.fs.exists(path)) { if (/\.(m3u8?|pls)$/i.test(path)) { openPlaylist(path); showPlaylist(); } else add(fileEntry(path), true); }
  return w;
}
