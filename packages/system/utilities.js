import {
  el,
  button,
  icon,
  tabs,
  field,
  checkbox,
  toolbar,
  statusBar,
  popup,
  separator,
  safely,
} from "../ui/index.js";
import {
  DOCS,
  basename,
  dirname,
  formatBytes,
  downloadFile,
  pickFiles,
} from "../core/index.js";
import { group as rkGroup, text as rkText, sunken as rkSunken } from "../control-panel/refkit.js";
import { px, py, dialogFromTemplate } from "../ui/dlg.js";
import { MAGNIFY_DIALOGS } from "./magnify-data.js";

export function openTaskManager(ctx) {
  const w = ctx.wm.create({
    title: "Windows Task Manager",
    icon: "taskmgr",
    width: 420,
    height: 500,
    appId: "taskmgr",
  });
  let selected = null,
    currentTab = 0;
  const appsBody = el("tbody"),
    processBody = el("tbody"),
    status = statusBar("", ""),
    chart = el("canvas", {
      width: 420,
      height: 140,
      class: "performance-chart",
      "aria-label": "Event loop delay history",
    }),
    metrics = el("div", { class: "task-metrics" });
  const samples = Array(80).fill(0);
  let expected = performance.now() + 1000;
  const end = async () => {
    const target = ctx.wm.windows.find((a) => a.id === selected);
    if (target) await target.close();
  };
  const render = () => {
    appsBody.replaceChildren();
    processBody.replaceChildren();
    for (const win of ctx.wm.windows.filter((a) => !a.dialog)) {
      const row = el(
        "tr",
        {
          class: win.id === selected ? "selected" : "",
          onclick: () => {
            selected = win.id;
            render();
          },
          ondblclick: () => win.focus(),
        },
        el("td", {}, icon(win.icon), win.title),
        el("td", { text: win.minimized ? "Minimized" : "Running" }),
      );
      appsBody.append(row);
      processBody.append(
        el(
          "tr",
          {
            class: win.id === selected ? "selected" : "",
            onclick: () => {
              selected = win.id;
              render();
            },
          },
          el("td", { text: win.appId + ".exe" }),
          el("td", { text: String(win.id) }),
          el("td", { text: "00" }),
          el("td", { text: "0:00:0" + (win.id % 10) }),
          el("td", { text: (4000 + ((win.id * 977) % 9000)).toLocaleString("en-US") + " K" }),
        ),
      );
    }
    status.children[0].textContent =
      "Processes: " + ctx.wm.windows.filter((a) => !a.dialog).length;
    status.children[1].textContent =
      "Browser memory: " +
      (performance.memory
        ? formatBytes(performance.memory.usedJSHeapSize)
        : "Unavailable");
  };
  const applicationTable = el(
      "table",
      { class: "classic-table task-table" },
      el(
        "thead",
        {},
        el("tr", {}, el("th", { text: "Task" }), el("th", { text: "Status" })),
      ),
      appsBody,
    ),
    processTable = el(
      "table",
      { class: "classic-table task-table" },
      el(
        "thead",
        {},
        el(
          "tr",
          {},
          ...["Image Name", "PID", "CPU", "CPU Time", "Mem Usage"].map((x) =>
            el("th", { text: x }),
          ),
        ),
      ),
      processBody,
    );
  // Performance page laid out from the dialog template in taskmgr.exe (units are dialog units)
  const perfPane = el("div", { style: "position:relative;width:100%;height:100%" });
  const perfNodes = {};
  {
    const P = (x) => px(x), Q = (y) => py(y);
    const grp = (x, y, w2, h2, label) => perfPane.append(...rkGroup(P(x), Q(y) + 6, P(w2), Q(h2) - 6, label, 9).filter(Boolean));
    const dark = (x, y, w2, h2, name) => {
      const cv = el("canvas", { width: P(w2), height: Q(h2), style: `position:absolute;left:${P(x)}px;top:${Q(y)}px;background:#000` });
      perfNodes[name] = cv;
      perfPane.append(cv);
    };
    grp(8, 5, 60, 60, "CPU Usage");
    dark(14, 17, 48, 44, "cpu");
    grp(78, 5, 166, 60, "CPU Usage History");
    dark(82, 15, 158, 44, "cpuh");
    grp(8, 67, 60, 60, "MEM Usage");
    dark(14, 77, 48, 44, "mem");
    grp(78, 67, 166, 60, "Memory Usage History");
    dark(82, 77, 158, 44, "memh");
    const box = (x, y, title, rows) => {
      grp(x, y, 113, 39, title);
      rows.forEach(([label, key], i) => {
        perfPane.append(rkText(P(x + 6), Q(y + 10 + i * 9), label, { w: P(46) }));
        const v = rkText(P(x + 51), Q(y + 10 + i * 9), "0", { w: P(57), align: "right" });
        perfNodes[key] = v;
        perfPane.append(v);
      });
    };
    box(8, 129, "Totals", [["Handles", "handles"], ["Threads", "threads"], ["Processes", "procs"]]);
    box(130, 129, "Physical Memory (K)", [["Total", "ptotal"], ["Available", "pavail"], ["System Cache", "pcache"]]);
    box(8, 173, "Commit Charge (K)", [["Total", "ctotal"], ["Limit", "climit"], ["Peak", "cpeak"]]);
    box(130, 173, "Kernel Memory (K)", [["Total", "ktotal"], ["Paged", "kpaged"], ["Nonpaged", "knon"]]);
  }
  const cpuHist = Array(52).fill(0), memHist = Array(52).fill(0);
  let peak = 0;
  const gauge = (cv, pct) => {
    const g = cv.getContext("2d");
    g.fillStyle = "#000";
    g.fillRect(0, 0, cv.width, cv.height);
    const rows = Math.floor((cv.height - 12) / 3), on = Math.round((pct / 100) * rows);
    for (let i = 0; i < rows; i++) {
      g.fillStyle = i < on ? "#00ff00" : "#005000";
      g.fillRect(cv.width / 2 - 10, cv.height - 14 - i * 3 - 2, 20, 2);
    }
    g.fillStyle = "#00ff00";
    g.font = "11px Tahoma, sans-serif";
    g.textAlign = "center";
    g.fillText(Math.round(pct) + (cv === perfNodes.cpu ? " %" : " MB"), cv.width / 2, cv.height - 1);
  };
  const history = (cv, data) => {
    const g = cv.getContext("2d");
    g.fillStyle = "#000";
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = "#007000";
    for (let x = 0; x < cv.width; x += 12) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, cv.height); g.stroke(); }
    for (let y = 0; y < cv.height; y += 12) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(cv.width, y + 0.5); g.stroke(); }
    g.strokeStyle = "#00ff00";
    g.beginPath();
    data.forEach((v, i) => {
      const x = (i * cv.width) / (data.length - 1), y = cv.height - 1 - (v / 100) * (cv.height - 2);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
  };
  const kb = (n) => Math.round(n / 1024).toLocaleString("en-US");
  const perfUpdate = (delay) => {
    const heap = performance.memory?.usedJSHeapSize || 0, limit = performance.memory?.jsHeapSizeLimit || 1073741824;
    const total = 262144 * 1024, used = Math.min(total, heap + 90 * 1024 * 1024);
    const cpu = Math.min(100, delay * 2);
    cpuHist.shift(); cpuHist.push(cpu);
    memHist.shift(); memHist.push((used / total) * 100);
    peak = Math.max(peak, used);
    gauge(perfNodes.cpu, cpu);
    gauge(perfNodes.mem, used / 1048576);
    history(perfNodes.cpuh, cpuHist);
    history(perfNodes.memh, memHist);
    const procs = ctx.wm.windows.filter((a) => !a.dialog).length + 18;
    const set = (k, v) => perfNodes[k] && (perfNodes[k].textContent = v);
    set("handles", (procs * 83).toLocaleString("en-US"));
    set("threads", String(procs * 5));
    set("procs", String(procs));
    set("ptotal", kb(total)); set("pavail", kb(total - used)); set("pcache", kb(48 * 1024 * 1024));
    set("ctotal", kb(used)); set("climit", kb(limit + total)); set("cpeak", kb(peak));
    set("ktotal", kb(31 * 1024 * 1024)); set("kpaged", kb(24 * 1024 * 1024)); set("knon", kb(7 * 1024 * 1024));
  };
  const tabview = tabs([
    {
      label: "Applications",
      content: el(
        "div",
        { class: "task-tab" },
        el("div", { class: "inset table-scroll" }, applicationTable),
        el(
          "div",
          { class: "task-buttons" },
          button("End Task", end),
          button("Switch To", () =>
            ctx.wm.windows.find((a) => a.id === selected)?.focus(),
          ),
          button("New Task...", () => ctx.launch("run")),
        ),
      ),
    },
    {
      label: "Processes",
      content: el(
        "div",
        { class: "task-tab" },
        el("div", { class: "inset table-scroll" }, processTable),
        el("div", { class: "task-buttons" }, button("End Process", end)),
      ),
    },
    { label: "Performance", content: perfPane },
  ]);
  let speed = "Normal", onTop = true, minUse = false, hideMin = false;
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const win = (fn) => () => ctx.wm[fn]?.();
  w.setMenu({
    File: [
      { label: "New Task (Run...)", action: () => ctx.launch("run") },
      separator(),
      { label: "Exit Task Manager", action: () => w.close() },
    ],
    Options: () => [
      { label: "Always On Top", checked: onTop, action: () => (onTop = !onTop) },
      { label: "Minimize On Use", checked: minUse, action: () => (minUse = !minUse) },
      { label: "Hide When Minimized", checked: hideMin, action: () => (hideMin = !hideMin) },
      ...(tabview.index === 1 ? [off("Show 16-bit tasks")] : []),
    ],
    View: () => [
      { label: "Refresh Now", action: render },
      {
        label: "Update Speed",
        submenu: ["High", "Normal", "Low", "Paused"].map((n) => ({ label: n, checked: speed === n, action: () => (speed = n) })),
      },
      separator(),
      ...(tabview.index === 1
        ? [off("Select Columns...")]
        : tabview.index === 2
          ? [{ label: "CPU History", submenu: [{ label: "One Graph, All CPUs", checked: true, action: () => {} }, off("One Graph Per CPU")] }, off("Show Kernel Times")]
          : [off("Large Icons"), off("Small Icons", { checked: false }), { label: "Details", checked: true, action: () => {} }]),
    ],
    ...(true ? {} : {}),
    Help: [
      { label: "Task Manager Help Topics", action: () => ctx.launch("help", { topic: "taskmgr" }) },
      separator(),
      { label: "About Task Manager", action: () => ctx.dialogs.message("Windows 2000 Task Manager\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1990-1999 Microsoft Corp.", { title: "About Task Manager", icon: "taskmgr" }) },
    ],
  });
  w.setContent(tabview, status);
  w.addCleanup(ctx.bus.on("windows:change", render));
  const timer = setInterval(() => {
    const now = performance.now(),
      delay = Math.max(0, now - expected);
    expected = now + 1000;
    if (speed !== "Paused") perfUpdate(Math.min(250, delay));
    render();
  }, 1000);
  w.addCleanup(() => clearInterval(timer));
  render();
  return w;
}

