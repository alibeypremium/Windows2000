/**
 * Canvas implementations of the Windows 2000 screen savers found on the ISO
 * (ss3dfo, ssflwbox, ssmaze, sspipes, sstext3d, ssbezier, ssmarque, ssmyst,
 * ssstars, scrnsave). The behaviour is re-created in 2D canvas: the OpenGL ones
 * are software-projected approximations, the 2D ones follow the originals.
 * Names are the string-table titles of the .scr files.
 */
export const SAVER_LIST = [
  ["none", "(None)"],
  ["flowerbox", "3D FlowerBox (OpenGL)"],
  ["flyingobjects", "3D Flying Objects (OpenGL)"],
  ["maze", "3D Maze (OpenGL)"],
  ["pipes", "3D Pipes (OpenGL)"],
  ["text3d", "3D Text (OpenGL)"],
  ["beziers", "Beziers"],
  ["blank", "Blank Screen"],
  ["marquee", "Marquee Display"],
  ["mystify", "Mystify"],
  ["starfield", "Starfield Simulation"],
];
export const SAVER_DEFAULTS = {
  mystify: { shape: "Polygon", lines: 2, active: true, twoColors: true, clear: false },
  beziers: { length: 5, width: 3, speed: 50 },
  starfield: { speed: 50, count: 100 },
  marquee: { text: "Windows 2000", centered: true, speed: 50, bg: "Black" },
  text3d: { text: "Windows 2000", clock: false, size: 50, speed: 50, spin: "See-Saw" },
  flyingobjects: { style: "Windows Logo", cycle: true, smooth: true },
  flowerbox: { shape: "Cube", spin: true, bloom: true, twoSided: true },
  pipes: { multiple: false, joint: "Elbow", flex: false },
  maze: { size: 50, overlay: false },
};
const rnd = (a, b) => a + Math.random() * (b - a);
const hsl = (h, l = 55) => `hsl(${h % 360} 90% ${l}%)`;

