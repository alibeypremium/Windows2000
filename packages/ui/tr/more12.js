// Turkish strings: ICQ 99b (win98.si port). Accelerator "&" marks are stripped from keys by the loader.
export const MORE12 = {
  "By Date": "Tarihe Göre", "By Site": "Siteye Göre", "By Most Visited": "En Çok Ziyaret Edilene Göre", "By Order Visited Today": "Bugünkü Ziyaret Sırasına Göre", "Today": "Bugün",
  "Type a word or phrase": "Bir sözcük veya tümce yazın", "New": "Yeni", "Next": "İleri", "Customize": "Özelleştir", "Archive Year": "Arşiv Yılı", "Archive Options...": "Arşiv Seçenekleri...", "Choose Date...": "Tarih Seç...", "Wayback Calendar...": "Wayback Takvimi...", "Share Link (copy to Clipboard)": "Bağlantıyı Paylaş (Panoya Kopyala)", "Sites from the web of 2000": "2000'lerin Web Siteleri", "Wayback Machine": "Wayback Machine",
  "Online": "Çevrimiçi", "Offline": "Çevrimdışı", "GO": "ARA", "Open ICQ": "ICQ'yu Aç", "Enter Search Keyword": "Arama anahtar sözcüğünü girin", "Add Users": "Kullanıcı Ekle", "Services": "Hizmetler", "System Menu": "Sistem Menüsü",
  "Message": "İleti", "Chat": "Sohbet", "File": "Dosya", "URL": "URL", "Contacts": "Kişiler", "Info": "Bilgi", "History": "Geçmiş", "Rename": "Yeniden Adlandır", "Delete": "Sil",
  "Find/Add Users": "Kullanıcı Bul/Ekle", "ICQ White Pages": "ICQ Beyaz Sayfalar", "ICQ Chat Rooms": "ICQ Sohbet Odaları", "ICQ Search": "ICQ Arama", "ICQ Now!": "ICQ Şimdi!",
  "My ICQ Page": "ICQ Sayfam", "Reminder": "Hatırlatıcı", "Notes": "Notlar", "ToDo": "Yapılacaklar", "Email": "E-posta", "Phone - \"Follow Me\"": "Telefon - \"Beni Takip Et\"", "Message Archive": "İleti Arşivi", "ICQ Active List": "ICQ Etkin Liste", "E-ICQ": "E-ICQ",
  "Add/Invite Users": "Kullanıcı Ekle/Davet Et", "Status": "Durum", "Preferences...": "Tercihler...", "Security & Privacy...": "Güvenlik ve Gizlilik...", "View/Change My Details...": "Bilgilerimi Görüntüle/Değiştir...", "Help": "Yardım", "About ICQ...": "ICQ Hakkında...", "Shut Down": "Kapat", "To Advanced Mode": "Gelişmiş Moda Geç",
  "Available/Connect": "Uygun/Bağlan", "Free For Chat": "Sohbete Açık", "Away": "Uzakta", "N/A (Extended Away)": "Yok (Uzun Süre Uzakta)", "Occupied (Urgent Msgs)": "Meşgul (Acil İletiler)", "DND (Do not Disturb)": "RAHATSIZ ETMEYİN", "Privacy (Invisible)": "Gizlilik (Görünmez)", "Offline/Disconnect": "Çevrimdışı/Bağlantıyı Kes",
  "N/A": "Yok", "Occupied": "Meşgul", "DND": "RE", "Privacy": "Gizlilik", "Disconnected": "Bağlantı Kesildi", "Do Not Disturb": "Rahatsız Etmeyin", "Invisible": "Görünmez",
  "ICQ Registration": "ICQ Kaydı", "ICQ# (UIN)": "ICQ# (UIN)", "Register a new ICQ#": "Yeni bir ICQ# kaydet", "I already have an ICQ# (UIN):": "Zaten bir ICQ#'m var (UIN):", "Enter your details:": "Bilgilerinizi girin:", "Nickname:": "Takma ad:", "First Name:": "Adı:", "Last Name:": "Soyadı:", "E-mail:": "E-posta:",
  "Please enter a valid ICQ# (UIN).": "Lütfen geçerli bir ICQ# (UIN) girin.", "This is your own ICQ#.": "Bu sizin kendi ICQ#'nız.", "This ICQ# is already in your Contact List.": "Bu ICQ# zaten Kişi Listenizde.",
  "Find/Add Users to Your List": "Listenize Kullanıcı Bul/Ekle", "Search keyword:": "Aranacak sözcük:", "Search": "Ara", "Add User": "Kullanıcı Ekle", "Nickname": "Takma ad", "Name": "Ad", "City": "Şehir", "No users found.": "Kullanıcı bulunamadı.", "Close": "Kapat",
  "Main": "Ana", "Home": "Ev", "Work": "İş", "More": "Diğer", "About": "Hakkında", "Interests": "İlgi Alanları", "Status:": "Durum:",
  "State:": "Eyalet:", "Country:": "Ülke:", "City:": "Şehir:", "Phone:": "Telefon:", "Homepage:": "Ana sayfa:", "Company:": "Şirket:", "Position:": "Görev:", "Age:": "Yaş:", "Gender:": "Cinsiyet:", "Not specified": "Belirtilmedi", "Female": "Kadın", "Male": "Erkek",
  "About:": "Hakkında:", "Interests (separate with commas):": "İlgi alanları (virgülle ayırın):", "Notes:": "Notlar:", "Only you can see your notes about this user.": "Bu kullanıcıyla ilgili notlarınızı yalnızca siz görebilirsiniz.",
  "No messages.": "İleti yok.", "ICQ System": "ICQ Sistemi", "Message could not be delivered. User is offline.": "İleti teslim edilemedi. Kullanıcı çevrimdışı.",
  "Yes": "Evet", "No": "Hayır", "Send": "Gönder", "About ICQ": "ICQ Hakkında", "Copyright (C) 1996-1999 Mirabilis Ltd.": "Telif Hakkı (C) 1996-1999 Mirabilis Ltd.",
};
export const RULES12 = [
  [/^User Details - (.+)$/, (n) => `Kullanıcı Ayrıntıları - ${n}`],
  [/^View\/Change My Details - (\d+)$/, (n) => `Ayrıntılarımı Görüntüle/Değiştir - ${n}`],
  [/^History - (.+)$/, (n) => `Geçmiş - ${n}`],
  [/^Message Session with (.+)$/, (n) => `${n} ile İleti Oturumu`],
  [/^Your UIN: (\d+)$/, (n) => `UIN'iniz: ${n}`],
  [/^Are you sure you want to delete "(.+)" from your Contact List\?$/, (n) => `"${n}" kişisini Kişi Listenizden silmek istediğinizden emin misiniz?`],
];
