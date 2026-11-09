/** Scanners and Cameras Properties, laid out from Windows 2000 reference screenshots. */
import { refWindow, kit } from "./refkit.js";

const OX = 449,
  OY = 84;

export function openScannersProperties(ctx) {
  const k = kit(0, 0),
    w = refWindow(ctx, { title: "Scanners and Cameras Properties", width: 367, height: 424, appId: "control", help: true, noIcon: true, x: OX, y: OY });
  const info = (text, title) => () => ctx.dialogs.message(text, { title, icon: "info" });
  const tc = k.tabs({
    top: 31,
    pane: [9, 47, 348, 336],
    tabs: [
      {
        label: "Devices",
        x: 10,
        w: 56,
        content: () => [
          k.img(25, 63, "/assets/ui/sounds/scanner.png", 32, 32),
          k.text(26, 101, "The following scanners or cameras are installed :"),
          k.sunken(25, 127, 318, 147),
          k.btn(185, 293, 75, 22, "Add...", { onclick: info("No new scanner or camera hardware was detected on this computer.", "Scanner and Camera Installation Wizard") }),
          k.btn(269, 293, 75, 22, "Remove", { disabled: true }),
          k.btn(185, 322, 75, 22, "Troubleshoot", { onclick: info("No scanner or camera problems were found.", "Troubleshooter") }),
          k.btn(269, 322, 75, 22, "Properties", { disabled: true }),
        ],
      },
    ],
  });
  w.place(
    tc,
    k.btn(201, 390, 75, 23, "OK", { def: true, onclick: () => w.close() }),
    k.btn(280, 390, 75, 23, "Cancel", { onclick: () => w.close() }),
  );
  return w;
}
