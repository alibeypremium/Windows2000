import {
  EventBus,
  VirtualFileSystem,
  Settings,
  Clipboard,
  SoundService,
  Registry,
  DOCS,
  DESKTOP,
  extension,
  normalizePath,
  basename,
} from "/packages/core/index.js";
import {
  WindowManager,
  DialogService,
  setErrorHandler,
  el,
  button,
  icon,
} from "/packages/ui/index.js";
import { DesktopRenderer } from "/packages/rendering/index.js";
import { confirmReplace } from "/packages/ui/shconfirm.js";
import {
  DesktopShell,
  openRun,
  openHelp,
  openWelcome,
  openAbout,
} from "/packages/shell/index.js";
import { openExplorer } from "/packages/explorer/index.js";
import { controlItems, applyTheme } from "/packages/control-panel/items.js";

const lazy = (load, name) => (...args) => load().then((m) => m[name](...args));
const openLocalSecurityPolicy = lazy(() => import("/packages/system/consoles.js"), "openLocalSecurityPolicy");
const openComponentServices = lazy(() => import("/packages/system/consoles.js"), "openComponentServices");
const openOdbc = lazy(() => import("/packages/system/consoles.js"), "openOdbc");
const openTelnetAdmin = lazy(() => import("/packages/system/consoles.js"), "openTelnetAdmin");
const openAddNetworkPlace = lazy(() => import("/packages/system/consoles.js"), "openAddNetworkPlace");
const openServices = lazy(() => import("/packages/system/services.js"), "openServices");
const openFontViewer = lazy(() => import("/packages/explorer/fontview.js"), "openFontViewer");
const openNotepad = lazy(() => import("/packages/accessories/index.js"), "openNotepad");
const openWordPad = lazy(() => import("/packages/accessories/index.js"), "openWordPad");
const openCalculator = lazy(() => import("/packages/accessories/index.js"), "openCalculator");
const openPaint = lazy(() => import("/packages/accessories/index.js"), "openPaint");
const openMediaPlayer = lazy(() => import("/packages/accessories/index.js"), "openMediaPlayer");
const openCdPlayer = lazy(() => import("/packages/accessories/index.js"), "openCdPlayer");
const openVolume = lazy(() => import("/packages/accessories/index.js"), "openVolume");
const openSoundRecorder = lazy(() => import("/packages/accessories/index.js"), "openSoundRecorder");
const openImaging = lazy(() => import("/packages/accessories/index.js"), "openImaging");
const openMinesweeper = lazy(() => import("/packages/games/index.js"), "openMinesweeper");
const openSolitaire = lazy(() => import("/packages/games/index.js"), "openSolitaire");
const openFreeCell = lazy(() => import("/packages/games/index.js"), "openFreeCell");
const openWinamp = lazy(() => import("/packages/accessories/winamp.js"), "openWinamp");
const openNetworkConnectionWizard = lazy(() => import("/packages/system/wizards.js"), "openNetworkConnectionWizard");
const openInternetConnectionWizard = lazy(() => import("/packages/system/wizards.js"), "openInternetConnectionWizard");
const openDiskCleanup = lazy(() => import("/packages/system/cleanmgr.js"), "openDiskCleanup");
const openWindowsTools = lazy(() => import("/packages/system/wintools.js"), "openWindowsTools");
const openWinRAR = lazy(() => import("/packages/accessories/winrar.js"), "openWinRAR");
const openICQ = lazy(() => import("/packages/internet/icq.js"), "openICQ");
const openNetscape = lazy(() => import("/packages/internet/netscape.js"), "openNetscape");
const openMessenger = lazy(() => import("/packages/internet/msn.js"), "openMessenger");
const openWord = lazy(() => import("/packages/accessories/word.js"), "openWord");
const openAcrobat = lazy(() => import("/packages/accessories/acrobat.js"), "openAcrobat");
const openVLC = lazy(() => import("/packages/accessories/vlc.js"), "openVLC");
const openDivX = lazy(() => import("/packages/accessories/divx.js"), "openDivX");
const openControlPanel = lazy(() => import("/packages/control-panel/index.js"), "openControlPanel");
const openInternetExplorer = lazy(() => import("/packages/internet/index.js"), "openInternetExplorer");
const openMail = lazy(() => import("/packages/internet/index.js"), "openMail");
const openAddressBook = lazy(() => import("/packages/internet/index.js"), "openAddressBook");
const openHyperTerminal = lazy(() => import("/packages/internet/index.js"), "openHyperTerminal");
const openPhoneDialer = lazy(() => import("/packages/internet/index.js"), "openPhoneDialer");
const openSynchronize = lazy(() => import("/packages/internet/index.js"), "openSynchronize");
const openTerminal = lazy(() => import("/packages/system/index.js"), "openTerminal");
const openTaskManager = lazy(() => import("/packages/system/index.js"), "openTaskManager");
const openRegistry = lazy(() => import("/packages/system/index.js"), "openRegistry");
const openSystemInfo = lazy(() => import("/packages/system/index.js"), "openSystemInfo");
const openEventViewer = lazy(() => import("/packages/system/index.js"), "openEventViewer");
const openTasks = lazy(() => import("/packages/system/index.js"), "openTasks");
const openCharacterMap = lazy(() => import("/packages/system/index.js"), "openCharacterMap");
const openClipboardViewer = lazy(() => import("/packages/system/index.js"), "openClipboardViewer");
const openKeyboard = lazy(() => import("/packages/system/index.js"), "openKeyboard");
const openMagnifier = lazy(() => import("/packages/system/index.js"), "openMagnifier");
const openDiskManager = lazy(() => import("/packages/system/index.js"), "openDiskManager");
const openDefrag = lazy(() => import("/packages/system/index.js"), "openDefrag");
const idleLoad = ["/packages/system/consoles.js", "/packages/system/services.js", "/packages/explorer/fontview.js", "/packages/accessories/index.js", "/packages/games/index.js", "/packages/accessories/winamp.js", "/packages/system/wizards.js", "/packages/system/wintools.js", "/packages/system/cleanmgr.js", "/packages/accessories/winrar.js", "/packages/internet/netscape.js", "/packages/internet/msn.js", "/packages/internet/icq.js", "/packages/accessories/word.js", "/packages/accessories/acrobat.js", "/packages/accessories/vlc.js", "/packages/accessories/divx.js", "/packages/control-panel/index.js", "/packages/internet/index.js", "/packages/system/index.js"];

