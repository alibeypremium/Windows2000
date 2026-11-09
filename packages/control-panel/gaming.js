/** Gaming Options, laid out from Windows 2000 reference screenshots. */
import { el } from "../ui/index.js";
import { refWindow, kit } from "./refkit.js";

export function openGamingOptions(ctx, { tab = 0 } = {}) {
  const OX = 310,
    OY = 161,
    k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Gaming Options",
      width: 404,
      height: 445,
      appId: "control",
      help: true,
      x: OX,
      y: OY,
    });
  w.setIcon?.("cpGaming");
  const hdr = (x, y, wd, h, label, left = false) => {
    const n = el("div", { class: "rk-hdr" + (left ? " left" : ""), text: label });
    Object.assign(n.style, { left: x - OX + "px", top: y - OY + "px", width: wd + "px", height: h + "px" });
    return n;
  };
  const controllers = () => [
    k.img(334, 233, "/assets/ui/dialogs/gaming-pad.png", 34, 29),
    k.text(383, 234, "Use this application to configure and test game controllers."),
    k.text(336, 276, "Game Controllers"),
    k.sunken(336, 292, 350, 148),
    hdr(337, 293, 258, 16, "Controller", true),
    hdr(595, 293, 90, 16, "Status"),
    k.btn(443, 470, 75, 23, "Refresh"),
    k.btn(527, 470, 75, 23, "Add...", { onclick: () => ctx.dialogs.message("No game controllers are available on this computer.", { title: "Gaming Options" }) }),
    k.btn(611, 470, 75, 23, "Remove", { disabled: true }),
    k.btn(527, 500, 75, 23, "Troubleshoot", { onclick: () => ctx.launch("help") }),
    k.btn(611, 500, 75, 23, "Properties", { disabled: true }),
  ];
  const ids = () => {
    const grid = el("div", { class: "rk-pane", style: { overflow: "hidden" } });
    const cols = [
      ["ID", 345, 32],
      ["Name", 377, 94],
      ["Game Controllers", 471, 126],
      ["Port", 597, 63],
    ];
    const items = [
      k.group(334, 226, 355, 206, "Controller ID Assignment", 9),
      k.text(344, 247, "To modify the controller ID, select the ID and click Change."),
      k.sunken(344, 269, 336, 110),
      ...cols.map(([l, x, wd]) => hdr(x, 270, wd, 18, l)),
    ];
    const rows = el("div", { class: "rk-gridclip" });
    rows.style.cssText = `left:${346 - OX}px;top:${289 - OY}px;width:314px;height:89px`;
    for (let i = 1; i <= 7; i++) {
      const r = el("div", { class: "rk-gridrow", style: { top: (i - 1) * 14 + "px" } },
        el("span", { class: "c0", text: String(i) }),
        el("span", { class: "c1", text: "(none)" }),
        el("span", { class: "c2", text: "(none)" }),
        el("span", { class: "c3", text: "(none)" }),
      );
      rows.append(r);
    }
    items.push(rows, k.vscroll(661, 270, 108, 17, 77), k.btn(596, 392, 84, 25, "Change...", { disabled: true }));
    return items;
  };
  w.place(
    k.tabs({
      top: 192,
      pane: [319, 211, 387, 354],
      active: tab,
      tabs: [
        { label: "Controllers", x: 321, w: 60, content: controllers },
        { label: "Controller IDs", x: 383, w: 73, content: ids },
      ],
    }),
    k.btn(631, 573, 75, 23, "OK", { def: true, onclick: () => w.close() }),
  );
  return w;
}
