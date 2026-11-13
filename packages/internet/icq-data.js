// ICQ 99b data layer: ported from the win98.si ICQ store (statuses, the 12 contacts, UIN lookup, search, history),
// with the remote AI reply backend replaced by a small local rule-based persona so everything works offline.

export const STATUSES = [
  ["online", "&Available/Connect", "Online"],
  ["ffc", "&Free For Chat", "Free For Chat"],
  ["away", "A&way", "Away"],
  ["na", "&N/A (Extended Away)", "N/A"],
  ["occupied", "&Occupied (Urgent Msgs)", "Occupied"],
  ["dnd", "&DND (Do not Disturb)", "DND"],
  ["invisible", "&Privacy (Invisible)", "Privacy"],
  ["offline", "Offline/D&isconnect", "Disconnected"],
];
export const STATUS_LONG = { online: "Online", ffc: "Free For Chat", away: "Away", na: "N/A (Extended Away)", occupied: "Occupied", dnd: "Do Not Disturb", invisible: "Invisible", offline: "Offline" };

const BLANK = { nick: "", first: "", last: "", email: "", gender: "", age: "", city: "", state: "", country: "", phone: "", homepage: "", company: "", position: "", about: "", interests: "" };
export const FIELDS = Object.keys(BLANK);
const mk = (uin, status, o) => ({ ...BLANK, ...o, uin, status });

export const BUILTIN = [
  mk(1834521, "online", { nick: "SkaterBoi", first: "Jason", last: "Miller", gender: "Male", age: "17", city: "San Diego", country: "USA", interests: "skateboarding, Blink-182, Quake II", about: "junior at mission bay high. if im not online im at the skatepark" }),
  mk(2290417, "online", { nick: "StarGrl", first: "Melissa", last: "Grant", gender: "Female", age: "19", city: "Toronto", country: "Canada", interests: "Dawson's Creek, music, GeoCities pages", about: "1st year at u of t. pacey > dawson. check out my geocities page!!" }),
  mk(3051288, "away", { nick: "Neo99", first: "Tomasz", last: "Nowak", gender: "Male", age: "22", city: "Krakow", country: "Poland", interests: "The Matrix, Linux, IRC", about: "comp sci student. there is no spoon." }),
  mk(4187730, "online", { nick: "Lotus", first: "Mei", last: "Lin", gender: "Female", age: "20", city: "Taipei", country: "Taiwan", interests: "anime, karaoke, music", about: "i study english at NTU. love j-pop and singing" }),
  mk(1290055, "offline", { nick: "DrDOS", first: "Gary", last: "Fischer", gender: "Male", age: "34", city: "Austin", country: "USA", interests: "BBS, assembler, Y2K", about: "sysop of a dial-up BBS since 1988. getting ready for Y2K." }),
  mk(5520163, "online", { nick: "Cyberella", first: "Anna", last: "Becker", gender: "Female", age: "24", city: "Hamburg", country: "Germany", interests: "techno, music, web design", about: "web designer at a small agency. nights = techno clubs." }),
  mk(6034471, "na", { nick: "Gizmo", first: "Kevin", last: "O'Brien", gender: "Male", age: "16", city: "Dublin", country: "Ireland", interests: "StarCraft, Tamagotchi, Pokemon", about: "don't ask me about homework" }),
  mk(2718281, "online", { nick: "MathWiz", first: "Raj", last: "Patel", gender: "Male", age: "21", city: "Bangalore", country: "India", interests: "chess, C++, cricket", about: "engineering student, IISc. play me at chess anytime" }),
  mk(7745902, "occupied", { nick: "Surfin_USA", first: "Brittany", last: "Cole", gender: "Female", age: "18", city: "Honolulu", country: "USA", interests: "surfing, Backstreet Boys, music", about: "senior at kalani high, surf every morning" }),
  mk(3389014, "online", { nick: "Akira", first: "Kenji", last: "Sato", gender: "Male", age: "23", city: "Osaka", country: "Japan", interests: "Final Fantasy VII, anime, guitar", about: "office worker by day, guitar by night" }),
  mk(8120376, "offline", { nick: "LaRosa", first: "Lucia", last: "Fernandez", gender: "Female", age: "27", city: "Madrid", country: "Spain", interests: "flamenco, travel, poetry", about: "travel agent, I write poems in two languages" }),
  mk(4499120, "dnd", { nick: "Wolfie", first: "Erik", last: "Lindqvist", gender: "Male", age: "25", city: "Stockholm", country: "Sweden", interests: "heavy metal, Half-Life, hockey", about: "metalhead and LAN party organizer" }),
];
export const DEFAULT_LIST = [2290417, 3051288, 4187730, 1290055, 2718281];