const bus = new EventBus(),
  settings = new Settings(bus),
  fs = new VirtualFileSystem(bus),
  wm = new WindowManager(bus);
import { initI18n, setLang, getLang } from "/packages/ui/i18n.js";
initI18n(settings);
const ctx = {
  bus,
  settings,
  fs,
  wm,
  clipboard: new Clipboard(bus),
  sound: new SoundService(settings),
  events: [],
  controlItems,
};
ctx.dialogs = new DialogService(wm, fs);
ctx.dialogs.sound = ctx.sound;
ctx.registry = new Registry(fs);
ctx.renderer = new DesktopRenderer(
  document.querySelector("#desktop-surface"),
  settings,
  bus,
);
setErrorHandler((error) => {
  ctx.log?.("Error", "Application", error?.message || String(error));
  ctx.dialogs.error(error);
});
ctx.log = (level, source, message) => {
  ctx.events.push({ time: Date.now(), level, source, message });
  if (ctx.events.length > 500) ctx.events.shift();
  bus.emit("event:added");
};
ctx.apps = [
  {
    id: "explorer",
    name: "Windows Explorer",
    icon: "explorerApp",
    aliases: ["explorer.exe"],
    open: openExplorer,
  },
  {
    id: "notepad",
    name: "Notepad",
    icon: "notepad",
    aliases: ["notepad.exe"],
    open: openNotepad,
  },
  {
    id: "wordpad",
    name: "WordPad",
    icon: "wordpad",
    aliases: ["write", "write.exe", "wordpad.exe"],
    open: openWordPad,
  },
  {
    id: "paint",
    name: "Paint",
    icon: "paint",
    aliases: ["mspaint", "pbrush", "mspaint.exe"],
    open: openPaint,
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: "calculator",
    aliases: ["calc", "calc.exe"],
    open: openCalculator,
  },
  {
    id: "cmd",
    name: "Command Prompt",
    icon: "cmd",
    aliases: ["cmd.exe", "command", "command.com"],
    open: openTerminal,
  },
  {
    id: "ie",
    name: "Internet Explorer",
    icon: "ieSmall",
    aliases: ["iexplore", "iexplore.exe"],
    open: openInternetExplorer,
  },
  {
    id: "outlook",
    name: "Outlook Express",
    icon: "mail",
    aliases: ["msimn", "msimn.exe"],
    open: openMail,
  },
  {
    id: "hyperterminal",
    name: "HyperTerminal",
    icon: "cmd",
    aliases: ["hypertrm", "hypertrm.exe"],
    open: openHyperTerminal,
  },
  {
    id: "dialer",
    name: "Phone Dialer",
    icon: "dialerApp",
    aliases: ["dialer.exe"],
    open: openPhoneDialer,
  },
  {
    id: "synchronize",
    name: "Synchronize",
    icon: "syncApp",
    aliases: ["mobsync", "mobsync.exe"],
    open: openSynchronize,
  },
  {
    id: "address",
    name: "Address Book",
    icon: "address",
    aliases: ["wab", "wab.exe"],
    open: openAddressBook,
  },
  {
    id: "mediaplayer",
    name: "Windows Media Player",
    icon: "media",
    aliases: ["mplayer2", "mplayer2.exe", "wmplayer"],
    open: openMediaPlayer,
  },
  {
    id: "cdplayer",
    name: "CD Player",
    icon: "cdPlayerApp",
    aliases: ["cdplayer.exe"],
    open: (ctx, args) => openCdPlayer(ctx),
  },
  {
    id: "winamp",
    name: "Winamp",
    icon: "winamp",
    aliases: ["winamp.exe"],
    open: (ctx, args) => openWinamp(ctx, args || {}),
  },
  {
    id: "acrobat",
    name: "Adobe Acrobat Reader 5.0",
    icon: "acrobat",
    aliases: ["acrord32", "acrord32.exe", "acroread", "acrobat", "reader"],
    open: (ctx, args) => openAcrobat(ctx, args || {}),
  },
  {
    id: "vlc",
    name: "VLC media player",
    icon: "vlc",
    aliases: ["vlc.exe", "vlc"],
    open: (ctx, args) => openVLC(ctx, args || {}),
  },
  {
    id: "divx",
    name: "DivX Player",
    icon: "divx",
    aliases: ["divx.exe", "divxplayer", "divxplayer.exe"],
    open: (ctx, args) => openDivX(ctx, args || {}),
  },
  {
    id: "word",
    name: "Microsoft Word",
    icon: "word",
    aliases: ["winword", "winword.exe", "word", "word.exe"],
    open: (ctx, args) => openWord(ctx, args || {}),
  },
  {
    id: "icq",
    name: "ICQ",
    icon: "icq",
    aliases: ["icq.exe", "icq", "icq99b", "icq99b.exe"],
    open: (ctx, args) => openICQ(ctx, args || {}),
  },
  {
    id: "msn",
    name: "MSN Messenger",
    icon: "msn",
    aliases: ["msnmsgr.exe", "msnmsgr", "msn", "messenger"],
    open: (ctx, args) => openMessenger(ctx, args || {}),
  },
  {
    id: "netscape",
    name: "Netscape Navigator",
    icon: "netscape",
    aliases: ["netscape.exe", "netscape", "navigator", "communicator"],
    open: (ctx, args) => openNetscape(ctx, args || {}),
  },
  {
    id: "wintools",
    name: "Windows Tools",
    icon: "wintools",
    aliases: ["wintools.exe", "wintools", "windows tools"],
    open: (ctx, args) => openWindowsTools(ctx, args || {}),
  },
  {
    id: "nvidia",
    name: "Nvidia",
    icon: "nvidia",
    aliases: ["nvidia", "nvcpl.cpl"],
    open: (ctx) => ctx.launch("control", { page: "display", tab: 5 }),
  },
  {
    id: "winrar",
    name: "WinRAR",
    icon: "winrar",
    aliases: ["winrar.exe", "rar", "rar.exe"],
    open: (ctx, args) => openWinRAR(ctx, args || {}),
  },
  {
    id: "recorder",
    name: "Sound Recorder",
    icon: "recorderApp",
    aliases: ["sndrec32", "sndrec32.exe"],
    open: openSoundRecorder,
  },
  {
    id: "volume",
    name: "Volume Control",
    icon: "volumeApp",
    aliases: ["sndvol32", "sndvol32.exe"],
    singleton: true,
    open: openVolume,
  },
  {
    id: "imaging",
    name: "Imaging",
    icon: "imagingApp",
    aliases: ["kodakimg", "kodakimg.exe"],
    open: openImaging,
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    icon: "minesweeper",
    aliases: ["winmine", "winmine.exe"],
    open: openMinesweeper,
  },
  {
    id: "solitaire",
    name: "Solitaire",
    icon: "solitaire",
    aliases: ["sol", "sol.exe"],
    open: openSolitaire,
  },
  {
    id: "freecell",
    name: "Freecell",
    icon: "freecell",
    aliases: ["freecell.exe"],
    open: openFreeCell,
  },
  {
    id: "taskmgr",
    name: "Task Manager",
    icon: "taskmgr",
    aliases: ["taskmgr.exe"],
    singleton: true,
    open: openTaskManager,
  },
  {
    id: "regedit",
    name: "Registry Editor",
    icon: "registry",
    aliases: ["regedt32", "regedit.exe"],
    singleton: true,
    open: openRegistry,
  },
  {
    id: "systeminfo",
    name: "System Information",
    icon: "sysInfo",
    aliases: ["msinfo32", "msinfo32.exe"],
    singleton: true,
    open: openSystemInfo,
  },
  {
    id: "devices",
    name: "Device Manager",
    icon: "deviceMgr",
    aliases: ["devmgmt.msc"],
    open: (ctx, args) => openSystemInfo(ctx, { ...args, devices: true }),
  },
  {
    id: "events",
    name: "Event Viewer",
    icon: "eventViewer",
    aliases: ["eventvwr", "eventvwr.msc"],
    singleton: true,
    open: openEventViewer,
  },
  {
    id: "tasks",
    name: "Scheduled Tasks",
    icon: "scheduledTasks",
    aliases: ["tasks"],
    singleton: true,
    open: (ctx) => ctx.launch("explorer", { path: "tasks" }),
  },
  {
    id: "taskwizard",
    name: "Add Scheduled Task",
    icon: "scheduledTasks",
    singleton: true,
    open: openTasks,
  },
  {
    id: "diskmanager",
    name: "Disk Management",
    icon: "drive",
    aliases: ["diskmgmt.msc"],
    open: openDiskManager,
  },
  {
    id: "cleanmgr",
    name: "Disk Cleanup",
    icon: "defragApp",
    aliases: ["cleanmgr", "cleanmgr.exe"],
    open: (ctx, args) => openDiskCleanup(ctx, args || {}),
  },
  {
    id: "defrag",
    name: "Disk Defragmenter",
    icon: "defragApp",
    aliases: ["dfrg.msc"],
    open: openDefrag,
  },
  {
    id: "charmap",
    name: "Character Map",
    icon: "font",
    aliases: ["charmap.exe"],
    open: openCharacterMap,
  },
  {
    id: "clipboard",
    name: "ClipBook Viewer",
    icon: "document",
    aliases: ["clipbrd", "clipbrd.exe"],
    open: openClipboardViewer,
  },
  {
    id: "keyboard",
    name: "On-Screen Keyboard",
    icon: "keyboard",
    aliases: ["osk", "osk.exe"],
    singleton: true,
    open: openKeyboard,
  },
  {
    id: "magnifier",
    name: "Magnifier",
    icon: "magnifier",
    aliases: ["magnify", "magnify.exe"],
    singleton: true,
    open: openMagnifier,
  },
  {
    id: "control",
    name: "Control Panel",
    icon: "control",
    aliases: ["control.exe"],
    hidden: true,
    open: openControlPanel,
  },
  {
    id: "help",
    name: "Windows Help",
    icon: "help",
    aliases: ["winhelp", "hh"],
    open: openHelp,
  },
  { id: "services", name: "Services", icon: "adminServices", aliases: ["services.msc"], singleton: true, open: openServices },
  { id: "secpol", name: "Local Security Policy", icon: "adminSecPol", aliases: ["secpol.msc"], singleton: true, open: openLocalSecurityPolicy },
  { id: "compsvc", name: "Component Services", icon: "adminCompSvc", aliases: ["comexp.msc"], singleton: true, open: openComponentServices },
  { id: "odbc", name: "Data Sources (ODBC)", icon: "adminOdbc", aliases: ["odbcad32"], singleton: true, open: openOdbc },
  { id: "telnetadmin", name: "Telnet Server Administration", icon: "adminTelnet", aliases: ["tlntadmn"], singleton: true, open: openTelnetAdmin },
  { id: "ncw", name: "Network Connection Wizard", icon: "dialup", hidden: true, open: openNetworkConnectionWizard },
  { id: "icw", name: "Internet Connection Wizard", icon: "ie", hidden: true, open: openInternetConnectionWizard },
  { id: "connections", name: "Network and Dial-up Connections", icon: "dialup", hidden: true, open: (ctx) => ctx.launch("explorer", { path: "connections" }) },
  { id: "addnet", name: "Add Network Place", icon: "netAdd", hidden: true, open: openAddNetworkPlace },
  { id: "fontview", name: "Font Viewer", icon: "fontTT", hidden: true, open: openFontViewer },
  {
    id: "welcome",
    name: "Getting Started",
    icon: "windows",
    hidden: true,
    singleton: true,
    open: openWelcome,
  },
  {
    id: "about",
    name: "About Windows",
    icon: "computer",
    aliases: ["winver", "winver.exe"],
    hidden: true,
    open: openAbout,
  },
  {
    id: "run",
    name: "Run",
    icon: "run",
    hidden: true,
    singleton: true,
    open: openRun,
  },
];
ctx.launch = async (id, args = {}) => {
  ctx.shell?.closeStart();
  const app = ctx.apps.find((a) => a.id === id);
  if (!app)
    throw new Error(
      `Windows cannot find “${id}”. Check the name and try again.`,
    );
  if (app.singleton) {
    const existing = wm.windows.find((w) => w.appId === id && !w.closed);
    if (existing) {
      existing.focus();
      return existing;
    }
  }
  const win = await app.open(ctx, args);
  ctx.log("Information", "Application", app.name + " started");
  return win;
};
ctx.openFile = async (path) => {
  path = normalizePath(path);
  const node = fs.stat(path);
  if (node.trashed)
    throw new Error(
      "Restore this item from the Recycle Bin before opening it.",
    );
  if (node.type === "folder") return ctx.launch("explorer", { path });
  settings.set(
    "recentFiles",
    [
      path,
      ...(settings.get("recentFiles") || []).filter((p) => p !== path),
    ].slice(0, 12),
  );
  const ext = extension(path);
  if (ext === "lnk") {
    try {
      return ctx.run(JSON.parse(node.content).command);
    } catch {
      throw new Error("This shortcut is invalid.");
    }
  }
  if (["doc", "docx"].includes(ext)) return ctx.launch("word", { path });
  if (["wdoc", "rtf"].includes(ext)) return ctx.launch("wordpad", { path });
  if (
    ["png", "jpg", "jpeg", "bmp", "gif", "webp", "svg"].includes(ext) ||
    node.mime?.startsWith("image/")
  )
    return ctx.launch("imaging", { path });
  if (
    ["wav", "mp3", "ogg", "m4a", "mp4", "webm"].includes(ext) ||
    /^(audio|video)\//.test(node.mime)
  )
    return ctx.launch("mediaplayer", { path });
  if (["m3u", "m3u8", "pls"].includes(ext)) return ctx.launch("vlc", { path });
  if (["zip", "rar"].includes(ext)) return ctx.launch("winrar", { path });
  if (ext === "pdf" || node.mime === "application/pdf") return ctx.launch("acrobat", { path });
  if (["html", "htm"].includes(ext)) return ctx.launch("ie", { path });
  if (ext === "exe") {
    const nm = basename(path).toLowerCase(), bare = nm.replace(/\.exe$/, "");
    const app = ctx.apps.find((a) => !a.hidden && (a.aliases || []).some((x) => x === nm || x === bare));
    if (app) return ctx.launch(app.id);
  }
  if (["exe", "dll", "sys", "msi"].includes(ext))
    return ctx.dialogs.message(
      "This is a native Windows binary. The browser desktop does not include an x86/NT emulator to execute it.\n\nUse a built-in browser program or open it in a compatible emulator.",
      { title: "Windows", icon: "computer" },
    );
  return ctx.launch("notepad", { path });
};
ctx.run = async (command) => {
  const str = String(command || "").trim();
  if (!str) return;
  if (/^https?:\/\//i.test(str)) return ctx.launch("ie", { url: str });
  const bare = str.replace(/^"|"$/g, "");
  if (/^[a-z]:[\\/]/i.test(bare) && fs.exists(bare)) return ctx.openFile(bare);
  const match = str.match(/^(?:"([^"]+)"|(\S+))(?:\s+(.*))?$/),
    name = (match?.[1] || match?.[2] || "").toLowerCase(),
    argument = (match?.[3] || "").replace(/^"|"$/g, "");
  if (name === "control" || name === "control.exe") {
    if (!argument) return ctx.launch("explorer", { path: "control" });
    const map = {
      "desk.cpl": "display",
      "sysdm.cpl": "system",
      "main.cpl": "mouse",
      "timedate.cpl": "datetime",
      "mmsys.cpl": "sounds",
      "inetcpl.cpl": "internet",
      "appwiz.cpl": "programs",
      "intl.cpl": "regional",
      "access.cpl": "accessibility",
    };
    return ctx.launch("control", {
      page: map[argument.toLowerCase()] || argument.toLowerCase(),
    });
  }
  if (name === "shutdown") return ctx.shell.shutdown();
  if (name === "logoff") return ctx.lock();
  const app = ctx.apps.find(
    (a) =>
      a.id === name ||
      a.aliases?.includes(name) ||
      a.name.toLowerCase() === name,
  );
  if (!app)
    throw new Error(
      `Windows cannot find “${name}”. Make sure you typed the name correctly, and then try again.\n\nTry: notepad, calc, mspaint, cmd, explorer, winmine, sol, regedit, or winver.`,
    );
  const args = {};
  if (argument) {
    if (app.id === "ie") args.url = argument;
    else if (app.id === "cmd")
      args.command = argument.replace(/^\/[ck]\s+/i, "");
    else if (app.id === "explorer") args.path = argument;
    else if (fs.exists(argument)) args.path = normalizePath(argument);
  }
  return ctx.launch(app.id, args);
};
ctx.lock = () => ctx.shell.lock();
ctx.previewScreensaver = (type) => ctx.shell.previewScreensaver(type);
ctx.clipboard.onConflict = (info) => confirmReplace(ctx, info);
const escapeHTML = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const printHTML = (html) => {
  const frame = document.createElement("iframe");
  frame.className = "print-frame";
  frame.srcdoc =
    '<!doctype html><html><head><meta charset="utf-8"><style>body{font:12pt Arial;margin:24px}pre{white-space:pre-wrap}img{max-width:100%}</style></head><body>' +
    html +
    "</body></html>";
  document.body.append(frame);
  frame.addEventListener(
    "load",
    () => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 60000);
    },
    { once: true },
  );
};
ctx.printHTML = (html) => printHTML(html);
ctx.printText = (text, title) =>
  printHTML(
    "<h2>" + escapeHTML(title) + "</h2><pre>" + escapeHTML(text) + "</pre>",
  );
