// System Information (msinfo32): category tree, column titles and "No ... information" texts come from msinfo32.dll strings.
import { el, separator } from "../ui/index.js";

const T = {
  cat: "Category", sub: "[ Following are sub-categories of this main category ]",
};
export function openSysInfo(ctx) {
  const w = ctx.wm.create({ title: "System Information", icon: "sysInfo", width: 700, height: 460, x: 100, y: 50, appId: "systeminfo" });
  const user = ctx.settings.get("username") || "Administrator", comp = ctx.settings.get("computerName") || "WINDOWS2000";
  const mem = Math.round((navigator.deviceMemory || 0.25) * 1024 * 1024);
  const kb = (n) => n.toLocaleString("en-US") + " KB";
  const none = (m) => ({ cols: [], rows: [], none: m });
  const tbl = (cols, rows, none) => ({ cols, rows, none });
  const cat = (n, c = [], extra = {}) => ({ n, c, ...extra });
  const root = cat("System Information (Local)", [
    cat("System Summary", [], tbl(["Item", "Value"], [
      ["OS Name", "Microsoft Windows 2000 Professional"], ["Version", "5.0.2195 Service Pack 4 Build 2195"], ["OS Manufacturer", "Microsoft Corporation"],
      ["System Name", comp], ["System Manufacturer", "Browser"], ["System Model", "Virtual Machine"], ["System Type", "X86-based PC"],
      ["Processor", `x86 compatible, ${navigator.hardwareConcurrency || 1} logical processor(s)`], ["BIOS Version", "Windows2000 BIOS"],
      ["Windows Directory", "C:\\WINNT"], ["System Directory", "C:\\WINNT\\system32"], ["Boot Device", "\\Device\\Harddisk0\\Partition1"],
      ["Country Code", "1"], ["User Name", `${comp}\\${user}`], ["Time Zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
      ["Total Physical Memory", kb(mem)], ["Available Physical Memory", kb(Math.round(mem * 0.58))], ["Total Virtual Memory", kb(Math.round(mem * 2.1))],
      ["Available Virtual Memory", kb(Math.round(mem * 1.5))], ["Page File Space", kb(Math.round(mem * 1.5))], ["Page File", "C:\\pagefile.sys"],
    ])),
    cat("Hardware Resources", [
      cat("Conflicts/Sharing", [], tbl(["Resource", "Device"], [], "No conflicted/shared resources")),
      cat("DMA", [], tbl(["Channel", "Device", "Port", "Status"], [["2", "Standard floppy disk controller", "", "OK"], ["4", "Direct memory access controller", "", "OK"]])),
      cat("Forced Hardware", [], tbl(["Device", "PNP Device ID"], [], "No Forced Hardware")),
      cat("I/O", [], tbl(["Address Range", "Device", "Status"], [["0x00000000-0x0000000F", "Direct memory access controller", "OK"], ["0x00000060-0x00000060", "Standard 101/102-Key or Microsoft Natural PS/2 Keyboard", "OK"], ["0x000003F0-0x000003F5", "Standard floppy disk controller", "OK"]])),
      cat("IRQs", [], tbl(["IRQ Number", "Device", "Vector", "Status"], [["0", "System timer", "0", "OK"], ["1", "Standard 101/102-Key or Microsoft Natural PS/2 Keyboard", "1", "OK"], ["12", "PS/2 Compatible Mouse", "12", "OK"]])),
      cat("Memory", [], tbl(["Range", "Device", "Memory Type", "Status"], [["0x000A0000-0x000BFFFF", "PCI bus", "Not Available", "OK"], ["0x000C0000-0x000CFFFF", "Video BIOS", "Not Available", "OK"]])),
    ]),
    cat("Components", [
      cat("Multimedia", [
        cat("Audio Codecs", [], tbl(["Codec", "Manufacturer", "Description", "Status", "File", "Version", "Size", "Creation Date"], [["msadp32.acm", "Microsoft Corporation", "Microsoft ADPCM", "OK", "C:\\WINNT\\system32\\msadp32.acm", "5.00.2134.1", "15,872 bytes", "12/7/1999"], ["imaadp32.acm", "Microsoft Corporation", "IMA ADPCM", "OK", "C:\\WINNT\\system32\\imaadp32.acm", "5.00.2134.1", "19,456 bytes", "12/7/1999"]])),
        cat("Video Codecs", [], tbl(["Codec", "Manufacturer", "Description", "Status", "File", "Version", "Size", "Creation Date"], [["msvidc32.dll", "Microsoft Corporation", "Microsoft Video 1", "OK", "C:\\WINNT\\system32\\msvidc32.dll", "5.00.2195.1600", "27,408 bytes", "12/7/1999"]])),
        cat("CD-ROM", [], tbl(["Item", "Value"], [["Drive", "D:"], ["Description", "CD-ROM Drive"], ["Media Loaded", "Yes"], ["Media Type", "CD-ROM"], ["Name", "Virtual CD-ROM"], ["Manufacturer", "(Standard CD-ROM drives)"], ["Status", "OK"], ["Transfer Rate", "-1.00 kbytes/sec"]])),
        cat("Sound Device", [], tbl(["Item", "Value"], [["Name", "Web Audio"], ["Manufacturer", "Browser"], ["Status", "OK"], ["Driver", "wdmaud.drv"]])),
      ], tbl(["Item", "Value"], [])),
      cat("Display", [], tbl(["Item", "Value"], [["Name", "Browser Display Adapter"], ["Adapter Type", ctx.renderer?.surface?.backend ? ctx.renderer.surface.backend + " compatible" : "Canvas compatible"], ["Adapter Description", "Browser Display Adapter"], ["Adapter RAM", "Not Available"], ["Installed Drivers", "vga.dll"], ["Color Resolution", "4294967296 colors"], ["Bits/Pixel", String(screen.colorDepth || 32)], ["Pixels/Logical X Inch", "96"], ["Pixels/Logical Y Inch", "96"], ["Screen Width", innerWidth + " pixels"], ["Screen Height", innerHeight + " pixels"]])),
      cat("Infrared", [], tbl(["Item", "Value"], [], "No infrared devices")),
      cat("Input", [
        cat("Keyboard", [], tbl(["Item", "Value"], [["Description", "Standard 101/102-Key or Microsoft Natural PS/2 Keyboard"], ["Name", "Enhanced (101- or 102-key)"], ["Layout", "00000409"], ["NumberOfFunctionKeys", "12"]])),
        cat("Pointing Device", [], tbl(["Item", "Value"], [["Hardware Type", "PS/2 Compatible Mouse"], ["Number of Buttons", "3"], ["Power Management Supported", "No"], ["Double Click Threshold", "4"], ["Handedness", "Right Handed Operation"]])),
      ], tbl(["Item", "Value"], [])),
      cat("Modem", [], tbl(["Item", "Value"], [], "No modems")),
      cat("Network", [
        cat("Adapter", [], tbl(["Item", "Value"], [["Name", "[00000001] AMD PCNET Family PCI Ethernet Adapter"], ["Adapter Type", "Ethernet 802.3"], ["Product Name", "AMD PCNET Family PCI Ethernet Adapter"], ["Installed", "Yes"], ["Service Name", "PCnet"], ["IP Address", "192.168.0.2"], ["IP Subnet", "255.255.255.0"], ["Default IP Gateway", "192.168.0.1"], ["DHCP Enabled", "No"], ["MAC Address", "00:0C:29:00:00:01"]])),
        cat("Protocol", [], tbl(["Item", "Value"], [["Name", "MSAFD Tcpip [TCP/IP]"], ["Protocol", "TCP/IP"], ["GuaranteesDelivery", "Yes"], ["GuaranteesSequencing", "Yes"], ["MaximumMessageSize", "0"], ["SupportsBroadcasting", "No"]])),
        cat("WinSock", [], tbl(["Item", "Value"], [["File", "C:\\WINNT\\system32\\wsock32.dll"], ["Size", "21,776 bytes"]])),
      ], tbl(["Item", "Value"], [])),
      cat("Ports", [
        cat("Serial", [], tbl(["Item", "Value"], [["Name", "Communications Port (COM1)"], ["Baud Rate", "9600"], ["Bits/Byte", "8"], ["Stop Bits", "1"], ["Parity", "None"]])),
        cat("Parallel", [], tbl(["Item", "Value"], [["Name", "Printer Port (LPT1)"], ["Status", "OK"]])),
      ], tbl(["Item", "Value"], [])),
      cat("Storage", [
        cat("Drives", [], tbl(["Item", "Value"], [["Drive", "A:"], ["Description", "3 1/2 Inch Floppy Drive"], ["", ""], ["Drive", "C:"], ["Description", "Local Fixed Disk"], ["Compressed", "No"], ["File System", "NTFS"], ["Volume Name", "Windows2000"], ["", ""], ["Drive", "D:"], ["Description", "CD-ROM Disc"]])),
        cat("SCSI", [], tbl(["Item", "Value"], [], "No SCSI information")),
      ], tbl(["Item", "Value"], [])),
      cat("Printing", [], tbl(["Name", "Driver Name", "Port Name", "Server Name"], [], "No printing information")),
      cat("Problem Devices", [], tbl(["Device", "PNP Device ID", "Error Code"], [], "No Problem Devices")),
      cat("USB", [], tbl(["Device", "PNP Device ID"], [], "No USB Devices")),
    ], tbl(["Item", "Value"], [])),
    cat("Software Environment", [
      cat("Drivers", [], tbl(["Name", "Description", "File", "Type", "Started", "Start Mode", "State", "Status"], [["Beep", "Beep", "C:\\WINNT\\System32\\Drivers\\Beep.sys", "Kernel Driver", "Yes", "System", "Running", "OK"], ["Disk", "Disk Driver", "C:\\WINNT\\System32\\drivers\\disk.sys", "Kernel Driver", "Yes", "Boot", "Running", "OK"]])),
      cat("Environment Variables", [], tbl(["Variable", "Value", "User Name"], [["ComSpec", "C:\\WINNT\\system32\\cmd.exe", "<SYSTEM>"], ["windir", "C:\\WINNT", "<SYSTEM>"], ["TEMP", "C:\\DOCUME~1\\" + user + "\\LOCALS~1\\Temp", comp + "\\" + user]])),
      cat("Jobs", [cat("Print", [], tbl(["Document", "Size", "Owner", "Status"], [], "No print jobs")), cat("Network Connections", [], tbl(["Local Name", "Remote Name", "Type", "Status", "User Name"], [], "No network connections information"))], tbl(["Item", "Value"], [])),
      cat("Running Tasks", [], tbl(["Name", "Path", "Process ID", "Priority"], [["System", "", "8", "8"], ["smss.exe", "C:\\WINNT\\System32\\smss.exe", "136", "11"], ["winlogon.exe", "C:\\WINNT\\system32\\winlogon.exe", "160", "13"], ["Explorer.exe", "C:\\WINNT\\Explorer.exe", "620", "8"]])),
      cat("Loaded Modules", [], tbl(["Name", "Version", "Size", "File Date", "Manufacturer", "Path"], [["kernel32.dll", "5.00.2195.6870", "708,880 bytes", "11/21/2003", "Microsoft Corporation", "C:\\WINNT\\system32\\kernel32.dll"], ["user32.dll", "5.00.2195.6904", "405,264 bytes", "2/3/2004", "Microsoft Corporation", "C:\\WINNT\\system32\\user32.dll"]])),
      cat("Services", [], tbl(["Display Name", "Name", "State", "Start Mode", "Service Type"], [["DHCP Client", "Dhcp", "Running", "Auto", "Share Process"], ["Event Log", "Eventlog", "Running", "Auto", "Share Process"], ["Print Spooler", "Spooler", "Running", "Auto", "Own Process"]])),
      cat("Program Groups", [], tbl(["Group Name", "User Name"], [["Accessories", comp + "\\" + user], ["Administrative Tools", comp + "\\" + user], ["Startup", comp + "\\" + user]])),
      cat("Startup Programs", [], tbl(["Program", "Command", "User Name", "Location"], [], "No startup program information")),
      cat("OLE Registration", [], tbl(["Object", "Local Server"], [["Shell Automation Service", "C:\\WINNT\\Explorer.exe"]])),
    ], tbl(["Item", "Value"], [])),
  ]);
  const expand = new Set([root, root.c[1]]);
  let node = root.c[0];
  const treeEl = el("div", { class: "svc-tree si-tree" }), head = el("div", { class: "svc-title" }), list = el("div", { class: "svc-list" });
  const draw = () => {
    const rows = [];
    const add = (n, d) => {
      const has = n.c.length;
      rows.push(el("div", { class: "svc-node sub" + (n === node ? " cur" : ""), style: { marginLeft: 12 * d + "px" }, onclick: () => { node = n; if (has) expand.has(n) ? (n === root || expand.delete(n)) : expand.add(n); draw(); } },
        el("span", { class: "si-pm", text: has ? (expand.has(n) ? "−" : "+") : "" }), n.n));
      if (has && expand.has(n)) n.c.forEach((c) => add(c, d + 1));
    };
    add(root, 0);
    treeEl.replaceChildren(...rows);
    head.textContent = node.n;
    let body;
    if (node.rows && (node.rows.length || node.none === undefined) && node.cols?.length && node.rows.length) {
      body = el("table", {}, el("thead", {}, el("tr", {}, ...node.cols.map((h) => el("th", { text: h })))), el("tbody", {}, ...node.rows.map((r) => el("tr", {}, ...node.cols.map((_, i) => el("td", { text: r[i] ?? "" }))))));
    } else if (node.none) body = el("div", { class: "si-none", text: node.none });
    else body = el("table", {}, el("thead", {}, el("tr", {}, el("th", { text: T.cat }))), el("tbody", {}, ...(node.c.length ? [el("tr", {}, el("td", { text: T.sub })), ...node.c.map((c) => el("tr", { onclick: () => { node = c; expand.add(c); draw(); } }, el("td", { text: c.n })))] : [])));
    list.replaceChildren(body);
  };
  const text = () => { const out = []; const walk = (n, p) => { out.push("[" + n.n + "]"); (n.rows || []).forEach((r) => out.push(r.join("\t"))); out.push(""); n.c.forEach((c) => walk(c)); }; walk(root); return "System Information report written at: " + new Date().toLocaleString() + "\n\n" + out.join("\n"); };
  const save = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text()], { type: "text/plain" })); a.download = "System Information.txt"; a.click(); };
  const dis = (label) => ({ label, disabled: true });
  w.setMenu({
    Action: [
      dis("Open System Information File..."),
      dis("Save As System Information File..."),
      { label: "Save As Text File...", action: save },
      separator(),
      { label: "Find...", action: async () => { const q = await ctx.dialogs.prompt("Find what:", "", { title: "Find" }); if (!q) return; const hit = (n) => (n.n.toLowerCase().includes(q.toLowerCase()) ? n : n.c.map(hit).find(Boolean)); const f = hit(root); if (f) { node = f; expand.add(root); draw(); } else ctx.dialogs.message(`Data item ${q} not found.  Recheck your spelling or start your search from the beginning and retry.`, { title: "System Information" }); } },
      { label: "Print...", action: () => ctx.printText?.(text(), "System Information") },
      separator(),
      { label: "Close", action: () => w.close() },
    ],
    View: [
      { label: "Basic", checked: true, action: () => {} },
      dis("Advanced"),
      separator(),
      { label: "Refresh", shortcut: "F5", action: draw },
    ],
    Tools: [
      { label: "Network Connections", action: () => ctx.launch("control", { page: "network" }) },
      { label: "Device Manager", action: () => ctx.launch("devices") },
      dis("Dr. Watson"), dis("Hardware Wizard"), dis("Sigverif"), dis("Windows Report"), dis("Network Monitor"),
    ],
    Help: [
      { label: "System Information Help", action: () => ctx.launch("help", { topic: "system" }) },
      separator(),
      { label: "About System Information", action: () => ctx.dialogs.message("System Information\nVersion 5.00\n\nMicrosoft Corporation", { title: "About System Information", icon: "sysInfo" }) },
    ],
  });
  w.setContent(el("div", { class: "svc-root" }, treeEl, el("div", { class: "svc-right" }, head, el("div", { class: "svc-split cons" }, list))));
  draw();
  return w;
}
