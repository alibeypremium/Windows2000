/** Control Panel dialogs laid out from Windows 2000 reference screenshots. */
import { el, icon } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";

const DLG = "/assets/ui/dialogs/";

/** Shared OK / Cancel / Apply row used by property sheets. */
function sheetButtons(w, k, { ok, apply, y = 480, xs = [586, 667, 748] }) {
  const applyBtn = k.btn(xs[2], y, 75, 23, "Apply", {
    disabled: true,
    onclick: () => {
      apply?.();
      w.setDirty(false);
    },
  });
  w.setDirty = (dirty) => applyBtn.classList.toggle("disabled", !dirty);
  return [
    k.btn(xs[0], y, 75, 23, "OK", {
      def: true,
      onclick: () => {
        ok?.();
        w.close();
      },
    }),
    k.btn(xs[1], y, 75, 23, "Cancel", { onclick: () => w.close() }),
    applyBtn,
  ];
}

export function openAccessibility(ctx) {
  const OX = 465,
    OY = 70,
    k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Accessibility Options",
      width: 367,
      height: 443,
      appId: "control",
      help: true,
      noIcon: true,
    });
  const state = { highContrast: !!ctx.settings.get("highContrast") };
  const dirty = () => w.setDirty?.(true);
  const apply = () => {
    ctx.settings.patch({ highContrast: state.highContrast });
    document.documentElement.classList.toggle(
      "high-contrast",
      state.highContrast || ctx.settings.get("scheme") === "High Contrast Black",
    );
  };
  const feature = (top, label, para, iconFile, ic, checkY, btnY, name, extra) => [
    k.group(489, top, 320, 83, label),
    k.img(ic[0], ic[1], DLG + iconFile, ic[2], ic[3]),
    k.text(539, top + 16, para),
    k.check(538, checkY, `Use ${name}`, { onchange: dirty, ...extra }),
    k.btn(721, btnY, 75, 23, "Settings..."),
  ];
  const tabsDef = [
    {
      label: "Keyboard",
      x: 476,
      w: 56,
      content: () => [
        feature(
          138,
          "StickyKeys",
          "Use StickyKeys if you want to use Shift, Ctrl, or Alt\nkey by pressing one key at a time.",
          "acc-sticky.png",
          [499, 159, 31, 23],
          192,
          188,
          "StickyKeys",
        ),
        feature(
          234,
          "FilterKeys",
          "Use FilterKeys if you want Windows to ignore brief or\nrepeated keystrokes, or slow the repeat rate.",
          "acc-filter.png",
          [499, 249, 32, 32],
          288,
          284,
          "FilterKeys",
        ),
        feature(
          331,
          "ToggleKeys",
          "Use ToggleKeys if you want to hear tones when\npressing Caps Lock, Num Lock, and Scroll Lock.",
          "acc-toggle.png",
          [500, 347, 31, 29],
          385,
          381,
          "ToggleKeys",
        ),
        k.check(489, 426, "Show extra keyboard help in programs", {
          onchange: dirty,
        }),
      ],
    },
    {
      label: "Sound",
      x: 536,
      w: 40,
      content: () => [
        k.group(489, 138, 320, 83, "SoundSentry"),
        k.text(
          499,
          154,
          "Use SoundSentry if you want Windows to use visual\nwarnings when your computer makes a sound.",
        ),
        k.check(538, 192, "Use SoundSentry", { onchange: dirty }),
        k.btn(721, 188, 75, 23, "Settings..."),
        k.group(489, 234, 320, 83, "ShowSounds"),
        k.text(
          499,
          250,
          "Use ShowSounds if you want programs to display\ncaptions for the speech and sounds they make.",
        ),
        k.check(538, 288, "Use ShowSounds", { onchange: dirty }),
      ],
    },
    {
      label: "Display",
      x: 578,
      w: 44,
      content: () => [
        k.group(489, 138, 320, 83, "High Contrast"),
        k.text(
          499,
          154,
          "Use High Contrast if you want Windows to use colors\nand fonts designed for easy reading.",
        ),
        k.check(538, 192, "Use High Contrast", {
          checked: state.highContrast,
          onchange: (v) => {
            state.highContrast = v;
            dirty();
          },
        }),
        k.btn(721, 188, 75, 23, "Settings..."),
      ],
    },
    {
      label: "Mouse",
      x: 623,
      w: 42,
      content: () => [
        k.group(489, 138, 320, 83, "MouseKeys"),
        k.text(
          499,
          154,
          "Use MouseKeys if you want to control the pointer with\nthe numeric keypad on your keyboard.",
        ),
        k.check(538, 192, "Use MouseKeys", { onchange: dirty }),
        k.btn(721, 188, 75, 23, "Settings..."),
      ],
    },
    {
      label: "General",
      x: 667,
      w: 48,
      content: () => [
        k.group(489, 138, 320, 72, "Automatic reset"),
        k.check(499, 155, "Turn off accessibility features after idle for:", {
          onchange: dirty,
        }),
        k.combo(517, 175, 52, 21, "5", { disabled: true }),
        k.text(579, 179, "minutes", {}),
        k.group(489, 224, 320, 60, "Notification"),
        k.check(499, 238, "Give warning message when turning a feature on", {
          checked: true,
          onchange: dirty,
        }),
        k.check(499, 260, "Make a sound when turning a feature on or off", {
          checked: true,
          onchange: dirty,
        }),
        k.group(489, 299, 320, 83, "SerialKey devices"),
        k.img(499, 313, DLG + "acc-serial.png", 32, 32),
        k.text(
          539,
          314,
          "SerialKey devices allow alternative access to\nkeyboard and mouse features.",
        ),
        k.check(538, 352, "Support SerialKey devices", { onchange: dirty }),
        k.btn(721, 347, 75, 23, "Settings..."),
        k.group(489, 396, 320, 58, "Administrative options"),
        k.check(499, 412, "Apply all settings to logon desktop", {
          onchange: dirty,
        }),
        k.check(499, 433, "Apply all settings to defaults for new users", {
          onchange: dirty,
        }),
      ],
    },
  ];
  w.place(
    k.tabs({
      top: 99,
      pane: [474, 119, 350, 355],
      tabs: tabsDef,
      active: 0,
    }),
    sheetButtons(w, k, { ok: apply, apply }),
  );
  return w;
}