export const validUin = (s) => /^\d{5,9}$/.test(String(s).trim()) && Number(s) >= 10001;
const rng = (seed) => { let t = seed % 2147483647 || 1; return () => (t = (t * 48271) % 2147483647) / 2147483647; };
const PEOPLE = [["Mike", "Johnson", "Male", "Chicago", "USA"], ["Jessica", "Taylor", "Female", "Seattle", "USA"], ["Chris", "Walker", "Male", "Manchester", "UK"], ["Sarah", "Evans", "Female", "Melbourne", "Australia"], ["Daniel", "Cohen", "Male", "Tel Aviv", "Israel"], ["Natasha", "Ivanova", "Female", "Moscow", "Russia"], ["Lukas", "Weber", "Male", "Vienna", "Austria"], ["Camille", "Dubois", "Female", "Lyon", "France"], ["Marco", "Rossi", "Male", "Milan", "Italy"], ["Ana", "Souza", "Female", "Sao Paulo", "Brazil"], ["Wei", "Zhang", "Male", "Shanghai", "China"], ["Ji-woo", "Kim", "Female", "Seoul", "South Korea"], ["Pieter", "de Vries", "Male", "Amsterdam", "Netherlands"], ["Emily", "Tremblay", "Female", "Montreal", "Canada"], ["Carlos", "Ramirez", "Male", "Mexico City", "Mexico"], ["Hanna", "Virtanen", "Female", "Helsinki", "Finland"]];
const WORDS = ["Dragon", "Angel", "Shadow", "Kitty", "Phreak", "Spike", "Bunny", "Ice", "Rocket", "Pixel"];
const LIKES = ["music", "Titanic", "The X-Files", "Quake", "chatting", "Spice Girls", "Nirvana", "basketball", "soccer", "books", "photography", "Linux", "Ultima Online", "snowboarding", "movies", "HTML"];
const ABOUTS = ["just got a 56k modem!!", "add me if u wanna chat", "student. bored. say hi", "no spam please", "working on my homepage, under construction", "night owl, always on late"];
const STATS = ["online", "online", "online", "away", "na", "occupied", "online", "ffc"];
function generated(uin) {
  const r = rng(uin), pick = (a) => a[Math.floor(r() * a.length)];
  const [first, last, gender, city, country] = pick(PEOPLE);
  const age = 14 + Math.floor(r() * 22);
  const nick = r() < 0.5 ? `${first}${age > 25 ? "" : String(80 + (age % 10))}` : `${pick(WORDS)}${Math.floor(r() * 100)}`;
  const interests = [...new Set([pick(LIKES), pick(LIKES), pick(LIKES)])].join(", ");
  return mk(uin, pick(STATS), { nick, first, last, gender, age: String(age), city, country, interests, about: pick(ABOUTS) });
}
export const baseInfo = (uin) => BUILTIN.find((c) => c.uin === uin) || generated(uin);
/** The data of a contact-list entry: base person + the user's own edits (c.info) and a possible changed UIN. */
export const resolve = (c) => ({ ...baseInfo(c.base ?? c.uin), ...(c.info || {}), uin: c.uin });
export function search(q) {
  const k = q.trim().toLowerCase();
  if (!k) return [];
  if (validUin(k)) return [baseInfo(Number(k))];
  return BUILTIN.filter((c) => [c.nick, c.first, c.last, String(c.uin), c.city, c.country, c.interests].some((v) => v.toLowerCase().includes(k)));
}
export const newUin = () => 1000000 + Math.floor(Math.random() * 89999999);
export const shownStatus = (c, myStatus, dropped) => (myStatus === "offline" || dropped.includes(c.uin) ? "offline" : c.status);
export const fmtTime = (t) => new Date(t).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
export const rand = (a, b) => (a + Math.random() * (b - a)) * 1000;
export const diffInfo = (base, now) => { const o = {}; for (const k of FIELDS) if (now[k] !== base[k]) o[k] = now[k]; return o; };

export const KNOCKS = ["hey! u there?", "hi :) whats up?", "yo, long time no see", "hey, saw u came online. how r u?", "hiya! did u get my email?", "hi there, sorry if i bugged u earlier"];

