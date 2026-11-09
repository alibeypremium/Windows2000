/** @package @win2k/explorer — shell namespace, file management and search. */
import {
  DOCS,
  DESKTOP,
  basename,
  dirname,
  joinPath,
  normalizePath,
  extension,
  formatBytes,
  downloadFile,
  pickFiles,
} from "../core/index.js";
import {
  el,
  button,
  icon,
  fileIcon,
  toolbar,
  statusBar,
  popup,
  separator,
  safely,
} from "../ui/index.js";
const shellNames = {
  computer: "My Computer",
  documents: "My Documents",
  network: "My Network Places",
  recycle: "Recycle Bin",
  control: "Control Panel",
  admintools: "Administrative Tools",
  printers: "Printers",
  tasks: "Scheduled Tasks",
  fonts: "Fonts",
  search: "Search Results",
};
const BITMAP_FONTS = new Set(["Courier 10,12,15", "Modern", "MS Sans Serif 8,10,12,14,18,24", "MS Serif 8,10,12,14,18,24", "Roman", "Script", "Small Fonts", "Symbol 8,10,12,14,18,24", "Terminal"]);
const FONT_ITEMS = [
  "Arial", "Arial Black", "Arial Bold", "Arial Bold Italic", "Arial Italic", "Comic Sans MS", "Comic Sans MS Bold", "Courier 10,12,15",
  "Courier New", "Courier New Bold", "Courier New Bold Italic", "Courier New Italic", "Georgia", "Georgia Bold", "Georgia Bold Italic", "Georgia Italic",
  "Impact", "Lucida Console", "Lucida Sans Unicode", "Microsoft Sans Serif Regular", "Modern", "MS Sans Serif 8,10,12,14,18,24", "MS Serif 8,10,12,14,18,24", "Palatino Linotype",
  "Palatino Linotype Bold", "Palatino Linotype Bold Italic", "Palatino Linotype Italic", "Roman", "Script", "Small Fonts", "Symbol", "Symbol 8,10,12,14,18,24",
  "Tahoma", "Tahoma Bold", "Terminal", "Times New Roman", "Times New Roman Bold", "Times New Roman Bold Italic", "Times New Roman Italic", "Trebuchet MS",
  "Trebuchet MS Bold", "Trebuchet MS Bold Italic", "Trebuchet MS Italic", "Verdana", "Verdana Bold", "Verdana Bold Italic", "Verdana Italic", "Webdings", "Wingdings",
].map((name) => ({
  name,
  path: "fonts:" + name,
  type: "special",
  icon: BITMAP_FONTS.has(name) ? "fontBmp" : "fontTT",
}));
export function openExplorer(ctx, { path = "computer", title } = {}) {
  if (path === "documents") path = DOCS;
  const w = ctx.wm.create({
    title: title || shellNames[path] || basename(path),
    icon: locationIcon(path),
    width: path === "fonts" ? 675 : path === "printers" ? 678 : path === "tasks" ? 679 : 721,
    height: path === "fonts" ? 455 : path === "printers" ? 456 : path === "tasks" ? 515 : 537,
    ...(path === "fonts" ? { x: 218, y: 33 } : path === "printers" ? { x: 220, y: 47 } : path === "tasks" ? { x: 219, y: 47 } : {}),
    appId: "explorer",
  });
  w.el.classList.add("explorer-window");
  let current = path,
    history = [path],
    historyIndex = 0,
    selected = new Set(),
    view = path === "recycle" ? "details" : "icons",
    treeVisible = false,
    sortBy = "name",
    sortDirection = 1,
    descEl = null,
    shownFiles = new Set(),
    query = "";
  const address = el("input", {
      value: displayPath(current),
      "aria-label": "Address",
      class: "explorer-address",
    }),
    listing = el("div", {
      class: "file-list icons-view",
      role: "listbox",
      "aria-label": "Files and folders",
      tabindex: 0,
    }),
    side = el("aside", { class: "explorer-side" }),
    content = el("div", { class: "explorer-content" }, side, listing),
    status = explorerStatus();
  const navigate = (p, push = true) => {
    if (!shellNames[p]) {
      if (/^a:[\\/]?$/i.test(String(p).trim()))
        throw new Error("A:\\ is not accessible.\n\nThe device is not ready.");
      p = normalizePath(p);
      const node = ctx.fs.get(p);
      if (!node || node.trashed)
        throw new Error("The folder could not be found.");
      if (node.type === "file") return ctx.openFile(p);
    }
    if (p === "recycle") view = "details";
    else if (current === "recycle") view = "icons";
    current = p;
    selected.clear();
    if (push) {
      history = history.slice(0, historyIndex + 1);
      history.push(p);
      historyIndex = history.length - 1;
    }
    render();
  };
  const goBack = () => {
      if (historyIndex > 0) navigate(history[--historyIndex], false);
    },
    goForward = () => {
      if (historyIndex < history.length - 1)
        navigate(history[++historyIndex], false);
    };
  const goUp = () => {
    if (current === "computer") return;
    if (["admintools", "printers", "fonts", "tasks"].includes(current)) navigate("control");
    else if (shellNames[current] || current.length === 3) navigate("computer");
    else navigate(dirname(current));
  };
  const items = () => {
    if (current === "computer")
      return [
        {
          name: "3½ Floppy (A:)",
          path: "A:/",
          type: "folder",
          icon: "floppy",
          detail: "3½-Inch Floppy Disk",
        },
        {
          name: "Local Disk (C:)",
          path: "C:/",
          type: "folder",
          icon: "drive",
          detail: "Local Disk",
        },
        {
          name: "Compact Disc (D:)",
          path: "D:/",
          type: "folder",
          icon: "cd",
          detail: "CD-ROM",
        },
        {
          name: "Control Panel",
          path: "control",
          type: "special",
          icon: "control",
        },
      ];
    if (current === "control")
      return ctx.controlItems.map((p) => ({
        name: p.name,
        label: p.label,
        path: "control:" + p.id,
        type: "special",
        icon: p.icon || "settings",
        detail: p.description,
        description: p.description,
        unavailable: p.unavailable,
      }));
    if (current === "admintools")
      return [
        ["compsvc", "Component Services", "adminCompSvc"],
        ["compmgmt", "Computer Management", "adminCompMgmt"],
        ["odbc", "Data Sources (ODBC)", "adminOdbc"],
        ["eventvwr", "Event Viewer", "adminEventVwr"],
        ["secpol", "Local Security Policy", "adminSecPol"],
        ["perf", "Performance", "adminPerf"],
        ["services", "Services", "adminServices"],
        ["telnet", "Telnet Server Administration", "adminTelnet"],
      ].map(([id, name, ico]) => ({
        name,
        path: "admin:" + id,
        type: "special",
        icon: ico,
        description: "Configures administrative settings for your computer",
      }));
    if (current === "fonts") return FONT_ITEMS;
    if (current === "printers")
      return [
        {
          name: "Add Printer",
          path: "printers:add",
          type: "special",
          icon: "addPrinter",
        },
      ];
    if (current === "tasks")
      return [{ name: "Add Scheduled Task", path: "tasks:add", type: "special", icon: "addTask" }];
    if (current === "network")
      return [
        {
          name: "Add Network Place",
          path: "network:add",
          type: "special",
          icon: "netAdd",
        },
        {
          name: "Entire Network",
          path: "network:all",
          type: "special",
          icon: "netEntire",
        },
        {
          name: "Computers Near Me",
          path: "network:near",
          type: "special",
          icon: "netNear",
        },
      ];
    if (current === "recycle") return ctx.fs.recycled();
    if (current === "search") return query ? ctx.fs.search(query) : [];
    return ctx.fs.list(current, {
      includeHidden: ctx.settings.get("showHiddenFiles"),
    });
  };
  const activate = (n) => {
    if (current === "recycle") {
      properties(n);
      return;
    }
    if (n.path.startsWith("control:")) {
      const id = n.path.slice(8);
      if (id === "administrative") navigate("admintools");
      else if (id === "printers") ctx.launch("explorer", { path: "printers" });
      else if (id === "fonts") ctx.launch("explorer", { path: "fonts" });
      else if (id === "tasks") ctx.launch("explorer", { path: "tasks" });
      else if (n.unavailable)
        ctx.dialogs.message(
          `${n.name} is not available in this browser simulation.`,
          { title: n.name, icon: "info" },
        );
      else ctx.launch("control", { page: id });
    } else if (n.path.startsWith("admin:")) {
      const id = n.path.slice(6),
        app = { eventvwr: "events", compmgmt: "diskmanager", perf: "taskmgr" }[id];
      if (app) ctx.launch(app);
      else
        ctx.dialogs.message(
          `${n.name} is not available in this browser simulation.`,
          { title: n.name, icon: "info" },
        );
    } else if (n.path.startsWith("fonts:")) ctx.launch("fontview", { name: n.path.slice(6) });
    else if (n.path === "printers:add") ctx.launch("control", { page: "printers" });
    else if (n.path === "tasks:add") ctx.launch("taskwizard");
    else if (n.path === "tasks") ctx.launch("explorer", { path: "tasks" });
    else if (n.path === "network:all" || n.path === "network:near")
      ctx.launch("control", { page: "network" });
    else if (n.path === "network:add")
      ctx.dialogs.message(
        "The Add Network Place wizard is not available in this browser simulation.",
        { title: "Add Network Place", icon: "info" },
      );
    else if (n.type === "folder" || shellNames[n.path]) navigate(n.path);
    else ctx.openFile(n.path);
  };
  const properties = (n) => {
    if (!n) n = items().find((n) => selected.has(n.path));
    if (!n) {
      ctx.launch("control", {
        page: current === "computer" ? "system" : "folder",
      });
      return;
    }
    if (n.type === "special") {
      ctx.dialogs.message(n.detail || n.name, {
        title: n.name + " Properties",
        icon: n.icon || "folder",
      });
      return;
    }
    const stat = ctx.fs.stat(n.path);
    ctx.dialogs.message(
      `Type: ${stat.type === "folder" ? "File Folder" : extension(stat.name).toUpperCase() + " File"}\nLocation: ${dirname(stat.originalPath || n.path).replaceAll("/", "\\")}\nSize: ${formatBytes(stat.size)}\nCreated: ${new Date(stat.created).toLocaleString()}\nModified: ${new Date(stat.modified).toLocaleString()}${stat.trashed ? "\nDeleted: " + new Date(stat.deleted).toLocaleString() : ""}`,
      { title: n.name + " Properties", icon: fileIcon(n) },
    );
  };
  const newFolder = async () => {
    const folder = shellNames[current] ? DOCS : current;
    const name = await ctx.dialogs.prompt(
      "Type a name for the new folder:",
      ctx.fs.uniqueName(folder, "New Folder"),
      { title: "New Folder" },
    );
    if (name) {
      const p = await ctx.fs.mkdir(joinPath(folder, name));
      selected = new Set([p]);
      render();
    }
  };
  const newText = async () => {
    const folder = shellNames[current] ? DOCS : current;
    const name = await ctx.dialogs.prompt(
      "Type a name for the new document:",
      ctx.fs.uniqueName(folder, "New Text Document.txt"),
      { title: "New Text Document" },
    );
    if (name) {
      const p = await ctx.fs.writeFile(joinPath(folder, name), "");
      ctx.openFile(p);
    }
  };
  const rename = async () => {
    const p = [...selected][0];
    if (!p || !ctx.fs.exists(p)) return;
    const name = await ctx.dialogs.prompt(
      "Type a new name for this item:",
      basename(p),
      { title: "Rename" },
    );
    if (name) {
      const np = await ctx.fs.rename(p, name);
      selected = new Set([np]);
      render();
    }
  };
  const remove = async () => {
    if (!selected.size) return;
    const valid = [...selected].filter((p) => ctx.fs.exists(p));
    if (!valid.length) return;
    const permanent = current === "recycle";
    if (
      await ctx.dialogs.confirm(
        `Are you sure you want to ${permanent ? "permanently delete" : "send to the Recycle Bin"} ${valid.length === 1 ? "“" + basename(valid[0]) + "”" : `these ${valid.length} items`}?`,
        "Confirm File Delete",
      )
    ) {
      for (const p of valid) await ctx.fs.remove(p, { permanent });
      selected.clear();
      render();
    }
  };
  const copy = (mode) =>
      ctx.clipboard.setFiles(
        [...selected].filter((p) => ctx.fs.exists(p)),
        mode,
      ),
    paste = async () => {
      if (!shellNames[current]) await ctx.clipboard.pasteFiles(ctx.fs, current);
      else if (current === "computer")
        await ctx.clipboard.pasteFiles(ctx.fs, DOCS);
    };
  const download = () => {
    for (const p of selected) {
      const n = ctx.fs.stat(p);
      if (n.type === "file")
        downloadFile(n.name, n.content, n.mime, n.encoding);
    }
  };
  const importFiles = async () => {
    const files = await pickFiles({ multiple: true });
    for (const file of files)
      await ctx.fs.importFile(file, shellNames[current] ? DOCS : current);
  };
  const restore = async () => {
    for (const p of selected) await ctx.fs.restore(p);
    selected.clear();
    render();
  };
  const contextItems = () =>
    current === "recycle"
      ? [
          { label: "Restore", disabled: !selected.size, action: restore },
          { label: "Delete", disabled: !selected.size, action: remove },
          separator(),
          {
            label: "Empty Recycle Bin",
            action: async () => {
              if (
                await ctx.dialogs.confirm(
                  "Are you sure you want to permanently delete all the items?",
                  "Confirm Delete",
                )
              )
                (await ctx.fs.emptyRecycleBin(), ctx.sound.play("recycle"));
            },
          },
          { label: "Properties", action: () => properties() },
        ]
      : [
          {
            label: "Open",
            disabled: !selected.size,
            action: () => {
              for (const n of items()) if (selected.has(n.path)) activate(n);
            },
          },
          {
            label: "Open in New Window",
            disabled: !selected.size,
            action: () => {
              const n = items().find((n) => selected.has(n.path));
              if (n) {
                if (n.type === "folder" || shellNames[n.path])
                  return openExplorer(ctx, { path: n.path });
                return activate(n);
              }
            },
          },
          separator(),
          {
            label: "Cut",
            shortcut: "Ctrl+X",
            disabled: !selected.size,
            action: () => copy("cut"),
          },
          {
            label: "Copy",
            shortcut: "Ctrl+C",
            disabled: !selected.size,
            action: () => copy("copy"),
          },
          {
            label: "Paste",
            shortcut: "Ctrl+V",
            disabled: !ctx.clipboard.files.length,
            action: paste,
          },
          separator(),
          {
            label: "New",
            submenu: [
              { label: "Folder", icon: "folder", action: newFolder },
              { label: "Text Document", icon: "notepad", action: newText },
            ],
          },
          {
            label: "Delete",
            shortcut: "Del",
            disabled: !selected.size,
            action: remove,
          },
          {
            label: "Rename",
            shortcut: "F2",
            disabled: selected.size !== 1,
            action: rename,
          },
          separator(),
          { label: "Properties", action: () => properties() },
        ];
  const viewMenu = () => [
    {
      label: "Large Icons",
      checked: view === "icons",
      action: () => {
        view = "icons";
        render();
      },
    },
    {
      label: "Small Icons",
      checked: view === "small",
      action: () => {
        view = "small";
        render();
      },
    },
    {
      label: "List",
      checked: view === "list",
      action: () => {
        view = "list";
        render();
      },
    },
    {
      label: "Details",
      checked: view === "details",
      action: () => {
        view = "details";
        render();
      },
    },
    separator(),
    {
      label: "Explorer Bar",
      submenu: [
        {
          label: "Folders",
          checked: treeVisible,
          action: () => {
            treeVisible = !treeVisible;
            renderSide();
          },
        },
      ],
    },
    { label: "Refresh", shortcut: "F5", action: render },
  ];
  w.setMenu({
    File: () => [
      {
        label: "New",
        submenu: [
          { label: "Folder", action: newFolder },
          { label: "Text Document", action: newText },
        ],
      },
      {
        label: "Open",
        disabled: !selected.size,
        action: () =>
          items()
            .filter((n) => selected.has(n.path))
            .forEach(activate),
      },
      { label: "Import Files...", action: importFiles },
      { label: "Download", disabled: !selected.size, action: download },
      separator(),
      { label: "Delete", action: remove },
      { label: "Rename", action: rename },
      { label: "Properties", action: () => properties() },
      separator(),
      { label: "Close", action: () => w.close() },
    ],
    Edit: () => [
      {
        label: "Cut",
        shortcut: "Ctrl+X",
        action: () => copy("cut"),
        disabled: !selected.size,
      },
      {
        label: "Copy",
        shortcut: "Ctrl+C",
        action: () => copy("copy"),
        disabled: !selected.size,
      },
      {
        label: "Paste",
        shortcut: "Ctrl+V",
        action: paste,
        disabled: !ctx.clipboard.files.length,
      },
      separator(),
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => {
          selected = new Set(items().map((n) => n.path));
          renderSelection();
        },
      },
    ],
    View: viewMenu,
    Favorites: [
      { label: "My Documents", action: () => navigate(DOCS) },
      { label: "Desktop", action: () => navigate(DESKTOP) },
    ],
    Tools: [
      {
        label: "Folder Options...",
        action: () => ctx.launch("control", { page: "folder" }),
      },
    ],
    ...(path === "tasks"
      ? {
          Advanced: [
            { label: "Stop Using Task Scheduler", disabled: true },
            { label: "Pause Task Scheduler", disabled: true },
            { label: "Notify Me of Missed Tasks", action: () => {} },
            { label: "View Log", action: () => {} },
            { label: "AT Service Account...", action: () => {} },
          ],
        }
      : {}),
    Help: [
      { label: "Windows Help", action: () => ctx.launch("help") },
      { label: "About Windows", action: () => ctx.launch("about") },
    ],
  });
  w.el.querySelector(":scope > .menu-bar").append(
    el("img", {
      class: "throbber",
      src: "/assets/ui/explorer/throbber.png",
      alt: "",
      draggable: "false",
    }),
  );
  const SPRITE_DIR = "/assets/ui/explorer/";
  const sprite = (name, x, y, w, h, bx, by) =>
    el("img", {
      class: "tb-sprite",
      src: `${SPRITE_DIR}${name}.png`,
      width: w,
      height: h,
      alt: "",
      draggable: "false",
      style: { left: `${x - bx}px`, top: `${y - by}px` },
    });
  // Buttons are placed at the pixel positions measured on a Windows 2000 reference screenshot.
  const tbButton = (id, [l, r], sprites, label, title, action) => {
    const b = el(
      "button",
      {
        type: "button",
        class: "tb-button",
        id: "tb-" + id,
        title,
        "aria-label": title,
        style: { left: `${l - 126}px`, width: `${r - l + 1}px` },
        onclick: action,
      },
      ...sprites.map(([n, x, y, sw, sh]) => sprite(n, x, y, sw, sh, l, 91)),
      label
        ? el("span", {
            class: "tb-label",
            text: label[0],
            style: { left: `${label[1] - l - 1}px` },
          })
        : null,
    );
    return b;
  };
  const tbSeparator = (x) =>
    el("span", { class: "tb-separator", style: { left: `${x - 126}px` } });
  const historyMenu = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    popup(
      history.map((p, i) => ({
        label: displayPath(p),
        checked: i === historyIndex ? true : undefined,
        action: () => {
          historyIndex = i;
          navigate(history[i], false);
        },
      })),
      r.left,
      r.bottom,
    );
  };
  const moveCopy = (mode) => async () => {
    const files = [...selected].filter((p) => ctx.fs.exists(p));
    if (!files.length) return;
    const dest = await ctx.dialogs.prompt(
      `Type the folder to ${mode === "cut" ? "move" : "copy"} the selected items to:`,
      DOCS,
      { title: mode === "cut" ? "Move Items" : "Copy Items" },
    );
    if (!dest) return;
    const target = normalizePath(dest.replaceAll("\\", "/"));
    ctx.clipboard.setFiles(files, mode);
    await ctx.clipboard.pasteFiles(ctx.fs, target);
    render();
  };
  const tools = el(
    "div",
    { class: "explorer-band explorer-toolbar" },
    tbButton(
      "back",
      [132, 176],
      [["back-disabled", 135, 96, 13, 11]],
      ["Back", 151],
      "Back",
      goBack,
    ),
    tbButton(
      "back-drop",
      [179, 190],
      [["back-drop", 182, 100, 6, 4]],
      null,
      "Recent pages",
      historyMenu,
    ),
    tbButton(
      "forward",
      [194, 212],
      [["fwd-disabled", 197, 96, 13, 11]],
      null,
      "Forward",
      goForward,
    ),
    tbButton(
      "forward-drop",
      [216, 227],
      [["fwd-drop", 219, 100, 6, 4]],
      null,
      "Recent pages",
      historyMenu,
    ),
    tbButton("up", [229, 249], [["up", 232, 95, 15, 13]], null, "Up", goUp),
    tbSeparator(254),
    tbButton(
      "search",
      [260, 315],
      [["search", 263, 93, 16, 16]],
      ["Search", 283],
      "Search",
      () => navigate("search"),
    ),
    tbButton(
      "folders",
      [324, 381],
      [["folders", 327, 94, 15, 14]],
      ["Folders", 345],
      "Folders",
      () => {
        treeVisible = !treeVisible;
        renderSide();
      },
    ),
    tbButton(
      "history",
      [389, 410],
      [["history", 392, 93, 16, 16]],
      null,
      "History",
      historyMenu,
    ),
    tbSeparator(414),
    tbButton(
      "moveto",
      [419, 441],
      [["moveto", 422, 93, 17, 16]],
      null,
      "Move To",
      moveCopy("cut"),
    ),
    tbButton(
      "copyto",
      [443, 465],
      [["copyto", 446, 93, 17, 16]],
      null,
      "Copy To",
      moveCopy("copy"),
    ),
    tbButton(
      "delete",
      [468, 486],
      [["delete", 471, 95, 13, 13]],
      null,
      "Delete",
      remove,
    ),
    tbButton(
      "undo",
      [491, 511],
      [["undo", 494, 96, 15, 10]],
      null,
      "Undo",
      () => ctx.dialogs.message("There is nothing to undo."),
    ),
    tbSeparator(516),
    tbButton(
      "views",
      [521, 549],
      [
        ["views", 524, 94, 16, 14],
        ["views-drop", 542, 100, 5, 3],
      ],
      null,
      "Views",
      (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        popup(viewMenu(), r.left, r.bottom);
      },
    ),
  );
  tools.append(
    el("img", {
      class: "fonts-views",
      src: "/assets/ui/explorer/fonts-views.png",
      alt: "",
      draggable: "false",
      style: { display: "none", position: "absolute", left: "289px", top: "1px" },
    }),
  );
  const setNavState = () => {
    const back = historyIndex > 0,
      fwd = historyIndex < history.length - 1,
      q = (id) => tools.querySelector("#tb-" + id);
    q("back").disabled = !back;
    q("back-drop").disabled = !back && !fwd;
    q("forward").disabled = !fwd;
    q("forward-drop").disabled = !back && !fwd;
    q("back").querySelector("img").src =
      `${SPRITE_DIR}${back ? "back-enabled" : "back-disabled"}.png`;
    q("forward").querySelector("img").src =
      `${SPRITE_DIR}${fwd ? "fwd-enabled" : "fwd-disabled"}.png`;
  };
  const addressIcon = icon("computer"),
    addressRow = el(
      "div",
      { class: "explorer-band explorer-address-band" },
      el("span", { class: "address-label", text: "Address" }),
      el(
        "div",
        { class: "address-combo" },
        addressIcon,
        address,
        el(
          "button",
          {
            type: "button",
            class: "combo-drop",
            "aria-label": "Address history",
            onclick: historyMenu,
          },
          el("img", {
            src: SPRITE_DIR + "combo-arrow.png",
            width: 7,
            height: 4,
            alt: "",
            draggable: "false",
          }),
        ),
      ),
      el(
        "button",
        {
          type: "button",
          class: "tb-button go-button",
          onclick: () => navigateInput(),
        },
        el("img", {
          class: "tb-sprite",
          src: SPRITE_DIR + "go.png",
          width: 13,
          height: 15,
          alt: "",
          draggable: "false",
          style: { left: "4px", top: "1px" },
        }),
        el("span", {
          class: "tb-label",
          text: "Go",
          style: { left: "19px" },
        }),
      ),
    );
  function navigateInput() {
    const input = address.value;
    const match = Object.entries(shellNames).find(
      ([k, v]) => v.toLowerCase() === input.toLowerCase(),
    );
    const drive = /\(([a-z]):\)\s*$/i.exec(input);
    navigate(match ? match[0] : drive ? drive[1] + ":/" : input);
  }
  address.addEventListener(
    "keydown",
    safely((e) => {
      if (e.key === "Enter") navigateInput();
    }),
  );
  function renderSide() {
    side.replaceChildren();
    if (current === "search") {
      const searchInput = el("input", {
        value: query,
        "aria-label": "Search for files or folders named",
      });
      const search = () => {
        query = searchInput.value;
        renderList();
      };
      side.append(
        el(
          "div",
          { class: "explorer-side-title" },
          icon("search", 32),
          el("h2", { text: "Search" }),
        ),
        el("p", { text: "Search for files or folders named:" }),
        searchInput,
        button("Search Now", search, { class: "default-button search-now" }),
        el("p", { text: "Look in: Local Hard Drives (C:)" }),
      );
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") search();
      });
      return;
    }
    if (treeVisible) {
      side.classList.add("tree-mode");
      side.append(el("div", { class: "tree-title", text: "Folders" }));
      const tree = [
        ["Desktop", DESKTOP, "computer", 0],
        ["My Documents", DOCS, "documents", 1],
        ["My Computer", "computer", "computer", 1],
        ["Local Disk (C:)", "C:/", "drive", 2],
        ["Documents and Settings", "C:/Documents and Settings", "folder", 3],
        ["My Documents", DOCS, "folder", 4],
        ["Program Files", "C:/Program Files", "folder", 3],
        ["WINNT", "C:/WINNT", "folder", 3],
        ["Compact Disc (D:)", "D:/", "cd", 2],
        ["Control Panel", "control", "control", 2],
        ["My Network Places", "network", "network", 1],
        ["Recycle Bin", "recycle", "recycle", 1],
      ];
      for (const [name, p, ico, depth] of tree)
        side.append(
          button(
            [
              el("span", { text: depth ? "⊞" : "", class: "tree-expand" }),
              icon(ico),
              name,
            ],
            () => navigate(p),
            {
              class: "tree-item" + (current === p ? " selected" : ""),
              style: { paddingLeft: depth * 13 + 4 + "px" },
            },
          ),
        );
      return;
    }
    side.classList.remove("tree-mode");
    side.append(
      el(
        "div",
        { class: "explorer-side-title" },
        el("img", {
          class: "side-art",
          src: `/assets/ui/explorer/header-${headerArt(current)}.png`,
          alt: "",
          draggable: "false",
        }),
        el("h2", { text: locationName(current) }),
      ),
      el("div", { class: "explorer-rule" }),
    );
    const p = (text, cls) => el("p", { text, class: cls }),
      link = (label, fn, cls = "") => {
        const n = el("span", {
          class: "text-link side-link " + cls,
          role: "link",
          tabindex: 0,
          text: label,
        });
        n.addEventListener("click", safely(fn));
        n.addEventListener("keydown", (e) => {
          if (e.key === "Enter") safely(fn)();
        });
        return n;
      },
      selectP = () => (descEl = p("Select an item to view its description.")),
      seeAlso = (...ls) => [
        p("See also:", "side-note"),
        ...ls.map(([l, fn]) => link(l, fn)),
      ],
      goDocs = ["My Documents", () => navigate(DOCS)],
      goNet = ["My Network Places", () => navigate("network")],
      goComp = ["My Computer", () => navigate("computer")];
    descEl = null;
    if (current === "computer")
      side.append(
        selectP(),
        p("Displays the files and folders on your computer", "side-description"),
        ...seeAlso(goDocs, goNet, [
          "Network and Dial-up Connections",
          () => ctx.launch("control", { page: "network" }),
        ]),
      );
    else if (current === "control")
      side.append(
        p("Use the settings in Control Panel to personalize your computer."),
        (selectP().classList.add("side-gap"), descEl),
        link("Windows Update", () => ctx.launch("help", { topic: "updates" }), "side-first"),
        link("Windows 2000 Support", () => ctx.launch("help")),
      );
    else if (current === "admintools")
      side.append(
        selectP(),
        p("Configures administrative settings for your computer", "side-description"),
        ...seeAlso(goDocs, goNet, goComp),
      );
    else if (current === "printers")
      side.append(
        p(
          "This folder contains information about printers that are currently installed, and a wizard to help you install new printers.",
        ),
        el(
          "p",
          { class: "side-next" },
          "To get information about a printer that is currently installed, right-click the printer's icon.",
        ),
        el(
          "p",
          { class: "side-next" },
          "To install a new printer, click the ",
          el("b", { text: "Add Printer" }),
          " icon.",
        ),
        (selectP().classList.add("side-next"), descEl),
        link("Windows 2000 Support", () => ctx.launch("help"), "side-far"),
      );
    else if (current === "tasks")
      side.append(
        p("This folder contains tasks you've scheduled for Windows. Windows automatically performs each task at the scheduled time."),
        el("p", { class: "side-next" }, "For example, you can schedule a time for Windows to clean up your hard disk by deleting unnecessary files."),
        (selectP().classList.add("side-next"), descEl),
      );
    else if (current === "recycle") {
      side.append(
        p(
          "This folder contains files and folders that you have deleted from your computer.",
        ),
      );
      if (!items().length) side.append(p("There are no items in the Recycle Bin.", "side-next"));
      else
        side.append(
          selectP(),
          link("Restore selected items", restore, "side-first"),
          link("Empty Recycle Bin", async () => {
            if (
              await ctx.dialogs.confirm(
                "Permanently delete all the items in the Recycle Bin?",
              )
            )
              (await ctx.fs.emptyRecycleBin(), ctx.sound.play("recycle"));
          }),
        );
    } else if (current === "network")
      side.append(
        p(
          "Use this folder to open files and folders on other computers and to install network printers.",
        ),
        el(
          "p",
          { class: "side-next" },
          "To set up networking on your computer, click ",
          link(
            "Network and Dial-up Connections",
            () => ctx.launch("control", { page: "network" }),
            "inline",
          ),
          ".",
        ),
        (selectP().classList.add("side-next"), descEl),
        ...seeAlso(goDocs, goComp),
      );
    else if (isSystemFolder(current)) {
      side.append(
        p(
          "This folder contains files that keep your system working properly. There is no need to modify its contents.",
        ),
        el(
          "p",
          { class: "side-next" },
          "To manage your programs, open the ",
          link(
            "Add/Remove Programs",
            () => ctx.launch("control", { page: "programs" }),
            "inline",
          ),
          " applet from the Control Panel.",
        ),
      );
      if (!shownFiles.has(current))
        side.append(
          el(
            "p",
            { class: "side-next" },
            "To view the contents of this folder, click: ",
            link(
              "Show Files",
              () => {
                shownFiles.add(current);
                render();
              },
              "inline",
            ),
          ),
        );
    } else if (current === DOCS)
      side.append(
        selectP(),
        p("Stores and manages documents", "side-description"),
        ...seeAlso(goNet, goComp),
      );
    else if (/^[a-z]:[\\/]?$/i.test(current))
      side.append(
        selectP(),
        p("Capacity: 1.99 GB", "side-capacity"),
        el(
          "div",
          { class: "side-legend" },
          el("span", { class: "swatch used" }),
          "Used: 1.63 GB",
        ),
        el(
          "div",
          { class: "side-legend" },
          el("span", { class: "swatch free" }),
          "Free: 368 MB",
        ),
        el("img", {
          class: "side-pie",
          src: "/assets/ui/explorer/disk-pie.png",
          alt: "",
          draggable: "false",
        }),
        ...seeAlso(goDocs, goNet, goComp),
      );
    else side.append(selectP());
  }
  function renderSelection() {
    listing.querySelectorAll("[data-path]").forEach((n) => {
      const s = selected.has(n.dataset.path);
      n.classList.toggle("selected", s);
      n.setAttribute("aria-selected", s);
    });
    const list = items(),
      sel = list.filter((n) => selected.has(n.path)),
      fsView = !shellNames[current],
      showLoc =
        current === "computer" || current === "admintools" || fsView;
    status.children[0].textContent =
      current === "fonts"
        ? selected.size
          ? `${selected.size} font(s) selected`
          : `${list.length} font(s)`
        : selected.size
        ? `${selected.size} object(s) selected`
        : `${list.length} object(s)`;
    status.children[1].textContent =
      current === "fonts"
        ? ""
        : current === "admintools"
        ? "10.3 KB"
        : fsView || current === "recycle"
        ? formatBytes(
            (selected.size ? sel : list).reduce(
              (sum, n) => sum + (n.type === "file" ? n.size || 0 : 0),
              0,
            ),
          )
        : "";
    status.lastLocation.textContent = showLoc ? "My Computer" : "";
    status.lastIcon.style.visibility = showLoc ? "visible" : "hidden";
    if (descEl) {
      const one = sel.length === 1 && sel[0].description ? sel[0] : null;
      if (one)
        descEl.replaceChildren(
          el("b", { text: one.name }),
          el("br"),
          one.description,
        );
      else descEl.textContent = "Select an item to view its description.";
    }
  }
  function renderList() {
    const hidden = isSystemFolder(current) && !shownFiles.has(current);
    listing.className =
      "file-list " +
      view +
      "-view" +
      (hidden ? " system-hidden" : "") +
      (current === "recycle" ? " recycle-cols" : "");
    listing.replaceChildren();
    if (hidden) return renderSelection();
    let list = items().sort((a, b) => {
      if (sortBy === "origin")
        return (
          String(a.originalPath).localeCompare(String(b.originalPath)) *
          sortDirection
        );
      if (sortBy === "deleted")
        return ((a.deleted || 0) - (b.deleted || 0)) * sortDirection;
      if (sortBy === "size")
        return ((a.size || 0) - (b.size || 0)) * sortDirection;
      if (sortBy === "modified")
        return ((a.modified || 0) - (b.modified || 0)) * sortDirection;
      if (current === "computer" || current === "network") return 0;
      if (sortBy === "type")
        return a.type.localeCompare(b.type) * sortDirection;
      return (
        (a.type === "folder" ? 0 : 1) - (b.type === "folder" ? 0 : 1) ||
        a.name.localeCompare(b.name, undefined, { numeric: true }) *
          sortDirection
      );
    });
    if (view === "details")
      listing.append(
        el(
          "div",
          { class: "file-details-header" },
          ...(current === "recycle"
            ? ["Name", "Original Location", "Date Deleted", "Type", "Size"]
            : ["Name", "Size", "Type", "Modified"]
          ).map((label, i) => {
            const key = (current === "recycle"
              ? ["name", "origin", "deleted", "type", "size"]
              : ["name", "size", "type", "modified"])[i];
            return button(
              [
                label,
                sortBy === key
                  ? el("span", {
                      class: "sort-arrow",
                      text: sortDirection > 0 ? "▲" : "▼",
                    })
                  : null,
              ],
              () => {
                sortDirection = sortBy === key ? -sortDirection : 1;
                sortBy = key;
                renderList();
              },
            );
          }),
        ),
      );
    for (const n of list) {
      const b = el(
        "div",
        {
          class: "file-item",
          role: "option",
          "data-path": n.path,
          draggable: true,
          tabindex: -1,
        },
        icon(n.icon || fileIcon(n), view === "icons" ? 32 : 16),
        el("span", {
          class: "file-name",
          text: view === "icons" && n.label ? n.label : n.name,
          title: n.label ? n.name : undefined,
        }),
      );
      if (view === "details" && current === "recycle")
        b.append(
          el("span", {
            class: "file-date",
            text: dirname(n.originalPath || "").replaceAll("/", "\\"),
          }),
          el("span", { class: "file-date", text: formatDeleted(n.deleted) }),
          el("span", {
            class: "file-type",
            text:
              n.type === "folder"
                ? "File Folder"
                : (extension(n.name) || "file").toUpperCase() + " File",
          }),
          el("span", {
            class: "file-size",
            text: n.type === "file" ? formatBytes(n.size || 0) : "",
          }),
        );
      else if (view === "details")
        b.append(
          el("span", {
            class: "file-size",
            text: n.type === "file" ? formatBytes(n.size || 0) : "",
          }),
          el("span", {
            class: "file-type",
            text:
              n.type === "folder"
                ? "File Folder"
                : n.detail ||
                  (extension(n.name) || n.type).toUpperCase() + " File",
          }),
          el("span", {
            class: "file-date",
            text: n.modified ? new Date(n.modified).toLocaleDateString() : "",
          }),
        );
      b.addEventListener("click", (e) => {
        if (e.ctrlKey || e.metaKey) {
          selected.has(n.path) ? selected.delete(n.path) : selected.add(n.path);
        } else {
          selected = new Set([n.path]);
        }
        renderSelection();
        listing.focus();
      });
      b.addEventListener(
        "dblclick",
        safely(() => activate(n)),
      );
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selected.has(n.path)) {
          selected = new Set([n.path]);
          renderSelection();
        }
        popup(contextItems(), e.clientX, e.clientY);
      });
      b.addEventListener("dragstart", (e) => {
        if (!selected.has(n.path)) selected = new Set([n.path]);
        e.dataTransfer.setData(
          "application/x-win2k-files",
          JSON.stringify([...selected]),
        );
        e.dataTransfer.effectAllowed = "copyMove";
      });
      if (n.type === "folder") bindDrop(b, () => n.path);
      listing.append(b);
    }
    if (view === "icons") fitLabels(listing);
    if (!list.length && !(current === "recycle" && view === "details"))
      listing.append(
        el("div", {
          class: "empty-folder",
          text:
            current === "search"
              ? query
                ? "There are no results to display."
                : "Enter a name to search for files and folders."
              : current === "recycle"
                ? "The Recycle Bin is empty."
                : "This folder is empty.",
        }),
      );
    renderSelection();
  }
  function render() {
    w.setTitle(title || locationName(current));
    address.value = displayPath(current);
    renderSide();
    side.style.display = current === "fonts" ? "none" : "";
    const fontsMode = current === "fonts";
    for (const id of ["moveto", "copyto", "delete", "undo", "views"])
      tools.querySelector("#tb-" + id).style.display = fontsMode ? "none" : "";
    tools.querySelector(".fonts-views").style.display = fontsMode ? "" : "none";
    renderList();
    setNavState();
    addressIcon.src = icon(locationIcon(current)).src;
    if (!title) w.setIcon(locationIcon(current));
    w.path = current;
  }
  function bindDrop(node, getPath) {
    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      node.classList.add("drop-target");
    });
    node.addEventListener("dragleave", () =>
      node.classList.remove("drop-target"),
    );
    node.addEventListener(
      "drop",
      safely(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        node.classList.remove("drop-target");
        const target = getPath();
        if (shellNames[target]) return;
        const local = e.dataTransfer.getData("application/x-win2k-files");
        if (local) {
          for (const p of JSON.parse(local)) {
            if (dirname(p).toLowerCase() === target.toLowerCase()) continue;
            await ctx.fs.move(
              p,
              joinPath(target, ctx.fs.uniqueName(target, basename(p))),
              { copy: e.ctrlKey },
            );
          }
        } else
          for (const file of e.dataTransfer.files)
            await ctx.fs.importFile(file, target);
      }),
    );
  }
  bindDrop(listing, () => current);
  listing.addEventListener("click", (e) => {
    if (e.target === listing) {
      selected.clear();
      renderSelection();
    }
  });
  listing.addEventListener("contextmenu", (e) => {
    if (!e.target.closest(".file-item")) {
      e.preventDefault();
      popup(contextItems(), e.clientX, e.clientY);
    }
  });
  w.el.addEventListener(
    "keydown",
    safely(async (e) => {
      if (e.target.matches("input,textarea")) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "F2") {
        e.preventDefault();
        await rename();
      } else if (e.key === "Delete") {
        e.preventDefault();
        await remove();
      } else if (e.key === "F5") {
        e.preventDefault();
        render();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        goUp();
      } else if (e.key === "Enter") {
        items()
          .filter((n) => selected.has(n.path))
          .forEach(activate);
      } else if (ctrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selected = new Set(items().map((n) => n.path));
        renderSelection();
      } else if (ctrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copy("copy");
      } else if (ctrl && e.key.toLowerCase() === "x") {
        e.preventDefault();
        copy("cut");
      } else if (ctrl && e.key.toLowerCase() === "v") {
        e.preventDefault();
        await paste();
      } else if (
        ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)
      ) {
        e.preventDefault();
        const list = items(),
          old = list.findIndex((n) => selected.has(n.path)),
          idx = Math.max(
            0,
            Math.min(
              list.length - 1,
              old + (["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : -1),
            ),
          );
        if (list[idx]) {
          selected = new Set([list[idx].path]);
          renderSelection();
          listing
            .querySelector('[aria-selected="true"]')
            ?.scrollIntoView({ block: "nearest" });
        }
      }
    }),
  );
  w.setContent(tools, addressRow, content, status);
  w.addCleanup(
    ctx.bus.on("fs:change", () => {
      if (
        !shellNames[current] &&
        (!ctx.fs.exists(current) || ctx.fs.get(current)?.trashed)
      ) {
        current = "computer";
        history.push(current);
        historyIndex = history.length - 1;
        render();
      } else renderList();
    }),
  );
  w.addCleanup(ctx.bus.on("settings:change", render));
  render();
  w.navigate = navigate;
  return w;
}
const SYSTEM_FOLDERS = ["c:/program files", "c:/winnt", "c:/winnt/system32"];
const isSystemFolder = (path) =>
  SYSTEM_FOLDERS.includes(String(path).toLowerCase().replace(/\/$/, ""));
