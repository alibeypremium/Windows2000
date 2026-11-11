import {
  el,
  button,
  icon,
  toolbar,
  statusBar,
  separator,
  field,
  popup,
} from "../ui/index.js";
import { basename, downloadFile } from "../core/index.js";
import { buildSite, isSite, prefetchNews, homeBoxes } from "./netscape-sites.js";
import { ieOpen, ieOptions, ieAddFavorite, ieProps, ieOrganize, iePageSetup, iePrint, IE_HELP } from "./ie-dialogs.js";
const normalizeAddress = (input) => {
  let target = String(input || "about:home").trim();
  if (!/^(about:|https?:\/\/|[A-Z]:[\\/])/i.test(target))
    target =
      target.includes(".") && !target.includes(" ")
        ? "https://" + target
        : "http://auto.search.msn.com/response.asp?MT=" +
          encodeURIComponent(target) +
          "&srch=3&prov=&utf8";
  if (/^https?:/i.test(target)) target = new URL(target).href;
  if (
    /^about:/i.test(target) &&
    !isSite(target) &&
    ![
      "about:home",
      "about:welcome",
      "about:blank",
      "about:favorites",
      "about:history",
    ].includes(target)
  )
    throw new Error("This built-in page does not exist.");
  return target;
};
export function openInternetExplorer(ctx, { url = null, path = null } = {}) {
  const initial = normalizeAddress(path || url || ctx.settings.get("homePage"));
  prefetchNews();
  const w = ctx.wm.create({
    title: "Microsoft Internet Explorer",
    icon: "ie",
    width: 806,
    height: 603,
    x: 95,
    y: 51,
    appId: "ie",
  });
  let current = initial,
    history = [current],
    index = 0,
    loading = false;
  const address = el("input", { value: current, "aria-label": "Address" }),
    viewport = el("div", { class: "ie-viewport" }),
    status = el(
      "div",
      { class: "ie-status" },
      el("div", { class: "ie-pane ie-pane-done", text: "Done" }),
      el("div", { class: "ie-pane ie-pane-zone", text: "Internet" }),
      el("div", { class: "ie-pane ie-pane-blank" }),
      el("div", { class: "ie-pane ie-pane-blank" }),
      el("div", { class: "ie-pane ie-pane-blank" }),
      el("span", { class: "status-grip" }),
    );
  const external = () => {
    if (/^https?:\/\//i.test(current))
      window.open(current, "_blank", "noopener,noreferrer");
  };
  const navigate = (target, push = true) => {
    target = normalizeAddress(target);
    ctx.bus.emit("network:activity");
    current = target;
    address.value = current;
    if (push) {
      history = history.slice(0, index + 1);
      history.push(current);
      index++;
    }
    render();
  };
  const siteFrames = new Set();
  const onSiteMessage = (e) => {
    const d = e.data;
    if (!d || d.ns !== "go" || ![...siteFrames].some((f) => f.contentWindow === e.source)) return;
    if (d.ext) window.open(d.url, "_blank", "noopener,noreferrer");
    else {
      try { navigate(d.url); } catch (err) { ctx.dialogs.message(err.message, { title: "Microsoft Internet Explorer", icon: "error" }); }
    }
  };
  window.addEventListener("message", onSiteMessage);
  const _close = w.close.bind(w);
  w.close = (...a) => (window.removeEventListener("message", onSiteMessage), _close(...a));
  const siteFrame = (html, title) => {
    const f = el("iframe", { class: "ie-frame", sandbox: "allow-scripts allow-forms", title });
    f.srcdoc = html;
    siteFrames.add(f);
    return f;
  };
  const _setTitle = w.setTitle.bind(w);
  w.setTitle = (t) => _setTitle(ctx.settings.get("ieOffline") && !t.includes("[Working Offline]") ? t + " [Working Offline]" : t.replace(" [Working Offline]", ""));
  const favorites = () =>
    ctx.settings.get("favorites") || [
      { title: "Google", url: "about:google" },
      { title: "News Reader", url: "about:news" },
      { title: "Günün Ayeti, Hadisi ve Esması", url: "about:daily" },
      { title: "Tarihte Bugün", url: "about:today" },
      { title: "Microsoft", url: "https://www.microsoft.com/" },
      { title: "Wikipedia", url: "https://www.wikipedia.org/" },
      { title: "The Internet Archive", url: "https://archive.org/" },
    ];
  const favFolders = () => [...new Set([...(ctx.settings.get("favFolders") || []), ...favorites().map((f) => f.folder).filter(Boolean)])];
  const home = () => navigate(ctx.settings.get("homePage") || "about:home");
  function syncNav() {
    const set = (n, off) => { const b = w.el?.querySelector?.(`.ie-tb[data-tb="${n}"]`); if (b) { b.classList.toggle("disabled", off); if (off) b.firstChild.src = "/assets/ui/ie/iso/" + n + "-cold.png"; } };
    set("back", index <= 0);
    set("fwd", index >= history.length - 1);
  }
  function render() {
    syncNav();
    viewport.replaceChildren();
    status.children[0].textContent = "Done";
    status.children[1].textContent = current.startsWith("about:")
      ? "My Computer"
      : "Internet";
    if (current === "about:blank") {
      w.setTitle("about:blank - Microsoft Internet Explorer");
      return;
    }
    if (current === "about:home" || current === "about:welcome") {
      w.setTitle("Welcome to the Internet - Microsoft Internet Explorer");
      const search = el("input", {
        "aria-label": "Search the Web",
        placeholder: "Type a word or phrase",
      });
      const page = el(
        "article",
        { class: "ie-home" },
        el(
          "header",
          { class: "ie-home-header" },
          icon("ie", 32),
          el(
            "div",
            {},
            el("h1", { text: "Microsoft Internet Explorer" }),
            el("p", { text: "Your window to the world. " }),
          ),
        ),
        el(
          "nav",
          { class: "ie-home-nav" },
          button("Home", home, { class: "text-link" }),
          button("Favorites", () => navigate("about:favorites"), {
            class: "text-link",
          }),
          button("History", () => navigate("about:history"), {
            class: "text-link",
          }),
          button("Help", () => ctx.launch("help", { topic: "internet" }), {
            class: "text-link",
          }),
        ),
        el(
          "div",
          { class: "ie-home-body" },
          el("h2", { text: "Welcome to the Internet" }),
          el("p", {
            text: "Explore the Web, visit your favorite sites, or find something new. Type a website address in the Address bar and click Go.",
          }),
          el(
            "fieldset",
            { class: "ie-search-box" },
            el("legend", { text: "Search the Web" }),
            el(
              "div",
              { class: "search-line" },
              search,
              button("Search", () => navigate(search.value)),
            ),
          ),
          (() => { siteFrames.clear(); const f = siteFrame(homeBoxes(), "Günün Ayeti, Hadisi ve Esması / Tarihte Bugün"); f.style.cssText = "width:100%;height:230px;border:0;margin:6px 0"; return f; })(),
          el("h3", { text: "A few places to start" }),
          el(
            "div",
            { class: "ie-start-links" },
            ...favorites().map((f) =>
              button([icon("ie"), f.title], () => navigate(f.url), {
                class: "text-link",
              }),
            ),
          ),
          el("hr"),
          el("h3", { text: "Make yourself at home" }),
          el("p", {
            text: "Add a page to Favorites to keep it close at hand. Use Back and Forward to revisit pages you have opened.",
          }),
          button("Internet Options...", () =>
            ctx.launch("control", { page: "internet" }),
          ),
          el("p", {
            class: "ie-browser-note",
            text: "Some websites do not allow embedded browsing. Choose Open in Browser from the toolbar to open them in a full browser tab.",
          }),
        ),
      );
      search.addEventListener("keydown", (e) => {
        if (e.key === "Enter") navigate(search.value);
      });
      viewport.append(page);
      return;
    }
    if (isSite(current)) {
      siteFrames.clear();
      status.children[0].textContent = "Opening page " + current + "...";
      const my = (render.token = (render.token || 0) + 1);
      buildSite(current).then((r) => {
        if (my !== render.token || !r) return;
        status.children[0].textContent = "Done";
        if (r.go) return navigate(r.go, false);
        viewport.replaceChildren(siteFrame(r.html, r.title));
        w.setTitle(r.title + " - Microsoft Internet Explorer");
      });
      return;
    }
    if (current === "about:favorites" || current === "about:history") {
      const list =
        current === "about:favorites"
          ? favorites()
          : history
              .filter((x) => /^https?:/.test(x))
              .map((url) => ({ url, title: url }));
      viewport.append(
        el(
          "div",
          { class: "ie-local-list" },
          el("h2", {
            text: current === "about:favorites" ? "Favorites" : "History",
          }),
          ...list.map((f) =>
            button([icon("ie"), f.title], () => navigate(f.url), {
              class: "text-link",
            }),
          ),
          !list.length ? el("p", { text: "No pages to display." }) : null,
        ),
      );
      return;
    }
    if (/^[A-Z]:/i.test(current)) {
      const text = ctx.fs.readFile(current),
        frame = el("iframe", {
          class: "ie-frame",
          sandbox: "allow-forms",
          title: basename(current),
        });
      frame.srcdoc = text;
      viewport.append(frame);
      w.setTitle(basename(current) + " - Microsoft Internet Explorer");
      return;
    }
    if (ctx.settings.get("ieOffline") && /^https?:/i.test(current)) {
      status.children[0].textContent = "Done";
      ctx.dialogs.confirm("This page is not available offline.\n\nTo view this page, click Connect.", "Web Page Unavailable While Offline").then((ok) => {
        if (ok) { ctx.settings.set("ieOffline", false); w.setTitle(w.title); render(); }
      });
      return;
    }
    const url = new URL(current);
    if (/(^|\.)(bing\.com|search\.msn\.com)$/i.test(url.hostname)) {
      w.setTitle("Browser Not Supported - Bing - Microsoft Internet Explorer");
      status.children[1].textContent = "Internet";
      viewport.append(
        el(
          "div",
          { class: "ie-legacy-page" },
          "We're sorry, but your current browser is no longer supported. To continue using Bing, please upgrade to a modern browser.",
          el("br"),
          el("br"),
          el("a", {
            href: "https://www.microsoft.com/edge",
            target: "_blank",
            rel: "noopener noreferrer",
            text: "Upgrade your browser",
          }),
        ),
      );
      return;
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Only HTTP and HTTPS addresses can be opened.");
    loading = true;
    status.children[0].textContent = "Opening " + url.hostname + "...";
    w.setTitle(url.hostname + " - Microsoft Internet Explorer");
    const frame = el("iframe", {
      class: "ie-frame",
      src: current,
      title: "Web page: " + url.hostname,
      sandbox:
        "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
      referrerpolicy: "no-referrer",
    });
    frame.addEventListener("load", () => {
      loading = false;
      status.children[0].textContent = "Done";
    });
    viewport.append(
      el(
        "div",
        { class: "ie-frame-notice" },
        el("span", {
          text: "If this page cannot be displayed, open it in your browser.",
        }),
        button("Open in Browser", external),
      ),
      frame,
    );
  }
  const back = () => {
      if (index > 0) navigate(history[--index], false);
    },
    forward = () => {
      if (index < history.length - 1) navigate(history[++index], false);
    };
  const viewSource = () => ctx.launch("notepad", { text: current.startsWith("C:") ? ctx.fs.readFile(current) : viewport.innerHTML });
  const addFav = () => ieAddFavorite(ctx, { name: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, ""), folders: favFolders(), onOk: (title, folder) => ctx.settings.set("favorites", [...favorites(), { title, url: current, folder }]) });
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const pageMenu = () => [
    { label: "Back", disabled: index <= 0, action: back },
    { label: "Forward", disabled: index >= history.length - 1, action: forward },
    separator(),
    off("Save Background As..."), off("Set as Wallpaper"), off("Copy Background"), off("Set as Desktop Item..."),
    separator(),
    { label: "Select All", action: () => { const r = document.createRange(); r.selectNodeContents(viewport); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } },
    off("Paste"),
    separator(),
    off("Create Shortcut"),
    { label: "Add to Favorites...", action: addFav },
    { label: "View Source", action: viewSource },
    separator(),
    off("Encoding"),
    separator(),
    { label: "Print", action: () => iePrint(ctx, () => ctx.printText(viewport.innerText, current)) },
    { label: "Refresh", action: render },
    separator(),
    { label: "Properties", action: () => ieProps(ctx, { url: current, title: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, "") }) },
  ];
  const linkMenu = (href) => [
    { label: "Open", action: () => navigate(href) },
    { label: "Open in New Window", action: () => ctx.launch("ie", { url: href }) },
    off("Save Target As..."), off("Print Target"),
    separator(),
    off("Cut"), { label: "Copy", action: () => document.execCommand("copy") },
    { label: "Copy Shortcut", action: () => navigator.clipboard?.writeText(href) },
    off("Paste"),
    separator(),
    { label: "Add to Favorites...", action: addFav },
    separator(),
    { label: "Properties", action: () => ieProps(ctx, { url: href, title: href }) },
  ];
  const imageMenu = (src) => [
    { label: "Open Link", disabled: true }, off("Open Link in New Window"), off("Save Target As..."), off("Print Target"),
    separator(),
    off("Show Picture"), { label: "Save Picture As...", action: () => downloadFile(basename(src) || "picture.png", src, "image/png") }, off("Set as Wallpaper"), off("Set as Desktop Item..."),
    separator(),
    off("Cut"), { label: "Copy", action: () => document.execCommand("copy") }, off("Copy Shortcut"), off("Paste"),
    separator(),
    { label: "Add to Favorites...", action: addFav },
    separator(),
    { label: "Properties", action: () => ieProps(ctx, { url: src, title: basename(src) }) },
  ];
  const controlMenu = () => [
    off("Undo"), separator(), { label: "Cut", action: () => document.execCommand("cut") }, { label: "Copy", action: () => document.execCommand("copy") }, { label: "Paste", action: () => document.execCommand("paste") }, { label: "Delete", action: () => document.execCommand("delete") }, separator(), { label: "Select All", action: () => document.execCommand("selectAll") },
  ];
  viewport.addEventListener("contextmenu", (e) => {
    const t = e.target;
    e.preventDefault();
    const a = t.closest?.("a[href]"), img = t.closest?.("img");
    popup(t.closest?.("input,textarea,select") ? controlMenu() : img ? imageMenu(img.src) : a ? linkMenu(a.href) : pageMenu(), e.clientX, e.clientY);
  });
  const TB = "/assets/ui/ie/tb-", ISO = "/assets/ui/ie/iso/";
  const isoTb = new Set(["back", "fwd", "stop", "refresh", "home", "search", "favorites", "history", "mail", "print"]);
  const tbButton = (name, label, action, { drop = false, disabled = false, title } = {}) => {
    const iso = isoTb.has(name);
    const pic = el("img", { src: iso ? ISO + name + "-cold.png" : TB + name + ".png", alt: "", draggable: "false" });
    const b = button(
      [
        pic,
        label ? el("span", { text: label }) : null,
        drop ? el("span", { class: "ie-drop" }) : null,
      ],
      action,
      { class: "ie-tb" + (disabled ? " disabled" : ""), title: title || label },
    );
    b.dataset.tb = name;
    if (iso) {
      // Windows 2000 toolbars show the "hot" (coloured) bitmap while the pointer is over an enabled button.
      const hot = (on) => { if (!b.classList.contains("disabled")) pic.src = ISO + name + (on ? "-hot" : "-cold") + ".png"; };
      b.addEventListener("mouseenter", () => hot(true));
      b.addEventListener("mouseleave", () => hot(false));
    }
    return b;
  };
  const sep = () => el("span", { class: "ie-tb-sep" });
  const tools = el(
    "div",
    { class: "ie-toolbar" },
    el("span", { class: "ie-grip" }),
    tbButton("back", "Back", back, { drop: true }),
    tbButton("fwd", "", forward, { drop: true, title: "Forward" }),
    tbButton("stop", "", () => {
      viewport.querySelector("iframe")?.remove();
      status.children[0].textContent = "Stopped";
    }, { title: "Stop" }),
    tbButton("refresh", "", render, { title: "Refresh" }),
    tbButton("home", "", home, { title: "Home" }),
    sep(),
    tbButton("search", "Search", async () => {
      const q = await ctx.dialogs.prompt("Search the Web:", "", { title: "Search" });
      if (q) navigate(q);
    }),
    tbButton("favorites", "Favorites", () => navigate("about:favorites")),
    tbButton("history", "", () => navigate("about:history"), { title: "History" }),
    sep(),
    tbButton("mail", "", () => ctx.launch("outlook"), { title: "Mail" }),
    tbButton("print", "", () => ctx.printText(viewport.innerText, current), { title: "Print" }),
  );
  w.setMenu({
    File: () => [
      {
        label: "New",
        submenu: [
          { label: "Window", shortcut: "Ctrl+N", action: () => ctx.launch("ie", { url: current }) },
          { label: "Message", action: () => ctx.launch("outlook", { compose: true }) },
          { label: "Post", disabled: true },
          { label: "Contact", action: () => ctx.launch("address") },
          { label: "Internet Call", disabled: true },
        ],
      },
      {
        label: "Open...",
        shortcut: "Ctrl+O",
        action: () => ieOpen(ctx, (v) => navigate(v)),
      },
      { label: "Edit", action: viewSource },
      { label: "Save", shortcut: "Ctrl+S", disabled: true },
      {
        label: "Save As...",
        action: () => downloadFile((w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, "") || "index") + ".htm", `<html>${viewport.innerHTML}</html>`, "text/html"),
      },
      separator(),
      { label: "Page Setup...", action: () => iePageSetup(ctx) },
      { label: "Print...", shortcut: "Ctrl+P", action: () => iePrint(ctx, () => ctx.printText(viewport.innerText, current)) },
      separator(),
      {
        label: "Send",
        submenu: [
          { label: "Page by E-mail", disabled: true },
          { label: "Link by E-mail", action: () => (location.href = "mailto:?subject=" + encodeURIComponent(w.title) + "&body=" + encodeURIComponent(current)) },
          { label: "Shortcut to Desktop", disabled: true },
        ],
      },
      { label: "Import and Export...", disabled: true },
      separator(),
      {
        label: "Properties",
        action: () => ieProps(ctx, { url: current, title: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, "") }),
      },
      { label: "Work Offline", checked: !!ctx.settings.get("ieOffline"), action: () => { ctx.settings.set("ieOffline", !ctx.settings.get("ieOffline")); w.setTitle(w.title.replace(/ - Microsoft Internet Explorer.*/, "") + " - Microsoft Internet Explorer"); } },
      { label: "Close", action: () => w.close() },
    ],
    Edit: [
      { label: "Cut", shortcut: "Ctrl+X", disabled: true },
      { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
      { label: "Paste", shortcut: "Ctrl+V", disabled: true },
      separator(),
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => {
          const range = document.createRange();
          range.selectNodeContents(viewport);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        },
      },
      separator(),
      { label: "Find (on This Page)...", shortcut: "Ctrl+F", action: async () => { const t = await ctx.dialogs.prompt("Find what:", "", { title: "Find" }); if (t) window.find(t); } },
    ],
    View: () => [
      {
        label: "Toolbars",
        submenu: [
          { label: "Standard Buttons", checked: true },
          { label: "Address Bar", checked: true },
          { label: "Links", checked: true },
          { separator: true },
          { label: "Customize..." },
        ],
      },
      {
        label: "Status Bar",
        checked: !status.hidden,
        action: () => {
          status.hidden = !status.hidden;
        },
      },
      {
        label: "Explorer Bar",
        submenu: [
          { label: "Search", shortcut: "Ctrl+E", action: () => navigate("about:home") },
          { label: "Favorites", shortcut: "Ctrl+I", action: () => navigate("about:favorites") },
          { label: "History", shortcut: "Ctrl+H", action: () => navigate("about:history") },
        ],
      },
      { separator: true },
      {
        label: "Go To",
        submenu: [
          { label: "Back", action: back },
          { label: "Forward", action: forward },
          { label: "Home Page", action: home },
        ],
      },
      {
        label: "Stop",
        shortcut: "Esc",
        action: () => {
          viewport.querySelector("iframe")?.remove();
          status.children[0].textContent = "Stopped";
        },
      },
      { label: "Refresh", shortcut: "F5", action: render },
      { separator: true },
      {
        label: "Text Size",
        submenu: ["Largest", "Larger", "Medium", "Smaller", "Smallest"].map((label) => ({
          label,
          action: () => {
            viewport.style.fontSize =
              { Largest: "150%", Larger: "125%", Medium: "100%", Smaller: "85%", Smallest: "70%" }[label];
          },
        })),
      },
      {
        label: "Encoding",
        submenu: [
          { label: "Auto-Select" },
          { separator: true },
          { label: "Western European (Windows)", checked: true },
          { label: "Unicode (UTF-8)" },
        ],
      },
      { separator: true },
      {
        label: "Source",
        action: () =>
          ctx.launch("notepad", {
            text: current.startsWith("C:")
              ? ctx.fs.readFile(current)
              : viewport.innerHTML,
          }),
      },
      { label: "Full Screen", shortcut: "F11", action: () => w.maximize() },
    ],
    Favorites: () => [
      {
        label: "Add to Favorites...",
        action: () => ieAddFavorite(ctx, { name: w.title.replace(/ - Microsoft Internet Explorer( \[Working Offline\])?/, ""), folders: favFolders(), onOk: (title, folder) => ctx.settings.set("favorites", [...favorites(), { title, url: current, folder }]) }),
      },
      {
        label: "Organize Favorites...",
        action: () => ieOrganize(ctx, { get: favorites, set: (v) => ctx.settings.set("favorites", v), folders: favFolders, setFolders: (v) => ctx.settings.set("favFolders", v), open: navigate }),
      },
      separator(),
      ...favFolders().map((fo) => ({
        label: fo,
        icon: "folder",
        submenu: favorites().filter((f) => f.folder === fo).map((f) => ({ label: f.title, icon: "ie", action: () => navigate(f.url) })),
      })),
      ...favorites().filter((f) => !f.folder).map((f) => ({
        label: f.title,
        icon: "ie",
        action: () => navigate(f.url),
      })),
    ],
    Tools: [
      {
        label: "Mail and News",
        submenu: [
          { label: "Read Mail", action: () => ctx.launch("outlook") },
          { label: "New Message...", action: () => ctx.launch("outlook", { compose: true }) },
          { label: "Send a Link...", action: () => (location.href = "mailto:?body=" + encodeURIComponent(current)) },
          { label: "Send Page...", disabled: true },
          separator(),
          { label: "Read News", disabled: true },
        ],
      },
      { label: "Synchronize...", disabled: true },
      { label: "Windows Update", disabled: true },
      separator(),
      { label: "Internet Options...", action: () => ctx.launch("control", { page: "internet" }) },
    ],
    Help: IE_HELP(ctx, () => ctx.dialogs.message("Microsoft Internet Explorer\nVersion: 5.00.3700.1000\n\nCopyright © 1995-2001 Microsoft Corp.", { title: "About Internet Explorer", icon: "ie" })),
  });
  w.setContent(
    tools,
    el(
      "div",
      { class: "ie-address" },
      el("span", { class: "ie-grip" }),
      el("span", { class: "ie-address-label", text: "Address" }),
      el(
        "div",
        { class: "ie-address-field" },
        el("img", { src: "/assets/ui/ie/addr-ie.png", alt: "", draggable: "false" }),
        address,
        el("span", { class: "ie-combo-drop" }),
      ),
      button(
        [el("img", { src: "/assets/ui/ie/go.png", alt: "", draggable: "false" }), el("span", { text: "Go" })],
        () => navigate(address.value),
        { class: "ie-go" },
      ),
      el("span", { class: "ie-grip" }),
      el("span", { class: "ie-links", text: "Links" }),
      el("span", { class: "ie-chevron", text: "»" }),
    ),
    viewport,
    status,
  );
  const HELP = {
    File: "Contains commands for working with the selected item.",
    Edit: "Contains editing commands.",
    View: "Contains commands for manipulating the view.",
    Favorites: "Contains commands for working with your favorite items.",
    Tools: "Contains tools and options.",
    Help: "Contains commands for displaying help.",
  };
  w.el.querySelectorAll(":scope > .menu-bar .menu-bar-item").forEach((b) => {
    b.addEventListener("click", () => {
      status.children[0].textContent = HELP[b.textContent] || "";
      const restore = () =>
        setTimeout(() => {
          if (!document.querySelector(".popup-menu"))
            status.children[0].textContent = "Done";
        }, 0);
      document.addEventListener("pointerup", restore, { once: true });
      document.addEventListener("keydown", restore, { once: true });
    });
  });
  w.el.querySelector(":scope > .menu-bar")?.append(
    el("img", { class: "ie-throbber", src: "/assets/ui/ie/throbber.png", alt: "", draggable: "false" }),
  );
  address.addEventListener("keydown", (e) => {
    if (e.key === "Enter") navigate(address.value);
  });
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "F5") {
      e.preventDefault();
      render();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      address.focus();
      address.select();
    }
  });
  if (path) {
    current = path;
    address.value = current;
  }
  render();
  return w;
}
