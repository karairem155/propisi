# Ekran envanteri

Brief Bölüm 7'deki modülleri somut sayfalara bağlar. Kod yazmadan önce burada anlaşılır.

Durum: **taslak — onay bekliyor.** Onaylanan kısımlar Faz 2'den itibaren uygulanır.

---

## 0. Yapısal karar: "Bugün" ile "Patika" ayrı şeylerdir

Woofz referansındaki patika bir **müfredat haritası**: nerede kaldım, sırada ne var.

Brief'in ana ekranı ise bunun aynısı değil — kullanıcının açık isteği şuydu:

> *"tekrar etme kısmı önemli olsun unutturmamak için"*

ve brief 7.0 bunu net yazıyor: **"Ana ekran bir menü değil, bugünün tekrar kuyruğudur."**

Bu ikisi farklı soruları cevaplıyor:

| | Soru | Sürücü |
|---|---|---|
| **Bugün** | Şu an ne yapmalıyım? | FSRS kuyruğu — seviyeden bağımsız |
| **Patika** | Nerede kaldım, sırada ne var? | Müfredat sırası — grup grup ilerler |

**Patika, Bugün'ün yerine geçmez.** Geçerse uygulama bir ders listesine döner ve
unutturmama garantisi (brief 8.3) görünmez olur. İkisi ayrı sekme.

**Buna karşılık patika bir şey kazanıyor:** düğümler sadece "bitti/bitmedi" değil,
**solma** da gösterir. FSRS bir harfi geciktirmişse o düğüm yeşil kalmaz, kehribar
rozetle "hatırlatma" durumuna geçer. Referansta bu yok; bizde olması şart, çünkü
uygulamanın tamamı unutmama üzerine kurulu.

---

## 1. Sekmeler

