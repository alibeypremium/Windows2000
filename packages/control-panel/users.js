/** Users and Passwords, laid out from Windows 2000 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/users/";
const OX = 462,
  OY = 44;

export function openUsersAndPasswords(ctx, { tab = 0 } = {}) {
  const k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Users and Passwords",
      width: 404,
      height: 448,
      appId: "control",
      help: true,
      noIcon: true,
      x: OX,
      y: OY,
    });
  const users = [
    ["Administrator", "Administrators"],
    ["Guest", "Guests"],
    [(ctx.settings.get("username") || "user") === "Administrator" ? "user" : ctx.settings.get("username"), "Administrators"],
  ];
  const state = { sel: 0, must: false };
  let tc;
  const dirty = () => w.setDirty?.(true);
  const pos = (n, x, y, wd, h) => (
    Object.assign(n.style, { left: x - OX + "px", top: y - OY + "px", width: wd ? wd + "px" : "", height: h ? h + "px" : "" }), n
  );
  const gray = (n) => ((n.style.background = "#d4d0c8"), n);
  const msg = (t) => ctx.dialogs.message(t, { title: "Users and Passwords" });

  const usersTab = () => {
    const hdr = (x, wd, label) => {
      const n = el("div", { class: "rk-hdr left", text: label });
      return pos(n, x, 196, wd, 17);
    };
    const rows = users.map(([name, group], i) => {
      const y = 215 + i * 17,
        on = i === state.sel,
        r = el(
          "div",
          { class: "up-row" + (on ? " sel" : "") },
          el("img", { src: IMG + "user16.png", alt: "", draggable: "false" }),
          el("span", { class: "n", text: name }),
          el("span", { class: "g", text: group }),
        );
      r.addEventListener("click", () => {
        state.sel = i;
        tc.select(0);
      });
      return pos(r, 492, y, 336, 17);
    });
    const on = state.must,
      who = users[state.sel][0];
    return [
      k.img(486, 108, IMG + "users.png", 35, 30),
      k.text(528, 108, "Use the list below to grant or deny users access to your\ncomputer, and to change passwords and other settings."),
      k.check(487, 152, "Users must enter a user name and password to use this computer.", {
        checked: state.must,
        onchange: (v) => {
          state.must = v;
          dirty();
          tc.select(0);
        },
      }),
      k.text(486, 177, "Users for this computer:"),
      gray(k.sunken(487, 194, 357, 117)),
      hdr(489, 168, "User Name"),
      hdr(657, 168, "Group"),
      hdr(825, 17, ""),
      ...rows,
      k.btn(607, 319, 75, 23, "Add...", { disabled: !on, onclick: () => msg("Adding users is not available in this virtual desktop.") }),
      k.btn(688, 319, 75, 23, "Remove", { disabled: !on, onclick: () => msg("Removing users is not available in this virtual desktop.") }),
      k.btn(769, 319, 75, 23, "Properties", { disabled: !on }),
      k.group(487, 357, 357, 81, "Password for " + who, 9),
      k.img(499, 373, IMG + "pc-user.png", 35, 33),
      k.text(538, 375, `To change the password for ${who}, click Set\nPassword.`),
      k.btn(721, 403, 111, 23, "Set Password...", { disabled: !on }),
    ];
  };

  const advanced = () => [
    k.group(487, 114, 357, 80, "Certificate Management", 9),
    k.img(496, 133, IMG + "cert.png", 35, 27),
    k.text(537, 131, "Use certificates to positively identify yourself, certification\nauthorities and publishers."),
    k.btn(650, 161, 102, 23, "New Certificate...", { def: true, onclick: () => msg("Certificate Manager is not available in this virtual desktop.") }),
    k.btn(758, 161, 75, 23, "Certificates", { onclick: () => msg("Certificate Manager is not available in this virtual desktop.") }),
    k.group(487, 207, 357, 80, "Advanced User Management", 9),
    k.img(497, 222, IMG + "adv.png", 34, 34),
    k.text(537, 224, "Local Users and Groups can be used to perform advanced\nuser management tasks."),
    k.btn(758, 254, 75, 23, "Advanced", { onclick: () => ctx.launch?.("compmgmt") }),
    k.group(487, 300, 357, 105, "Secure Boot Settings", 9),
    k.img(497, 312, IMG + "key.png", 34, 36),
    k.text(537, 315, "It is recommended that you require users to press\nCtrl-Alt-Delete before logging on. This ensures password\nsecurity and helps protect the system from harmful\nprograms."),
    k.check(497, 381, "Require users to press Ctrl-Alt-Delete before logging on.", { onchange: dirty }),
  ];

  tc = k.tabs({
    top: 74,
    pane: [473, 93, 385, 360],
    active: tab,
    tabs: [
      { label: "Users", x: 473, w: 45, content: usersTab },
      { label: "Advanced", x: 518, w: 58, content: advanced },
    ],
  });
  w.place(tc, sheetButtons(w, k, { y: 459, xs: [622, 703, 784] }));
  return w;
}
