// 3D Pinball for Windows - Space Cadet. The table logic is the open-source reimplementation
// (pinball-wasm/, compiled to WebAssembly); PINBALL.DAT and the sounds come from the Windows 2000 CD.
import { el, separator } from "../ui/index.js";

const BASE = "/assets/games/pinball/";
const SOUNDS = "sound1 sound104 sound105 sound108 sound111 sound112 sound12 sound13 sound131 sound136 sound14 sound16 sound17 sound18 sound181 sound19 sound20 sound21 sound22 sound24 sound240 sound243 sound25 sound26 sound27 sound28 sound29 sound3 sound30 sound34 sound35 sound36 sound38 sound39 sound4 sound42 sound43 sound45 sound49 sound49d sound5 sound50 sound528 sound53 sound54 sound55 sound560 sound563 sound57 sound58 sound6 sound65 sound68 sound7 sound713 sound735 sound8 sound827 sound9 sound999".split(" ");
let shared = null;

async function loadResources() {
  if (shared) return shared;
  const fetchBuf = async (n) => (await fetch(BASE + n)).arrayBuffer();
  const names = ["pinball.dat", ...SOUNDS.map((n) => n + ".wav")];
  const [wasm, ...bufs] = await Promise.all([
    fetch(BASE + "pinball.wasm").then((r) => r.arrayBuffer()),
    ...names.map((n) => fetchBuf(n).catch(() => null)),
  ]);
  const files = new Map();
  names.forEach((n, i) => bufs[i] && files.set(n, new Uint8Array(bufs[i])));
  shared = { module: await WebAssembly.compile(wasm), files };
  return shared;
}

