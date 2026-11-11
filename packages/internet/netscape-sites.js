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
<div class="links"><a href="about:news">News</a><a href="about:youtube">Videos</a><a href="about:home">Netscape Netcenter</a></div>
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

// ------------------------------------------------------------------ YouTube (curated, embeddable videos)
export const VIDEOS = [
  { id: "aqz-KE-bpKQ", title: "Big Buck Bunny", by: "Blender Foundation", len: "9:56" },
  { id: "eRsGyueVLvQ", title: "Sintel", by: "Blender Foundation", len: "14:48" },
  { id: "R6MlUcmOul8", title: "Tears of Steel", by: "Blender Foundation", len: "12:14" },
  { id: "TLkA0RELQ1g", title: "Elephants Dream", by: "Blender Foundation", len: "10:53" },
  { id: "WhWc3b3KhnY", title: "Spring", by: "Blender Studio", len: "7:44" },
  { id: "Y-rmzh0PI3c", title: "Cosmos Laundromat", by: "Blender Studio", len: "12:10" },
];
const YT_CSS = `body{margin:0;font:12px Arial,sans-serif;background:#fff;color:#000}
.hd{background:#fff;border-bottom:1px solid #999;padding:8px 14px;display:flex;align-items:center;gap:14px}
.logo{font:bold 26px Arial;color:#000;text-decoration:none}.logo b{background:#cc0000;color:#fff;border-radius:6px;padding:0 6px;margin-left:2px}
.hd input[type=text]{width:260px;padding:3px;border:2px inset #ccc;font:13px Arial}
.nav{background:#ccd;padding:4px 14px;font-weight:bold}.nav a{margin-right:16px;color:#0000cc}
.wrap{padding:12px 14px}.grid{display:flex;flex-wrap:wrap;gap:14px}
.v{width:150px}.v img{width:146px;height:110px;border:2px solid #ccd;display:block;background:#222}
.v a{color:#0000cc;font-weight:bold;text-decoration:none;display:block;margin:3px 0}.v span{color:#666}
h2{font-size:15px;margin:4px 0 10px;color:#333}`;
const ytHead = `<div class="hd"><a class="logo" href="about:youtube">You<b>Tube</b></a><form data-go="about:youtube-search" style="margin:0"><input type="text" name="q" placeholder="Search"> <input type="submit" value="Search"></form><span style="color:#666">Broadcast Yourself&trade;</span></div><div class="nav"><a href="about:youtube">Home</a><a href="about:youtube">Videos</a><a href="about:news">News</a><a href="about:google">Google</a></div>`;

export const youtubeHome = () =>
  page("YouTube - Broadcast Yourself.", YT_CSS, ytHead + `<div class="wrap"><h2>Featured Videos</h2><div class="grid">${VIDEOS.map((v) => `<div class="v"><a href="about:watch?v=${v.id}"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt=""></a><a href="about:watch?v=${v.id}">${esc(v.title)}</a><span>${esc(v.by)}<br>${v.len}</span></div>`).join("")}</div><p style="margin-top:18px;color:#555">To search all of YouTube, use the box above (opens in your real browser).</p></div>`);

export const youtubeWatch = (id) => {
  const v = VIDEOS.find((x) => x.id === id) || { id, title: "Video", by: "", len: "" };
  return page(`YouTube - ${v.title}`, YT_CSS, ytHead + `<div class="wrap" style="display:flex;gap:16px"><div><h2>${esc(v.title)}</h2><iframe width="480" height="300" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?rel=0" title="${esc(v.title)}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" style="border:2px solid #ccd;background:#000"></iframe><p style="color:#555">${esc(v.by)}</p></div><div style="min-width:160px"><h2>Related</h2>${VIDEOS.filter((x) => x.id !== v.id).slice(0, 4).map((x) => `<div style="margin-bottom:8px"><a href="about:watch?v=${x.id}" style="color:#0000cc;font-weight:bold">${esc(x.title)}</a><br><span style="color:#666">${esc(x.by)}</span></div>`).join("")}</div></div>`);
};

// ------------------------------------------------------------------ News reader
const NEWS_SOURCES = [
  { key: "bbc", name: "BBC News", rss: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { key: "bbctr", name: "BBC Türkçe", rss: "https://feeds.bbci.co.uk/turkce/rss.xml" },
  { key: "hn", name: "Hacker News", hn: true },
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
if(SRC.hn){fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(function(r){return r.json()}).then(function(ids){
return Promise.all(ids.slice(0,25).map(function(id){return fetch('https://hacker-news.firebaseio.com/v0/item/'+id+'.json').then(function(r){return r.json()})}))}).then(function(items){
show(items.filter(Boolean).map(function(i){return{title:i.title,link:i.url||('https://news.ycombinator.com/item?id='+i.id),meta:i.score+' points by '+i.by}}))}).catch(fail);}
else{rssDirect().then(function(l){if(!l.length)throw 0;show(l)}).catch(function(){return rssJson().then(show)}).catch(fail);}
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
  { title: "YouTube", url: "about:youtube" },
  { title: "News Reader", url: "about:news" },
];