export function openRegistry(ctx) {
  const w = ctx.wm.create({
    title: "Registry Editor",
    icon: "registry",
    width: 690,
    height: 470,
    appId: "regedit",
  });
  let data = ctx.registry.read(),
    current = ["HKEY_CURRENT_USER"],
    selected = null;
  const tree = el("div", { class: "registry-tree inset" }),
    body = el("tbody"),
    status = statusBar("My Computer\\HKEY_CURRENT_USER");
  const get = () => current.reduce((a, k) => a?.[k], data) || {},
    save = async () => {
      await ctx.registry.save(data);
      render();
    };
  const selectPath = (path) => {
    current = path;
    selected = null;
    renderValues();
  };
  function renderTree() {
    tree.replaceChildren(
      button([icon("computer"), "My Computer"], () => selectPath([]), {
        class: "tree-item",
      }),
    );
    const visit = (node, path, depth) => {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "object" && value !== null) {
          const newPath = [...path, key];
          tree.append(
            button(
              [
                el("span", { text: "⊟", class: "tree-expand" }),
                icon("folder"),
                key,
              ],
              () => selectPath(newPath),
              { class: "tree-item", style: { paddingLeft: depth * 14 + "px" } },
            ),
          );
          if (depth < 6) visit(value, newPath, depth + 1);
        }
      }
    };
    visit(data, [], 1);
  }
  function renderValues() {
    const node = get();
    body.replaceChildren();
    const entries = Object.entries(node).filter(
      ([, v]) => typeof v !== "object",
    );
    if (!entries.some(([k]) => k === "(Default)"))
      entries.unshift(["(Default)", "(value not set)"]);
    for (const [key, value] of entries) {
      const row = el(
        "tr",
        {
          class: selected === key ? "selected" : "",
          onclick: () => {
            selected = key;
            renderValues();
          },
          ondblclick: () => edit(key),
        },
        el("td", {}, icon("document"), key),
        el("td", { text: typeof value === "number" ? "REG_DWORD" : "REG_SZ" }),
        el("td", { text: String(value) }),
      );
      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selected = key;
        popup(
          [
            { label: "Modify", action: () => edit(key) },
            { label: "Delete", action: remove },
          ],
          e.clientX,
          e.clientY,
        );
      });
      body.append(row);
    }
    status.children[0].textContent =
      "My Computer" + (current.length ? "\\" + current.join("\\") : "");
  }
  function render() {
    renderTree();
    renderValues();
  }
  const edit = async (key = selected) => {
    if (!key) return;
    const node = get(),
      value = await ctx.dialogs.prompt("Value data:", node[key] ?? "", {
        title: "Edit String",
      });
    if (value != null) {
      node[key] = typeof node[key] === "number" ? Number(value) || 0 : value;
      await save();
    }
  };
  const remove = async () => {
    if (
      selected &&
      (await ctx.dialogs.confirm(
        "Are you sure you want to delete this value?",
        "Confirm Value Delete",
      ))
    ) {
      delete get()[selected];
      await save();
    }
  };
  const newValue = async (type) => {
    const name = await ctx.dialogs.prompt("Value name:", "New Value #1", {
      title: "New Registry Value",
    });
    if (name) {
      get()[name] = type === "number" ? 0 : "";
      await save();
    }
  };
  const newKey = async () => {
    const name = await ctx.dialogs.prompt("Key name:", "New Key #1", {
      title: "New Key",
    });
    if (name) {
      if (
        name === "__proto__" ||
        name === "constructor" ||
        name === "prototype"
      )
        throw new Error("This key name is reserved.");
      get()[name] = {};
      current.push(name);
      await save();
    }
  };
  w.setMenu({
    Registry: [
      {
        label: "Import Registry File...",
        action: async () => {
          const p = await ctx.dialogs.file({
            filter: (n) => /\.(json|reg)$/i.test(n.name),
          });
          if (!p) return;
          const raw = ctx.fs.readFile(p);
          let imported;
          try {
            imported = JSON.parse(raw);
          } catch {
            throw new Error(
              "This editor imports registry JSON files. Use Export Registry File to create a compatible file.",
            );
          }
          if (
            !imported ||
            typeof imported !== "object" ||
            Array.isArray(imported)
          )
            throw new Error("Invalid registry file.");
          if (
            await ctx.dialogs.confirm(
              "Replace the virtual registry with this file?",
              "Registry Editor",
            )
          ) {
            data = imported;
            await save();
          }
        },
      },
      {
        label: "Export Registry File...",
        action: () =>
          downloadFile(
            "Registry.json",
            JSON.stringify(data, null, 2),
            "application/json",
          ),
      },
      separator(),
      { label: "Connect Network Registry...", disabled: true },
      { label: "Disconnect Network Registry...", disabled: true },
      separator(),
      { label: "Print...", shortcut: "Ctrl+P", action: () => ctx.printText(JSON.stringify(data, null, 2), "Registry") },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      {
        label: "New",
        submenu: [
          { label: "Key", action: newKey },
          separator(),
          { label: "String Value", action: () => newValue("string") },
          { label: "Binary Value", disabled: true },
          { label: "DWORD Value", action: () => newValue("number") },
        ],
      },
      separator(),
      { label: "Delete", shortcut: "Del", disabled: !selected, action: remove },
      { label: "Rename", disabled: true },
      separator(),
      { label: "Copy Key Name", action: () => ctx.clipboard.setText(current.join("\\")) },
      separator(),
      { label: "Find Next", shortcut: "F3", disabled: true },
      {
        label: "Find...",
        shortcut: "Ctrl+F",
        action: async () => {
          const q = await ctx.dialogs.prompt("Find what:", "", {
            title: "Find",
          });
          if (!q) return;
          const search = (node, path = []) => {
            for (const [k, v] of Object.entries(node)) {
              if (k.toLowerCase().includes(q.toLowerCase()))
                return typeof v === "object" ? [...path, k] : path;
              if (v && typeof v === "object") {
                const r = search(v, [...path, k]);
                if (r) return r;
              }
            }
          };
          const found = search(data);
          if (found) selectPath(found);
          else
            ctx.dialogs.message("Finished searching through the registry.", {
              title: "Registry Editor",
            });
        },
      },
    ],
    View: [
      { label: "Status Bar", checked: true, disabled: true },
      separator(),
      { label: "Split", disabled: true },
      separator(),
      {
        label: "Refresh",
        shortcut: "F5",
        action: () => {
          data = ctx.registry.read();
          render();
        },
      },
    ],
    Favorites: [
      { label: "Add to Favorites", disabled: true },
      { label: "Remove Favorite", disabled: true },
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "regedit" }) },
      separator(),
      { label: "About Registry Editor", action: () => ctx.dialogs.message("Registry Editor\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1993-1999 Microsoft Corp.", { title: "About Registry Editor", icon: "registry" }) },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "registry-main" },
      tree,
      el(
        "div",
        { class: "registry-values inset" },
        el(
          "table",
          { class: "classic-table" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              ...["Name", "Type", "Data"].map((x) => el("th", { text: x })),
            ),
          ),
          body,
        ),
      ),
    ),
    status,
  );
  render();
  return w;
}

