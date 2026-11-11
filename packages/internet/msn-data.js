// MSN Messenger local "directory": made-up people and organisations, generated display pictures and canned replies.
// Everything here is fictional; nothing is sent over the network.

const svg = (bg, inner) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${bg}"/>${inner}</svg>`);
const SHAPES = {
  smiley: '<circle cx="48" cy="48" r="32" fill="#ffd800" stroke="#8a6d00" stroke-width="3"/><circle cx="38" cy="40" r="4"/><circle cx="58" cy="40" r="4"/><path d="M32 54q16 18 32 0" fill="none" stroke="#000" stroke-width="4"/>',
  star: '<path d="M48 12l10 24 26 2-20 17 7 26-23-14-23 14 7-26-20-17 26-2z" fill="#ffd800" stroke="#a07800" stroke-width="3"/>',
  heart: '<path d="M48 80C10 54 18 22 38 24c6 1 10 5 10 9 0-4 4-8 10-9 20-2 28 30-10 56z" fill="#e0203c" stroke="#800" stroke-width="3"/>',
  flower: '<g fill="#fff"><circle cx="48" cy="26" r="13"/><circle cx="48" cy="70" r="13"/><circle cx="26" cy="48" r="13"/><circle cx="70" cy="48" r="13"/></g><circle cx="48" cy="48" r="11" fill="#f5a300"/>',
  sun: '<circle cx="48" cy="48" r="20" fill="#ffc400"/><g stroke="#ffc400" stroke-width="5"><path d="M48 10v14M48 72v14M10 48h14M72 48h14M21 21l10 10M65 65l10 10M75 21L65 31M31 65L21 75"/></g>',
  moon: '<path d="M62 14a34 34 0 1 0 20 52A28 28 0 0 1 62 14z" fill="#f4e9a0"/><circle cx="20" cy="22" r="2" fill="#fff"/><circle cx="30" cy="12" r="1.5" fill="#fff"/>',
  car: '<path d="M10 58l8-20 14-8h30l14 10 10 4v14z" fill="#d02020" stroke="#600" stroke-width="2"/><circle cx="28" cy="62" r="9" fill="#222"/><circle cx="70" cy="62" r="9" fill="#222"/><path d="M34 34h12v10H26zM50 34h12l8 10H50z" fill="#bde"/>',
  cat: '<path d="M20 20l12 14h32l12-14v34a28 28 0 0 1-56 0z" fill="#e8a050" stroke="#6a3a10" stroke-width="3"/><circle cx="38" cy="46" r="4"/><circle cx="58" cy="46" r="4"/><path d="M44 56h8l-4 5zM30 56l-14-3M30 60l-14 3M66 56l14-3M66 60l14 3" stroke="#000" stroke-width="2" fill="#000"/>',
  fish: '<path d="M14 48q24-28 50-6l18-14v40L64 54Q38 76 14 48z" fill="#3aa0e0" stroke="#064" stroke-width="2"/><circle cx="30" cy="46" r="3"/>',
  tree: '<rect x="43" y="56" width="10" height="26" fill="#7a4a1a"/><circle cx="48" cy="38" r="24" fill="#2e9a3a"/><circle cx="36" cy="46" r="14" fill="#38b048"/>',
  ball: '<circle cx="48" cy="48" r="32" fill="#fff" stroke="#000" stroke-width="3"/><path d="M48 28l14 10-5 17H39l-5-17z" fill="#000"/>',
  pad: '<rect x="12" y="30" width="72" height="38" rx="18" fill="#444" stroke="#000" stroke-width="2"/><path d="M30 42v14M23 49h14" stroke="#fff" stroke-width="4"/><circle cx="62" cy="44" r="4" fill="#e22"/><circle cx="72" cy="54" r="4" fill="#2a2"/>',
  book: '<path d="M14 24h30v52H14zM52 24h30v52H52z" fill="#fff" stroke="#235" stroke-width="3"/><path d="M20 34h18M20 44h18M20 54h18M58 34h18M58 44h18M58 54h18" stroke="#58a" stroke-width="3"/>',
  building: '<rect x="20" y="16" width="56" height="64" fill="#c9b99a" stroke="#543" stroke-width="3"/><g fill="#3a5a8a"><rect x="28" y="24" width="10" height="10"/><rect x="43" y="24" width="10" height="10"/><rect x="58" y="24" width="10" height="10"/><rect x="28" y="42" width="10" height="10"/><rect x="43" y="42" width="10" height="10"/><rect x="58" y="42" width="10" height="10"/></g><rect x="41" y="60" width="14" height="20" fill="#543"/>',
  pizza: '<path d="M48 84L14 26a60 60 0 0 1 68 0z" fill="#f2b84b" stroke="#a5611a" stroke-width="3"/><circle cx="40" cy="38" r="6" fill="#c0281c"/><circle cx="58" cy="42" r="6" fill="#c0281c"/><circle cx="48" cy="60" r="5" fill="#c0281c"/>',
  phone: '<rect x="30" y="10" width="36" height="76" rx="6" fill="#333" stroke="#000" stroke-width="2"/><rect x="35" y="18" width="26" height="30" fill="#9fd0a0"/><g fill="#aaa"><circle cx="40" cy="58" r="3"/><circle cx="48" cy="58" r="3"/><circle cx="56" cy="58" r="3"/><circle cx="40" cy="68" r="3"/><circle cx="48" cy="68" r="3"/><circle cx="56" cy="68" r="3"/></g>',
  coin: '<circle cx="48" cy="48" r="30" fill="#e8c040" stroke="#8a6a10" stroke-width="3"/><text x="48" y="60" font-size="34" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#8a6a10">₺</text>',
  msn: '<circle cx="36" cy="30" r="12" fill="#2a8a2a"/><path d="M12 80c0-22 12-30 24-30s24 8 24 30z" fill="#2a8a2a"/><circle cx="64" cy="38" r="11" fill="#2a6ab8"/><path d="M42 84c0-20 10-28 22-28s22 8 22 28z" fill="#2a6ab8"/>',
  dumbbell: '<rect x="12" y="38" width="10" height="20" fill="#444"/><rect x="22" y="30" width="10" height="36" fill="#666"/><rect x="32" y="45" width="32" height="6" fill="#999"/><rect x="64" y="30" width="10" height="36" fill="#666"/><rect x="74" y="38" width="10" height="20" fill="#444"/>',
  note: '<path d="M38 18l34-8v50a10 10 0 1 1-6-9V26l-22 5v37a10 10 0 1 1-6-9z" fill="#333"/>',
  plane: '<path d="M10 52l76-30-22 56-14-18-14 8-4-20z" fill="#e8eef8" stroke="#345" stroke-width="3"/>',
};
export const SHAPE_NAMES = Object.keys(SHAPES);
const BGS = ["#9ec8f0", "#f6c8d8", "#c8e8b0", "#f6e0a0", "#d0c0f0", "#f0d0b0", "#b0e0e0", "#e0e0e0"];
export const avatar = (shape, bgIndex = 0) => svg(BGS[bgIndex % BGS.length], SHAPES[shape] || SHAPES.smiley);
export const DISPLAY_PICS = SHAPE_NAMES.map((s, i) => ({ id: s, name: s[0].toUpperCase() + s.slice(1), src: avatar(s, i) }));