ctx.printImage = (data) => {
  if (!/^data:image\//.test(data)) throw new Error("Invalid image.");
  printHTML('<img src="' + escapeHTML(data) + '">');
};
async function seedSampleDocs() {
  if (settings.get("samples.docs.v3")) return;
  const desk = "C:/Documents and Settings/Administrator/Desktop";
  const names = ["Güzel Sözler.txt", "Mektup.wdoc", "ayarlar.json", "Gün Batımı.png", "Ay Işığı.png", "Hayat Rehberi.pdf", "Sabah Melodisi.mp3", "Gece Rüyası.ogg", "Zil.wav", "Gün Batımı.mp4", "Yıldızlar.webm", "Gün Batımı.srt", "Yıldızlar.vtt", "Favoriler.m3u", "Televizyon.m3u"];
  try {
    if (!fs.exists(desk + "/Docs")) await fs.mkdir(desk + "/Docs");
    for (const n of names) {
      if (fs.exists(desk + "/Docs/" + n)) continue;
      const r = await fetch("/assets/samples/Docs/" + encodeURIComponent(n));
      if (r.ok) await fs.importFile(new File([await r.blob()], n, { type: r.headers.get("content-type") || "" }), desk + "/Docs");
    }
    settings.set("samples.docs.v3", true);
  } catch (e) { console.warn("sample docs", e); }
}
async function seedDesktopDocs() {
  if (settings.get("samples.desktop.v1")) return;
  try {
    for (const n of ["README.pdf", "DMCA.pdf"]) {
      if (fs.exists(DESKTOP + "/" + n)) continue;
      const r = await fetch("/assets/samples/Desktop/" + n);
      if (r.ok) await fs.importFile(new File([await r.blob()], n, { type: "application/pdf" }), DESKTOP);
    }
    settings.set("samples.desktop.v1", true);
  } catch (e) { console.warn("desktop docs", e); }
}
const PROGRAM_FILES = {
  "Winamp": { "winamp.exe": 1, "whatsnew.txt": "Winamp 2.91\r\nClassic skin and Webamp engine.\r\n", "Skins/Base-2.91.wsz": 1, "Plugins/in_mp3.dll": 1, "Plugins/out_wave.dll": 1, "Plugins/vis_nsfs.dll": 1 },
  "VideoLAN/VLC": { "vlc.exe": 1, "README.txt": "VLC media player\r\nThe VideoLAN project.\r\n", "libvlc.dll": 1, "plugins/access_http.dll": 1, "plugins/demux_ts.dll": 1, "plugins/codec_ffmpeg.dll": 1 },
  "DivX/DivX Player": { "divx.exe": 1, "readme.txt": "DivX Player 5\r\n", "divx.dll": 1, "skins/default.skn": 1 },
  "Netscape/Navigator": { "netscape.exe": 1, "README.txt": "Netscape Navigator\r\n", "bookmark.htm": "<html><body><a href=\"http://www.netscape.com/home\">Netscape</a></body></html>\r\n", "plugins/npnul32.dll": 1, "defaults/prefs.js": "// Netscape preferences\r\n" },
  "WinRAR": { "WinRAR.exe": 1, "Rar.txt": "WinRAR\r\nArchiver for RAR and ZIP.\r\n", "License.txt": "WinRAR license\r\n", "Default.SFX": 1, "Zip.SFX": 1 },
  "Adobe/Acrobat 5.0/Reader": { "AcroRd32.exe": 1, "AcroRd32.dll": 1, "plug_ins/Search.api": 1 },
  "Microsoft Office/Office": { "WINWORD.EXE": 1, "WINWORD.OLB": 1, "1033/wwintl.dll": 1, "Templates/Normal.dot": 1 },
  "ICQ": { "icq.exe": 1, "icq.ini": "[ICQ]\r\n", "Sounds/message.wav": 1 },
  "MSN Messenger": { "msnmsgr.exe": 1, "msgsc.dll": 1, "Sounds/newalert.wav": 1, "Emoticons/smile.gif": 1 },
  "Windows Media Player": { "wmplayer.exe": 1, "mplayer2.exe": 1, "wmp.dll": 1 },
  "Outlook Express": { "msimn.exe": 1, "msoe.dll": 1, "wab.exe": 1 },
  "Internet Explorer": { "iexplore.exe": 1, "hmmapi.dll": 1, "connect/icwconn1.exe": 1 },
  "Accessories": { "wordpad.exe": 1, "mspaint.exe": 1, "hypertrm.exe": 1, "dialer.exe": 1 },
};
async function seedProgramFiles() {
  if (settings.get("programfiles.v1")) return;
  try {
    for (const [dir, files] of Object.entries(PROGRAM_FILES)) {
      let cur = "C:/Program Files";
      for (const part of dir.split("/")) { cur += "/" + part; if (!fs.exists(cur)) await fs.mkdir(cur); }
      for (const [rel, body] of Object.entries(files)) {
        const parts = rel.split("/"); let d = "C:/Program Files/" + dir;
        for (const part of parts.slice(0, -1)) { d += "/" + part; if (!fs.exists(d)) await fs.mkdir(d); }
        const f = d + "/" + parts.at(-1);
        if (fs.exists(f)) continue;
        const isTxt = typeof body === "string";
        await fs.writeFile(f, isTxt ? body : "MZ\u0090\u0000 This program cannot be run in DOS mode.\r\n", { mime: isTxt ? "text/plain" : "application/octet-stream" });
      }
    }
    settings.set("programfiles.v1", true);
  } catch (e) { console.warn("program files", e); }
}
async function start() {
  let samples = Promise.resolve();
  try {
    await fs.init();
    samples = seedSampleDocs().then(seedDesktopDocs);
    await seedProgramFiles();
  } catch (error) {
    console.error(error);
    document.querySelector("#overlay-layer").append(
      el(
        "div",
        { class: "startup-error" },
        el("h1", { text: "Windows could not open the virtual hard drive." }),
        el("p", {
          text: "Allow this site to store browser data, then reload. Your existing files have not been replaced.",
        }),
        el("p", { text: error.message }),
        button("Try Again", () => location.reload()),
      ),
    );
    return;
  }
  await ctx.renderer.init();
  applyTheme(settings);
  ctx.shell = new DesktopShell(ctx).init();
  samples.catch(() => {});
  // warm the program modules one by one while the desktop is idle (opening an app is then instant)
  if (!navigator.connection?.saveData) setTimeout(() => { const queue = [...idleLoad]; const next = () => { const u = queue.shift(); if (u) import(u).catch(() => {}).finally(() => (window.requestIdleCallback || setTimeout)(next, { timeout: 2000 })); }; next(); }, 3000);
  ctx.log("Information", "System", "Windows 2000 browser desktop started");
  bus.on("fs:change", () =>
    ctx.log(
      "Information",
      "File System",
      "Virtual drive transaction committed",
    ),
  );
  bus.on("settings:change", () =>
    ctx.log("Information", "Control Panel", "Desktop settings updated"),
  );
  if (settings.get("showWelcome")) await ctx.launch("welcome");
  wm.fit();
  document.body.classList.add("ready");
  const params = new URLSearchParams(location.search);
  if (params.has("app")) {
    const id = params.get("app");
    if (ctx.apps.some((a) => a.id === id)) await ctx.launch(id);
  }
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController(),
      register = (tool) =>
        Promise.resolve(
          document.modelContext.registerTool(tool, {
            signal: lifecycle.signal,
          }),
        ).catch(console.error);
    register({
      name: "list_desktop_programs",
      title: "List desktop programs",
      description:
        "List the installed browser desktop programs and currently open windows.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({
        programs: ctx.apps.map(({ id, name }) => ({ id, name })),
        windows: wm.windows.map(({ id, appId, title }) => ({
          id,
          appId,
          title,
        })),
      }),
    });
    register({
      name: "open_desktop_program",
      title: "Open desktop program",
      description: "Launch an installed Windows 2000 browser desktop program.",
      inputSchema: {
        type: "object",
        properties: {
          program: { type: "string", enum: ctx.apps.map((a) => a.id) },
        },
        required: ["program"],
        additionalProperties: false,
      },
      execute: async (input) => {
        if (
          !input ||
          typeof input.program !== "string" ||
          !ctx.apps.some((a) => a.id === input.program)
        )
          throw new Error("Unknown program.");
        const win = await ctx.launch(input.program);
        return { windowId: win?.id, title: win?.title };
      },
    });
    register({
      name: "list_virtual_files",
      title: "List virtual files",
      description: "Read a directory on the desktop virtual hard drive.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        if (typeof input?.path !== "string")
          throw new Error("A path is required.");
        const n = fs.stat(input.path);
        if (n.type !== "folder")
          throw new Error("The path is not a directory.");
        return {
          files: fs
            .list(input.path)
            .map(({ name, path, type, size }) => ({ name, path, type, size })),
        };
      },
    });
    window.addEventListener("pagehide", () => lifecycle.abort(), {
      once: true,
    });
  }
  window.win2k = { version: "1.0.0", ...ctx };
  // Share link: #web=<address>&date=<year or YYYYMMDD> opens Internet Explorer on the Wayback Machine.
  try {
    const hp = new URLSearchParams(location.hash.replace(/^#/, ""));
    const web = hp.get("web"), date = (hp.get("date") || "").replace(/\D/g, "");
    if (web) setTimeout(() => ctx.launch("ie", { url: /^https?:\/\//i.test(web) ? web : "http://" + web, year: date.slice(0, 4) || null, stamp: date.length >= 8 ? date.slice(0, 8) : "" }), 600);
  } catch {}
  if ("serviceWorker" in navigator && !location.hostname.endsWith(".local") && !["localhost", "127.0.0.1"].includes(location.hostname))
    navigator.serviceWorker
      .register("/sw.js")
      .catch((e) => console.info("Offline cache unavailable:", e.message));
}
start().catch((error) => {
  console.error(error);
  document.querySelector("#overlay-layer").append(
    el(
      "div",
      { class: "startup-error" },
      el("h1", { text: "Windows could not start" }),
      el("p", { text: error.message }),
      button("Restart", () => location.reload()),
    ),
  );
});
