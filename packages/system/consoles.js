import { el, tabs, icon } from "../ui/index.js";

/** Generic MMC-style console: [{ n, rows: [[col...]] , cols }] tree with a list pane. */
function openConsole(ctx, { title, ico, appId, root, tree, size = [640, 460], menus = {} }) {
  const w = ctx.wm.create({ title, icon: ico, width: size[0], height: size[1], x: 120, y: 60, appId });
  let node = tree[0], sel = null;
  const treeEl = el("div", { class: "svc-tree" }), head = el("div", { class: "svc-title" }), list = el("div", { class: "svc-list" });
  const drawTree = () => {
    const rows = [el("div", { class: "svc-node", text: root })];
    const add = (n, d) => {
      rows.push(el("div", { class: "svc-node sub" + (n === node ? " cur" : ""), style: { marginLeft: 16 * d + "px" }, text: n.n, onclick: () => ((node = n), (sel = null), draw()) }));
      (n.c || []).forEach((c) => add(c, d + 1));
    };
    tree.forEach((n) => add(n, 1));
    treeEl.replaceChildren(...rows);
  };
  const draw = () => {
    drawTree();
    head.textContent = node.n;
    const cols = node.cols || ["Name", "Description"];
    list.replaceChildren(
      el(
        "table",
        {},
        el("thead", {}, el("tr", {}, ...cols.map((h) => el("th", { text: h })))),
        el("tbody", {}, ...(node.rows || []).map((r) => el("tr", { class: sel === r ? "sel" : "", onclick: (e) => { sel = r; draw(); }, ondblclick: () => r.open?.() }, ...cols.map((_, i) => el("td", {}, ...(i === 0 && node.ico ? [icon(node.ico)] : []), String(r[i] ?? "")))))),
      ),
    );
  };
  w.setMenu({ Action: [{ label: "Refresh", action: draw }, { label: "Help", action: () => ctx.launch("help") }], View: [{ label: "Large Icons", action: () => {} }, { label: "Details", action: draw }], ...menus, Help: [{ label: "Help Topics", action: () => ctx.launch("help") }] });
  w.setContent(el("div", { class: "svc-root" }, treeEl, el("div", { class: "svc-right" }, head, el("div", { class: "svc-split cons" }, list))));
  draw();
  return w;
}
const P = (name, setting) => [name, setting];

export function openLocalSecurityPolicy(ctx) {
  const pol = (n, rows) => ({ n, cols: ["Policy", "Local Setting", "Effective Setting"], rows: rows.map(([a, b]) => [a, b, b]) });
  return openConsole(ctx, {
    title: "Local Security Settings", ico: "adminSecPol", appId: "secpol", root: "Security Settings",
    tree: [
      { n: "Account Policies", c: [
        pol("Password Policy", [P("Enforce password history", "0 passwords remembered"), P("Maximum password age", "42 days"), P("Minimum password age", "0 days"), P("Minimum password length", "0 characters"), P("Passwords must meet complexity requirements", "Disabled"), P("Store password using reversible encryption for all users in the domain", "Disabled")]),
        pol("Account Lockout Policy", [P("Account lockout duration", "Not defined"), P("Account lockout threshold", "0 invalid logon attempts"), P("Reset account lockout counter after", "Not defined")]),
      ] },
      { n: "Local Policies", c: [
        pol("Audit Policy", [P("Audit account logon events", "No auditing"), P("Audit account management", "No auditing"), P("Audit logon events", "No auditing"), P("Audit object access", "No auditing"), P("Audit policy change", "No auditing"), P("Audit privilege use", "No auditing"), P("Audit process tracking", "No auditing"), P("Audit system events", "No auditing")]),
        pol("User Rights Assignment", [P("Access this computer from the network", "Everyone,Users,Power Users,Backup Operators,Administrators"), P("Back up files and directories", "Backup Operators,Administrators"), P("Change the system time", "Power Users,Administrators"), P("Log on locally", "Guest,TsInternetUser,IUSR_COMPUTER,Users,Power Users,Backup Operators,Administrators"), P("Shut down the system", "Users,Power Users,Backup Operators,Administrators")]),
        pol("Security Options", [P("Additional restrictions for anonymous connections", "None. Rely on default permissions"), P("Allow system to be shut down without having to log on", "Enabled"), P("Clear virtual memory pagefile when system shuts down", "Disabled"), P("Do not display last user name in logon screen", "Disabled"), P("Rename administrator account", "Not defined"), P("Unsigned driver installation behavior", "Warn but allow installation")]),
      ] },
      { n: "Public Key Policies", rows: [["Encrypted Data Recovery Agents", "Administrator"], ["Trusted Root Certification Authorities", ""]], cols: ["Name", "Description"] },
      { n: "IP Security Policies on Local Machine", cols: ["Name", "Description", "Policy Assigned"], rows: [["Client (Respond Only)", "Communicate normally (unsecured). Use the default response rule to negotiate with servers that request security.", "No"], ["Secure Server (Require Security)", "For all IP traffic, always require security using Kerberos trust. Do not allow unsecured communication with untrusted clients.", "No"], ["Server (Request Security)", "For all IP traffic, always request security using Kerberos trust. Allow unsecured communication with clients that do not respond to the request.", "No"]] },
    ],
  });
}

