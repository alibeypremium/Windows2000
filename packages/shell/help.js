import { refWindow } from "../control-panel/refkit.js";
import { el, button, icon, statusBar, tabs, checkbox, popup } from "../ui/index.js";
const topics = {
  welcome: {
    title: "Welcome to Windows 2000",
    paragraphs: [
      "Welcome to your Windows 2000 Professional browser desktop. Open programs from the Start menu, manage files in My Computer, and customize the computer through Control Panel.",
      "The shell follows the Windows 2000 visual language: Tahoma text, square beveled controls, gradient title bars, and a classic taskbar. Applications share the same virtual drive, clipboard, settings, and window manager.",
    ],
    links: [
      ["Open My Computer", "explorer", { path: "computer" }],
      [
        "Read the welcome document",
        "notepad",
        {
          path: "C:/Documents and Settings/Administrator/My Documents/Welcome.txt",
        },
      ],
      ["Customize the desktop", "control", { page: "display" }],
    ],
  },
  files: {
    title: "Working with files and folders",
    paragraphs: [
      "My Computer provides the C: virtual hard drive and D: read-only virtual CD-ROM. My Documents is your main workspace. Double-click folders to navigate, use Back, Forward, and Up, or enter a path in the Address bar.",
      "Create, rename, move, copy, and delete files from the File or Edit menus, by using keyboard shortcuts, or through the right-click menu. Drag files between folders. Drop files from your real computer into Explorer to import them.",
      "Deleted files go to the Recycle Bin. Restore returns them to their original folder. Empty Recycle Bin permanently removes the recycled records. Command Prompt DEL performs a permanent deletion.",
      "Files are saved transactionally to IndexedDB in this browser. Browser data clearing, private browsing, or a different site origin can remove or isolate the virtual disk. Use System Properties > Advanced > Back Up Virtual Disk to export a portable backup.",
    ],
    links: [
      ["Open My Documents", "explorer", { path: "documents" }],
      ["Back up your virtual disk", "control", { page: "system" }],
    ],
  },
  windows: {
    title: "Using the desktop",
    paragraphs: [
      "Drag a window by its title bar. Resize it from any edge or corner. Double-click the title bar to maximize or restore. The three title-bar controls minimize, maximize, and close.",
      "The taskbar shows open applications. Click a task to switch to it or minimize the active window. Right-click the taskbar to cascade, tile, or minimize all windows. The Show Desktop button is in Quick Launch.",
      "Right-click the desktop to create a folder or text document, refresh icons, or open Display Properties. Use F2 to rename selected files and Delete to send them to the Recycle Bin.",
      "Shortcuts: Ctrl+Esc opens Start; Ctrl+Shift+Esc opens Task Manager; Alt+F4 closes the active window; Ctrl+S saves documents. Browser-reserved shortcuts may be handled by the host operating system.",
    ],
    links: [["Display Properties", "control", { page: "display" }]],
  },
  notepad: {
    title: "Notepad",
    paragraphs: [
      "Notepad edits plain text files. Use File > Open to select a file, or open a .txt file from Explorer. Save and Save As use the same virtual filesystem as every other application.",
      "The Edit menu provides selection, clipboard operations, Find, Replace, and Time/Date. Format changes word wrapping and the editor font. Download writes the document to your device; Print opens the browser print dialog.",
    ],
    links: [["Open Notepad", "notepad", {}]],
  },
  wordpad: {
    title: "WordPad",
    paragraphs: [
      "WordPad edits formatted documents with fonts, sizes, colors, bold, italic, underlining, alignment, lists, and embedded images.",
      "Save as .wdoc to preserve formatting and embedded pictures. Save as .txt for plain text. Export as HTML from the File menu for use outside this desktop. Basic RTF text can be read, but full native RTF binary-object and layout compatibility is not implemented.",
    ],
    links: [["Open WordPad", "wordpad", {}]],
  },
  paint: {
    title: "Paint",
    paragraphs: [
      "Choose a drawing tool, a foreground color, and a brush size. Right-click a color to select the background color. Drag to draw lines and shapes; hold Shift while drawing shapes to constrain proportions.",
      "The fill tool uses a contiguous pixel flood fill. Select an area to move, copy, clear, or crop it. The Image menu provides rotation, reflection, color inversion, canvas attributes, and clearing. Double-click to finish a polygon. Escape cancels a pending selection or polygon.",
      "Images save as lossless PNG. Open imported PNG, JPEG, BMP, GIF, or WebP files. Browser-supported decoders determine image format availability. Undo history is bounded to avoid exhausting memory.",
      "Paint rasterizes brush strokes into a canvas bitmap and presents that bitmap through WebGPU when available, with WebGL 2 and Canvas 2D fallback. The DOM renders native-feeling controls and text.",
    ],
    links: [["Open Paint", "paint", {}]],
  },
  calculator: {
    title: "Calculator",
    paragraphs: [
      "Calculator provides standard arithmetic, repeat equals, percentage, reciprocal, square root, and memory functions. Choose View > Scientific for trigonometric functions, logarithms, powers, and factorials.",
      "Enter numbers from the keyboard or use the buttons. The engine parses digits and operations directly; it does not evaluate entered text as JavaScript.",
    ],
    links: [["Open Calculator", "calculator", {}]],
  },
  games: {
    title: "Games",
    paragraphs: [
      "Minesweeper offers beginner, intermediate, expert, and custom fields, flagging, chording, a safe first click, and best times. Right-click or touch and hold to mark a square.",
      "Solitaire supports Klondike draw-one and draw-three rules, scoring, hints, undo, card backs, dragging, and automatic foundation moves. FreeCell supports free cells, ordered runs, legal move capacity, and numbered deterministic deals. FreeCell deal numbers are specific to this implementation.",
      "Pinball uses fixed-step physics, bumpers, flippers, a plunger, nudging, scoring, and three balls. Its table geometry, artwork, and mission rules are an approximation; the original Space Cadet game data and engine are not included.",
    ],
    links: [
      ["Play Minesweeper", "minesweeper", {}],
      ["Play Solitaire", "solitaire", {}],
      ["Play FreeCell", "freecell", {}],
      ["Play Pinball", "pinball", {}],
    ],
  },
  internet: {
    title: "Internet and e-mail",
    paragraphs: [
      "Internet Explorer provides an address bar, history, favorites, local HTML viewing, and embedded web pages. Websites can reject embedding. Use Open in Browser when a page cannot be shown inside the desktop. ActiveX, VBScript, and legacy browser plugins are not supported.",
      "Outlook Express stores local messages and drafts. The Send button saves a draft and opens your device’s mail application through mailto. Complete sending there. This desktop does not connect directly to SMTP or POP3.",
      "Address Book stores contacts on the virtual drive. Create, edit, search, and export contacts; choose Send Mail to address a new message.",
    ],
    links: [
      ["Open Internet Explorer", "ie", {}],
      ["Open Outlook Express", "outlook", {}],
      ["Open Address Book", "address", {}],
    ],
  },
  media: {
    title: "Sound, pictures, and video",
    paragraphs: [
      "Windows Media Player opens audio and video files supported by the browser and displays a live audio spectrum. Import Media adds files from your real computer to the virtual drive. A short original synthesized melody is included for playback.",
      "Sound Recorder requests microphone access only when you press Record. Stop the recording, listen to it, and save it as a PCM WAV. Volume Control adjusts desktop sounds.",
      "Imaging views pictures, zooms and rotates the view, prints, downloads, and opens pictures in Paint for editing. CD Player uses imported audio because a web page cannot read an optical drive.",
    ],
    links: [
      ["Open Media Player", "mediaplayer", {}],
      ["Open Sound Recorder", "recorder", {}],
      ["Open Imaging", "imaging", {}],
    ],
  },
  system: {
    title: "System tools",
    paragraphs: [
      "Task Manager lists the actual application windows running in this desktop and lets you switch to or close them. Its performance graph measures browser event-loop delay. The browser does not expose native process CPU counters.",
      "Registry Editor edits the virtual registry stored as JSON on the C: drive. System Information and Device Manager report actual browser capabilities. Event Viewer records activity in the current desktop session.",
      "Command Prompt operates on the shared virtual filesystem and supports common directory, file, environment, text, and process commands. Type HELP for the full supported command list.",
      "Scheduled Tasks starts programs while this desktop is open. It cannot wake a closed browser. Disk Management analyzes virtual file records; the browser manages physical storage allocation.",
    ],
    links: [
      ["Task Manager", "taskmgr", {}],
      ["Command Prompt", "cmd", {}],
      ["System Information", "systeminfo", {}],
    ],
  },
  architecture: {
    title: "Implementation and compatibility",
    paragraphs: [
      "This is a JavaScript reimplementation of the desktop environment, not an x86 emulator or an NT kernel. It cannot execute arbitrary Windows binaries, install native drivers, start native NT services, join Active Directory, or implement original kernel security and networking semantics.",
      "The implementation is split into reusable ES module packages: core, ui, rendering, shell, explorer, accessories, games, control-panel, internet, and system. They share a context containing filesystem, event bus, window manager, settings, clipboard, registry, and application services.",
      "WebGPU is used for desktop and canvas presentation. WebGL 2 and Canvas 2D are automatic fallbacks. Controls and editable text use HTML/CSS for browser input and accessibility. Use ?renderer=canvas2d or ?renderer=webgl2 in the URL to select a fallback explicitly.",
      "Visual fidelity is based on period screenshots, palette values, and icon imagery. Browser font rasterization, responsive window sizing, approximated application screens, and unavailable native features mean this is not a verified pixel-for-pixel reproduction of every Windows 2000 screen.",
      "Windows and associated historic imagery belong to Microsoft. Bundled icon provenance and font licenses are documented in the source. The Tahoma-compatible bundled font comes from Wine.",
    ],
    links: [["System Information", "systeminfo", {}]],
  },
  updates: {
    title: "Windows Update",
    paragraphs: [
      "This browser desktop is maintained as a web application. The original Windows Update service and Windows 2000 operating-system patches are not part of this environment.",
      "Desktop version: 1.0.0. Refresh the page to load the current published version. Your virtual files are preserved in this browser.",
    ],
    links: [],
  },
  shortcuts: {
    title: "Keyboard shortcuts",
    paragraphs: [
      "Ctrl+Esc — Open Start\nCtrl+Shift+Esc — Task Manager\nAlt+F4 — Close active window\nAlt+Tab — Switch windows when the host browser allows it\nWin+D — Show desktop when the host browser allows it",
      "Explorer: F2 rename, Delete delete, F5 refresh, Backspace up, Ctrl+A select all, Ctrl+C copy, Ctrl+X cut, Ctrl+V paste.",
      "Editors: Ctrl+N new, Ctrl+O open, Ctrl+S save. Notepad: Ctrl+F find, Ctrl+H replace, F5 time/date. Games: F2 new game.",
    ],
    links: [],
  },
};
const HH = "/assets/ui/help/";
const HELP = "/assets/help/";
let HELP_DATA = null;
const loadHelp = () => (HELP_DATA ? Promise.resolve(HELP_DATA) : fetch(HELP + "help.json").then((r) => r.json()).then((d) => (HELP_DATA = d)));
const BOOK_ORDER = ["getstart", "howto", "concepts", "tshoot", "cpanel", "display", "access", "hardware", "printing", "folderop", "find", "fonts", "recycle", "keyb", "mouse", "datetime", "sounds", "notepad", "wordpad", "mspaint", "calc", "charmap", "clipbrd", "mplayer", "soundrec", "sndvol32", "freecell", "sol", "winmine", "pinball", "regedit", "taskmgr", "iexplore", "msoe", "nthelp", "dialer", "hypertrm", "mobsync", "osk", "deluxcd", "wab", "MP_w", "glossary"];
const TOPIC_BOOK = { notepad: "notepad", wordpad: "wordpad", paint: "mspaint", calculator: "calc", media: "MP_w", regedit: "regedit", taskmgr: "taskmgr", magnifier: "magnify", hyperterminal: "hypertrm", dialer: "dialer", sync: "mobsync", osk: "osk", cdplayer: "deluxcd", address: "wab", charmap: "charmap", clipbook: "clipbrd", sndrec: "soundrec", volume: "sndvol32", internet: "iexplore", system: "tshoot", games: "sol", solitaire: "sol", freecell: "freecell", minesweeper: "winmine", outlook: "msoe", pinball: "pinball", shortcuts: "folderop" };
const walk = (nodes, fn, path = []) => nodes.forEach((n, i) => (fn(n, [...path, i]), n.c && walk(n.c, fn, [...path, i])));

