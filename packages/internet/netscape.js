import { el, button, icon, popup, menuBar, separator } from "../ui/index.js";
import { basename } from "../core/index.js";

const IMG = "/assets/ui/netscape/";
const TITLE = "Netscape";
const FRAMES = 39;

const normalize = (input) => {
  let t = String(input || "").trim();
  if (!t) return "about:home";
  if (/^(about:|https?:\/\/|file:|[A-Z]:[\\/])/i.test(t)) return t;
  if (t.includes(".") && !t.includes(" ")) return "http://" + t;
  return "https://www.google.com/search?q=" + encodeURIComponent(t);
};

const HOME_HTML = `<!DOCTYPE html><html><head><title>Netscape Netcenter</title><style>
body{margin:0;font:13px Arial,Helvetica,sans-serif;background:#fff;color:#000}
.hd{background:#003366;color:#fff;padding:8px 14px;font-size:22px;font-weight:bold}
.hd small{font-size:12px;font-weight:normal;margin-left:12px}
.nav{background:#cce;padding:4px 14px;font-size:12px}
.nav a{margin-right:14px}
.cols{display:flex}.c{padding:12px 14px;width:33%;box-sizing:border-box}
h3{margin:0 0 6px;font-size:14px;background:#ffffcc;padding:3px}
a{color:#0000cc}li{margin:3px 0}ul{padding-left:18px;margin:6px 0}
.ft{border-top:1px solid #999;margin:10px 14px;padding-top:6px;font-size:11px;color:#444}
</style></head><body>
<div class="hd">Netscape <small>Netcenter</small></div>
<div class="nav"><a href="about:home">Home</a><a href="about:plugins">Plug-ins</a><a href="about:license">License</a><a href="about:netscape">About</a></div>
<div class="cols">
<div class="c"><h3>Search</h3><p>Type an address in the Location box, or enter a word or phrase to search the Web.</p>
<ul><li><a href="https://www.wikipedia.org/">Wikipedia</a></li><li><a href="https://archive.org/">The Internet Archive</a></li><li><a href="https://web.archive.org/">Wayback Machine</a></li></ul></div>
<div class="c"><h3>Make This Your Home Page</h3><p>Use <b>Edit &gt; Preferences</b> to choose the page Netscape shows when it starts.</p>
<ul><li><a href="http://home.netscape.com/">home.netscape.com</a></li><li><a href="https://www.microsoft.com/">microsoft.com</a></li></ul></div>
<div class="c"><h3>Chat with your friends</h3><p>Instant Messenger lets you talk to friends online.</p>
<ul><li><a href="about:netscape">What's new in Netscape?</a></li></ul></div>
</div>
<div class="ft">Some web sites do not allow embedded browsing and may appear blank.</div>
</body></html>`;

const ABOUT_HTML = `<!DOCTYPE html><html><head><title>About Netscape</title><style>
body{margin:0;background:#fff;font:13px Arial,sans-serif;color:#000}
.t{background:#000;color:#fff;padding:14px;font-size:22px}
.b{padding:14px;line-height:1.4}
</style></head><body><div class="t">Netscape Navigator&reg;</div><div class="b">
<p><b>Netscape Navigator&reg; Version 4.04</b></p>
<p>Copyright &copy; 1994-1997 Netscape Communications Corporation. All rights reserved.</p>
<p>This software is subject to the license agreement set forth in the license. Please read and agree to all terms before using this software. Netscape, Netscape Navigator and the Netscape N logo are registered trademarks of Netscape Communications Corporation.</p>
<p>Fan simulation running entirely in your browser.</p></div></body></html>`;

