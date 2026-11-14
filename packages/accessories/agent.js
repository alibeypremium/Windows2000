// Microsoft Agent characters (Clippit, Genie, Peedy, Rocky ...) living on the desktop.
// Rendering, animations and sound effects come from ms-agent-js (vendor/ms-agent.js); this file adds the desktop
// integration: a gallery window, drag/click/right-click behaviour, Turkish and English speech, settings that persist.
import { el, popup, separator } from "../ui/index.js";
import { getLang } from "../ui/i18n.js";
import { Agent } from "./vendor/ms-agent.js";

export const AGENTS = [
  { id: "Clippit", name: "Clippit", info: { en: "The Office Assistant. Always happy to help with a paperclip's worth of advice.", tr: "Ofis Asistanı. Bir ataç kadar küçük, tavsiyeleri bol." } },
  { id: "DOT", name: "Dot", info: { en: "A cheerful red dot that follows your cursor with interest.", tr: "İmlecinizi merakla izleyen neşeli kırmızı nokta." } },
  { id: "F1", name: "F1", info: { en: "A helpful robot with plenty of gears turning.", tr: "Dişlileri hiç durmayan yardımsever robot." } },
  { id: "GENIUS", name: "Genius", info: { en: "A wild-haired scientist who knows a lot about everything.", tr: "Her şeyi bilen, saçları dağınık bilim insanı." } },
  { id: "Genie", name: "Genie", info: { en: "A genie who grants your wishes about Windows.", tr: "Windows ile ilgili dileklerinizi yerine getiren cin." } },
  { id: "LOGO", name: "Logo", info: { en: "The colourful puzzle-piece Windows logo.", tr: "Renkli yapboz parçalı Windows logosu." } },
  { id: "MNATURE", name: "Mother Nature", info: { en: "The planet itself, with a few thoughts for you.", tr: "Size birkaç sözü olan Dünya'nın kendisi." } },
  { id: "MonkeyKing", name: "Monkey King", info: { en: "A mischievous monkey with a magic staff.", tr: "Sihirli değnekli yaramaz bir maymun." } },
  { id: "OFFCAT", name: "Office Cat", info: { en: "A curious cat who loves your desk.", tr: "Masanızı çok seven meraklı bir kedi." } },
  { id: "Peedy", name: "Peedy", info: { en: "A chatty green parrot.", tr: "Geveze yeşil bir papağan." } },
  { id: "ROCKY", name: "Rocky", info: { en: "A loyal dog who is always happy to see you.", tr: "Sizi gördüğüne her zaman sevinen sadık bir köpek." } },
];

const SAY = {
  hello: {
    tr: ["Merhaba! Size nasıl yardımcı olabilirim?", "Selam! Windows 2000'e hoş geldiniz.", "Ben buradayım! Bir şeye ihtiyacınız olursa sağ tıklayın."],
    en: ["Hello! How can I help you?", "Hi there! Welcome to Windows 2000.", "I'm here! Right-click me if you need anything."],
  },
  tips: {
    tr: [
      "Başlat düğmesinden Programlar menüsüne ulaşabilir, tüm uygulamaları açabilirsiniz.",
      "Internet Explorer'daki Wayback Machine ile eski web sitelerini yıllara göre gezebilirsiniz.",
      "Pencerelerin başlık çubuğunu tutup sürükleyerek taşıyabilirsiniz.",
      "Masaüstündeki simgeleri sürükleyerek istediğiniz yere yerleştirebilirsiniz.",
      "Windows Media Player'da müzik çalarken görüntüle menüsünden görselleştirmeyi değiştirebilirsiniz.",
      "Bir dosyaya sağ tıklayarak özelliklerini görebilir ve yeniden adlandırabilirsiniz.",
      "Ctrl+Alt+Del tuşlarıyla Görev Yöneticisi'ni açabilirsiniz.",
      "Denetim Masası'ndan ekran, ses ve tarih ayarlarını değiştirebilirsiniz.",
      "Not defterinde yazdığınız metni kaydetmeyi unutmayın!",
      "Beni sürükleyerek ekranda istediğiniz yere taşıyabilirsiniz.",
    ],
    en: [
      "You can reach every program from the Programs menu under the Start button.",
      "Use the Wayback Machine in Internet Explorer to browse old websites year by year.",
      "Drag a window's title bar to move it around.",
      "Drag the desktop icons to arrange them any way you like.",
      "While music plays in Windows Media Player, change the visualization from the View menu.",
      "Right-click a file to see its properties or rename it.",
      "Press Ctrl+Alt+Del to open the Task Manager.",
      "Control Panel lets you change display, sound and date settings.",
      "Don't forget to save what you write in Notepad!",
      "You can drag me anywhere on the screen.",
    ],
  },
  jokes: {
    tr: [
      "Bilgisayar neden doktora gitmiş? Çünkü virüs kapmış!",
      "Fare neden mutluymuş? Çünkü hep tıklanıyormuş.",
      "Windows'a neden pencere denmiş? Çünkü bazen hiçbir şey açılmıyor, hepsi kapanıyor.",
      "Bir programcıya 'çık dışarı' demişler, 'Alt+F4' demiş.",
      "Disket neden üzgünmüş? Çünkü 1,44 MB'lık hayatı varmış.",
    ],
    en: [
      "Why did the computer go to the doctor? It caught a virus!",
      "Why is the mouse so happy? It always gets clicked.",
      "A programmer was told to go outside. He pressed Alt+F4.",
      "Why was the floppy disk sad? It only had 1.44 MB of life.",
      "There are 10 kinds of people: those who understand binary and those who don't.",
    ],
  },
  bye: { tr: ["Görüşmek üzere!", "Hoşça kalın!"], en: ["See you later!", "Goodbye!"] },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const say = (k) => pick(SAY[k][getLang() === "tr" ? "tr" : "en"]);

// Animations that make sense to offer in the menu (the engine plays the rest, e.g. Idle*, Look*, itself).
const hidden = (n) => /^(Idle|Look|Show|Hide|RestPose|Hearing|Speaking|Moving|Blink|Think|Deep|Reading|Writing)/i.test(n) && !/^(Thinking|Writing|Reading)$/.test(n);

const DEF = { char: "Clippit", visible: false, x: null, y: null, scale: 1, sound: true, tts: false, chatter: false };
let agent = null, curId = null, ctxRef = null, busy = false, chatTimer = 0, gallery = null;
const S = (ctx) => Object.assign({}, DEF, ctx.settings.get("agent") || {});
const save = (ctx, patch) => ctx.settings.set("agent", Object.assign(S(ctx), patch));
const taskbarH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue("--taskbar-height")) || 28;