export const GROUPS = ["Arkadaşlar", "Aile", "Okul", "İş", "Kurumlar"];

// pic: [shape, background index]; auto: auto-reply text used while away/busy; replies: free chatter
export const DIRECTORY = [
  { name: "Ayşe", email: "ayse_k@hotmail.com", group: "Arkadaşlar", status: "online", pic: ["flower", 1], replies: ["selam! nasılsın?", "bugün ders çok sıkıcıydı :(", "akşam msn'de buluşalım mı?", "haha :D", "ay çok güldüm (L)"] },
  { name: "Mehmet", email: "mehmet.c@hotmail.com", group: "Arkadaşlar", status: "busy", auto: "Şu an ödev yapıyorum, sonra yazarım.", replies: ["şu an biraz meşgulüm", "sonra yazarım", "tamam :)"] },
  { name: "Zeynep", email: "zeynep_88@hotmail.com", group: "Arkadaşlar", status: "away", auto: "Bilgisayarın başında değilim.", replies: ["ben yokum şu an...", "geri dönünce yazarım"] },
  { name: "Can", email: "can_gamer@hotmail.com", group: "Arkadaşlar", status: "online", pic: ["pad", 7], replies: ["counter strike oynuyoruz, gelsene", "(H) ping 40 yaa", "lan yine mi kaybettik :@", "kafeye gelsene"] },
  { name: "Elif", email: "elifcim@hotmail.com", group: "Arkadaşlar", status: "phone", auto: "Telefondayım, 5 dk sonra yazarım.", replies: ["telefondayım, 5 dk", "(T)"] },
  { name: "Burak", email: "burak_34@hotmail.com", group: "Arkadaşlar", status: "offline", pic: ["ball", 2], replies: ["maç var bu akşam, izliyor musun?", "hocam naber (H)", "bizimkiler toplanıyor gel"] },
  { name: "Selin", email: "selin.y@hotmail.com", group: "Arkadaşlar", status: "offline", pic: ["moon", 4], replies: ["heyy :)", "şarkı gönderdim bak (8)"] },
  { name: "Deniz", email: "deniz_s@hotmail.com", group: "Arkadaşlar", status: "online", pic: ["fish", 6], replies: ["yarın yüzmeye gidiyoruz", "geliyor musun?", "tamamdır :D"] },
  { name: "Ece", email: "ece.m@hotmail.com", group: "Arkadaşlar", status: "lunch", auto: "Yemeğe çıktım, birazdan dönerim.", replies: ["yemekteyim :P"] },
  { name: "Kerem", email: "kerem_61@hotmail.com", group: "Arkadaşlar", status: "online", pic: ["car", 5], replies: ["araba aldım lan!", "gel bi tur atalım", ":D"] },
  { name: "Annem", email: "annem_fatma@hotmail.com", group: "Aile", status: "online", pic: ["flower", 3], replies: ["yemek yedin mi kızım/oğlum?", "akşam eve geç kalma", "baban sordu seni", "kendine dikkat et (L)"] },
  { name: "Babam", email: "babam_hasan@hotmail.com", group: "Aile", status: "away", auto: "Haber izliyorum, sonra konuşuruz.", replies: ["internetten ne öğrendin bakalım :)", "iyi akşamlar"] },
  { name: "Abla", email: "abla_gul@hotmail.com", group: "Aile", status: "online", pic: ["heart", 1], replies: ["ben geldim hafta sonu", "bana bir şey alma, sürpriz yap (G)", "annemi arasana"] },
  { name: "Dayım", email: "dayim_ali@hotmail.com", group: "Aile", status: "offline", pic: ["tree", 2], replies: ["nasılsın yeğenim?", "tatilde bize gelin"] },
  { name: "Okul Grubu", email: "okulgrup@hotmail.com", group: "Okul", status: "offline", pic: ["msn", 0], replies: ["yarın sınav var unutmayın!", "ödevi kim yaptı?", "notlar geldi mi?"] },
  { name: "Hoca Nilgün", email: "nilgun.hoca@hotmail.com", group: "Okul", status: "busy", auto: "Ders hazırlığındayım, sorularınızı e-postayla iletebilirsiniz.", replies: ["Proje teslim tarihi cuma.", "Sorularınızı derste sorun lütfen."] },
  { name: "Tolga (Sınıf)", email: "tolga_sinif@hotmail.com", group: "Okul", status: "online", pic: ["note", 7], replies: ["fizik notlarını atar mısın?", "kantinde buluşalım", "ödev ne vakte kadardı?"] },
  { name: "Pınar", email: "pinar_ak@hotmail.com", group: "Okul", status: "online", pic: ["book", 4], replies: ["kütüphanedeyim", "çalışma grubu kuralım mı?", "(Y)"] },
  { name: "Müdür Bey", email: "mudur_bey@hotmail.com", group: "İş", status: "busy", auto: "Toplantıdayım. Önemliyse arayın.", replies: ["Raporu gönder lütfen.", "Toplantı 3'te."] },
  { name: "Serkan (İş)", email: "serkan_is@hotmail.com", group: "İş", status: "online", pic: ["coin", 3], replies: ["faturayı gönderdim", "yarın sunum var hazır mısın?", "çay molası? (C)"] },
  { name: "Gamze", email: "gamze_ofis@hotmail.com", group: "İş", status: "away", auto: "Öğle arasındayım.", replies: ["toplantı notlarını mail attım"] },
  { name: "Üniversite Öğrenci İşleri", email: "ogrenci_isleri@hotmail.com", group: "Kurumlar", status: "online", pic: ["building", 0], replies: ["Kayıt yenileme tarihleri duyurulmuştur.", "Belgeniz hazır, öğrenci işlerinden alabilirsiniz.", "Mesai saatleri 09:00-17:00."] },
  { name: "Kampüs Kütüphanesi", email: "kutuphane@hotmail.com", group: "Kurumlar", status: "online", pic: ["book", 6], replies: ["Ödünç aldığınız kitabın iade tarihi yaklaşıyor.", "Rezervasyonunuz hazır.", "Sessiz çalışma salonu 22:00'ye kadar açık."] },
  { name: "Lezzet Pizza", email: "lezzetpizza@hotmail.com", group: "Kurumlar", status: "online", pic: ["pizza", 5], replies: ["Siparişiniz alındı, 30 dk içinde kapınızda! (P)", "Bugün 2. pizza yarı fiyatına!", "Adresinizi teyit eder misiniz?"] },
  { name: "Belediye Bilgi Hattı", email: "bilgi_hatti@hotmail.com", group: "Kurumlar", status: "away", pic: ["phone", 7], auto: "Mesai saati dışındayız. Mesajınız kaydedildi.", replies: ["Talebiniz kayda alınmıştır."] },
  { name: "Spor Salonu", email: "sporsalonu@hotmail.com", group: "Kurumlar", status: "offline", pic: ["dumbbell", 7], replies: ["Üyeliğiniz bu ay sonunda bitiyor.", "Yeni grup dersleri başladı!"] },
  { name: "MSN Destek", email: "msn_destek@hotmail.com", group: "Kurumlar", status: "online", pic: ["msn", 0], replies: ["MSN Messenger'a hoş geldiniz! Yardım için F1'e basın.", "Kişi eklemek için Add a Contact'ı kullanın.", "Titreşim göndermek için Nudge düğmesine tıklayın."] },
  // not on the list by default: found through "Add a Contact"
  { name: "Gökhan", email: "gokhan_t@hotmail.com", group: "Arkadaşlar", status: "online", hidden: true, pic: ["sun", 3], replies: ["selam eski dost!", "uzun zamandır yoktun :)"] },
  { name: "Merve", email: "merve_ozt@hotmail.com", group: "Okul", status: "offline", hidden: true, pic: ["cat", 1], replies: ["miyav :D"] },
  { name: "Orhan Usta", email: "orhan_usta@hotmail.com", group: "İş", status: "busy", hidden: true, auto: "Atölyedeyim.", pic: ["car", 7], replies: ["makine hazır."] },
  { name: "Başak", email: "basak_k@hotmail.com", group: "Arkadaşlar", status: "online", hidden: true, pic: ["plane", 0], replies: ["tatile gidiyorum! (^)", "sana kartpostal atarım"] },
  { name: "Cem", email: "cem_dj@hotmail.com", group: "Arkadaşlar", status: "away", hidden: true, auto: "Müzik dinliyorum.", pic: ["note", 4], replies: ["yeni mp3'ler var"] },
  { name: "Doğa Kafe", email: "dogakafe@hotmail.com", group: "Kurumlar", status: "online", hidden: true, pic: ["smiley", 3], replies: ["Bu akşam canlı müzik var!"] },
];
DIRECTORY.forEach((d) => { d.photo = avatar(d.pic?.[0] || "smiley", d.pic?.[1] ?? (d.name.charCodeAt(0) % 8)); });