export function openTaskbarProperties(ctx) {
  const OX = 2,
    OY = 336,
    k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Taskbar and Start Menu Properties",
      width: 344,
      height: 400,
      appId: "taskbarprops",
      help: true,
      noIcon: true,
    });
  const get = (key, fallback) => {
    const v = ctx.settings.get(key);
    return v === undefined || v === null ? fallback : !!v;
  };
  const state = {
    taskbarOnTop: get("taskbarOnTop", true),
    taskbarAutoHide: get("taskbarAutoHide", false),
    smallStartIcons: !get("largeIcons", true),
    showClock: get("showClock", true),
    personalizedMenus: get("personalizedMenus", true),
  };
  const startItems = [
    "Display Administrative Tools",
    "Display Favorites",
    "Display Logoff",
    "Expand Control Panel",
    "Expand My Documents",
    "Expand Network and Dial-up Connections",
    "Expand Printers",
    "Scroll the Programs menu",
  ];
  const startState = Object.fromEntries(
    startItems.map((n) => [n, !!ctx.settings.get("start:" + n)]),
  );
  const dirty = () => w.setDirty?.(true);
  const bind = (key) => (v) => {
    state[key] = v;
    dirty();
  };
  const apply = () => {
    ctx.settings.patch({
      taskbarOnTop: state.taskbarOnTop,
      taskbarAutoHide: state.taskbarAutoHide,
      largeIcons: !state.smallStartIcons,
      showClock: state.showClock,
      personalizedMenus: state.personalizedMenus,
      ...Object.fromEntries(
        Object.entries(startState).map(([n, v]) => ["start:" + n, v]),
      ),
    });
  };
  const list = () => {
    const box = document.createElement("div");
    box.className = "rk-checklist";
    for (const name of startItems) {
      const row = document.createElement("div");
      row.className = "row" + (startState[name] ? " checked" : "");
      row.innerHTML = '<span class="box"></span>';
      row.append(name);
      row.addEventListener("click", () => {
        startState[name] = !startState[name];
        row.classList.toggle("checked", startState[name]);
        dirty();
      });
      box.append(row);
    }
    box.style.cssText = `left:${27 - OX}px;top:${608 - OY}px;width:297px;height:73px`;
    return box;
  };
  const tabsDef = [
    {
      label: "General",
      x: 14,
      w: 48,
      content: () => [
        k.img(36, 410, DLG + "taskbar-preview.png", 277, 133),
        k.check(36, 564, "Always on top", {
          checked: state.taskbarOnTop,
          onchange: bind("taskbarOnTop"),
        }),
        k.check(36, 589, "Auto hide", {
          checked: state.taskbarAutoHide,
          onchange: bind("taskbarAutoHide"),
        }),
        k.check(36, 613, "Show small icons in Start menu", {
          checked: state.smallStartIcons,
          onchange: bind("smallStartIcons"),
        }),
        k.check(36, 638, "Show clock", {
          checked: state.showClock,
          onchange: bind("showClock"),
        }),
        k.check(36, 662, "Use Personalized Menus", {
          checked: state.personalizedMenus,
          onchange: bind("personalizedMenus"),
        }),
      ],
    },
    {
      label: "Advanced",
      x: 63,
      w: 58,
      content: () => [
        k.group(27, 405, 296, 180, "Customize Start menu", 9),
        k.img(44, 415, DLG + "tb-customize.png", 32, 32),
        k.text(87, 416, "You can customize your\nStart menu by adding or\nremoving items from it."),
        k.btn(231, 416, 80, 22, "Add...", { def: true }),
        k.btn(231, 441, 80, 22, "Remove..."),
        k.btn(231, 467, 80, 22, "Advanced..."),
        k.btn(231, 492, 80, 22, "Re-sort"),
        k.img(48, 522, DLG + "tb-recycle.png", 27, 32),
        k.text(
          89,
          523,
          "To remove records of\nrecently accessed\ndocuments, programs, and\nWeb sites,  click Clear.",
        ),
        k.btn(231, 553, 80, 22, "Clear"),
        k.text(26, 593, "Start Menu Settings"),
        list(),
      ],
    },
  ];
  w.place(
    k.tabs({ top: 365, pane: [12, 385, 324, 311], tabs: tabsDef, active: 0 }),
    sheetButtons(w, k, { ok: apply, apply, y: 703, xs: [100, 181, 262] }),
  );
  return w;
}


