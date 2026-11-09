import { refWindow, kit } from "../control-panel/refkit.js";
import {
  el,
  button,
  field,
  toolbar,
  statusBar,
  separator,
  safely,
} from "../ui/index.js";
import { downloadFile, DOCS, joinPath } from "../core/index.js";
export function openHyperTerminal(ctx) {
  const w = ctx.wm.create({
    title: "Untitled - HyperTerminal",
    icon: "cmd",
    width: 650,
    height: 410,
    appId: "hyperterminal",
  });
  let transport = "loopback",
    socket = null,
    port = null,
    reader = null,
    writer = null,
    generation = 0,
    connected = false,
    log = "";
  const output = el("pre", { class: "hyperterminal-output" }),
    input = el("input", {
      "aria-label": "Send text",
      placeholder: "Type a line and press Enter",
    }),
    status = statusBar("Disconnected", "");
  const print = (text) => {
    log += String(text);
    output.textContent = log;
    output.scrollTop = output.scrollHeight;
  };
  const disconnect = async () => {
    const token = ++generation;
    const oldSocket = socket,
      oldReader = reader,
      oldWriter = writer,
      oldPort = port;
    connected = false;
    socket = reader = writer = port = null;
    oldSocket?.close();
    try {
      await oldReader?.cancel();
      oldReader?.releaseLock();
      oldWriter?.releaseLock();
      await oldPort?.close();
    } catch {}
    if (token === generation) status.children[0].textContent = "Disconnected";
  };
  const setup = () => {
    const d = ctx.wm.create({
        title: "Connect To",
        width: 420,
        height: 280,
        dialog: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        appId: "terminalconnect",
      }),
      name = el("input", {
        value: "New Connection",
        "aria-label": "Connection name",
      }),
      type = el(
        "select",
        { "aria-label": "Connect using" },
        el("option", {
          value: "loopback",
          text: "Local loopback (test terminal)",
        }),
        el("option", { value: "websocket", text: "WebSocket gateway" }),
        el("option", { value: "serial", text: "Serial port (Web Serial)" }),
      ),
      address = el("input", {
        value: "wss://",
        "aria-label": "Gateway address",
      }),
      baud = el("input", {
        type: "number",
        value: 9600,
        min: 300,
        max: 921600,
        "aria-label": "Bits per second",
      });
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Name:", name),
        field("Connect using:", type),
        field("Gateway URL:", address),
        field("Bits per second:", baud),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("Connect", async () => {
          await disconnect();
          const token = ++generation;
          transport = type.value;
          if (transport === "websocket") {
            const url = new URL(address.value);
            if (!["ws:", "wss:"].includes(url.protocol))
              throw new Error("Enter a ws:// or wss:// WebSocket address.");
            const connection = (socket = new WebSocket(url));
            connection.addEventListener("open", () => {
              if (token !== generation) return;
              connected = true;
              status.children[0].textContent = "Connected";
              print("\r\nConnected to " + url.host + "\r\n");
            });
            connection.addEventListener("message", async (e) => {
              const text =
                typeof e.data === "string" ? e.data : await e.data.text();
              if (token === generation) print(text);
            });
            connection.addEventListener("close", () => {
              if (token !== generation) return;
              connected = false;
              status.children[0].textContent = "Disconnected";
            });
            connection.addEventListener("error", () => {
              if (token !== generation) return;
              status.children[0].textContent = "Connection failed";
              print(
                "\r\nConnection failed. Check the gateway address and browser policy.\r\n",
              );
            });
          } else if (transport === "serial") {
            if (!navigator.serial)
              throw new Error(
                "Web Serial is unavailable in this browser. Use a WebSocket gateway or local loopback.",
              );
            const connectionPort = await navigator.serial.requestPort();
            if (token !== generation || w.closed) return;
            await connectionPort.open({
              baudRate: Math.max(300, Math.min(921600, +baud.value || 9600)),
            });
            if (token !== generation || w.closed) {
              await connectionPort.close();
              return;
            }
            port = connectionPort;
            const connectionReader = (reader = port.readable.getReader());
            writer = port.writable.getWriter();
            connected = true;
            const decoder = new TextDecoder();
            (async () => {
              try {
                while (connected && token === generation) {
                  const result = await connectionReader.read();
                  if (result.done) break;
                  if (token === generation)
                    print(decoder.decode(result.value, { stream: true }));
                }
              } catch (error) {
                if (token === generation) print("\r\n" + error.message);
              }
            })();
          } else {
            connected = true;
            print(
              "Connected to local loopback. Typed text is echoed locally.\r\n",
            );
          }
          status.children[0].textContent = connected
            ? "Connected"
            : "Connecting...";
          status.children[1].textContent = transport;
          w.setTitle(name.value + " - HyperTerminal");
          d.close();
          input.focus();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  const send = async () => {
    if (!connected) throw new Error("Open a connection first.");
    const text = input.value + "\r\n";
    input.value = "";
    if (transport === "loopback") print(text);
    else if (transport === "websocket") socket.send(text);
    else await writer.write(new TextEncoder().encode(text));
  };
  const off = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const captureText = async () => {
    const p = await ctx.dialogs.file({ mode: "save", name: "Capture.txt" });
    if (p) await ctx.fs.writeFile(p, log);
  };
  w.setMenu({
    File: [
      { label: "New Connection", action: setup },
      off("Open..."),
      off("Save"),
      { label: "Save As...", action: () => downloadFile("HyperTerminal.log", log) },
      separator(),
      off("Page Setup..."),
      { label: "Print...", action: () => ctx.printText(log, "HyperTerminal") },
      separator(),
      { label: "Properties", action: setup },
      separator(),
      { label: "Exit", shortcut: "Alt+F4", action: () => w.close() },
    ],
    Edit: [
      { label: "Copy", shortcut: "Ctrl+C", action: () => ctx.clipboard.setText(window.getSelection()?.toString() || log) },
      { label: "Paste to Host", shortcut: "Ctrl+V", action: async () => (input.value = await ctx.clipboard.getText()) },
      separator(),
      { label: "Select All", action: () => { const r = document.createRange(); r.selectNodeContents(output); window.getSelection().removeAllRanges(); window.getSelection().addRange(r); } },
    ],
    View: [
      off("Tool Bar", { checked: true }),
      off("Status Bar", { checked: true }),
      separator(),
      off("Font..."),
      separator(),
      off("Snap"),
    ],
    Call: () => [
      { label: "Call", disabled: connected, action: setup },
      off("Wait for a Call"),
      off("Stop Waiting"),
      separator(),
      { label: "Disconnect", disabled: !connected, action: disconnect },
    ],
    Transfer: [
      off("Send File..."),
      off("Receive File..."),
      { label: "Capture Text...", action: captureText },
      off("Send Text File..."),
      separator(),
      off("Capture to Printer"),
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "hyperterminal" }) },
      separator(),
      { label: "About HyperTerminal", action: () => ctx.dialogs.message("HyperTerminal\nCopyright © 1996-2000 Hilgraeve, Inc.", { title: "About HyperTerminal", icon: "cmd" }) },
    ],
  });
  w.setContent(
    toolbar([
      { icon: "network", label: "Connect", action: setup },
      { glyph: "×", label: "Disconnect", action: disconnect },
    ]),
    output,
    el("div", { class: "hyperterminal-send" }, input, button("Send", send)),
    status,
  );
  input.addEventListener(
    "keydown",
    safely((e) => {
      if (e.key === "Enter") return send();
    }),
  );
  w.addCleanup(() => disconnect());
  print(
    "HyperTerminal\r\nSelect Call > Connect to open a terminal connection.\r\n",
  );
  return w;
}

