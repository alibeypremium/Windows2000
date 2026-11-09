import { el, separator } from "../ui/index.js";
import { Minefield } from "./minefield.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { WINMINE_DIALOGS } from "./winmine-data.js";
export { Minefield } from "./minefield.js";

const LEVELS = { Beginner: [9, 9, 10], Intermediate: [16, 16, 40], Expert: [30, 16, 99] };
const ART = "/assets/games/minesweeper/";
const HEAD = 55; // y of the first mine row inside the client area
const ledIndex = (n) => 11 - n; // led.png: 9..0 are rows 2..11, 1 = blank, 0 = minus
const tileFor = (cell, game) => {
  const lost = game.over && !game.won;
  if (cell.open) return cell.mine ? 3 : 15 - cell.count;
  if (lost && cell.mine && !cell.flag) return 5;
  if (lost && cell.flag && !cell.mine) return 4;
  return cell.flag ? 1 : cell.question ? 2 : 0;
};

export function openMinesweeper(ctx) {
  const saved = ctx.settings.get("minesweeper") || {};
  const st = { level: saved.level || "Beginner", marks: saved.marks ?? true, sound: saved.sound ?? false, color: saved.color ?? true, custom: saved.custom || [9, 9, 10] };
  const best = () => ctx.settings.get("minesBest2") || { Beginner: [999, "Anonymous"], Intermediate: [999, "Anonymous"], Expert: [999, "Anonymous"] };
  const persist = () => ctx.settings.set("minesweeper", st);
  const w = ctx.wm.create({ title: "Minesweeper", icon: "minesweeper", width: 176, height: 258, appId: "minesweeper", resizable: false, maximizable: false });
  let game, timer = null, seconds = 0, running = false, lastWon = false, pressedCell = -1, chordCells = [];
  const root = el("div", { class: "ms-root" });
  const headBox = el("div", { class: "ms-box", style: { borderWidth: "2px" } });
  const fieldBox = el("div", { class: "ms-box", style: { borderWidth: "3px" } });
  const face = el("div", { class: "ms-face" });
  const mkLed = () => el("div", { class: "ms-led" }, ...[0, 1, 2].map((i) => el("i", { style: { left: 1 + i * 13 + "px", top: "1px" } })));
  const mines = mkLed(), clock = mkLed();
  root.append(headBox, fieldBox, mines, clock, face);
  let cells = [];

  const setLed = (led, n) => {
    const v = Math.max(-99, Math.min(999, n));
    const digits = v < 0 ? ["-", ...String(-v).padStart(2, "0")] : String(v).padStart(3, "0").split("");
    [...led.children].forEach((d, i) => (d.style.backgroundPosition = `0 -${(digits[i] === "-" ? 0 : ledIndex(+digits[i])) * 23}px`));
  };
  const setFace = (i) => (face.style.backgroundPosition = `0 -${i * 24}px`);
  const faceState = () => setFace(game.over ? (game.won ? 1 : 2) : 0);

  function layout() {
    const W = game.width * 16 + 24, H = HEAD + game.height * 16 + 12;
    root.style.width = W + "px";
    root.style.height = H + "px";
    const at = (n, x, y, ww, hh) => Object.assign(n.style, { left: x - 3 + "px", top: y - 3 + "px", ...(ww ? { width: ww + "px", height: hh + "px" } : {}) });
    at(headBox, 9, 9, W - 18, 37);
    at(fieldBox, 9, 52, W - 18, game.height * 16 + 6);
    at(mines, 16, 15);
    at(clock, W - 16 - 41, 15);
    at(face, Math.floor((W - 24) / 2), 15);
    w.geometry.width = W + 8;
    w.geometry.height = H + 47;
    ctx.wm.applyGeometry(w);
    cells.forEach((c) => c.remove());
    cells = game.cells.map((_, i) => {
      const c = el("div", { class: "ms-cell", style: { left: 12 - 3 + (i % game.width) * 16 + "px", top: HEAD - 3 + Math.floor(i / game.width) * 16 + "px" } });
      fieldBox.after(c);
      return c;
    });
  }
  function render() {
    game.cells.forEach((c, i) => {
      let t = tileFor(c, game);
      if (!game.over && (i === pressedCell || chordCells.includes(i)) && !c.flag && !c.open) t = c.question ? 6 : 15;
      cells[i].style.backgroundPosition = `0 -${t * 16}px`;
    });
    setLed(mines, game.mineCount - game.flags);
    setLed(clock, seconds);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  function tick() {
    seconds = Math.min(999, seconds + 1);
    setLed(clock, seconds);
    if (st.sound) ctx.sound.play("mine-tick");
  }
  function startClock() {
    if (running) return;
    running = true;
    tick();
    timer = setInterval(tick, 1000);
  }
  function newGame(cfg) {
    stop();
    running = false;
    seconds = 0;
    lastWon = false;
    pressedCell = -1;
    chordCells = [];
    const [c, r, m] = cfg || (st.level === "Custom" ? st.custom : LEVELS[st.level]);
    game = new Minefield(c, r, m);
    layout();
    setFace(0);
    render();
  }
  function finish() {
    stop();
    if (game.won) {
      setFace(1);
      if (st.sound) ctx.sound.play("mine-win");
      if (!lastWon && st.level !== "Custom") {
        lastWon = true;
        const b = best();
        if (seconds < b[st.level][0]) askName(b);
      }
    } else {
      setFace(2);
      if (st.sound) ctx.sound.play("mine-lose");
    }
  }
  function askName(b) {
    const lvl = st.level.toLowerCase();
    const d = dialogFromTemplate(ctx, WINMINE_DIALOGS[600], {
      title: "Minesweeper", appId: "minename",
      values: { 602: ctx.settings.get("minesName") || "Anonymous" },
      on: { 100: () => ok() },
    });
    d.ctl[601].textContent = `You have the fastest time\nfor ${lvl} level.\nPlease enter your name.`;
    d.ctl[601].style.whiteSpace = "pre-wrap";
    const ok = () => {
      const name = d.ctl[602].value || "Anonymous";
      ctx.settings.set("minesName", name);
      b[st.level] = [seconds, name];
      ctx.settings.set("minesBest2", b);
      d.close();
      showBest();
    };
  }
  function showBest() {
    const b = best();
    const d = dialogFromTemplate(ctx, WINMINE_DIALOGS[700], { title: "Fastest Mine Sweepers", appId: "minebest", on: { 1: () => d.close(), 707: () => { ctx.settings.set("minesBest2", { Beginner: [999, "Anonymous"], Intermediate: [999, "Anonymous"], Expert: [999, "Anonymous"] }); d.close(); showBest(); } } });
    [["Beginner", 701, 702], ["Intermediate", 703, 704], ["Expert", 705, 706]].forEach(([l, a, n]) => {
      d.ctl[a].textContent = `${b[l][0]} seconds`;
      d.ctl[n].textContent = b[l][1];
    });
  }
  function custom() {
    const [c, r, m] = st.custom;
    const d = dialogFromTemplate(ctx, WINMINE_DIALOGS[80], { title: "Custom Field", appId: "minecustom", values: { 141: r, 142: c, 143: m }, on: { 1: () => ok(), 2: () => d.close() } });
    const ok = () => {
      const h = Math.max(1, Math.min(24, +d.ctl[141].value || 9)), ww = Math.max(8, Math.min(30, +d.ctl[142].value || 9));
      const mm = Math.max(10, Math.min((h - 1) * (ww - 1), +d.ctl[143].value || 10));
      st.level = "Custom";
      st.custom = [ww, h, mm];
      persist();
      d.close();
      newGame();
    };
  }

  // Mouse handling: left press/release, right = flag, left+right or middle = chord highlight
  let left = false, rightDown = false;
  const cellAt = (e) => {
    const r = fieldBox.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - 3) / 16), y = Math.floor((e.clientY - r.top - 3) / 16);
    return x >= 0 && y >= 0 && x < game.width && y < game.height ? y * game.width + x : -1;
  };
  const press = (e) => {
    if (game.over) return;
    const i = cellAt(e);
    chordCells = [];
    pressedCell = -1;
    if (i >= 0) {
      if ((left && rightDown) || e.buttons === 4) chordCells = [i, ...game.neighbors(i)];
      else if (left) pressedCell = i;
    }
    setFace(left || rightDown ? 3 : 0);
    render();
  };
  root.addEventListener("contextmenu", (e) => e.preventDefault());
  root.addEventListener("pointerdown", (e) => {
    if (e.target === face || game.over) return;
    if (cellAt(e) < 0 && !(e.target.classList?.contains("ms-cell"))) return;
    root.setPointerCapture?.(e.pointerId);
    if (e.button === 0) left = true;
    if (e.button === 2) {
      rightDown = true;
      if (!left) {
        const i = cellAt(e);
        if (i >= 0) {
          game.flag(i, st.marks);
          render();
        }
        return;
      }
    }
    if (e.button === 1) e.preventDefault();
    press(e);
  });
  root.addEventListener("pointermove", (e) => (left || rightDown || e.buttons === 4) && press(e));
  root.addEventListener("pointerup", (e) => {
    if (game.over) return;
    const i = cellAt(e), wasChord = chordCells.length > 0 || e.button === 1;
    if (e.button === 0) left = false;
    if (e.button === 2) rightDown = false;
    if (i >= 0 && (e.button === 0 || e.button === 1 || e.button === 2) && (wasChord || (e.button === 0 && pressedCell === i))) {
      startClock();
      if (wasChord) game.chord(i);
      else game.reveal(i);
      if (game.over) finish();
    }
    if (!left && !rightDown) {
      chordCells = [];
      pressedCell = -1;
    }
    if (!game.over) setFace(0);
    render();
  });
  face.addEventListener("pointerdown", (e) => {
    setFace(4);
    const up = (ev) => {
      removeEventListener("pointerup", up);
      const r = face.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX < r.right && ev.clientY >= r.top && ev.clientY < r.bottom) newGame();
      else faceState();
    };
    addEventListener("pointerup", up);
  });

  const lvl = (name) => ({ label: name, checked: st.level === name, action: () => ((st.level = name), persist(), newGame()) });
  w.setMenu({
    Game: () => [
      { label: "New", shortcut: "F2", action: () => newGame() },
      separator(),
      lvl("Beginner"), lvl("Intermediate"), lvl("Expert"),
      { label: "Custom...", checked: st.level === "Custom", action: custom },
      separator(),
      { label: "Marks (?)", checked: st.marks, action: () => ((st.marks = !st.marks), persist()) },
      { label: "Color", checked: st.color, action: () => ((st.color = !st.color), persist(), root.style.filter = st.color ? "" : "grayscale(1)") },
      { label: "Sound", checked: st.sound, action: () => ((st.sound = !st.sound), persist()) },
      separator(),
      { label: "Best Times...", action: showBest },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Help: [
      { label: "Contents", shortcut: "F1", action: () => ctx.launch("help", { topic: "minesweeper" }) },
      { label: "Search for Help on...", action: () => ctx.launch("help", { topic: "minesweeper" }) },
      { label: "Using Help", action: () => ctx.launch("help") },
      separator(),
      { label: "About Minesweeper...", action: () => ctx.openAbout?.("Minesweeper", "minesweeper", "by Robert Donner and Curt Johnson") ?? ctx.dialogs.message("Minesweeper\nby Robert Donner and Curt Johnson", { title: "About Minesweeper", icon: "minesweeper" }) },
    ],
  });
  w.setContent(root);
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "F2") (e.preventDefault(), newGame());
    if (e.key === "F1") (e.preventDefault(), ctx.launch("help", { topic: "minesweeper" }));
  });
  w.addCleanup(stop);
  if (!st.color) root.style.filter = "grayscale(1)";
  newGame();
  w.game = () => game;
  return w;
}
