// Radio presets for the Windows Media Player "Radio" page. Addresses are public internet streams
// (HLS or plain MP3/AAC); availability depends on the broadcaster.
export const RADIO_STATIONS = [
  { title: "80s Hits", group: "80'ler", url: "https://ice1.somafm.com/u80s-128-mp3" },
  { title: "90s Hits", group: "90'lar", url: "https://streams.90s90s.de/web/mp3-192/streams.90s90s.de/" },
].map((s) => ({ ...s, live: true }));

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
export async function fetchDecadeStations(perTag = 1) {
  const out = [], seen = new Set();
  for (const [tag, group] of TAGS) {
    const list = await rb(tag, perTag * 3);
    let n = 0;
    for (const x of list) {
      const title = String(x.name || "").trim().replace(/\s+/g, " ");
      const url = x.url_resolved || x.url;
      if (!title || !url || !/^https:/i.test(url) || seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase()); out.push({ title, group, url, live: true });
      if (++n >= perTag) break;
    }
  }
  return out;
}
