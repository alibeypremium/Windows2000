/** Power Options Properties, laid out from Windows 2000 reference screenshots. */
import { el, popup } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/power/";
const OX = 417,
  OY = 51;
const SCHEMES = ["Home/Office Desk", "Portable/Laptop", "Presentation", "Always On", "Minimal Power Management", "Max Battery"];
const MON = ["After 1 min", "After 2 mins", "After 3 mins", "After 5 mins", "After 10 mins", "After 15 mins", "After 20 mins", "After 25 mins", "After 30 mins", "After 45 mins", "After 1 hour", "After 2 hours", "After 3 hours", "After 4 hours", "After 5 hours", "Never"];
const DISK = MON.slice(2);

export function openPowerOptions(ctx, { tab = 0 } = {}) {
  const k = kit(0, 0),
    w = refWindow(ctx, {
      title: "Power Options Properties",
      width: 404,
      height: 448,
      appId: "control",
      help: true,
      noIcon: true,
      x: OX,
      y: OY,
    });
  const S = ctx.settings;
  const state = {
    scheme: S.get("powerScheme") || SCHEMES[0],
    monitor: S.get("powerMonitor") || "After 20 mins",
    disk: S.get("powerDisk") || "Never",
    taskbar: !!S.get("powerTaskbarIcon"),
    apm: false,
  };
  let tc;
  const dirty = () => w.setDirty?.(true);
  const dd = (x, y, wd, h, label, items, pick, sel = false) => {
    const c = k.combo(x, y, wd, h, "");
    c.firstChild.nodeValue = "";
    c.prepend(sel ? el("span", { class: "dt-sel wide", text: label }) : document.createTextNode(label));
    c.addEventListener("click", () => {
      const r = c.getBoundingClientRect();
      popup(items.map((l) => ({ label: l, action: () => pick(l) })), r.left, r.bottom);
    });
    return c;
  };
  const sep = (x, y, wd) => el("div", { class: "pw-sep", style: { left: x + "px", top: y + "px", width: wd + "px" } });
  const bat = () => k.img(24, 63, IMG + "battery.png", 36, 34);

  const schemes = () => [
    bat(),
    k.text(73, 64, "Select the power scheme with the most appropriate settings for\nthis computer. Note that changing the settings below will modify\nthe selected scheme."),
    k.group(25, 121, 356, 79, "Power schemes", 9),
    dd(35, 134, 336, 19, state.scheme, SCHEMES, (v) => {
      state.scheme = v;
      dirty();
      tc.select(0);
    }, true),
    k.btn(215, 166, 75, 22, "Save As...", { onclick: () => ctx.dialogs.message("Saving power schemes is not available in this virtual desktop.", { title: "Save Scheme" }) }),
    k.btn(296, 166, 75, 22, "Delete", { onclick: () => ctx.dialogs.message("The selected power scheme cannot be deleted.", { title: "Power Options Properties" }) }),
    k.group(25, 215, 356, 151, `Settings for ${state.scheme} power scheme`, 9),
    k.text(36, 233, "Turn off monitor:"),
    dd(151, 229, 220, 19, state.monitor, MON, (v) => {
      state.monitor = v;
      dirty();
      tc.select(0);
    }),
    k.text(36, 262, "Turn off hard disks:"),
    dd(151, 258, 220, 19, state.disk, DISK.concat(["Never"]).filter((x, i, a) => a.indexOf(x) === i), (v) => {
      state.disk = v;
      dirty();
      tc.select(0);
    }),
    sep(35, 289, 336),
  ];

  const advanced = () => [
    bat(),
    k.text(73, 74, "Select the behaviors you want."),
    k.group(25, 114, 356, 88, "Options", 9),
    k.check(34, 128, "Always show icon on the taskbar.", { checked: state.taskbar, onchange: (v) => ((state.taskbar = v), dirty()) }),
  ];

  const hibernate = () => [
    k.img(25, 62, IMG + "hibernate.png", 35, 35),
    k.text(73, 64, "When your computer hibernates, it stores whatever it has in\nmemory on your hard disk and then shuts down. When your\ncomputer comes out of hibernation, it returns to its previous state."),
    k.group(25, 135, 356, 36, "Hibernate", 9),
    k.check(35, 148, "Enable hibernate support.", { disabled: true }),
    k.group(25, 187, 356, 86, "Disk space for hibernation", 9),
    k.text(35, 201, "Free disk space:"),
    k.text(143, 201, "368 MB"),
    k.text(35, 220, "Disk space required to hibernate:"),
    k.text(223, 220, "512 MB"),
    k.text(35, 239, "You must free some disk space before your computer can hibernate."),
  ];

  const apm = () => [
    bat(),
    k.text(73, 64, "Your computer reports that it can support Advanced Power\nManagement (APM).  Using APM, you can reduce the power\nconsumption of your system.  If you have battery power on your\ncomputer, APM also provides battery status information.\n\nFor more information about APM, see the Windows 2000 Release\nNotes on the Windows 2000 CD."),
    k.group(25, 176, 356, 36, "Advanced Power Management", 9),
    k.check(45, 190, "Enable Advanced Power Management support.", { checked: state.apm, onchange: (v) => ((state.apm = v), dirty()) }),
  ];

  const ups = () => [
    k.text(10, 66, "Uninterruptible Power Supply", { w: 386, align: "center" }),
    k.group(25, 88, 356, 92, "Status", 9),
    k.img(39, 102, IMG + "plug.png", 34, 34),
    k.text(80, 103, "Current power source:", { disabled: true }),
    k.text(80, 121, "Estimated UPS runtime:", { disabled: true }),
    k.text(80, 139, "Estimated UPS capacity:", { disabled: true }),
    k.text(80, 157, "Battery condition:", { disabled: true }),
    k.group(25, 194, 358, 98, "Details", 9),
    k.img(37, 214, IMG + "ups.png", 36, 38),
    k.text(80, 214, "Manufacturer:"),
    k.text(165, 214, "(None)"),
    k.text(80, 230, "Model:"),
    k.btn(208, 258, 75, 22, "Configure...", { disabled: true }),
    k.btn(296, 258, 75, 22, "Select...", { onclick: () => ctx.dialogs.message("No UPS devices are available on this computer.", { title: "Select UPS" }) }),
    k.group(25, 305, 358, 53, "", 0),
    k.img(37, 315, IMG + "warn.png", 36, 36),
    k.text(80, 321, "The UPS service is currently stopped."),
    k.btn(25, 372, 75, 22, "About...", { onclick: () => ctx.dialogs.message("Windows 2000 Uninterruptible Power Supply service.", { title: "About UPS" }) }),
  ];

  const apply = () =>
    S.patch({ powerScheme: state.scheme, powerMonitor: state.monitor, powerDisk: state.disk, powerTaskbarIcon: state.taskbar });

  tc = k.tabs({
    top: 30,
    pane: [10, 49, 386, 360],
    active: tab,
    tabs: [
      { label: "Power Schemes", x: 11, w: 92, content: schemes },
      { label: "Advanced", x: 103, w: 60, content: advanced },
      { label: "Hibernate", x: 163, w: 57, content: hibernate },
      { label: "APM", x: 220, w: 42, content: apm },
      { label: "UPS", x: 262, w: 42, content: ups },
    ],
  });
  w.place(tc, sheetButtons(w, k, { ok: apply, apply, y: 416, xs: [159, 240, 321] }));
  return w;
}
