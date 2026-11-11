// Built-in "web sites" for the Netscape window. They are local pages (srcdoc) that talk to the
// Navigator window through postMessage, so they can fetch live data (news, search) while the
// real sites, which refuse to be framed, stay reachable from the Netscape address bar.

export const NAV_SCRIPT = `<script>
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
var h=a.getAttribute('href');if(!h||h.charAt(0)==='#')return;e.preventDefault();
parent.postMessage({ns:'go',url:h,ext:a.hasAttribute('data-ext')},'*');});
document.addEventListener('submit',function(e){var f=e.target;if(!f.hasAttribute('data-go'))return;e.preventDefault();
var d=new FormData(f),q=[];d.forEach(function(v,k){q.push(encodeURIComponent(k)+'='+encodeURIComponent(v))});
parent.postMessage({ns:'go',url:f.getAttribute('data-go')+'?'+q.join('&')},'*');});
<\/script>`;

import { ESMA, AYET, HADIS } from "./dini-data.js";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const page = (title, css, body, extra = "") => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}${NAV_SCRIPT}${extra}</body></html>`;

// ------------------------------------------------------------------ Google (2001-style front page + results)
const G = (c, ch) => `<span style="color:${c}">${ch}</span>`;
const GLOGO = G("#0033cc", "G") + G("#cc0000", "o") + G("#ffcc00", "o") + G("#0033cc", "g") + G("#009900", "l") + G("#cc0000", "e");

export const googleHome = () =>
  page(
    "Google",
    `body{margin:0;background:#fff;font:13px Arial,Helvetica,sans-serif;text-align:center;color:#000}
.logo{font:bold 78px 'Times New Roman',serif;letter-spacing:-3px;margin:70px 0 2px}
.tag{font-size:13px;margin-bottom:18px}
input.q{width:340px;font:14px Arial;padding:3px;border:2px inset #ccc}
.b{margin-top:12px}.b input{font:13px Arial;padding:2px 8px}
.links{margin-top:34px;font-size:13px}.links a{margin:0 8px;color:#0000cc}
.ft{margin-top:40px;font-size:11px;color:#555}.ft a{color:#0000cc}
.lang{margin-top:16px;font-size:12px}`,
    `<div class="logo">${GLOGO}</div><div class="tag">Search the web using Google!</div>
<form data-go="about:search"><input class="q" name="q" autocomplete="off"><div class="b"><input type="submit" value="Google Search"> <input type="submit" name="lucky" value="I'm Feeling Lucky"></div>
<div class="lang">Results from Wikipedia: <a href="about:search?lang=en">English</a> | <a href="about:search?lang=tr">T&uuml;rk&ccedil;e</a></div></form>
<div class="links"><a href="about:news">News</a><a href="about:daily">G&uuml;n&uuml;n Ayeti, Hadisi ve Esmas&#305;</a><a href="about:today">Tarihte Bug&uuml;n</a><a href="about:home">Netscape Netcenter</a></div>
<div class="ft">&copy;2001 Google Inc. &mdash; fan recreation. Search results are provided by Wikipedia.</div>`,
  );

export async function googleResults(query, lang = "en", lucky = false) {
  const q = String(query || "").trim();
  const head = `<form data-go="about:search" style="margin:0;padding:8px 12px;background:#e5ecf9;border-bottom:1px solid #3366cc;display:flex;align-items:center;gap:10px"><a href="about:google" style="font:bold 26px 'Times New Roman',serif;text-decoration:none">${GLOGO}</a><input name="q" value="${esc(q)}" style="width:320px;font:13px Arial"><input type="hidden" name="lang" value="${esc(lang)}"><input type="submit" value="Google Search" style="font:12px Arial"></form>`;
  const css = `body{margin:0;font:13px Arial,Helvetica,sans-serif;background:#fff;color:#000}.r{margin:0 12px;padding:6px 0}.r a.t{font-size:15px;color:#0000cc}.r .u{color:#008000;font-size:12px}.r .s{margin:2px 0}.m{padding:10px 12px;color:#555;font-size:12px}.ft{margin:20px 12px;font-size:11px;color:#555;border-top:1px solid #ccc;padding-top:6px}`;
  if (!q) return { html: googleHome(), first: null };
  let items = [];
  try {
    const r = await fetch(`https://${lang === "tr" ? "tr" : "en"}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=10&format=json&origin=*`);
    items = (await r.json()).query.search;
  } catch {
    return { html: page("Google Search", css, head + `<div class="m">The Google server could not be reached. Check your Internet connection and try again.</div>`), first: null };
  }
  const first = items[0] ? `https://${lang === "tr" ? "tr" : "en"}.wikipedia.org/wiki/${encodeURIComponent(items[0].title.replace(/ /g, "_"))}` : null;
  const rows = items
    .map((it) => {
      const href = `https://${lang === "tr" ? "tr" : "en"}.wikipedia.org/wiki/${encodeURIComponent(it.title.replace(/ /g, "_"))}`;
      return `<div class="r"><a class="t" href="${href}">${esc(it.title)}</a><div class="s">${it.snippet.replace(/<(?!\/?span)[^>]*>/g, "")}</div><div class="u">${esc(href.replace("https://", ""))}</div></div>`;
    })
    .join("");
  return {
    html: page(`Google Search: ${q}`, css + `.searchmatch{font-weight:bold}`, head + `<div class="m">Searched the web for <b>${esc(q)}</b>. Results 1 - ${items.length}.</div>${rows || '<div class="m">Your search did not match any documents.</div>'}<div class="ft">Results provided by Wikipedia &mdash; Google is a fan recreation.</div>`),
    first: lucky ? first : null,
  };
}


// ------------------------------------------------------------------ Günün Ayeti, Hadisi ve Esması
const dayOfYear = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
const TR_DATE = (d) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
const DAILY_CSS = `body{margin:0;font:14px Georgia,'Times New Roman',serif;background:#f6f1e3;color:#222}
.hd{background:#0b4f3a;color:#fff;padding:10px 16px}.hd h1{margin:0;font:bold 22px Georgia,serif}.hd small{color:#cfe9dc;font:12px Arial}
.nav{background:#e4dcc2;border-bottom:1px solid #a99;padding:5px 16px;font:12px Arial}.nav a{margin-right:14px;color:#0b4f3a}
.wrap{padding:14px 16px;max-width:760px}.card{background:#fff;border:1px solid #b9ad8a;margin:0 0 14px;padding:0}
.card h2{margin:0;background:#0b4f3a;color:#fff;font:bold 13px Arial;padding:4px 10px}.card .b{padding:10px 14px;line-height:1.5}
.ar{font:34px 'Traditional Arabic','Arial Unicode MS',Tahoma,serif;direction:rtl;text-align:center;color:#0b4f3a;margin:2px 0}.nm{text-align:center;font:bold 17px Georgia}
.src{color:#777;font:italic 12px Arial;margin-top:6px}.pn{font:12px Arial;margin:0 0 10px}.pn a{color:#0000cc;margin-right:14px}
table{border-collapse:collapse;width:100%;font:13px Arial}td{border-bottom:1px solid #ddd;padding:3px 6px;vertical-align:top}td.n{width:34px;color:#888}td.a{font:bold 17px 'Traditional Arabic',Tahoma;direction:rtl;text-align:right;width:120px;color:#0b4f3a}
.ft{padding:10px 16px;font:11px Arial;color:#666}`;
export const dailyPick = (offset = 0, now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset), n = dayOfYear(d) + d.getFullYear();
  return { date: d, esma: ESMA[n % ESMA.length], ayet: AYET[n % AYET.length], hadis: HADIS[n % HADIS.length], i: n % ESMA.length };
};
export function dailyPage(q = {}) {
  const off = parseInt(q.d || "0", 10) || 0, all = q.all;
  const head = `<div class="hd"><h1>G&uuml;n&uuml;n Ayeti, Hadisi ve Esmas&#305;</h1><small>Diyanet Haber ile birlikte okunmak &uuml;zere</small></div><div class="nav"><a href="about:home">Netcenter</a><a href="about:daily">Bug&uuml;n</a><a href="about:daily?all=esma">99 Esmaü'l-H&uuml;sn&acirc;</a><a href="about:daily?all=ayet">Ayetler</a><a href="about:daily?all=hadis">Hadisler</a><a href="about:news?s=diyanet">Diyanet Haber</a></div>`;
  const foot = `<div class="ft">Ayet ve hadis metinleri k&acirc;fi derecede k&#305;sa T&uuml;rk&ccedil;e anlat&#305;mlard&#305;r (mealen); resm&icirc; bir meal ya da hadis ciltlerinin yerini tutmaz.</div>`;
  if (all === "esma")
    return page("99 Esmaü'l-Hüsnâ", DAILY_CSS, head + `<div class="wrap"><div class="card"><h2>Esmaü'l-H&uuml;sn&acirc; &mdash; Allah'&#305;n 99 g&uuml;zel ismi</h2><div class="b"><table>${ESMA.map((e, i) => `<tr><td class="n">${i + 1}</td><td class="a">${e[0]}</td><td><b>${esc(e[1])}</b><br>${esc(e[2])}</td></tr>`).join("")}</table></div></div></div>` + foot);
  if (all === "ayet")
    return page("Ayetler", DAILY_CSS, head + `<div class="wrap"><div class="card"><h2>${AYET.length} ayet</h2><div class="b"><table>${AYET.map((e, i) => `<tr><td class="n">${i + 1}</td><td>${esc(e[1])}<div class="src">${esc(e[0])}</div></td></tr>`).join("")}</table></div></div></div>` + foot);
  if (all === "hadis")
    return page("Hadisler", DAILY_CSS, head + `<div class="wrap"><div class="card"><h2>${HADIS.length} hadis</h2><div class="b"><table>${HADIS.map((e, i) => `<tr><td class="n">${i + 1}</td><td>${esc(e[0])}<div class="src">${esc(e[1])}</div></td></tr>`).join("")}</table></div></div></div>` + foot);
  const p = dailyPick(off);
  return page(
    "Günün Ayeti, Hadisi ve Esması",
    DAILY_CSS,
    head +
      `<div class="wrap"><p class="pn"><a href="about:daily?d=${off - 1}">&laquo; &Ouml;nceki g&uuml;n</a><b>${esc(TR_DATE(p.date))}</b> <a href="about:daily?d=${off + 1}" style="margin-left:14px">Sonraki g&uuml;n &raquo;</a>${off ? '<a href="about:daily">Bug&uuml;n</a>' : ""}</p>
<div class="card"><h2>G&uuml;n&uuml;n Ayeti</h2><div class="b">${esc(p.ayet[1])}<div class="src">${esc(p.ayet[0])}</div></div></div>
<div class="card"><h2>G&uuml;n&uuml;n Hadisi</h2><div class="b">${esc(p.hadis[0])}<div class="src">${esc(p.hadis[1])}</div></div></div>
<div class="card"><h2>G&uuml;n&uuml;n Esmas&#305; (${p.i + 1}/${ESMA.length})</h2><div class="b"><div class="ar">${p.esma[0]}</div><div class="nm">${esc(p.esma[1])}</div><p style="text-align:center;margin:6px 0 0">${esc(p.esma[2])}</p></div></div></div>` +
      foot,
  );
}

// ------------------------------------------------------------------ Tarihte Bugün (Wikipedia "On this day")
export function todayPage(lang = "tr") {
  lang = lang === "en" ? "en" : "tr";
  const T = lang === "tr" ? { title: "Tarihte Bugün", ev: "Olaylar", bi: "Doğumlar", de: "Ölümler", ho: "Bayramlar ve Anma Günleri", err: "Wikipedia'ya ulaşılamadı. İnternet bağlantınızı denetleyip Yenile'ye tıklayın.", ld: "Wikipedia'dan yükleniyor...", src: "Kaynak: Vikipedi — Tarihte bugün" } : { title: "On This Day", ev: "Events", bi: "Births", de: "Deaths", ho: "Holidays and observances", err: "Wikipedia could not be reached. Check your Internet connection and click Reload.", ld: "Loading from Wikipedia...", src: "Source: Wikipedia — On this day" };
  const script = `<script>(function(){var L=${JSON.stringify(lang)},T=${JSON.stringify(T)},d=new Date(),mm=('0'+(d.getMonth()+1)).slice(-2),dd=('0'+d.getDate()).slice(-2);
var months=${JSON.stringify(lang === "tr" ? ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"] : ["January","February","March","April","May","June","July","August","September","October","November","December"])};
document.getElementById('dt').textContent=d.getDate()+' '+months[d.getMonth()];
function sec(name,list,max){if(!list||!list.length)return'';var h='<h2>'+name+'</h2><ul>';list.slice(0,max).forEach(function(e){var pg=(e.pages&&e.pages[0]&&e.pages[0].content_urls&&e.pages[0].content_urls.desktop.page)||'';
var t=(e.text||'').replace(/</g,'&lt;');h+='<li>'+(e.year!=null?'<b>'+(e.year<0?(-e.year)+' '+(L==='tr'?'M.Ö.':'BC'):e.year)+'</b> &mdash; ':'')+(pg?'<a href="'+pg+'">'+t+'</a>':t)+'</li>'});return h+'</ul>';}
fetch('https://'+L+'.wikipedia.org/api/rest_v1/feed/onthisday/all/'+mm+'/'+dd).then(function(r){return r.json()}).then(function(j){
var sel=(j.selected&&j.selected.length?j.selected:j.events)||[];document.getElementById('box').innerHTML=sec(T.ev,sel.length?sel:j.events,12)+sec(T.bi,j.births,10)+sec(T.de,j.deaths,10)+sec(T.ho,j.holidays,8);
}).catch(function(){document.getElementById('box').innerHTML='<p class="err">'+T.err+'</p>'});})();<\/script>`;
  return page(T.title, `body{margin:0;font:13px Arial,sans-serif;background:#fff;color:#000}.hd{background:#36c;color:#fff;padding:10px 16px}.hd h1{margin:0;font:bold 22px 'Times New Roman',serif}
.nav{background:#eef;border-bottom:1px solid #99c;padding:5px 16px}.nav a{margin-right:14px;color:#0000cc}#box{padding:6px 16px}h2{font-size:15px;border-bottom:1px solid #99c;margin:14px 0 6px;color:#036}
ul{margin:0;padding-left:18px}li{margin:4px 0;line-height:1.4}a{color:#0000cc}.err,.ld{color:#555;padding:10px 0}.ft{padding:8px 16px;font-size:11px;color:#666}`,
    `<div class="hd"><h1>${T.title} &mdash; <span id="dt"></span></h1></div><div class="nav"><a href="about:home">Netcenter</a><a href="about:today?lang=tr">T&uuml;rk&ccedil;e</a><a href="about:today?lang=en">English</a><a href="about:daily">G&uuml;n&uuml;n Ayeti, Hadisi ve Esmas&#305;</a></div><div id="box"><p class="ld">${T.ld}</p></div><div class="ft">${T.src}</div>`, script);
}

// ------------------------------------------------------------------ Home-page boxes (shared by Netscape and Internet Explorer)
export function homeParts() {
  const p = dailyPick(0);
  const script = `<script>(function(){var d=new Date(),mm=('0'+(d.getMonth()+1)).slice(-2),dd=('0'+d.getDate()).slice(-2),box=document.getElementById('ot');
fetch('https://tr.wikipedia.org/api/rest_v1/feed/onthisday/events/'+mm+'/'+dd).then(function(r){return r.json()}).then(function(j){var l=(j.events||[]).slice(0,5),h='';
l.forEach(function(e){var pg=e.pages&&e.pages[0]&&e.pages[0].content_urls?e.pages[0].content_urls.desktop.page:'';var t=String(e.text||'').replace(/</g,'&lt;');h+='<li><b>'+e.year+'</b> &mdash; '+(pg?'<a href="'+pg+'">'+t+'</a>':t)+'</li>'});box.innerHTML=h||'<li>Veri yok.</li>'}).catch(function(){box.innerHTML='<li>Vikipedi\\'ye ulaşılamadı.</li>'});})();<\/script>`;
  return { script, css: `.r{display:flex;gap:12px;padding:6px 14px}.b{flex:1;border:1px solid #99a;min-width:0}
.b h3{margin:0;background:#ffffcc;border-bottom:1px solid #99a;font-size:13px;padding:3px 6px}.b .cc{padding:6px 8px;line-height:1.4}.ar{font:22px 'Traditional Arabic',Tahoma,serif;color:#0b4f3a;direction:rtl;text-align:center}
ul{margin:0;padding-left:16px}li{margin:3px 0}a{color:#0000cc}.s{color:#777;font-style:italic}`, body: `<div class="r"><div class="b"><h3>G&uuml;n&uuml;n Ayeti, Hadisi ve Esmas&#305;</h3><div class="cc"><div class="ar">${p.esma[0]}</div><div style="text-align:center"><b>${esc(p.esma[1])}</b> &mdash; ${esc(p.esma[2])}</div><hr><b>Ayet:</b> ${esc(p.ayet[1])} <span class="s">(${esc(p.ayet[0])})</span><br><b>Hadis:</b> ${esc(p.hadis[0])} <span class="s">(${esc(p.hadis[1])})</span><br><a href="about:daily">Devam&#305; &raquo;</a></div></div>
<div class="b"><h3>Tarihte Bug&uuml;n</h3><div class="cc"><ul id="ot"><li>Vikipedi'den y&uuml;kleniyor...</li></ul><a href="about:today">Tamam&#305; &raquo;</a> | <a href="about:today?lang=en">English</a></div></div></div>` };
}
export function homeBoxes() {
  const h = homeParts();
  return page("Netcenter", "body{margin:0;font:12px Arial,sans-serif;background:#fff;color:#000}" + h.css, h.body, h.script);
}

// ------------------------------------------------------------------ Page router shared by Netscape and Internet Explorer
export const SITE_RE = /^about:(google|search|news|daily|today|homeboxes)(\?|$)/;
export const isSite = (u) => SITE_RE.test(u);
export async function buildSite(u) {
  const [base, qs] = u.split("?"), p = new URLSearchParams(qs || "");
  if (base === "about:google") return { html: googleHome(), title: "Google" };
  if (base === "about:search") {
    const r = await googleResults(p.get("q"), p.get("lang") || "en", p.has("lucky"));
    if (r.first) return { go: r.first };
    return { html: r.html, title: p.get("q") ? `Google Search: ${p.get("q")}` : "Google" };
  }
  if (base === "about:news") return { html: newsPage(p.get("s") || "bbc"), title: "News Reader" };
  if (base === "about:daily") return { html: dailyPage(Object.fromEntries(p)), title: "Günün Ayeti, Hadisi ve Esması" };
  if (base === "about:today") return { html: todayPage(p.get("lang") || "tr"), title: "Tarihte Bugün" };
  if (base === "about:homeboxes") return { html: homeBoxes(), title: "Netcenter" };
  return null;
}

// ------------------------------------------------------------------ News reader
const NEWS_SOURCES = [
  { key: "bbc", name: "BBC News", rss: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { key: "bbctr", name: "BBC Türkçe", rss: "https://feeds.bbci.co.uk/turkce/rss.xml" },
  { key: "diyanet", name: "Diyanet Haber", rss: "https://www.diyanethaber.com.tr/rss" },
];
export const newsPage = (key = "bbc") => {
  const src = NEWS_SOURCES.find((s) => s.key === key) || NEWS_SOURCES[0];
  const tabs = NEWS_SOURCES.map((s) => `<a href="about:news?s=${s.key}"${s.key === src.key ? ' class="on"' : ""}>${esc(s.name)}</a>`).join("");
  const script = `<script>(function(){
var SRC=${JSON.stringify(src)},box=document.getElementById('items');
function show(list){box.innerHTML='';list.forEach(function(it){var d=document.createElement('div');d.className='it';
var a=document.createElement('a');a.href=it.link;a.textContent=it.title;d.appendChild(a);
if(it.meta){var m=document.createElement('div');m.className='meta';m.textContent=it.meta;d.appendChild(m)}
if(it.desc){var p=document.createElement('div');p.className='ds';p.textContent=it.desc;d.appendChild(p)}box.appendChild(d)});}
function fail(){box.innerHTML='<p class="err">The news server could not be reached. Check your Internet connection and click Reload.</p>';}
function rssJson(){return fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(SRC.rss)).then(function(r){return r.json()}).then(function(j){return j.items.map(function(i){return{title:i.title,link:i.link,meta:i.pubDate,desc:(i.description||'').replace(/<[^>]*>/g,'').slice(0,220)}})});}
function rssDirect(){return fetch(SRC.rss).then(function(r){return r.text()}).then(function(t){var x=new DOMParser().parseFromString(t,'text/xml');
return Array.prototype.map.call(x.querySelectorAll('item'),function(i){function g(n){var e=i.querySelector(n);return e?e.textContent:''}return{title:g('title'),link:g('link'),meta:g('pubDate'),desc:g('description').replace(/<[^>]*>/g,'').slice(0,220)}})});}
{rssDirect().then(function(l){if(!l.length)throw 0;show(l)}).catch(function(){return rssJson().then(show)}).catch(fail);}
})();<\/script>`;
  return page(
    `News - ${src.name}`,
    `body{margin:0;font:13px Arial,sans-serif;background:#fff;color:#000}.hd{background:#990000;color:#fff;padding:8px 14px;font:bold 22px 'Times New Roman',serif}
.tabs{background:#eee;border-bottom:1px solid #999;padding:5px 14px}.tabs a{margin-right:6px;padding:3px 10px;color:#000;text-decoration:none;border:1px solid #bbb;background:#ddd}.tabs a.on{background:#fff;font-weight:bold;border-bottom-color:#fff}
.it{padding:8px 14px;border-bottom:1px dotted #bbb}.it a{font-size:14px;font-weight:bold;color:#0000cc}.meta{color:#777;font-size:11px;margin-top:2px}.ds{margin-top:3px}.err,.ld{padding:14px;color:#555}.ft{padding:8px 14px;font-size:11px;color:#666}`,
    `<div class="hd">News Reader</div><div class="tabs">${tabs}</div><div id="items"><p class="ld">Loading headlines from ${esc(src.name)}...</p></div><div class="ft">Headlines open inside Netscape. If a site refuses to be shown, use File &gt; Open Page in Real Browser.</div>`,
    script,
  );
};

export const COMMON_LINKS = [
  { title: "Google", url: "about:google" },
  { title: "Günün Ayeti, Hadisi ve Esması", url: "about:daily" },
  { title: "Tarihte Bugün", url: "about:today" },
  { title: "News Reader", url: "about:news" },
];
