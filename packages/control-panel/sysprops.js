/** System Properties, laid out from Windows 2000 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { NETID } from "./netid-data.js";
import { openPerformanceOptions, openEnvironmentVariables, openStartupRecovery, openHardwareProfiles, openChangeProfileType, openCopyProfile } from "./sysdm.js";

const IMG = "/assets/ui/system/";
const OX = 369,
  OY = 39;

export function openSystemProperties(ctx, { tab = 0 } = {}) {
  const k = kit(0, 0),
    w = refWindow(ctx, { title: "System Properties", width: 410, height: 462, appId: "control", help: true, noIcon: true, x: OX, y: OY });
  const S = ctx.settings;
  const slug = (n) => String(n).trim().toLowerCase().replace(/\s+/g, "-");
  const rawUser = S.get("username");
  const user = rawUser && rawUser !== "Administrator" ? rawUser : "user";
  const stored = S.get("computerName");
  // until the computer is renamed it is called "<user name>-windows2000"
  const pc = (stored && stored.toUpperCase() !== "WIN2000" ? stored : `${slug(user)}-windows2000`).toLowerCase();
  const reopen = (t) => { w.close(); openSystemProperties(ctx, { tab: t }); };
  const msg = (t, title = "System Properties") => ctx.dialogs.message(t, { title });
  const hdr = (x, wd, label) => {
    const n = el("div", { class: "rk-hdr left", text: label });
    Object.assign(n.style, { left: x + "px", top: "169px", width: wd + "px", height: "15px" });
    return n;
  };

  /** Properties: netid.dll "Identification Changes" (computer name / workgroup). */
  const identChanges = () => {
    const ctl = {};
    const name = pc;
    const d = dialogFromTemplate(ctx, NETID["103"], {
      ctlOut: ctl, values: { 1002: name, 1001: name + ".", 116: "", 1007: "WORKGROUP" }, labels: { 1017: "You can change the name and the membership of this computer. Changes may affect access to network resources." },
      checked: { 1004: true }, groups: [[1008, 1004]], hidden: [1010],
      on: {
        1: () => {
          const v = ctl[1002].value.trim();
          if (!v) return ctx.dialogs.message("A computer name cannot be empty.", { title: "Identification Changes", icon: "warning" });
          if (!/^[A-Za-z0-9-]{1,15}$/.test(v)) return ctx.dialogs.message("The computer name contains invalid characters. Use letters, numbers and hyphens (up to 15 characters).", { title: "Identification Changes", icon: "warning" });
          S.set("computerName", v);
          d.close();
          ctx.dialogs.message("You must restart this computer for the changes to take effect.", { title: "Network Identification", icon: "info" }).then(() => reopen(1));
        },
        2: () => d.close(),
        1003: () => ctx.dialogs.message("Primary DNS suffix settings are not available in this virtual desktop.", { title: "DNS Suffix and NetBIOS Computer Name" }),
      },
    });
    ctl[1002].addEventListener("input", () => (ctl[1001].value = ctl[1002].value.toLowerCase() + "."));
    if (ctl[1001]) { ctl[1001].readOnly = true; }
    if (ctl[116]) ctl[116].disabled = true;
    return d;
  };
  /** Network ID: asks for the user name (layout of netid.dll dialog 105, relabelled). */
  const networkId = () => {
    const ctl = {};
    const tpl = structuredClone(NETID["105"]);
    tpl.controls = tpl.controls.filter((c) => c.text !== "&Password:");
    const d = dialogFromTemplate(ctx, tpl, {
      title: "Network Identification", ctlOut: ctl, values: { 1014: rawUser && rawUser !== "Administrator" ? rawUser : "" },
      labels: { 1017: "Enter the user name for this computer. It is shown in System Properties, and the computer is named after it." },
      hidden: [1015],
      on: {
        1: () => {
          const v = ctl[1014].value.trim();
          if (!v) return ctx.dialogs.message("Type a user name.", { title: "Network Identification", icon: "warning" });
          S.set("username", v);
          if (!stored || stored.toUpperCase() === "WIN2000" || stored === `${slug(rawUser)}-windows2000`) S.set("computerName", `${slug(v)}-windows2000`);
          d.close();
          reopen(1);
        },
        2: () => d.close(),
      },
    });
    return d;
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
    k.btn(307, 166, 75, 23, "Network ID", { onclick: networkId }),
    k.text(25, 219, "To rename this computer or join a domain, click\nProperties."),
    k.btn(307, 217, 75, 23, "Properties", { onclick: identChanges }),
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
    k.btn(230, 360, 147, 23, "Hardware Profiles...", { onclick: () => openHardwareProfiles(ctx) }),
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
    k.btn(151, 390, 113, 21, "Change Type...", { onclick: () => openChangeProfileType(ctx, user) }),
    k.btn(274, 390, 113, 21, "Copy To...", { onclick: () => openCopyProfile(ctx, "Administrator") }),
  ];
  const advanced = () => [
    ...section(79, 94, "Performance", 91, 34, 92, "Performance options control how applications use memory,\nwhich affects the speed of your computer.", { img: "perf.png" }),
    k.btn(230, 137, 147, 23, "Performance Options...", { onclick: () => openPerformanceOptions(ctx) }),
    ...section(186, 95, "Environment Variables", 200, 35, 201, "Environment variables tell your computer where to find certain\ntypes of information.", { img: "env.png" }),
    k.btn(230, 246, 147, 23, "Environment Variables...", { onclick: () => openEnvironmentVariables(ctx) }),
    ...section(295, 100, "Startup and Recovery", 310, 35, 310, "Startup and recovery options tell your computer how to start\nand what to do if an error causes your computer to stop.", { img: "startup.png" }),
    k.btn(230, 360, 147, 23, "Startup and Recovery...", { onclick: () => openStartupRecovery(ctx) }),
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