export function openPhoneDialer(ctx) {
  const w = ctx.wm.create({
    title: "Phone Dialer",
    icon: "dialerApp",
    width: 285,
    height: 365,
    appId: "dialer",
    resizable: false,
    maximizable: false,
  });
  const number = el("input", { "aria-label": "Number to dial", type: "tel" }),
    keys = el("div", { class: "dialer-keys" });
  const dial = () => {
    const value = number.value.trim();
    if (!/^[+0-9*#(), -]+$/.test(value))
      throw new Error("Enter a telephone number.");
    location.href = "tel:" + encodeURIComponent(value);
  };
  for (const [digit, label] of [
    ["1", ""],
    ["2", "ABC"],
    ["3", "DEF"],
    ["4", "GHI"],
    ["5", "JKL"],
    ["6", "MNO"],
    ["7", "PQRS"],
    ["8", "TUV"],
    ["9", "WXYZ"],
    ["*", ""],
    ["0", "+"],
    ["#", ""],
  ])
    keys.append(
      button(
        [el("b", { text: digit }), el("small", { text: label })],
        () => (number.value += digit),
      ),
    );
  const offd = (label, extra = {}) => ({ label, disabled: true, ...extra });
  const dialNow = async () => {
    const v = await ctx.dialogs.prompt("Number to dial:", number.value, { title: "Dial" });
    if (v != null) { number.value = v; try { dial(); } catch (e) { ctx.dialogs.error(e); } }
  };
  w.setMenu({
    File: [
      offd("Properties..."),
      separator(),
      offd("Hide Phone Dialer Window"),
      { label: "Exit Phone Dialer", action: () => w.close() },
    ],
    Edit: [
      offd("Add to Speed Dial List..."),
      offd("Speed Dial List..."),
      separator(),
      offd("Add User..."),
      offd("Add Directory..."),
      { label: "Delete", shortcut: "Del", action: () => (number.value = "") },
      separator(),
      offd("Options..."),
    ],
    View: [
      offd("Call Log..."),
      separator(),
      offd("Toolbars", { checked: true }),
      offd("Text Labels", { checked: true }),
      offd("Status Bar", { checked: true }),
      offd("Hide When Minimized"),
      separator(),
      offd("Show Names With Conference Video"),
      offd("Full Size Conference Video"),
      offd("Selected Conference Video Scale", { submenu: [] }),
      separator(),
      { label: "Refresh", shortcut: "F5", action: () => {} },
    ],
    Phone: [
      { label: "Dial...", action: dialNow },
      offd("Redial", { submenu: [] }),
      offd("Speed Dial", { submenu: [] }),
      separator(),
      offd("New Conference..."),
      offd("Join Conference..."),
      offd("Leave Conference"),
    ],
    Windows: [
      offd("Hide Call Windows"),
      offd("Call Windows", { submenu: [] }),
      separator(),
      offd("Windows"),
    ],
    Help: [
      { label: "Content and Index", action: () => ctx.launch("help", { topic: "dialer" }) },
      separator(),
      { label: "About Phone Dialer...", action: () => ctx.dialogs.message("Phone Dialer\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1996-1999 Microsoft Corp.", { title: "About Phone Dialer", icon: "network" }) },
    ],
  });
  w.setContent(
    el(
      "div",
      { class: "dialog-padding dialer" },
      field("Number:", number),
      keys,
      el(
        "div",
        { class: "dialog-buttons" },
        button("Dial", dial, { class: "default-button" }),
        button("Clear", () => (number.value = "")),
      ),
    ),
  );
  return w;
}

export function openSynchronize(ctx) {
  const k = kit(0, 0),
    w = refWindow(ctx, {
      title: "Items to Synchronize",
      icon: "network",
      width: 391,
      height: 434,
      x: 316,
      y: 153,
      appId: "synchronize",
      help: true,
    });
  let enabled = true,
    updated = "";
  const stamp = el("div", {
    class: "rk-text",
    style: { left: "239px", top: "164px", width: "100px", whiteSpace: "nowrap" },
  });
  const synchronize = async () => {
    await ctx.fs.queue;
    updated = new Date().toLocaleString();
    stamp.textContent = updated;
    ctx.log("Information", "Synchronize", "All virtual disk transactions completed.");
  };
  const list = k.sunken(15, 126, 362, 209);
  list.style.background = "#fff";
  list.append(
    el("div", { class: "sync-head", style: { left: "0", top: "0", width: "222px" }, text: "Name" }),
    el("div", { class: "sync-head", style: { left: "222px", top: "0", width: "111px" }, text: "Last Updated" }),
    el("div", { class: "sync-head", style: { left: "333px", top: "0", width: "24px" } }),
  );
  list.style.cssText += ";";
  const row = el("div", { class: "sync-folder" }, el("img", { src: "/assets/ui/sync/folder.png", alt: "" }), el("span", { text: "Offline Web Pages" }));
  const box = el("span", { class: "sync-box on", role: "checkbox", "aria-checked": "true", tabindex: 0 });
  const toggle = () => {
    enabled = !enabled;
    box.classList.toggle("on", enabled);
    box.setAttribute("aria-checked", enabled);
  };
  box.addEventListener("click", toggle);
  box.addEventListener("keydown", (e) => e.key === " " && (e.preventDefault(), toggle()));
  const item = el(
    "div",
    { class: "sync-item" },
    box,
    el("img", { src: "/assets/ui/sync/page.png", alt: "" }),
    el("span", { text: "My Current Home Page" }),
  );
  list.append(row, item, stamp);
  stamp.style.cssText = "left:221px;top:41px;width:110px;white-space:nowrap";
  w.place(
    k.img(16, 36, "/assets/ui/sync/hdr.png", 30, 32),
    k.text(58, 37, "To ensure that you have the most current data when working\noffline, you can have Windows synchronize the data on your\ncomputer and the data on the network so that both are up to date.", { w: 320 }),
    k.text(14, 105, "Select the check box for any items you want to synchronize."),
    list,
    k.btn(301, 339, 75, 23, "Properties", { disabled: true }),
    k.btn(124, 398, 75, 23, "Synchronize", {
      onclick: () => (enabled ? synchronize() : ctx.dialogs.message("Select an item to synchronize.", { title: "Items to Synchronize", icon: "info" })),
    }),
    k.btn(220, 398, 75, 23, "Setup...", { onclick: () => ctx.launch("control", { page: "internet" }) }),
    k.btn(301, 398, 75, 23, "Close", { onclick: () => w.close() }),
  );
  return w;
}
