/** Folder Options, laid out from Windows 2000 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/folderopts/";

export function openFolderOptions(ctx, { tab = 0 } = {}) {
  const OX = 347,
    OY = 49,
    k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Folder Options",
      width: 384,
      height: 468,
      appId: "control",
      help: true,
      noIcon: true,
      x: OX,
      y: OY,
    });
  const dirty = () => w.setDirty?.(true);
  const state = {
    hidden: !!ctx.settings.get("showHiddenFiles"),
    checks: {
      "Display compressed files and folders with alternate color": false,
      "Display the full path in the address bar": false,
      "Display the full path in title bar": false,
      "Hide file extensions for known file types": false,
      "Hide protected operating system files (Recommended)": true,
      "Launch folder windows in a separate process": false,
      "Remember each folder's view settings": true,
      "Show My Documents on the Desktop": true,
      "Show pop-up description for folder and desktop items": true,
    },
  };
  const at = (n, x, y, wd, h) => {
    n.style.left = x - OX + "px";
    n.style.top = y - OY + "px";
    if (wd != null) n.style.width = wd + "px";
    if (h != null) n.style.height = h + "px";
    return n;
  };
  const spin = (x, y, wd, h, value) => {
    const n = el("div", { class: "rk-spin" }, el("input", { class: "rk-field", value }), el("span", { class: "up" }), el("span", { class: "down" }));
    n.classList.add("right");
    return at(n, x, y, wd, h);
  };

  /* ---------- General ---------- */
  const general = () => {
    const holder = el("div", { class: "rk-pane" });
    const radios = (items) => {
      const group = [];
      items.forEach(([x, y, label, checked, disabled]) => {
        const r = k.radio(x, y, label, { checked, disabled, onchange: () => { group.forEach((g) => g !== r && g.classList.remove("checked")); dirty(); } });
        group.push(r);
        holder.append(r);
      });
    };
    holder.append(
      ...[
        k.group(371, 120, 339, 54, "Active Desktop", 9), k.img(382, 131, IMG + "active-desktop.png", 32, 32),
        k.group(372, 195, 338, 52, "Web View", 9), k.img(382, 206, IMG + "web-view.png", 32, 32),
        k.group(372, 267, 338, 54, "Browse Folders", 9), k.img(382, 279, IMG + "browse.png", 32, 32),
        k.group(372, 340, 338, 90, "Click items as follows", 9), k.img(382, 352, IMG + "click.png", 32, 32),
        k.btn(603, 443, 107, 22, "Restore Defaults"),
      ].flat(),
    );
    radios([[425, 132, "Enable Web content on my desktop", false], [425, 150, "Use Windows classic desktop", true]]);
    radios([[425, 207, "Enable Web content in folders", true], [425, 224, "Use Windows classic folders", false]]);
    radios([[425, 280, "Open each folder in the same window", true], [425, 297, "Open each folder in its own window", false]]);
    holder.append(
      k.radio(425, 352, "Single-click to open an item (point to select)", { onchange: dirty }),
      k.radio(443, 371, "Underline icon titles consistent with my browser", { disabled: true, checked: true }),
      k.radio(443, 389, "Underline icon titles only when I point at them", { disabled: true }),
      k.radio(425, 406, "Double-click to open an item (single-click to select)", { checked: true, onchange: dirty }),
    );
    return holder;
  };

  /* ---------- View ---------- */
  const view = () => {
    const holder = el("div", { class: "rk-pane" });
    const list = el("div", { class: "rk-tlist" });
    at(list, 376, 233, 329, 194);
    const row = (kind, y, x, label, key) => {
      const r = el("div", { class: "rk-trow " + kind, style: { top: y - 233 - 2 + "px", left: x - 376 - 2 + "px" } });
      if (kind === "folder") {
        r.append(el("img", { src: IMG + (x < 390 ? "folder-a" : "folder-b") + ".png", alt: "", draggable: "false" }), el("span", { text: label }));
      } else if (kind === "check") {
        const on = !!state.checks[key];
        r.classList.toggle("on", on);
        r.append(el("i", { class: "tbox" }), el("span", { text: label }));
        r.addEventListener("click", () => { state.checks[key] = !state.checks[key]; r.classList.toggle("on", state.checks[key]); dirty(); });
      } else {
        const on = key === "show" ? state.hidden : !state.hidden;
        r.classList.toggle("on", on);
        r.dataset.group = "hidden";
        r.append(el("i", { class: "tradio" }), el("span", { text: label }));
        r.addEventListener("click", () => {
          state.hidden = key === "show";
          list.querySelectorAll('[data-group="hidden"]').forEach((n) => n.classList.remove("on"));
          r.classList.add("on");
          dirty();
        });
      }
      list.append(r);
    };
    row("folder", 235, 378, "Files and Folders");
    row("check", 250, 399, "Display compressed files and folders with alternate color", "Display compressed files and folders with alternate color");
    row("check", 266, 399, "Display the full path in the address bar", "Display the full path in the address bar");
    row("check", 282, 399, "Display the full path in title bar", "Display the full path in title bar");
    row("folder", 298, 397, "Hidden files and folders");
    row("radio", 314, 419, "Do not show hidden files and folders", "hide");
    row("radio", 330, 419, "Show hidden files and folders", "show");
    row("check", 346, 399, "Hide file extensions for known file types", "Hide file extensions for known file types");
    row("check", 362, 399, "Hide protected operating system files (Recommended)", "Hide protected operating system files (Recommended)");
    row("check", 378, 399, "Launch folder windows in a separate process", "Launch folder windows in a separate process");
    row("check", 394, 399, "Remember each folder's view settings", "Remember each folder's view settings");
    row("check", 410, 399, "Show My Documents on the Desktop", "Show My Documents on the Desktop");
    row("check", 426, 399, "Show pop-up description for folder and desktop items", "Show pop-up description for folder and desktop items");
    holder.append(
      ...[
        k.group(376, 117, 329, 80, "Folder views", 9),
        k.img(391, 136, IMG + "views.png", 32, 30),
        k.text(451, 136, "You can set all of your folders to the same view."),
        k.btn(451, 160, 113, 22, "Like Current Folder", { disabled: true }),
        k.btn(579, 160, 112, 22, "Reset All Folders", { onclick: () => ctx.dialogs.message("All folders now use the default view.", { title: "Folder Options" }) }),
        k.text(376, 217, "Advanced settings:"),
        list,
        k.vscroll(688, 235, 190, 17, 134),
        k.btn(601, 443, 105, 22, "Restore Defaults"),
      ].flat(),
    );
    return holder;
  };

  /* ---------- File Types ---------- */
  const types = () => {
    const holder = el("div", { class: "rk-pane" });
    const data = [
      ["323", "H.323 Internet Telephony", "ft-323"],
      ["ACA", "Microsoft Agent Character File (HTTP format)", "ft-doc"],
      ["ACF", "Microsoft Agent Character File (HTTP format)", "ft-doc"],
      ["ACS", "Microsoft Agent Character File", "ft-doc"],
      ["ACW", "ACWFILE", "ft-doc"],
      ["AIF", "AIFF Format Sound", "ft-doc"],
      ["AIFC", "AIFF Format Sound", "ft-doc"],
    ];
    let sel = 0;
    const clip = el("div", { class: "rk-gridclip" });
    at(clip, 374, 149, 314, 114);
    const details = el("div", { class: "rk-pane" });
    const renderDetails = () => {
      const [ext, name] = data[sel];
      details.replaceChildren(
        ...[
          k.group(372, 330, 334, 133, `Details for '${ext}' extension`, 9),
          k.text(382, 347, "Opens with:"),
          k.img(458, 346, IMG + "opens-with.png", 13, 16),
          k.text(484, 347, ext === "323" ? "Conferencing Utility Dll" : "Windows Media Player"),
          k.btn(621, 343, 75, 23, "Change..."),
          k.text(382, 378, `Files with extension '${ext}' are of type '${name}'.\nTo change settings that affect all '${name}' files,\nclick Advanced.`),
          k.btn(621, 429, 75, 23, "Advanced"),
        ].flat(),
      );
    };
    const renderRows = () => {
      clip.replaceChildren(
        ...data.map(([ext, name, ic], i) => {
          const r = el("div", { class: "rk-frow" + (i === sel ? " sel" : ""), style: { top: i * 17 + "px" } },
            el("img", { src: IMG + ic + ".png", alt: "", draggable: "false" }),
            el("span", { class: "e", text: ext }),
            el("span", { class: "t", text: name }));
          r.addEventListener("mousedown", () => { sel = i; renderRows(); renderDetails(); });
          return r;
        }),
      );
    };
    renderRows();
    renderDetails();
    const hdr = (x, y, wd, label) => at(el("div", { class: "rk-hdr left", text: label }), x, y, wd, 16);
    holder.append(
      ...[
        k.text(372, 114, "Registered file types:"),
        k.sunken(372, 133, 335, 132),
        hdr(374, 134, 63, "Extensions"),
        hdr(436, 134, 253, "File Types"),
        clip,
        k.vscroll(690, 134, 129, 14, 9),
        k.btn(550, 279, 75, 22, "New"),
        k.btn(631, 279, 75, 22, "Delete"),
        details,
      ].flat(),
    );
    return holder;
  };

  /* ---------- Offline Files ---------- */
  const offline = () => [
    k.img(372, 114, IMG + "offline.png", 31, 27),
    k.text(415, 114, "Set up your computer so that files stored on the network are\navailable when working offline (disconnected from the\nnetwork)."),
    k.check(383, 174, "Enable Offline Files", { checked: true, onchange: dirty }),
    k.check(383, 200, "Synchronize all offline files before logging off", { checked: true, onchange: dirty }),
    k.check(383, 226, "Enable reminders", { checked: true, onchange: dirty }),
    k.text(400, 251, "Display reminder balloon every"),
    spin(560, 247, 52, 19, "60"),
    k.text(620, 251, "minutes."),
    k.check(383, 281, "Place shortcut to Offline Files folder on the desktop", { onchange: dirty }),
    k.text(382, 308, "Amount of disk space to use for temporary offline files:"),
    (() => {
      const s = el("div", { class: "rk-slider-h" }, el("i", { class: "groove" }), el("i", { class: "thumb" }));
      return at(s, 395, 334, 145, 22);
    })(),
    k.text(551, 339, "204 MB (10% of drive)"),
    k.btn(435, 384, 83, 22, "Delete Files..."),
    k.btn(526, 384, 83, 22, "View Files"),
    k.btn(616, 384, 83, 22, "Advanced"),
  ];

  const tabs = k.tabs({
    top: 82,
    pane: [357, 99, 368, 380],
    active: tab,
    tabs: [
      { label: "General", x: 361, w: 46, content: general },
      { label: "View", x: 411, w: 38, content: view },
      { label: "File Types", x: 451, w: 58, content: types },
      { label: "Offline Files", x: 511, w: 65, content: offline },
    ],
  });
  const commit = () => ctx.settings.set("showHiddenFiles", state.hidden);
  w.place(tabs, sheetButtons(w, k, { y: 486, xs: [488, 569, 650], ok: commit, apply: commit }));
  return w;
}
