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
  search: "Search Results",
};
export function openExplorer(ctx, { path = "computer", title } = {}) {
  if (path === "documents") path = DOCS;
  const w = ctx.wm.create({
    title: title || shellNames[path] || basename(path),
    icon:
      path === "computer"
        ? "computer"
        : path === "control"
          ? "control"
          : path === "recycle"
            ? "recycle"
            : "folder",
    width: 721,
    height: 537,
    appId: "explorer",
  });
  w.el.classList.add("explorer-window");
  let current = path,
    history = [path],
    historyIndex = 0,
    selected = new Set(),
    view = "icons",
    treeVisible = false,
    sortBy = "name",
    sortDirection = 1,
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
    if (shellNames[current] || current.length === 3) navigate("computer");
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
        path: "control:" + p.id,
        type: "special",
        icon: p.icon || "settings",
        detail: p.description,
      }));
    if (current === "network")
      return [
        {
          name: "Entire Network",
          path: "network:all",
          type: "special",
          icon: "network",
        },
        {
          name: "Make New Connection",
          path: "control:network",
          type: "special",
          icon: "network",
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
    if (n.path.startsWith("control:"))
      ctx.launch("control", { page: n.path.slice(8) });
    else if (n.path === "tasks") ctx.launch("tasks");
    else if (n.path === "network:all")
      ctx.launch("control", { page: "network" });
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
                await ctx.fs.emptyRecycleBin();
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
    navigate(match ? match[0] : input);
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
        current === "computer"
          ? el("img", {
              class: "side-art",
              src: "/assets/ui/explorer/header-computer.png",
              alt: "",
              draggable: "false",
            })
          : icon(
              current === "control"
                ? "control"
                : current === "recycle"
                  ? "recycle"
                  : "folder",
              32,
            ),
        el("h2", { text: locationName(current) }),
      ),
      el("div", { class: "explorer-rule" }),
      el("p", {
        text:
          current === "computer"
            ? "Select an item to view its description."
            : current === "control"
              ? "Use the settings in Control Panel to personalize your computer."
              : current === "recycle"
                ? "To put an item back in its original location, select the item and click Restore."
                : "Select an item to view its description.",
      }),
    );
    if (current === "computer")
      side.append(
        el("p", {
          class: "side-description",
          text: "Displays the files and folders on your computer",
        }),
        el("p", { class: "side-note", text: "See also:" }),
        button("My Documents", () => navigate(DOCS), { class: "text-link" }),
        button("My Network Places", () => navigate("network"), {
          class: "text-link",
        }),
        button(
          "Network and Dial-up Connections",
          () => ctx.launch("control", { page: "network" }),
          { class: "text-link" },
        ),
      );
    if (current === "recycle")
      side.append(
        button("Restore selected items", restore, { class: "text-link" }),
        button(
          "Empty Recycle Bin",
          async () => {
            if (
              await ctx.dialogs.confirm(
                "Permanently delete all the items in the Recycle Bin?",
              )
            )
              await ctx.fs.emptyRecycleBin();
          },
          { class: "text-link" },
        ),
      );
  }
  function renderSelection() {
    listing.querySelectorAll("[data-path]").forEach((n) => {
      const s = selected.has(n.dataset.path);
      n.classList.toggle("selected", s);
      n.setAttribute("aria-selected", s);
    });
    status.children[0].textContent = selected.size
      ? `${selected.size} object(s) selected`
      : `${items().length} object(s)`;
    const one = items().find((n) => selected.has(n.path));
    status.children[1].textContent = one
      ? one.type === "folder"
        ? "File Folder"
        : one.detail || formatBytes(one.size || 0)
      : "";
  }
  function renderList() {
    listing.className = "file-list " + view + "-view";
    listing.replaceChildren();
    let list = items().sort((a, b) => {
      if (sortBy === "size")
        return ((a.size || 0) - (b.size || 0)) * sortDirection;
      if (sortBy === "modified")
        return ((a.modified || 0) - (b.modified || 0)) * sortDirection;
      if (current === "computer") return 0;
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
          ...["Name", "Size", "Type", "Modified"].map((label, i) =>
            button(label, () => {
              const key = ["name", "size", "type", "modified"][i];
              sortDirection = sortBy === key ? -sortDirection : 1;
              sortBy = key;
              renderList();
            }),
          ),
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
        el("span", { class: "file-name", text: n.name }),
      );
      if (view === "details")
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
    if (!list.length)
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
    renderList();
    setNavState();
    addressIcon.src = icon(
      current === "computer"
        ? "computer"
        : current === "control"
          ? "control"
          : current === "recycle"
            ? "recycle"
            : "folder",
    ).src;
    status.lastLocation.textContent = locationName(current);
    status.lastIcon.src = addressIcon.src;
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
  return shellNames[path] || path.replaceAll("/", "\\");
}