/** Start saver `type` on `canvas`; returns stop(). `o` = option overrides. */
export function startSaver(type, canvas, o = {}) {
  const opt = { ...SAVER_DEFAULTS[type], ...o };
  const c = canvas.getContext("2d");
  const W = () => canvas.width, H = () => canvas.height;
  let raf = 0, t = 0, last = performance.now();
  const fade = (a) => { c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(0, 0, W(), H()); };
  const black = () => { c.fillStyle = "#000"; c.fillRect(0, 0, W(), H()); };
  black();
  let frame;

  if (type === "mystify") {
    // Two bouncing polygons (4 vertices) with a trail of the last N positions.
    const n = Math.max(1, opt.lines) * 6;
    const mk = (hue) => ({ hue, pts: Array.from({ length: 4 }, () => ({ x: rnd(0, W()), y: rnd(0, H()), vx: rnd(2, 5) * (Math.random() < .5 ? -1 : 1), vy: rnd(2, 5) * (Math.random() < .5 ? -1 : 1) })), trail: [] });
    const polys = [mk(300), mk(180)].slice(0, opt.active ? 2 : 1);
    frame = () => {
      black();
      polys.forEach((p, k) => {
        p.pts.forEach((q) => { q.x += q.vx; q.y += q.vy; if (q.x < 0 || q.x > W()) q.vx *= -1; if (q.y < 0 || q.y > H()) q.vy *= -1; });
        p.trail.push(p.pts.map((q) => ({ x: q.x, y: q.y })));
        if (p.trail.length > n) p.trail.shift();
        p.hue += opt.twoColors ? 0 : 1.5;
        p.trail.forEach((poly, i) => {
          c.strokeStyle = opt.twoColors ? (k ? "#00ffff" : "#ff00ff") : hsl(p.hue + i * 6, 55);
          c.globalAlpha = 0.25 + (0.75 * i) / p.trail.length;
          c.beginPath();
          poly.forEach((q, j) => (j ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
          c.closePath();
          c.stroke();
        });
        c.globalAlpha = 1;
      });
    };
  } else if (type === "beziers") {
    const loops = Math.max(1, Math.min(10, opt.length)), repeat = Math.max(1, Math.min(100, opt.width));
    const mkp = () => [0, 1, 2, 3].map(() => ({ x: rnd(0, W()), y: rnd(0, H()), vx: rnd(-6, 6), vy: rnd(-6, 6) }));
    const curves = [];
    let cur = mkp(), hue = 0, step = 0;
    frame = () => {
      cur.forEach((q) => { q.x += q.vx; q.y += q.vy; if (q.x < 0 || q.x > W()) q.vx *= -1; if (q.y < 0 || q.y > H()) q.vy *= -1; });
      curves.push({ p: cur.map((q) => ({ x: q.x, y: q.y })), h: (hue += 4) });
      if (curves.length > loops * 2) curves.shift();
      black();
      curves.forEach((k, i) => {
        c.strokeStyle = hsl(k.h, 55);
        c.globalAlpha = 0.3 + (0.7 * i) / curves.length;
        c.beginPath();
        c.moveTo(k.p[0].x, k.p[0].y);
        c.bezierCurveTo(k.p[1].x, k.p[1].y, k.p[2].x, k.p[2].y, k.p[3].x, k.p[3].y);
        c.stroke();
      });
      c.globalAlpha = 1;
      if (++step % repeat === 0) cur = mkp();
    };
  } else if (type === "starfield") {
    const n = Math.max(10, Math.min(200, opt.count)), sp = 1 + opt.speed / 18;
    const stars = Array.from({ length: n }, () => ({ x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.05, 1) }));
    frame = () => {
      black();
      for (const s of stars) {
        s.z -= 0.004 * sp;
        if (s.z <= 0.02) Object.assign(s, { x: rnd(-1, 1), y: rnd(-1, 1), z: 1 });
        const k = 1 / s.z, x = W() / 2 + s.x * k * W() * 0.12, y = H() / 2 + s.y * k * H() * 0.12;
        const v = Math.min(255, Math.floor(255 * (1 - s.z) + 60)), sz = Math.max(1, Math.round((1 - s.z) * 3));
        c.fillStyle = `rgb(${v},${v},${v})`;
        c.fillRect(x, y, sz, sz);
      }
    };
  } else if (type === "marquee") {
    const bgs = { Black: "#000", Red: "#f00", Green: "#0f0", Blue: "#00f", Yellow: "#ff0", White: "#fff", Cyan: "#0ff", Magenta: "#f0f" };
    let x = W(), y = H() / 2;
    frame = () => {
      c.fillStyle = bgs[opt.bg] || "#000"; c.fillRect(0, 0, W(), H());
      const size = Math.round(H() / 7);
      c.font = `${size}px Tahoma, sans-serif`;
      c.fillStyle = "#fff"; c.textBaseline = "middle";
      const wd = c.measureText(opt.text).width;
      x -= 2 + opt.speed / 12;
      if (x < -wd) { x = W(); if (!opt.centered) y = rnd(size, H() - size); }
      c.fillText(opt.text, x, opt.centered ? H() / 2 : y);
    };
  } else if (type === "text3d") {
    frame = () => {
      black();
      const label = opt.clock ? new Date().toLocaleTimeString("en-US") : opt.text;
      const a = t * (0.4 + opt.speed / 60);
      const rot = opt.spin === "None" ? 0 : opt.spin === "See-Saw" ? Math.sin(a) * 1.2 : opt.spin === "Wobble" ? Math.sin(a) * 0.6 : a;
      const size = H() * (0.1 + opt.size / 400);
      c.save();
      c.translate(W() / 2, H() / 2);
      c.font = `bold ${size}px Tahoma, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      const sx = Math.cos(rot), depth = 12;
      for (let d = depth; d >= 0; d--) {
        c.save(); c.scale(sx || 0.001, 1); c.fillStyle = d ? `rgb(0,${40 + d * 4},${120 + d * 8})` : "#9ec7ff"; c.fillText(label, d * 0.8 * Math.sign(sx || 1), -d * 0.5); c.restore();
      }
      c.restore();
    };
  } else if (type === "flyingobjects") {
    const objs = Array.from({ length: 4 }, (_, i) => ({ z: i * 0.25 + 0.1, x: rnd(-0.5, 0.5), y: rnd(-0.3, 0.3), a: rnd(0, 6) }));
    frame = () => {
      black();
      for (const o of objs) {
        o.z -= 0.004; o.a += 0.03;
        if (o.z < 0.05) Object.assign(o, { z: 1, x: rnd(-0.5, 0.5), y: rnd(-0.3, 0.3) });
        const k = 1 / o.z, cx = W() / 2 + o.x * k * W() * 0.2, cy = H() / 2 + o.y * k * H() * 0.2, s = Math.min(W(), H()) * 0.06 * k;
        // Windows flag: four coloured panes, waving and rotating about Y
        const cols = ["#f25022", "#7fba00", "#00a4ef", "#ffb900"];
        for (let i = 0; i < 4; i++) {
          const qx = i % 2, qy = i >> 1;
          c.save(); c.translate(cx, cy); c.rotate(Math.sin(o.a) * 0.3); c.scale(Math.cos(o.a * 0.7 + qx * 0.3), 1);
          c.fillStyle = opt.cycle ? hsl(o.a * 40 + i * 70, 50) : cols[i];
          c.fillRect((qx - 1) * s * 0.55, (qy - 1) * s * 0.55 + Math.sin(o.a * 2 + qx) * s * 0.05, s * 0.5, s * 0.5);
          c.restore();
        }
      }
    };
  } else if (type === "flowerbox") {
    frame = () => {
      black();
      const a = t * 0.9, b = t * 0.6, s = Math.min(W(), H()) * 0.28 * (opt.bloom ? 0.8 + 0.25 * Math.sin(t) : 1);
      const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([x, y, z]) => {
        let y1 = y * Math.cos(a) - z * Math.sin(a), z1 = y * Math.sin(a) + z * Math.cos(a);
        let x1 = x * Math.cos(b) + z1 * Math.sin(b), z2 = -x * Math.sin(b) + z1 * Math.cos(b);
        const p = 3 / (3 + z2 * 0.5); return { x: W() / 2 + x1 * s * p, y: H() / 2 + y1 * s * p, z: z2 };
      });
      const F = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];
      F.map((f, i) => ({ f, i, z: f.reduce((m, k) => m + V[k].z, 0) })).sort((p, q) => q.z - p.z).forEach(({ f, i }) => {
        c.fillStyle = hsl(i * 60 + t * 30, 45); c.strokeStyle = "#000";
        c.beginPath(); f.forEach((k, j) => (j ? c.lineTo(V[k].x, V[k].y) : c.moveTo(V[k].x, V[k].y))); c.closePath(); c.fill(); c.stroke();
      });
    };
  } else if (type === "pipes") {
    // Isometric pipes growing along a grid, new pipe in a fresh colour when stuck.
    const G = 14, cell = Math.max(18, Math.floor(Math.min(W(), H()) / G));
    const cols = Math.floor(W() / cell), rows = Math.floor(H() / cell);
    let grid = new Set(), x, y, dx, dy, hue, n;
    const reset = () => { x = Math.floor(rnd(0, cols)); y = Math.floor(rnd(0, rows)); dx = 1; dy = 0; hue = rnd(0, 360); n = 0; if (grid.size > cols * rows * 0.35) { grid = new Set(); black(); } };
    reset();
    frame = () => {
      for (let k = 0; k < 2; k++) {
        if (Math.random() < 0.25) { [dx, dy] = dx ? [0, Math.random() < .5 ? 1 : -1] : [Math.random() < .5 ? 1 : -1, 0]; }
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || grid.has(nx + "," + ny) || n > 40) { reset(); continue; }
        const px = x * cell + cell / 2, py = y * cell + cell / 2, qx = nx * cell + cell / 2, qy = ny * cell + cell / 2;
        const g = c.createLinearGradient(px, py - cell * .2, px, py + cell * .2); g.addColorStop(0, hsl(hue, 75)); g.addColorStop(.5, hsl(hue, 45)); g.addColorStop(1, hsl(hue, 20));
        c.strokeStyle = g; c.lineWidth = cell * 0.32; c.lineCap = "round";
        c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke();
        if (opt.joint !== "Elbow") { c.fillStyle = hsl(hue, 50); c.beginPath(); c.arc(qx, qy, cell * 0.24, 0, 7); c.fill(); }
        grid.add(nx + "," + ny); x = nx; y = ny; n++;
      }
    };
  } else if (type === "maze") {
    // Small raycast maze walked by a wandering viewer (original: textured 3D maze).
    const M = ["##########","#........#","#.##.###.#","#.#..#...#","#.#.##.#.#","#...#..#.#","###.#.##.#","#...#....#","#.#####.##","#........#","##########"].map((r) => r.split(""));
    let px = 1.5, py = 1.5, ang = 0, tgt = 0;
    const wall = (x, y) => M[Math.floor(y)]?.[Math.floor(x)] !== ".";
    frame = () => {
      const w = W(), h = H();
      c.fillStyle = "#5a4a3a"; c.fillRect(0, 0, w, h / 2); c.fillStyle = "#3a3a3a"; c.fillRect(0, h / 2, w, h / 2);
      const cols = Math.floor(w / 3);
      for (let i = 0; i < cols; i++) {
        const ra = ang + (i / cols - 0.5) * 1.05; let d = 0;
        while (d < 20 && !wall(px + Math.cos(ra) * d, py + Math.sin(ra) * d)) d += 0.04;
        const dd = d * Math.cos(ra - ang), lh = Math.min(h, (h * 0.7) / (dd + 0.01)), sh = Math.max(40, 220 - dd * 26);
        c.fillStyle = `rgb(${sh},${sh * 0.55 | 0},${sh * 0.4 | 0})`; c.fillRect(i * 3, (h - lh) / 2, 3, lh);
      }
      const ahead = (a, d) => wall(px + Math.cos(a) * d, py + Math.sin(a) * d);
      if (Math.abs(Math.atan2(Math.sin(tgt - ang), Math.cos(tgt - ang))) < 0.05) {
        if (ahead(tgt, 0.8)) {
          const opts = [0, 1, 2, 3].map((k) => tgt + (k * Math.PI) / 2).filter((a2) => !ahead(a2, 0.8));
          const fwd = opts.filter((a2) => Math.abs(Math.atan2(Math.sin(a2 - tgt - Math.PI), Math.cos(a2 - tgt - Math.PI))) > 0.1);
          const pick = (fwd.length ? fwd : opts)[Math.floor(Math.random() * (fwd.length || opts.length))];
          tgt = pick ?? tgt + Math.PI;
        } else { px += Math.cos(tgt) * 0.05; py += Math.sin(tgt) * 0.05; }
      }
      const da = Math.atan2(Math.sin(tgt - ang), Math.cos(tgt - ang)); ang += Math.max(-0.06, Math.min(0.06, da));
    };
  } else { // blank
    frame = () => {};
  }
  const loop = (now) => {
    if (!canvas.isConnected) return;
    t += (now - last) / 1000; last = now;
    frame();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
