/** Date/Time Properties, laid out from Windows 2000 reference screenshots. */
import { el, popup } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const OX = 153,
  OY = 153;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ZONES = [
  ["(GMT-12:00) Eniwetok, Kwajalein", "Dateline Standard Time"],
  ["(GMT-10:00) Hawaii", "Hawaiian Standard Time"],
  ["(GMT-09:00) Alaska", "Alaskan Standard Time"],
  ["(GMT-08:00) Pacific Time (US & Canada); Tijuana", "Pacific Daylight Time"],
  ["(GMT-07:00) Mountain Time (US & Canada)", "Mountain Daylight Time"],
  ["(GMT-06:00) Central Time (US & Canada)", "Central Daylight Time"],
  ["(GMT-05:00) Eastern Time (US & Canada)", "Eastern Daylight Time"],
  ["(GMT-04:00) Atlantic Time (Canada)", "Atlantic Daylight Time"],
  ["(GMT-03:00) Brasilia", "E. South America Daylight Time"],
  ["(GMT) Greenwich Mean Time : Dublin, Edinburgh, Lisbon, London", "GMT Daylight Time"],
  ["(GMT+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna", "W. Europe Daylight Time"],
  ["(GMT+02:00) Athens, Istanbul, Minsk", "GTB Daylight Time"],
  ["(GMT+03:00) Moscow, St. Petersburg, Volgograd", "Russian Standard Time"],
  ["(GMT+05:30) Calcutta, Chennai, Mumbai, New Delhi", "India Standard Time"],
  ["(GMT+08:00) Beijing, Chongqing, Hong Kong, Urumqi", "China Standard Time"],
  ["(GMT+09:00) Osaka, Sapporo, Tokyo", "Tokyo Standard Time"],
  ["(GMT+10:00) Canberra, Melbourne, Sydney", "AUS Eastern Daylight Time"],
];