export function openComponentServices(ctx) {
  return openConsole(ctx, {
    title: "Component Services", ico: "adminCompSvc", appId: "compsvc", root: "Console Root",
    tree: [{ n: "Component Services", c: [{ n: "Computers", c: [{ n: "My Computer", cols: ["Name", "Description"], rows: [["COM+ Applications", "Manage COM+ applications"], ["DCOM Config", "Configure DCOM applications"], ["Running Processes", "Monitor running processes"], ["Distributed Transaction Coordinator", "Manage distributed transactions"]] }] }], cols: ["Name", "Description"], rows: [["Computers", "Manage computers"]] }],
    size: [700, 470],
  });
}

export function openOdbc(ctx) {
  const w = ctx.wm.create({ title: "ODBC Data Source Administrator", icon: "adminOdbc", width: 441, height: 366, x: 250, y: 110, appId: "odbc", dialog: true, resizable: false });
  const row = (a, b, c) => el("tr", {}, el("td", { text: a }), el("td", { text: b }));
  const tableOf = (rows) => el("div", { class: "odbc-list" }, el("table", {}, el("thead", {}, el("tr", {}, el("th", { text: "Name" }), el("th", { text: "Driver" }))), el("tbody", {}, ...rows.map(([a, b]) => row(a, b)))));
  const btns = (...n) => el("div", { class: "odbc-btns" }, ...n.map((t) => el("button", { text: t })));
  const page = (head, rows, b) => el("div", { class: "odbc-page" }, el("div", { text: head }), tableOf(rows), btns(...b));
  const drivers = ["Microsoft Access Driver (*.mdb)", "Microsoft dBase Driver (*.dbf)", "Microsoft Excel Driver (*.xls)", "Microsoft Text Driver (*.txt; *.csv)", "SQL Server"];
  const t = tabs([
    { label: "User DSN", content: () => page("User Data Sources:", [["MQIS", "SQL Server"]], ["Add...", "Remove", "Configure..."]) },
    { label: "System DSN", content: () => page("System Data Sources:", [], ["Add...", "Remove", "Configure..."]) },
    { label: "File DSN", content: () => page("Look in: C:\\Program Files\\Common Files\\ODBC\\Data Sources", [], ["Add...", "Remove", "Configure...", "Set Directory..."]) },
    { label: "Drivers", content: () => page("ODBC Drivers that are installed on your system:", drivers.map((d) => [d, "4.00.5000.00"]), []) },
    { label: "Tracing", content: () => el("div", { class: "odbc-page", text: "When to trace\n\n[Start Tracing Now]   Log file Path: C:\\SQL.LOG" }) },
    { label: "Connection Pooling", content: () => el("div", { class: "odbc-page", text: "Pool timeout and retry wait time settings for ODBC drivers." }) },
    { label: "About", content: () => el("div", { class: "odbc-page", text: "ODBC Core Components\nMicrosoft Data Access Components 2.5 SP2\nODBC32.DLL 3.510" }) },
  ]);
  w.setContent(el("div", { class: "svc-dlg" }, t, el("div", { class: "svc-ok" }, ...["OK", "Cancel", "Apply", "Help"].map((x) => el("button", { text: x, onclick: () => x !== "Apply" && x !== "Help" ? w.close() : x === "Help" && ctx.launch("help") })))));
  return w;
}

export function openTelnetAdmin(ctx) {
  const w = ctx.wm.create({ title: "Telnet Server Admin", icon: "adminTelnet", width: 640, height: 300, x: 100, y: 100, appId: "telnet" });
  w.setContent(el("div", { class: "tn-root", text: "Telnet Server Admin\n\n\t0) Quit this application\n\t1) List the current users\n\t2) Terminate a user session\n\t3) Display / change registry settings\n\t4) Start the service\n\t5) Stop the service\n\nSelect an option >" }));
  return w;
}

export function openAddNetworkPlace(ctx) {
  const w = ctx.wm.create({ title: "Add Network Place Wizard", icon: "netAdd", width: 503, height: 385, x: 260, y: 140, appId: "addnet", dialog: true, resizable: false });
  const input = el("input", { class: "full", placeholder: "http://" });
  w.setContent(
    el("div", { class: "svc-dlg anp" },
      el("h3", { text: "Where do you want to create this network place?" }),
      el("p", { text: "Type the address of the Web site, network location, or FTP site for this shortcut." }),
      el("label", { text: "Internet or network address:" }), input,
      el("div", { class: "svc-ok" },
        el("button", { text: "< Back", disabled: true }),
        el("button", { text: "Next >", onclick: async () => { const v = input.value.trim(); if (!v) return ctx.dialogs.message("You must specify a location.", { title: "Add Network Place Wizard", icon: "warning" }); ctx.launch("ie", { url: v }); w.close(); } }),
        el("button", { text: "Cancel", onclick: () => w.close() }),
      ),
    ),
  );
  return w;
}
