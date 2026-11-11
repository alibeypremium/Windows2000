// Winamp 2.x. The player engine and the classic Winamp 2.91 skin come from Webamp (MIT, assets/vendor/webamp);
// the window is hosted on the Windows2000 desktop. Not rebuilt from the Windows 2000 ISO (Winamp is not part of it).
// Webamp already provides the main window, the 10-band equalizer and the playlist editor; this wrapper connects it to the
// shared media engine (Docs folder files), adds colour skins (Alt+S = Skin Browser, like Winamp 2) and "Add from Documents".
import { makeDemoAudio } from "./media.js";
import { mediaFiles, sourceFor, AV_RE } from "./media-engine.js";
import { basename, DOCS } from "../core/index.js";
let instance = null;
let host = null;
let appendTo = null;

// ---- colour skins: the classic Winamp sprites and text are recoloured with a CSS filter over the whole Webamp window ----
const SKINS = [
  { id: "classic", name: "Base Skin (Classic)", swatch: "#2b3a5a", filter: "" },
  { id: "ocean", name: "Ocean Blue", swatch: "#1d6fd0", filter: "hue-rotate(150deg) saturate(1.3)" },
  { id: "violet", name: "Violet Haze", swatch: "#7a3fc0", filter: "hue-rotate(215deg) saturate(1.2)" },
  { id: "ruby", name: "Ruby Red", swatch: "#b02030", filter: "hue-rotate(-110deg) saturate(1.4)" },
  { id: "amber", name: "Amber Glow", swatch: "#c88a20", filter: "hue-rotate(-60deg) saturate(1.6) brightness(1.05)" },
  { id: "mono", name: "Mono Steel", swatch: "#808080", filter: "grayscale(1)" },
  { id: "light", name: "Steel Light", swatch: "#d8dce4", filter: "grayscale(1) invert(.9) contrast(1.1)" },
];
function applySkin(id) {
  const skin = SKINS.find((s) => s.id === id);
  document.getElementById("wa-theme")?.remove();
  if (!skin?.filter) return;
  const st = document.createElement("style"); st.id = "wa-theme";
  st.textContent = `#winamp-host #main-window,#winamp-host #equalizer-window,#winamp-host #playlist-window{filter:${skin.filter}}`;
  document.head.append(st);
}

export async function openWinamp(ctx, args = {}) {
  const trackOf = async (e) => { const { url } = await sourceFor(ctx, e); return { url, metaData: { artist: "Windows2000 Documents", title: (e.title || basename(e.path || "")).replace(/\.[^.]+$/, "") } }; };
  if (instance) {
    host?.querySelector("#main-window")?.dispatchEvent(new Event("focus"));
    if (args?.path && ctx.fs.exists(args.path)) { try { instance.setTracksToPlay([await trackOf({ title: basename(args.path), path: args.path })]); } catch { /* ignore */ } }
    return null;
  }
  host = document.createElement("div");
  host.id = "winamp-host";
  host.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:28px;z-index:900;pointer-events:none";
  document.body.appendChild(host);
  const mod = await import(new URL("../../assets/vendor/webamp/webamp.bundle.min.mjs", import.meta.url).href);
  const Webamp = mod.default || mod.Webamp || mod;
  const base = new URL("/assets/sounds/", location.href).href;
  const track = (f, title, duration) => ({ url: base + f, duration, metaData: { artist: "Windows 2000", title } });
  const docs = (await Promise.all(mediaFiles(ctx).filter((e) => !/\.(mp4|webm)$/i.test(e.title)).map((e) => trackOf(e).catch(() => null)))).filter(Boolean);
  const wa = new Webamp({
    initialTracks: [
      { url: URL.createObjectURL(await makeDemoAudio()), duration: 12, metaData: { artist: "Windows2000", title: "Demo melody" } },
      ...docs,
      track("logon.wav", "Windows Logon Sound", 5.51),
      track("tada.wav", "Tada", 1.94),
      track("chimes.wav", "Chimes", 0.63),
    ],
    filePickers: [
      { contextMenuName: "Windows2000 Documents...", requiresNetwork: false, filePicker: async () => { const p = await ctx.dialogs.file({ mode: "open", path: DOCS, title: "Add File", filter: (n) => AV_RE.test(n.name) }); return p ? [await trackOf({ title: basename(p), path: p })] : []; } },
      { contextMenuName: "All media in Docs", requiresNetwork: false, filePicker: async () => (await Promise.all(mediaFiles(ctx).map((e) => trackOf(e).catch(() => null)))).filter(Boolean) },
    ],
    windowLayout: {
      main: { position: { top: 40, left: 40 }, shadeMode: false, closed: false },
      equalizer: { position: { top: 156, left: 40 }, shadeMode: false, closed: false },
      playlist: { position: { top: 272, left: 40 }, shadeMode: false, size: { extraHeight: 0, extraWidth: 0 }, closed: false },
    },
    enableHotkeys: true,
    zIndex: 901,
  });
  instance = wa;
  // Skin Browser (Alt+S in Winamp 2)
  let skinWin = null, current = ctx.settings.get("winampSkin") || "classic";
  const showSkins = () => {
    if (skinWin && !skinWin.closed) { skinWin.focus(); return; }
    skinWin = ctx.wm.create({ title: "Winamp Skin Browser", icon: "winamp", width: 300, height: 290, x: 380, y: 120, appId: "winamp-skins", resizable: false, maximizable: false, minimizable: false });
    const list = document.createElement("div"); list.className = "wa-skins";
    const draw = () => { list.replaceChildren(...SKINS.map((s) => { const r = document.createElement("div"); r.className = "wa-skin" + (s.id === current ? " sel" : ""); const sw = document.createElement("span"); sw.style.background = s.swatch; r.append(sw, s.name); r.addEventListener("click", async () => { current = s.id; ctx.settings.set("winampSkin", current); draw(); applySkin(current); }); return r; })); };
    draw();
    const note = document.createElement("div"); note.className = "wa-skin-note"; note.textContent = "Tip: the Winamp menu (top-left corner) > Skins > Load Skin... also opens real .wsz skins from your computer.";
    skinWin.setContent(list, note);
    skinWin.onClose = () => { skinWin = null; return true; };
  };
  const onKey = (e) => { if (e.altKey && e.key.toLowerCase() === "s" && instance) { e.preventDefault(); showSkins(); } };
  document.addEventListener("keydown", onKey);
  wa.onClose(() => { try { wa.dispose(); } catch {} document.removeEventListener("keydown", onKey); skinWin?.close(); document.getElementById("wa-theme")?.remove(); host?.remove(); host = null; instance = null; });
  await wa.renderWhenReady(host);
  host.querySelectorAll("#webamp, #webamp > *").forEach((n) => (n.style.pointerEvents = "none"));
  if (current !== "classic") applySkin(current);
  if (args?.path && ctx.fs.exists(args.path)) { try { wa.setTracksToPlay([await trackOf({ title: basename(args.path), path: args.path })]); } catch { /* ignore */ } }
  return null;
}
