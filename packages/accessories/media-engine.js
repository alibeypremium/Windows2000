// Shared media engine used by VLC, DivX Player, Winamp and Windows Media Player:
// one way to turn a virtual-disk file / local file / URL into a playable source, a Docs-folder scanner,
// a 10-band equalizer audio chain, and SRT/VTT subtitle support.
import { DOCS, basename, normalizePath, extension } from "../core/index.js";

export const AV_RE = /\.(mp3|wav|ogg|oga|ogv|opus|flac|m4a|aac|mp4|m4v|webm|mov|mkv|avi|wmv|wma|mid|midi)$/i;
export const isMedia = (n) => n?.type === "file" && (AV_RE.test(n.name) || /^(audio|video)\//.test(n.mime || ""));
export const fmtTime = (s) => {
  if (!isFinite(s) || s < 0) return "--:--";
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60, p2 = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p2(m)}:${p2(x)}` : `${p2(m)}:${p2(x)}`;
};

/** entry: { path } | { file } | { url } -> { url, blob } (blob URLs must be revoked by the caller). */
export async function sourceFor(ctx, e) {
  if (e.url) return { url: e.url, blob: false };
  if (e.file) return { url: URL.createObjectURL(e.file), blob: true };
  const n = ctx.fs.stat(e.path), c = n.content || "";
  if (/^data:/.test(c)) return { url: URL.createObjectURL(await (await fetch(c)).blob()), blob: true };
  throw new Error("This file does not contain playable media.");
}

/** All playable files below a folder (default: Docs), as playlist entries. */
export function mediaFiles(ctx, folder = DOCS, deep = true) {
  const out = [];
  const walk = (f) => {
    for (const n of ctx.fs.list(f)) {
      if (n.type === "folder") { if (deep) walk(n.path); } else if (isMedia(n)) out.push({ title: n.name, path: n.path });
    }
  };
  try { walk(folder); } catch { /* folder missing */ }
  return out;
}

// ---------------- equalizer ----------------
export const EQ_FREQS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_LABELS = ["60", "170", "310", "600", "1K", "3K", "6K", "12K", "14K", "16K"];
export const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], Classical: [0, 0, 0, 0, 0, 0, -4, -4, -4, -5], Club: [0, 0, 2, 3, 3, 3, 2, 0, 0, 0],
  Dance: [5, 4, 2, 0, 0, -3, -4, -4, 0, 0], "Full Bass": [5, 5, 5, 3, 1, -2, -4, -5, -5, -5], "Full Treble": [-5, -5, -5, -2, 1, 5, 8, 8, 8, 9],
  Laptop: [3, 7, 3, -2, -1, 1, 3, 6, 8, 9], "Large Hall": [6, 6, 3, 3, 0, -3, -3, -3, 0, 0], Live: [-3, 0, 2, 3, 3, 3, 2, 1, 1, 1],
  Party: [4, 4, 0, 0, 0, 0, 0, 0, 4, 4], Pop: [-1, 3, 4, 5, 3, 0, -1, -1, -1, -1], Reggae: [0, 0, -1, -4, 0, 3, 3, 0, 0, 0],
  Rock: [4, 3, -3, -4, -2, 2, 5, 6, 6, 6], Ska: [-1, -3, -3, 0, 3, 4, 6, 6, 7, 6], Soft: [3, 1, 0, -1, 0, 3, 5, 6, 7, 8],
  Techno: [4, 3, 0, -3, -3, 0, 4, 6, 6, 5], "Bass Booster": [8, 6, 4, 2, 0, 0, 0, 0, 0, 0], "Vocal Booster": [-2, -2, 0, 3, 5, 5, 3, 0, -1, -2],
};
const EQ_KEY = "mediaEq";
export const loadEq = (ctx) => Object.assign({ on: false, preamp: 0, bands: Array(10).fill(0), preset: "Flat" }, ctx.settings.get(EQ_KEY) || {});
export const saveEq = (ctx, eq) => ctx.settings.set(EQ_KEY, eq);

/**
 * Audio chain for one <video>/<audio> element: source -> preamp -> 10 peaking filters -> master gain -> analyser -> output.
 * A media element can only be attached once, so volume boost (>100 %) and the equalizer share this chain.
 * Only same-origin / blob sources can be routed (cross-origin streams would go silent), so attach() refuses others.
 */
export class AudioChain {
  constructor(media) { this.media = media; this.ok = false; }
  attach() {
    if (this.ok) { this.ac.resume(); return true; }
    if (!/^(blob:|data:)/.test(this.media.currentSrc || this.media.src || "")) return false;
    try {
      const ac = (this.ac = new (window.AudioContext || window.webkitAudioContext)());
      const src = ac.createMediaElementSource(this.media);
      this.pre = ac.createGain(); this.master = ac.createGain();
      this.filters = EQ_FREQS.map((f) => { const b = ac.createBiquadFilter(); b.type = "peaking"; b.frequency.value = f; b.Q.value = 1.1; b.gain.value = 0; return b; });
      this.analyser = ac.createAnalyser(); this.analyser.fftSize = 256;
      let node = src.connect(this.pre);
      for (const f of this.filters) node = node.connect(f);
      node.connect(this.master).connect(this.analyser).connect(ac.destination);
      this.ok = true; ac.resume(); return true;
    } catch { return false; }
  }
  apply(eq) {
    if (!this.ok) return;
    const on = !!eq.on;
    this.pre.gain.value = on ? Math.pow(10, (eq.preamp || 0) / 20) : 1;
    this.filters.forEach((f, i) => { f.gain.value = on ? eq.bands[i] || 0 : 0; });
  }
  setGain(v) { if (this.ok) { this.master.gain.value = Math.max(0.0001, v); } }
  levels() { if (!this.ok) return null; const d = new Uint8Array(this.analyser.frequencyBinCount); this.analyser.getByteFrequencyData(d); return d; }
}

// ---------------- subtitles ----------------
const toSec = (t) => { const m = /(?:(\d+):)?(\d+):(\d+)[.,](\d+)/.exec(t.trim()); return m ? (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, "0").slice(0, 3) / 1000 : NaN; };
/** Parse SRT / WebVTT / MicroDVD (.sub, 25 fps) into [{start, end, text}] */
export function parseSubs(text) {
  const src = String(text).replace(/^﻿/, "").replace(/\r/g, ""), out = [];
  if (/^\{\d+\}\{\d+\}/m.test(src)) {
    for (const l of src.split("\n")) { const m = /^\{(\d+)\}\{(\d+)\}(.*)$/.exec(l); if (m) out.push({ start: +m[1] / 25, end: +m[2] / 25, text: m[3].replace(/\|/g, "\n") }); }
    return out;
  }
  for (const block of src.split(/\n{2,}/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const ti = lines.findIndex((l) => /-->/.test(l)); if (ti < 0) continue;
    const [a, b] = lines[ti].split("-->"); const start = toSec(a), end = toSec(b.trim().split(/\s+/)[0]);
    if (isNaN(start) || isNaN(end)) continue;
    out.push({ start, end, text: lines.slice(ti + 1).join("\n").replace(/<[^>]+>/g, "").replace(/\{\\[^}]*\}/g, "") });
  }
  return out;
}
export class SubtitleTrack {
  constructor(name, cues) { this.name = name; this.cues = cues.sort((x, y) => x.start - y.start); }
  at(t) { for (const c of this.cues) { if (c.start > t) break; if (t <= c.end) return c.text; } return ""; }
}
export const SUB_RE = /\.(srt|vtt|sub)$/i;
/** Subtitle files that sit next to a video and share its base name (clip.mp4 -> clip.srt, clip.en.srt ...). */
export function siblingSubtitles(ctx, path) {
  if (!path) return [];
  const p = normalizePath(path), dir = p.slice(0, p.lastIndexOf("/")), base = basename(p).replace(/\.[^.]+$/, "").toLowerCase();
  try { return ctx.fs.list(dir).filter((n) => n.type === "file" && SUB_RE.test(n.name) && n.name.toLowerCase().startsWith(base)).map((n) => n.path); } catch { return []; }
}
export function loadSubtitleFile(ctx, path) {
  const c = ctx.fs.readFile(path);
  const text = /^data:/.test(c) ? decodeURIComponent(escape(atob(c.slice(c.indexOf(",") + 1)))) : c;
  const cues = parseSubs(text); if (!cues.length) throw new Error("No subtitles were found in this file.");
  return new SubtitleTrack(basename(path), cues);
}
export const subtitleFromFile = async (file) => { const cues = parseSubs(await file.text()); if (!cues.length) throw new Error("No subtitles were found in this file."); return new SubtitleTrack(file.name, cues); };
export { extension };