const isDrive = (path) => /^[a-z]:[\\/]?$/i.test(path);
function locationIcon(path) {
  if (path === DOCS || path === "documents") return "documents";
  if (path === "admintools") return "adminToolsFolder";
  if (path === "fonts") return "cpFonts";
  if (path === "tasks") return "scheduledTasks";
  if (shellNames[path] && path !== "search") return path === "computer" ? "computer" : path;
  if (isDrive(path))
    return { A: "floppy", D: "cd" }[path[0].toUpperCase()] || "drive";
  return "folder";
}
function headerArt(path) {
  if (path === DOCS) return "documents";
  if (path === "admintools") return "admin";
  if (["computer", "control", "recycle", "network", "printers", "tasks"].includes(path))
    return path;
  if (isDrive(path)) return "disk";
  return "folder";
}
function formatDeleted(ts) {
  if (!ts) return "";
  const d = new Date(ts),
    h = d.getHours() % 12 || 12;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
}
let measureCtx;
function fitLabels(root, maxWidth = 71) {
  measureCtx ||= document.createElement("canvas").getContext("2d");
  for (const span of root.querySelectorAll(".file-name")) {
    const text = span.textContent;
    const cs = getComputedStyle(span);
    measureCtx.font = cs.font;
    measureCtx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    const width = (t) => measureCtx.measureText(t).width;
    if (width(text) <= maxWidth) continue;
    const trunc = (t) => {
      while (t.length > 1 && width(t + "...") > maxWidth) t = t.slice(0, -1);
      return t + "...";
    };
    let lines = [],
      line = "";
    for (const word of text.split(" ")) {
      const next = line ? line + " " + word : word;
      if (width(next) <= maxWidth) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
    if (lines.length > 2) lines = [lines[0], trunc(lines.slice(1).join(" "))];
    lines = lines.map((l) => (width(l) > maxWidth ? trunc(l) : l));
    span.textContent = lines.join("\n");
    span.classList.add("fitted");
    span.title ||= text;
  }
}
function explorerStatus() {
  const lastIcon = icon("computer"),
    lastLocation = el("span", { text: "My Computer" }),
    bar = el(
      "div",
      { class: "status-bar explorer-status" },
      el("div", { class: "status-panel", text: "" }),
      el("div", { class: "status-panel", text: "" }),
      el("div", { class: "status-panel status-location" }, lastIcon, lastLocation),
      el("span", { class: "status-grip" }),
    );
  bar.lastIcon = lastIcon;
  bar.lastLocation = lastLocation;
  return bar;
}
function locationName(path) {
  const drive = /^([a-z]):[\\/]?$/i.exec(path);
  if (drive)
    return (
      { C: "Local Disk (C:)", D: "Compact Disc (D:)", A: "3½ Floppy (A:)" }[
        drive[1].toUpperCase()
      ] || path
    );
  return shellNames[path] || basename(path) || path;
}
function displayPath(path) {
  return shellNames[path] || locationName(path);
}
