// Radio presets for the Windows Media Player "Radio" page. Addresses are public internet streams
// (HLS or plain MP3/AAC); availability depends on the broadcaster.
export const RADIO_STATIONS = [];

// Stations that are tried first for a decade (the player keeps the first one that really starts playing).
const PREFERRED = { "80s": [{ title: "80s Hits", url: "https://ice1.somafm.com/u80s-128-mp3" }], "90s": [{ title: "90s90s", url: "https://streams.90s90s.de/web/mp3-192/streams.90s90s.de/" }] };

/** Does this stream start playing in the browser within a few seconds? */
export function probeStream(url, ms = 6000) {
  return new Promise((res) => {
    const a = new Audio(); a.preload = "auto"; a.muted = true;
    const done = (ok) => { clearTimeout(t); a.removeAttribute("src"); try { a.load(); } catch { /* ignore */ } res(ok); };
    const t = setTimeout(() => done(false), ms);
    a.addEventListener("canplay", () => done(true), { once: true });
    a.addEventListener("error", () => done(false), { once: true });
    a.src = url;
  });
}

// Live directory (Radio Browser, community-maintained, CORS-enabled): the single most listened https/MP3 station tagged 80s, 90s and 2000s.
const HOSTS = ["de1", "fi1", "at1"];
const TAGS = [["80s", "80'ler"], ["90s", "90'lar"], ["2000s", "2000'ler"]];
async function rb(tag, limit) {
  for (const h of HOSTS) {
    try {
      const r = await fetch(`https://${h}.api.radio-browser.info/json/stations/search?tag=${tag}&order=clickcount&reverse=true&limit=${limit}&hidebroken=true&is_https=true&codec=MP3`);
      if (r.ok) return await r.json();
    } catch { /* try next mirror */ }
  }
  return [];
}
/** Radyo ODTÜ (FM 103.1): the main broadcast, found through the directory by name; the first address that really plays is kept. */
async function findOdtu() {
  let list = [];
  for (const h of HOSTS) {
    try { const r = await fetch(`https://${h}.api.radio-browser.info/json/stations/byname/radyo%20odtu?hidebroken=true&order=clickcount&reverse=true`); if (r.ok) { list = await r.json(); break; } } catch { /* next mirror */ }
  }
  const main = list.filter((x) => !/rock|easy|hit|kaset|haramiler|hiphop|hip hop|k-pop|science|kks|kıbrıs|cyprus/i.test(x.name || ""));
  const urls = [...main.map((x) => x.url_resolved || x.url), "https://stream.radyoodtu.com.tr/stream/4/;", "https://stream.radyoodtu.com.tr/stream/6/;", "https://stream.radyoodtu.com.tr/stream/8/;"].filter((u) => /^https:/i.test(u || ""));
  for (const u of [...new Set(urls)].slice(0, 6)) if (await probeStream(u)) return { title: "Radyo ODTÜ", group: "Türkiye", url: u, live: true };
  return null;
}
export async function fetchDecadeStations(onFound, perTag = 1) {
  const out = [], seen = new Set();
  const pOdtu = findOdtu().then((o) => { if (o) { out.push(o); onFound?.(o); } }).catch(() => {});
  for (const [tag, group] of TAGS) {
    const cands = [...(PREFERRED[tag] || []), ...(await rb(tag, 12)).map((x) => ({ title: String(x.name || "").trim().replace(/\s+/g, " "), url: x.url_resolved || x.url }))]
      .filter((c) => c.title && /^https:/i.test(c.url || "") && !seen.has(c.title.toLowerCase()));
    let n = 0;
    for (const c of cands.slice(0, 8)) {
      if (!(await probeStream(c.url))) continue;
      seen.add(c.title.toLowerCase());
      const e = { title: c.title, group, url: c.url, live: true }; out.push(e); onFound?.(e);
      if (++n >= perTag) break;
    }
  }
  await pOdtu;
  return out;
}