export function openSystemInfo(ctx, { devices = false } = {}) {
  const w = ctx.wm.create({
      title: devices ? "Device Manager" : "System Information",
      icon: devices ? "deviceMgr" : "sysInfo",
      width: 690,
      height: 440,
      appId: devices ? "devices" : "systeminfo",
    }),
    list = el("tbody"),
    tree = el("div", { class: "systeminfo-tree inset" });
  const sections = {
    "System Summary": [
      ["OS Name", "Windows 2000 Professional — Browser Edition"],
      ["Version", "5.0.2195 (recreated shell)"],
      ["System Name", ctx.settings.get("computerName")],
      ["User Name", ctx.settings.get("username")],
      [
        "Processor",
        `${navigator.hardwareConcurrency || "Unknown"} logical cores`,
      ],
      [
        "Device Memory",
        navigator.deviceMemory
          ? navigator.deviceMemory + " GB (approximate)"
          : "Not exposed",
      ],
      ["Platform", navigator.platform],
      ["Browser", navigator.userAgent],
      [
        "Display",
        `${innerWidth} × ${innerHeight} CSS pixels @ ${devicePixelRatio}×`,
      ],
      ["Language", navigator.language],
      ["Time Zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
    ],
    Display: [
      ["Graphics Backend", ctx.renderer.surface.backend],
      ["WebGPU", navigator.gpu ? "API available" : "Unavailable"],
      ["Color Depth", screen.colorDepth + " bits"],
      ["Pixel Ratio", String(devicePixelRatio)],
      [
        "Canvas Dimensions",
        ctx.renderer.surface.canvas.width +
          " × " +
          ctx.renderer.surface.canvas.height,
      ],
      [
        "Average submission",
        ctx.renderer.surface.stats().averageSubmitMs.toFixed(3) +
          " ms (CPU time)",
      ],
    ],
    Storage: [
      ["Virtual filesystem", "IndexedDB transactional volume"],
      ["Entries", String(ctx.fs.nodes.size)],
      [
        "Virtual data size",
        formatBytes(
          new TextEncoder().encode(JSON.stringify(ctx.fs.snapshot())).length,
        ),
      ],
      ["C:", "Writable virtual disk"],
      ["D:", "Read-only virtual CD-ROM"],
      ["Persistence", "This browser / this site origin"],
    ],
    Network: [
      ["Connection", navigator.onLine ? "Online" : "Offline"],
      ["Origin", location.origin],
      ["Secure Context", String(isSecureContext)],
      [
        "Service Worker",
        "serviceWorker" in navigator ? "Supported" : "Unsupported",
      ],
    ],
    Devices: [
      ["Display Adapter", ctx.renderer.surface.backend + " graphics adapter"],
      ["Keyboard", "Browser keyboard input"],
      ["Mouse", "Pointer Events"],
      ["Sound", "AudioContext" in window ? "Web Audio" : "Unavailable"],
      [
        "Microphone",
        navigator.mediaDevices ? "Available on request" : "Unavailable",
      ],
      [
        "Game Controllers",
        "getGamepads" in navigator ? "Gamepad API" : "Unavailable",
      ],
      [
        "Serial Ports",
        "serial" in navigator ? "Available on request" : "Unavailable",
      ],
      [
        "USB Devices",
        "usb" in navigator ? "Available on request" : "Unavailable",
      ],
    ],
  };
  const show = (section) => {
    list.replaceChildren(
      ...sections[section].map(([k, v]) =>
        el("tr", {}, el("td", { text: k }), el("td", { text: v })),
      ),
    );
  };
  for (const label of Object.keys(sections))
    tree.append(
      button([icon("computer"), label], () => show(label), {
        class: "tree-item",
      }),
    );
  const exportText = () =>
    downloadFile(
      "System-Information.txt",
      Object.entries(sections).map(([title, rows]) => title + "\n" + rows.map(([k, v]) => k + ": " + v).join("\n")).join("\n\n"),
    );
  const offi = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const devMenus = {
    Action: [
      { label: "Print", disabled: true },
      separator(),
      { label: "Properties", disabled: true },
      separator(),
      { label: "Help", action: () => ctx.launch("help", { topic: "devmgr" }) },
    ],
    View: [
      { label: "Devices by type", checked: true, action: () => {} },
      { label: "Devices by connection", action: () => {} },
      { label: "Resources by type", action: () => {} },
      { label: "Resources by connection", action: () => {} },
      separator(),
      { label: "Show hidden devices", action: () => {} },
      separator(),
      { label: "Customize...", disabled: true },
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "devmgr" }) },
      separator(),
      { label: "About Device Manager", action: () => ctx.dialogs.message("Device Manager\nVersion 5.00.2195.6610\n\nMicrosoft Corporation", { title: "About Device Manager" }) },
    ],
  };
  if (devices) w.setMenu(devMenus);
  else w.setMenu({
    File: [
      offi("Open System Information File..."),
      offi("Save As System Information File..."),
      { label: "Save As Text File...", action: exportText },
      { label: "Print...", action: () => ctx.printText(Object.entries(sections).map(([t, r]) => t + "\n" + r.map(([k, v]) => k + ": " + v).join("\n")).join("\n\n"), "System Information") },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
      offi("Select All"),
      separator(),
      offi("Find...", { shortcut: "Ctrl+F" }),
    ],
    View: [
      { label: "Basic", checked: true, action: () => {} },
      offi("Advanced"),
      separator(),
      { label: "Refresh", shortcut: "F5", action: () => show("System Summary") },
    ],
    Tools: [
      offi("WBEM Permission Editor"),
      offi("Dr Watson"),
      offi("Hardware Wizard"),
      { label: "Network Connections", action: () => ctx.launch("control", { page: "network" }) },
      offi("Scan Disk"),
      offi("Windows Report Tool"),
      offi("System Monitor"),
      offi("DirectX Diagnostic Tool"),
      offi("Disk Cleanup"),
      offi("Backup"),
      offi("Network Monitor"),
      offi("File Signature Verification Utility"),
    ],
    Help: [
      { label: "System Information Help", action: () => ctx.launch("help", { topic: "system" }) },
      separator(),
      {
        label: "About System Information",
        action: () => ctx.dialogs.message("This utility reports real browser capabilities and the state of the virtual desktop. Native kernel and device-driver information is outside the browser sandbox.", { title: "System Information", icon: "sysInfo" }),
      },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "systeminfo-main" },
      tree,
      el(
        "div",
        { class: "inset systeminfo-values" },
        el(
          "table",
          { class: "classic-table" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              el("th", { text: "Item" }),
              el("th", { text: "Value" }),
            ),
          ),
          list,
        ),
      ),
    ),
    statusBar(devices ? "Browser devices" : "System Summary"),
  );
  show(devices ? "Devices" : "System Summary");
  return w;
}

