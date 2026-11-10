// Winamp 2.x. The player engine and the classic Winamp 2.91 skin come from Webamp (MIT, assets/vendor/webamp);
// the window is hosted on the Windows2000 desktop. Not rebuilt from the Windows 2000 ISO (Winamp is not part of it).
import { makeDemoAudio } from "./media.js";
let instance = null;
let host = null;

export async function openWinamp(ctx) {
  if (instance) { host?.querySelector("#main-window")?.dispatchEvent(new Event("focus")); return null; }
  host = document.createElement("div");
  host.id = "winamp-host";
  host.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:28px;z-index:900;pointer-events:none";
  document.body.appendChild(host);
  const mod = await import(new URL("../../assets/vendor/webamp/webamp.bundle.min.mjs", import.meta.url).href);
  const Webamp = mod.default || mod.Webamp || mod;
  const base = new URL("/assets/sounds/", location.href).href;
  const track = (f, title, duration) => ({ url: base + f, duration, metaData: { artist: "Windows 2000", title } });
  const wa = new Webamp({
    initialTracks: [
      { url: URL.createObjectURL(await makeDemoAudio()), duration: 12, metaData: { artist: "Windows2000", title: "Demo melody" } },
      track("logon.wav", "Windows Logon Sound", 5.51),
      track("logoff.wav", "Windows Logoff Sound", 3.9),
      track("tada.wav", "Tada", 1.94),
      track("notify.wav", "Notify", 1.35),
      track("chimes.wav", "Chimes", 0.63),
      track("ding.wav", "Ding", 0.92),
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
  wa.onClose(() => { try { wa.dispose(); } catch {} host?.remove(); host = null; instance = null; });
  await wa.renderWhenReady(host);
  host.querySelectorAll("#webamp, #webamp > *").forEach((n) => (n.style.pointerEvents = "none"));
  return null;
}