export function openNetscape(ctx, { url = null, path = null } = {}) {
  const w = ctx.wm.create({
    title: "Netscape",
    icon: "netscape",
    width: 806,
    height: 603,
    x: 80,
    y: 40,
    appId: "netscape",
  });
  let current = "about:home";
  let hist = [],
    idx = -1,
    title = "Netscape Netcenter",
    loading = false,
    timer = null,
    frameNo = 0;

  const address = el("input", { class: "ns-loc-input", value: "", "aria-label": "Location" });
  const viewport = el("div", { class: "ns-view" });
  const msg = el("div", { class: "ns-status-text", text: "Document: Done" });
  const throbber = el("div", { class: "ns-throbber", title: "Netscape home page" });
  throbber.style.backgroundImage = `url(${IMG}logo.png)`;

  const setLoading = (on) => {
    loading = on;
    clearInterval(timer);
    if (on) {
      throbber.style.backgroundImage = `url(${IMG}throbber.png)`;
      timer = setInterval(() => {
        frameNo = (frameNo + 1) % FRAMES;
        throbber.style.backgroundPosition = `-${frameNo * 32}px 0`;
      }, 60);
    } else {
      throbber.style.backgroundImage = `url(${IMG}logo.png)`;
      throbber.style.backgroundPosition = "0 0";
    }
    syncNav();
  };

  const setTitle = (t) => {
    title = t;
    w.setTitle(t ? `${TITLE} - [${t}]` : TITLE);
  };

  const pages = { "about:home": HOME_HTML, "about:netscape": ABOUT_HTML, "about:license": ABOUT_HTML, "about:plugins": ABOUT_HTML.replace("About Netscape", "About Plug-ins") };

  function render() {
    viewport.replaceChildren();
    address.value = current === "about:home" ? "" : current;
    const mk = (props) => el("iframe", { class: "ns-frame", ...props });
    if (pages[current] || current === "about:blank") {
      const f = mk({ sandbox: "allow-forms", title: "Document" });
      f.srcdoc = current === "about:blank" ? "" : pages[current];
      viewport.append(f);
      setTitle(current === "about:home" ? "Netscape Netcenter" : current === "about:blank" ? "" : current.replace("about:", "About "));
      msg.textContent = "Document: Done";
      syncNav();
      return;
    }
    if (/^[A-Z]:[\\/]/i.test(current)) {
      const f = mk({ sandbox: "allow-forms", title: basename(current) });
      try {
        f.srcdoc = ctx.fs.readFile(current);
      } catch {
        f.srcdoc = "<p>File not found.</p>";
      }
      viewport.append(f);
      setTitle(basename(current));
      msg.textContent = "Document: Done";
      syncNav();
      return;
    }
    let u;
    try {
      u = new URL(current);
    } catch {
      msg.textContent = "Document: Done";
      return;
    }
    setTitle(u.hostname);
    msg.textContent = `Connecting to ${u.hostname}...`;
    setLoading(true);
    ctx.bus?.emit?.("network:activity");
    const f = mk({
      src: current,
      title: u.hostname,
      sandbox: "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
      referrerpolicy: "no-referrer",
    });
    f.addEventListener("load", () => {
      msg.textContent = "Document: Done";
      setLoading(false);
    });
    viewport.append(f);
    setTimeout(() => loading && msg.textContent.startsWith("Connecting") && (msg.textContent = `Contacting host ${u.hostname}...`), 500);
    syncNav();
  }

  const go = (target, push = true) => {
    current = normalize(target);
    if (push) {
      hist = hist.slice(0, idx + 1);
      hist.push(current);
      idx = hist.length - 1;
    }
    render();
  };
  const back = () => idx > 0 && ((current = hist[--idx]), render());
  const fwd = () => idx < hist.length - 1 && ((current = hist[++idx]), render());
  const home = () => go(ctx.settings.get("nsHome") || "about:home");
  const stop = () => {
    viewport.querySelector("iframe")?.remove();
    setLoading(false);
    msg.textContent = "Document: Done";
  };
  const external = () => /^https?:/i.test(current) && window.open(current, "_blank", "noopener,noreferrer");

  const mkBtn = (key, label, action, cls = "") => {
    const b = el("button", { class: "ns-tb " + cls, type: "button", "data-tb": key, title: label }, el("img", { src: IMG + "tb-" + key + ".png", alt: label, draggable: "false" }));
    b.addEventListener("click", () => !b.classList.contains("disabled") && action());
    return b;
  };
  const bBack = mkBtn("back", "Back", back),
    bFwd = mkBtn("forward", "Forward", fwd),
    bReload = mkBtn("reload", "Reload", () => render()),
    bHome = mkBtn("home", "Home", home),
    bSearch = mkBtn("search", "Search", () => go("about:home")),
    bNs = mkBtn("netscape", "Netscape", () => go("about:netscape")),
    bPrint = mkBtn("print", "Print", () => ctx.printText?.(viewport.innerText || "", current)),
    bSec = mkBtn("security", "Security", () => ctx.dialogs.message("Security Info\n\nThis is not a secure document. Netscape does not encrypt these pages.", { title: "Security Info", icon: "info" })),
    bStop = mkBtn("stop", "Stop", stop);

  function syncNav() {
    const set = (b, key, off) => {
      b.classList.toggle("disabled", off);
      const src = IMG + "tb-" + key + (off && (key === "back" || key === "forward") ? "-dis" : "") + ".png";
      b.firstChild.src = src;
    };
    set(bBack, "back", idx <= 0);
    set(bFwd, "forward", idx >= hist.length - 1);
    bStop.classList.toggle("disabled", !loading);
  }

  const viewSource = () => ctx.launch("notepad", { text: /^[A-Z]:/i.test(current) ? ctx.fs.readFile(current) : pages[current] || `<!-- Source of ${current} is not available in embedded view -->` });
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const about = () => go("about:netscape");

  const menus = menuBar({
    File: [
      { label: "New", submenu: [{ label: "Navigator Window", shortcut: "Ctrl+N", action: () => ctx.launch("netscape") }, off("Message"), off("Blank Page")] },
      { label: "Open Page...", shortcut: "Ctrl+O", action: async () => { const t = await ctx.dialogs.prompt("Enter the World Wide Web location (URL) or specify the local file you would like to open:", "", { title: "Open Page" }); if (t) go(t); } },
      { label: "Save As...", shortcut: "Ctrl+S", disabled: true },
      off("Save Frame As..."),
      off("Send Page..."),
      off("Edit Page"),
      separator(),
      off("Offline"),
      separator(),
      off("Page Setup..."),
      { label: "Print Preview", disabled: true },
      { label: "Print...", shortcut: "Ctrl+P", action: () => ctx.printText?.(viewport.innerText || "", current) },
      separator(),
      { label: "Close", shortcut: "Ctrl+W", action: () => w.close() },
      { label: "Exit", shortcut: "Ctrl+Q", action: () => w.close() },
    ],
    Edit: [
      off("Undo", { shortcut: "Ctrl+Z" }),
      off("Redo", { shortcut: "Ctrl+Y" }),
      separator(),
      off("Cut", { shortcut: "Ctrl+X" }),
      { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
      off("Paste", { shortcut: "Ctrl+V" }),
      separator(),
      { label: "Select All", shortcut: "Ctrl+A", action: () => { const r = document.createRange(); r.selectNodeContents(viewport); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } },
      separator(),
      { label: "Find in Page...", shortcut: "Ctrl+F", action: async () => { const t = await ctx.dialogs.prompt("Find:", "", { title: "Find" }); if (t) window.find(t); } },
      off("Find Again", { shortcut: "Ctrl+G" }),
      separator(),
      { label: "Preferences...", action: async () => { const t = await ctx.dialogs.prompt("Home page location:", ctx.settings.get("nsHome") || "about:home", { title: "Preferences" }); if (t) ctx.settings.set("nsHome", t); } },
    ],
    View: [
      { label: "Show", submenu: [{ label: "Navigation Toolbar", checked: true }, { label: "Location Toolbar", checked: true }, { label: "Personal Toolbar", checked: true }] },
      separator(),
      { label: "Increase Font", shortcut: "Ctrl+]", action: () => (viewport.style.zoom = String((parseFloat(viewport.style.zoom) || 1) + 0.1)) },
      { label: "Decrease Font", shortcut: "Ctrl+[", action: () => (viewport.style.zoom = String(Math.max(0.5, (parseFloat(viewport.style.zoom) || 1) - 0.1))) },
      separator(),
      { label: "Reload", shortcut: "Ctrl+R", action: () => render() },
      off("Show Images"),
      { label: "Refresh", action: () => render() },
      { label: "Stop Page Loading", shortcut: "Esc", action: stop },
      separator(),
      { label: "Page Source", shortcut: "Ctrl+U", action: viewSource },
      off("Page Info", { shortcut: "Ctrl+I" }),
      separator(),
      { label: "Encoding", submenu: [{ label: "Western (ISO-8859-1)", checked: true }, { label: "Unicode (UTF-8)" }] },
    ],
    Go: () => [
      { label: "Back", shortcut: "Alt+Left", disabled: idx <= 0, action: back },
      { label: "Forward", shortcut: "Alt+Right", disabled: idx >= hist.length - 1, action: fwd },
      { label: "Home", action: home },
      separator(),
      ...hist.slice(-9).reverse().map((h, i) => ({ label: `${i + 1}  ${h}`, action: () => go(h) })),
    ],
    Communicator: [
      { label: "Navigator", shortcut: "Ctrl+1", checked: true },
      { label: "Messenger Mailbox", shortcut: "Ctrl+2", action: () => ctx.launch("outlook") },
      off("Collabra Discussions", { shortcut: "Ctrl+3" }),
      off("Page Composer", { shortcut: "Ctrl+4" }),
      off("Conference"),
      separator(),
      off("Show Component Bar"),
      off("Bookmarks"),
      off("History"),
      separator(),
      off("Java Console"),
      off("Security Info"),
    ],
    Help: [
      off("Help Contents"),
      off("Release Notes"),
      off("Product Information and Support"),
      off("Software Updates"),
      off("Member Services"),
      separator(),
      { label: "About Communicator", action: about },
    ],
  });

  const bookmarksBtn = el("button", { class: "ns-bm", type: "button", title: "Bookmarks" }, el("img", { src: IMG + "bookmarks.png", alt: "", draggable: "false" }));
  const bms = () => ctx.settings.get("nsBookmarks") || [
    { title: "Netscape Netcenter", url: "about:home" },
    { title: "Wikipedia", url: "https://www.wikipedia.org/" },
    { title: "The Internet Archive", url: "https://archive.org/" },
  ];
  bookmarksBtn.addEventListener("click", () => {
    const r = bookmarksBtn.getBoundingClientRect();
    popup([
      { label: "Add Bookmark", shortcut: "Ctrl+D", action: () => ctx.settings.set("nsBookmarks", [...bms(), { title, url: current }]) },
      off("File Bookmark"),
      off("Edit Bookmarks...", { shortcut: "Ctrl+B" }),
      separator(),
      ...bms().map((b) => ({ label: b.title || b.url, icon: "nshtml", action: () => go(b.url) })),
    ], r.left, r.bottom, { anchor: bookmarksBtn });
  });

  const personal = (label, action) => button([el("img", { src: "/assets/icons/nshtml-16x16.png", alt: "", width: 16, height: 16 }), el("span", { text: label })], action, { class: "ns-pt" });

  const nav = el("div", { class: "ns-bar ns-nav" }, el("span", { class: "ns-grip" }), bBack, bFwd, bReload, bHome, bSearch, bNs, bPrint, bSec, bStop, el("span", { class: "ns-spacer" }), throbber);
  const loc = el("div", { class: "ns-bar ns-loc" }, el("span", { class: "ns-grip" }), bookmarksBtn, el("span", { class: "ns-loc-label", text: "Location:" }), el("div", { class: "ns-loc-field" }, el("img", { src: "/assets/icons/nshtml-16x16.png", alt: "", draggable: "false" }), address), el("img", { class: "ns-related", src: IMG + "related.png", alt: "What's Related", draggable: "false" }));
  const pers = el("div", { class: "ns-bar ns-pers" }, el("span", { class: "ns-grip" }), personal("Internet", () => go("about:home")), personal("Lookup", () => go("about:home")), personal("New&Cool", () => go("about:netscape")));
  const status = el("div", { class: "ns-status" }, el("img", { src: IMG + "st-lock.png", alt: "", draggable: "false" }), msg, el("img", { class: "ns-comp", src: IMG + "st-comp.png", alt: "", draggable: "false" }));

  w.setContent(menus, nav, loc, pers, viewport, status);
  w.onClose?.(() => clearInterval(timer));

  address.addEventListener("keydown", (e) => e.key === "Enter" && go(address.value));
  throbber.addEventListener("click", () => go("http://home.netscape.com/"));
  w.el.addEventListener("keydown", (e) => {
    if (e.key === "Escape") stop();
    if (e.ctrlKey && e.key.toLowerCase() === "r") { e.preventDefault(); render(); }
  });
  const first = path || url || ctx.settings.get("nsHome") || "about:home";
  go(first);
  return w;
}
