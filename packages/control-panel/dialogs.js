/** Control Panel dialogs laid out from Windows 2000 reference screenshots. */
import { refWindow, kit } from "./refkit.js";

const DLG = "/assets/ui/dialogs/";

/** Shared OK / Cancel / Apply row used by property sheets. */
function sheetButtons(w, k, { ok, apply, y = 480, xs = [586, 667, 748] }) {
  const applyBtn = k.btn(xs[2], y, 75, 23, "Apply", {
    disabled: true,
    onclick: () => {
      apply?.();
      w.setDirty(false);
    },
  });
  w.setDirty = (dirty) => applyBtn.classList.toggle("disabled", !dirty);
  return [
    k.btn(xs[0], y, 75, 23, "OK", {
      def: true,
      onclick: () => {
        ok?.();
        w.close();
      },
    }),
    k.btn(xs[1], y, 75, 23, "Cancel", { onclick: () => w.close() }),
    applyBtn,
  ];
}

export function openAccessibility(ctx) {
  const OX = 465,
    OY = 70,
    k = kit(OX, OY),
    w = refWindow(ctx, {
      title: "Accessibility Options",
      width: 367,
      height: 443,
      appId: "control",
      help: true,
      noIcon: true,
    });
  const state = { highContrast: !!ctx.settings.get("highContrast") };
  const dirty = () => w.setDirty?.(true);
  const apply = () => {
    ctx.settings.patch({ highContrast: state.highContrast });
    document.documentElement.classList.toggle(
      "high-contrast",
      state.highContrast || ctx.settings.get("scheme") === "High Contrast Black",
    );
  };
  const feature = (top, label, para, iconFile, ic, checkY, btnY, name, extra) => [
    k.group(489, top, 320, 83, label),
    k.img(ic[0], ic[1], DLG + iconFile, ic[2], ic[3]),
    k.text(539, top + 16, para),
    k.check(538, checkY, `Use ${name}`, { onchange: dirty, ...extra }),
    k.btn(721, btnY, 75, 23, "Settings..."),
  ];
  const tabsDef = [
    {
      label: "Keyboard",
      x: 476,
      w: 56,
      content: () => [
        feature(
          138,
          "StickyKeys",
          "Use StickyKeys if you want to use Shift, Ctrl, or Alt\nkey by pressing one key at a time.",
          "acc-sticky.png",
          [499, 159, 31, 23],
          192,
          188,
          "StickyKeys",
        ),
        feature(
          234,
          "FilterKeys",
          "Use FilterKeys if you want Windows to ignore brief or\nrepeated keystrokes, or slow the repeat rate.",
          "acc-filter.png",
          [499, 249, 32, 32],
          288,
          284,
          "FilterKeys",
        ),
        feature(
          331,
          "ToggleKeys",
          "Use ToggleKeys if you want to hear tones when\npressing Caps Lock, Num Lock, and Scroll Lock.",
          "acc-toggle.png",
          [500, 347, 31, 29],
          385,
          381,
          "ToggleKeys",
        ),
        k.check(489, 426, "Show extra keyboard help in programs", {
          onchange: dirty,
        }),
      ],
    },
    {
      label: "Sound",
      x: 536,
      w: 40,
      content: () => [
        k.group(489, 138, 320, 83, "SoundSentry"),
        k.text(
          499,
          154,
          "Use SoundSentry if you want Windows to use visual\nwarnings when your computer makes a sound.",
        ),
        k.check(538, 192, "Use SoundSentry", { onchange: dirty }),
        k.btn(721, 188, 75, 23, "Settings..."),
        k.group(489, 234, 320, 83, "ShowSounds"),
        k.text(
          499,
          250,
          "Use ShowSounds if you want programs to display\ncaptions for the speech and sounds they make.",
        ),
        k.check(538, 288, "Use ShowSounds", { onchange: dirty }),
      ],
    },
    {
      label: "Display",
      x: 578,
      w: 44,
      content: () => [
        k.group(489, 138, 320, 83, "High Contrast"),
        k.text(
          499,
          154,
          "Use High Contrast if you want Windows to use colors\nand fonts designed for easy reading.",
        ),
        k.check(538, 192, "Use High Contrast", {
          checked: state.highContrast,
          onchange: (v) => {
            state.highContrast = v;
            dirty();
          },
        }),
        k.btn(721, 188, 75, 23, "Settings..."),
      ],
    },
    {
      label: "Mouse",
      x: 623,
      w: 42,
      content: () => [
        k.group(489, 138, 320, 83, "MouseKeys"),
        k.text(
          499,
          154,
          "Use MouseKeys if you want to control the pointer with\nthe numeric keypad on your keyboard.",
        ),
        k.check(538, 192, "Use MouseKeys", { onchange: dirty }),
        k.btn(721, 188, 75, 23, "Settings..."),
      ],
    },
    {
      label: "General",
      x: 667,
      w: 48,
      content: () => [
        k.group(489, 138, 320, 72, "Automatic reset"),
        k.check(499, 155, "Turn off accessibility features after idle for:", {
          onchange: dirty,
        }),
        k.combo(517, 175, 52, 21, "5", { disabled: true }),
        k.text(579, 179, "minutes", {}),
        k.group(489, 224, 320, 60, "Notification"),
        k.check(499, 238, "Give warning message when turning a feature on", {
          checked: true,
          onchange: dirty,
        }),
        k.check(499, 260, "Make a sound when turning a feature on or off", {
          checked: true,
          onchange: dirty,
        }),
        k.group(489, 299, 320, 83, "SerialKey devices"),
        k.img(499, 313, DLG + "acc-serial.png", 32, 32),
        k.text(
          539,
          314,
          "SerialKey devices allow alternative access to\nkeyboard and mouse features.",
        ),
        k.check(538, 352, "Support SerialKey devices", { onchange: dirty }),
        k.btn(721, 347, 75, 23, "Settings..."),
        k.group(489, 396, 320, 58, "Administrative options"),
        k.check(499, 412, "Apply all settings to logon desktop", {
          onchange: dirty,
        }),
        k.check(499, 433, "Apply all settings to defaults for new users", {
          onchange: dirty,
        }),
      ],
    },
  ];
  w.place(
    k.tabs({
      top: 99,
      pane: [474, 119, 350, 355],
      tabs: tabsDef,
      active: 0,
    }),
    sheetButtons(w, k, { ok: apply, apply }),
  );
  return w;
}