function openMenu(ctx, x, y) {
  const st = S(ctx), L = getLang() === "tr";
  const anims = agent ? agent.animations().filter((n) => !hidden(n)).sort() : [];
  popup([
    { label: "Give me a tip", action: () => speak(ctx, say("tips")) },
    { label: "Tell me a joke", action: () => speak(ctx, say("jokes")) },
    { label: "What time is it?", action: () => speak(ctx, (L ? "Saat şu an " : "It is ") + new Date().toLocaleTimeString(L ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" }) + (L ? "." : ".")) },
    separator(),
    { label: "Animate!", action: () => agent?.animate() },
    { label: "Animations", submenu: anims.map((n) => ({ label: n, action: () => agent?.play(n) })), disabled: !anims.length },
    separator(),
    { label: "Choose Assistant...", action: () => openGallery(ctx) },
    { label: "Character", submenu: AGENTS.map((a) => ({ label: a.name, checked: curId === a.id, action: () => summon(ctx, a.id) })) },
    { label: "Speak aloud", checked: !!st.tts, action: () => { save(ctx, { tts: !st.tts }); } },
    { label: "Sound effects", checked: !!st.sound, action: () => { save(ctx, { sound: !st.sound }); agent?.audioManager?.setEnabled?.(!st.sound); } },
    { label: "Speak tips automatically", checked: !!st.chatter, action: () => { save(ctx, { chatter: !st.chatter }); schedule(ctx); } },
    separator(),
    { label: "Hide", action: () => dismiss(ctx) },
  ], x, y);
}

function speak(ctx, text) {
  if (!agent) return;
  agent.stop();
  agent.speak(text, { useTTS: !!S(ctx).tts });
}

function schedule(ctx) {
  clearTimeout(chatTimer);
  if (!agent || !S(ctx).chatter) return;
  chatTimer = setTimeout(() => { if (agent && !document.hidden) speak(ctx, say("tips")); schedule(ctx); }, 60000 + Math.random() * 90000);
}

async function load(ctx, id) {
  const st = S(ctx), sc = st.scale || 1;
  const w = 124 * sc, h = 128 * sc;
  const x = st.x ?? Math.max(20, window.innerWidth - w - 60);
  const y = st.y ?? Math.max(20, window.innerHeight - taskbarH() - h - 30);
  const a = await Agent.load(id, {
    baseUrl: `assets/agents/${id}`, x, y, scale: sc, useAudio: true, keepInViewport: true, idleIntervalMs: 6000,
  });
  a.audioManager?.setEnabled?.(!!st.sound);
  a.on("contextmenu", (e) => openMenu(ctx, e.x, e.y));
  a.on("click", () => { if (!a.requestQueue?.activeRequestId) { if (Math.random() < 0.5) speak(ctx, say("tips")); else a.animate(); } });
  a.on("dragend", () => { const o = a.core.options; save(ctx, { x: Math.round(o.x), y: Math.round(o.y) }); });
  return a;
}

/** Show an agent (loading it when needed). */
export async function summon(ctx, id = S(ctx).char, { greet = true } = {}) {
  ctxRef = ctx;
  if (busy) return agent;
  busy = true;
  try {
    if (agent && curId !== id) { const old = agent; agent = null; try { old.destroy(); } catch { /* ignore */ } }
    if (!agent) { agent = await load(ctx, id); curId = id; }
    else { agent.container.style.display = "block"; await agent.show(); }
    save(ctx, { char: id, visible: true });
    schedule(ctx);
    if (greet) agent.speak(say("hello"), { useTTS: !!S(ctx).tts });
    gallery?.refresh?.();
  } catch (e) {
    console.error(e);
    ctx.dialogs?.message?.("The assistant could not be loaded.", { title: "Microsoft Agent", icon: "error" });
  } finally { busy = false; }
  return agent;
}

export async function dismiss(ctx) {
  clearTimeout(chatTimer);
  if (!agent) return;
  save(ctx, { visible: false });
  try { await agent.hide(); } catch { /* ignore */ }
  gallery?.refresh?.();
}

/** Called once the desktop is up: bring the assistant back if it was on screen when the session ended. */
export function restoreAgent(ctx) {
  if (S(ctx).visible) setTimeout(() => summon(ctx, S(ctx).char, { greet: false }), 1500);
}

function openGallery(ctx) {
  if (gallery) { gallery.win.focus?.(); return; }
  const L = getLang() === "tr";
  const w = ctx.wm.create({ title: "Microsoft Agent", icon: "agent", width: 430, height: 400, x: 220, y: 90, appId: "agent", maximizable: false, resizable: false, className: "ag-window" });
  let sel = curId || S(ctx).char;
  const list = el("div", { class: "ag-list", role: "listbox", tabindex: "0" });
  const prev = el("div", { class: "ag-prev" });
  const info = el("div", { class: "ag-info" });
  const btnShow = el("button", { type: "button" }), btnClose = el("button", { type: "button", text: "Close", onclick: () => w.close() });
  const chk = (key, label) => {
    const i = el("input", { type: "checkbox" }); i.checked = !!S(ctx)[key];
    i.addEventListener("change", () => { save(ctx, { [key]: i.checked }); if (key === "chatter") schedule(ctx); if (key === "sound") agent?.audioManager?.setEnabled?.(i.checked); });
    return el("label", { class: "ag-chk" }, i, el("span", { text: label }));
  };
  const scale = el("select", {}, ...[["1", "Normal size"], ["1.5", "Large (150%)"], ["2", "Extra large (200%)"]].map(([v, t]) => el("option", { value: v, text: t })));
  scale.value = String(S(ctx).scale || 1);
  scale.addEventListener("change", () => { save(ctx, { scale: +scale.value }); agent?.setScale?.(+scale.value); });
  const draw = () => {
    list.replaceChildren(...AGENTS.map((a) => {
      const row = el("div", { class: "ag-row" + (a.id === sel ? " sel" : ""), role: "option", "aria-selected": String(a.id === sel) },
        el("img", { src: `assets/agents/${a.id}/icon-32.png`, width: 32, height: 32, alt: "", draggable: "false" }), el("span", { text: a.name }));
      row.addEventListener("click", () => { sel = a.id; draw(); });
      row.addEventListener("dblclick", () => summon(ctx, a.id));
      return row;
    }));
    const a = AGENTS.find((x) => x.id === sel) || AGENTS[0];
    prev.replaceChildren(el("img", { src: `assets/agents/${a.id}/icon-32.png`, width: 64, height: 64, alt: "", draggable: "false" }));
    info.replaceChildren(el("b", { text: a.name }), el("div", { text: a.info[L ? "tr" : "en"] }));
    const here = agent && curId === sel && agent.container.style.display !== "none";
    btnShow.textContent = here ? "Hide" : "Show";
    btnShow.onclick = () => (here ? dismiss(ctx) : summon(ctx, sel));
  };
  w.setContent(el("div", { class: "ag-body" },
    el("div", { class: "ag-top" }, list, el("div", { class: "ag-side" }, prev, info)),
    el("div", { class: "ag-opts" }, chk("sound", "Sound effects"), chk("tts", "Speak aloud (browser voice)"), chk("chatter", "Speak tips automatically"), el("label", { class: "ag-chk" }, el("span", { text: "Size:" }), scale)),
    el("div", { class: "ag-btns" }, btnShow, btnClose)));
  draw();
  gallery = { win: w, refresh: draw };
  w.onClose = () => { gallery = null; return true; };
}

export function openAgentApp(ctx, args = {}) {
  ctxRef = ctx;
  if (args.char) return summon(ctx, args.char);
  if (!agent || S(ctx).visible === false) summon(ctx, S(ctx).char);
  openGallery(ctx);
}