// ---- local persona replies (stands in for the win98.si AI backend) ----
const TR = /[çğıöşüÇĞİÖŞÜ]|\b(merhaba|selam|nasılsın|naber|evet|hayır|tamam|teşekkür|günaydın|görüşürüz|ne yapıyorsun)\b/i;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ANY_EN = ["lol", "hehe :)", "yeah?", "k", "cool", "omg really?", "haha no way", "brb, mom needs the phone line", "my modem keeps dropping lol", "same here", "sorry, lag. what did u say?", "gtg soon, dinner", "ur funny :P"];
const ANY_TR = ["lol", "hehe :)", "öyle mi?", "tamam", "harika", "yok artık :D", "modemim yine koptu lol", "bende de öyle", "pardon, hat kopuyordu, ne dedin?", "birazdan çıkmam lazım, yemek", "komiksin :P"];
export function reply(them, text, hist) {
  const t = text.trim(), tr = TR.test(t), low = t.toLowerCase();
  const kid = Number(them.age) < 21;
  const A = (en, trs) => pick(tr ? trs : en);
  if (/^(hi|hello|hey|yo|hiya|sup|merhaba|selam|slm)\b/.test(low)) return A([`hi :) whats up?`, `hey! how r u?`, `hiya, long time no see`], [`selam :) naber?`, `merhaba! nasılsın?`]);
  if (/how (are|r) (you|u)|how's it going|whats up|what's up|nasılsın|naber/.test(low)) return A([`pretty good, bored tho. u?`, `ok i guess, just got home. u?`, `cant complain :) u?`], [`iyiyim, biraz sıkıldım. sen?`, `idare eder :) sen?`]);
  if (/where.*(from|live)|nerelisin|nerede yaşıyorsun/.test(low)) return A([`im from ${them.city}, ${them.country}. u?`, `${them.city} :) u?`], [`${them.city}, ${them.country}. sen?`]);
  if (/\b(a\/s\/l|asl)\b|how old|age|kaç yaşında/.test(low)) return A([`${them.age}/${them.gender === "Female" ? "f" : "m"}/${them.city}. u?`], [`${them.age}/${them.gender === "Female" ? "k" : "e"}/${them.city}. sen?`]);
  if (/(your|ur) name|who are (you|u)|adın ne|kimsin/.test(low)) return A([`im ${them.first}, but everyone calls me ${them.nick}`], [`ben ${them.first}, herkes bana ${them.nick} der`]);
  if (/\b(bye|cya|gtg|g2g|see ya|ttyl)\b|görüşürüz|hoşça kal/.test(low)) return A([`bye! ttyl :)`, `cya! dont forget to add me ;)`], [`görüşürüz! :)`, `hoşça kal! beni unutma ;)`]);
  if (/(thanks|thank u|thx|teşekkür|sağ ol)/.test(low)) return A([`np :)`, `anytime!`], [`rica ederim :)`, `bir şey değil!`]);
  if (/\?\s*$/.test(t) && Math.random() < 0.5) return A([`hmm good question lol. no idea`, `dunno :) what do u think?`, `ask me later, im kinda busy`], [`hmm iyi soru lol. bilmiyorum`, `bilmem :) sen ne düşünüyorsun?`]);
  if (/\b(computer|pc|windows|modem|internet|icq)\b|bilgisayar/.test(low)) return A([`my 56k modem is sooo slow, my dad keeps picking up the phone`, `icq rocks, uh-oh sound is stuck in my head lol`], [`56k modemim çok yavaş, babam sürekli telefonu kaldırıyor`, `icq harika, uh-oh sesi kafamdan çıkmıyor lol`]);
  if (/\b(game|games|quake|starcraft)\b|oyun/.test(low)) return A([`wanna play quake later?`, `i keep losing at starcraft lol`], [`sonra quake oynayalım mı?`, `starcraft'ta hep kaybediyorum lol`]);
  if (/\b(music|song|nirvana|spice)\b|müzik|şarkı/.test(low)) return A([`i just got a new cd, so good`, `napster is awesome but dont tell my mom`], [`yeni bir cd aldım, süper`, `napster harika ama annem duymasın`]);
  const base = pick(tr ? ANY_TR : ANY_EN);
  return kid ? base : base.replace(/\blol\b/, "haha");
}
