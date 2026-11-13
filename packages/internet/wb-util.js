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
