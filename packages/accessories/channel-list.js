// Channel list window (M3U / IPTV) shared by Windows Media Player: group filter, search, paste-an-address box.
import { el, button, menuBar } from "../ui/index.js";

/** api: { title, getList(): entries, getIndex(), play(i), loadUrl(url), openFile?() } — returns { refresh, close, win } */
export function openChannelList(ctx, api) {
  const win = ctx.wm.create({ title: api.title || "Channel List", icon: api.icon || "media", width: 380, height: 420, x: 240, y: 90, appId: api.appId || "channel-list" });
  let group = "", q = "", selI = -1;
  const urlBox = el("input", { type: "text", class: "vlc-ch-url", placeholder: "Paste an .m3u / .m3u8 address here and press Enter" });
  const go = () => { const v = urlBox.value.trim(); urlBox.value = ""; if (v) api.loadUrl(v); };
  urlBox.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  urlBox.addEventListener("paste", () => setTimeout(() => { if (/^https?:\/\/\S+$/i.test(urlBox.value.trim())) go(); }, 0));
  const sel = el("select", { class: "vlc-ch-group" }), search = el("input", { type: "text", class: "vlc-ch-search", placeholder: "Search channels..." });
  const body = el("div", { class: "vlc-pl vlc-ch" }), count = el("span", { class: "vlc-pl-count" });
  const refresh = () => {
    if (win.closed) return;
    const list = api.getList(), idx = api.getIndex();
    const title = (e) => (typeof e === "string" ? e.split("/").pop() : e.title || e.url);
    const groups = [...new Set(list.map((e) => e.group).filter(Boolean))];
    sel.replaceChildren(el("option", { value: "", text: "All channels" }), ...groups.map((g) => el("option", { value: g, text: g })));
    if (!groups.includes(group)) group = ""; sel.value = group;
    const rows = list.map((e, i) => [e, i]).filter(([e]) => (!group || e.group === group) && (!q || title(e).toLowerCase().includes(q)));
    body.replaceChildren(...rows.map(([e, i]) => {
      const row = el("div", { class: "vlc-pl-row" + (i === idx ? " cur" : "") }, el("span", { text: title(e) }), el("span", { class: "d", text: e.group || (e.live ? "Live" : "") }));
      row.dataset.i = String(i);
      if (i === selI) row.classList.add("sel");
      row.addEventListener("click", () => { selI = i; body.querySelectorAll(".vlc-pl-row.sel").forEach((r) => r.classList.remove("sel")); row.classList.add("sel"); });
      row.addEventListener("dblclick", () => api.play(i));
      return row;
    }));
    if (!rows.length) body.append(el("div", { class: "vlc-pl-empty", text: list.length ? "No channel matches." : "No channel list loaded. Paste an address above or use File > Open Playlist..." }));
    count.textContent = `${rows.length} channel${rows.length === 1 ? "" : "s"}`;
  };
  sel.addEventListener("change", () => { group = sel.value; refresh(); });
  search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); refresh(); });
  // Original Radio Tuner buttons from msdxm.ocx (bmp60 normal, bmp61 disabled, bmp62 hover): play, station, stop, guide, speaker.
  const tb = (cell, label, run) => { const b = el("button", { class: "wmp-tb", type: "button", title: label, "aria-label": label, onclick: run }); b.style.setProperty("--c", cell); return b; };
  const play = () => { const r = body.querySelector(".vlc-pl-row.sel") || body.querySelector(".vlc-pl-row.cur") || body.querySelector(".vlc-pl-row"); if (r) api.play(+r.dataset.i); };
  const toolbar = el("div", { class: "wmp-tbar" }, tb(0, "Play", play), tb(2, "Stop", () => api.stop?.()), tb(4, "Mute", () => api.mute?.()));
  const menu = menuBar({ File: [...(api.openFile ? [{ label: "Open Playlist...", action: api.openFile }, { separator: true }] : []), { label: "Close", action: () => win.close() }] });
  win.setContent(menu, toolbar, el("div", { class: "vlc-ch-bar" }, urlBox), el("div", { class: "vlc-ch-bar" }, sel, search), body,
    el("div", { class: "vlc-pl-bar" }, button("Play", play), count));
  win.onClose = () => { api.onClose?.(); return true; };
  refresh();
  return { refresh, win, close: () => win.close() };
}
