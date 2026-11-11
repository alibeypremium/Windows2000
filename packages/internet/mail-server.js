// Local, simulated mail "server" for Outlook Express: nothing leaves the browser. It delivers
// believable e-mails from many fictional senders over time, answers messages you send to people
// in your Address Book, and applies the user's message rules to everything that arrives.
import { DOCS } from "../core/index.js";
import { dailyPick } from "./netscape-sites.js";

export const MAIL = DOCS + "/Mail.json";
export const CONTACTS = DOCS + "/Address Book.json";
export const FOLDERS = ["Inbox", "Outbox", "Sent Items", "Deleted Items", "Drafts"];

const day = 86400000, min = 60000;
export const addr = (name, email) => `${name} <${email}>`;
export const emailOf = (s) => (String(s || "").match(/<([^>]+)>/)?.[1] || String(s || "").trim()).toLowerCase();
export const nameOf = (s) => String(s || "").replace(/<[^>]*>/, "").replace(/["']/g, "").trim() || emailOf(s);
/** The user's own address: <computer name>@hotmail.com, shown with the user name. */
export const myEmail = (ctx) => (String(ctx.settings.get("computerName") || "user").toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user") + "@hotmail.com";
export const myAddr = (ctx) => addr(ctx.settings.get("username") || "Administrator", myEmail(ctx));
export const splitAddrs = (s) => String(s || "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);

const PEOPLE = {
  ayse: addr("Ayşe Yılmaz", "ayse.yilmaz@hotmail.com"),
  mehmet: addr("Mehmet Kaya", "mehmet.kaya@yahoo.com"),
  zeynep: addr("Zeynep Demir", "zeynep.demir@superonline.com"),
  can: addr("Can Öztürk", "can.ozturk@hotmail.com"),
  elif: addr("Elif Arslan", "elif.arslan@mynet.com"),
  burak: addr("Burak Şahin", "burak.sahin@yahoo.com"),
  selin: addr("Selin Çelik", "selin.celik@hotmail.com"),
};
const SENDERS = {
  hotmail: addr("The Hotmail Team", "support@hotmail.com"),
  msn: addr("MSN Messenger Team", "messenger-team@msn.com"),
  netscape: addr("Netscape Netcenter", "netcenter@netscape.com"),
  winupd: addr("Windows Update", "windowsupdate@microsoft.com"),
  shop: addr("Kitapyurdu Sipariş", "siparis@kitapyurdu-online.com"),
  cargo: addr("Hızlı Kargo Takip", "takip@hizlikargo.com.tr"),
  zdnet: addr("Bilgisayar Dünyası Bülten", "bulten@bilgisayardunyasi.com.tr"),
  sport: addr("Spor Gazetesi", "haber@spor-gazetesi.com.tr"),
  bank: addr("Çarşı Bankası", "bilgi@carsibank.com.tr"),
  travel: addr("Gezgin Turizm", "kampanya@gezginturizm.com.tr"),
  winamp: addr("Winamp.com", "news@winamp.com"),
  school: addr("Öğrenci İşleri", "ogrenciisleri@universite.edu.tr"),
};

const lines = (...l) => l.join("\n");
const TXT = (name, text) => ({ name, mime: "text/plain", enc: "text", data: text });
const WDOC = (name, html) => ({ name, mime: "application/json", enc: "text", data: JSON.stringify({ format: "win2k-wordpad", version: 1, html }) });
const PNG = (name, a, b, label) => ({ name, mime: "image/png", enc: "png", a, b, label });

// Each template is delivered once, in this order (interleaved so the Inbox feels varied).
const POOL = [
  { from: PEOPLE.ayse, subject: "Bu akşam buluşuyor muyuz?", body: lines("Selam!", "", "Bu akşam 8 gibi kahve içmeye ne dersin? Mehmet'le Can da geliyor.", "Haber ver, ona göre yer ayırtayım.", "", "Öpüldün,", "Ayşe") },
  { from: SENDERS.hotmail, subject: "Hotmail'e hoş geldiniz!", body: lines("Merhaba,", "", "Hotmail hesabınız hazır! Artık dünyanın her yerinden e-postanıza ulaşabilirsiniz.", "", "- Posta kutunuz: 2 MB", "- Adres defteri ve takvim", "- Virüs taraması", "", "Güvenliğiniz için şifrenizi kimseyle paylaşmayın.", "", "The Hotmail Team") },
  { from: SENDERS.msn, subject: "MSN Messenger 5.0'a hoş geldiniz", body: lines("MSN Messenger'ı indirdiğiniz için teşekkür ederiz.", "", "Arkadaşlarınızla anında sohbet edin, durumunuzu paylaşın ve emoticon'larla mesajlarınıza renk katın.", "", "İpucu: Bir kişiyle sohbet etmek için listeden adına çift tıklayın.", "", "MSN Messenger Team"), },
  { from: PEOPLE.mehmet, subject: "Fwd: Çok komik (kesin oku)", body: lines("Abi bunu bir oku, gülmekten öldüm :)", "", "----- Forwarded -----", "Bir adam bilgisayarcıya gitmiş: 'Bilgisayarım yavaş' demiş.", "Bilgisayarcı: 'Kaç yaşında?' - 'Üç.' - 'O zaman ona biraz zaman verin, daha çocuk!'", "", "Mehmet") },
  { from: SENDERS.shop, subject: "Siparişiniz kargoya verildi (#48213)", body: lines("Sayın müşterimiz,", "", "Siparişiniz kargoya verilmiştir.", "", "  1 adet  Windows 2000 Server Kullanım Kılavuzu", "  1 adet  Her Yönüyle Ağ Programlama", "", "Tahmini teslimat: 2-3 iş günü.", "Kargo takip kodu: HK-77421-TR", "", "Kitapyurdu Sipariş") },
  { from: PEOPLE.zeynep, subject: "Tatil fotoğrafları", body: lines("Merhaba canım,", "", "Tatilden fotoğrafları ekledim, çok güzel çıktı özellikle gün batımı. Hepsini seçmek zor oldu, birini yolluyorum, kalanını CD'ye yakarım.", "", "Sen ne yapıyorsun, sınavlar nasıl gidiyor?", "", "Zeynep"), attach: PNG("gunbatimi.png", "#f08a3c", "#3a2a6a", "Tatil 2000") },
  { from: SENDERS.zdnet, subject: "Bu haftanın teknoloji haberleri", body: lines("BİLGİSAYAR DÜNYASI - HAFTALIK BÜLTEN", "", "* Yeni işletim sistemlerinde kararlılık dönemi: Windows 2000 kurumsal dünyada hızla yayılıyor.", "* ADSL internet büyük şehirlerde yaygınlaşıyor.", "* MP3 çalarlar cebimize girdi: 64 MB bellekli modeller satışta.", "* Test: En iyi CD yazıcılar.", "", "Aboneliğinizi iptal etmek için bu iletiyi yanıtlayın.") },
  { from: PEOPLE.can, subject: "Ödev", body: lines("Selam,", "", "Dünkü ders notlarını ekledim, bakarsan sevinirim. Perşembe günü teslim, unutma.", "", "Can"), attach: TXT("ders-notlari.txt", lines("DERS NOTLARI - Bilgisayar Ağları", "", "1. OSI katmanları: fiziksel, veri bağı, ağ, taşıma, oturum, sunum, uygulama.", "2. TCP bağlantı odaklıdır; UDP bağlantısızdır.", "3. IP adresi: 4 oktet, örn. 192.168.1.10", "4. DNS alan adlarını IP adreslerine çevirir.", "", "Perşembe teslim!")) },
  { from: SENDERS.winupd, subject: "Windows 2000 için güncelleştirmeler hazır", body: lines("Bilgisayarınız için önemli güncelleştirmeler bulundu.", "", "  - Güvenlik güncelleştirmesi", "  - Internet Explorer için düzeltme", "", "Yüklemek için Başlat > Windows Update'e gidin.", "", "Bu ileti otomatik gönderilmiştir.") },
  { from: PEOPLE.elif, subject: "Doğum günü daveti 🎂", body: lines("Merhaba!", "", "Cumartesi günü doğum günüm var, evde küçük bir kutlama yapıyoruz. Saat 7'de bekliyorum, sakın gelmemezlik yapma :)", "", "Adres bilgisini sana ayrıca yollarım.", "", "Elif") },
  { from: SENDERS.cargo, subject: "Kargonuz dağıtımda", body: lines("Kargonuz bugün adresinize teslim edilmek üzere dağıtıma çıkmıştır.", "", "Takip no: HK-77421-TR", "Teslimat aralığı: 10:00 - 17:00", "", "Evde bulunmamanız halinde şubemize bırakılacaktır.") },
  { from: SENDERS.netscape, subject: "Netscape Netcenter'dan haftalık öneriler", body: lines("Bu hafta Netcenter'da:", "", "- En iyi 10 web sitesi", "- Arama motoru ipuçları", "- Yeni Netscape sürümü indirmeye hazır", "", "Netscape Netcenter") },
  { from: PEOPLE.burak, subject: "Maç sonucu", body: lines("Gördün mü maçı?! Son dakikada attılar, inanamadım.", "", "Haftaya yine bakalım mı? Sen yeter ki gel.", "", "Burak") },
  { from: SENDERS.bank, subject: "Hesap hareketleriniz hakkında bilgilendirme", body: lines("Sayın müşterimiz,", "", "Hesabınızla ilgili aylık bilgi mesajınız ektedir.", "", "Güvenliğiniz için şifrenizi veya kart bilgilerinizi e-posta ile kimseyle paylaşmayınız. Bankamız e-posta ile hiçbir zaman şifre istemez.", "", "Çarşı Bankası"), attach: TXT("hesap-ozeti.txt", lines("HESAP ÖZETİ", "", "Tarih        Açıklama               Tutar", "-------------------------------------------", "01.03        Maaş                  +1.500,00", "05.03        Market                  -84,20", "12.03        Fatura                  -61,00", "", "Güncel bakiye: 1.354,80")) },
  { from: PEOPLE.selin, subject: "Şarkı önerisi", body: lines("Selam!", "", "Yeni bir şarkı keşfettim, sana mutlaka dinletmem lazım. Winamp'a atıp arkana yaslan :)", "", "Selin") },
  { from: SENDERS.sport, subject: "Günün özeti", body: lines("SPOR GAZETESİ", "", "* Lig'de haftanın maçı oynandı.", "* Basketbolda play-off heyecanı başlıyor.", "* Transfer dedikoduları kızışıyor.", "", "Tüm haberler için sitemizi ziyaret edin.") },
  { from: SENDERS.travel, subject: "Yaz tatili için erken rezervasyon fırsatı", body: lines("Yaz sezonunda erken rezervasyon yaptıranlara özel fiyatlar!", "", "  Bodrum  - 7 gece, her şey dahil", "  Antalya - 5 gece, yarım pansiyon", "", "Kontenjanlar sınırlıdır.") },
  { from: PEOPLE.ayse, subject: "Re: Bu akşam buluşuyor muyuz?", body: lines("Harika! 8'de sinemanın önünde buluşalım, sonra bir şeyler yeriz.", "", "Ayşe") },
  { from: SENDERS.winamp, subject: "Winamp yeni sürüm ve skin'ler", body: lines("Winamp ile müziğin keyfini çıkarın!", "", "Yeni skin'ler ve eklentiler yayında. Favori çalma listenizi paylaşın.", "", "Winamp.com") },
  { from: PEOPLE.mehmet, subject: "Bilgisayar sorunu", body: lines("Selam, bilgisayarım sürekli donuyor, yarın bir bakabilir misin?", "", "Belki RAM'dir, belki sabit disk, bilmiyorum.", "", "Mehmet"), attach: WDOC("hata-notlari.wdoc", "<p><b>Donma anları</b></p><ul><li>Pazartesi: oyun açıkken</li><li>Salı: internette gezerken</li><li>Çarşamba: hiçbir şey yapmıyordum!</li></ul>") },
  { from: SENDERS.school, subject: "Sınav takvimi açıklandı", body: lines("Güz dönemi sınav takvimi ektedir.", "", "Sınav yerleri ve saatleri öğrenci bilgi sisteminde yayınlanacaktır.", "", "Başarılar dileriz.", "Öğrenci İşleri"), attach: TXT("sinav-takvimi.txt", lines("SINAV TAKVİMİ", "", "Pazartesi  09:30  Matematik", "Salı       13:00  Fizik", "Çarşamba   10:00  Bilgisayar Programlama", "Perşembe   14:30  Ağlar", "Cuma       09:00  İngilizce")) },
  { from: PEOPLE.zeynep, subject: "Bir şey soracaktım", body: lines("Selam, hafta sonu boş musun? Ufak bir sürprizim var, ama şimdilik söylemem :)", "", "Zeynep") },
  { from: SENDERS.hotmail, subject: "Posta kutunuz neredeyse dolu", body: lines("Posta kutunuzun %80'i doldu.", "", "Gereksiz iletileri silerek yer açabilir, 'Silinmiş Öğeler' klasörünü boşaltabilirsiniz.", "", "The Hotmail Team") },
  { from: PEOPLE.can, subject: "Fwd: Fwd: Fwd: Bunu 10 kişiye gönder!!!", body: lines("Bunu 10 kişiye göndermezsen 3 gün içinde kötü şans seni bulacakmış :))", "", "Tabii ki inanmıyorum, ama sana da yolluyorum, sen bilirsin.", "", "Can") },
  { from: SENDERS.msn, subject: "Arkadaşlarınız sizi bekliyor", body: lines("Messenger'a giriş yapmayı unutmayın!", "", "Kişi listenizdeki arkadaşlarınızdan bazıları şu anda çevrimiçi.", "", "MSN Messenger Team") },
  { from: PEOPLE.elif, subject: "Teşekkürler!", body: lines("Dünkü yardımın için çok teşekkür ederim, hayat kurtardın.", "", "Bir kahve borcum var sana :)", "", "Elif") },
];

export function makeAttachment(a, size = true) {
  if (!a) return null;
  if (a.enc === "png") {
    const c = document.createElement("canvas");
    c.width = 480; c.height = 300;
    const g = c.getContext("2d"), grad = g.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, a.b); grad.addColorStop(0.7, a.a); grad.addColorStop(1, "#fff4c8");
    g.fillStyle = grad; g.fillRect(0, 0, 480, 300);
    g.fillStyle = "#fff8d8"; g.beginPath(); g.arc(240, 190, 38, 0, 7); g.fill();
    g.fillStyle = "#1c1630"; g.fillRect(0, 232, 480, 68);
    g.fillStyle = "#fff"; g.font = "bold 22px sans-serif"; g.fillText(a.label || "", 16, 36);
    const data = c.toDataURL("image/png");
    return { name: a.name, mime: "image/png", enc: "data-url", data, size: Math.round(data.length * 0.75) };
  }
  return { name: a.name, mime: a.mime, enc: "text", data: a.data, size: new Blob([a.data]).size };
}

const read = (ctx, path, initial) => { try { return JSON.parse(ctx.fs.readFile(path)); } catch { return initial; } };
const mailOf = (ctx) => read(ctx, MAIL, []);

export async function addMessages(ctx, msgs) {
  if (!msgs.length) return;
  await ctx.fs.updateJSON(MAIL, (mail) => (Array.isArray(mail) ? [...mail, ...msgs] : msgs));
}

/* ------------------------------------------------------------------ rules */
export const getRules = (ctx) => ctx.settings.get("oeMailRules") || [];
export function applyRules(ctx, msg) {
  for (const r of getRules(ctx)) {
    if (!r.enabled) continue;
    const hay = String(r.field === "from" ? msg.from : r.field === "to" ? msg.to : msg.subject).toLowerCase();
    if (!r.contains || !hay.includes(r.contains.toLowerCase())) continue;
    if (r.action === "delete") return { ...msg, folder: "Deleted Items", unread: false };
    if (r.action === "read") msg = { ...msg, unread: false };
    if (r.action === "move" && r.folder) msg = { ...msg, folder: r.folder };
  }
  return msg;
}

/* ------------------------------------------------------------------ replies to outgoing mail */
const REPLIES = [
  (n, s) => lines(`Merhaba!`, "", `"${s}" konulu mesajını aldım, teşekkürler. Birazdan detaylı yazarım.`, "", n),
  (n) => lines("Selam,", "", "Mesajın için sağ ol! Haberleşelim, görüşmek lazım.", "", n),
  (n, s) => lines("Merhabalar,", "", `"${s}" ile ilgili düşündüm; bence güzel olur. Cumartesi uygun musun?`, "", n),
  (n) => lines("Çok teşekkürler :)", "", "Yarın konuşuruz, şimdi biraz meşgulüm.", "", n),
];
export function queueReplies(ctx, sent) {
  const contacts = read(ctx, CONTACTS, []);
  const known = new Map([...Object.values(PEOPLE)].map((p) => [emailOf(p), p]));
  for (const c of contacts) if (c.email) known.set(c.email.toLowerCase(), addr(c.name, c.email));
  const q = ctx.settings.get("oeQueue") || [];
  for (const to of splitAddrs(sent.to)) {
    const key = emailOf(to), person = known.get(key);
    if (!person) continue;
    const auto = /^(support|noreply|info|siparis|bilgi)@/.test(key);
    const n = nameOf(person).split(" ")[0];
    const body = auto ? lines("Mesajınız alındı.", "", `Destek talebi numaranız: #${Math.floor(10000 + Math.random() * 89999)}`, "En kısa sürede dönüş yapılacaktır.") : REPLIES[Math.floor(Math.random() * REPLIES.length)](n, sent.subject || "");
    q.push({ due: Date.now() + (8 + Math.random() * 14) * 1000, msg: { from: person, to: myAddr(ctx), subject: /^re:/i.test(sent.subject || "") ? sent.subject : "Re: " + (sent.subject || "(No subject)"), body: body + "\n\n-----Original Message-----\nFrom: " + (sent.from || "") + "\nTo: " + sent.to + "\nSubject: " + (sent.subject || "") + "\n\n" + (sent.body || "") } });
  }
  ctx.settings.set("oeQueue", q);
}

/* ------------------------------------------------------------------ delivery */
const newMsg = (p, when, to) => ({ id: crypto.randomUUID(), folder: "Inbox", from: p.from, to, subject: p.subject, body: p.body, date: when, unread: true, attachments: p.attach ? [makeAttachment(p.attach)] : [] });

/** Delivers new mail. force: Send/Receive pressed. Returns the delivered messages. */
export async function checkMail(ctx, { force = false } = {}) {
  const now = Date.now(), out = [];
  const q = ctx.settings.get("oeQueue") || [], rest = [];
  for (const it of q) (it.due <= now ? out.push(applyRules(ctx, { id: crypto.randomUUID(), folder: "Inbox", date: now, unread: true, attachments: [], ...it.msg })) : rest.push(it));
  if (rest.length !== q.length) ctx.settings.set("oeQueue", rest);
  let idx = ctx.settings.get("oeServerIdx");
  if (idx == null) { // first visit: a few messages from the last days are already waiting
    idx = 0;
    for (let i = 0; i < 4; i++) { const m = newMsg(POOL[idx++], now - (4 - i) * 5 * 3600000 - Math.random() * 3600000, myAddr(ctx)); m.unread = i > 1; out.push(applyRules(ctx, m)); }
    ctx.settings.set("oeLastCheck", now);
  } else {
    const last = ctx.settings.get("oeLastCheck") || now, gap = now - last;
    let n = gap > 20 * min ? Math.min(3, 1 + Math.floor(gap / (40 * min))) : gap > 2 * min || force ? (Math.random() < (force ? 0.55 : 0.75) ? 1 : 0) : 0;
    if (force && gap <= 2 * min) n = Math.random() < 0.4 ? 1 : 0;
    if (n) ctx.settings.set("oeLastCheck", now);
    while (n-- > 0) {
      let p = POOL[idx % POOL.length];
      const cycle = Math.floor(idx / POOL.length);
      if (cycle) p = { ...p, subject: p.subject + ` (${cycle + 1})` };
      idx++;
      out.push(applyRules(ctx, newMsg(p, now - Math.floor(Math.random() * 90) * 1000, myAddr(ctx))));
    }
  }
  ctx.settings.set("oeServerIdx", idx);
  out.push(...(await dailyMails(ctx, now)).map((m) => applyRules(ctx, m)));
  await addMessages(ctx, out);
  return out;
}

/** Moves messages waiting in the Outbox to Sent Items and queues replies. */
export async function flushOutbox(ctx, olderThanMs = 0, includeLater = false) {
  const cutoff = Date.now() - olderThanMs, sent = [];
  await ctx.fs.updateJSON(MAIL, (mail) => (mail || []).map((m) => (m.folder === "Outbox" && (includeLater || !m.later) && m.date <= cutoff ? (sent.push(m), { ...m, folder: "Sent Items", unread: false }) : m)));
  for (const m of sent) queueReplies(ctx, m);
  return sent;
}
export async function sendLaterToOutbox(ctx, msg) { await ctx.fs.updateJSON(MAIL, (mail) => [...(mail || []).filter((m) => m.id !== msg.id), { ...msg, folder: "Outbox", later: true, unread: false }]); }

export const fmtSize = (n) => (n < 1024 ? n + " B" : n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB");

/* ------------------------------------------------------------------ daily mails (once per day, when Outlook Express opens) */
const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
async function onThisDay(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
  try {
    const j = await (await fetch(`https://tr.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`, { signal: ctl.signal })).json();
    const list = (title, items, n) => (items?.length ? `${title}\n` + items.slice(0, n).map((e) => `  ${e.year} - ${String(e.text).replace(/\s+/g, " ")}`).join("\n") + "\n\n" : "");
    const body = list("OLAYLAR", j.selected?.length ? j.selected : j.events, 10) + list("DOĞUMLAR", j.births, 6) + list("ÖLÜMLER", j.deaths, 6) + list("BAYRAMLAR VE ANMA GÜNLERİ", j.holidays, 5);
    return body || null;
  } catch { return null; } finally { clearTimeout(t); }
}
async function dailyMails(ctx, now) {
  const d = new Date(now), key = d.toDateString();
  if (ctx.settings.get("oeDailyDate") === key) return [];
  ctx.settings.set("oeDailyDate", key);
  const label = `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`, to = myAddr(ctx), p = dailyPick(0, d);
  const wiki = await onThisDay(d);
  const hist = { from: addr("Tarihte Bugün", "tarihtebugun@netcenter.com"), subject: `Tarihte Bugün - ${label}`, body: `Tarihte bugün (${label})\n\n` + (wiki || "Vikipedi'ye şu anda ulaşılamadı. Netscape veya Internet Explorer'da about:today adresinden bugünün olaylarını okuyabilirsiniz.\n\n") + "Kaynak: Vikipedi (tr.wikipedia.org) - Tarihte bugün" };
  const dini = { from: addr("Günün Ayeti, Hadisi ve Esması", "gunun@netcenter.com"), subject: `Günün Ayeti, Hadisi ve Esması - ${label}`, body: `${label} ${d.getFullYear()}\n\nGÜNÜN AYETİ\n${p.ayet[1]}\n(${p.ayet[0]})\n\nGÜNÜN HADİSİ\n${p.hadis[0]}\n(${p.hadis[1]})\n\nGÜNÜN ESMASI (${p.i + 1}/99)\n${p.esma[0]}  -  ${p.esma[1]}\n${p.esma[2]}\n\nNot: Ayet ve hadis metinleri kısa Türkçe anlatımlardır (mealen), resmî meal değildir.` };
  return [dini, hist].map((m, i) => ({ id: crypto.randomUUID(), folder: "Inbox", to, date: now - i * 1000, unread: true, attachments: [], ...m }));
}