export function openHelp(ctx, { topic } = {}) {
  const w = ctx.wm.create({
    title: "Windows 2000",
    icon: "hhHelp",
    width: 713,
    height: 634,
    x: 230,
    y: 30,
    appId: "help",
  });
  let current = topic in topics && !(topic in TOPIC_BOOK) ? topic : "start",
    hist = [],
    fwd = [],
    tab = 0,
    hidden = false;
  const open = new Set();
  const img = (name, style = {}) => el("img", { src: HH + name + ".png", draggable: "false", alt: "", style });
  const left = el("div", { class: "hh-left" }),
    right = el("div", { class: "hh-right" }),
    body = el("div", { class: "hh-body" }),
    tree = el("div", { class: "hh-tree" }),
    root = el("div", { class: "hh-root" });
  const tb = (cls, ico, label, x, cx, onclick, disabled = false) => {
    const b = el("div", { class: "hh-tb " + cls + (disabled ? " off" : ""), onclick: () => !b.classList.contains("off") && onclick() }, img(ico), el("span", { text: label }));
    b.style.left = x + "px";
    b.style.setProperty("--cx", cx + "px");
    return b;
  };
  const hide = tb("hide", "hide", "Hide", 0, 0, () => {
    hidden = !hidden;
    root.classList.toggle("hide-left", hidden);
    hide.lastChild.textContent = hidden ? "Show" : "Hide";
  });
  const back = tb("back", "back", "Back", 54, 0, () => go(hist.pop(), "back"), true);
  const fw = tb("fwd", "fwd", "Forward", 109, 0, () => go(fwd.pop(), "fwd"), true);
  const opt = tb("opt", "options", "Options", 164, 0, () => {
    const r = opt.getBoundingClientRect();
    popup([{ label: "Print...", action: () => ctx.printText(body.innerText, "Windows 2000") }], r.left, r.bottom);
  });
  opt.lastChild.innerHTML = "<u>O</u>ptions";
  const web = tb("web", "web", "Web Help", 219, 0, () => ctx.launch("ie"));
  const sync = () => {
    back.classList.toggle("off", !hist.length);
    fw.classList.toggle("off", !fwd.length);
  };
  const go = (key, dir) => {
    if (!key) return;
    if (dir === "back") fwd.push(current);
    else if (dir === "fwd") hist.push(current);
    else (hist.push(current), (fwd.length = 0));
    show(key);
    sync();
  };
  const show = (key) => {
    current = key;
    renderTree();
    if (key === "start") {
      body.replaceChildren(
        el("div", { class: "hh-orange" }),
        img("start-art", { position: "absolute", left: "0", top: "14px" }),
        el("div", { class: "hh-starth", text: "Start Here" }),
        ...[
          ["Find it fast", () => setTab(2)],
          ["If you've used Windows before", () => go("windows")],
          ["Troubleshooting", () => go("system")],
          ["Information and support on the Web", () => ctx.launch("ie")],
        ].map(([t, f], i) => {
          const a = el("div", { class: "hh-start-link", style: { top: 224 + i * 17 + "px" } }, el("i"), el("span", { text: t }));
          a.addEventListener("click", f);
          return a;
        }),
        el("div", { class: "hh-copy", text: "© 1985-1999 Microsoft Corporation.\nAll rights reserved." }),
      );
      return;
    }
    if (key.includes("/")) return showPage(key);
    root.classList.remove("page");
    const t = topics[key];
    body.replaceChildren(
      el("div", { class: "hh-orange" }),
      el(
        "div",
        { class: "hh-article" },
        el("h1", { text: t.title }),
        ...t.paragraphs.map((p) => el("p", { text: p })),
        ...(t.links?.length
          ? [el("div", { class: "hh-rel" }, el("b", { text: "Related tasks" }), ...t.links.map(([label, id, args]) => el("a", { text: label, onclick: () => ctx.launch(id, args) })))]
          : []),
      ),
    );
  };
  const titleOf = (path) => HELP_DATA?.pages.find((p) => p[0] === path)?.[1] ?? path;
  function showPage(path) {
    root.classList.add("page");
    const f = el("iframe", { class: "hh-frame", src: HELP + path });
    f.addEventListener("load", () => {
      const d = f.contentDocument;
      if (!d) return;
      const st = d.createElement("style");
      st.textContent = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } }).filter((r) => r.cssText.includes("scrollbar")).map((r) => r.cssText).join("\n") + "\nbody{margin:8px 14px 8px 20px;font-family:Verdana,Tahoma,Arial,sans-serif}";
      d.head.append(st);
      d.addEventListener("click", (e) => {
        const a = e.target.closest?.("a");
        if (!a) return;
        const ha = a.getAttribute("data-haid"), href = a.getAttribute("href") || "";
        if (ha) {
          e.preventDefault();
          const hits = ha.split(";").map((h) => HELP_DATA.haid[h]).filter(Boolean);
          const r = f.getBoundingClientRect();
          if (hits.length === 1) go(hits[0]);
          else if (hits.length) popup(hits.map((h) => ({ label: titleOf(h), action: () => go(h) })), r.left + e.clientX, r.top + e.clientY);
        } else if (href && !href.startsWith("#")) {
          e.preventDefault();
          if (/^[a-z]+:/i.test(href)) return ctx.launch("ie", { url: href });
          const u = new URL(href, f.contentWindow.location.href), i = u.pathname.indexOf("assets/help/");
          if (i >= 0) go(u.pathname.slice(i + 12));
        }
      });
    });
    body.replaceChildren(el("div", { class: "hh-orange" }), f);
  }
  function bookNodes() {
    const books = [];
    BOOK_ORDER.forEach((k) => HELP_DATA.toc[k]?.forEach((n) => books.push([k, n])));
    return books;
  }
  function firstLeaf(nodes) {
    let r = null;
    walk(nodes, (n) => !r && n.l && (r = n.l));
    return r;
  }
  function revealCurrent() {
    if (!HELP_DATA || !current.includes("/")) return;
    bookNodes().forEach(([k, n], bi) =>
      walk([n], (x, path) => {
        if (x.l === current) path.slice(0, -1).forEach((_, j) => open.add(k + "." + bi + "." + path.slice(0, j + 1).join(".")));
      }),
    );
  }
  function renderTree() {
    const row = (ico, text, { x = 0, sel = false, onclick } = {}) => {
      const r = el("div", { class: "hh-row" }, img(ico), el("span", { text, class: sel ? "sel" : "" }));
      r.style.paddingLeft = x + "px";
      r.addEventListener("click", onclick);
      return r;
    };
    const rows = [row("start", "Start Here", { sel: current === "start", onclick: () => go("start") })];
    if (HELP_DATA) {
      revealCurrent();
      const add = (k, bi, n, path, depth) => {
        const id = k + "." + bi + "." + path.join("."), kids = n.c?.length;
        rows.push(
          row(kids ? "book" : "start", n.n, {
            x: depth * 16,
            sel: !!n.l && current === n.l,
            onclick: () => {
              if (kids) open.has(id) ? open.delete(id) : open.add(id);
              if (n.l && n.l !== current) go(n.l);
              else renderTree();
            },
          }),
        );
        if (kids && open.has(id)) n.c.forEach((c, i) => add(k, bi, c, [...path, i], depth + 1));
      };
      bookNodes().forEach(([k, n], bi) => add(k, bi, n, [0], 0));
    }
    const mine = "Windows2000 Notes";
    rows.push(row("book", mine, { onclick: () => (open.has(mine) ? open.delete(mine) : open.add(mine), renderTree()) }));
    if (open.has(mine)) Object.entries(topics).forEach(([k, t]) => rows.push(row("start", t.title, { x: 16, sel: current === k, onclick: () => go(k) })));
    tree.replaceChildren(...rows);
  }
  const panel = el("div", { class: "hh-panel" });
  const list = el("div", { class: "hh-list" });
  const input = el("input", { class: "hh-input", oninput: () => fillList() });
  function fillList() {
    const q = input.value.toLowerCase().trim();
    if (!HELP_DATA) return list.replaceChildren();
    let items = [];
    if (tab === 1) items = HELP_DATA.index.filter(([n]) => !q || n.toLowerCase().includes(q)).slice(0, 400).map(([n, l]) => [n, l]);
    else if (q) {
      const sets = q.split(/\s+/).map((w) => new Set(HELP_DATA.words[w] || []));
      items = [...sets[0]].filter((i) => sets.every((st) => st.has(i))).slice(0, 300).map((i) => HELP_DATA.pages[i].slice().reverse());
    }
    list.replaceChildren(...items.map(([t, l]) => el("div", { class: "hh-row", onclick: () => go(l) }, img("start"), el("span", { text: t }))));
  }
  const tabs = ["Contents", "Index", "Search", "Favorites"].map((t, i) => {
    const n = el("div", { class: "hh-tab t" + i, onclick: () => setTab(i) });
    n.innerHTML = t === "Contents" ? "<u>C</u>ontents" : t === "Index" ? "In<u>d</u>ex" : t === "Search" ? "<u>S</u>earch" : "F<u>a</u>vorites";
    return n;
  });
  function setTab(i) {
    tab = i;
    tabs.forEach((t, j) => t.classList.toggle("on", j === i));
    panel.replaceChildren(...(i === 0 ? [tree] : i === 3 ? [el("div", { class: "hh-list" })] : [el("div", { class: "hh-lbl", text: i === 1 ? "Type in the keyword to find:" : "Type in the word(s) to search for:" }), input, list]));
    root.classList.toggle("has-input", i === 1 || i === 2);
    input.value = "";
    if (i === 0) renderTree();
    else fillList();
  }
  const sb = el("div", { class: "rk-vscroll disabled hh-sb" }, el("span", { class: "sb up" }), el("span", { class: "sb down" }));
  left.append(...tabs, panel);
  right.append(body, sb);
  root.append(el("div", { class: "hh-toolbar" }, hide, back, fw, opt, web), left, right);
  w.setContent(root);
  setTab(0);
  show(current);
  loadHelp().then(() => {
    if (topic in TOPIC_BOOK) {
      const l = firstLeaf(HELP_DATA.toc[TOPIC_BOOK[topic]] || []);
      if (l) current = l;
    }
    renderTree();
    if (tab !== 0) fillList();
    if (current.includes("/")) show(current);
  });
  return w;
}

