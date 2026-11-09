/** System Properties, laid out from Windows 2000 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/system/";
const OX = 369,
  OY = 39;

export function openSystemProperties(ctx, { tab = 0 } = {}) {
  const k = kit(0, 0),
    w = refWindow(ctx, { title: "System Properties", width: 410, height: 462, appId: "control", help: true, noIcon: true, x: OX, y: OY });
  const S = ctx.settings;
  const user = ((n) => (n && n !== "Administrator" ? n : "user"))(S.get("username"));
  const pc = ((n) => (n && n.toUpperCase() !== "WIN2000" ? n : "USER-767BA2105C"))(S.get("computerName")).toLowerCase();
  const msg = (t, title = "System Properties") => ctx.dialogs.message(t, { title });
  const hdr = (x, wd, label) => {
    const n = el("div", { class: "rk-hdr left", text: label });
    Object.assign(n.style, { left: x + "px", top: "169px", width: wd + "px", height: "15px" });
    return n;
  };

  const general = () => [
    k.img(58, 95, IMG + "computer.png", 114, 110),
    k.text(208, 71, "System:"),
    k.text(226, 88, "Microsoft Windows 2000"),
    k.text(226, 106, "5.00.2195"),
    k.text(226, 124, "Service Pack 4"),
    k.text(208, 151, "Registered to:"),
    k.text(226, 168, user),
    k.text(226, 203, "51873-335-2543876-09118"),
    k.text(208, 240, "Computer:"),
    k.text(226, 257, "x86 Family 15 Model 6 Stepping"),
    k.text(230, 275, "3"),
    k.text(226, 293, "AT/AT COMPATIBLE"),
    k.text(226, 310, "523,828 KB RAM"),
  ];
  const netid = () => [
    k.img(25, 62, IMG + "netid.png", 34, 35),
    k.text(74, 68, "Windows uses the following information to identify your computer\non the network."),
    k.text(25, 110, "Full computer name:"),
    k.text(149, 110, pc + "."),
    k.text(25, 133, "Workgroup:"),
    k.text(149, 133, "WORKGROUP"),
    k.text(25, 168, "To use the Network Identification Wizard to join a\ndomain and create a local user, click Network ID."),
    k.btn(307, 166, 75, 23, "Network ID", { onclick: () => msg("The Network Identification Wizard is not available in this virtual desktop.", "Network Identification Wizard") }),
    k.text(25, 219, "To rename this computer or join a domain, click\nProperties."),
    k.btn(307, 217, 75, 23, "Properties", { onclick: () => msg("Computer name changes are not available in this virtual desktop.", "Identification Changes") }),
  ];
  const section = (gy, gh, label, icon, ih, tx, line, btn) => [
    k.group(25, gy, 362, gh, label, 9),
    k.img(35, icon, IMG + btn.img, 34, ih),
    k.text(82, tx, line),
  ];
  const hardware = () => [
    ...section(79, 94, "Hardware Wizard", 92, 34, 92, "The Hardware wizard helps you install, uninstall, repair,\nunplug, eject, and configure your hardware.", { img: "hwwiz.png" }),
    k.btn(230, 137, 147, 23, "Hardware Wizard...", { onclick: () => ctx.launch("control", { page: "hardware" }) }),
    ...section(186, 100, "Device Manager", 200, 33, 201, "The Device Manager lists all the hardware devices installed\non your computer. Use the Device Manager to change the\nproperties of any device.", { img: "devmgr.png" }),
    k.btn(76, 251, 147, 23, "Driver Signing...", { onclick: () => msg("Driver signing options are not available in this virtual desktop.", "Driver Signing Options") }),
    k.btn(230, 251, 147, 23, "Device Manager...", { onclick: () => ctx.launch("devices") }),
    ...section(300, 95, "Hardware Profiles", 315, 31, 315, "Hardware profiles provide a way for you to set up and store\ndifferent hardware configurations.", { img: "hwprof.png" }),
    k.btn(230, 360, 147, 23, "Hardware Profiles...", { onclick: () => msg("Hardware profiles are not available in this virtual desktop.", "Hardware Profiles") }),
  ];
  const profiles = () => [
    k.img(27, 70, IMG + "profile.png", 34, 36),
    k.text(83, 71, "User profiles contain desktop settings and other information\nrelated to your logon.  A different profile can be created on\neach computer you use, or you can select a roaming profile\nthat is the same on every computer you use."),
    k.text(26, 149, "Profiles stored on this computer:"),
    k.sunken(26, 167, 360, 214),
    hdr(27, 160, "Name"),
    hdr(187, 53, "Size"),
    hdr(240, 71, "Type"),
    hdr(310, 56, "Modified"),
    hdr(366, 18, ""),
    (() => {
      const r = el("div", { class: "sp-row" });
      r.append(el("span", { style: { left: "2px" }, text: `${pc.toUpperCase()}\\${user}` }), el("span", { style: { left: "164px" }, text: "19480..." }), el("span", { style: { left: "217px" }, text: "Local" }), el("span", { style: { left: "288px" }, text: "6/9/20..." }));
      Object.assign(r.style, { left: "30px", top: "187px", width: "338px" });
      return r;
    })(),
    k.btn(26, 390, 112, 21, "Delete", { disabled: true }),
    k.btn(151, 390, 113, 21, "Change Type...", { onclick: () => msg("Profile type cannot be changed in this virtual desktop.", "Change Profile Type") }),
    k.btn(274, 390, 113, 21, "Copy To...", { onclick: () => msg("Copying profiles is not available in this virtual desktop.", "Copy To") }),
  ];
  const advanced = () => [
    ...section(79, 94, "Performance", 91, 34, 92, "Performance options control how applications use memory,\nwhich affects the speed of your computer.", { img: "perf.png" }),
    k.btn(230, 137, 147, 23, "Performance Options...", { onclick: () => msg("Performance options are not available in this virtual desktop.", "Performance Options") }),
    ...section(186, 95, "Environment Variables", 200, 35, 201, "Environment variables tell your computer where to find certain\ntypes of information.", { img: "env.png" }),
    k.btn(230, 246, 147, 23, "Environment Variables...", { onclick: () => msg("Environment variables are managed by the browser.", "Environment Variables") }),
    ...section(295, 100, "Startup and Recovery", 310, 35, 310, "Startup and recovery options tell your computer how to start\nand what to do if an error causes your computer to stop.", { img: "startup.png" }),
    k.btn(230, 360, 147, 23, "Startup and Recovery...", { onclick: () => msg("Startup and recovery options are not available in this virtual desktop.", "Startup and Recovery") }),
  ];

  const tc = k.tabs({
    top: 30,
    pane: [10, 49, 391, 373],
    active: tab,
    tabs: [
      { label: "General", x: 11, w: 52, content: general },
      { label: "Network Identification", x: 63, w: 114, content: netid },
      { label: "Hardware", x: 177, w: 57, content: hardware },
      { label: "User Profiles", x: 234, w: 71, content: profiles },
      { label: "Advanced", x: 305, w: 61, content: advanced },
    ],
  });
  w.place(tc, sheetButtons(w, k, { y: 428, xs: [165, 246, 327] }));
  return w;
}
