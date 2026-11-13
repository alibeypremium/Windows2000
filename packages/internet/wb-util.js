export const WB_FIRST = 1996, WB_LAST = 2025;
export const WB_YEARS = Array.from({ length: WB_LAST - WB_FIRST + 1 }, (_, i) => String(WB_FIRST + i));
export const WB_YEAR_TEXT = `${WB_FIRST}-${WB_LAST}`;
// The Wayback "available" API answers per exact address, so http/https and www/no-www count as different pages.
// Try the other spellings before concluding that nothing was archived.
export function urlVariants(url) {
  let u;
  try { u = new URL(url); } catch { return [url]; }
  const hosts = [u.hostname, u.hostname.startsWith("www.") ? u.hostname.slice(4) : "www." + u.hostname];
  const out = [];
  for (const proto of [u.protocol, u.protocol === "http:" ? "https:" : "http:"])
    for (const h of hosts) out.push(proto + "//" + h + (u.port ? ":" + u.port : "") + u.pathname + u.search);
  return [...new Set([url, ...out])];
}
/** ask(url) -> timestamp | null | undefined (undefined = could not ask). Returns the first copy found among the spellings. */
export async function closestAny(ask, url) {
  let failed = 0;
  const vs = urlVariants(url);
  for (const v of vs) {
    const r = await ask(v);
    if (r) return r;
    if (r === undefined) failed++;
  }
  return failed === vs.length ? undefined : null;
}

/** The first spelling of the address that the archive has any copy of (null = none, undefined = could not ask). */
export async function spellingWithCopies(ask, url) {
  let failed = 0;
  const vs = urlVariants(url);
  for (const v of vs) {
    const r = await ask(v);
    if (r) return v;
    if (r === undefined) failed++;
  }
  return failed === vs.length ? undefined : null;
}

export const wbNorm = (u) => String(u).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/:80(?=\/|$)/, "").replace(/\/$/, "");

/**
 * One shared, polite client for archive.org/wayback/available (JSONP: web.archive.org's CDX has no CORS).
 * - at most 3 requests in flight, so the archive does not throttle us (asking for 30 years at once made answers random);
 * - failed or empty-because-of-an-error answers are retried with a pause; answers are cached;
 * - "which years exist" is two questions (first and last copy) instead of one per year.
 */
export function createWbApi() {
  let jpN = 0, active = 0;
  const queue = [], cache = new Map(), infos = new Map(), failed = new Set(), inflight = new Map();
  const jsonp = (url, ms = 12000) => new Promise((ok, no) => {
    const cb = "__wbq" + ++jpN + "_" + Date.now().toString(36), sc = document.createElement("script");
    let t = 0;
    const done = (v, err) => { clearTimeout(t); delete window[cb]; sc.remove(); err ? no(err) : ok(v); };
    window[cb] = (d) => done(d);
    sc.onerror = () => done(null, new Error("jsonp"));
    t = setTimeout(() => done(null, new Error("timeout")), ms);
    sc.src = url + "&callback=" + cb;
    document.head.append(sc);
  });
  const pump = () => {
    while (active < 3 && queue.length) {
      active++;
      const job = queue.shift();
      job().finally(() => { active--; pump(); });
    }
  };
  const slot = (fn) => new Promise((res) => { queue.push(() => fn().then(res, () => res(undefined))); pump(); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /** closest copy to st (YYYY, YYYYMMDD or 14 digits; a bare year means mid-year). undefined = could not ask, null = none. */
  async function ask(u, st) {
    const stamp = (st.length === 4 ? st + "0701" : st) + "0101000000";
    const key = u + "|" + stamp.slice(0, 14);
    if (cache.has(key)) return cache.get(key);
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await slot(async () => {
          const d = await jsonp("https://archive.org/wayback/available?url=" + encodeURIComponent(u) + "&timestamp=" + stamp.slice(0, 14));
          const c = d?.archived_snapshots?.closest;
          return c?.available ? c.timestamp : null;
        });
        if (r !== undefined) { cache.set(key, r); return r; }
        await sleep(600 * (attempt + 1));
      }
      return undefined;
    })();
    inflight.set(key, p);
    p.finally(() => inflight.delete(key));
    return p;
  }
  const closest = (url, st) => closestAny((u) => ask(u, st), url);
  /** { years, first, last, unknown } for an address. Years between the first and the last copy are offered; a year with no copy of its own shows its nearest copy. */
  async function info(url) {
    const key = wbNorm(url), hit = infos.get(key);
    if (hit) return hit;
    failed.delete(key);
    const base = await spellingWithCopies((u) => ask(u, "2000"), url);
    if (base === null) { const i = { years: [], first: null, last: null }; infos.set(key, i); return i; }
    if (base === undefined) { failed.add(key); return { years: WB_YEARS, first: null, last: null, unknown: true }; }
    const [first, last] = await Promise.all([ask(base, "19960101"), ask(base, new Date().toISOString().slice(0, 10).replace(/-/g, ""))]);
    if (first === undefined && last === undefined) { failed.add(key); return { years: WB_YEARS, first: null, last: null, unknown: true }; }
    const a = first ? +first.slice(0, 4) : WB_FIRST, z = last ? +last.slice(0, 4) : WB_LAST;
    const i = { years: WB_YEARS.filter((y) => +y >= a && +y <= z), first: first || null, last: last || null, partial: first === undefined || last === undefined };
    if (!i.partial) infos.set(key, i);
    return i;
  }
  return { ask, closest, info, infos, failed };
}
export const wbApi = createWbApi();