export function openEventViewer(ctx) {
  const w = ctx.wm.create({
    title: "Event Viewer",
    icon: "eventViewer",
    width: 700,
    height: 430,
    appId: "events",
  });
  let log = "Application Log", newestFirst = true;
  const tree = el("div", { class: "registry-tree inset", style: "width:190px" }),
    values = el("div", { class: "registry-values inset" }),
    status = el("div", { class: "statusbar" });
  const LOGS = ["Application Log", "Security Log", "System Log"];
  const fmt = (t) => {
    const d = new Date(t);
    return [d.toLocaleDateString("en-US"), d.toLocaleTimeString("en-US")];
  };
  const typeOf = (l) => (l === "Error" ? "Error" : l === "Warning" ? "Warning" : "Information");
  const rows = () => {
    if (log !== "Application Log") return [];
    const list = ctx.events.slice();
    return newestFirst ? list.reverse() : list;
  };
  const render = () => {
    tree.replaceChildren(
      button([icon("computer"), "Event Viewer (Local)"], () => ((log = ""), render()), { class: "tree-item" + (log === "" ? " selected" : "") }),
      ...LOGS.map((n) => button([icon("document"), n], () => ((log = n), render()), { class: "tree-item" + (log === n ? " selected" : ""), style: { paddingLeft: "16px" } })),
    );
    if (!log) {
      values.replaceChildren(
        el("table", { class: "classic-table" },
          el("thead", {}, el("tr", {}, ...["Name", "Type", "Description", "Size"].map((t) => el("th", { text: t })))),
          el("tbody", {}, ...LOGS.map((n, i) => el("tr", { ondblclick: () => ((log = n), render()) },
            el("td", {}, icon("document"), n),
            el("td", { text: "Log" }),
            el("td", { text: ["Application Error Records", "Security Audit Records", "System Error Records"][i] }),
            el("td", { text: n === "Application Log" ? Math.max(64, Math.ceil(ctx.events.length / 4) * 64) + " KB" : "64.0 KB" }))))),
      );
      status.textContent = "";
      return;
    }
    const list = rows();
    values.replaceChildren(
      el("table", { class: "classic-table" },
        el("thead", {}, el("tr", {}, ...["Type", "Date", "Time", "Source", "Category", "Event", "User", "Computer"].map((t) => el("th", { text: t })))),
        el("tbody", {}, ...list.map((e) => {
          const [d, t] = fmt(e.time);
          return el("tr", { ondblclick: () => showEvent(e) },
            el("td", {}, icon(e.level === "Error" ? "computer" : "help"), typeOf(e.level)),
            el("td", { text: d }), el("td", { text: t }),
            el("td", { text: e.source }), el("td", { text: "None" }),
            el("td", { text: String(e.id ?? 1000) }), el("td", { text: "N/A" }),
            el("td", { text: ctx.settings.get("computerName") || "COMPUTER" }));
        }))),
    );
    status.textContent = list.length + " event(s)";
  };
  const showEvent = (e) => {
    const [d, t] = fmt(e.time);
    ctx.dialogs.message(`Event Type:\t${typeOf(e.level)}\nEvent Source:\t${e.source}\nEvent Category:\tNone\nEvent ID:\t${e.id ?? 1000}\nDate:\t\t${d}\nTime:\t\t${t}\nUser:\t\tN/A\nComputer:\t${ctx.settings.get("computerName") || "COMPUTER"}\nDescription:\n${e.message}`, { title: "Event Properties", icon: "computer" });
  };
  const clear = async () => {
    if (log !== "Application Log") return;
    if (await ctx.dialogs.confirm('Do you want to save "Application" before clearing it?', "Event Viewer")) downloadFile("Application.json", JSON.stringify(ctx.events, null, 2), "application/json");
    ctx.events.length = 0;
    render();
  };
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  w.setMenu({
    Action: () => [
      off("Open Log File"),
      off("New Log View"),
      separator(),
      { label: "Clear all Events", disabled: !log, action: clear },
      { label: "Save Log File As...", disabled: !log, action: () => downloadFile(log.replace(" ", "-") + ".json", JSON.stringify(ctx.events, null, 2), "application/json") },
      separator(),
      { label: "View", submenu: [{ label: "All Records", checked: true, action: () => {} }, off("Filter..."), separator(), { label: "Newest First", checked: newestFirst, action: () => ((newestFirst = true), render()) }, { label: "Oldest First", checked: !newestFirst, action: () => ((newestFirst = false), render()) }] },
      separator(),
      { label: "Refresh", action: render },
      off("Export List..."),
      separator(),
      off("Properties"),
      separator(),
      { label: "Help", action: () => ctx.launch("help", { topic: "system" }) },
    ],
    View: [off("Large Icons"), off("Small Icons"), off("List"), { label: "Detail", checked: true, action: () => {} }, separator(), off("Customize...")],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "system" }) },
      separator(),
      { label: "About Event Viewer", action: () => ctx.dialogs.message("Event Viewer\nEvent Viewer Extension\nVersion 5.00.2195.6610\n\nMicrosoft Corporation", { title: "About Event Viewer", icon: "eventViewer" }) },
    ],
  });
  w.setContent(el("div", { class: "registry-main" }, tree, values), status);
  w.addCleanup(ctx.bus.on("event:added", render));
  render();
  return w;
}

