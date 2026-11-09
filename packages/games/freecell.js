import { el, separator, statusBar } from "../ui/index.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { FREECELL_DIALOGS as D } from "./cards-data.js";
import { CW, CH, cardEl, slotEl, place, drag, overlap, bounceCards, isRed } from "./cardkit.js";

const TOP = 8, ROW2 = 116, PITCH = 79;

/** Microsoft FreeCell deal: card = rank*4 + suit (suit 0..3 = clubs, diamonds, hearts, spades). */
export function dealFreeCell(n) {
  let seed = n >>> 0;
  const rand = () => ((seed = (Math.imul(seed, 214013) + 2531011) >>> 0), (seed >>> 16) & 0x7fff);
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const cols = Array.from({ length: 8 }, () => []);
  let left = 52;
  for (let i = 0; i < 52; i++) {
    const j = rand() % left;
    const c = deck[j];
    deck[j] = deck[--left];
    cols[i % 8].push({ suit: c % 4, rank: (c >> 2) + 1, up: true });
  }
  return cols;
}
const fitsTab = (c, top) => !top || (isRed(c.suit) !== isRed(top.suit) && c.rank === top.rank - 1);
const toFound = (c, p) => (p.length ? p.at(-1).suit === c.suit && c.rank === p.at(-1).rank + 1 : c.rank === 1);
const pct = (a, b) => (a + b ? Math.floor((a * 100) / (a + b)) : 0);

