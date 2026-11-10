import { el } from "../ui/index.js";

export const CW = 71, CH = 96;
export const SUITS = ["clubs", "diamonds", "hearts", "spades"];
export const idxOf = (suit, rank) => suit * 13 + (rank - 1); // sheet order = cards.dll ids 1..52
export const isRed = (suit) => suit === 1 || suit === 2;

/** A card (or card back) as an absolutely positioned DOM node. */
export function cardEl(card, back = 54) {
  const n = el("div", { class: "cd" });
  if (card.up === false) n.style.backgroundImage = `url(/assets/games/cards/back-${back}.png)`;
  else n.style.backgroundPosition = `-${(card.rank - 1) * CW}px -${card.suit * CH}px`;
  return n;
}
export const slotEl = (x, y, kind) => {
  const n = el("div", { class: "cd-slot " + (kind || "") });
  n.style.left = x + "px";
  n.style.top = y + "px";
  return n;
};
export const place = (n, x, y, z) => {
  n.style.left = x + "px";
  n.style.top = y + "px";
  if (z != null) n.style.zIndex = z;
  return n;
};

/**
 * Pointer drag of a stack of nodes. `drop(box)` receives the dragged first card box
 * (board coordinates) and returns true when the move was accepted.
 */
export function drag(board, e, nodes, { drop, click, dblclick }) {
  if (e.button !== 0) return;
  const start = nodes.map((n) => [n.offsetLeft, n.offsetTop, n.style.zIndex]);
  const sx = e.clientX, sy = e.clientY;
  let moved = false;
  const mv = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    if (!moved) nodes.forEach((n, i) => (n.style.zIndex = 5000 + i));
    moved = true;
    nodes.forEach((n, i) => place(n, start[i][0] + dx, start[i][1] + dy));
  };
  const up = (ev) => {
    removeEventListener("pointermove", mv);
    removeEventListener("pointerup", up);
    if (!moved) return click?.(ev);
    const box = { x: nodes[0].offsetLeft, y: nodes[0].offsetTop, w: CW, h: CH };
    const ok = drop(box);
    if (!ok) nodes.forEach((n, i) => place(n, start[i][0], start[i][1], start[i][2]));
  };
  addEventListener("pointermove", mv);
  addEventListener("pointerup", up);
}
export const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** Classic win animation: cards bounce off the floor, leaving trails on a canvas. */
export function bounceCards(board, cards, { done }) {
  const W = board.clientWidth, H = board.clientHeight;
  const canvas = el("canvas", { class: "cd-trail", width: W, height: H });
  board.append(canvas);
  const g = canvas.getContext("2d"), sheet = new Image();
  sheet.src = "/assets/games/cards/cards.png";
  let i = 0, live = null, stop = false;
  const next = () => {
    if (i >= cards.length || stop) return;
    const c = cards[i++];
    live = { c, x: c.x, y: c.y, vx: (Math.random() * 5 + 2) * (Math.random() < 0.5 ? -1 : 1), vy: -Math.random() * 6 };
  };
  const frame = () => {
    if (stop) return;
    if (!live) next();
    if (!live) return;
    live.x += live.vx;
    live.vy += 0.9;
    live.y += live.vy;
    if (live.y + CH > H) {
      live.y = H - CH;
      live.vy = -live.vy * 0.85;
    }
    g.drawImage(sheet, (live.c.rank - 1) * CW, live.c.suit * CH, CW, CH, Math.round(live.x), Math.round(live.y), CW, CH);
    if (live.x > W || live.x < -CW) live = null;
    requestAnimationFrame(frame);
  };
  const end = () => {
    stop = true;
    removeEventListener("pointerdown", end, true);
    removeEventListener("keydown", end, true);
    canvas.remove();
    done?.();
  };
  setTimeout(() => (addEventListener("pointerdown", end, true), addEventListener("keydown", end, true)), 300);
  sheet.onload = () => requestAnimationFrame(frame);
  return end;
}

/**
 * Keyboard shortcuts for a game window. They work whenever the window is the active one, even when the keyboard
 * focus is still on the Start menu or the taskbar (a window only receives key events while it holds the focus).
 */
export function onKeys(w, type, fn) {
  const h = (e) => {
    if (!w.el.classList.contains("active")) return;
    if (e.target?.closest?.("input, textarea, select, [contenteditable]")) return;
    if (type === "keydown" && document.querySelector(".popup-menu")) return;
    fn(e);
  };
  document.addEventListener(type, h);
  w.addCleanup?.(() => document.removeEventListener(type, h));
}
