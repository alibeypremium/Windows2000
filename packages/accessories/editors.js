import { DOCS, basename, extension, downloadFile } from "../core/index.js";
import { dialogFromTemplate } from "../ui/dlg.js";
import { NOTEPAD_DIALOGS } from "./notepad-data.js";
import {
  el,
  button,
  icon,
  toolbar,
  separator,
  checkbox,
  field,
  safely,
} from "../ui/index.js";

export function openNotepad(ctx, { path = null, text = "" } = {}) {
  let filename = path,
    saved = path ? ctx.fs.readFile(path) : text,
    wrap = false;
  const w = ctx.wm.create({
    title: (filename ? basename(filename) : "Untitled") + " - Notepad",
    icon: "notepad",
    width: 600,
    height: 411,
    x: 199,
    y: 92,
    appId: "notepad",
  });
  const input = el("textarea", {
    class: "notepad-editor",
    spellcheck: false,
    "aria-label": "Notepad text",
    wrap: "off",
    value: saved,
  });
  saved = input.value;
  const textUndo = [],
    textRedo = [];
  const recordText = () => {
    textUndo.push({
      value: input.value,
      start: input.selectionStart,
      end: input.selectionEnd,
      scroll: input.scrollTop,
    });
    let size = textUndo.reduce((n, x) => n + x.value.length, 0);
    while (textUndo.length > 1 && (textUndo.length > 100 || size > 4000000))
      size -= textUndo.shift().value.length;
    textRedo.length = 0;
  };
  const restoreText = (state) => {
    input.value = state.value;
    input.setSelectionRange(state.start, state.end);
    input.scrollTop = state.scroll;
    update();
  };
  const undoText = (redo = false) => {
    const from = redo ? textRedo : textUndo,
      to = redo ? textUndo : textRedo;
    if (from.length) {
      to.push({
        value: input.value,
        start: input.selectionStart,
        end: input.selectionEnd,
        scroll: input.scrollTop,
      });
      restoreText(from.pop());
    }
  };
  input.addEventListener("beforeinput", (e) => {
    if (e.inputType === "historyUndo" || e.inputType === "historyRedo") {
      e.preventDefault();
      undoText(e.inputType === "historyRedo");
    } else recordText();
  });
  const replaceText = (value) => {
    recordText();
    input.setRangeText(value, input.selectionStart, input.selectionEnd, "end");
    update();
  };
  const dirty = () => input.value !== saved,
    update = () =>
      w.setTitle(
          (filename ? basename(filename) : "Untitled") +
          " - Notepad",
      );
  input.addEventListener("input", update);
  const save = async (as = false) => {
    let target = filename;
    if (!target || as)
      target = await ctx.dialogs.file({
        mode: "save",
        name: target ? basename(target) : "Untitled.txt",
        normalizeName: (name) => (extension(name) ? name : name + ".txt"),
      });
    if (!target) return false;
    const snapshot = input.value;
    await ctx.fs.writeFile(target, snapshot);
    filename = target;
    saved = snapshot;
    update();
    return true;
  };
  const canDiscard = async () => {
    if (!dirty()) return true;
    const answer = await ctx.dialogs.message(
      `The text in the ${filename ? basename(filename) : "Untitled"} file has changed.\n\nDo you want to save the changes?`,
      { title: "Notepad", buttons: ["Yes", "No", "Cancel"] },
    );
    return answer === "Yes" ? (await save()) && !dirty() : answer === "No";
  };
  const newDoc = async () => {
    if (await canDiscard()) {
      filename = null;
      input.value = saved = "";
      textUndo.length = textRedo.length = 0;
      update();
      input.focus();
    }
  };
  const open = async () => {
    if (!(await canDiscard())) return;
    const p = await ctx.dialogs.file({ mode: "open" });
    if (p) {
      filename = p;
      input.value = ctx.fs.readFile(p);
      saved = input.value;
      textUndo.length = textRedo.length = 0;
      update();
    }
  };
  const edit = async (action) => {
    input.focus();
    if (action === "copy" || action === "cut") {
      const text = input.value.slice(input.selectionStart, input.selectionEnd);
      await ctx.clipboard.setText(text);
      if (action === "cut") {
        replaceText("");
      }
    } else if (action === "paste") {
      replaceText(await ctx.clipboard.getText());
    } else if (action === "delete") {
      replaceText("");
    } else if (action === "selectAll") input.select();
    else if (action === "undo") undoText();
  };
  const timeDate = () => {
    { const n = new Date(); replaceText(n.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " " + n.toLocaleDateString("en-US")); }
    input.focus();
  };
  let lastFind = "", lastCase = false, lastWhole = false, lastUp = false;
  const isWordCh = (ch) => !!ch && /[\w]/.test(ch);
  const findNext = async (parent) => {
    if (!lastFind) return false;
    const v = lastCase ? input.value : input.value.toLowerCase(),
      q = lastCase ? lastFind : lastFind.toLowerCase();
    const ok = (i) => i >= 0 && (!lastWhole || (!isWordCh(v[i - 1]) && !isWordCh(v[i + q.length])));
    let index = -1;
    if (lastUp) {
      for (let i = v.lastIndexOf(q, input.selectionStart - 1); i >= 0; i = v.lastIndexOf(q, i - 1)) if (ok(i)) { index = i; break; }
    } else {
      for (let i = v.indexOf(q, input.selectionEnd); i >= 0; i = v.indexOf(q, i + 1)) if (ok(i)) { index = i; break; }
    }
    if (index < 0) {
      await ctx.dialogs.message(`Cannot find "${lastFind}"`, { title: "Notepad", icon: "info" });
      return false;
    }
    input.setSelectionRange(index, index + q.length);
    input.focus();
    input.scrollTop = input.value.slice(0, index).split("\n").length * 16 - input.clientHeight / 2;
    return true;
  };
  const find = (replace = false) => {
    const d = dialogFromTemplate(ctx, replace ? NOTEPAD_DIALOGS.replace : NOTEPAD_DIALOGS.find, {
      appId: "find",
      values: { 1152: lastFind },
      checked: { 1040: lastWhole, 1041: lastCase, 1056: lastUp, 1057: !lastUp },
      groups: [[1056, 1057]],
      on: {
        1: () => {
          lastFind = d.ctl[1152].value;
          lastCase = d.on(1041);
          lastWhole = d.on(1040);
          lastUp = !replace && d.on(1056);
          findNext();
        },
        2: () => d.close(),
        1024: () => {
          lastFind = d.ctl[1152].value;
          lastCase = d.on(1041);
          const sel = input.value.slice(input.selectionStart, input.selectionEnd);
          if (lastFind && (lastCase ? sel === lastFind : sel.toLowerCase() === lastFind.toLowerCase())) replaceText(d.ctl[1153].value);
          findNext();
        },
        1025: () => {
          const needle = d.ctl[1152].value;
          if (!needle) return;
          recordText();
          input.value = input.value.replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), d.on(1041) ? "g" : "gi"), () => d.ctl[1153].value);
          update();
        },
        1038: () => ctx.launch("help", { topic: "notepad" }),
      },
    });
    if (replace) d.ctl[1153].value = "";
    d.ctl[1152].focus();
    d.ctl[1152].addEventListener("keydown", (e) => e.key === "Enter" && d.ctl[1]?.click?.());
    return d;
  };
  const gotoLine = async () => {
    const d = dialogFromTemplate(ctx, NOTEPAD_DIALOGS.goto, {
      appId: "goto",
      values: { 258: String(input.value.slice(0, input.selectionStart).split("\n").length) },
      on: {
        1: () => {
          const n = parseInt(d.ctl[258].value, 10);
          const lines = input.value.split("\n");
          if (!(n >= 1 && n <= lines.length)) {
            ctx.dialogs.message("The line number is beyond the total number of lines", { title: "Notepad - Goto Line", icon: "info" });
            return;
          }
          const pos = lines.slice(0, n - 1).reduce((t, l) => t + l.length + 1, 0);
          input.setSelectionRange(pos, pos);
          input.focus();
          d.close();
        },
        2: () => d.close(),
      },
    });
    d.ctl[258].focus();
    d.ctl[258].select();
  };
  const pageSetup = () => {
    const d = dialogFromTemplate(ctx, NOTEPAD_DIALOGS.pagesetup, {
      appId: "pagesetup",
      values: { 1155: "0.75", 1157: "0.75", 1156: "1", 1158: "1", 30: "&f", 31: "Page &p" },
      checked: { 1056: true },
      groups: [[1056, 1057]],
      on: { 1: () => d.close(), 2: () => d.close() },
    });
  };
  const font = () => {
    const d = ctx.wm.create({
      title: "Font",
      width: 410,
      height: 280,
      dialog: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      appId: "font",
    });
    const family = el(
        "select",
        { "aria-label": "Font" },
        ...[
          "Courier New",
          "Tahoma",
          "Arial",
          "Times New Roman",
          "monospace",
        ].map((f) => el("option", { text: f, value: f })),
      ),
      size = el("input", {
        type: "number",
        min: 8,
        max: 72,
        value: parseInt(input.style.fontSize) || 13,
        "aria-label": "Size",
      }),
      weight = el(
        "select",
        { "aria-label": "Font style" },
        el("option", { value: "normal", text: "Regular" }),
        el("option", { value: "bold", text: "Bold" }),
        el("option", { value: "italic", text: "Italic" }),
      );
    d.setContent(
      el(
        "div",
        { class: "dialog-padding" },
        field("Font:", family),
        field("Font style:", weight),
        field("Size:", size),
        el(
          "fieldset",
          {},
          el("legend", { text: "Sample" }),
          el("div", { class: "font-sample", text: "AaBbYyZz" }),
        ),
      ),
      el(
        "div",
        { class: "dialog-buttons" },
        button("OK", () => {
          input.style.fontFamily = family.value;
          input.style.fontSize =
            Math.min(72, Math.max(8, Number(size.value))) + "px";
          input.style.fontWeight = weight.value === "bold" ? "bold" : "normal";
          input.style.fontStyle =
            weight.value === "italic" ? "italic" : "normal";
          d.close();
        }),
        button("Cancel", () => d.close()),
      ),
    );
  };
  w.setMenu({
    File: [
      { label: "New", shortcut: "Ctrl+N", action: newDoc },
      { label: "Open...", shortcut: "Ctrl+O", action: open },
      { label: "Save", shortcut: "Ctrl+S", action: () => save() },
      { label: "Save As...", action: () => save(true) },
      separator(),
      { label: "Page Setup...", action: pageSetup },
      {
        label: "Print...",
        shortcut: "Ctrl+P",
        action: () =>
          ctx.printText(
            input.value,
            filename ? basename(filename) : "Untitled",
          ),
      },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: () => [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => edit("undo") },
      separator(),
      { label: "Cut", shortcut: "Ctrl+X", action: () => edit("cut") },
      { label: "Copy", shortcut: "Ctrl+C", action: () => edit("copy") },
      { label: "Paste", shortcut: "Ctrl+V", action: () => edit("paste") },
      { label: "Delete", shortcut: "Del", action: () => edit("delete") },
      separator(),
      { label: "Find...", shortcut: "Ctrl+F", action: () => find() },
      { label: "Find Next", shortcut: "F3", action: () => (lastFind ? findNext() : find()) },
      { label: "Replace...", shortcut: "Ctrl+H", action: () => find(true) },
      { label: "Go To...", shortcut: "Ctrl+G", disabled: wrap, action: gotoLine },
      separator(),
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => edit("selectAll"),
      },
      { label: "Time/Date", shortcut: "F5", action: timeDate },
    ],
    Format: () => [
      {
        label: "Word Wrap",
        checked: wrap,
        action: () => {
          wrap = !wrap;
          input.wrap = wrap ? "soft" : "off";
          input.style.whiteSpace = wrap ? "pre-wrap" : "pre";
        },
      },
      { label: "Font...", action: font },
    ],
    Help: [
      {
        label: "Help Topics",
        action: () => ctx.launch("help", { topic: "notepad" }),
      },
      {
        label: "About Notepad",
        action: () =>
          ctx.dialogs.message(
            "Notepad\nWindows 2000 text editor\n\nRead and write text files on your virtual hard drive.",
            { title: "About Notepad", icon: "notepad" },
          ),
      },
    ],
  });
  w.setContent(input);
  w.onClose = canDiscard;
  w.el.addEventListener(
    "keydown",
    safely(async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && !wrap) {
        e.preventDefault();
        gotoLine();
      }
      if (!(e.ctrlKey || e.metaKey)) {
        if (e.key === "F3") {
          e.preventDefault();
          lastFind ? findNext() : find();
        }
        if (e.key === "F5") {
          e.preventDefault();
          timeDate();
        }
        if (e.key === "Tab") {
          e.preventDefault();
          replaceText("\t");
        }
        return;
      }
      const key = e.key.toLowerCase(),
        actions = {
          z: () => undoText(e.shiftKey),
          y: () => undoText(true),
          s: () => save(e.shiftKey),
          o: open,
          n: newDoc,
          f: () => find(),
          h: () => find(true),
          p: () => ctx.printText(input.value, filename || "Untitled"),
        };
      if (actions[key]) {
        e.preventDefault();
        await actions[key]();
      }
    }),
  );
  queueMicrotask(() => input.focus());
  w.editor = input;
  w.save = save;
  return w;
}