export async function openPinball(ctx) {
  const w = ctx.wm.create({ title: "3D Pinball for Windows - Space Cadet", icon: "pinball", width: 608, height: 467, appId: "pinball" });
  const canvas = el("canvas", { width: 600, height: 416, tabindex: "0", style: "display:block;background:#000;outline:none" });
  const c2 = canvas.getContext("2d");
  const root = el("div", { style: "background:#000;width:100%;height:100%;overflow:hidden" }, canvas);
  w.setContent(root);

  let res;
  try { res = await loadResources(); } catch (e) {
    ctx.dialogs.message("Could not load game data.\n" + e.message, { title: "3D Pinball for Windows", icon: "error" });
    w.close();
    return w;
  }

  const store = ctx.settings.get("pinball") || {};
  const save = () => ctx.settings.set("pinball", store);
  let inst, mem, alive = true, textboxes = [];
  const dec = new TextDecoder();
  const cstr = (p) => { const u = new Uint8Array(mem.buffer); let e = p; while (u[e]) e++; return dec.decode(u.subarray(p, e)); };
  const lower = (s) => s.replace(/^[./]+/, "").toLowerCase();

  // audio
  const AC = window.AudioContext || window.webkitAudioContext;
  let ac = null;
  const sndIds = [], sndBufs = [], channels = [];
  const audioLoad = (path) => {
    const name = lower(path);
    let id = sndIds.indexOf(name);
    if (id >= 0) return id;
    const data = res.files.get(name);
    if (!data) return -1;
    id = sndIds.push(name) - 1;
    ac ||= new AC();
    ac.decodeAudioData(data.slice().buffer).then((b) => (sndBufs[id] = b)).catch(() => {});
    return id;
  };
  const audioPlay = (id, ch) => {
    const b = sndBufs[id];
    if (!b || !ac) return;
    if (ac.state === "suspended") ac.resume();
    try { channels[ch]?.stop(); } catch {}
    const s = ac.createBufferSource();
    s.buffer = b;
    s.connect(ac.destination);
    s.start();
    channels[ch] = s;
  };

  // WASI: a tiny read-only file system
  const fds = new Map();
  let nextFd = 4;
  const view = () => new DataView(mem.buffer);
  const wasi = {
    fd_prestat_get: (fd, buf) => (fd === 3 ? (view().setUint8(buf, 0), view().setUint32(buf + 4, 1, true), 0) : 8),
    fd_prestat_dir_name: (fd, p, n) => { new Uint8Array(mem.buffer)[p] = 47; return 0; },
    fd_fdstat_get: (fd, buf) => {
      const v = view();
      v.setUint8(buf, fd === 3 ? 3 : fds.has(fd) ? 4 : 2);
      v.setUint16(buf + 2, 0, true);
      v.setBigUint64(buf + 8, 0xffffffffffffffffn, true);
      v.setBigUint64(buf + 16, 0xffffffffffffffffn, true);
      return 0;
    },
    fd_fdstat_set_flags: () => 0,
    fd_close: (fd) => (fds.delete(fd), 0),
    path_open: (dir, df, p, n, of, rb, ri, ff, out) => {
      const name = lower(dec.decode(new Uint8Array(mem.buffer, p, n)));
      const data = res.files.get(name);
      if (!data) return 44;
      fds.set(nextFd, { data, pos: 0 });
      view().setUint32(out, nextFd++, true);
      return 0;
    },
    fd_read: (fd, iov, cnt, outp) => {
      const f = fds.get(fd);
      if (!f) return 8;
      const v = view(), u = new Uint8Array(mem.buffer);
      let total = 0;
      for (let i = 0; i < cnt; i++) {
        const ptr = v.getUint32(iov + i * 8, true), len = v.getUint32(iov + i * 8 + 4, true);
        const k = Math.min(len, f.data.length - f.pos);
        u.set(f.data.subarray(f.pos, f.pos + k), ptr);
        f.pos += k; total += k;
        if (k < len) break;
      }
      v.setUint32(outp, total, true);
      return 0;
    },
    fd_seek: (fd, off, whence, outp) => {
      const f = fds.get(fd);
      if (!f) return 8;
      const o = Number(off);
      f.pos = whence === 0 ? o : whence === 1 ? f.pos + o : f.data.length + o;
      view().setBigUint64(outp, BigInt(f.pos), true);
      return 0;
    },
    fd_write: (fd, iov, cnt, outp) => {
      const v = view();
      let total = 0;
      for (let i = 0; i < cnt; i++) total += v.getUint32(iov + i * 8 + 4, true);
      v.setUint32(outp, total, true);
      return 0;
    },
    proc_exit: () => {},
  };
  const env = {
    js_audio_load: (p) => audioLoad(cstr(p)),
    js_audio_play: audioPlay,
    js_audio_halt: (ch) => { try { channels[ch]?.stop(); } catch {} },
    js_ticks: () => performance.now(),
    js_message: (t, m) => ctx.dialogs.message(cstr(m), { title: cstr(t), icon: "error" }),
    js_setting_get: (k, out, cap) => {
      const v = store[cstr(k)];
      if (v == null) return 0;
      const b = new TextEncoder().encode(String(v));
      const n = Math.min(b.length, cap - 1);
      const u = new Uint8Array(mem.buffer);
      u.set(b.subarray(0, n), out);
      u[out + n] = 0;
      return n;
    },
    js_setting_set: (k, v) => { store[cstr(k)] = cstr(v); save(); },
    js_textbox: (id, x, y, ww, hh, t) => textboxes.push({ x, y, w: ww, h: hh, t: cstr(t) }),
  };
  inst = await WebAssembly.instantiate(res.module, { env, wasi_snapshot_preview1: wasi });
  mem = inst.exports.memory;
  inst.exports._initialize?.();
  const x = inst.exports;
  if (x.pb_start(0)) {
    ctx.dialogs.message("The .dat file is missing.", { title: "Could not load game data", icon: "error" });
    w.close();
    return w;
  }
  const W = x.pb_state(3), H = x.pb_state(4);
  canvas.width = W; canvas.height = H;
  const img = c2.createImageData(W, H);

  const draw = () => {
    const ptr = x.pb_pixels();
    if (!ptr) return;
    const src = new Uint8Array(mem.buffer, ptr, W * H * 4), dst = img.data;
    for (let i = 0; i < src.length; i += 4) {
      dst[i] = src[i + 2]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i]; dst[i + 3] = 255;
    }
    c2.putImageData(img, 0, 0);
    c2.fillStyle = "#fff";
    c2.font = "bold 13px Tahoma, sans-serif";
    c2.textBaseline = "top";
    for (const t of textboxes) c2.fillText(t.t, t.x + 2, t.y + 2, t.w - 4);
    textboxes = [];
  };

  const STEP = 1000 / 120;
  let last = performance.now(), acc = 0;
  const loop = (now) => {
    if (!alive) return;
    acc = Math.min(acc + now - last, STEP * 10);
    last = now;
    while (acc >= STEP) { textboxes = []; x.pb_frame(STEP); acc -= STEP; }
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  w.addCleanup(() => { alive = false; for (const ch of channels) try { ch?.stop(); } catch {} ac?.close(); });

  // input
  const KEYS = { Escape: 27, Enter: 13, " ": 32, ArrowUp: 0x40000052, ArrowDown: 0x40000051, ArrowLeft: 0x40000050, ArrowRight: 0x4000004f, Slash: 47 };
  const sym = (e) => {
    if (e.key.length === 1 && e.key !== " ") return e.key.toLowerCase().charCodeAt(0);
    if (/^F\d+$/.test(e.key)) return 0x40000039 + Number(e.key.slice(1));
    return KEYS[e.key] ?? 0;
  };
  const keyHandler = (down) => (e) => {
    if (e.key === "F1" || (e.key === "F4" && e.altKey)) return;
    const s = sym(e);
    if (!s) return;
    if (down && e.repeat) return e.preventDefault();
    if (down && s === 13) x.pb_command(6, 0);
    else if (s === 0x4000003b || s === 0x4000003c || s === 0x4000003e || s === 0x4000003f) { if (down) { x.pb_command(s === 0x4000003b ? 0 : s === 0x4000003c ? 1 : s === 0x4000003e ? 2 : 3, 0); e.preventDefault(); } return; }
    x.pb_key(down ? 1 : 0, s);
    e.preventDefault();
  };
  w.el.addEventListener("keydown", keyHandler(true));
  w.el.addEventListener("keyup", keyHandler(false));
  const btn = (e) => (e.button === 0 ? 1 : e.button === 1 ? 2 : 3);
  canvas.addEventListener("mousedown", (e) => { canvas.focus(); x.pb_mouse(1, btn(e)); e.preventDefault(); });
  canvas.addEventListener("mouseup", (e) => x.pb_mouse(0, btn(e)));
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.focus();

  const players = (n) => ({ label: `${n} Player${n > 1 ? "s" : ""}`, checked: x.pb_state(1) === n, action: () => x.pb_command(4, 407 + n) });
  w.setMenu({
    Game: [
      { label: "New Game", shortcut: "F2", action: () => x.pb_command(0, 0) },
      { label: "Launch Ball", shortcut: "Enter", action: () => x.pb_command(6, 0) },
      { label: "Pause/Resume Game", shortcut: "F3", action: () => x.pb_command(1, 0) },
      separator(),
      { label: "Demo", action: () => x.pb_command(7, 0) },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Options: () => [
      players(1), players(2), players(3), players(4),
      separator(),
      { label: "Sounds", shortcut: "F5", checked: !!x.pb_state(0), action: () => x.pb_command(2, 0) },
    ],
    Help: [
      { label: "Help Topics", shortcut: "F1", action: () => ctx.launch("help", { topic: "pinball" }) },
      separator(),
      { label: "About Pinball...", action: () => ctx.openAbout?.("Pinball", "pinball", "") ?? ctx.dialogs.message("3D Pinball for Windows - Space Cadet", { title: "About Pinball", icon: "pinball" }) },
    ],
  });
  return w;
}
