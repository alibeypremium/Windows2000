// Windows Tools — brings files and settings in and out of the virtual computer.
// Look and layout: Wizard97 (the same engine and ISO templates as the Network Connection Wizard).
// Everything imported from outside is kept in the Docs folder (UPLOADS).
import { el } from "../ui/index.js";
import { check, radio, btn, text } from "../control-panel/refkit.js";
import { UPLOADS, DESKTOP, DOCS, pickFiles, downloadFile, formatBytes, joinPath } from "../core/index.js";
import { wizard97 } from "./wizards.js";

const FORMAT = "Windows2000 Settings";
const TASKS = [
  ["21118", "import", "&Import files into Docs", "Copy Word, PDF, MP3, MP4 and other files in."],
  ["21119", "export", "&Export files from the computer", "Save files to your real computer."],
  ["21120", "impset", "I&mport settings", "Load desktop, wallpaper, TV and radio links."],
  ["21121", "expset", "E&xport settings", "Save your settings to a file you can keep."],
  ["21122", "help", "&How to use Windows Tools", "Read a short guide to this program."],
];
/** Settings groups. Each group lists the setting keys it covers; add a key here to include more data. */
export const CATEGORIES = [
  { id: "desktop", name: "Desktop layout (icon positions, names, taskbar, Start menu)", keys: ["desktopPositions", "iconNames", "autoArrange", "largeIcons", "startNames", "startHidden", "quickLaunch", "taskbarAlwaysOnTop", "taskbarAutoHide"] },
  { id: "look", name: "Wallpaper, colors and screen saver", keys: ["desktopColor", "wallpaper", "wallpaperName", "wallpaperStyle", "scheme", "fontSize", "highContrast", "animations", "screensaver", "screenSaverMinutes", "saverOptions"] },
  { id: "tv", name: "TV channel links (VLC, DivX)", keys: ["tvLinks", "vlc", "divx"] },
  { id: "radio", name: "Radio channel links (Media Player)", keys: ["radioLinks", "wmpFavorites"] },
  { id: "sound", name: "Sound and volume", keys: ["volume", "muted", "balance", "waveVolume", "soundScheme"] },
  { id: "internet", name: "Internet (home pages, favorites, connections)", keys: ["homePage", "nsHome", "favorites", "ieAdvanced", "connections"] },
  { id: "region", name: "Date, time and keyboard", keys: ["timeFormat", "showSeconds", "timezone", "clockOffset", "keyboardLayout"] },
];

export const HELP = [
  "Windows Tools moves things between your real computer and this Windows2000 desktop.",
  "",
  "IMPORT FILES",
  "Choose \"Import files into Docs\", click Add Files and pick Word, PDF, MP3, MP4, pictures, text or any other files. When you click Finish, every file is copied into the Docs folder on the desktop. Double-click a file there to open it with the matching program.",
  "",
  "EXPORT FILES",
  "Choose \"Export files from the computer\", tick the files you want (look in Docs, My Documents or the Desktop) and click Finish. Your browser saves each file to your real computer.",
  "",
  "EXPORT SETTINGS",
  "Choose \"Export settings\", tick what to save (desktop layout, wallpaper, TV links, radio links, sound, Internet, date and time) and click Finish. A settings file is saved to your computer, and a copy is kept in Docs.",
  "",
  "IMPORT SETTINGS",
  "Choose \"Import settings\", then either browse for a settings file you saved earlier or use the default settings, tick what to load and click Finish. The desktop refreshes so the changes show at once.",
  "",
  "TIPS",
  "Files are stored inside this browser only. Use Export now and then to keep a copy. Clearing the browser data removes them.",
].join("\n");

const settingsOf = (ctx, cat) => Object.fromEntries(cat.keys.filter((k) => ctx.settings.data[k] !== undefined).map((k) => [k, ctx.settings.data[k]]));