export function openWordPad(ctx, { path = null } = {}) {
  const w = ctx.wm.create({
    title: (path ? basename(path) : "Document") + " - WordPad",
    icon: "wordpad",
    width: 768,
    height: 537,
    x: 88,
    y: 88,
    appId: "wordpad",
  });
  let filename = path,
    saved = "",
    changed = false;
  const editor = el("div", {
    class: "wordpad-page",
    contenteditable: true,
    role: "textbox",
    "aria-multiline": true,
    "aria-label": "WordPad document",
    spellcheck: true,
  });
  if (path) {
    const raw = ctx.fs.readFile(path);
    if (extension(path) === "wdoc") {
      try {
        const data = JSON.parse(raw);
        editor.innerHTML = sanitizeDocument(data.html || "");
      } catch {
        editor.textContent = raw;
      }
    } else if (extension(path) === "rtf")
      editor.textContent = raw
        .replace(/\\[a-z]+-?\d* ?/g, "")
        .replace(/[{}]/g, "");
    else editor.textContent = raw;
  }
  saved = editor.innerHTML;
  const update = () => {
    changed = editor.innerHTML !== saved;
    w.setTitle(
        (filename ? basename(filename) : "Document") +
        " - WordPad",
    );
  };
  editor.addEventListener("input", update);
  let selection = null;
  editor.addEventListener("keyup", capture);
  editor.addEventListener("mouseup", capture);
  function capture() {
    const s = window.getSelection();
    if (s.rangeCount && editor.contains(s.anchorNode))
      selection = s.getRangeAt(0).cloneRange();
  }
  const command = async (name, value = null) => {
    editor.focus();
    if (selection) {
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(selection);
    }
    if (name === "copy" || name === "cut") {
      const text = window.getSelection()?.toString() || "";
      await ctx.clipboard.setText(text);
      if (name === "cut") document.execCommand("delete");
    } else document.execCommand(name, false, value);
    capture();
    update();
  };
  const save = async (as = false) => {
    let target = filename;
    if (as || !target)
      target = await ctx.dialogs.file({
        mode: "save",
        name: target ? basename(target) : "Document.wdoc",
        normalizeName: (name) => (extension(name) ? name : name + ".wdoc"),
      });
    if (!target) return false;
    const htmlSnapshot = editor.innerHTML,
      textSnapshot = editor.innerText;
    await ctx.fs.writeFile(
      target,
      extension(target) === "wdoc"
        ? JSON.stringify({
            format: "win2k-wordpad",
            version: 1,
            html: sanitizeDocument(htmlSnapshot),
          })
        : textSnapshot,
      {
        mime: extension(target) === "wdoc" ? "application/json" : "text/plain",
      },
    );
    filename = target;
    saved = htmlSnapshot;
    update();
    return true;
  };
  const discard = async () => {
    if (!changed) return true;
    const a = await ctx.dialogs.message(
      "Save changes to " + (filename ? basename(filename) : "Document") + "?",
      { title: "WordPad", buttons: ["Yes", "No", "Cancel"] },
    );
    return a === "Yes" ? (await save()) && !changed : a === "No";
  };
  const newDoc = async () => {
    if (await discard()) {
      editor.replaceChildren();
      filename = null;
      saved = "";
      update();
    }
  };
  const open = async () => {
    const p = await ctx.dialogs.file({ mode: "open" });
    if (p) ctx.launch("wordpad", { path: p });
  };
  const sel = (x, wd, label, options, onchange) =>
    el(
      "select",
      { class: "wp-sel", style: { left: x + "px", top: "34px", width: wd + "px" }, "aria-label": label, onchange },
      ...options,
    );
  const family = sel(
      6,
      159,
      "Font",
      ["Arial", "Times New Roman", "Courier New", "Tahoma", "Verdana"].map((n) => el("option", { text: n })),
      (e) => command("fontName", e.target.value),
    ),
    size = sel(
      174,
      50,
      "Font size",
      [["1", "8"], ["2", "10"], ["3", "12"], ["4", "14"], ["5", "18"], ["6", "24"], ["7", "36"]].map(([value, text]) =>
        el("option", { value, text, selected: value === "2" }),
      ),
      (e) => command("fontSize", e.target.value),
    ),
    script = sel(
      232,
      120,
      "Script",
      ["Western", "Greek", "Turkish", "Baltic", "Central European", "Cyrillic"].map((n) => el("option", { text: n })),
      () => {},
    );
  const wb = (x, y, name, title, action, { on = false } = {}) => {
    const b = el("div", {
      class: "wp-btn" + (on ? " on" : ""),
      style: { left: x + "px", top: y + "px", backgroundImage: `url(/assets/ui/wp/${name}.png)` },
      title,
      role: "button",
    });
    b.addEventListener("click", () => action(b));
    return b;
  };
  const colorInput = el("input", {
    type: "color",
    value: "#000000",
    "aria-label": "Text color",
    class: "wp-color",
    onchange: (e) => command("foreColor", e.target.value),
  });
  const align = {};
  // Bold / Italic / Underline stay pressed while the text at the caret has that style
  const toggles = {};
  const syncToggles = () => {
    for (const [k, b] of Object.entries(toggles)) b.classList.toggle("on", !!document.queryCommandState(k));
  };
  for (const [x, k, t] of [[360, "bold", "Bold"], [383, "italic", "Italic"], [406, "underline", "Underline"]])
    toggles[k] = wb(x, 34, k, t, async () => { await command(k); syncToggles(); });
  editor.addEventListener("keyup", syncToggles);
  editor.addEventListener("mouseup", () => setTimeout(syncToggles));
  const setAlign = (k, cmd) => {
    for (const [n, b] of Object.entries(align)) {
      b.classList.toggle("on", n === k);
      if (n === "left") b.style.backgroundImage = `url(/assets/ui/wp/${k === "left" ? "left" : "left_n"}.png)`;
    }
    command(cmd);
  };
  align.left = wb(460, 34, "left", "Align Left", () => setAlign("left", "justifyLeft"), { on: true });
  align.center = wb(483, 34, "center", "Center", () => setAlign("center", "justifyCenter"));
  align.right = wb(506, 34, "right", "Align Right", () => setAlign("right", "justifyRight"));
  const formatting = el(
    "div",
    { class: "wp-format" },
    family,
    size,
    script,
    toggles.bold,
    toggles.italic,
    toggles.underline,
    wb(429, 34, "color", "Color", () => colorInput.click()),
    colorInput,
    align.left,
    align.center,
    align.right,
    wb(537, 34, "bullets", "Bullet Style", () => command("insertUnorderedList")),
  );
  formatting.addEventListener("mousedown", (e) => {
    if (e.target.closest(".wp-btn")) e.preventDefault();
  });
  const tools = el(
    "div",
    { class: "wp-tools" },
    wb(6, 4, "new", "New", newDoc),
    wb(29, 4, "open", "Open", open),
    wb(52, 4, "save", "Save", () => save()),
    wb(83, 4, "print", "Print", () => ctx.printText(editor.innerText, filename || "Document")),
    wb(106, 4, "preview", "Print Preview", () => ctx.printText(editor.innerText, filename || "Document")),
    wb(137, 4, "find", "Find", () => ctx.dialogs.message("Find is not available in this document.", { title: "WordPad", icon: "info" })),
    wb(168, 4, "cut", "Cut", () => command("cut")),
    wb(191, 4, "copy", "Copy", () => command("copy")),
    wb(214, 4, "paste", "Paste", async () => command("insertText", await ctx.clipboard.getText())),
    wb(237, 4, "undo", "Undo", () => command("undo")),
    wb(268, 4, "datetime", "Date/Time", () => command("insertText", new Date().toLocaleString())),
  );
  tools.addEventListener("mousedown", (e) => e.preventDefault());
  const stamp = () => { const n = new Date(); return n.toLocaleDateString("en-US") + " " + n.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
  let wpFind = "";
  const wpFindNext = () => {
    if (!wpFind) return;
    if (!window.find(wpFind, false, false, true)) ctx.dialogs.message(`WordPad has finished searching the document.`, { title: "WordPad", icon: "info" });
  };
  const wpFindDialog = (replace) => {
    const d = dialogFromTemplate(ctx, replace ? NOTEPAD_DIALOGS.replace : NOTEPAD_DIALOGS.find, {
      appId: "find",
      values: { 1152: wpFind },
      checked: { 1057: true },
      groups: [[1056, 1057]],
      on: {
        1: () => { wpFind = d.ctl[1152].value; wpFindNext(); },
        2: () => d.close(),
        1024: () => { if (window.getSelection().toString()) command("insertText", d.ctl[1153].value); wpFind = d.ctl[1152].value; wpFindNext(); },
        1025: () => { wpFind = d.ctl[1152].value; for (let i = 0; i < 1000 && wpFind && window.find(wpFind, false, false, false); i++) command("insertText", d.ctl[1153].value); },
        1038: () => ctx.launch("help", { topic: "wordpad" }),
      },
    });
    d.ctl[1152].focus();
  };
  const bars = { Toolbar: tools, "Format Bar": formatting, Ruler: null, "Status Bar": null };
  const barOn = {};
  const toggleBar = (name) => {
    const el_ = { Toolbar: tools, "Format Bar": formatting, Ruler: ruler, "Status Bar": status }[name];
    barOn[name] = barOn[name] === false;
    el_.hidden = !barOn[name];
    el_.style.display = barOn[name] ? "" : "none";
  };
  const isOn = (n) => barOn[n] !== false;
  w.setMenu({
    File: [
      { label: "New...", shortcut: "Ctrl+N", action: newDoc },
      { label: "Open...", shortcut: "Ctrl+O", action: open },
      { label: "Save", shortcut: "Ctrl+S", action: () => save() },
      { label: "Save As...", action: () => save(true) },
      separator(),
      { label: "Print...", shortcut: "Ctrl+P", action: () => ctx.printText(editor.innerText, filename || "Document") },
      { label: "Print Preview", action: () => ctx.printText(editor.innerText, filename || "Document") },
      { label: "Page Setup...", disabled: true },
      separator(),
      { label: "Send...", disabled: true },
      separator(),
      { label: "Exit", action: () => w.close() },
    ],
    Edit: [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => command("undo") },
      separator(),
      { label: "Cut", shortcut: "Ctrl+X", action: () => command("cut") },
      { label: "Copy", shortcut: "Ctrl+C", action: () => command("copy") },
      { label: "Paste", shortcut: "Ctrl+V", action: async () => command("insertText", await ctx.clipboard.getText()) },
      { label: "Paste Special...", disabled: true },
      { label: "Clear", shortcut: "Del", action: () => command("delete") },
      { label: "Select All", shortcut: "Ctrl+A", action: () => command("selectAll") },
      separator(),
      { label: "Find...", shortcut: "Ctrl+F", action: () => wpFindDialog(false) },
      { label: "Find Next", shortcut: "F3", action: () => (wpFind ? wpFindNext() : wpFindDialog(false)) },
      { label: "Replace...", shortcut: "Ctrl+H", action: () => wpFindDialog(true) },
      separator(),
      { label: "Links...", disabled: true },
      { label: "Object Properties", shortcut: "Alt+Enter", disabled: true },
    ],
    View: () => [
      { label: "Toolbar", checked: isOn("Toolbar"), action: () => toggleBar("Toolbar") },
      { label: "Format Bar", checked: isOn("Format Bar"), action: () => toggleBar("Format Bar") },
      { label: "Ruler", checked: isOn("Ruler"), action: () => toggleBar("Ruler") },
      { label: "Status Bar", checked: isOn("Status Bar"), action: () => toggleBar("Status Bar") },
      separator(),
      { label: "Options...", disabled: true },
    ],
    Insert: [
      { label: "Date and Time...", action: () => command("insertText", stamp()) },
      { label: "Object...", disabled: true },
    ],
    Format: [
      { label: "Font...", action: () => ctx.dialogs.message("Use the Font and Size boxes on the Format Bar.", { title: "WordPad", icon: "info" }) },
      { label: "Bullet Style", action: () => command("insertUnorderedList") },
      { label: "Paragraph...", disabled: true },
      { label: "Tabs...", disabled: true },
    ],
    Help: [
      { label: "Help Topics", action: () => ctx.launch("help", { topic: "wordpad" }) },
      separator(),
      { label: "About WordPad", action: () => ctx.dialogs.message("Microsoft WordPad\nVersion 5.0 (Build 2195: Service Pack 4)\n\nCopyright © 1981-1999 Microsoft Corp.", { title: "About WordPad", icon: "wordpad" }) },
    ],
  });
  const ruler = el("div", { class: "wp-ruler" });
  const status = el(
    "div",
    { class: "wp-status" },
    el("span", { class: "wp-status-text", text: "For Help, press F1" }),
    el("span", { class: "wp-panel", style: { right: "52px", width: "25px" } }),
    el("span", { class: "wp-panel", style: { right: "22px", width: "26px" }, text: "NUM" }),
  );
  w.setContent(
    el(
      "div",
      { class: "wp-root" },
      tools,
      formatting,
      ruler,
      el("div", { class: "wordpad-workspace wp-work" }, editor),
      status,
    ),
  );
  w.onClose = discard;
  w.el.addEventListener(
    "keydown",
    safely(async (e) => {
      if (e.ctrlKey || e.metaKey) {
        const actions = { s: () => save(e.shiftKey), n: newDoc, o: open };
        const action = actions[e.key.toLowerCase()];
        if (action) {
          e.preventDefault();
          await action();
        }
      }
    }),
  );
  queueMicrotask(() => editor.focus());
  return w;
}
function sanitizeDocument(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html);
  const allowed = new Set([
    "B",
    "I",
    "U",
    "S",
    "STRIKE",
    "P",
    "DIV",
    "BR",
    "SPAN",
    "FONT",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "IMG",
    "STRONG",
    "EM",
    "SUB",
    "SUP",
    "H1",
    "H2",
    "H3",
  ]);
  for (const node of [...template.content.querySelectorAll("*")]) {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ""));
      continue;
    }
    for (const attr of [...node.attributes]) {
      if (
        attr.name.startsWith("on") ||
        ![
          "style",
          "color",
          "face",
          "size",
          "src",
          "width",
          "height",
          "align",
        ].includes(attr.name)
      )
        node.removeAttribute(attr.name);
      if (
        attr.name === "src" &&
        !/^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(attr.value)
      )
        node.removeAttribute("src");
      if (
        attr.name === "style" &&
        /url\s*\(|expression|position|behavior/i.test(attr.value)
      )
        node.removeAttribute("style");
    }
  }
  return template.innerHTML;
}