export function openFreeCell(ctx) {
  const saved = ctx.settings.get("freecell") || {};
  const opt = { messages: saved.messages ?? true, quick: saved.quick ?? false, dbl: saved.dbl ?? false };
  const stats = saved.stats || { won: 0, lost: 0, sw: 0, sl: 0, streak: 0, stype: "", tw: 0, tl: 0 };
  const persist = () => ctx.settings.set("freecell", { ...opt, stats });
  const w = ctx.wm.create({ title: "FreeCell", icon: "freecell", width: 648, height: 520, x: 60, y: 30, appId: "freecell", resizable: false, maximizable: false });
  const board = el("div", { class: "cd-board" });
  const bar = statusBar("", "");
  let g, num = 0, sel = null, undoStack = [], over = true, counted = true;

  const colX = (c) => 8 + c * PITCH;
  const tabY = (c, i) => ROW2 + i * (g.tab[c].length > 12 ? Math.floor(((420 - ROW2 - CH + 96) / g.tab[c].length)) : 20);
  const free = () => g.cells.filter((c) => !c).length;
  const emptyCols = () => g.tab.filter((c) => !c.length).length;
  const maxMove = (toEmpty) => (free() + 1) * 2 ** (emptyCols() - (toEmpty ? 1 : 0));
  const snap = () => structuredClone({ tab: g.tab, cells: g.cells, found: g.found });

  function newGame(n) {
    if (!over && !counted) { stats.lost++; stats.tl++; if (stats.stype === "l") stats.streak++; else (stats.stype = "l", (stats.streak = 1)); stats.sl = Math.max(stats.sl, stats.stype === "l" ? stats.streak : 0); persist(); }
    num = n || Math.floor(Math.random() * 32000) + 1;
    g = { tab: dealFreeCell(num), cells: [null, null, null, null], found: [[], [], [], []] };
    undoStack = [];
    sel = null;
    over = false;
    counted = false;
    w.setTitle(`FreeCell Game #${num}`);
    render();
  }
  function render() {
    board.replaceChildren();
    const mk = (card, x, y, z, ref) => {
      const n = cardEl(card);
      place(n, x, y, z);
      n.__ref = ref;
      if (sel && sel.card === card) n.classList.add("cd-sel");
      board.append(n);
      return n;
    };
    for (let i = 0; i < 4; i++) {
      board.append(slotEl(colX(i), TOP, "empty"));
      const c = g.cells[i];
      if (c) bindCell(mk(c, colX(i), TOP, 2, { z: "cell", i }), i);
    }
    const kx = Math.round((640 - 32) / 2) + 0;
    const king = el("img", { class: "fc-king", src: `/assets/games/freecell/${over && counted && g.found.every((p) => p.length === 13) ? "KINGSMILE" : "KINGBITMAP"}.png`, style: { left: kx + "px", top: "32px" } });
    board.append(king);
    for (let i = 0; i < 4; i++) {
      const x = colX(4 + i);
      board.append(slotEl(x, TOP, "empty"));
      g.found[i].forEach((c, k) => mk(c, x, TOP, 2 + k, { z: "found", i }));
    }
    g.tab.forEach((col, c) => {
      board.append(slotEl(colX(c), ROW2, "empty"));
      col.forEach((card, i) => bindTab(mk(card, colX(c), tabY(c, i), 2 + i, { z: "tab", c, i }), c, i));
    });
    bar.querySelector(".status-panel").textContent = `Cards Left: ${52 - g.found.reduce((s, p) => s + p.length, 0)}`;
  }
  const say = (m) => opt.messages && ctx.dialogs.message(m, { title: "FreeCell", icon: "warning" });
  function validRun(col, i) {
    for (let k = i; k < col.length - 1; k++) if (!fitsTab(col[k + 1], col[k])) return false;
    return true;
  }
  async function move(from, to) {
    // from: {z:'cell',i}|{z:'tab',c,i}; to: {z:'cell',i}|{z:'found',i}|{z:'tab',c}
    let cards = from.z === "cell" ? [g.cells[from.i]] : g.tab[from.c].slice(from.i);
    if (!cards[0]) return false;
    if (to.z === "cell") {
      if (cards.length > 1 || g.cells[to.i]) return say("That move is not allowed."), false;
    } else if (to.z === "found") {
      if (cards.length > 1 || !toFound(cards[0], g.found[to.i])) return say("That move is not allowed."), false;
    } else {
      const dst = g.tab[to.c];
      if (from.z === "tab" && from.c === to.c) return false;
      if (!fitsTab(cards[0], dst.at(-1))) return say("That move is not allowed."), false;
      const emptyTarget = !dst.length, lim = maxMove(emptyTarget);
      if (cards.length > 1 && !validRun(g.tab[from.c], from.i)) return say("That move is not allowed."), false;
      if (cards.length > lim && cards.length > 1) return say(`That move requires moving ${cards.length} cards.\nYou only have enough free space to move ${lim}.`), false;
      if (emptyTarget && cards.length > 1 && !opt.quick) {
        const all = await moveColumnDialog();
        if (all === null) return false;
        if (!all) {
          from = { ...from, i: g.tab[from.c].length - 1 };
          cards = g.tab[from.c].slice(from.i);
        }
      }
    }
    undoStack.push(snap());
    if (from.z === "cell") g.cells[from.i] = null;
    else g.tab[from.c].splice(from.i);
    if (to.z === "cell") g.cells[to.i] = cards[0];
    else if (to.z === "found") g.found[to.i].push(cards[0]);
    else g.tab[to.c].push(...cards);
    sel = null;
    render();
    after();
    return true;
  }
  const moveColumnDialog = () => new Promise((res) => {
    const d = dialogFromTemplate(ctx, D.MOVECOL, { title: "Move to Empty Column...", appId: "fcmove", on: { 201: () => (d.close(), res(true)), 202: () => (d.close(), res(false)), 2: () => (d.close(), res(null)) } });
  });
  function after() {
    if (g.found.every((p) => p.length === 13)) return win();
    if (!hasMoves()) lose();
  }
  function hasMoves() {
    if (free() > 0) return true;
    const tops = [...g.cells, ...g.tab.map((c) => c.at(-1))].filter(Boolean);
    for (const c of tops) for (let f = 0; f < 4; f++) if (toFound(c, g.found[f])) return true;
    for (const c of g.cells.filter(Boolean)) for (const col of g.tab) if (!col.length || fitsTab(c, col.at(-1))) return true;
    for (let a = 0; a < 8; a++) {
      if (!g.tab[a].length) continue;
      for (let b = 0; b < 8; b++) if (a !== b && (!g.tab[b].length || fitsTab(g.tab[a].at(-1), g.tab[b].at(-1)))) return true;
    }
    return false;
  }
  function record(won) {
    counted = true;
    if (won) { stats.won++; stats.tw++; if (stats.stype === "w") stats.streak++; else (stats.stype = "w", (stats.streak = 1)); stats.sw = Math.max(stats.sw, stats.streak); }
    else { stats.lost++; stats.tl++; if (stats.stype === "l") stats.streak++; else (stats.stype = "l", (stats.streak = 1)); stats.sl = Math.max(stats.sl, stats.streak); }
    persist();
  }
  function win() {
    over = true;
    record(true);
    render();
    const cards = [];
    for (let r = 13; r >= 1; r--) for (let f = 0; f < 4; f++) cards.push({ ...g.found[f][r - 1], x: colX(4 + f), y: TOP });
    bounceCards(board, cards, { done: () => {
      const d = dialogFromTemplate(ctx, D.YOUWIN, { title: "Game Over", appId: "fcwin", on: { 6: () => (d.close(), newGame()), 7: () => d.close(), 208: () => (d.close(), selectGame()) } });
    } });
  }
  function lose() {
    over = true;
    record(false);
    const d = dialogFromTemplate(ctx, D.YOULOSE, { title: "Game Over", appId: "fclose", on: { 6: () => (d.close(), newGame()), 7: () => d.close(), 205: () => (d.close(), newGame(num)) } });
  }
  function selectGame() {
    const d = dialogFromTemplate(ctx, D.GAMENUM, { title: "Game Number", appId: "fcnum", values: { 203: "" }, on: { 1: () => ok() } });
    const ok = () => {
      const n = +d.ctl[203].value;
      if (n >= 1 && n <= 32000) (d.close(), newGame(n));
    };
  }
  function statsDialog() {
    const sessW = stats.sw, run = stats.streak ? `${stats.streak} ${stats.stype === "w" ? "win" : "loss"}${stats.streak > 1 ? (stats.stype === "w" ? "s" : "es") : ""}` : "0";
    const d = dialogFromTemplate(ctx, D.STATS, { title: "FreeCell Statistics", appId: "fcstats", on: { 1: () => d.close(), 207: async () => { if (await ctx.dialogs.confirm("Are you sure you want to delete all statistics?", "FreeCell")) { Object.assign(stats, { won: 0, lost: 0, sw: 0, sl: 0, streak: 0, stype: "", tw: 0, tl: 0 }); persist(); d.close(); } } } });
    d.ctl[212].textContent = `This session\t\t${pct(stats.won, stats.lost)}%\n\twon:\t\t${stats.won}\n\tlost:\t\t${stats.lost}`;
    d.ctl[213].textContent = `Total\t\t\t${pct(stats.tw, stats.tl)}%\n\twon:\t\t${stats.tw}\n\tlost:\t\t${stats.tl}`;
    d.ctl[214].textContent = `Streaks\n\twins:\t\t${stats.sw}\n\tlosses:\t\t${stats.sl}\n\tcurrent:\t\t${run}`;
    [212, 213, 214].forEach((i) => (d.ctl[i].style.whiteSpace = "pre"));
  }
  function optionsDialog() {
    const d = dialogFromTemplate(ctx, D[505], { title: "FreeCell Options", appId: "fcopt", checked: { 209: opt.messages, 210: opt.quick, 211: opt.dbl }, on: { 1: () => ((opt.messages = d.on(209)), (opt.quick = d.on(210)), (opt.dbl = d.on(211)), persist(), d.close()), 2: () => d.close() } });
  }

  // interaction: click a card to select it, click a destination; or drag
  const dest = (box) => {
    const t = [];
    for (let i = 0; i < 4; i++) { t.push({ z: "cell", i, b: { x: colX(i), y: TOP, w: CW, h: CH } }); t.push({ z: "found", i, b: { x: colX(4 + i), y: TOP, w: CW, h: CH } }); }
    for (let c = 0; c < 8; c++) t.push({ z: "tab", c, b: { x: colX(c), y: ROW2, w: CW, h: 420 - ROW2 } });
    return t.map((x) => [overlap(box, x.b), x]).filter(([a]) => a > 0).sort((a, b) => b[0] - a[0])[0]?.[1];
  };
  function bindTab(n, c, i) {
    n.addEventListener("pointerdown", (e) => {
      if (over) return;
      const nodes = [...board.querySelectorAll(".cd")].filter((m) => m.__ref?.z === "tab" && m.__ref.c === c && m.__ref.i >= i);
      drag(board, e, nodes, { drop: (b) => { const t = dest(b); if (!t) return false; move({ z: "tab", c, i }, t); return true; }, click: () => clickSrc({ z: "tab", c, i }, g.tab[c][i]) });
    });
    n.addEventListener("dblclick", () => i === g.tab[c].length - 1 && dbl({ z: "tab", c, i }, g.tab[c][i]));
  }
  function bindCell(n, i) {
    n.addEventListener("pointerdown", (e) => !over && drag(board, e, [n], { drop: (b) => { const t = dest(b); if (!t) return false; move({ z: "cell", i }, t); return true; }, click: () => clickSrc({ z: "cell", i }, g.cells[i]) }));
    n.addEventListener("dblclick", () => dbl({ z: "cell", i }, g.cells[i]));
  }
  function clickSrc(from, card) {
    if (sel && sel.from.z === from.z && sel.from.c === from.c && sel.from.i === from.i) { sel = null; return render(); }
    if (sel) {
      const to = from.z === "tab" ? { z: "tab", c: from.c } : null;
      if (to) return move(sel.from, to);
    }
    sel = { from, card };
    render();
  }
  function dbl(from, card) {
    if (!opt.dbl) return;
    const i = g.cells.findIndex((c) => !c);
    if (i >= 0 && from.z === "tab") move(from, { z: "cell", i });
  }
  board.addEventListener("click", (e) => {
    if (e.target.classList.contains("cd-slot") || e.target === board) {
      if (!sel) return;
      const bx = board.getBoundingClientRect();
      const t = dest({ x: e.clientX - bx.left - 35, y: e.clientY - bx.top - 48, w: CW, h: CH });
      if (t) move(sel.from, t);
    }
  });

  w.setMenu({
    Game: [
      { label: "New Game", shortcut: "F2", action: async () => { if (!over && !counted && !(await ctx.dialogs.confirm("Do you want to resign this game?", "FreeCell"))) return; newGame(); } },
      { label: "Select Game", shortcut: "F3", action: selectGame },
      { label: "Restart Game", action: () => newGame(num) },
      separator(),
      { label: "Statistics...", shortcut: "F4", action: statsDialog },
      { label: "Options...", shortcut: "F5", action: optionsDialog },
      separator(),
      { label: "Undo", shortcut: "F10", action: () => { const s = undoStack.pop(); if (s) ((g = s), (sel = null), render()); } },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Help: [
      { label: "Contents", shortcut: "F1", action: () => ctx.launch("help", { topic: "freecell" }) },
      { label: "Search for Help on...", action: () => ctx.launch("help", { topic: "freecell" }) },
      { label: "How to Use Help", action: () => ctx.launch("help") },
      separator(),
      { label: "About FreeCell...", action: () => ctx.dialogs.message("FreeCell\nby Jim Horne", { title: "About FreeCell", icon: "freecell" }) },
    ],
  });
  w.setContent(el("div", { class: "cd-wrap" }, board, bar));
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "F2") (e.preventDefault(), newGame());
    if (e.key === "F3") (e.preventDefault(), selectGame());
    if (e.key === "F4") (e.preventDefault(), statsDialog());
    if (e.key === "F5") (e.preventDefault(), optionsDialog());
    if (e.key === "F10") (e.preventDefault(), (() => { const s = undoStack.pop(); if (s) ((g = s), (sel = null), render()); })());
    if (e.key === "F1") (e.preventDefault(), ctx.launch("help", { topic: "freecell" }));
  });
  newGame();
  return w;
}
