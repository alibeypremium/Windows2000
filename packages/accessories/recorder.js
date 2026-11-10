// Sound Recorder (sndrec32.exe): window, menus and editing functions follow the ISO resources.
import { el, separator } from "../ui/index.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { refWindow, hslider, btn } from "../control-panel/refkit.js";
import { REC_DIALOGS as D } from "./recorder-data.js";
import { encodeWav } from "./media.js";
import { basename } from "../core/index.js";

const FX = 4, FY = 22, MENU = 20;
const blobData = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
const fmt = (s) => (Math.round(s * 100) / 100).toFixed(2) + " sec.";

export function openSoundRecorder(ctx) {
  const tpl = D["100"], W = px(tpl.cx) + FX * 2 + 2, H = FY + MENU + py(tpl.cy) + FX + 4;
  const w = refWindow(ctx, { title: "Sound - Sound Recorder", icon: "recorderApp", width: W, height: H, appId: "recorder" });
  let ch = [new Float32Array(0)], rate = 11025, pos = 0, dirty = false, path = null, clip = null;
  let ac = null, src = null, startedAt = 0, startPos = 0, playing = false, rec = null, raf = 0;
  const len = () => ch[0].length;
  const secs = (n) => n / rate;
  const title = () => w.setTitle((path ? basename(path) : "Sound") + " - Sound Recorder");
  const ctxAudio = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());

  const canvas = el("canvas", { width: px(76), height: py(23) });
  const cc = canvas.getContext("2d");
  const posTxt = el("div", { class: "sr-txt" }), lenTxt = el("div", { class: "sr-txt" });
  let slider = null;
  const draw = () => {
    const cw = canvas.width, chh = canvas.height;
    cc.fillStyle = "#000"; cc.fillRect(0, 0, cw, chh);
    cc.strokeStyle = "#00ff00"; cc.beginPath();
    const n = len(), mid = chh / 2;
    if (n) {
      for (let x = 0; x < cw; x++) {
        const a = Math.floor((x / cw) * n), b = Math.max(a + 1, Math.floor(((x + 1) / cw) * n));
        let lo = 0, hi = 0;
        for (let i = a; i < b && i < n; i += Math.max(1, (b - a) >> 4)) { const v = ch[0][i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        cc.moveTo(x + 0.5, mid - hi * mid); cc.lineTo(x + 0.5, mid - lo * mid + 1);
      }
    } else { cc.moveTo(0, mid + 0.5); cc.lineTo(cw, mid + 0.5); }
    cc.stroke();
    posTxt.textContent = fmt(secs(pos));
    lenTxt.textContent = fmt(secs(n));
  };
  const setPos = (p) => { pos = Math.max(0, Math.min(len(), Math.round(p))); draw(); slider?.set?.(len() ? pos / len() : 0); };
  const tick = () => {
    if (playing) { setPos(startPos + (ctxAudio().currentTime - startedAt) * rate); if (pos >= len()) stop(); }
    else if (rec) { draw(); }
    raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (src) { try { src.onended = null; src.stop(); } catch {} src = null; }
    playing = false;
    if (rec) { rec.stream.getTracks().forEach((t) => t.stop()); rec.node.disconnect(); rec.mic.disconnect(); const chunks = rec.chunks; rec = null; ch = [concat([ch[0].subarray(0, pos), ...chunks]) ]; dirty = true; setPos(len()); }
    sync();
  };
  const concat = (parts) => { const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  const play = () => {
    if (playing || rec || !len()) return;
    if (pos >= len()) setPos(0);
    const a = ctxAudio(); a.resume();
    const buf = a.createBuffer(ch.length, len(), rate);
    ch.forEach((c, i) => buf.copyToChannel(c, i));
    src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination);
    startPos = pos; startedAt = a.currentTime;
    src.start(0, pos / rate); playing = true; sync();
  };
  const record = async () => {
    if (playing || rec) return;
    if (!navigator.mediaDevices?.getUserMedia) return ctx.dialogs.message("Sound Recorder cannot record: no microphone is available in this browser.", { title: "Sound Recorder", icon: "recorderApp" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), a = ctxAudio();
      await a.resume();
      rate = a.sampleRate;
      const mic = a.createMediaStreamSource(stream), node = a.createScriptProcessor(4096, 1, 1), chunks = [], limit = 60 * rate;
      let total = pos;
      node.onaudioprocess = (e) => {
        if (!rec) return;
        chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        total += 4096;
        ch = [concat([ch[0].subarray(0, pos), ...chunks])];
        setPos(total);
        if (total - pos >= limit) stop();
      };
      mic.connect(node); node.connect(a.destination);
      rec = { stream, node, mic, chunks };
      sync();
    } catch (e) { ctx.dialogs.message("Sound Recorder cannot record: " + (e.message || e), { title: "Sound Recorder", icon: "recorderApp" }); }
  };
  const decode = async (url) => { const buf = await (await fetch(url)).arrayBuffer(); return ctxAudio().decodeAudioData(buf); };
  const toChannels = (ab) => Array.from({ length: Math.min(2, ab.numberOfChannels) }, (_, i) => new Float32Array(ab.getChannelData(i)));
  const load = async (p) => {
    stop();
    const ab = await decode(ctx.fs.stat(p).content);
    ch = toChannels(ab); rate = ab.sampleRate; path = p; dirty = false; setPos(0); title(); draw();
  };
  const save = async (as = false) => {
    stop();
    let p = !as && path;
    if (!p) p = await ctx.dialogs.file({ mode: "save", name: path ? basename(path) : "Sound.wav", normalizeName: (n) => n.replace(/\.[^.]+$/, "") + ".wav" });
    if (!p) return false;
    await ctx.fs.writeFile(p, await blobData(encodeWav(ch.map((c) => c), rate)), { mime: "audio/wav" });
    path = p; dirty = false; title(); return true;
  };
  const confirmDiscard = async () => {
    stop();
    if (!dirty) return true;
    const c = await ctx.dialogs.message("Do you want to save changes to this sound?", { title: "Sound Recorder", buttons: ["Yes", "No", "Cancel"] });
    return c === "Yes" ? save() : c === "No";
  };
  const edit = (fn) => { stop(); ch = ch.map(fn); dirty = true; setPos(Math.min(pos, len())); draw(); };
  const pickWav = () => ctx.dialogs.file({ filter: (n) => /\.wav$/i.test(n.name) || n.mime?.startsWith("audio/") });
  const fileChannels = async (p) => toChannels(await decode(ctx.fs.stat(p).content));
  const insertChannels = (other, mix) => {
    stop();
    ch = ch.map((c, i) => {
      const o = other[Math.min(i, other.length - 1)];
      if (mix) { const out = new Float32Array(Math.max(c.length, pos + o.length)); out.set(c); for (let k = 0; k < o.length; k++) out[pos + k] += o[k]; return out; }
      return concat([c.subarray(0, pos), o, c.subarray(pos)]);
    });
    dirty = true; draw();
  };
  const clamp = (c) => c.map((v) => Math.max(-1, Math.min(1, v)));
  const resample = (c, f) => { const out = new Float32Array(Math.max(1, Math.floor(c.length / f))); for (let i = 0; i < out.length; i++) out[i] = c[Math.min(c.length - 1, Math.floor(i * f))]; return out; };

  const props = () => {
    const secsTxt = secs(len()).toFixed(2) + " sec.", bytes = len() * ch.length * 2;
    const d = dialogFromTemplate(ctx, D["103"], { title: "Properties for " + (path ? basename(path) : "Sound"), icon: "recorderApp", values: { 1002: path ? basename(path) : "Sound", 1003: "", 1005: `PCM ${Math.round(rate / 100) / 10} kHz, 16 Bit, ${ch.length === 1 ? "Mono" : "Stereo"}`, 1011: "[untitled]" }, labels: { 1004: secsTxt, 1012: bytes + " bytes" }, on: { 1000: () => d.close() } });
    const bw = px(230) + 8, by = py(218) + 22 - 28;
    d.place(btn(bw - 8 - 150 - 6, by, 72, 23, "OK", { def: true, onclick: () => d.close() }), btn(bw - 8 - 72, by, 72, 23, "Cancel", { onclick: () => d.close() }));
    return d;
  };
  const newSound = async () => { if (!(await confirmDiscard())) return; ch = [new Float32Array(0)]; path = null; dirty = false; setPos(0); title(); };
  const aboutDlg = () => ctx.dialogs.message("Sound Recorder\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1991-1999 Microsoft Corp.", { title: "About Sound Recorder", icon: "recorderApp" });
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  w.setMenu({
    File: () => [
      { label: "New", action: newSound },
      { label: "Open...", action: async () => { const p = await pickWav(); if (p && (await confirmDiscard())) await load(p); } },
      { label: "Save", disabled: !dirty && !len(), action: () => save() },
      { label: "Save As...", action: () => save(true) },
      { label: "Revert...", disabled: !path || !dirty, action: async () => { if (await ctx.dialogs.confirm("Revert to the last saved version of " + basename(path) + "?", "Sound Recorder")) await load(path); } },
      { label: "Properties", action: props },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      { label: "Copy", shortcut: "Ctrl+C", action: () => (clip = ch.map((c) => new Float32Array(c))) },
      { label: "Paste Insert", shortcut: "Ctrl+V", disabled: !clip, action: () => insertChannels(clip, false) },
      { label: "Paste Mix", disabled: !clip, action: () => insertChannels(clip, true) },
      separator(),
      { label: "Insert File...", action: async () => { const p = await pickWav(); if (p) insertChannels(await fileChannels(p), false); } },
      { label: "Mix with File...", action: async () => { const p = await pickWav(); if (p) insertChannels(await fileChannels(p), true); } },
      separator(),
      { label: "Delete Before Current Position", disabled: pos <= 0, action: () => { const p = pos; edit((c) => c.slice(p)); setPos(0); } },
      { label: "Delete After Current Position", disabled: pos >= len(), action: () => { const p = pos; edit((c) => c.slice(0, p)); } },
      separator(),
      { label: "Audio Properties", action: () => ctx.launch("control", { page: "sounds" }) },
    ],
    Effects: [
      { label: "Increase Volume (by 25%)", action: () => edit((c) => clamp(c.map((v) => v * 1.25))) },
      { label: "Decrease Volume", action: () => edit((c) => c.map((v) => v * 0.8)) },
      separator(),
      { label: "Increase Speed (by 100%)", action: () => edit((c) => resample(c, 2)) },
      { label: "Decrease Speed", action: () => edit((c) => resample(c, 0.5)) },
      separator(),
      { label: "Add Echo", action: () => edit((c) => { const d = Math.floor(rate * 0.2), out = new Float32Array(c.length + d * 3); out.set(c); for (let k = 1; k <= 3; k++) for (let i = 0; i < c.length; i++) out[i + d * k] += c[i] * Math.pow(0.5, k); return clamp(out); }) },
      { label: "Reverse", action: () => edit((c) => new Float32Array(c).reverse()) },
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "sndrec" }) },
      separator(),
      { label: "About Sound Recorder", action: aboutDlg },
    ],
  });
  // Controls from the dialog template
  const OX = FX, OY = FY + MENU, c = (id) => tpl.controls.find((x) => x.id === id);
  const at = (id, node) => { const t = c(id); Object.assign(node.style, { position: "absolute", left: OX + px(t.x) + "px", top: OY + py(t.y) + "px", width: px(t.cx) + "px", height: py(t.cy) + "px" }); return node; };
  const frame = (x, y, cx, cy) => el("div", { class: "sr-frame", style: { left: OX + px(x) + "px", top: OY + py(y) + "px", width: px(cx) + "px", height: py(cy) + "px" } });
  w.place(frame(6, 4, 40, 23), frame(134, 4, 40, 23));
  w.place(el("div", { class: "sr-lbl", style: { left: OX + px(8) + "px", top: OY + py(7) + "px" }, text: "Position:" }), el("div", { class: "sr-lbl", style: { left: OX + px(136) + "px", top: OY + py(7) + "px" }, text: "Length:" }));
  w.place(at(201, posTxt), at(202, lenTxt));
  const waveFrame = el("div", { class: "sr-wave" }, canvas);
  w.place(at(203, waveFrame));
  const sc = c(204);
  slider = hslider(OX + px(sc.x), OY + py(sc.y) - 2, px(sc.cx), 0, { onchange: (v) => { if (!rec) { const was = playing; if (was) stop(); setPos(v * len()); if (was) play(); } } });
  w.place(slider);
  const mkBtn = (id, i, tip, fn) => {
    const ic = el("i", { class: "sr-ic" });
    ic.style.backgroundPosition = `${-i * 25}px 0`;
    const b = el("button", { class: "sr-btn", title: tip, onclick: fn }, ic);
    return at(id, b);
  };
  const bStart = mkBtn(205, 0, "Seek to Start", () => { const was = playing; stop(); setPos(0); if (was) play(); });
  const bEnd = mkBtn(206, 1, "Seek to End", () => { stop(); setPos(len()); });
  const bPlay = mkBtn(207, 2, "Play", play), bStop = mkBtn(208, 3, "Stop", stop), bRec = mkBtn(209, 4, "Record", record);
  w.place(bStart, bEnd, bPlay, bStop, bRec);
  function sync() {
    bPlay.disabled = !len() || playing || !!rec;
    bStop.disabled = !playing && !rec;
    bRec.disabled = playing || !!rec;
    bStart.disabled = !len(); bEnd.disabled = !len();
  }
  w.addCleanup(() => { cancelAnimationFrame(raf); stop(); ac?.close(); });
  draw(); sync(); tick();
  return w;
}