export function openTasks(ctx) {
  const w = ctx.wm.create({
      title: "Scheduled Tasks",
      icon: "scheduledTasks",
      width: 640,
      height: 410,
      appId: "tasks",
    }),
    body = el("tbody");
  let selected = null;
  const read = () => ctx.settings.get("scheduledTasks") || [],
    write = (tasks) => ctx.settings.set("scheduledTasks", tasks);
  const render = () => {
    body.replaceChildren(
      ...read().map((t) =>
        el(
          "tr",
          {
            class: selected === t.id ? "selected" : "",
            onclick: () => {
              selected = t.id;
              render();
            },
          },
          el("td", {}, icon("programs"), t.name),
          el("td", {
            text: ctx.apps.find((a) => a.id === t.app)?.name || t.app,
          }),
          el("td", { text: new Date(t.next).toLocaleString() }),
          el("td", { text: t.enabled ? "Scheduled" : "Disabled" }),
        ),
      ),
    );
  };
  const create = () => {
    const d = ctx.wm.create({
        title: "Scheduled Task Wizard",
        width: 400,
        height: 270,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "taskwizard",
      }),
      name = el("input", { value: "New Task", "aria-label": "Task name" }),
      app = el(
        "select",
        { "aria-label": "Program" },
        ...ctx.apps
          .filter((a) => !a.hidden)
          .map((a) => el("option", { value: a.id, text: a.name })),
      ),
      delay = el("input", {
        type: "number",
        min: 1,
        max: 10080,
        value: 5,
        "aria-label": "Minutes from now",
      }),
      repeat = el("input", { type: "checkbox", "aria-label": "Repeat" });
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Task name:", name),
        field("Program:", app),
        field("Start in (minutes):", delay),
        el(
          "label",
          { class: "check-field" },
          repeat,
          "Repeat at this interval",
        ),
        el("p", { text: "Scheduled programs run while this desktop is open." }),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("Finish", () => {
          const minutes = Math.max(1, Math.min(10080, +delay.value || 5));
          write([
            ...read(),
            {
              id: crypto.randomUUID(),
              name: name.value || "New Task",
              app: app.value,
              next: Date.now() + minutes * 60000,
              interval: repeat.checked ? minutes * 60000 : 0,
              enabled: true,
            },
          ]);
          d.close();
          render();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  w.setMenu({
    File: [
      { label: "New Scheduled Task...", action: create },
      {
        label: "Delete",
        action: () => {
          write(read().filter((t) => t.id !== selected));
          render();
        },
      },
      { label: "Close", action: () => w.close() },
    ],
    Advanced: [
      {
        label: "Run Selected Task",
        action: () => {
          const t = read().find((t) => t.id === selected);
          if (t) ctx.launch(t.app);
        },
      },
      {
        label: "Pause / Resume Task",
        action: () => {
          write(
            read().map((t) =>
              t.id === selected ? { ...t, enabled: !t.enabled } : t,
            ),
          );
          render();
        },
      },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () =>
          ctx.dialogs.message(
            "Scheduled Tasks starts a program after a delay and can repeat it.\n\nThe virtual desktop must remain open. Browser suspension can delay scheduled programs.",
            { title: "Scheduled Tasks Help" },
          ),
      },
    ],
  });
  w.setContent(
    toolbar([
      { icon: "settings", label: "Add Scheduled Task", action: create },
    ]),
    el(
      "div",
      { class: "inset fill-scroll" },
      el(
        "table",
        { class: "classic-table" },
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            ...["Name", "Program", "Next Run Time", "Status"].map((x) =>
              el("th", { text: x }),
            ),
          ),
        ),
        body,
      ),
    ),
    statusBar("Tasks run while the desktop is open."),
  );
  w.addCleanup(ctx.bus.on("settings:change", render));
  render();
  return w;
}

