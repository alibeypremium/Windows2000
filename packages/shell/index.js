import {
  el,
  button,
  icon,
  popup,
  closeMenus,
  separator,
  fileIcon,
  checkbox,
  field,
  safely,
} from "../ui/index.js";
import { getLang, setLang } from "../ui/i18n.js";
import { DESKTOP, DOCS, joinPath, basename, pickFiles } from "../core/index.js";
import { openTaskbarProperties } from "../control-panel/dialogs.js";
import { refWindow, kit, btn } from "../control-panel/refkit.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { confirmDelete } from "../ui/shconfirm.js";
import { rarMenuItems } from "../accessories/winrar-shell.js";
import { startSaver } from "../rendering/savers.js";
import { openLanStatus } from "./lan-status.js";
export { openHelp, openWelcome, openAbout } from "./help.js";
// tray icons: a name from the icon set, or a root-absolute file path (e.g. an .svg)
const trayImg = (name) => (/^\.{0,2}\//.test(name) ? el("img", { class: "icon", src: name, width: 16, height: 16, alt: "", draggable: "false" }) : icon(name, 16));
export class DesktopShell {
  constructor(ctx) {
    this.ctx = ctx;
    this.start = null;
    this.selected = new Set();
    this.clockTimer = null;
    this.activeIcons = [];
    this.screenSaverTimer = null;
    this.lastActivity = Date.now();
  }
  init() {
    const ctx = this.ctx;
    this.renderDesktop();
    this.renderTaskbar();
    ctx.bus.on("windows:change", () => this.renderTasks());
    ctx.bus.on("fs:change", () => this.renderDesktop());
    ctx.bus.on("settings:change", () => {
      this.renderDesktop();
      this.updateClock();
      document.querySelector("#quick-launch").hidden =
        !ctx.settings.get("quickLaunch");
    });
    document.addEventListener("pointerdown", (e) => {
      this.lastActivity = Date.now();
      if (!e.target.closest("#start-button,.start-menu,.popup-menu"))
        this.closeStart();
    });
    document.addEventListener(
      "keydown",
      safely((e) => this.keydown(e)),
    );
    document.addEventListener("focusin", (e) => {
      if (e.target.closest('[data-app="keyboard"]')) return;
      if (
        e.target.matches(
          "textarea,input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color])",
        ) ||
        e.target.isContentEditable
      )
        ctx.lastTextTarget = e.target;
    });
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
    // Windows that set `flashing` (new message while unfocused/minimized) blink their taskbar button; tray windows blink their icon.
    let phase = false;
    this.flashTimer = setInterval(() => {
      phase = !phase;
      const wins = ctx.wm.windows;
      for (const w of wins) if (w.flashing && ctx.wm.active === w && !w.minimized) w.flashing = false;
      document.querySelectorAll("#task-buttons .task-button[data-task-id]").forEach((b) => { const w = wins.find((x) => String(x.id) === b.dataset.taskId); b.classList.toggle("flash", !!(w?.flashing && phase)); });
      document.querySelectorAll(".tray-app").forEach((b) => {
        const w = wins.find((x) => String(x.id) === b.dataset.winId), img = b.querySelector("img");
        if (!w || !img) return;
        const on = !!(w.trayFlash?.() && phase);
        const want = on ? w.trayFlashIcon : w.trayIconNow?.() || w.trayIcon;
        if (want && img.dataset.cur !== String(on) + want) { img.dataset.cur = String(on) + want; { const n = trayImg(want); n.dataset.cur = String(on) + want; img.replaceWith(n); } }
      });
    }, 500);
    this.updateClock();
    const desktop = document.querySelector("#desktop-icons");
    desktop.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".desktop-icon")) return;
      e.preventDefault();
      this.backgroundMenu(e.clientX, e.clientY);
    });
    desktop.addEventListener("pointerdown", (e) => this.marquee(e));
    desktop.addEventListener("dragover", (e) => e.preventDefault());
    desktop.addEventListener(
      "drop",
      safely(async (e) => {
        e.preventDefault();
        if (e.target.closest(".desktop-icon")) return;
        const iconId = e.dataTransfer.getData(
          "application/x-win2k-desktop-icon",
        );
        if (iconId) {
          const positions = ctx.settings.get("desktopPositions") || {};
          positions[iconId] = {
            x: Math.max(0, Math.min(innerWidth - 76, e.clientX - 36)),
            y: Math.max(0, Math.min(innerHeight - 105, e.clientY - 24)),
          };
          ctx.settings.set("desktopPositions", positions);
          return;
        }
        const paths = e.dataTransfer.getData("application/x-win2k-files");
        if (paths) {
          await ctx.clipboard.transfer(ctx.fs, JSON.parse(paths).filter((p) => !p.toLowerCase().startsWith(DESKTOP.toLowerCase() + "/")), DESKTOP, { copy: e.ctrlKey });
        } else
          for (const file of e.dataTransfer.files)
            await ctx.fs.importFile(file);
      }),
    );
    this.scheduler = setInterval(() => {
      const tasks = ctx.settings.get("scheduledTasks") || [],
        now = Date.now();
      let changed = false;
      for (const task of tasks) {
        if (task.enabled && task.next <= now) {
          ctx.launch(task.app);
          task.lastRun = now;
          if (task.interval) task.next = now + task.interval;
          else task.enabled = false;
          changed = true;
        }
      }
      if (changed) ctx.settings.set("scheduledTasks", tasks);
      const saver = ctx.settings.get("screensaver");
      if (
        saver !== "none" &&
        now - this.lastActivity >
          ctx.settings.get("screenSaverMinutes") * 60000 &&
        !document.querySelector(".screensaver")
      )
        this.previewScreensaver(saver);
    }, 1000);
    window.addEventListener("resize", () => this.renderDesktop());
    return this;
  }
  renderDesktop() {
    const ctx = this.ctx,
      root = document.querySelector("#desktop-icons"),
      positions = ctx.settings.get("autoArrange") ? {} : ctx.settings.get("desktopPositions") || {};
    const icons = [
      {
        id: "documents",
        name: "My Documents",
        icon: "documents",
        action: () => ctx.launch("explorer", { path: "documents" }),
        folder: DOCS,
      },
      {
        id: "computer",
        name: "My Computer",
        icon: "computer",
        action: () => ctx.launch("explorer", { path: "computer" }),
      },
      {
        id: "network",
        name: "My Network Places",
        icon: "network",
        action: () => ctx.launch("explorer", { path: "network" }),
      },
      {
        id: "recycle",
        name: "Recycle Bin",
        icon: ctx.fs.recycled().length ? "recycleFull" : "recycle",
        action: () => ctx.launch("explorer", { path: "recycle" }),
      },
      {
        id: "ie",
        name: "Internet Explorer",
        icon: "ie",
        action: () => ctx.launch("ie"),
      },
      {
        id: "winamp",
        name: "Winamp",
        icon: "winamp",
        action: () => ctx.launch("winamp"),
      },
      {
        id: "mediaplayer",
        name: "Windows Media Player",
        icon: "media",
        action: () => ctx.launch("mediaplayer"),
      },
      {
        id: "acrobat",
        name: "Acrobat Reader 5.0",
        icon: "acrobat",
        action: () => ctx.launch("acrobat"),
      },
      {
        id: "divx",
        name: "DivX Player",
        icon: "divx",
        action: () => ctx.launch("divx"),
      },
      {
        id: "vlc",
        name: "VLC media player",
        icon: "vlc",
        action: () => ctx.launch("vlc"),
      },
      {
        id: "winrar",
        name: "WinRAR",
        icon: "winrar",
        action: () => ctx.launch("winrar"),
      },
      {
        id: "nvidia",
        name: "Nvidia",
        icon: "nvidia",
        action: () => ctx.launch("nvidia"),
      },
      {
        id: "wintools",
        name: "Windows Tools",
        icon: "wintools",
        action: () => ctx.launch("wintools"),
      },
      {
        id: "icq",
        name: "ICQ",
        icon: "icq",
        action: () => ctx.launch("icq"),
      },
      {
        id: "msn",
        name: "MSN Messenger",
        icon: "msn",
        action: () => ctx.launch("msn"),
      },
      {
        id: "netscape",
        name: "Netscape Navigator",
        icon: "netscape",
        action: () => ctx.launch("netscape"),
      },
      {
        id: "word",
        name: "Microsoft Word",
        icon: "word",
        action: () => ctx.launch("word"),
      },
      ...ctx.fs.list(DESKTOP).map((n) => ({
        id: n.path,
        name: n.name,
        icon: fileIcon(n),
        action: () => ctx.openFile(n.path),
        folder: n.type === "folder" ? n.path : null,
        path: n.path,
      })),
    ];
    const customNames = ctx.settings.get("iconNames") || {};
    for (const i of icons) if (!i.path && customNames[i.id]) i.name = customNames[i.id];
    this.activeIcons = icons;
    root.replaceChildren();
    if (ctx.settings.get("hideDesktopIcons")) return;
    // Icons without a saved position take the next grid cell that no other icon occupies.
    const gridRows = Math.max(1, Math.floor((innerHeight - 60) / 82)), taken = new Set();
    for (const it of icons) { const sp = positions[it.id]; if (sp) taken.add(Math.round((sp.x - 6) / 80) + "," + Math.round((sp.y - 10) / 82)); }
    let slot = 0;
    const freeSlot = () => {
      for (;; slot++) {
        const c = Math.floor(slot / gridRows), r = slot % gridRows;
        if (!taken.has(c + "," + r)) { taken.add(c + "," + r); slot++; return { x: c * 80 + 6, y: r * 82 + 10 }; }
      }
    };
    icons.forEach((item, i) => {
      const pos = positions[item.id] || freeSlot(),
        b = button(
          [
            icon(item.icon, ctx.settings.get("largeIcons") ? 32 : 16),
            el("span", { text: item.name }),
          ],
          (e) => {
            if (!e.ctrlKey && !e.metaKey) this.selected.clear();
            this.selected.add(item.id);
            this.updateSelection();
          },
          {
            class:
              "desktop-icon" + (this.selected.has(item.id) ? " selected" : ""),
            "data-id": item.id,
            title: item.name,
            style: {
              left: Math.min(pos.x, innerWidth - 77) + "px",
              top: Math.min(pos.y, innerHeight - 105) + "px",
            },
          },
        );
      let tap = null, lastTap = 0;
      b.addEventListener("pointerdown", (e) => { tap = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY } : null; });
      b.addEventListener("pointerup", (e) => {
        if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) { lastTap = Date.now(); safely(() => item.action())(); }
        tap = null;
      });
      b.addEventListener(
        "dblclick",
        safely(() => { if (Date.now() - lastTap > 800) item.action(); }),
      );
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.selected.has(item.id)) this.selected = new Set([item.id]);
        this.updateSelection();
        popup(this.iconMenu(item), e.clientX, e.clientY);
      });
      b.addEventListener("dragstart", (e) => e.preventDefault());
      b.addEventListener("pointerdown", (e) => this.dragIcon(e, item, b));
      if (item.folder || item.id === "recycle") {
        b.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.stopPropagation();
          b.classList.add("drop-target");
        });
        b.addEventListener("dragleave", () =>
          b.classList.remove("drop-target"),
        );
        b.addEventListener(
          "drop",
          safely(async (e) => {
            e.preventDefault();
            e.stopPropagation();
            b.classList.remove("drop-target");
            const data = e.dataTransfer.getData("application/x-win2k-files");
            if (data) {
              if (item.id === "recycle") for (const p of JSON.parse(data)) await ctx.fs.remove(p);
              else await ctx.clipboard.transfer(ctx.fs, JSON.parse(data).filter((p) => p !== item.folder), item.folder, { copy: e.ctrlKey });
            } else if (item.folder)
              for (const file of e.dataTransfer.files)
                await ctx.fs.importFile(file, item.folder);
          }),
        );
      }
      root.append(b);
    });
  }
  /** Context menu of a desktop icon (Windows 2000 shell32 menus: verbs + Cut/Copy/Create Shortcut/Delete/Rename/Properties). */
  iconMenu(item) {
    const ctx = this.ctx, sep = separator;
    const open = { label: "Open", action: item.action, bold: true };
    const explore = { label: "Explore", action: () => ctx.launch("explorer", { path: item.folder || { computer: "computer", network: "network", recycle: "recycle", documents: DOCS }[item.id] || "computer" }) };
    const shortcut = { label: "Create Shortcut", action: () => this.createShortcutTo(item) };
    const rename = { label: "Rename", action: () => this.renameSelected(item) };
    const props = { label: "Properties", action: () => this.iconProperties(item) };
    const nd = () => ctx.dialogs.message("Network drives are not available in this browser environment.", { title: "Map Network Drive", icon: "warning" });
    const map = [{ label: "Map Network Drive...", action: nd }, { label: "Disconnect Network Drive...", action: nd }];
    if (item.path) {
      const paste = { label: "Paste", disabled: !item.folder || !ctx.clipboard.files.length, action: () => ctx.clipboard.pasteFiles(ctx.fs, item.path) };
      return [open, ...(item.folder ? [explore] : []), sep(), ...rarMenuItems(ctx, this.selectedPaths(item)), { label: "Cut", action: () => ctx.clipboard.setFiles(this.selectedPaths(item), "cut") }, { label: "Copy", action: () => ctx.clipboard.setFiles(this.selectedPaths(item)) }, ...(item.folder ? [paste] : []), sep(), shortcut, { label: "Delete", action: () => this.deleteSelected() }, rename, sep(), props];
    }
    if (item.id === "recycle") {
      const n = ctx.fs.recycled().length;
      return [open, explore, sep(), { label: "Empty Recycle Bin", disabled: !n, action: () => this.emptyRecycleBin() }, sep(), shortcut, rename, sep(), props];
    }
    if (item.id === "computer") return [open, explore, { label: "Search...", action: () => ctx.launch("explorer", { path: "search" }) }, { label: "Manage", action: () => ctx.launch("diskmanager") }, sep(), ...map, sep(), shortcut, rename, sep(), props];
    if (item.id === "network") return [open, explore, { label: "Search for Computers...", action: () => ctx.launch("explorer", { path: "search" }) }, sep(), ...map, sep(), shortcut, rename, sep(), props];
    if (item.id === "documents") return [open, explore, { label: "Search...", action: () => ctx.launch("explorer", { path: "search" }) }, sep(), ...map, sep(), shortcut, rename, sep(), props];
    return [open, sep(), shortcut, rename, sep(), props];
  }
  selectedPaths(item) {
    const p = this.activeIcons.filter((a) => this.selected.has(a.id) && a.path).map((a) => a.path);
    return p.length ? p : [item.path];
  }
  async emptyRecycleBin() {
    const ctx = this.ctx, n = ctx.fs.recycled().length;
    if (!n) return;
    const ok = await confirmDelete(ctx, { names: Array(n).fill(""), emptyBin: true });
    if (!ok) return;
    await ctx.fs.emptyRecycleBin();
    this.renderDesktop();
  }
  async createShortcutTo(item) {
    const ctx = this.ctx;
    const command = item.path ? item.path : { computer: "explorer computer", network: "explorer network", recycle: "explorer recycle", documents: "explorer " + DOCS, ie: "ie" }[item.id];
    const name = "Shortcut to " + item.name;
    await ctx.fs.writeFile(joinPath(DESKTOP, ctx.fs.uniqueName(DESKTOP, name + ".lnk")), JSON.stringify({ command }), { mime: "application/x-win2k-shortcut" });
    this.renderDesktop();
  }
  iconProperties(item) {
    const ctx = this.ctx;
    if (item.id === "recycle") return ctx.dialogs.message("The Recycle Bin contains files you have deleted from your computer. These files are not permanently removed until you empty the Recycle Bin.", { title: "Recycle Bin Properties", icon: "recycle" });
    if (item.path) return ctx.launch("explorer", { path: item.path }).then?.(() => {}) && ctx.dialogs.message(`${item.name}\n\nLocation: ${item.path.replaceAll("/", "\\")}`, { title: item.name + " Properties", icon: item.icon });
    return ctx.launch("control", { page: item.id === "computer" ? "system" : item.id === "network" ? "network" : item.id === "ie" ? "internet" : "folder" });
  }
  /** Pointer based icon dragging: multi-select move, align to grid, drop on folder / Recycle Bin / open windows. */
  dragIcon(e, item, node) {
    if (e.button !== 0) return;
    const ctx = this.ctx, locked = ctx.settings.get("lockDesktopItems") || ctx.settings.get("autoArrange"), startX = e.clientX, startY = e.clientY;
    if (!this.selected.has(item.id)) {
      if (!e.ctrlKey && !e.metaKey) this.selected.clear();
      this.selected.add(item.id);
      this.updateSelection();
    }
    const nodes = () => [...document.querySelectorAll(".desktop-icon")].filter((n) => this.selected.has(n.dataset.id));
    const origin = new Map(nodes().map((n) => [n, { x: parseFloat(n.style.left), y: parseFloat(n.style.top) }]));
    let moving = false, over = null;
    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (locked || (!moving && Math.hypot(dx, dy) < 5)) return;
      if (!moving) { moving = true; node.setPointerCapture?.(e.pointerId); document.body.classList.add("icon-dragging"); }
      for (const [n, o] of origin) { n.style.left = o.x + dx + "px"; n.style.top = o.y + dy + "px"; n.classList.add("dragging"); }
      {
        const under = document.elementsFromPoint(ev.clientX, ev.clientY).find((el) => !el.closest(".desktop-icon.dragging"));
        const t = under?.closest?.(".desktop-icon");
        if (over && over !== t) over.classList.remove("drop-target");
        over = t && !this.selected.has(t.dataset.id) && (this.activeIcons.find((a) => a.id === t.dataset.id)?.folder || t.dataset.id === "recycle") ? t : null;
        over?.classList.add("drop-target");
      }
    };
    const up = async (ev) => {
      window.removeEventListener("pointermove", move);
      node.releasePointerCapture?.(e.pointerId);
      document.body.classList.remove("icon-dragging");
      over?.classList.remove("drop-target");
      if (!moving) { if (!e.ctrlKey && !e.metaKey) { this.selected = new Set([item.id]); this.updateSelection(); } return; }
      node.addEventListener("click", (c) => { c.stopImmediatePropagation(); c.preventDefault(); }, { once: true, capture: true });
      const dragged = this.activeIcons.filter((a) => this.selected.has(a.id));
      const files = dragged.filter((a) => a.path).map((a) => a.path);
      const under = document.elementsFromPoint(ev.clientX, ev.clientY).find((el) => !el.closest(".desktop-icon.dragging"));
      const target = this.activeIcons.find((a) => a.id === over?.dataset.id);
      if (target) {
        try {
          if (target.id === "recycle") for (const p of files) await ctx.fs.remove(p);
          else await ctx.clipboard.transfer(ctx.fs, files.filter((p) => p !== target.folder), target.folder, { copy: ev.ctrlKey });
        } catch (err) { ctx.dialogs.message(String(err.message || err), { title: "Error", icon: "error" }); }
        this.renderDesktop();
        return;
      }
      const win = under?.closest?.(".window");
      if (win && files.length) {
        const dt = new DataTransfer();
        dt.setData("application/x-win2k-files", JSON.stringify(files));
        for (const t of ["dragenter", "dragover", "drop"]) under.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: ev.clientX, clientY: ev.clientY, ctrlKey: ev.ctrlKey }));
        this.renderDesktop();
        return;
      }
      // place on the desktop, aligned to the 80x82 grid
      const positions = ctx.settings.get("desktopPositions") || {};
      const taken = new Set(this.activeIcons.filter((a) => !this.selected.has(a.id)).map((a) => { const n = document.querySelector(`.desktop-icon[data-id="${CSS.escape(a.id)}"]`); return n ? Math.round((parseFloat(n.style.left) - 6) / 80) + "," + Math.round((parseFloat(n.style.top) - 10) / 82) : ""; }));
      const cols = Math.floor(innerWidth / 80), rows = Math.max(1, Math.floor((innerHeight - 60) / 82));
      for (const [n, o] of origin) {
        const x = parseFloat(n.style.left), y = parseFloat(n.style.top);
        let gx = Math.max(0, Math.min(cols - 1, Math.round((x - 6) / 80))), gy = Math.max(0, Math.min(rows - 1, Math.round((y - 10) / 82)));
        for (let k = 0; taken.has(gx + "," + gy) && k < 200; k++) { gy++; if (gy >= rows) { gy = 0; gx = Math.min(cols - 1, gx + 1); } }
        taken.add(gx + "," + gy);
        positions[n.dataset.id] = { x: gx * 80 + 6, y: gy * 82 + 10 };
      }
      ctx.settings.set("desktopPositions", positions);
      this.renderDesktop();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    node.addEventListener("pointercancel", up, { once: true });
  }
  updateSelection() {
    document.querySelectorAll(".desktop-icon").forEach((el) => {
      el.classList.toggle("selected", this.selected.has(el.dataset.id));
      el.setAttribute("aria-selected", this.selected.has(el.dataset.id));
    });
  }
  marquee(e) {
    if (e.button !== 0 || e.target.closest(".desktop-icon")) return;
    this.selected.clear();
    this.updateSelection();
    const box = document.querySelector("#selection-rect"),
      sx = e.clientX,
      sy = e.clientY;
    box.hidden = false;
    const root = e.currentTarget;
    root.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const x = Math.min(sx, ev.clientX),
        y = Math.min(sy, ev.clientY),
        width = Math.abs(ev.clientX - sx),
        height = Math.abs(ev.clientY - sy);
      Object.assign(box.style, {
        left: x + "px",
        top: y + "px",
        width: width + "px",
        height: height + "px",
      });
      this.selected.clear();
      document.querySelectorAll(".desktop-icon").forEach((n) => {
        const r = n.getBoundingClientRect();
        if (
          r.left < x + width &&
          r.right > x &&
          r.top < y + height &&
          r.bottom > y
        )
          this.selected.add(n.dataset.id);
      });
      this.updateSelection();
    };
    const stop = () => {
      box.hidden = true;
      root.removeEventListener("pointermove", move);
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", stop, { once: true });
    root.addEventListener("pointercancel", stop, { once: true });
  }
  async renameSelected(only) {
    const item = only || this.activeIcons.find((a) => this.selected.has(a.id) && a.path);
    if (!item) return;
    if (!item.path) {
      const names = this.ctx.settings.get("iconNames") || {};
      const n = await this.ctx.dialogs.prompt("Type a new name:", names[item.id] || item.name, { title: "Rename" });
      if (n) { names[item.id] = n; this.ctx.settings.set("iconNames", names); this.renderDesktop(); }
      return;
    }
    const n = await this.ctx.dialogs.prompt("Type a new name:", item.name, {
      title: "Rename",
    });
    if (n) await this.ctx.fs.rename(item.path, n);
  }
  async deleteSelected() {
    const items = this.activeIcons.filter(
      (a) => this.selected.has(a.id) && a.path,
    );
    if (
      items.length &&
      (await confirmDelete(this.ctx, { names: items.map((i) => i.name), folders: items.map((i) => !!i.folder) }))
    )
      for (const item of items) await this.ctx.fs.remove(item.path);
  }
  /** Re-lay out desktop icons in a column grid, ordered by `by` (name/type/size/date). */
  arrangeIcons(by) {
    const ctx = this.ctx, icons = [...this.activeIcons];
    const meta = (i) => (i.path ? ctx.fs.stat(i.path) || {} : {});
    const ext = (i) => (i.path ? (i.name.split(".").pop() || "").toLowerCase() : "");
    const sys = (i) => (i.path ? 1 : 0); // system icons stay first, as on Windows
    const keys = {
      name: (a, b) => a.name.localeCompare(b.name),
      type: (a, b) => (a.folder ? 0 : 1) - (b.folder ? 0 : 1) || ext(a).localeCompare(ext(b)) || a.name.localeCompare(b.name),
      size: (a, b) => (meta(a).size || 0) - (meta(b).size || 0) || a.name.localeCompare(b.name),
      date: (a, b) => (meta(a).modified || meta(a).mtime || 0) - (meta(b).modified || meta(b).mtime || 0) || a.name.localeCompare(b.name),
    };
    icons.sort((a, b) => sys(a) - sys(b) || keys[by](a, b));
    const rows = Math.max(1, Math.floor((innerHeight - 60) / 82)), pos = {};
    icons.forEach((i, n) => (pos[i.id] = { x: Math.floor(n / rows) * 80 + 6, y: (n % rows) * 82 + 10 }));
    ctx.settings.set("desktopPositions", pos);
    this.renderDesktop();
  }
  lineUpIcons() {
    const ctx = this.ctx, pos = ctx.settings.get("desktopPositions") || {};
    const rows = Math.max(1, Math.floor((innerHeight - 60) / 82)), cols = Math.max(1, Math.floor(innerWidth / 80)), taken = new Set(), out = {};
    document.querySelectorAll(".desktop-icon").forEach((n) => {
      let gx = Math.max(0, Math.min(cols - 1, Math.round((parseFloat(n.style.left) - 6) / 80))), gy = Math.max(0, Math.min(rows - 1, Math.round((parseFloat(n.style.top) - 10) / 82)));
      for (let k = 0; taken.has(gx + "," + gy) && k < 500; k++) { gy++; if (gy >= rows) { gy = 0; gx = Math.min(cols - 1, gx + 1); } }
      taken.add(gx + "," + gy);
      out[n.dataset.id] = { x: gx * 80 + 6, y: gy * 82 + 10 };
    });
    ctx.settings.set("desktopPositions", { ...pos, ...out });
    this.renderDesktop();
  }
  backgroundMenu(x, y) {
    const ctx = this.ctx, st = (k) => !!ctx.settings.get(k), tog = (k) => () => { ctx.settings.set(k, !st(k)); this.renderDesktop(); };
    popup(
      [
        {
          label: "Active Desktop",
          submenu: [
            { label: "Show Desktop Icons", checked: !st("hideDesktopIcons"), action: tog("hideDesktopIcons") },
            { label: "Lock Desktop Items", checked: st("lockDesktopItems"), action: tog("lockDesktopItems") },
            separator(),
            { label: "Customize My Desktop...", action: () => ctx.launch("control", { page: "display" }) },
            { label: "Update Now", action: () => this.renderDesktop() },
          ],
        },
        {
          label: "Arrange Icons",
          submenu: [
            { label: "by Name", action: () => this.arrangeIcons("name") },
            { label: "by Type", action: () => this.arrangeIcons("type") },
            { label: "by Size", action: () => this.arrangeIcons("size") },
            { label: "by Date", action: () => this.arrangeIcons("date") },
            separator(),
            { label: "Auto Arrange", checked: st("autoArrange"), action: () => { tog("autoArrange")(); if (st("autoArrange")) this.arrangeIcons("name"); } },
          ],
        },
        { label: "Line Up Icons", action: () => this.lineUpIcons() },
        { label: "Refresh", action: () => this.renderDesktop() },
        separator(),
        {
          label: "Paste",
          disabled: !ctx.clipboard.files.length,
          action: () => ctx.clipboard.pasteFiles(ctx.fs, DESKTOP),
        },
        { label: "Paste Shortcut", disabled: !ctx.clipboard.files.length, action: async () => { for (const p of ctx.clipboard.files) await this.createShortcutTo({ path: p, name: basename(p) }); } },
        { label: "Undo", disabled: true },
        separator(),
        {
          label: "New",
          submenu: [
            {
              label: "Folder",
              icon: "folder",
              action: async () => {
                const n = await ctx.dialogs.prompt(
                  "Type a name for the new folder:",
                  ctx.fs.uniqueName(DESKTOP, "New Folder"),
                  { title: "New Folder" },
                );
                if (n) await ctx.fs.mkdir(joinPath(DESKTOP, n));
              },
            },
            {
              label: "Text Document",
              icon: "notepad",
              action: async () => {
                const name = ctx.fs.uniqueName(
                  DESKTOP,
                  "New Text Document.txt",
                );
                await ctx.fs.writeFile(joinPath(DESKTOP, name), "");
                this.renderDesktop();
              },
            },
            {
              label: "Shortcut",
              icon: "document",
              action: async () => {
                const command = await ctx.dialogs.prompt(
                  "Type the location of the item (program name or file path):",
                  "notepad",
                  { title: "Create Shortcut" },
                );
                if (!command) return;
                const name = await ctx.dialogs.prompt(
                  "Type a name for this shortcut:",
                  "New Shortcut",
                  { title: "Create Shortcut" },
                );
                if (name)
                  await ctx.fs.writeFile(
                    joinPath(
                      DESKTOP,
                      ctx.fs.uniqueName(DESKTOP, name + ".lnk"),
                    ),
                    JSON.stringify({ command }),
                    { mime: "application/x-win2k-shortcut" },
                  );
              },
            },
          ],
        },
        separator(),
        {
          label: "Properties",
          action: () => ctx.launch("control", { page: "display" }),
        },
      ],
      x,
      y,
    );
  }
  /** Input-language indicator in the notification area (TR / EN); the menu switches the interface language. */
  languageTray() {
    const ctx = this.ctx;
    const b = button("", (e) => {
      const r = b.getBoundingClientRect(), cur = getLang();
      popup([
        { label: "TR  Türkçe (Türkiye)", checked: cur === "tr", action: () => setLang("tr") },
        { label: "EN  English (United States)", checked: cur === "en", action: () => setLang("en") },
      ], r.left, r.top - 52);
    }, { class: "tray-button language", "aria-label": "Language", title: "Language" });
    const sync = () => { b.textContent = getLang() === "tr" ? "TR" : "EN"; b.title = getLang() === "tr" ? "Dil: Türkçe (Türkiye)" : "Language: English (United States)"; b.setAttribute("aria-label", b.title); this.updateClock?.(); };
    ctx.bus.on("lang:change", sync);
    sync();
    return b;
  }
  /** Network tray icon (netshell.dll 16px LAN icons); blinks on activity. */
  lanTray() {
    const ctx = this.ctx;
    const st = (this.lan = this.lan || { up: true, since: Date.now(), sentPk: 0, recvPk: 0, burst: 0 });
    const img = el("img", { src: "assets/tray/lan193.png", width: 16, height: 16, alt: "" });
    const b = button(img, () => {}, {
      class: "tray-button lan",
      title: "Local Area Connection\nSpeed: 100.0 Mbps",
      "aria-label": "Local Area Connection",
    });
    b.addEventListener("dblclick", () => this.lanStatus());
    const frames = ["190", "191", "192"];
    const paint = () => {
      const n = st.up ? (st.burst > 0 ? frames[(st.burst + (st.tick = (st.tick || 0) + 1)) % 3] : "193") : "195";
      img.src = `assets/tray/lan${n}.png`;
    };
    st.paint = paint;
    st.activity = (n = 12) => {
      if (!st.up) return;
      st.burst = Math.max(st.burst, n);
      st.sentPk += 1 + Math.floor(Math.random() * 6);
      st.recvPk += 1 + Math.floor(Math.random() * 12);
    };
    clearInterval(st.timer);
    st.timer = setInterval(() => {
      if (st.burst > 0) st.burst--;
      else if (Math.random() < 0.3) st.activity(3 + Math.floor(Math.random() * 8));
      paint();
      b.title = `Local Area Connection\nSpeed: 100.0 Mbps\nSent: ${st.sentPk.toLocaleString("en-US")} packets\nReceived: ${st.recvPk.toLocaleString("en-US")} packets`;
      st.refresh?.();
    }, 120);
    ctx.bus.on("network:activity", () => st.activity(14));
    b.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      popup(
        [
          { label: st.up ? "Disable" : "Enable", action: () => { st.up = !st.up; if (st.up) st.since = Date.now(); paint(); } },
          { label: "Status", action: () => this.lanStatus() },
          separator(),
          { label: "Open Network and Dial-up Connections", action: () => ctx.launch("explorer", { path: "connections" }) },
        ],
        e.clientX,
        e.clientY,
      );
    });
    return b;
  }

  lanStatus() {
    return openLanStatus(this.ctx, this.lan);
  }

  renderTaskbar() {
    const ctx = this.ctx,
      taskbar = document.querySelector("#taskbar");
    taskbar.replaceChildren(
      button(
        [icon("windows", 22), el("b", { text: "Start" })],
        () => this.toggleStart(),
        {
          id: "start-button",
          class: "start-button",
          "aria-haspopup": "menu",
          "aria-expanded": "false",
        },
      ),
      el("span", { class: "taskbar-grip" }),
      el(
        "div",
        { id: "quick-launch" },
        button(icon("showDesktop"), () => ctx.launch("keyboard"), {
          class: "quick-launch-button",
          title: "On-Screen Keyboard",
          "aria-label": "On-Screen Keyboard",
        }),
        button(icon("qlDesktop"), () => ctx.wm.showDesktop(), {
          class: "quick-launch-button",
          title: "Show Desktop",
          "aria-label": "Show Desktop",
        }),
        button(icon("qlIe"), () => ctx.launch("ie"), {
          class: "quick-launch-button",
          title: "Launch Internet Explorer Browser",
          "aria-label": "Internet Explorer",
        }),
        button(icon("qlMail"), () => ctx.launch("outlook"), {
          class: "quick-launch-button",
          title: "Launch Outlook Express",
          "aria-label": "Outlook Express",
        }),
      ),
      el("span", { class: "taskbar-grip" }),
      el("div", { id: "task-buttons" }),
      el(
        "div",
        { class: "system-tray inset" },
        this.languageTray(),
        this.lanTray(),
        button(icon("speaker"), () => ctx.launch("volume"), {
          class: "tray-button",
          title: "Volume",
          "aria-label": "Volume",
        }),
        button("", () => {}, {
          id: "taskbar-clock",
          class: "tray-button clock",
          "aria-label": "Date and time",
        }),
      ),
    );
    taskbar.querySelector("#taskbar-clock")?.addEventListener("dblclick", () => ctx.launch("control", { page: "datetime" }));
    taskbar.addEventListener("contextmenu", (e) => {
      if (e.target.closest("#task-buttons button")) return;
      e.preventDefault();
      if (e.target.closest("#start-button")) {
        const startDir = DESKTOP.replace(/\/Desktop$/, "");
        const open = (path) => () => ctx.launch("explorer", { path });
        popup([
          { label: "Open", bold: true, action: open(startDir) },
          { label: "Explore", action: open(startDir) },
          { label: "Find...", action: () => ctx.launch("explorer", { path: "search" }) },
          separator(),
          { label: "Open All Users", action: open(startDir) },
          { label: "Explore All Users", action: open(startDir) },
        ], e.clientX, e.clientY - 120);
        return;
      }
      popup(
        [
          {
            label: "Toolbars",
            submenu: [
              {
                label: "Quick Launch",
                checked: ctx.settings.get("quickLaunch"),
                action: () =>
                  ctx.settings.set(
                    "quickLaunch",
                    !ctx.settings.get("quickLaunch"),
                  ),
              },
            ],
          },
          separator(),
          { label: "Cascade Windows", action: () => ctx.wm.arrange("cascade") },
          {
            label: "Tile Windows Horizontally",
            action: () => ctx.wm.arrange("horizontal"),
          },
          {
            label: "Tile Windows Vertically",
            action: () => ctx.wm.arrange("vertical"),
          },
          { label: "Minimize All Windows", action: () => ctx.wm.showDesktop() },
          separator(),
          { label: "Task Manager", action: () => ctx.launch("taskmgr") },
          { label: "Properties", action: () => this.taskbarProperties() },
        ],
        e.clientX,
        e.clientY,
      );
    });
    this.renderTasks();
  }
  renderTasks() {
    const ctx = this.ctx,
      root = document.querySelector("#task-buttons");
    if (!root) return;
    this.renderTrayWindows();
    root.replaceChildren(
      ...ctx.wm.windows
        .filter((w) => !w.dialog && !w.closed && !(w.trayIcon && w.minimized && !w.trayAlways))
        .map((w) => {
          const b = button(
            [icon(w.icon), el("span", { text: w.title })],
            () => {
              if (ctx.wm.active === w && !w.minimized) w.minimize();
              else w.focus();
            },
            {
              class: "task-button" + (ctx.wm.active === w ? " active" : ""),
              title: w.title,
              "aria-label": w.title,
              "data-task-id": w.id,
            },
          );
          b.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            ctx.wm.systemMenu(w, e.clientX, e.clientY - 100);
          });
          return b;
        }),
    );
  }
  /** Windows that set `trayIcon` hide their taskbar button when minimized and show an icon in the notification area instead. */
  renderTrayWindows() {
    const tray = document.querySelector(".system-tray");
    if (!tray) return;
    const ctx = this.ctx;
    const want = ctx.wm.windows.filter((w) => w.trayIcon && (w.minimized || w.trayAlways) && !w.closed);
    for (const old of [...tray.querySelectorAll(".tray-app")]) if (!want.some((w) => w.id === old.dataset.winId)) old.remove();
    for (const w of want) {
      if (tray.querySelector(`.tray-app[data-win-id="${w.id}"]`)) continue;
      const b = button(trayImg(w.trayIconNow?.() || w.trayIcon), () => {}, { class: "tray-button tray-app", title: w.trayTitle?.() || w.title, "aria-label": w.title });
      b.dataset.winId = w.id;
      b.addEventListener("dblclick", () => w.focus()); // notification-area icons open on double-click, like the original
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        popup(w.trayMenu?.() || [{ label: "Open", action: () => w.focus() }, { label: "Close", action: () => w.close() }], e.clientX, e.clientY);
        // the menu grows upwards from the pointer (the tray sits at the bottom edge)
        const m = [...document.querySelectorAll(".popup-menu")].pop();
        if (m) { m.style.top = "auto"; m.style.bottom = Math.max(0, innerHeight - e.clientY) + "px"; m.style.left = Math.max(0, Math.min(e.clientX, innerWidth - m.offsetWidth - 2)) + "px"; }
      });
      tray.insertBefore(b, tray.firstChild);
    }
  }
  updateClock() {
    const s = this.ctx.settings,
      date = new Date(Date.now() + (s.get("clockOffset") || 0)),
      clock = document.querySelector("#taskbar-clock");
    if (!clock) return;
    const tr = getLang() === "tr";
    clock.textContent = date.toLocaleTimeString(s.get("locale") || (tr ? "tr-TR" : "en-US"), {
      hour: "numeric",
      minute: "2-digit",
      second: s.get("showSeconds") ? "2-digit" : undefined,
      hour12: !tr && s.get("timeFormat") !== "24",
    });
    clock.title = date.toLocaleDateString(tr ? "tr-TR" : undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  /** Windows 2000 Start-menu item context menu (shell32 verbs + WinRAR shell extension, as on a real install). */
  startItemMenu(entry) {
    const wrap = (list) => list.map((c) => (c.separator ? c : { ...c, ...(c.action ? { action: () => { this.closeStart(); return c.action(); } } : {}), ...(c.submenu ? { submenu: wrap(c.submenu) } : {}) }));
    return wrap(this.startItemMenuRaw(entry));
  }
  startItemMenuRaw(entry) {
    const ctx = this.ctx, sep = separator, name = entry.label, folder = !!entry.submenu;
    const rar = (label) => ({ label, icon: "rarfile", action: () => ctx.launch("winrar") });
    const toDesktop = (dir) => async () => {
      const cmd = entry.appId || "explorer";
      await ctx.fs.writeFile(joinPath(dir, ctx.fs.uniqueName(dir, `Shortcut to ${name}.lnk`)), JSON.stringify({ command: cmd }), { mime: "application/x-win2k-shortcut" });
      this.renderDesktop();
    };
    const sendTo = { label: "Send To", submenu: [
      { label: "Desktop (create shortcut)", icon: "desktop", action: toDesktop(DESKTOP) },
      { label: "Mail Recipient", icon: "outlook", action: () => ctx.launch("outlook") },
      { label: "My Documents", icon: "documents", action: toDesktop(DOCS) },
      { label: "3½ Floppy (A)", icon: "floppy", action: () => ctx.dialogs.message("A:\\ is not accessible.\n\nThe device is not ready.", { title: "Copy Error", icon: "error" }) },
    ] };
    const key = entry.appId || name;
    const del = async () => {
      if (!(await confirmDelete(ctx, { names: [name], folders: [folder] }))) return;
      ctx.settings.set("startHidden", [...new Set([...(ctx.settings.get("startHidden") || []), key])]);
    };
    const rename = async () => {
      const v = await ctx.dialogs.prompt("Type a new name for the item:", name, { title: "Rename" });
      if (v && v.trim()) ctx.settings.set("startNames", { ...(ctx.settings.get("startNames") || {}), [key]: v.trim() });
    };
    const props = () => ctx.dialogs.message(`${name}\n\nType: ${folder ? "File Folder" : "Shortcut"}${entry.appId ? "\nTarget: " + entry.appId + ".exe" : ""}\nLocation: Start Menu\\Programs`, { title: name + " Properties", icon: entry.icon });
    const open = { label: "Open", bold: true, action: () => (entry.appId ? ctx.launch(entry.appId) : ctx.launch("explorer", { path: "computer" })) };
    if (folder)
      return [open, { label: "Explore", action: () => ctx.launch("explorer", { path: "computer" }) }, { label: "Find...", action: () => ctx.launch("explorer", { path: "search" }) }, sep(), rar("Add to archive..."), rar(`Add to "${name}.rar"`), rar("Compress and email..."), rar(`Compress to "${name}.rar" and email`), sep(), sendTo, sep(), { label: "Cut" }, { label: "Copy" }, sep(), { label: "Create Shortcut", action: toDesktop(DESKTOP) }, { label: "Delete", action: del }, { label: "Rename", action: rename }, sep(), { label: "Sort by Name", sort: true }, sep(), { label: "Properties", action: props }];
    return [open, rar("Add to archive..."), rar(`Add to "${name}.rar"`), rar("Compress and email..."), rar(`Compress to "${name}.rar" and email`), sep(), sendTo, sep(), { label: "Cut" }, { label: "Copy" }, sep(), { label: "Create Shortcut", action: toDesktop(DESKTOP) }, { label: "Delete", action: del }, { label: "Rename", action: rename }, sep(), { label: "Sort by Name", sort: true }, sep(), { label: "Properties", action: props }];
  }
  /** Adds the right-click menu to every item of a Start submenu tree. */
  decorateStart(items) {
    const hidden = this.ctx.settings.get("startHidden") || [], names = this.ctx.settings.get("startNames") || {};
    return items.filter((i) => i.separator || !hidden.includes(i.appId || i.label)).map((i) => {
      if (i.separator || i.disabled) return i;
      const out = { ...i, label: names[i.appId || i.label] || i.label };
      if (Array.isArray(i.submenu)) out.submenu = this.decorateStart(i.submenu);
      out.context = () => this.startItemMenu(out);
      return out;
    });
  }
  appItems(ids) {
    return ids
      .map((id) => {
        const app = this.ctx.apps.find((a) => a.id === id);
        return app
          ? {
              label: app.name,
              icon: app.icon,
              appId: id,
              action: () => this.ctx.launch(id),
            }
          : null;
      })
      .filter(Boolean);
  }
  toggleStart() {
    if (this.start) {
      this.closeStart();
      return;
    }
    closeMenus();
    const ctx = this.ctx,
      startButton = document.querySelector("#start-button");
    startButton.classList.add("pressed");
    startButton.setAttribute("aria-expanded", "true");
    const games = this.appItems([
        "freecell",
        "minesweeper",
        "solitaire",
      ]),
      accessories = [
        {
          label: "Accessibility",
          icon: "programGroup",
          submenu: this.appItems(["magnifier", "keyboard"]),
        },
        {
          label: "Communications",
          icon: "programGroup",
          submenu: this.appItems([
            "hyperterminal",
            "dialer",
            "ie",
            "outlook",
            "address",
          ]),
        },
        {
          label: "Entertainment",
          icon: "programGroup",
          submenu: this.appItems([
            "cdplayer",
            "recorder",
            "volume",
            "mediaplayer",
          ]),
        },
        { label: "Games", icon: "programGroup", submenu: games },
        {
          label: "System Tools",
          icon: "programGroup",
          submenu: this.appItems([
            "clipboard",
            "charmap",
            "cleanmgr",
            "defrag",
            "systeminfo",
            "tasks",
            "diskmanager",
          ]),
        },
        ...this.appItems([
          "address",
          "calculator",
          "cmd",
          "imaging",
          "notepad",
          "paint",
          "synchronize",
          "explorer",
          "wordpad",
        ]),
      ];
    const programs = [
        { label: "Accessories", icon: "programGroup", submenu: accessories },
        {
          label: "Startup",
          icon: "programGroup",
          submenu: [{ label: "(Empty)", disabled: true }],
        },
        ...this.appItems(["ie", "outlook", "word", "acrobat", "divx", "vlc", "winamp", "winrar", "wintools", "nvidia", "netscape", "msn", "icq"]),
      ],
      settings = [
        {
          label: "Control Panel",
          icon: "control",
          action: () => ctx.launch("explorer", { path: "control" }),
        },
        {
          label: "Network and Dial-up Connections",
          icon: "dialup",
          action: () => ctx.launch("explorer", { path: "connections" }),
        },
        {
          label: "Printers",
          icon: "printers",
          action: () => ctx.launch("control", { page: "printers" }),
        },
        {
          label: "Taskbar & Start Menu...",
          icon: "taskbar",
          action: () => this.taskbarProperties(),
        },
      ];
    const recent = (ctx.settings.get("recentFiles") || [])
      .filter((p) => ctx.fs.exists(p))
      .slice(0, 8);
    const rows = [
      {
        label: "Set Program Access and Defaults",
        icon: "setProgram",
        action: () => ctx.launch("explorer", { path: "control" }),
      },
      {
        label: "Windows Update",
        icon: "windowsUpdate",
        action: () => ctx.launch("help", { topic: "updates" }),
      },
      { separator: true },
      { label: "Programs", icon: "programs", submenu: this.decorateStart(programs) },
      {
        label: "Documents",
        icon: "documents",
        submenu: [
          {
            label: "My Documents",
            icon: "documents",
            action: () => ctx.launch("explorer", { path: "documents" }),
          },
          separator(),
          ...(recent.length
            ? recent.map((path) => ({
                label: basename(path),
                icon: fileIcon(ctx.fs.stat(path)),
                action: () => ctx.openFile(path),
              }))
            : [{ label: "(Empty)", disabled: true }]),
        ],
      },
      { label: "Settings", icon: "settings", submenu: settings },
      {
        label: "Search",
        icon: "search",
        submenu: [
          {
            label: "For Files or Folders...",
            icon: "search",
            action: () => ctx.launch("explorer", { path: "search" }),
          },
          {
            label: "On the Internet...",
            icon: "ie",
            action: () => ctx.launch("ie"),
          },
        ],
      },
      { label: "Help", icon: "help", action: () => ctx.launch("help") },
      { label: "Run...", icon: "run", action: () => ctx.launch("run") },
      { separator: true },
      {
        label: "Shut Down...",
        icon: "shutdown",
        action: () => this.shutdown(),
      },
    ];
    let child = null;
    const items = el("div", { class: "start-items" });
    this.start = el(
      "div",
      { class: "start-menu", role: "menu" },
      el("div", { class: "start-brand", "aria-hidden": "true" }),
      items,
    );
    for (const item of rows) {
      if (item.separator) {
        items.append(el("div", { class: "menu-separator" }));
        continue;
      }
      const b = button(
        [
          icon(item.icon, 32),
          el("span", { text: item.label }),
          item.submenu
            ? el("span", { class: "start-arrow" })
            : null,
        ],
        () => {
          if (item.submenu) openChild();
          else {
            this.closeStart();
            return item.action?.();
          }
        },
        {
          class: "start-item",
          role: "menuitem",
          "aria-haspopup": item.submenu ? "menu" : null,
        },
      );
      const openChild = () => {
        closeMenus();
        items
          .querySelectorAll(".selected")
          .forEach((n) => n.classList.remove("selected"));
        b.classList.add("selected");
        if (item.submenu) {
          const r = b.getBoundingClientRect();
          child = popup(item.submenu, r.right - 4, r.top - 3);
        }
      };
      b.addEventListener("pointerenter", openChild);
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const PROFILE = DESKTOP.replace(/\/Desktop$/, "");
        const targets = { Programs: PROFILE, Documents: DOCS, Settings: "control" };
        const target = targets[item.label.replace(/…|\.\.\./g, "")];
        if (!target) return; // Help, Run, Shut Down: no shell menu in Windows 2000
        const open = (verb) => () => { this.closeStart(); if (verb === "Search") this.ctx.launch("explorer", { path: "search" }); else if (target === "control") this.ctx.launch("control"); else this.ctx.launch("explorer", { path: target }); };
        child?.remove(); child = null;
        popup([
          { label: "Open", bold: true, action: open("Open") },
          { label: "Explore", action: open("Explore") },
          { label: "Find...", action: open("Search") },
        ], e.clientX, e.clientY);
      });
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" && item.submenu) {
          e.preventDefault();
          openChild();
          child?.querySelector("button:not(:disabled)")?.focus();
        }
      });
      items.append(b);
    }
    document.querySelector("#menu-layer").append(this.start);
    this.start.addEventListener("keydown", (e) => {
      const buttons = [...items.querySelectorAll("button")],
        i = buttons.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        buttons[
          (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length
        ]?.focus();
      }
      if (e.key === "Escape") this.closeStart();
    });
  }
  closeStart() {
    this.start?.remove();
    this.start = null;
    const b = document.querySelector("#start-button");
    b?.classList.remove("pressed");
    b?.setAttribute("aria-expanded", "false");
    closeMenus();
  }
  taskbarProperties() {
    this.closeStart();
    openTaskbarProperties(this.ctx);
  }
  async keydown(e) {
    this.lastActivity = Date.now();
    const ctx = this.ctx;
    if (e.ctrlKey && e.shiftKey && e.key === "Escape") {
      e.preventDefault();
      await ctx.launch("taskmgr");
      return;
    }
    if (e.key === "Escape" && !e.ctrlKey) {
      this.closeStart();
      return;
    }
    if ((e.ctrlKey && e.key === "Escape") || (e.key === "Meta" && !e.repeat)) {
      e.preventDefault();
      this.toggleStart();
      return;
    }
    if (e.ctrlKey && e.shiftKey && e.key === "Escape") {
      e.preventDefault();
      ctx.launch("taskmgr");
      return;
    }
    if (e.altKey && e.key === "F4") {
      e.preventDefault();
      await ctx.wm.active?.close();
      return;
    }
    if (e.altKey && e.key === "Tab") {
      e.preventDefault();
      const wins = ctx.wm.windows.filter((w) => !w.dialog),
        index = wins.indexOf(ctx.wm.active);
      wins[(index + 1) % wins.length]?.focus();
      return;
    }
    if (e.metaKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      ctx.wm.showDesktop();
      return;
    }
    if (
      e.target.closest(
        ".window, .start-menu, .popup-menu, #taskbar, #overlay-layer, #menu-layer",
      )
    )
      return;
    if (e.target.matches("input,textarea") || e.target.isContentEditable)
      return;
    if (e.key === "Enter") {
      for (const a of this.activeIcons.filter((a) => this.selected.has(a.id)))
        await a.action();
    }
    if (e.key === "Delete") {
      e.preventDefault();
      await this.deleteSelected();
    }
    if (e.key === "F2") {
      e.preventDefault();
      await this.renameSelected();
    }
    if (e.key === "F5") {
      e.preventDefault();
      this.renderDesktop();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      this.selected = new Set(this.activeIcons.map((a) => a.id));
      this.updateSelection();
    }
    if (e.ctrlKey && e.key.toLowerCase() === "v") {
      e.preventDefault();
      await ctx.clipboard.pasteFiles(ctx.fs, DESKTOP);
    }
    if (e.ctrlKey && ["c", "x"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      ctx.clipboard.setFiles(
        this.activeIcons
          .filter((a) => this.selected.has(a.id) && a.path)
          .map((a) => a.path),
        e.key.toLowerCase() === "x" ? "cut" : "copy",
      );
    }
  }
  shutdown() {
    const ctx = this.ctx,
      k = kit(0, 0),
      w = refWindow(ctx, { title: "Shut Down Windows", width: 418, height: 270, appId: "shutdown", noIcon: true, x: 302, y: 165 }),
      choices = [
        ["Shut down", "shutdown", "Ends your session and shuts down Windows so that\nyou can safely turn off power."],
        ["Restart", "restart", "Ends your session, shuts down Windows, and starts\nWindows again."],
        ["Log off Administrator", "logoff", "Ends your session and lets you log on as a different\nuser."],
      ];
    let cur = 0;
    // Real Windows 2000 dims the whole desktop with a black checkerboard while this dialog is up.
    const dim = el("div", { class: "shutdown-dim" });
    dim.style.zIndex = Number(w.el.style.zIndex || 1) - 1;
    w.el.parentElement.append(dim);
    const close = w.close.bind(w);
    w.close = (...a) => (dim.remove(), close(...a));
    const desc = k.text(70, 166, choices[0][2]);
    const sel = el("span", { class: "dt-sel wide", text: choices[0][0], style: { position: "relative", top: "1px" } });
    const combo = k.combo(70, 134, 260, 20, "");
    combo.firstChild.nodeValue = "";
    combo.prepend(sel);
    combo.addEventListener("click", () => {
      const r = combo.getBoundingClientRect();
      popup(
        choices.map(([label], i) => ({
          label,
          action: () => {
            cur = i;
            sel.textContent = label;
            desc.textContent = choices[i][2];
          },
        })),
        r.left,
        r.bottom,
      );
    });
    const go = async () => {
      const action = choices[cur][1];
      await w.close();
      for (const win of [...ctx.wm.windows]) if (!(await win.close())) return;
      await ctx.fs.queue;
      if (action === "restart") {
        location.reload();
        return;
      }
      this.lock(action === "shutdown");
    };
    w.place(
      k.img(4, 23, "/assets/ui/shutdown/banner.png", 408, 77),
      k.img(26, 111, "/assets/ui/shutdown/computer.png", 32, 32),
      k.text(70, 112, "What do you want the computer to do?"),
      combo,
      desc,
      k.btn(168, 233, 75, 22, "OK", { def: true, onclick: go }),
      k.btn(249, 233, 75, 22, "Cancel", { onclick: () => w.close() }),
      k.btn(330, 233, 75, 22, "Help", { onclick: () => ctx.launch("help", { topic: "windows" }) }),
    );
    return w;
  }
  lock(shutdown = false) {
    this.closeStart();
    const overlay = el(
      "div",
      { class: "lock-screen" },
      el(
        "div",
        { class: "lock-dialog" },
        el(
          "div",
          { class: "lock-brand" },
          icon("windows", 32),
          el(
            "div",
            {},
            el("b", { text: "Microsoft Windows 2000" }),
            el("span", { text: "Professional" }),
          ),
        ),
        el(
          "div",
          { class: "lock-message" },
          el("h2", {
            text: shutdown
              ? "It is now safe to close your browser."
              : "This computer is locked.",
          }),
          el("p", {
            text: shutdown
              ? "Your virtual files have been saved."
              : this.ctx.settings.get("username") +
                " is signed in to this virtual desktop.",
          }),
          button(
            shutdown ? "Start Windows" : "Unlock Computer",
            () => {
              overlay.remove();
              if (shutdown) {
                this.ctx.sound.play("startup");
                this.ctx.launch("welcome");
              }
            },
            { class: "default-button" },
          ),
        ),
      ),
    );
    document.querySelector("#overlay-layer").append(overlay);
  }
  previewScreensaver(type) {
    if (!type || type === "none") return;
    this.lastActivity = Date.now();
    const overlay = el("div", { class: "screensaver" }),
      canvas = el("canvas", { width: innerWidth, height: innerHeight });
    overlay.append(canvas);
    document.querySelector("#overlay-layer").append(overlay);
    const stop = startSaver(type, canvas, (this.ctx.settings.get("saverOptions") || {})[type] || {});
    let armed = false;
    setTimeout(() => (armed = true), 400);
    const dismiss = () => {
      if (!armed) return;
      stop();
      overlay.remove();
      this.lastActivity = Date.now();
      for (const [t, f] of [["keydown", dismiss], ["pointermove", dismiss], ["pointerdown", dismiss]]) document.removeEventListener(t, f);
    };
    for (const t of ["keydown", "pointermove", "pointerdown"]) document.addEventListener(t, dismiss);
  }
}
export function openRun(ctx) {
  const w = ctx.wm.create({
      title: "Run",
      icon: "run",
      width: 360,
      height: 184,
      appId: "run",
      dialog: true,
      minimizable: false,
      maximizable: false,
      resizable: false,
      x: 10,
      y: Math.max(10, innerHeight - 235),
    }),
    input = el("input", {
      "aria-label": "Open",
      list: "run-history",
      value: "",
    }),
    history = el(
      "datalist",
      { id: "run-history" },
      ...(ctx.settings.get("runHistory") || []).map((s) =>
        el("option", { value: s }),
      ),
    );
  const run = async () => {
    const text = input.value.trim();
    if (!text) return;
    const launched = await ctx.run(text);
    if (launched?.owner === w) {
      w.modalChildren = w.modalChildren?.filter((child) => child !== launched);
      launched.owner = null;
      w.modalBlocker?.remove();
      w.modalBlocker = null;
      w.el.inert = false;
    }
    ctx.settings.set(
      "runHistory",
      [
        text,
        ...(ctx.settings.get("runHistory") || []).filter((x) => x !== text),
      ].slice(0, 15),
    );
    w.close();
  };
  w.setContent(
    el(
      "div",
      { class: "run-content" },
      icon("run", 32),
      el("p", {
        text: "Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.",
      }),
    ),
    el(
      "div",
      { class: "run-input" },
      el("label", { for: "run-command-" + w.id, text: "Open:" }),
      input,
      history,
    ),
    el(
      "div",
      { class: "dialog-buttons" },
      button("OK", run, { class: "default-button" }),
      button("Cancel", () => w.close()),
      button("Browse...", async () => {
        const p = await ctx.dialogs.file();
        if (p) input.value = p.replaceAll("/", "\\");
      }),
    ),
  );
  input.id = "run-command-" + w.id;
  input.addEventListener(
    "keydown",
    safely((e) => {
      if (e.key === "Enter") return run();
      if (e.key === "Escape") return w.close();
    }),
  );
  queueMicrotask(() => input.focus());
  return w;
}