**Üç sekme** (19 Eylül 2026'da beşten üçe indirildi):

| # | Sekme | Tek sorusu |
|---|---|---|
| 1 | **Tekrar** | Şu an ne yapmalıyım? |
| 2 | **Patika** | Nerede kaldım? |
| 3 | **Profil** | Nasıl ayarlarım? |

**Kaldırılanlar ve nereye gittiler:**

- **Bugün** silindi — Patika'nın "devam et" kartıyla yarı yarıya aynı işi yapıyordu.
  İşlevini **Tekrar** tamamen devraldı.
- **İlerleme** sekme olmaktan çıktı, ekran olarak kaldı. Patika'nın üstündeki özet
  şeritten ve Profil'den açılıyor.
- **Alfabe** sekme olmaktan çıktı, Patika'nın **Izgara** görünümü oldu.
  Aynı müfredat, iki bakış: sıralı yol vs. serbest ızgara.

**Kritik:** Bugün silinince brief 8.3'teki *"ana ekranda her zaman bugünkü tekrar
sayısı görünür"* garantisi kaybolacaktı. Sayı **Tekrar sekmesinin ikonuna rozet**
olarak taşındı — artık tek bir ekranda değil, **her ekranda** görünüyor.

---

## 2. Sayfalar, tane tane

### 2.1 Tekrar · `#/`

Sayfanın tek sorusu: **ne yapmalıyım?** Üç blok.

**1 · Kuyruk** (brief 7.0)

```
● 3 geciken
Bugün tekrar
 7 harf      12 kelime
 4 bağlantı   3 dikte
      [ Başla · 26 ]
```

Kuyruk karışık türdedir — harf, kelime, dikte, eşleştirme aynı oturumda (brief 7.0).
Geciken kartlar kırmızı rozetle ayrı (brief 8.3).

**2 · Zorlandıkların** — teşhisin EYLEME DÖNÜK kısmı

```
ш  ▓▓▓▓▓▓░  7   tepe sayısı
д  ▓▓▓▓░░░  5   yön
у  ▓▓░░░░░  3   ilmek
       [ Bunları çalış ]
```

Sadece bilgi değil, **düğmesi var** — kuyruğa ek bir oturum kurar. Kuyruk boşken bu
blok sayfanın merkezine geçer ve kehribar çerçeveyle vurgulanır: "Bugünlük tamam ✓"
tek başına ölü ekran, orada "şunları pekiştir" demek çok daha iyi.

Teşhisin **arşiv** kısmı (ısı haritası, zamanla gelişim, yazının değişimi) buraya
girmez — İlerleme ekranında kalır. Her gün görülen ama hiç dokunulmayan gürültü
olmasın.

**3 · Seri ve hedef** — yumuşak hedef, sert limit yok (brief 8.3).
Sağ altta `tüm istatistikler ›` bağlantısı İlerleme'ye gider.

> **Teşhisin en etkili anı aslında oturum bitişi.** Hata taze, bağlam açık.
> Oturum özeti modalında "bugün 3 kez tepe sayısı" demek, aynı bilgiyi bir istatistik
> ekranında göstermekten çok daha güçlü. Asıl teşhis oraya, özet Tekrar'a,
> arşiv İlerleme'ye.

### 2.2 Patika · `#/patika` — YENİ, referansın karşılığı

**Üstte özet şerit:** ustalaşılan · açılan · tekrar bekliyor. Tamamı İlerleme'ye
tıklanır kapı.

**Altında görünüm anahtarı:** `[ Yol ] [ Izgara ]` — Yol sıralı patika, Izgara eski
Alfabe ekranı (33 harf + elemanlar + bağlantılar, serbest erişim).

Yol görünümü: dikey kaydırılan kıvrımlı yol. Açılışta güncel düğüme kendiliğinden kayar.

**Seviye yapısı** (brief 7.7 + 11.1):

```
Seviye 0 — Elementler          7 ders + kontrol noktası
Seviye 1 — и ш п р т г          6 harf + bağlantılar + kelimeler + kontrol
Seviye 2 — л м я
Seviye 3 — у ц щ ч
Seviye 4 — с е о а д б
Seviye 5 — ь ъ ы в
Seviye 6 — н ю к
Seviye 7 — з э ж х ф
```

Harf sırası brief 11.1'deki gruplama; grup içi sıra Тихомиров müfredatı (brief 11.2).

**Düğüm tipleri:**

| Tip | İçindeki görsel | Açar |
|---|---|---|
| Element dersi | Elemanın kendi şekli (maskot siluetleri) | Üç kademeli çizim |
| Harf dersi | Harfin el yazısı hâli | Üç kademeli çizim |
| Bağlantı dersi | Harf çifti, el yazısı | Bağlantı ekranı |
| Kelime dersi | Kelime, el yazısı | Kelime ekranı |
| Kontrol noktası | Hedef tahtası + maskot | Karışık sınav |

**Düğüm durumları** — bu sözlük her yerde aynı kullanılır:

| Durum | Görünüm |
|---|---|
| `locked` | Gri, soluk, tıklanmaz |
| `current` | Kalın renkli halka, hafif nabız; etiketi kalın |
| `done` | Yeşil halka + ✓ rozeti |
| `fading` | **Kehribar halka + rozette gecikme sayısı** — FSRS geciktirdi |
| `checkpoint` | Daha büyük düğüm, hedef ikonu |

**Zemin:** soluk propisi satır çizgileri ve eğik çizgiler — marka imzamız. Referanstaki
mama kabı/bitki gibi süsler yerine kendi malzememiz.

**Üstte:** seviye adı + ilerleme çubuğu, kilitli seviye sayısı.

---

### 2.3 Alfabe · `#/alfabe`

33 harflik ızgara. Her hücre: harfin el yazısı hâli + ustalık halkası (FSRS stability).

Üç bölüm: **Elemanlar** · **Harfler** · **Bağlantılar**

Bir harfe dokununca **harf kartı** açılır:

- Büyük el yazısı hâli, animasyonla çizim (brief 7.1)
- Matbu hâli, adı, sesi (ses butonu)
- Üç kademenin durumu (hangisi açık, kaçıncı denemede)
- `commonMistakes` — "ш ile karışır: 3 değil 2 tepe"
- Bu harfin geçtiği kelimeler
- **[ Çalış ]** → çizim ekranı

Patika sıralı ilerlemedir; Alfabe **serbest erişimdir**. Açılmış her şey burada.

---

### 2.4 İlerleme · `#/ilerleme`

Brief 7.8:

- **Harf ısı haritası** — 33 harf, renk = FSRS stability
- **Zayıf harf raporu** — en çok hata yapılan 5 harf + hata türü dağılımı
  ("`д` — 12 hatanın 9'u yön hatası")
- **Hata türü kırılımı** — yön / başlangıç / tepe sayısı / uzunluk / şekil
- **Haftalık doğruluk grafiği**
- **Seri** ve toplam süre

**Buna bir şey ekliyorum:** *yazının gelişimi.* Brief 6.3'e göre her denemenin ham
hamlelerini zaten saklıyoruz — yani "ilk haftaki `ш`'n" ile "bugünkü `ш`'n" yan yana
çizilebilir. Bedava geliyor ve muhtemelen uygulamanın en motive edici ekranı.

---

### 2.5 Profil · `#/profil`

- **Ayarlar** (brief 14, Faz 6): satır yüksekliği, eğim açısı, tolerans, sol el modu, ses
- **Yedek**: JSON dışa/içe aktarma (brief 12.3)
- **Yardım**: Scribble kapatma, gelişmiş ses indirmeme uyarısı, ana ekrana ekleme
- **Geliştirici**: cihaz testleri, kalibrasyon ekranı, maskot galerisi

---

## 3. Alıştırma ekranları (sekme değil, üstüne açılır)

Hepsi tam ekran, üstte ilerleme çubuğu ve çıkış, altta maskot geri bildirimi.

| Ekran | Brief | Not |
|---|---|---|
| **Çizim** (3 kademe) | 7.1 | Uygulamanın kalbi. Kademe 1 kılavuzlu, 2 solan, 3 boş |
| **Bağlantı** | 7.3 | Harf çiftleri; безотрывное hedefi |
| **Kelime** | 7.4 | Aynı üç kademe, kelime seviyesinde |
| **Dikte** | 7.5 | Ekranda görsel yok, sadece ses |
| **Eşleştirme** | 7.6 | El yazısı ↔ matbu ↔ anlam ↔ ses |
| **Çoktan seçmeli** | 7.6 | Özellikle и/ш/л/м ayrımı |
| **Okuma** | 7.6 | El yazısını çöz |
| **Harf avı** | 7.6 | Kelimede harfi işaretle — ambiguity eğitimi |
| **Oturum özeti** | — | Referanstaki "Today's goal completed" karşılığı |

**Çizim ekranındaki geri bildirim maskotla verilir** (brief 6.2): hangi kontrol düştüyse
o mesaj, `think` yüzlü bir karakterle. "Ters yönde çizdin — yukarıdan aşağı olmalı."

---

## 4. Modallar

| Modal | Ne zaman |
|---|---|
| Oturum özeti | Oturum bitince — hedef çubukları, doğruluk, seri |
| Yeni seviye açıldı | Kontrol noktası geçilince |
| Seri kutlaması | 3/7/30 günde |
| Geciken uyarısı | Yeni ders açmadan önce: "8 geciken tekrarın var" (brief 8.3) |

---

## 5. Assetler — öneri

**Üretilmiş raster görsele şu an ihtiyaç yok, ve bu bir avantaj:**

- **Düğüm görselleri harfin kendisi olmalı.** Referansta düğümlerde köpek
  illüstrasyonları var çünkü içerik görsel değil. Bizde içerik **zaten bir harf** —
  düğümde `ш` yazıyorsa öğrenci onu görerek tanır. Dekoratif illüstrasyon bu bilgiyi
  yok eder.
- **Maskotlar SVG** (`src/ui/mascot.ts`), düz vektör. Araya AI üretimi raster koyarsak
  stil bütünlüğü bozulur — iki farklı çizim dili olur.
- **Zemin dokusu** propisi satır/eğik çizgileri — SVG/CSS, zaten var.

**El yazısı gösterimi için:** Bad Script (OFL 1.1) zaten indirildi (`tools/fonts/`).
Faz 1'de glyph bootstrap'i için kullanılacak, ama arayüzde harfleri göstermek için de
kullanılabilir — düğümler, alfabe ızgarası, kelime kartları. Lisans buna izin veriyor.

**Üretilmiş görselin işe yarayabileceği tek yer:** kutlama/rozet sahneleri (kontrol
noktası geçme, seri). Oraya geldiğimizde ayrıca karar veririz — ve orada bile maskot
kadrosunu kullanmak daha tutarlı olur.

---

## 6. Karara bağlanacaklar

1. Beş sekme ve isimleri onaylanıyor mu?
2. Patika'daki `fading` (solma) durumu — doğru bulundu mu?
3. Alfabe ayrı sekme mi, yoksa Patika'nın içinde bir görünüm mü?
4. Bad Script arayüzde el yazısı göstermek için kullanılsın mı?
5. İlerleme'deki "yazının gelişimi" karşılaştırması istenir mi?
