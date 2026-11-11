import { schemes } from "./schemes.js";
export const controlItems = [
  {
    id: "accessibility",
    name: "Accessibility Options",
    icon: "cpAccessibility",
    description: "Change keyboard, display, and mouse accessibility settings.",
  },
  {
    id: "hardware",
    name: "Add/Remove Hardware",
    icon: "cpHardware",
    description: "View devices available to this browser.",
  },
  {
    id: "programs",
    name: "Add/Remove Programs",
    icon: "cpPrograms",
    description: "View the programs installed on your computer.",
  },
  {
    id: "administrative",
    name: "Administrative Tools",
    icon: "cpAdmin",
    description: "Manage your virtual computer.",
  },
  {
    id: "autoupdate",
    name: "Automatic Updates",
    icon: "cpAutoUpdate",
    description: "Configures Windows Update to download and install updates automatically.",
  },
  {
    id: "bde",
    name: "BDE Administrator",
    icon: "cpBde",
    description: "Configures the Borland Database Engine.",
  },
  {
    id: "datetime",
    name: "Date/Time",
    icon: "cpDateTime",
    description: "Change the clock and date display.",
  },
  {
    id: "display",
    name: "Display",
    icon: "cpDisplay",
    description: "Change your desktop background, colors, and screen saver.",
  },
  {
    id: "folder",
    name: "Folder Options",
    icon: "cpFolderOpts",
    description: "Change how files and folders are displayed.",
  },
  {
    id: "fonts",
    name: "Fonts",
    icon: "cpFonts",
    description: "View and preview available fonts.",
  },
  {
    id: "gaming",
    name: "Gaming Options",
    icon: "cpGaming",
    description: "Add, remove, and configure game controllers.",
  },
  {
    id: "internet",
    name: "Internet Options",
    icon: "cpInternet",
    description: "Change your home page and browser preferences.",
  },
  {
    id: "java",
    name: "Java Plug-in 1.3.1_01",
    icon: "cpJava",
    description: "Configure the Java Plug-in.",
  },
  {
    id: "keyboard",
    name: "Keyboard",
    icon: "cpKeyboard",
    description: "Change keyboard settings and language.",
  },
  {
    id: "mouse",
    name: "Mouse",
    icon: "cpMouse",
    description: "Change mouse and double-click settings.",
  },
  {
    id: "network",
    name: "Network and Dial-up Connections",
    icon: "cpNetwork",
    description: "View browser network status.",
    label: "Network and Dial-up Co...",
  },
  {
    id: "phone",
    name: "Phone and Modem Options",
    icon: "cpPhone",
    description: "Configure your telephone dialing rules and modem settings.",
    label: "Phone and Modem ...",
  },
  {
    id: "power",
    name: "Power Options",
    icon: "cpPower",
    description: "Change virtual screen saver and idle settings.",
  },
  {
    id: "printers",
    name: "Printers",
    icon: "cpPrinters",
    description: "Use browser printing and PDF output.",
  },
  {
    id: "regional",
    name: "Regional Options",
    icon: "cpRegional",
    description: "Change time and number formats.",
  },
  {
    id: "scanners",
    name: "Scanners and Cameras",
    icon: "cpScanners",
    description: "Add, remove, and configure scanners and cameras.",
  },
  {
    id: "tasks",
    name: "Scheduled Tasks",
    icon: "cpTasks",
    description: "Schedule computer tasks to run automatically.",
  },
  {
    id: "sounds",
    name: "Sounds and Multimedia",
    icon: "cpSounds",
    description: "Change volume, sounds, and media settings.",
  },
  {
    id: "system",
    name: "System",
    icon: "cpSystem",
    description: "View system information and back up the virtual disk.",
  },
  {
    id: "users",
    name: "Users and Passwords",
    icon: "cpUsers",
    description: "Change the desktop user name.",
  },
];
export function applyTheme(settings) {
  const theme = schemes[settings.get("scheme")] || schemes["Windows Standard"];
  const root = document.documentElement;
  root.style.setProperty("--face", theme.face);
  root.style.setProperty("--active", theme.active);
  root.style.setProperty("--active-gradient", theme.gradient);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--inactive", theme.inactive || "#808080");
  root.style.setProperty("--inactive-gradient", theme.inactiveGradient || "#c0c0c0");
  root.style.setProperty("--caption-text", theme.captionText || "#fff");
  root.style.setProperty("--highlight", theme.highlight || theme.active);
  root.style.setProperty("--highlight-text", theme.highlightText || "#fff");
  root.style.setProperty(
    "--ui-font-size",
    (([11, 0].includes(Number(settings.get("fontSize"))) ? 13 : Number(settings.get("fontSize")) || 13)) + "px",
  );
  root.classList.toggle(
    "high-contrast",
    /^High Contrast/.test(settings.get("scheme")) ||
      settings.get("highContrast"),
  );
  document.querySelector("#desktop").style.backgroundColor =
    settings.get("desktopColor");
}