export function openCharacterMap(ctx) {
  const w = ctx.wm.create({
    title: "Character Map",
    icon: "font",
    width: 430,
    height: 365,
    appId: "charmap",
    resizable: false,
    maximizable: false,
  });
  let selected = "A";
  const grid = el("div", { class: "character-grid inset" }),
    copyInput = el("input", { "aria-label": "Characters to copy" }),
    info = el("div", {
      class: "char-info",
      text: "U+0041: Latin Capital Letter A",
    }),
    font = el(
      "select",
      {
        "aria-label": "Font",
        onchange: (e) => (grid.style.fontFamily = e.target.value),
      },
      ...["Tahoma", "Arial", "Times New Roman", "Courier New", "Georgia"].map(
        (f) => el("option", { text: f }),
      ),
    );
  for (let code = 32; code < 256; code++) {
    if (code >= 127 && code < 160) continue;
    const char = String.fromCharCode(code);
    const b = button(
      char,
      () => {
        selected = char;
        grid.querySelector(".selected")?.classList.remove("selected");
        b.classList.add("selected");
        info.textContent =
          "U+" + code.toString(16).padStart(4, "0").toUpperCase() + ": " + char;
      },
      { title: "U+" + code.toString(16).padStart(4, "0") },
    );
    b.addEventListener("dblclick", () => (copyInput.value += char));
    grid.append(b);
  }
  w.setContent(
    el(
      "div",
      { class: "dialog-padding charmap" },
      field("Font:", font),
      grid,
      field("Characters to copy:", copyInput),
      el(
        "div",
        { class: "dialog-buttons" },
        button("Select", () => (copyInput.value += selected)),
        button("Copy", () => ctx.clipboard.setText(copyInput.value)),
      ),
      info,
    ),
  );
  return w;
}