const pad = (n) => String(n).padStart(2, "0");
const fmtTime = (d) => {
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${h < 12 ? "AM" : "PM"}`;
};

function clockSvg(d) {
  const cx = 65,
    cy = 65,
    pt = (a, r) => [cx + Math.sin(a) * r, cy - Math.cos(a) * r];
  let dots = "";
  for (let i = 0; i < 60; i++) {
    const [x, y] = pt((i * Math.PI) / 30, 62);
    dots += i % 5 === 0
      ? `<rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" fill="#00c0c0"/>`
      : `<rect x="${x - 0.5}" y="${y - 0.5}" width="1" height="1" fill="#808080"/>`;
  }
  const hand = (a, len, back, wd, fill) => {
    const [tx, ty] = pt(a, len),
      [bx, by] = pt(a + Math.PI, back),
      [lx, ly] = pt(a - Math.PI / 2, wd),
      [rx, ry] = pt(a + Math.PI / 2, wd);
    const poly = (dx, dy, c) =>
      `<polygon points="${tx + dx},${ty + dy} ${rx + dx},${ry + dy} ${bx + dx},${by + dy} ${lx + dx},${ly + dy}" fill="${c}"/>`;
    return poly(3, 3, "#808080") + poly(0, 0, fill);
  };
  const s = d.getSeconds(),
    m = d.getMinutes() + s / 60,
    h = (d.getHours() % 12) + m / 60;
  const [sx, sy] = pt((s * Math.PI) / 30, 54);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 130 130" shape-rendering="crispEdges">${dots}${hand(
    (h * Math.PI) / 6,
    36,
    4,
    4,
    "#008080",
  )}${hand((m * Math.PI) / 30, 52, 4, 3, "#008080")}<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="#000" stroke-width="1"/></svg>`;
}

export function openDateTimeProperties(ctx, { tab = 0 } = {}) {
  const k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Date/Time Properties",
      width: 404,
      height: 340,
      appId: "control",
      help: true,
      noIcon: true,
      x: OX,
      y: OY,
    });
  const S = ctx.settings;
  const now = () => new Date(Date.now() + (S.get("clockOffset") || 0));
  let edited = null; // Date being edited, otherwise live
  const cur = () => edited || now();
  const state = {
    month: cur().getMonth(),
    year: cur().getFullYear(),
    day: cur().getDate(),
    zone: S.get("timeZoneIndex") ?? 3,
    dst: S.get("timeZoneDst") !== false,
  };
  const dirty = () => w.setDirty?.(true);
  const pos = (n, x, y, wd, h) => (
    Object.assign(n.style, { left: x - OX + "px", top: y - OY + "px", width: wd ? wd + "px" : "", height: h ? h + "px" : "" }), n
  );
  const edit = (fn) => {
    edited = edited || now();
    fn(edited);
    dirty();
  };
  let timeField, clockBox, tc;
  const tick = () => {
    if (!w.el.isConnected) return clearInterval(timer);
    if (!edited) {
      if (timeField && document.activeElement !== timeField) timeField.value = fmtTime(now());
      if (clockBox) clockBox.innerHTML = clockSvg(now());
    }
  };
  const timer = setInterval(tick, 1000);

  const dd = (x, y, wd, h, label, items, pick, sel = false) => {
    const c = k.combo(x, y, wd, h, "");
    c.firstChild.nodeValue = "";
    if (sel) c.prepend(el("span", { class: "dt-sel" + (sel === "wide" ? " wide" : ""), text: label }));
    else c.prepend(document.createTextNode(label));
    c.addEventListener("click", () => {
      const r = c.getBoundingClientRect();
      popup(items.map(([v, l]) => ({ label: l, action: () => pick(v) })), r.left, r.bottom);
    });
    return c;
  };

  /* ---------- Date & Time ---------- */
  const dateTime = () => {
    const first = new Date(state.year, state.month, 1).getDay(),
      days = new Date(state.year, state.month + 1, 0).getDate();
    const cal = el("div", { class: "dt-cal" });
    pos(cal, 185, 265, 160, 129);
    cal.append(
      el("div", { class: "dt-calhead" }, ...["S", "M", "T", "W", "T", "F", "S"].map((c) => el("span", { text: c }))),
    );
    for (let d = 1; d <= days; d++) {
      const slot = first + d - 1,
        cell = el("span", {
          class: "dt-day" + (d === state.day ? " sel" : ""),
          style: { left: (slot % 7) * 22.8 + 4 + "px", top: 22 + Math.floor(slot / 7) * 18 + "px" },
          text: String(d),
        });
      cell.addEventListener("click", () => {
        state.day = d;
        edit((e) => e.setFullYear(state.year, state.month, d));
        tc.select(0);
      });
      cal.append(cell);
    }
    const yearField = el("input", { class: "rk-field", value: String(state.year) });
    yearField.addEventListener("change", () => {
      const y = Math.max(1980, Math.min(2099, Number(yearField.value) || state.year));
      state.year = y;
      edit((e) => e.setFullYear(y));
      tc.select(0);
    });
    const yearSpin = el("div", { class: "rk-spin" }, yearField, el("span", { class: "up" }), el("span", { class: "down" }));
    const bump = (n) => {
      yearField.value = String(Math.max(1980, Math.min(2099, state.year + n)));
      yearField.dispatchEvent(new Event("change"));
    };
    yearSpin.querySelector(".up").addEventListener("click", () => bump(1));
    yearSpin.querySelector(".down").addEventListener("click", () => bump(-1));
    pos(yearSpin, 269, 234, 79, 19);

    timeField = el("input", { class: "rk-field", value: fmtTime(cur()) });
    pos(timeField, 406, 376, 85, 19);
    timeField.addEventListener("input", () => {
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp])?/.exec(timeField.value);
      if (!m) return;
      let h = Number(m[1]);
      if (m[4]) h = (h % 12) + (/p/i.test(m[4]) ? 12 : 0);
      edit((e) => e.setHours(h % 24, Math.min(59, +m[2]), Math.min(59, +(m[3] || 0))));
      if (clockBox) clockBox.innerHTML = clockSvg(edited);
    });
    const stepTime = (dir) => {
      const p = timeField.selectionStart || 0,
        seg = p <= 2 ? 3600e3 : p <= 5 ? 60e3 : p <= 8 ? 1e3 : 12 * 3600e3;
      edit((e) => e.setTime(+e + dir * seg));
      timeField.value = fmtTime(edited);
      timeField.setSelectionRange(p, p);
      if (clockBox) clockBox.innerHTML = clockSvg(edited);
    };
    const tspin = el("div", { class: "dt-tspin" }, el("span", { class: "up" }), el("span", { class: "down" }));
    pos(tspin, 492, 376, 16, 19);
    tspin.querySelector(".up").addEventListener("click", () => stepTime(1));
    tspin.querySelector(".down").addEventListener("click", () => stepTime(-1));

    clockBox = el("div", { class: "dt-clock" });
    clockBox.innerHTML = clockSvg(cur());
    pos(clockBox, 387, 232, 130, 130);

    return [
      k.group(174, 214, 181, 196, "Date", 9),
      dd(185, 234, 72, 20, MONTHS[state.month], MONTHS.map((m, i) => [i, m]), (i) => {
        state.month = i;
        const dim = new Date(state.year, i + 1, 0).getDate();
        state.day = Math.min(state.day, dim);
        edit((e) => e.setFullYear(state.year, i, state.day));
        tc.select(0);
      }, true),
      yearSpin,
      cal,
      k.group(365, 214, 169, 196, "Time", 9),
      clockBox,
      timeField,
      tspin,
      k.text(173, 428, "Current time zone:  " + ZONES[state.zone][1]),
    ];
  };

  /* ---------- Time Zone ---------- */
  const SX = -130,
    SY = 74;
  const timeZone = () => [
    dd(306 + SX, 139 + SY, 360, 20, ZONES[state.zone][0], ZONES.map((z, i) => [i, z[0]]), (i) => {
      state.zone = i;
      dirty();
      tc.select(1);
    }, "wide"),
    k.sunken(307 + SX, 164 + SY, 359, 187),
    k.img(308 + SX, 165 + SY, "/assets/ui/display/worldmap.png", 357, 185),
    k.check(306 + SX, 358 + SY, "Automatically adjust clock for daylight saving changes", {
      checked: state.dst,
      onchange: (v) => ((state.dst = v), dirty()),
    }),
  ];

  const apply = () => {
    const patch = { timeZoneIndex: state.zone, timeZoneDst: state.dst };
    if (edited) {
      patch.clockOffset = +edited - Date.now();
      edited = null;
    }
    S.patch(patch);
  };

  tc = k.tabs({
    top: 184,
    pane: [163, 202, 385, 253],
    active: tab,
    tabs: [
      { label: "Date & Time", x: 164, w: 72, content: dateTime },
      { label: "Time Zone", x: 237, w: 59, content: timeZone },
    ],
  });
  w.place(tc, sheetButtons(w, k, { ok: apply, apply, y: 462, xs: [313, 393, 474] }));
  return w;
}
