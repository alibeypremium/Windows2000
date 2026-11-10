/** "Local Area Connection Status" property sheet: netshell.dll dialog 1801 on a one-tab sheet. */
import { refWindow, kit, btn } from "../control-panel/refkit.js";
import { dialogFromTemplate, px, py } from "../ui/dlg.js";
import { el } from "../ui/index.js";
import { lanStatusTemplate } from "./lan-data.js";

const fmt = (n) => n.toLocaleString("en-US");
// netshell.dll string 23050/23051: "Bytes:" is replaced by "Packets:" for LAN connections; the Errors row is for dial-up
const HIDE = [1027, 1012, 1013, 1028];
const ICONS = { idle: 126, both: 122, send: 124, recv: 125, off: 121, down: 123 };

export function openLanStatus(ctx, st) {
  if (st.dlg?.el?.isConnected) return st.dlg.el.focus?.();
  const MX = 7, TAB = 21;
  const pageW = px(lanStatusTemplate.cx), pageH = py(142); // page is shortened: the dial-up Errors row is not used for LAN
  const W = pageW + 2 * (4 + MX + 2), H = 22 + 4 + MX + TAB + pageH + 4 + MX + 23 + MX + 4;
  const w = (st.dlg = refWindow(ctx, { title: "Local Area Connection Status", noIcon: true, width: W, height: H, appId: "dialog" }));
  const k = kit(0, 0);
  const paneX = 4 + MX, paneY = 22 + 4 + MX + TAB - 1;
  const ctl = {};
  const tabs = k.tabs({ top: 22 + 4 + MX, pane: [paneX, paneY, pageW + 4, pageH + 4], active: 0, tabs: [{ label: "General", x: paneX, w: 52, content: () => [] }] });
  w.place(tabs);
  const dur = () => {
    const t = Math.floor((Date.now() - st.since) / 1000), p = (v) => String(v).padStart(2, "0");
    return `${p(Math.floor(t / 3600))}:${p(Math.floor(t / 60) % 60)}:${p(t % 60)}`;
  };
  const labels = {
    1007: st.up ? "Connected" : "Disconnected", // string 23012 / 23010
    1008: dur(),
    1009: st.up ? "100.0 Mbps" : "0 bps", // string 23032
    1023: "Packets:", // string 23051
    1003: fmt(st.sentPk), 1005: fmt(st.recvPk),
  };
  const host = { place: (...n) => w.place(...n) };
  dialogFromTemplate(ctx, lanStatusTemplate, {
    host, ox: paneX + 3, oy: paneY + 3, ctlOut: ctl, labels, hidden: HIDE,
    on: {
      1026: () => ctx.launch("control", { page: "network" }),
      1025: () => { st.up = !st.up; if (st.up) st.since = Date.now(); st.paint(); w.close(); },
    },
  });
  const dis = ctl[1025];
  const setDis = () => { if (!dis) return; dis.replaceChildren(...(st.up ? [el("u", { text: "D" }), "isable"] : [el("u", { text: "E" }), "nable"])); };
  setDis();
  // activity picture (template icon 1010): LAN computers, lit while traffic flows
  const c = lanStatusTemplate.controls.find((x) => x.id === 1010);
  const pic = el("img", { width: 32, height: 32, alt: "", style: { position: "absolute", left: paneX + 3 + px(c.x) - 4 + "px", top: paneY + 3 + py(c.y) - 8 + "px", imageRendering: "pixelated" } });
  w.place(pic);
  const paint = () => {
    const n = !st.up ? ICONS.off : st.burst > 0 ? [ICONS.both, ICONS.send, ICONS.recv][st.burst % 3] : ICONS.idle;
    pic.src = `/assets/tray/lan32-${n}.png`;
  };
  paint();
  w.place(btn(W - 4 - MX - 75, H - 4 - MX - 23, 75, 23, "Close", { onclick: () => w.close() }));
  w.el.addEventListener("keydown", (e) => { if (e.key === "Escape") w.close(); });
  st.refresh = () => {
    if (!w.el.isConnected) return (st.refresh = null);
    ctl[1007].textContent = st.up ? "Connected" : "Disconnected";
    ctl[1009].textContent = st.up ? "100.0 Mbps" : "0 bps";
    ctl[1008].textContent = dur();
    ctl[1003].textContent = fmt(st.sentPk);
    ctl[1005].textContent = fmt(st.recvPk);
    setDis();
    paint();
  };
  return w;
}