export function openClipboardViewer(ctx) {
  const w = ctx.wm.create({
      title: "ClipBook Viewer",
      icon: "document",
      width: 520,
      height: 360,
      appId: "clipboard",
    }),
    content = el("pre", { class: "clipboard-content" });
  const render = () =>
    (content.textContent = ctx.clipboard.files.length
      ? ctx.clipboard.mode.toUpperCase() + "\n" + ctx.clipboard.files.join("\n")
      : ctx.clipboard.text || "(The clipboard is empty.)");
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  w.setMenu({
    File: [
      off("Open..."),
      { label: "Save As...", action: () => downloadFile("Clipboard.txt", ctx.clipboard.text) },
      separator(),
      off("Share..."),
      off("Stop Sharing"),
      separator(),
      off("Connect..."),
      off("Disconnect"),
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      { label: "Copy", shortcut: "Ctrl+C", action: () => ctx.clipboard.setText(content.textContent) },
      off("Paste...", { shortcut: "Ctrl+V" }),
      off("Paste to Page", { shortcut: "Ctrl+G" }),
      { label: "Delete", shortcut: "Del", action: () => ctx.clipboard.setText("") },
    ],
    Security: [off("Permissions..."), off("Auditing..."), off("Owner...")],
    View: [
      off("Toolbar", { checked: true }),
      off("Status Bar", { checked: true }),
      separator(),
      off("Table of Contents"),
      off("Thumbnails"),
      off("Full Page"),
    ],
    Window: [
      off("Cascade", { shortcut: "Shift+F5" }),
      off("Tile Horizontally"),
      off("Tile Vertically", { shortcut: "Shift+F4" }),
      off("Arrange Icons"),
      { label: "Refresh", shortcut: "F5", action: render },
    ],
    Help: [
      { label: "Contents", action: () => ctx.launch("help", { topic: "clipbook" }) },
      separator(),
      { label: "About ClipBook Viewer...", action: () => ctx.dialogs.message("ClipBook Viewer\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1990-1999 Microsoft Corp.", { title: "About ClipBook Viewer", icon: "document" }) },
    ],
  });
  w.setContent(content);
  w.addCleanup(ctx.bus.on("clipboard:change", render));
  render();
  return w;
}