// keyword -> reply rules, tried before the random chatter
export const RULES = [
  [/\b(selam|merhaba|mrb|slm|hey|hello|hi)\b/i, ["selam! :)", "merhaba, hoş geldin", "heyy (H)"]],
  [/(nas[ıi]ls[ıi]n|naber|ne haber|nbr)/i, ["iyiyim sen nasılsın?", "idare eder, sen?", "iyi iyi, senden naber?"]],
  [/(ne yap[ıi]yorsun|napıyon|napıyorsun)/i, ["bi şey yapmıyorum, msn'deyim işte :P", "ders çalışıyorum aslında"]],
  [/(görüşürüz|hoşça|bye|bb|iyi geceler|kendine iyi bak)/i, ["görüşürüz! (H)", "bb, kendine iyi bak", "iyi geceler :)"]],
  [/(sağol|teşekkür|eyvallah|saol)/i, ["rica ederim :)", "ne demek!", "bir şey değil (Y)"]],
  [/(dosya|resim|foto|şarkı|mp3)/i, ["dosya göndersene, bakayım", "Send Files düğmesini kullan :)"]],
  [/(nudge|titre)/i, ["hahaha dur ya :D", "ekran titredi lan :O"]],
  [/\?\s*$/, ["bilmiyorum, sen ne düşünüyorsun?", "hmm düşüneyim...", "bence evet :)", "bence hayır :S"]],
  [/(:\)|:D|haha)/i, ["haha :D", ":)", "(L)"]],
  [/(:\(|üzgün|kötü)/i, ["ya üzülme :(", "geçer, merak etme (H)"]],
];
export const pickReply = (c, text) => {
  for (const [re, list] of RULES) if (re.test(text) && Math.random() < 0.8) return list[Math.floor(Math.random() * list.length)];
  const pool = c.replies?.length ? c.replies : ["..."];
  return pool[Math.floor(Math.random() * pool.length)];
};