/* ---------- Add/Remove Programs ---------- */

const ARP = "/assets/icons/arp/";
const PROGRAMS = [
  ["Audacity 1.0.0", "audacity", "3.08MB"],
  ["Borland Delphi 6", "delphi", "322MB"],
  ["Dev-C++ 5 beta 9 release (4.9.9.2)", "devcpp"],
  ["Freeciv 2.1.11 (GTK+ client)", "freeciv"],
  ["Gimp 2.6.1", "gimp", "36.8MB"],
  ["IDA Pro Free v5.0", "ida", "24.5MB"],
  ["JASSPA MicroEmacs 2009", "jasspa", "11.4MB"],
  ["Java 2 Runtime Environment Standard Edition v1.3.1_01", "java", "17.1MB", "1/7/2025"],
  ["MadOnion.com/PCMark2002", "pcmark", "948KB"],
  ["MadOnion.com/ResultBrowser2002", "resultbrowser", "5.91MB"],
  ["Microsoft Internet Explorer 6 SP1", "ie"],
  ["Notepad++", "notepadpp", "13.8MB"],
  ["Python 2.0.1", "python", "18.5MB"],
  ["The Off By One Web Browser", "offbyone"],
];
const parseSize = (s) =>
  s ? parseFloat(s) * (/KB/.test(s) ? 1 : 1024) : -1;