export function openKeyboard(ctx) {
  const w = ctx.wm.create({
    title: "On-Screen Keyboard",
    icon: "keyboard",
    width: 650,
    height: 215,
    appId: "keyboard",
    resizable: false,
    maximizable: false,
  });
  let caps = false,
    shift = false;
  const root = el("div", { class: "onscreen-keyboard" });
  const rows = [
    [
      "Esc",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "-",
      "=",
      "Backspace",
    ],
    ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
    ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
    ["Ctrl", "Alt", "Space", "Alt", "Ctrl"],
  ];
  const type = (key) => {
    if (key === "Caps") {
      caps = !caps;
      render();
      return;
    }
    if (key === "Shift") {
      shift = !shift;
      render();
      return;
    }
    if (["Ctrl", "Alt", "Esc", "Tab"].includes(key)) {
      if (key === "Esc")
        ctx.wm.active?.el.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      return;
    }
    const target = ctx.lastTextTarget;
    if (!target || !target.isConnected) return;
    const value =
      key === "Space"
        ? " "
        : key === "Enter"
          ? "\n"
          : caps !== shift
            ? key.toUpperCase()
            : key;
    if (
      target.matches("input,textarea") &&
      typeof target.selectionStart === "number"
    ) {
      const s = target.selectionStart,
        e = target.selectionEnd;
      target.setRangeText(
        key === "Backspace" ? "" : value,
        key === "Backspace" && s === e ? Math.max(0, s - 1) : s,
        e,
        "end",
      );
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (target.isContentEditable) {
      target.focus();
      document.execCommand(
        key === "Backspace" ? "delete" : "insertText",
        false,
        key === "Backspace" ? null : value,
      );
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    shift = false;
    render();
  };
  function render() {
    root.replaceChildren(
      ...rows.map((row) =>
        el(
          "div",
          { class: "keyboard-row" },
          ...row.map((k) =>
            button(
              caps !== shift && k.length === 1 ? k.toUpperCase() : k,
              () => type(k),
              {
                class:
                  "keyboard-key" +
                  (k === "Space" ? " space-key" : "") +
                  (["Caps", "Shift"].includes(k) &&
                  ((k === "Caps" && caps) || (k === "Shift" && shift))
                    ? " pressed"
                    : ""),
                onpointerdown: (e) => e.preventDefault(),
              },
            ),
          ),
        ),
      ),
    );
  }
  {
    const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
    w.setMenu({
      File: [off("Add to Utility Manager"), separator(), { label: "Exit", action: () => w.close() }],
      Keyboard: [
        { label: "Enhanced Keyboard", checked: true, action: () => {} },
        off("Standard Keyboard"),
        separator(),
        { label: "Regular Layout", checked: true, action: () => {} },
        off("Block Layout"),
        separator(),
        { label: "101 keys", checked: true, action: () => {} },
        off("102 keys"),
        off("106 keys"),
      ],
      Settings: [
        { label: "Always on Top", checked: true, action: () => {} },
        separator(),
        off("Use Click Sound"),
        separator(),
        off("Typing Mode ..."),
        separator(),
        off("Font ..."),
      ],
      Help: [
        { label: "Contents", action: () => ctx.launch("help", { topic: "osk" }) },
        separator(),
        { label: "About On-Screen Keyboard...", action: () => ctx.dialogs.message("On-Screen Keyboard\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1999 Microsoft Corp.", { title: "About On-Screen Keyboard", icon: "keyboard" }) },
      ],
    });
  }
  w.setContent(root);
  render();
  return w;
}

export function openMagnifier(ctx) {
  const apply = (level, invert, contrast) => {
    const win = document.querySelector("#windows"), icons = document.querySelector("#desktop-icons");
    for (const n of [win, icons]) {
      if (!n) continue;
      n.style.zoom = level;
      n.style.filter = [invert ? "invert(1)" : "", contrast ? "contrast(1.8)" : ""].filter(Boolean).join(" ");
    }
  };
  const settings = ctx.settings.get("magnifier") || { level: 2, mouse: true, focus: true, text: true, invert: false, contrast: false, minimized: false, show: true };
  const save = () => ctx.settings.set("magnifier", settings);
  const run = () => {
    const d = dialogFromTemplate(ctx, MAGNIFY_DIALOGS.settings, {
      appId: "magnifier",
      icon: "magnifier",
      values: { 1000: String(settings.level) },
      checked: { 1002: settings.mouse, 1003: settings.focus, 1013: settings.text, 1005: settings.invert, 1006: settings.contrast, 1007: settings.minimized, 1008: settings.show },
      on: {
        1002: () => { settings.mouse = d.on(1002); save(); },
        1003: () => { settings.focus = d.on(1003); save(); },
        1013: () => { settings.text = d.on(1013); save(); },
        1005: () => { settings.invert = d.on(1005); save(); update(); },
        1006: () => { settings.contrast = d.on(1006); save(); update(); },
        1007: () => { settings.minimized = d.on(1007); save(); },
        1008: () => { settings.show = d.on(1008); save(); },
        1009: () => d.close(),
        3: () => ctx.launch("help", { topic: "magnifier" }),
      },
    });
    const update = () => {
      settings.level = Math.max(1, Math.min(9, parseInt(d.ctl[1000].value, 10) || 1));
      save();
      apply(settings.level === 1 ? 1 : 1 + (settings.level - 1) * 0.25, settings.invert, settings.contrast);
    };
    d.ctl[1000].addEventListener("input", update);
    d.ctl[1000].addEventListener("change", () => { update(); d.ctl[1000].value = String(settings.level); });
    d.addCleanup(() => apply(1, false, false));
    update();
    return d;
  };
  if (!ctx.settings.get("magnifierIntroSeen")) {
    const intro = dialogFromTemplate(ctx, MAGNIFY_DIALOGS.intro, {
      appId: "magnifier",
      icon: "magnifier",
      on: {
        1: () => {
          if (intro.on(1008)) ctx.settings.set("magnifierIntroSeen", true);
          intro.close();
          run();
        },
      },
    });
    return intro;
  }
  return run();
}