export function openWindowsTools(ctx, args = {}) {
  const S = { task: "import", files: [], paths: new Set(), cats: new Set(CATEGORIES.map((c) => c.id)), src: "file", where: UPLOADS, parsed: null, fileName: "" };
  const err = (msg) => ctx.dialogs.message(msg, { title: "Windows Tools", icon: "error" });

  // ---- small page builders (page area: x 13..488, y 90..325) ----
  const listBox = (stage, x, y, w, h) => {
    const box = el("div", { class: "wt-list", style: { position: "absolute", left: x + "px", top: y + "px", width: w + "px", height: h + "px", overflow: "auto", background: "#fff", boxShadow: "inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #d4d0c8, inset 2px 2px #404040" } });
    stage.append(box);
    return box;
  };
  const catChecks = (stage, y0, verb) => {
    stage.append(text(13, y0, `Select the groups to ${verb}:`));
    CATEGORIES.forEach((c, i) => stage.append(check(25, y0 + 20 + i * 19, c.name, { checked: S.cats.has(c.id), onchange: (on) => (on ? S.cats.add(c.id) : S.cats.delete(c.id)) })));
  };
  const needCats = () => (S.cats.size ? true : (err("Select at least one group."), false));

  const pages = [
    { group: "NCW", tpl: "21006", kind: "welcome", opts: () => ({ labels: { 21116: "Welcome to the Windows Tools Wizard", 21115: "This wizard brings files and settings into this computer, or takes them out: Word documents, PDFs, music, videos, the desktop layout, TV and radio links.\n\nImported files are kept in the Docs folder." } }) },
    {
      group: "NCW", tpl: "21005", kind: "page", title: "What do you want to do?", subtitle: "Choose a task. You can use this wizard again at any time.",
      opts: () => ({
        groups: [TASKS.map(([id]) => id)], checked: { [TASKS.find(([, t]) => t === S.task)[0]]: true },
        labels: Object.fromEntries(TASKS.flatMap(([id, , label, desc], i) => [[id, label], [String(21123 + i), desc]])),
      }),
      next: (ctl) => { S.task = TASKS.find(([id]) => ctl[id]?.classList.contains("checked"))?.[1] || "import"; },
    },

    // ---- 1. import files -> Docs ----
    {
      kind: "page", title: "Import Files", subtitle: "Add the files you want to copy into the Docs folder.", skip: () => S.task !== "import",
      init: (_c, _s, _p, stage) => {
        let sel = -1;
        const lb = listBox(stage, 13, 92, 370, 190);
        const draw = () => {
          lb.replaceChildren(...S.files.map((f, i) => el("div", { class: "wt-row" + (i === sel ? " sel" : ""), style: { padding: "1px 3px", font: "11px Tahoma, sans-serif", whiteSpace: "nowrap", cursor: "default", background: i === sel ? "#0a246a" : "", color: i === sel ? "#fff" : "#000" }, onclick: () => { sel = i; draw(); }, text: `${f.name}  (${formatBytes(f.size)})` })));
          if (!S.files.length) lb.append(el("div", { style: { padding: "6px", color: "#808080", font: "11px Tahoma, sans-serif" }, text: "No files added yet. Click Add Files." }));
        };
        stage.append(
          btn(392, 92, 90, 23, "Add Files...", { onclick: async () => { const got = await pickFiles({ multiple: true }); S.files.push(...got); draw(); } }),
          btn(392, 120, 90, 23, "Remove", { onclick: () => { if (sel >= 0) { S.files.splice(sel, 1); sel = -1; draw(); } } }),
          btn(392, 148, 90, 23, "Clear", { onclick: () => { S.files = []; sel = -1; draw(); } }),
          text(13, 290, "Destination: C:\\Documents and Settings\\Administrator\\Desktop\\Docs", { w: 470 }),
        );
        draw();
      },
      next: () => (S.files.length ? true : (err("Add at least one file to import."), false)),
    },

    // ---- 2. export files ----
    {
      kind: "page", title: "Export Files", subtitle: "Tick the files you want to save to your computer.", skip: () => S.task !== "export",
      init: (_c, _s, _p, stage) => {
        const where = el("select", { class: "wt-where", style: { position: "absolute", left: "70px", top: "90px", width: "250px", font: "11px Tahoma, sans-serif" } },
          el("option", { value: UPLOADS, text: "Docs" }), el("option", { value: DOCS, text: "My Documents" }), el("option", { value: DESKTOP, text: "Desktop" }));
        where.value = S.where;
        stage.append(text(13, 93, "Look in:"), where);
        const lb = listBox(stage, 13, 116, 470, 166);
        const draw = () => {
          S.where = where.value;
          const files = (ctx.fs.get(S.where) ? ctx.fs.list(S.where) : []).filter((n) => n.type === "file");
          lb.replaceChildren(el("div", { style: { position: "relative", height: Math.max(files.length, 1) * 17 + 4 + "px" } },
            ...(files.length ? files.map((n, i) => check(2, 2 + i * 17, `${n.name}  (${formatBytes(n.size)})`, { checked: S.paths.has(n.path), onchange: (on) => (on ? S.paths.add(n.path) : S.paths.delete(n.path)) })) : [text(6, 4, "This folder has no files.", { disabled: true })])));
          S.listed = files;
        };
        where.onchange = draw;
        stage.append(
          btn(13, 288, 90, 23, "Select All", { onclick: () => { (S.listed || []).forEach((n) => S.paths.add(n.path)); draw(); } }),
          btn(108, 288, 90, 23, "Clear All", { onclick: () => { (S.listed || []).forEach((n) => S.paths.delete(n.path)); draw(); } }),
        );
        draw();
      },
      next: () => (S.paths.size ? true : (err("Tick at least one file to export."), false)),
    },

    // ---- 3. import settings ----
    {
      kind: "page", title: "Import Settings", subtitle: "Load settings from a file, or return to the default settings.", skip: () => S.task !== "impset",
      init: (_c, _s, _p, stage) => {
        const name = text(130, 120, S.fileName || "(no file chosen)", { w: 350 });
        const flip = (a, b, src) => (on) => { if (!on) return; S.src = src; b.classList.remove("checked"); b.setAttribute("aria-checked", false); };
        let rDef;
        const rFile = radio(13, 93, "Settings file:", { checked: S.src === "file", onchange: (on) => flip(rFile, rDef, "file")(on) });
        rDef = radio(13, 143, "Default settings (reset the ticked groups)", { checked: S.src === "default", onchange: (on) => flip(rDef, rFile, "default")(on) });
        stage.append(rFile, rDef, name,
          btn(30, 114, 90, 23, "Browse...", { onclick: async () => {
            const [f] = await pickFiles({ accept: ".json,.w2kset" });
            if (!f) return;
            try {
              const j = JSON.parse(await f.text());
              if (j.format !== FORMAT || typeof j.categories !== "object") throw 0;
              S.parsed = j; S.fileName = f.name; S.file = f; name.textContent = f.name;
              for (const c of CATEGORIES) { if (!j.categories[c.id]) S.cats.delete(c.id); }
              if (!rFile.classList.contains("checked")) rFile.click();
            } catch { err("This is not a Windows2000 settings file."); }
          } }));
        catChecks(stage, 172, "load");
      },
      next: () => {
        if (S.src === "file" && !S.parsed) return err("Click Browse and choose a settings file, or pick the default settings."), false;
        return needCats();
      },
    },

    // ---- 4. export settings ----
    {
      kind: "page", title: "Export Settings", subtitle: "Choose which settings go into the file.", skip: () => S.task !== "expset",
      init: (_c, _s, _p, stage) => catChecks(stage, 93, "save"),
      next: needCats,
    },

    // ---- 5. help ----
    {
      kind: "page", title: "How to use Windows Tools", subtitle: "Importing and exporting files and settings.", skip: () => S.task !== "help",
      init: (_c, _s, _p, stage) => {
        const lb = listBox(stage, 13, 92, 470, 220);
        lb.append(el("div", { class: "wt-help", style: { padding: "6px 8px", font: "11px Tahoma, sans-serif", whiteSpace: "pre-wrap", userSelect: "text" }, text: HELP }));
      },
    },

    {
      group: "NCW", tpl: "21006", kind: "finish",
      opts: () => ({ labels: { 21116: "Completing the Windows Tools Wizard", 21115: summary(), 65535: "To close this wizard, click Finish." } }),
    },
  ];

  const summary = () => {
    const cats = CATEGORIES.filter((c) => S.cats.has(c.id)).length;
    switch (S.task) {
      case "import": return `${S.files.length} file${S.files.length === 1 ? "" : "s"} will be copied into the Docs folder.`;
      case "export": return `${S.paths.size} file${S.paths.size === 1 ? "" : "s"} will be saved to your computer.`;
      case "impset": return S.src === "default" ? `${cats} setting group${cats === 1 ? "" : "s"} will be reset to the defaults.` : `${cats} setting group${cats === 1 ? "" : "s"} will be loaded from ${S.fileName}.`;
      case "expset": return `${cats} setting group${cats === 1 ? "" : "s"} will be saved to a file.`;
      default: return "You have read the guide.";
    }
  };

  const onFinish = async () => {
    if (S.task === "import") {
      let n = 0;
      for (const f of S.files) { try { await ctx.fs.importFile(f, UPLOADS); n++; } catch (e) { err(`${f.name}\n\n${e.message}`); } }
      ctx.bus?.emit?.("fs:change", {});
      if (n) { await ctx.launch("explorer", { path: UPLOADS }); ctx.dialogs.message(`${n} file${n === 1 ? " was" : "s were"} copied into the Docs folder.`, { title: "Windows Tools", icon: "info" }); }
    } else if (S.task === "export") {
      for (const p of S.paths) { const n = ctx.fs.stat(p); if (n?.type === "file") downloadFile(n.name, n.content, n.mime, n.encoding); }
    } else if (S.task === "expset") {
      const out = { format: FORMAT, version: 1, created: new Date().toISOString(), categories: {} };
      for (const c of CATEGORIES) if (S.cats.has(c.id)) out.categories[c.id] = settingsOf(ctx, c);
      const json = JSON.stringify(out, null, 2), name = "Windows2000-Settings.json";
      downloadFile(name, json, "application/json");
      try { if (!ctx.fs.get(UPLOADS)) await ctx.fs.mkdir(UPLOADS); await ctx.fs.writeFile(joinPath(UPLOADS, ctx.fs.uniqueName(UPLOADS, name)), json, { mime: "application/json" }); ctx.bus?.emit?.("fs:change", {}); } catch {}
    } else if (S.task === "impset") {
      const patch = {};
      for (const c of CATEGORIES) {
        if (!S.cats.has(c.id)) continue;
        const vals = S.src === "default" ? {} : S.parsed.categories[c.id] || {};
        for (const k of c.keys) patch[k] = k in vals ? vals[k] : ctx.settings.defaults[k];
      }
      ctx.settings.patch(patch);
      if (S.src === "file" && S.file) { try { await ctx.fs.importFile(S.file, UPLOADS); } catch {} }
      await ctx.dialogs.message("The settings were imported. The desktop will refresh now.", { title: "Windows Tools", icon: "info" });
      location.reload();
    }
  };

  return wizard97(ctx, { title: "Windows Tools", appId: "wintools", pages, state: S, onFinish });
}