export function openAddRemovePrograms(ctx, page = "change") {
  const OX = 179,
    OY = 138,
    k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Add/Remove Programs",
      width: 600,
      height: 450,
      appId: "control",
      className: "ref-dialog arp-dialog",
      x: OX,
      y: OY,
      minimizable: true,
      maximizable: true,
    });
  w.setIcon?.("cpPrograms");
  const nav = [
    ["change", "Change or\nRemove\nPrograms", "arp-change.png", 163, 213, 167, 78],
    ["add", "Add New\nPrograms", "arp-add.png", 256, 211, 260, 66],
    ["components", "Add/Remove\nWindows\nComponents", "arp-components.png", 333, 211, 337, 78],
    ["access", "Set Program\nAccess and\nDefaults", "arp-access.png", 425, 211, 429, 78],
  ];
  const side = el("div", { class: "rk-pane arp-side" });
  const body = el("div", { class: "rk-pane" });
  w.place(el("div", { class: "arp-white" }), el("div", { class: "arp-grey", style: { left: "5px", top: "22px", width: "87px", height: "423px" } }), side, body);

  const show = (id) => {
    page = id;
    side.replaceChildren(
      ...nav.map(([key, label, file, top, ix, iy, h]) => {
        const lines = label.split("\n");
        const n = el(
          "div",
          {
            class: "arp-nav" + (key === id ? " arp-sel" : ""),
            style: { left: "6px", top: top - OY + "px", width: "84px", height: h + "px" },
            role: "button",
            tabindex: 0,
          },
          el("img", {
            src: DLG + file,
            alt: "",
            draggable: "false",
            style: { left: ix - 185 + "px", top: iy - top + "px" },
          }),
          el("div", {
            class: "arp-nav-text",
            style: { top: iy - top + 34 + "px" },
            text: lines.join("\n"),
          }),
        );
        n.addEventListener("click", () => {
          if (key === "components") {
            openWindowsComponents?.(ctx);
            return;
          }
          show(key);
        });
        return n;
      }),
    );
    body.replaceChildren(...[pages[id]()].flat(Infinity).filter(Boolean));
  };

  const pages = {
    change() {
      let sel = 7,
        sort = "Name";
      const list = el("div", { class: "arp-list" });
      const render = () => {
        const order = PROGRAMS.map((p, i) => i);
        if (sort === "Size")
          order.sort((a, b) => parseSize(PROGRAMS[b][2]) - parseSize(PROGRAMS[a][2]));
        const rows = order.map((i) => {
          const [name, ic, size, used] = PROGRAMS[i],
            on = i === sel;
          const row = el(
            "div",
            { class: "arp-row" + (on ? " selected" : "") },
            el("img", { src: ARP + ic + ".png", alt: "", draggable: "false" }),
            el("div", { class: "arp-name", text: name }),
          );
          if (size)
            row.append(
              el("span", { class: "arp-sizel", text: "Size" }),
              el("span", { class: "arp-sizev", text: size }),
            );
          if (on) {
            row.append(
              el("span", { class: "arp-usedl", text: "Last Used On" }),
              el("span", { class: "arp-usedv", text: used || "" }),
              el("div", {
                class: "arp-hint",
                text: "To change this program or remove it from your\ncomputer, click Change/Remove.",
              }),
              k.btn(619, 404, 123, 21, "Change/Remove", {
                onclick: () =>
                  ctx.dialogs.message("This program cannot be removed from the browser desktop.", { title: "Add/Remove Programs" }),
              }),
            );
            const b = row.lastChild;
            b.style.left = "336px";
            b.style.top = "51px";
            row.dataset.tall = "1";
          }
          row.addEventListener("mousedown", () => {
            sel = i;
            render();
          });
          return row;
        });
        list.replaceChildren(...rows);
      };
      render();
      const combo = k.combo(652, 176, 110, 17, "Name");
      const menu = el("div", { class: "arp-menu", style: { display: "none" } });
      ["Name", "Size", "Frequency", "Date Last Used"].forEach((o) => {
        const it = el("div", { text: o });
        it.addEventListener("mousedown", () => {
          sort = o;
          combo.firstChild.textContent = o;
          menu.style.display = "none";
          render();
        });
        menu.append(it);
      });
      menu.style.left = 652 - OX + "px";
      menu.style.top = 193 - OY + "px";
      combo.addEventListener("click", () => {
        menu.style.display = menu.style.display === "none" ? "block" : "none";
      });
      return [
        k.text(281, 179, "Currently installed programs:"),
        k.text(612, 179, "Sort by:"),
        combo,
        k.sunken(281, 197, 485, 376),
        el("div", { class: "arp-listwrap" }, list),
        menu,
      ];
    },
    add() {
      return [
        k.text(281, 175, "Add a program from CD-ROM or floppy disk"),
        k.img(281, 192, DLG + "arp-cd.png", 32, 32),
        k.text(328, 202, "To add a program from a CD-ROM or floppy disk, click CD or Floppy."),
        k.btn(668, 198, 95, 21, "CD or Floppy", {
          onclick: () => ctx.dialogs.message("No CD-ROM or floppy disk is available.", { title: "Add/Remove Programs" }),
        }),
        k.text(281, 241, "Add programs from Microsoft"),
        k.img(282, 261, DLG + "arp-update.png", 31, 27),
        k.text(
          328,
          262,
          "To add new Windows features, device drivers, and system updates\nover the Internet, click Windows Update.",
        ),
        k.btn(668, 263, 95, 22, "Windows Update", {
          onclick: () => ctx.launch?.("help"),
        }),
      ];
    },
    components() {
      return [];
    },
    access() {
      const box = el("div", { class: "arp-access" });
      const inner = el("div", { class: "arp-access-in" });
      const section = (top, title, rows, last) => {
        const n = el("div", { class: "arp-sec", style: { top: top + "px" } });
        n.append(el("div", { class: "arp-sec-title", text: title }));
        const radios = [];
        rows.forEach(([label, showBox], r) => {
          const y = 24 + r * 20;
          const rd = el("div", {
            class: "rk-radio" + (r === 0 ? " checked" : ""),
            style: { left: "25px", top: y + "px" },
          }, el("span", { class: "box" }), el("span", { text: label }));
          rd.addEventListener("click", () => {
            radios.forEach((x) => x.classList.remove("checked"));
            rd.classList.add("checked");
          });
          radios.push(rd);
          n.append(rd);
          if (showBox) {
            const c = el("div", { class: "rk-check checked", style: { left: "312px", top: y + "px" } },
              el("span", { class: "box" }), el("span", { text: "Show this program" }));
            c.addEventListener("click", () => c.classList.toggle("checked"));
            n.append(c);
          }
        });
        if (!last) n.append(el("div", { class: "arp-rule" }));
        return n;
      };
      inner.append(
        section(5.5, "Choose a default web browser :", [["Use my current web browser"], ["Internet Explorer", 1]]),
        section(78.5, "Choose a default e-mail program :", [["Use my current e-mail program"], ["Outlook Express", 1]]),
        section(151.5, "Choose a default media player :", [["Use my current media player"], ["Windows Media Player", 1]]),
        section(224.5, "Choose a default instant messaging program :", [["Use my current instant messaging program"]]),
        section(278, "Choose a default virtual machine for Java :", [["Use my current virtual machine for Java"]], true),
      );
      box.append(inner);
      box.style.left = 281 - OX + "px";
      box.style.top = 206 - OY + "px";
      return [
        k.text(281, 175, "Choose a default program for the computer activities listed below and specify which programs are\nshown on the Start Menu, desktop, and other locations."),
        box,
        k.btn(583, 538, 85, 21, "OK", { onclick: () => w.close() }),
        k.btn(679, 538, 85, 21, "Cancel", { onclick: () => w.close() }),
      ];
    },
  };
  show(page);
  return w;
}
const openWindowsComponents = null;
