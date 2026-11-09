import { el, tabs, icon } from "../ui/index.js";

// Default service set of Windows 2000 Professional: [display, description, status, startup, logon, service name, image path]
const S = (display, name, desc, run, start, logon = "LocalSystem", path = "C:\\WINNT\\system32\\services.exe") => ({ display, name, desc, run, start, logon, path });
const SERVICES = [
  S("Alerter", "Alerter", "Notifies selected users and computers of administrative alerts.", false, "Manual", "NT AUTHORITY\\LocalService", "C:\\WINNT\\System32\\services.exe"),
  S("Application Management", "AppMgmt", "Provides software installation services such as Assign, Publish, and Remove.", false, "Manual"),
  S("Automatic Updates", "wuauserv", "Enables the download and installation of critical Windows updates.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\svchost.exe -k netsvcs"),
  S("ClipBook", "ClipSrv", "Supports ClipBook Viewer, which allows pages to be seen by remote ClipBooks.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\clipsrv.exe"),
  S("COM+ Event System", "EventSystem", "Provides automatic distribution of events to subscribing COM components.", true, "Manual", "LocalSystem", "C:\\WINNT\\system32\\svchost.exe -k netsvcs"),
  S("Computer Browser", "Browser", "Maintains an up-to-date list of computers on your network and supplies the list to programs that request it.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\services.exe"),
  S("DHCP Client", "Dhcp", "Manages network configuration by registering and updating IP addresses and DNS names.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\services.exe"),
  S("Distributed Link Tracking Client", "TrkWks", "Sends notifications of files moving between NTFS volumes in a network domain.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\services.exe"),
  S("Distributed Transaction Coordinator", "MSDTC", "Coordinates transactions that span multiple resource managers, such as databases, message queues, and file systems.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\msdtc.exe"),
  S("DNS Client", "Dnscache", "Resolves and caches Domain Name System (DNS) names.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\services.exe"),
  S("Event Log", "Eventlog", "Logs event messages issued by programs and Windows 2000. Event Log reports can be viewed in Event Viewer.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\services.exe"),
  S("Fax Service", "Fax", "Helps you send and receive faxes.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\faxsvc.exe"),
  S("IIS Admin Service", "IISADMIN", "Allows administration of Web and FTP services through the Internet Information Services snap-in.", false, "Manual", "LocalSystem", "C:\\WINNT\\System32\\inetsrv\\inetinfo.exe"),
  S("Indexing Service", "cisvc", "Indexes contents and properties of files on local and remote computers; provides rapid access to files through flexible querying language.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\cisvc.exe"),
  S("Internet Connection Sharing", "SharedAccess", "Provides network address translation, addressing, and name resolution services for all computers on your home network through a dial-up connection.", false, "Manual"),
  S("IPSEC Policy Agent", "PolicyAgent", "Manages IP security policy and starts the ISAKMP/Oakley (IKE) and the IP security driver.", true, "Automatic"),
  S("Logical Disk Manager", "dmserver", "Logical Disk Manager Watchdog Service", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\svchost.exe -k netsvcs"),
  S("Logical Disk Manager Administrative Service", "dmadmin", "Administrative service for disk management requests", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\dmadmin.exe /com"),
  S("Messenger", "Messenger", "Sends and receives messages transmitted by administrators or by the Alerter service.", true, "Automatic"),
  S("Net Logon", "Netlogon", "Supports pass-through authentication of account logon events for computers in a domain.", false, "Manual"),
  S("NetMeeting Remote Desktop Sharing", "mnmsrvc", "Allows authorized people to remotely access your Windows desktop using NetMeeting.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\mnmsrvc.exe"),
  S("Network Connections", "Netman", "Manages objects in the Network and Dial-Up Connections folder, in which you can view both LAN and remote connections.", true, "Manual"),
  S("Network DDE", "NetDDE", "Provides network transport and security for Dynamic Data Exchange (DDE) for programs running on the same computer or on different computers.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\netdde.exe"),
  S("Network DDE DSDM", "NetDDEdsdm", "Manages shared dynamic data exchange and is used by Network DDE.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\netdde.exe"),
  S("Plug and Play", "PlugPlay", "Manages device installation and configuration and notifies programs of device changes.", true, "Automatic"),
  S("Print Spooler", "Spooler", "Loads files to memory for later printing.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\spoolsv.exe"),
  S("Protected Storage", "ProtectedStorage", "Provides protected storage for sensitive data, such as private keys, to prevent access by unauthorized services, processes, or users.", true, "Automatic"),
  S("QoS RSVP", "RSVP", "Provides network signaling and local traffic control setup functionality for QoS-aware programs and control applets.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\rsvp.exe"),
  S("Remote Access Auto Connection Manager", "RasAuto", "Creates a connection to a remote network whenever a program references a remote DNS or NetBIOS name or address.", false, "Manual"),
  S("Remote Access Connection Manager", "RasMan", "Creates a network connection.", true, "Manual"),
  S("Remote Procedure Call (RPC)", "RpcSs", "Provides the endpoint mapper and other miscellaneous RPC services.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\svchost.exe -k rpcss"),
  S("Remote Procedure Call (RPC) Locator", "RpcLocator", "Manages the RPC name service database.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\locator.exe"),
  S("Remote Registry Service", "RemoteRegistry", "Allows remote registry manipulation.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\regsvc.exe"),
  S("Removable Storage", "NtmsSvc", "Manages removable media, drives, and libraries.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\svchost.exe -k netsvcs"),
  S("Routing and Remote Access", "RemoteAccess", "Offers routing services to businesses in local area and wide area network environments.", false, "Disabled"),
  S("RunAs Service", "seclogon", "Enables starting processes under alternate credentials.", true, "Automatic"),
  S("Security Accounts Manager", "SamSs", "Stores security information for local user accounts.", true, "Automatic"),
  S("Server", "lanmanserver", "Provides RPC support, file, print, and named pipe sharing.", true, "Automatic"),
  S("System Event Notification", "SENS", "Tracks system events such as Windows logon, network, and power events. Notifies COM+ Event System subscribers of these events.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\svchost.exe -k netsvcs"),
  S("Task Scheduler", "Schedule", "Enables a user to configure and schedule automated tasks on this computer.", true, "Automatic", "LocalSystem", "C:\\WINNT\\system32\\mstask.exe"),
  S("TCP/IP NetBIOS Helper Service", "LmHosts", "Enables support for NetBIOS over TCP/IP (NetBT) service and NetBIOS name resolution.", true, "Automatic"),
  S("Telephony", "TapiSrv", "Provides Telephony API (TAPI) support for programs that control telephony devices and IP based voice connections on the local computer.", true, "Manual"),
  S("Telnet", "TlntSvr", "Allows a remote user to log on to this computer and run programs, and supports various TCP/IP Telnet clients.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\tlntsvr.exe"),
  S("Windows Installer", "MSIServer", "Installs, repairs and removes software according to instructions contained in .MSI files.", false, "Manual", "LocalSystem", "C:\\WINNT\\system32\\msiexec.exe /V"),
  S("Windows Management Instrumentation", "WinMgmt", "Provides system management information.", true, "Automatic", "LocalSystem", "C:\\WINNT\\System32\\WBEM\\WinMgmt.exe"),
  S("Windows Time", "W32Time", "Sets the computer clock.", false, "Manual"),
  S("Workstation", "lanmanworkstation", "Provides network connections and communications.", true, "Automatic"),
];
SERVICES.sort((a, b) => a.display.localeCompare(b.display));

/** Services console (services.msc). */
export function openServices(ctx) {
  const w = ctx.wm.create({ title: "Services", icon: "adminServices", width: 640, height: 480, x: 110, y: 60, appId: "services" });
  let sel = null, view = "extended";
  const tbody = el("tbody");
  const side = el("div", { class: "svc-side" });
  const select = (s, tr) => {
    sel = s;
    tbody.querySelectorAll("tr.sel").forEach((r) => r.classList.remove("sel"));
    tr.classList.add("sel");
    renderSide();
  };
  const render = () => {
    tbody.replaceChildren(
      ...SERVICES.map((s) => {
        const tr = el(
          "tr",
          { class: sel === s ? "sel" : "", onclick: () => select(s, tr), ondblclick: () => props(s) },
          el("td", {}, icon("adminServices"), s.display),
          el("td", { text: s.desc }),
          el("td", { text: s.run ? "Started" : "" }),
          el("td", { text: s.start }),
          el("td", { text: s.logon }),
        );
        return tr;
      }),
    );
    renderSide();
  };
  const renderSide = () => {
    side.replaceChildren(
      ...(sel
        ? [
            el("b", { text: sel.display }),
            el("div", { class: "svc-links" }, ...(sel.run ? [el("a", { text: "Stop", onclick: () => toggle(sel, false) }), " the service ", el("br"), el("a", { text: "Restart", onclick: () => (toggle(sel, false), toggle(sel, true)) }), " the service"] : [el("a", { text: "Start", onclick: () => toggle(sel, true) }), " the service"])),
            el("div", { class: "svc-desc", text: "Description:\n" + sel.desc }),
          ]
        : [el("b", { text: "Services (Local)" }), el("div", { class: "svc-desc", text: "Select an item to view its description." })]),
    );
    root.classList.toggle("std", view === "standard");
  };
  const toggle = (s, run) => {
    if (s.start === "Disabled" && run) return ctx.dialogs.message("Could not start the " + s.display + " service on Local Computer.\nError 1058: The service cannot be started, either because it is disabled or because it has no enabled devices associated with it.", { title: "Services", icon: "error" });
    s.run = run;
    ctx.events?.push({ time: Date.now(), level: "Information", source: "Service Control Manager", message: `The ${s.display} service entered the ${run ? "running" : "stopped"} state.` });
    render();
  };
  const props = (s) => {
    const d = ctx.wm.create({ title: s.display + " Properties (Local Computer)", icon: "adminServices", width: 365, height: 437, appId: "svcprops", dialog: true, resizable: false });
    const startSel = el("select", { class: "svc-select" }, ...["Automatic", "Manual", "Disabled"].map((o) => el("option", { text: o, selected: o === s.start })));
    const status = el("span", { text: s.run ? "Started" : "Stopped" });
    const btn = (label, fn) => el("button", { text: label, onclick: fn });
    const general = () =>
      el(
        "div",
        { class: "svc-gen" },
        el("div", { class: "r" }, el("label", { text: "Service name:" }), el("span", { text: s.name })),
        el("div", { class: "r" }, el("label", { text: "Display name:" }), el("input", { value: s.display, readonly: true })),
        el("div", { class: "r" }, el("label", { text: "Description:" }), el("textarea", { readonly: true, text: s.desc })),
        el("div", { class: "r" }, el("label", { text: "Path to executable:" })),
        el("input", { class: "full", value: s.path, readonly: true }),
        el("div", { class: "r" }, el("label", { text: "Startup type:" }), startSel),
        el("hr"),
        el("div", { class: "r" }, el("label", { text: "Service status:" }), status),
        el("div", { class: "svc-btns" }, btn("Start", () => (toggle(s, true), (status.textContent = s.run ? "Started" : "Stopped"))), btn("Stop", () => (toggle(s, false), (status.textContent = "Stopped"))), btn("Pause", () => {}), btn("Resume", () => {})),
        el("div", { class: "r", text: "You can specify the start parameters that apply when you start the service from here." }),
        el("div", { class: "r" }, el("label", { text: "Start parameters:" }), el("input", {})),
      );
    const t = tabs([
      { label: "General", content: general },
      { label: "Log On", content: () => el("div", { class: "svc-gen", text: "Log on as: " + s.logon }) },
      { label: "Recovery", content: () => el("div", { class: "svc-gen", text: "Select the computer's response if this service fails." }) },
      { label: "Dependencies", content: () => el("div", { class: "svc-gen", text: "Some services depend on other services, system drivers or load order groups." }) },
    ]);
    const done = (apply) => {
      if (apply) s.start = startSel.value;
      render();
    };
    d.setContent(el("div", { class: "svc-dlg" }, t, el("div", { class: "svc-ok" }, btn("OK", () => (done(true), d.close())), btn("Cancel", () => d.close()), btn("Apply", () => done(true)))));
  };
  w.setMenu({
    Action: [{ label: "Refresh", action: render }, { label: "Properties", action: () => sel && props(sel) }, { label: "Help", action: () => ctx.launch("help") }],
    View: [{ label: "Extended", action: () => ((view = "extended"), render()) }, { label: "Standard", action: () => ((view = "standard"), render()) }],
    Help: [{ label: "Help Topics", action: () => ctx.launch("help") }],
  });
  const root = el(
    "div",
    { class: "svc-root" },
    el("div", { class: "svc-tree" }, el("div", { class: "svc-node", text: "Console Root" }), el("div", { class: "svc-node sub", text: "Services (Local)" })),
    el("div", { class: "svc-right" }, el("div", { class: "svc-title", text: "Services (Local)" }), el("div", { class: "svc-split" }, side, el("div", { class: "svc-list" }, el("table", {}, el("thead", {}, el("tr", {}, ...["Name /", "Description", "Status", "Startup Type", "Log On As"].map((h) => el("th", { text: h })))), tbody)))),
  );
  w.setContent(root);
  render();
  return w;
}