export function openWelcome(ctx) {
  const w = refWindow(ctx, {
    title: "Getting Started with Windows 2000",
    icon: "windows",
    width: 484,
    height: 347,
    x: 270,
    y: 196,
    appId: "welcome",
  });
  const SLIDES = [
    ["s1", "You can access all your documents, programs, and\nsettings from the start button."],
    ["s2", 'Click "X" to close a window or program.'],
    ["s3", "Use Control Panel to customize your desktop and\nconfigure your computer."],
    ["s4", "Click Start, then Help for assistance with Windows\nfeatures."],
  ];
  const at = (x, y) => ({ left: x + "px", top: y + "px" });
  const menuItem = (label, hot, y, onclick) => {
    const n = el("div", { class: "gs-item", style: at(13, y) });
    n.append(el("u", { text: label[hot] }), label.slice(hot + 1));
    if (hot) n.prepend(label.slice(0, hot));
    n.addEventListener("click", onclick);
    return n;
  };
  const items = [
    menuItem("Register Now", 0, 120, () => show("start")),
    menuItem("Discover Windows", 0, 145, () => show("discover")),
    menuItem("Connect to the Internet", 0, 170, () => show("connect")),
  ];
  const pane = el("div", { class: "gs-pane" });
  let timer = 0,
    slide = 0;
  const setItems = (states) =>
    items.forEach((n, i) => n.classList.toggle("off", !states[i]));
  const body = (title, lines, ...extra) => [
    el("div", { class: "gs-title", text: title }),
    el("div", { class: "gs-text", text: lines }),
    ...extra,
  ];
  const img = (name, x, y, wd, ht) =>
    el("img", { class: "gs-img", src: `/assets/ui/gs/${name}.png`, alt: "", style: { ...at(x, y), width: wd + "px", height: ht + "px" } });
  function show(page) {
    clearInterval(timer);
    pane.replaceChildren();
    if (page === "start") {
      setItems([1, 0, 0]);
      const draw = () => {
        const [name, text] = SLIDES[slide];
        pane.replaceChildren(...body("Getting Started", text, img(name, 190, 184, 230, 130)));
      };
      draw();
      timer = setInterval(() => {
        slide = (slide + 1) % SLIDES.length;
        draw();
      }, 5000);
    } else if (page === "connect") {
      setItems([1, 0, 1]);
      const ie = el("div", { class: "gs-hit", style: { ...at(198, 228), width: "58px", height: "76px" }, title: "Internet Explorer" });
      ie.addEventListener("dblclick", () => ctx.launch("ie"));
      const oe = el("div", { class: "gs-hit", style: { ...at(258, 228), width: "62px", height: "76px" }, title: "Outlook Express" });
      oe.addEventListener("dblclick", () => ctx.launch("mail"));
      pane.replaceChildren(
        ...body(
          "Getting Started",
          "Use Internet Explorer to find and view information from\nall sources including the Internet.\n\nUse Outlook Express to send and receive e-mail\nmessages.",
          img("connect", 190, 222, 140, 92),
          ie,
          oe,
        ),
      );
    } else {
      setItems([1, 1, 1]);
      pane.replaceChildren(
        ...body(
          "Getting Started",
          "Click an icon twice quickly (double-click) to open a file,\nfolder, program, or drive.",
          img("mouse", 280, 180, 110, 120),
        ),
      );
    }
  }
  const exit = el("div", { class: "gs-exit", role: "button" }, el("u", { text: "E" }), "xit");
  exit.addEventListener("click", () => w.close());
  const box = el("span", { class: "gs-box" + (ctx.settings.get("showWelcome") ? " on" : "") });
  const startup = el("div", { class: "gs-startup", role: "checkbox", tabindex: 0 }, box, el("span", { class: "gs-startup-label" }, el("u", { text: "S" }), "how this screen at startup"));
  startup.addEventListener("click", () => {
    const v = !box.classList.contains("on");
    box.classList.toggle("on", v);
    ctx.settings.set("showWelcome", v);
  });
  w.place(
    el("img", { class: "gs-banner", src: "/assets/ui/gs/banner.png", alt: "" }),
    el("div", { class: "gs-left" }),
    el("div", { class: "gs-right" }),
    ...items,
    pane,
    startup,
    exit,
  );
  w.addCleanup?.(() => clearInterval(timer));
  const close = w.close.bind(w);
  w.close = (...a) => (clearInterval(timer), close(...a));
  show("start");
  return w;
}
export function openAbout(ctx) {
  const w = ctx.wm.create({
    title: "About Windows",
    icon: "computer",
    width: 460,
    height: 325,
    appId: "about",
    dialog: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
  });
  w.setContent(
    el(
      "div",
      { class: "about-banner" },
      icon("windows", 32),
      el(
        "div",
        {},
        el("span", { text: "Microsoft" }),
        el("h1", { text: "Windows 2000" }),
        el("b", { text: "Professional" }),
      ),
    ),
    el(
      "div",
      { class: "about-content" },
      el("p", {
        text: "Microsoft Windows 2000\nVersion 5.0 (Build 2195) · Browser recreation",
      }),
      el("p", {
        text: "This product is registered to:\n" + ctx.settings.get("username"),
      }),
      el("hr"),
      el("p", {
        text:
          "Browser desktop 1.0.0\nRendering: " + ctx.renderer.surface.backend,
      }),
      button(
        "Implementation and compatibility",
        () => ctx.launch("help", { topic: "architecture" }),
        { class: "text-link" },
      ),
    ),
    el(
      "div",
      { class: "dialog-buttons" },
      button("OK", () => w.close(), { class: "default-button" }),
    ),
  );
  return w;
}
