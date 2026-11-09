/** Regional Options, laid out from Windows 2000 reference screenshots. */
import { el, popup } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";
import { localesTab } from "./keyboard.js";

const OX = 394,
  OY = 83;
const LANGS = ["Arabic", "Armenian", "Baltic", "Central Europe", "Cyrillic", "Georgian", "Greek", "Hebrew", "Indic", "Japanese", "Korean", "Simplified Chinese", "Traditional Chinese", "Thai", "Turkish", "Vietnamese", "Western Europe and United States"];
const SHORT = ["M/d/yyyy", "M/d/yy", "MM/dd/yy", "MM/dd/yyyy", "yy/MM/dd", "yyyy-MM-dd", "dd-MMM-yy"];
const LONG = ["dddd, MMMM dd, yyyy", "MMMM dd, yyyy", "dddd, dd MMMM, yyyy", "dd MMMM, yyyy"];
const TIMEF = ["h:mm:ss tt", "hh:mm:ss tt", "H:mm:ss", "HH:mm:ss"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const p2 = (n) => String(n).padStart(2, "0");

function fmt(d, f) {
  const map = {
    dddd: DAYS[d.getDay()],
    MMMM: MONTHS[d.getMonth()],
    MMM: MONTHS[d.getMonth()].slice(0, 3),
    yyyy: d.getFullYear(),
    yy: p2(d.getFullYear() % 100),
    MM: p2(d.getMonth() + 1),
    M: d.getMonth() + 1,
    dd: p2(d.getDate()),
    d: d.getDate(),
    HH: p2(d.getHours()),
    H: d.getHours(),
    hh: p2(d.getHours() % 12 || 12),
    h: d.getHours() % 12 || 12,
    mm: p2(d.getMinutes()),
    ss: p2(d.getSeconds()),
    tt: d.getHours() < 12 ? "AM" : "PM",
  };
  return f.replace(/dddd|MMMM|MMM|yyyy|yy|MM|M|dd|d|HH|H|hh|h|mm|ss|tt/g, (m) => map[m]);
}

export function openRegionalOptions(ctx, { tab = 0 } = {}) {
  const k = kit(0, 0),
    w = refWindow(ctx, { title: "Regional Options", width: 404, height: 480, appId: "control", help: true, noIcon: true, x: OX, y: OY });
  const S = ctx.settings;
  const state = { short: SHORT[0], long: LONG[0], time: TIMEF[0], caps: 0, langs: new Set(["Western Europe and United States"]) };
  let tc;
  const dirty = () => w.setDirty?.(true);
  const now = () => new Date(Date.now() + (S.get("clockOffset") || 0));
  const combo = (x, y, wd, h, label, { items, pick, sel = false, disabled = false } = {}) => {
    const c = k.combo(x, y, wd, h, "", { disabled });
    c.firstChild.nodeValue = "";
    c.prepend(sel ? el("span", { class: "dt-sel", text: label }) : document.createTextNode(label));
    if (items && !disabled)
      c.addEventListener("click", () => {
        const r = c.getBoundingClientRect();
        popup(items.map((l) => ({ label: l, action: () => pick(l) })), r.left, r.bottom);
      });
    return c;
  };
  const field = (x, y, wd, h, text) => {
    const n = el("div", { class: "rg-field", text });
    Object.assign(n.style, { left: x + "px", top: y + "px", width: wd + "px", height: h + "px" });
    return n;
  };
  const rows = (labels, values, y0, pitch, ty0, x = 44, cx = 206, cw = 149, sel0 = true) =>
    labels.flatMap((l, i) => [k.text(x, ty0 + i * pitch, l), combo(cx, y0 + i * pitch, cw, 20, values[i], { sel: sel0 && i === 0 })]);

  const general = () => {
    const list = el("div", { class: "dp-list" });
    Object.assign(list.style, { left: "33px", top: "300px", width: "324px", height: "85px" });
    const inner = el("div", { class: "dp-rows" });
    const ROW = 17,
      max = LANGS.length * ROW - 85;
    let top = 0;
    const sb = k.vscroll(359, 299, 87, 17, 17);
    const sync = () => {
      inner.style.top = -top + "px";
      sb.querySelector(".thumb").style.top = 16 + Math.round((top / max) * (87 - 32 - 17)) + "px";
    };
    LANGS.forEach((l, i) => {
      const r = el("div", { class: "rg-lang", style: { top: i * ROW + "px" } }, el("span", { class: "ia-box" + (state.langs.has(l) ? " on" : "") }), el("span", { class: "t", text: l }));
      r.addEventListener("click", () => {
        state.langs.has(l) ? state.langs.delete(l) : state.langs.add(l);
        r.firstChild.classList.toggle("on");
        dirty();
      });
      inner.append(r);
    });
    list.append(inner);
    list.addEventListener("wheel", (e) => ((e.preventDefault(), (top = Math.max(0, Math.min(max, top + Math.sign(e.deltaY) * ROW * 2)))), sync()));
    sb.querySelector(".up").addEventListener("click", () => ((top = Math.max(0, top - ROW)), sync()));
    sb.querySelector(".down").addEventListener("click", () => ((top = Math.min(max, top + ROW)), sync()));
    sync();
    const loc = k.combo(31, 125, 344, 20, "");
    loc.firstChild.nodeValue = "";
    loc.prepend(el("span", { class: "dt-sel wide", text: "English (United States)" }));
    return [
      k.group(22, 62, 362, 180, "Settings for the current user", 9),
      k.text(31, 73, "Many programs support international settings for numbers, currencies,\ntimes, and dates. Set the locale in order to use the standard settings."),
      k.text(31, 106, "Your locale (location):"),
      loc,
      k.group(22, 256, 362, 170, "Language settings for the system", 9),
      k.text(31, 266, "Your system is configured to read and write documents in multiple\nlanguages."),
      k.sunken(31, 298, 345, 89),
      list,
      sb,
      k.btn(31, 397, 98, 22, "Set default...", { onclick: () => ctx.dialogs.message("Default system language cannot be changed in this virtual desktop.", { title: "Regional Options" }) }),
      k.btn(278, 397, 98, 22, "Advanced...", { onclick: () => ctx.dialogs.message("Code page conversion tables are not available in this virtual desktop.", { title: "Advanced Regional Options" }) }),
    ];
  };

  const numbers = () => [
    k.group(22, 70, 362, 70, "Appearance samples", 9),
    k.text(29, 86, "Positive:"),
    field(77, 82, 119, 22, "123,456,789.00"),
    k.text(206, 86, "Negative:"),
    field(257, 82, 119, 22, "-123,456,789.00"),
    ...rows(["Decimal symbol:", "No. of digits after decimal:", "Digit grouping symbol:", "Digit grouping:", "Negative sign symbol:", "Negative number format:", "Display leading zeros:", "List separator:", "Measurement system:"], [".", "2", ",", "123,456,789", "-", "-1.1", "0.7", ",", "U.S."], 148, 26, 152),
  ];

  const currency = () => [
    k.group(22, 70, 362, 57, "Appearance samples", 9),
    k.text(29, 93, "Positive:"),
    field(77, 89, 119, 22, "$123,456,789.00"),
    k.text(206, 93, "Negative:"),
    field(257, 89, 119, 22, "($123,456,789.00)"),
    ...[
      ["Currency symbol:", "$", 148, 152],
      ["Positive currency format:", "$1.1", 176, 180],
      ["Negative currency format:", "($1.1)", 203, 207],
      ["Decimal symbol:", ".", 246, 250],
      ["No. of digits after decimal:", "2", 273, 277],
      ["Digit grouping symbol:", ",", 319, 323],
      ["Digit grouping:", "123,456,789", 346, 350],
    ].flatMap(([l, v, cy, ty], i) => [k.text(44, ty, l), combo(206, cy, 149, 20, v, { sel: i === 0 })]),
  ];

  const time = () => {
    const sample = field(116, 83, 125, 22, fmt(now(), state.time));
    const iv = setInterval(() => (w.el.isConnected ? (sample.textContent = fmt(now(), state.time)) : clearInterval(iv)), 1000);
    return [
      k.group(25, 70, 357, 46, "Appearance sample", 9),
      k.text(35, 87, "Time sample:"),
      sample,
      k.text(35, 138, "Time format:"),
      combo(116, 133, 125, 21, state.time, { sel: true, items: TIMEF, pick: (v) => ((state.time = v), dirty(), tc.select(4)) }),
      k.text(35, 165, "Time separator:"),
      combo(116, 160, 125, 21, ":"),
      k.text(35, 192, "AM symbol:"),
      combo(116, 188, 125, 21, "AM"),
      k.text(35, 221, "PM symbol:"),
      combo(116, 217, 125, 21, "PM"),
      k.group(25, 274, 357, 122, "", 0),
      k.text(34, 281, "Time format notation"),
      k.text(34, 295, "h = hour     m = minute     s = second     t = am or pm"),
      k.text(34, 321, "h = 12 hour\nH = 24 hour"),
      k.text(34, 360, "hh, mm, ss = leading zero\nh, m, s = no leading zero"),
    ];
  };

  const date = () => [
    k.group(25, 70, 356, 111, "Calendar", 9),
    k.text(34, 82, "When a two-digit year is entered, interpret as a year between:"),
    (() => {
      const f = el("div", { class: "rg-field dis", text: "1930" });
      Object.assign(f.style, { left: "34px", top: "101px", width: "54px", height: "19px" });
      return f;
    })(),
    k.text(97, 104, "and"),
    (() => {
      const input = el("input", { class: "rk-field", value: "2029" });
      const n = el("div", { class: "rk-spin" }, input, el("span", { class: "up" }), el("span", { class: "down" }));
      Object.assign(n.style, { left: "130px", top: "101px", width: "70px", height: "19px" });
      input.addEventListener("input", dirty);
      return n;
    })(),
    k.group(25, 194, 356, 123, "Short date", 9),
    k.text(34, 207, "Short date sample:"),
    field(130, 204, 242, 21, fmt(now(), state.short)),
    k.text(34, 266, "Short date format:"),
    combo(130, 263, 242, 19, state.short, { items: SHORT, pick: (v) => ((state.short = v), dirty(), tc.select(4)) }),
    k.text(34, 294, "Date separator:"),
    combo(130, 290, 76, 19, "/"),
    k.group(25, 329, 356, 97, "Long date", 9),
    k.text(34, 343, "Long date sample:"),
    field(130, 340, 242, 21, fmt(now(), state.long)),
    k.text(34, 402, "Long date format:"),
    combo(130, 398, 241, 20, state.long, { items: LONG, pick: (v) => ((state.long = v), dirty(), tc.select(5)) }),
  ];

  const locales = () => localesTab({ k, ctx, state, dirty });

  const apply = () => S.patch({ shortDateFormat: state.short, longDateFormat: state.long, timeFormat: state.time });

  tc = k.tabs({
    top: 30,
    pane: [10, 49, 386, 391],
    active: tab,
    tabs: [
      { label: "General", x: 11, w: 52, content: general },
      { label: "Numbers", x: 60, w: 56, content: numbers },
      { label: "Currency", x: 116, w: 53, content: currency },
      { label: "Time", x: 169, w: 42, content: time },
      { label: "Date", x: 211, w: 42, content: date },
      { label: "Input Locales", x: 253, w: 76, content: locales },
    ],
  });
  w.place(tc, sheetButtons(w, k, { ok: apply, apply, y: 446, xs: [159, 240, 321] }));
  return w;
}
