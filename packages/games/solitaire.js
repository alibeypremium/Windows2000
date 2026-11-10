import { el, separator, statusBar } from "../ui/index.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { SOL_DIALOGS } from "./cards-data.js";
import { onKeys, CW, CH, cardEl, slotEl, place, drag, overlap, bounceCards, isRed } from "./cardkit.js";

const UP = 15, DOWN = 3, TOP = 8, ROW2 = 116;
const newDeck = () => {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ suit: s, rank: r, up: false });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};
const fits = (c, top) => (top ? isRed(c.suit) !== isRed(top.suit) && c.rank === top.rank - 1 : c.rank === 13);
const toFound = (c, pile) => (pile.length ? pile.at(-1).suit === c.suit && c.rank === pile.at(-1).rank + 1 : c.rank === 1);

export function openSolitaire(ctx) {
  const saved = ctx.settings.get("solitaire") || {};
  const opt = { draw: saved.draw || 3, scoring: saved.scoring || "Standard", timed: saved.timed ?? true, status: saved.status ?? true, outline: saved.outline ?? false, cumulative: saved.cumulative ?? false, back: saved.back || 54 };
  const persist = () => ctx.settings.set("solitaire", opt);
  const w = ctx.wm.create({ title: "Solitaire", icon: "solitaire", width: 648, height: 540, x: 60, y: 30, appId: "solitaire" });
  const board = el("div", { class: "cd-board" });
  const bar = statusBar("", "");
  let g = null, undoState = null, seconds = 0, timer = null, bank = saved.bank || 0, fan = 0, ended = false;

  const snap = () => structuredClone({ g, seconds, fan });
  const stopTimer = () => (clearInterval(timer), (timer = null));
  const startTimer = () => {
    if (timer || ended) return;
    timer = setInterval(() => {
      seconds++;
      if (opt.timed && opt.scoring === "Standard" && seconds % 10 === 0) g.score = Math.max(0, g.score - 2);
      updateBar();
    }, 1000);
  };
  function deal() {
    stopTimer();
    ended = false;
    seconds = 0;
    undoState = null;
    const d = newDeck();
    g = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []], score: opt.scoring === "Vegas" ? -52 : 0, passes: 0 };
    for (let c = 0; c < 7; c++) for (let i = 0; i <= c; i++) {
      const k = d.pop();
      k.up = i === c;
      g.tab[c].push(k);
    }
    g.stock = d;
    fan = 0;
    if (opt.scoring === "Vegas" && opt.cumulative) bank -= 52;
    render();
  }
  const gap = () => Math.max(4, (board.clientWidth - 7 * CW) / 8);
  const colX = (c) => Math.round(gap() + c * (CW + gap()));
  const tabY = (col, i) => ROW2 + g.tab[col].slice(0, i).reduce((s, k) => s + (k.up ? UP : DOWN), 0);

  function updateBar() {
    const [a, b] = bar.querySelectorAll(".status-panel");
    const sc = opt.scoring === "None" ? "" : opt.scoring === "Vegas" ? `Score: $${g.score}` : `Score: ${g.score}`;
    a.textContent = sc;
    b.textContent = opt.timed ? `Time: ${seconds}` : "";
    bar.style.display = opt.status ? "" : "none";
  }
  function render() {
    board.replaceChildren();
    const mk = (card, x, y, z, ref) => {
      const n = cardEl(card, opt.back);
      place(n, x, y, z);
      n.__ref = ref;
      board.append(n);
      return n;
    };
    // stock
    const sx = colX(0);
    if (g.stock.length) {
      const top = g.stock.at(-1);
      const n = mk({ ...top, up: false }, sx, TOP, 1, { z: "stock" });
      n.addEventListener("click", drawCards);
    } else {
      const slot = slotEl(sx, TOP, "empty");
      slot.style.backgroundImage = `url(/assets/games/cards/back-${(opt.scoring === "Vegas" && g.passes >= (opt.draw === 1 ? 1 : 3)) || g.waste.length === 0 ? 67 : 68}.png)`;
      slot.style.backgroundColor = "#008000";
      slot.style.backgroundSize = "0";
      slot.classList.add("cd-recycle");
      slot.innerHTML = g.waste.length ? '<i class="cd-circle"></i>' : "";
      slot.addEventListener("click", drawCards);
      board.append(slot);
    }
    // waste (fan of up to three when drawing three)
    const shown = Math.max(1, Math.min(fan || 1, g.waste.length, opt.draw));
    g.waste.forEach((c, i) => {
      const k = i - (g.waste.length - shown);
      if (k < 0) return;
      const n = mk(c, colX(1) + (opt.draw === 3 ? k * 15 : 0), TOP, 10 + k, { z: "waste", i });
      if (i === g.waste.length - 1) bindTop(n, "waste", 0);
    });
    if (!g.waste.length) board.append(slotEl(colX(1), TOP, "empty"));
    // foundations
    g.found.forEach((p, f) => {
      const x = colX(3 + f);
      if (!p.length) board.append(slotEl(x, TOP, "empty"));
      p.forEach((c, i) => {
        const n = mk(c, x, TOP, 1 + i, { z: "found", f, i });
        if (i === p.length - 1) bindTop(n, "found", f);
      });
    });
    // tableau
    g.tab.forEach((col, c) => {
      if (!col.length) board.append(slotEl(colX(c), ROW2, "empty"));
      col.forEach((card, i) => {
        const n = mk(card, colX(c), tabY(c, i), 1 + i, { z: "tab", c, i });
        if (!card.up && i === col.length - 1) n.addEventListener("click", () => (record(), (card.up = true), (g.score += opt.scoring === "Standard" ? 5 : 0), startTimer(), render()));
        else if (card.up) bindTab(n, c, i);
      });
    });
    updateBar();
  }
  const record = () => (undoState = snap());
  function drawCards() {
    if (ended) return;
    record();
    startTimer();
    if (g.stock.length) {
      const n = Math.min(opt.draw, g.stock.length);
      for (let i = 0; i < n; i++) {
        const c = g.stock.pop();
        c.up = true;
        g.waste.push(c);
      }
      fan = n;
    } else if (g.waste.length) {
      const maxPasses = opt.scoring === "Vegas" ? (opt.draw === 1 ? 1 : 3) : Infinity;
      if (g.passes + 1 >= maxPasses && opt.scoring === "Vegas") return;
      g.passes++;
      if (opt.scoring === "Standard") g.score = Math.max(0, g.score - (opt.draw === 1 ? 100 : g.passes > 3 ? 20 : 0));
      g.stock = g.waste.reverse().map((c) => ({ ...c, up: false }));
      g.waste = [];
      fan = 0;
    }
    render();
  }
  const points = { toFoundation: () => (opt.scoring === "Vegas" ? 5 : opt.scoring === "Standard" ? 10 : 0) };
  function moveOut(from) {
    if (from.z === "waste") fan = Math.max(0, fan - 1);
    if (from.z === "waste") return g.waste.splice(-1);
    if (from.z === "found") return g.found[from.f].splice(-1);
    return g.tab[from.c].splice(from.i);
  }
  function legal(from, cards, to) {
    if (to.z === "found") return cards.length === 1 && toFound(cards[0], g.found[to.f]);
    return fits(cards[0], g.tab[to.c].at(-1));
  }
  function apply(from, to) {
    const cards = from.z === "waste" ? g.waste.slice(-1) : from.z === "found" ? g.found[from.f].slice(-1) : g.tab[from.c].slice(from.i);
    if (!legal(from, cards, to)) return false;
    record();
    startTimer();
    moveOut(from);
    if (to.z === "found") {
      g.found[to.f].push(...cards);
      if (from.z !== "found") g.score += points.toFoundation();
    } else {
      g.tab[to.c].push(...cards);
      if (opt.scoring === "Standard") g.score += from.z === "waste" ? 5 : from.z === "found" ? -15 : 0;
    }
    g.score = opt.scoring === "Vegas" ? g.score : Math.max(0, g.score);
    render();
    checkWin();
    return true;
  }
  const targets = () => {
    const t = [];
    for (let f = 0; f < 4; f++) t.push({ z: "found", f, box: { x: colX(3 + f), y: TOP, w: CW, h: CH } });
    for (let c = 0; c < 7; c++) {
      const last = g.tab[c].length ? tabY(c, g.tab[c].length - 1) : ROW2;
      t.push({ z: "tab", c, box: { x: colX(c), y: ROW2, w: CW, h: last - ROW2 + CH } });
    }
    return t;
  };
  const dropOn = (from, box) => {
    const cand = targets().map((t) => [overlap(box, t.box), t]).filter(([a]) => a > 0).sort((a, b) => b[0] - a[0]);
    for (const [, t] of cand) if ((t.z !== "tab" || from.z !== "tab" || t.c !== from.c) && apply(from, t)) return true;
    return false;
  };
  const autoFound = (from) => {
    const card = from.z === "waste" ? g.waste.at(-1) : from.z === "found" ? null : g.tab[from.c].at(-1);
    if (!card) return false;
    for (let f = 0; f < 4; f++) if (toFound(card, g.found[f])) return apply(from, { z: "found", f });
    return false;
  };
  function bindTop(n, z, f) {
    const from = z === "waste" ? { z } : { z, f };
    n.addEventListener("pointerdown", (e) => drag(board, e, [n], { drop: (b) => dropOn(from, b) }));
    if (z !== "found") n.addEventListener("dblclick", () => autoFound(from));
  }
  function bindTab(n, c, i) {
    n.addEventListener("pointerdown", (e) => {
      const nodes = [...board.querySelectorAll(".cd")].filter((m) => m.__ref?.z === "tab" && m.__ref.c === c && m.__ref.i >= i);
      drag(board, e, nodes, { drop: (b) => dropOn({ z: "tab", c, i }, b) });
    });
    if (i === g.tab[c].length - 1) n.addEventListener("dblclick", () => autoFound({ z: "tab", c, i }));
  }
  function autoAll() {
    let moved = true;
    while (moved) {
      moved = false;
      if (g.waste.length && autoFound({ z: "waste" })) moved = true;
      for (let c = 0; c < 7 && !moved; c++) if (g.tab[c].length && g.tab[c].at(-1).up && autoFound({ z: "tab", c, i: g.tab[c].length - 1 })) moved = true;
    }
  }
  board.addEventListener("contextmenu", (e) => (e.preventDefault(), autoAll()));
  function checkWin() {
    if (g.found.every((p) => p.length === 13)) {
      ended = true;
      stopTimer();
      if (opt.timed && opt.scoring === "Standard" && seconds > 30) g.score += Math.floor(700000 / seconds);
      updateBar();
      const cards = [];
      for (let r = 13; r >= 1; r--) for (let f = 0; f < 4; f++) cards.push({ ...g.found[f][r - 1], x: colX(3 + f), y: TOP });
      bounceCards(board, cards, { done: async () => { render(); if (await ctx.dialogs.confirm("Deal Again?", "Solitaire")) deal(); } });
    }
  }
  function undo() {
    if (!undoState || ended) return;
    ({ g, seconds, fan } = undoState);
    undoState = null;
    render();
  }

  function optionsDialog() {
    const d = dialogFromTemplate(ctx, SOL_DIALOGS[103], {
      title: "Options", appId: "soloptions",
      checked: { 300: opt.draw === 1, 301: opt.draw === 3, 302: opt.scoring === "Standard", 303: opt.scoring === "Vegas", 304: opt.scoring === "None", 305: opt.timed, 306: opt.status, 307: opt.outline, 308: opt.cumulative },
      groups: [[300, 301], [302, 303, 304]],
      on: { 1: () => ok(), 2: () => d.close() },
    });
    const ok = () => {
      opt.draw = d.on(300) ? 1 : 3;
      opt.scoring = d.on(302) ? "Standard" : d.on(303) ? "Vegas" : "None";
      opt.timed = d.on(305); opt.status = d.on(306); opt.outline = d.on(307); opt.cumulative = d.on(308);
      persist();
      d.close();
      deal();
    };
  }
  function deckDialog() {
    let pick = opt.back;
    const d = dialogFromTemplate(ctx, SOL_DIALOGS[101], { title: "Select Card Back", appId: "soldeck", on: { 1: () => ((opt.back = pick), persist(), d.close(), render()), 2: () => d.close() } });
    [54, 55, 60, 61, 58, 59, 56, 57, 62, 63, 64, 65].forEach((id) => {
      const b = d.ctl[id];
      Object.assign(b.style, { backgroundImage: `url(/assets/games/cards/back-${id}.png)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center", color: "transparent" });
      b.classList.toggle("cd-picked", id === pick);
      b.addEventListener("click", () => {
        pick = id;
        [54, 55, 60, 61, 58, 59, 56, 57, 62, 63, 64, 65].forEach((o) => d.ctl[o].classList.toggle("cd-picked", o === id));
      });
    });
  }

  w.setMenu({
    Game: [
      { label: "Deal", shortcut: "F2", action: deal },
      separator(),
      { label: "Undo", action: undo },
      { label: "Deck...", action: deckDialog },
      { label: "Options...", action: optionsDialog },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Help: [
      { label: "Contents", shortcut: "F1", action: () => ctx.launch("help", { topic: "solitaire" }) },
      { label: "Search for Help on...", action: () => ctx.launch("help", { topic: "solitaire" }) },
      { label: "How to Use Help", action: () => ctx.launch("help") },
      separator(),
      { label: "About Solitaire", action: () => ctx.dialogs.message("Solitaire\nDeveloped for Microsoft by Wes Cherry", { title: "About Solitaire", icon: "solitaire" }) },
    ],
  });
  w.setContent(el("div", { class: "cd-wrap" }, board, bar));
  onKeys(w, "keydown", (e) => {
    if (e.key === "F2") (e.preventDefault(), deal());
    if (e.key === "F1") (e.preventDefault(), ctx.launch("help", { topic: "solitaire" }));
    if (e.ctrlKey && e.key.toLowerCase() === "a") (e.preventDefault(), autoAll());
    if (e.key === "Backspace" || (e.ctrlKey && e.key.toLowerCase() === "z")) undo();
  });
  w.addCleanup(stopTimer);
  new ResizeObserver(() => g && render()).observe(board);
  deal();
  return w;
}
