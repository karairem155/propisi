# iPad kurulum ve ilk ayarlar

Uygulamayı kullanmadan önce bu üç ayarı yap. Üçü de atlanırsa uygulama ya sessiz kalır
ya hamle kaybeder ya da topladığın veri yanlış yerde birikir.

---

## 1. Scribble'ı kapat — zorunlu

**Ayarlar → Apple Pencil → Scribble → Kapalı**

iPadOS Scribble, Pencil girişini sistem genelinde izliyor ve canvas üzerinde bile el
yazısı benzeri desenleri yakalıyor. Bildirilen davranış: hızlı **dikey-yatay-dikey**
hamlelerde üçüncü hamle düşüyor.

Bu tam olarak Rus el yazısının ürettiği desen — `и`, `ш`, `м`, `л`, `п` neredeyse özdeş
tekrarlayan dikey-bağlaç şekilleridir. Web API'sinden bastırmak mümkün değil; tek çözüm
bu ayar.

Kapattığını **Test 3 — Scribble** ekranında doğrula: `и` ve `ш`'yi hızlıca çiz, beklenen
hamle sayısını gir, `pointercancel` sayacına ve "düşen hamle" kutusuna bak.

---

## 2. Yüksek kaliteli Rusça sesi İNDİRME — zorunlu

**Ayarlar → Erişilebilirlik → Oku ve Konuş** (eski adı: Sözlü İçerik)

Buradan gelişmiş/yüksek kaliteli Rusça ses **indirme.**

WebKit'in bilinen davranışı: indirilebilir sesler Web Speech API listesinde görünmüyor, ve
önyüklü bir sesin yüksek kaliteli sürümü kurulduğunda o ses Safari'de kayboluyor — yani
**dilin tamamı listeden silinebiliyor.** Rusça sesi indirirsen uygulama sessizleşir.

Uygulamanın kullandığı ses **Milena (ru-RU)**, iPadOS'ta önyüklü gelir. Dokunma.

**Test 1 — Rusça ses** ekranında listede `ru-RU` görünüyor mu kontrol et. Görünmüyorsa
Web Speech yolu kapalıdır ve önceden üretilmiş ses dosyalarına geçilmesi gerekir.

---

## 3. Ana Ekrana Ekle — zorunlu

Safari'de uygulamayı aç → **Paylaş → Ana Ekrana Ekle**.

iOS'ta `beforeinstallprompt` yok, kurulum manuel.

**Bunu atlama, çünkü:** ana ekrana eklenen uygulama, Safari sekmesinden **ayrı bir
depolama kavanozu** kullanır (WebKit bug 181849, 2018'den beri açık). Safari sekmesinde
biriktirdiğin çizim kayıtları kurulu uygulamada **görünmez**.

Kurulu uygulamada olduğunu ana ekrandaki yeşil kutudan anlarsın. Sarı uyarı görüyorsan
hâlâ Safari sekmesindesin.

---

## Neden bunlar önemli

Bu uygulamanın asıl değeri biriken çizim geçmişi: hangi harfte hangi hatayı yaptığın,
zamanla neyin düzeldiği. O veri değerlendirme eşiklerini ayarlamak için de kullanılıyor.

Yanlış ortamda toplanan veri işe yaramaz, ve silinen veri geri gelmez. Bu yüzden:

- **Kayıtlar ve yedek** ekranından düzenli olarak **JSON dışa aktar.**
- `navigator.storage.persist()` uygulama açılışında isteniyor ama **garanti değil** —
  cihaz depolama baskısı altında tahliye hâlâ mümkün.
- Manuel yedek her depolama API'sinden kıymetli.

---

## Sorun giderme

**Ses hiç çıkmıyor.** Önce iPad'in donanım sessiz anahtarına bak — Safari ona saygı
gösterir. Sonra Test 1'de "Sesi hazırla" düğmesine bas: iOS'ta `speak()` kullanıcı
hareketi gerektirir.

**Çizgi kalemin gerisinde kalıyor.** Test 2'de iki paneli karşılaştır. Kırmızı artı ham
kalem konumu; mürekkebin ondan ne kadar geride kaldığı algılanan gecikmedir.

**Parmakla çizebiliyorum.** Çizim yüzeyinde "Sadece Pencil" kutusunu işaretle.

**Yeni sürüm gelmiyor.** Service worker eski kabuğu tutuyordur. Yeni sürüm yayınlanırken
`public/sw.js` içindeki `VERSION` artırılmalı; artırılmadıysa uygulama eski hâlinde kalır.
