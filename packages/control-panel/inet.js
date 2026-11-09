/** Internet Properties, laid out from Windows 2000 / IE 6 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";
import { sheetButtons } from "./dialogs.js";

const IMG = "/assets/ui/inet/";

const PRIVACY = [
  ["Block All Cookies", "- Blocks all cookies from all Web sites\n- Cookies already on your computer cannot be read by Web sites"],
  ["High", "- Blocks cookies from all Web sites that do not have a compact\nprivacy policy\n- Blocks cookies that use personally identifiable\ninformation without your explicit consent"],
  ["Medium High", "- Blocks third-party cookies that do not have a compact\nprivacy policy\n- Blocks third-party cookies that use personally identifiable\ninformation without your explicit consent\n- Blocks first-party cookies that use personally identifiable\ninformation without implicit consent"],
  ["Medium", "- Blocks third-party cookies that do not have a compact\nprivacy policy\n- Blocks third-party cookies that use personally identifiable\ninformation without your implicit consent\n- Restricts first-party cookies that use personally identifiable\ninformation without implicit consent"],
  ["Low", "- Blocks third-party cookies that do not have a compact\nprivacy policy\n- Restricts third-party cookies that use personally identifiable\ninformation without implicit consent"],
  ["Accept All Cookies", "- Saves cookies from any Web site\n- Cookies that are already on your computer can be read by the\nWeb sites that created them"],
];
const ZONES = [
  ["Internet", "zone-internet", 412, 32, "This zone contains all Web sites you\nhaven't placed in other zones", "Custom"],
  ["Local intranet", "zone-intranet", 487, 32, "This zone contains all Web sites that\nare on your organization's intranet", "Medium-low"],
  ["Trusted sites", "zone-trusted", 563, 31, "This zone contains Web sites that you\ntrust not to damage your data", "Low"],
  ["Restricted\nsites", "zone-restricted", 638, 31, "This zone contains Web sites that\ncould potentially damage your computer\nor data", "High"],
];

export function openInternetProperties(ctx, { tab = 0 } = {}) {
  const OX = 365,
    OY = 79,
    k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Internet Properties",
      width: 404,
      height: 453,
      appId: "control",
      help: true,
      noIcon: true,
      x: OX,
      y: OY,
    });
  const dirty = () => w.setDirty?.(true);
  const state = { home: ctx.settings.get("homePage") || "http://google.com", privacy: 3, zone: 0 };
  const field = (x, y, wd, h, value, { onInput, disabled } = {}) => {
    const i = el("input", { class: "rk-field", value, spellcheck: "false" });
    Object.assign(i.style, { left: x - OX + "px", top: y - OY + "px", width: wd + "px", height: h + "px" });
    i.disabled = !!disabled;
    i.addEventListener("input", () => onInput?.(i.value));
    return i;
  };
  const spin = (x, y, wd, h, value) => {
    const n = el("div", { class: "rk-spin" }, el("input", { class: "rk-field", value }), el("span", { class: "up" }), el("span", { class: "down" }));
    Object.assign(n.style, { left: x - OX + "px", top: y - OY + "px", width: wd + "px", height: h + "px" });
    return n;
  };
  const row = (a) => a;
  const general = () => [
    k.group(389, 149, 356, 93, "Home page"),
    k.img(402, 163, IMG + "home.png", 27, 29),
    k.text(441, 163, "You can change which page to use for your home page."),
    k.text(442, 187, "Address:"),
    field(504, 184, 228, 18, state.home, { onInput: (v) => { state.home = v; dirty(); } }),
    k.btn(480, 211, 80, 22, "Use Current", { disabled: true }),
    k.btn(567, 211, 80, 22, "Use Default", { onclick: () => { state.home = "about:home"; w.el.querySelector(".rk-field").value = state.home; dirty(); } }),
    k.btn(653, 211, 80, 22, "Use Blank", { onclick: () => { state.home = "about:blank"; w.el.querySelector(".rk-field").value = state.home; dirty(); } }),
    k.group(389, 257, 356, 82, "Temporary Internet files"),
    k.img(399, 270, IMG + "temp.png", 32, 29),
    k.text(441, 270, "Pages you view on the Internet are stored in a special folder\nfor quick viewing later."),
    k.btn(468, 307, 93, 22, "Delete Cookies..."),
    k.btn(567, 307, 80, 22, "Delete Files..."),
    k.btn(653, 307, 80, 22, "Settings..."),
    k.group(389, 355, 356, 86, "History"),
    k.img(402, 369, IMG + "history.png", 26, 30),
    k.text(441, 369, "The History folder contains links to pages you've visited, for\nquick access to recently viewed pages."),
    k.text(441, 410, "Days to keep pages in history:"),
    spin(609, 406, 38, 20, "20"),
    k.btn(653, 405, 80, 22, "Clear History"),
    k.btn(389, 452, 84, 22, "Colors..."),
    k.btn(480, 452, 83, 22, "Fonts..."),
    k.btn(572, 452, 82, 22, "Languages..."),
    k.btn(663, 452, 82, 22, "Accessibility..."),
  ];
  const security = () => {
    const holder = el("div", { class: "rk-pane" });
    const render = () => {
      const [name, , , , desc, level] = ZONES[state.zone];
      holder.replaceChildren(
        ...[
          k.text(389, 142, "Select a Web content zone to specify its security settings."),
          k.sunken(389, 162, 354, 75),
          ...ZONES.map(([label, file, x, size], i) => {
            const cx = x + size / 2;
            const items = [k.img(x, i < 2 ? 166 : 167, IMG + file + ".png", size, size)];
            const lines = label.split("\n");
            const t = k.text(cx - 40, 203, "", { w: 80, align: "center" });
            t.append(el("span", { text: lines.join("\n") }));
            t.classList.add("rk-zone-label");
            if (i === state.zone) t.classList.add("sel");
            t.addEventListener("click", () => { state.zone = i; render(); });
            const ic = items[0];
            ic.addEventListener("click", () => { state.zone = i; render(); });
            return [...items, t];
          }),
          k.img(389, 258, IMG + "zone-globe.png", 32, 32),
          k.text(425, 242, name.replace("\n", " "), { bold: true }),
          k.text(425, 259, desc),
          k.btn(659, 258, 84, 22, "Sites...", { disabled: state.zone === 0 }),
          k.group(389, 311, 356, 152, "Security level for this zone", 9),
          k.text(441, 339, level, { bold: true }),
          k.text(453, 355, level === "Custom"
            ? "Custom settings.\n- To change the settings, click Custom Level.\n- To use the recommended settings, click Default Level."
            : `${level} security settings.\n- To change the settings, click Custom Level.\n- To use the recommended settings, click Default Level.`),
          k.btn(512, 444, 107, 22, "Custom Level..."),
          k.btn(630, 444, 113, 22, "Default Level"),
        ].flat(Infinity),
      );
    };
    render();
    return holder;
  };
  const privacy = () => {
    const holder = el("div", { class: "rk-pane" });
    const render = () => {
      const [name, desc] = PRIVACY[state.privacy];
      holder.replaceChildren(
        ...[
          k.group(389, 149, 356, 247, "Settings"),
          k.img(401, 161, IMG + "privacy.png", 31, 30),
          k.text(441, 163, "Move the slider to select a privacy setting for the Internet\nzone."),
          k.text(456, 213, name, { bold: true }),
          k.text(456, 236, desc),
          k.btn(498, 357, 75, 22, "Import..."),
          k.btn(579, 357, 75, 22, "Advanced..."),
          k.btn(661, 357, 75, 22, "Default", { disabled: state.privacy === 3 }),
          k.group(389, 404, 356, 57, "Web Sites"),
          k.text(402, 415, "To override cookie handling for individual Web sites,\nclick the Edit button."),
          k.btn(660, 444, 75, 22, "Edit...", { disabled: false }),
        ].flat(Infinity),
      );
      // slider
      const track = el("div", { class: "rk-slider-v" });
      track.style.left = 405 - OX + "px";
      track.style.top = 218 - OY + "px";
      PRIVACY.forEach((_, i) => {
        const y = 226 + i * 17.2 - 218;
        track.append(
          el("i", { class: "l", style: { top: y + "px" } }),
          el("i", { class: "r", style: { top: y + "px" } }),
        );
      });
      const thumb = el("div", { class: "thumb", style: { top: 226 + state.privacy * 17.2 - 218 - 6 + "px" } });
      track.append(el("div", { class: "groove" }), thumb);
      track.addEventListener("pointerdown", (e) => {
        const r = track.getBoundingClientRect();
        const i = Math.max(0, Math.min(5, Math.round((e.clientY - r.top - 8) / 17.2)));
        if (i !== state.privacy) {
          state.privacy = i;
          dirty();
          render();
        }
      });
      holder.append(track);
    };
    render();
    return holder;
  };
  const content = () => [
    k.group(389, 148, 356, 75, "Content Advisor"),
    k.img(400, 164, IMG + "advisor.png", 31, 24),
    k.text(441, 161, "Ratings help you control the Internet content that can be\nviewed on this computer."),
    k.btn(546, 190, 91, 21, "Enable...", { def: true }),
    k.btn(642, 190, 90, 21, "Settings...", { disabled: true }),
    k.group(389, 231, 356, 74, "Certificates"),
    k.img(399, 246, IMG + "cert.png", 31, 32),
    k.text(441, 246, "Use certificates to positively identify yourself, certification\nauthorities, and publishers."),
    k.btn(546, 281, 91, 21, "Certificates..."),
    k.btn(642, 281, 90, 21, "Publishers..."),
    k.group(389, 325, 356, 151, "Personal information"),
    k.img(399, 359, IMG + "profile.png", 31, 31),
    k.text(441, 355, "AutoComplete stores previous entries\nand suggests matches for you."),
    k.btn(642, 354, 90, 22, "AutoComplete..."),
    k.text(441, 417, "Microsoft Profile Assistant stores your\npersonal information."),
    k.btn(642, 417, 90, 22, "My Profile..."),
  ];
  const connections = () => [
    k.img(389, 141, IMG + "connect.png", 32, 31),
    k.text(432, 142, "To set up an Internet connection, click\nSetup."),
    k.btn(652, 141, 81, 23, "Setup..."),
    k.group(389, 185, 356, 203, "Dial-up and Virtual Private Network settings"),
    k.sunken(400, 196, 247, 52),
    k.btn(653, 196, 80, 23, "Add..."),
    k.btn(653, 225, 80, 23, "Remove", { disabled: true }),
    k.btn(653, 253, 80, 23, "Settings...", { disabled: true }),
    k.text(400, 256, "Choose Settings if you need to configure a proxy\nserver for a connection."),
    k.radio(400, 289, "Never dial a connection", { disabled: true, checked: true }),
    k.radio(400, 307, "Dial whenever a network connection is not present", { disabled: true }),
    k.radio(400, 325, "Always dial my default connection", { disabled: true }),
    k.text(400, 347, "Current default:", { disabled: true }),
    k.text(489, 347, "None", { disabled: true }),
    k.btn(654, 342, 80, 22, "Set Default", { disabled: true }),
    k.group(389, 401, 356, 69, "Local Area Network (LAN) settings"),
    k.text(399, 415, "LAN Settings do not apply to dial-up connections.\nChoose Settings above for dial-up settings."),
    k.btn(654, 411, 79, 23, "LAN Settings..."),
  ];
  const programs = () => [
    k.group(389, 148, 356, 190, "Internet programs"),
    k.text(402, 164, "You can specify which program Windows automatically uses for\neach Internet service."),
    ...["HTML editor:", "E-mail:", "Newsgroups:", "Internet call:", "Calendar:", "Contact list:"].map((l, i) =>
      [k.text(402, 203 + i * 22, l, { w: 85, align: "left" }), k.combo(500, 199 + i * 22, 230, 19, ["Notepad", "Outlook Express", "Outlook Express", "NetMeeting", "", ""][i])]),
    k.group(389, 350, 356, 50, "Reset Web Settings"),
    k.text(402, 363, "You can reset Internet Explorer to use default\nhome and search pages."),
    k.btn(640, 366, 95, 22, "Reset Web Settings"),
    k.check(389, 415, "Internet Explorer should check to see whether it is the default browser", { checked: true }),
  ];
  const advanced = () => {
    const box = el("div", { class: "rk-checklist" });
    box.style.cssText = `left:${389 - OX}px;top:${165 - OY}px;width:356px;height:270px`;
    for (const [n, on] of [["Accessibility", null], ["Always expand ALT text for images", false], ["Move system caret with focus/selection changes", false], ["Browsing", null], ["Automatically check for Internet Explorer updates", true], ["Close unused folders in History and Favorites", false], ["Disable script debugging", true], ["Display a notification about every script error", false], ["Enable folder view for FTP sites", true], ["Enable page transitions", true], ["Show friendly HTTP error messages", true], ["Underline links: Always", null]]) {
      const r = document.createElement("div");
      r.className = "row" + (on ? " checked" : "");
      if (on === null) { r.append(n); r.style.fontWeight = "normal"; }
      else { r.innerHTML = '<span class="box"></span>'; r.append(n); r.addEventListener("click", () => { r.classList.toggle("checked"); dirty(); }); }
      box.append(r);
    }
    return [k.text(389, 143, "Settings:"), box, k.btn(660, 442, 85, 22, "Restore Defaults")];
  };
  const tabs = k.tabs({
    top: 111,
    pane: [375, 129, 387, 363],
    active: tab,
    tabs: [
      { label: "General", x: 378, w: 46, content: general },
      { label: "Security", x: 428, w: 46, content: security },
      { label: "Privacy", x: 476, w: 46, content: privacy },
      { label: "Content", x: 524, w: 46, content: content },
      { label: "Connections", x: 572, w: 69, content: connections },
      { label: "Programs", x: 643, w: 53, content: programs },
      { label: "Advanced", x: 699, w: 61, content: advanced },
    ],
  });
  w.place(
    tabs,
    sheetButtons(w, k, {
      y: 499,
      xs: [525, 606, 687],
      ok: () => ctx.settings.set("homePage", state.home),
      apply: () => ctx.settings.set("homePage", state.home),
    }),
  );
  return w;
}
