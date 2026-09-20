# Русская пропись

Rus el yazısı (прописи) öğrenme uygulaması. iPad + Apple Pencil, PWA.

Spesifikasyon: `rus-el-yazisi-app-brief.md` (Rev. 2). Bu depo o brief'in **Faz 0**'ıdır.

---

## Durum

Uygulama uçtan uca çalışıyor: patika → ders aç → çalış → değerlendir → FSRS
ilerlet → sıradaki kart → oturum özeti.

### Alıştırma türleri

| Tür | Kanal | Ayırt edici kontrolü |
|---|---|---|
| **Element** | çizim | 7 temel şekil, satır boyunca tekrar |
| **Harf** | çizim | kılavuzlu → kılavuzsuz iki kademe |
| **Büyük harf** | çizim | küçüğünün büyütülmüşü değil, ayrı şekil |
| **Bağlantı** | çizim | **kalem kalkmamalı** (безотрывное) |
| **Kelime** | çizim | bant kapsaması atlanan harfi yakalar |
| **Cümle** | çizim | kelime kelime; büyük harf, boşluk, nokta |
| **Tanıma** | okuma | 3 yön: el yazısı ↔ matbu ↔ ses |
| **Harf avı** | okuma | kelimede harfi işaretle — ambiguity eğitimi |
| **Eksik harf** | okuma | gizli harfi komşularından çöz |
| **Cümle okuma** | okuma | el yazısı cümle → anlamı |
| **Kelime kur** | imlâ | harfleri sırayla diz, çizim yok |
| **Cümle diz** | söz dizimi | kelimeleri doğru sıraya koy |
| **Dikte** | duyma | duy → yaz, kılavuzsuz |
| **Eşleştirme** | anlam | el yazısı ↔ anlam, dördü birden |
| **Kontrol noktası** | sınav | 8 adım, 8 kanal, kılavuzsuz tek deneme |

### Ders bir dizidir, tek alıştırma değil

Önce `#/calis/и` aynı harfi **yedi kez** yazdırıyordu. Yedi tekrar kas hafızası
için iyi, motivasyon için felaket — ve bir dil uygulamasının yaptığı şey değil.
Dil uygulaması tek beceriyi arka arkaya değil, birbirine bağlı **farklı
becerileri** sırayla ister. Ders artık `src/screens/ders.ts` tarafından
kuruluyor:

| Konu | Dizi |
|---|---|
| eleman | kılavuzla çiz → ezberden çiz |
| harf | kılavuzla yaz → **tanı** → ezberden yaz → **harf avı** |
| büyük harf | kılavuzla yaz → ezberden yaz |
| bağlantı | kılavuzla yaz → ezberden yaz |
| kelime | **kur** → yaz → **eksik harf** → **dikte** → **eşleştir** |
| cümle | **oku** → **diz** → kelime kelime yaz |

Hepsi ayrı FSRS kartı, hepsi aynı karışık kuyrukta (brief 7.0: "tek tip tekrar
sıkıcıdır ve transfer sağlamaz").

### Kontrol noktası

Her seviyenin sonunda bir sınav var ve **sonraki seviye onsuz açılmıyor**.
Sınav kendi soru tiplerini yazmıyor: yukarıdaki ekranları sırayla çalıştırıyor
(`srs/session.ts` → sınav listesi, `srs/flow.ts` → sıradaki adım). Ayrı bir
soru tipi icat etmek "çalıştığından başka bir şeyden sınav olmak" olurdu, ve
ikinci bir değerlendirme yolu ikinci bir hata kaynağı demekti.

Dersten farkı çalışma ekranının davranışında: sınavda **tek, kılavuzsuz
deneme** ve "tekrar dene" yok. Sekiz adım sekiz kanalı ölçüyor: yazmak ·
tanımak · bağlamak · ayırt etmek · büyük harf · imlâ · duymak · okumak.
Geçmek için ortalama ≥ 75 ve hiçbir adımda 50 altına düşmemek gerekiyor.
Ayrıntı: `docs/ekranlar.md`.

### Ses ve hareket

Arayüz sesleri **dosyasız** — WebAudio ile sentezleniyor (`src/audio/sfx.ts`).
Sıfır bayt indirme, çevrimdışı garanti, service worker listesi büyümüyor.
Perdeler rastgele değil: doğru cevap yukarı çıkan aralık, yanlış aşağı inen
ikili; müzikal yön metni okumadan önce anlamı taşıyor. Profil'den kapatılıyor.

Hareketler (`src/ui/celebrate.ts`) kısa ve hepsi `prefers-reduced-motion`
altında susuyor — hareket duyarlılığı olan biri için titreşen ekran
erişilebilirlik sorunudur, süs değil.

### Değerlendirme

Şekil örtüşmesi (`src/grading/shape.ts`) — harfin şekli fonttan geliyor.
İki temel ölçü: **isabet** (mürekkebin harf üstünde kalan oranı) ve
**kapsama** (harfin geçilen oranı). Tek başına ikisi de kandırılabilir.

Buna **bant analizi** eklendi ve İKİ YÖNDE de çalışıyor — harf dokuz dikey
banda bölünüp her bandın durumu ayrı ölçülüyor:

| yön | ne yakalar | örnek |
|---|---|---|
| hedef → kullanıcı | **eksik** bölüm | `ш` istenirken `и` yazmak |
| kullanıcı → hedef | **fazla** bölüm | `и` istenirken `ş` yazmak |

İkisi de ölçümle bulundu. Önce yalnız toplam kapsamaya bakılıyordu ve `ш`
yerine iki tepe çizmek 92 alıyordu. Bant eklendikten sonra o yön düzeldi ama
TERSİ açık kaldı: `и` istenirken `ш` yazmak 87, `о` istenirken `а` yazmak 92
— ikisi de geçer not. Oysa и/ш ayrımı iki yönde de bu uygulamanın var oluş
sebebi. Simetrik bant analiziyle ikisi de 45'e indi.

**Boyut ayrı bir hata türü.** Fazla-bölüm denetimi önce boyut hatasını da
"fazladan yazdın" sayıyordu. Ayırt edici sinyal yükseklik: aynı harfi büyük
yazmak eni de boyu da büyütür, başka (geniş) bir harf yazmak yalnız eni.
Oranlar birlikte hareket ediyorsa boyut hatası — daha yumuşak cezalandırılıyor
(72 tavan), çünkü şekil doğru, ölçek kaymış.

Ölçülmüş davranış:

```
doğru yazım                     100        %10 boyut farkı       97
kelime %18 büyük            72 BOYUT       6px kayma            100
и←ш (fazla tepe)            45 FAZLA       tek harf ±%25 boyut  100
о←а (fazla kuyruk)          45 FAZLA       eğim +0.12           100
ш←и (eksik tepe)            45 EKSİK
```

### Birleşik yazı — безотрывное письмо

Rus el yazısının asıl kuralı harflerin BİRLEŞMESİ. Üç yerde denetleniyor:

- **Font birleştiriyor mu** — `мама`, `шишка`, `лишишь` basılıp karşılaştırıldı.
  Marck Script birleştiriyor, Bad Script ayrı basıyor. Seçim ekranında yazıyor.
- **Bağlantı türü** — önceki harf gövde üstünde bitiyorsa (`о б в ъ ы ь`)
  **üst bağlantı**, değilse **alt bağlantı**. Mekanik kural, tahmin değil;
  ders ekranında hangi türü çalıştığın yazıyor.
- **Kelimede kalem kaldırma** — kelime tek hamlede yazılır; istisna gövdesinden
  ayrı işareti olan harfler (`й` +1, `ё` +2). Kılavuz kalkınca kural işliyor.

### El yazısı fontu seçilebilir

Bu font tipografi değil: kılavuzun şekli, değerlendirmenin hedefi ve yazım
animasyonu hep buradan çıkıyor. Yanlış font yanlış harf öğretir.

Kullanıcı uyardı, ölçüldü ve doğrulandı: Bad Script'te `б в г д ж к т ф`
matbu biçimin italiği ve harfler hiç birleşmiyor. Varsayılan **Marck Script**
oldu (OFL, kendi sunucumuzda). Ama hiçbir açık lisanslı font doğrulanmış
школьная пропись değil, o yüzden seçim **Profil → El yazısı fontu**'nda.

Gerçek okul propisi fontu (ParaType «Прописи») ticari; satın alınırsa
`src/ui/fonts/` içine konup `ui/cursive.ts` listesine bir satır eklemek yeterli.

### Yazım animasyonu

Harfin nasıl yazıldığını kalemle gösteriyor (`✎` düğmesi). Kaynağı fontun
kendisi: başlangıç noktasından mürekkebin İÇİNDEN yayılan mesafe
(`src/glyph/reveal.ts`). İskelet çıkarmayı denedim ve bıraktım — yürüyüş
`ш`yi üç parçaya bölüyordu ve hamle sırası geometriden çıkan bir tahmin
olurdu. Jeodezik açılım kurgu gereği doğru: kavşak, dallanma, sıra tahmini yok.

Animasyon DEĞERLENDİRMEYE katılmıyor. Denetim: `#/dev/yazim` — 33 küçük +
30 büyük harf, başlangıç noktası doğrulanmamış olanlar kırmızı çerçeveli.

**Ölçek bilerek normalize edilmiyor.** Brief 6.1 uyarıyor: Procrustes ölçek
normalizasyonu iki tepeli `и`yi üç tepeli `ш`ya mükemmel uyduruyor. Konum
hizalaması (kılavuzsuz kademelerde) güvenli, ölçek değil.

**Yakalanmayanlar:** yön, hamle sırası, kalem kalkışı (bağlantı hariç). Bunlar
glyph verisi ister. Başlangıç noktası denetimi (`src/data/starts.ts`) yönün
yakalanabilen yarısını veriyor.

### Doğrulanmayı bekleyen

`src/data/starts.ts` — 33 harfin başlangıç noktası. Propisi geleneğinden
türetildi, doğrulanmış bir kaynaktan kopyalanmadı. **14 harfte emin değilim.**
Toplu kontrol: **Profil → Geliştirici → Başlangıç noktaları**.

---

## Çalıştırma

```bash
npm install
npm run dev
```

Derleme ve önizleme:

```bash
npm run build
npm run preview -- --host
```

`--host` iPad'in aynı ağdan bağlanması için. **Ama service worker HTTPS ister** — PWA
davranışını gerçekten test etmek için dağıtılmış sürümü kullan.

---

## Dağıtım (GitHub Pages)

`main`'e push yeter — `.github/workflows/pages.yml` derleyip yayınlıyor.
Elle bir adım yok.

Deponun **Settings → Pages → Source** ayarı **GitHub Actions** olmalı; bu tek
seferlik ve depo sahibinin yapması gerekiyor.

`vite.config.ts` içinde `base: './'` olduğu için alt yolda (`/propisi/`)
sorunsuz çalışıyor. Netlify kullanma: ücretsiz planı kredi bazlı, kredi bitince
site kapanıyor (brief 10).

Service worker'ın `SHELL` listesi ve `VERSION`'u **otomatik üretiliyor**
(`tools/gen-sw-shell.mjs`, `postbuild` adımında). Elle güncellemeye gerek yok:

- SHELL doğrudan `dist/` içeriğinden çıkar — Vite parça adları kaydığında liste kaymaz
- VERSION dosya listesi + boyutlarının özetinden türer — çıktı değiştiyse sürüm de
  değişir, değişmediyse aynı kalır

Bu otomatikleştirilmeden önce iki kez kayma yaşandı (`assets.js` listede olup üretilmedi,
`scheduler.js` üretilip listede olmadı); ikisi de sessiz hata — biri çevrimdışı açılışı
bozar, diğeri install adımını 404'te patlatır.

### Dosya adları içerik hash'i taşır

Eskiden sabitti (`js/session.js`), gerekçesi SHELL listesinin elle yazılmasıydı. O
gerekçe ortadan kalktıktan sonra kural kaldı ve **canlıda bütün alıştırma ekranları
boş açılmaya başladı** — dev sunucusunda sorunsuzdu:

```
SyntaxError: The requested module './session.js' does not provide an export named 't'
```

Yeni `app.js` ile önbellekteki ESKİ `session.js` aynı sayfada buluşuyordu; ad aynı
olduğu için hem service worker hem tarayıcı eskisini veriyordu ve minify edilmiş
sembol adları tutmuyordu. Hash'le eski ve yeni dosyalar bir arada durabiliyor, bir
sayfa her zaman kendi içinde tutarlı bir küme yüklüyor.

Aynı sınıftan ikinci hata: `sw.js` içindeki `caches.match(request)` **bütün**
önbelleklerde arıyor ve aktivasyon sırasında ölmekte olan sürümün dosyasını
verebiliyordu. Artık yalnız kendi sürümünün önbelleğine bakıyor.

---

## Mimari — neden böyle

Brief Bölüm 3.1'de kaynak kodundan doğrulanan kısıtlar mimariyi belirliyor:

**hanzi-writer PointerEvent kullanmıyor**, `mousedown`/`touchstart` bağlıyor. Yani
`getCoalescedEvents()`, `pressure` ve `pointerType === 'pen'` palm rejection kütüphanenin
giriş yolundan geçmiyor. Pointer boru hattı bizim (`src/canvas/pointer.ts`); Faz 1'de
noktalar `writer._quiz` üzerinden elle beslenecek.

Bundan çıkan ayrım, kodun her yerinde geçerli:

> **Kütüphane mürekkebi hiç çizmez, sadece not verir.**
> Görüntü kendi canvas'ımızda tam çözünürlükte çizilir; grading'e
> `src/grading/decimate.ts`'ten geçen seyreltilmiş akış gider.

Faz 1'de eklenecek `hanzi-writer` sürümü **tam sabitlenecek** (`3.7.3`, caret yok):
`_quiz` underscore'lu bir API, semver garantisi yok. Kütüphaneye tek bir yerden
dokunulacak — `src/grading/adapter.ts`.

---

## Sistem katmanı

Ekran planı `docs/ekranlar.md`'de. Beş sekme: **Bugün · Patika · Alfabe · İlerleme · Profil**.

**Müfredat** (`src/data/curriculum.ts`) tek kaynaktır — patika, alfabe ve kuyruk hep
oradan beslenir. 7 element dersi + 7 harf grubu (brief 11.1) + her grubun bağlantı ve
kelime listesi. Kelimeler o noktaya kadar öğrenilmiş harflerle sınırlı seçildi.

**Tekrar** (`src/srs/`) ts-fsrs 5.4.2 üzerine kurulu. Kart türleri ve ID formatı brief
8.1'den, çizim sonucunu nota çevirme brief 8.2'den. Kuyruk tür bazında serpiştirilir —
brief 7.0: *"Tek tip tekrar sıkıcıdır ve transfer sağlamaz."*

**Görsel yuvaları** (`src/ui/assets.ts`) 29 yuva tanımlar ve **hepsinin dosyası var** —
hiçbir ekranda yer tutucu kalmadı. Dosya yoksa numaralı yer tutucu çizilir, istek
atılmaz. Yeni görsel geldiğinde yapılacak tek şey:

1. dosyayı `public/art/<anahtar>.webp` olarak koy
2. `assets.ts` içindeki `PRESENT` listesine anahtarı ekle

Başka hiçbir yer değişmez.

Teslim edilmeyen altı yuva **silindi**, çünkü hiçbiri gerekmiyordu: ikisi zaten
çağrılmıyordu, dördü ise tam genişlik 3:2 dekoratif görsellerdi ve asıl içeriği
(harf ızgarası, ısı haritası) katlamanın altına itiyorlardı. Yerlerine ekranın kendi
verisini taşıyan kompakt başlıklar kondu.

**İki katmanlı görsel dili:** 3B render'lar *sahne* (karşılama, rozet, geri bildirim),
SVG maskotlar *arayüz simgesi* (bölüm başlığı, patika düğümü, kart rozeti). SVG her
ölçekte net, tek renk token'ıyla temalanıyor, çevrimdışı sıfır bayt. `mascot()` 44px
üstünde 3B dosya varsa onu tercih ediyor, yoksa SVG'ye düşüyor.

**Sınav listesi** (`srs/session.ts`) alıştırma ekranlarını zincirler. İki
kullanıcısı var ve ikisi zıt davranır: kontrol noktası (sınav — tek kılavuzsuz
deneme) ve Tekrar ekranındaki "Bunları çalış" (çalışma — tam ders). Sıradaki
adımı seçen tek yer `srs/flow.ts` → `nextAfter`.

---

## Tasarım sistemi

Görsel yön kullanıcının verdiği **Collaboo** mockup'ından türetildi — aynısı değil, aynı
aileden. Ortak olan: kobalt zemin, beyaz yuvarlak kartlar, açık mavi haplar, yuvarlak
kalın sans, düz maskotlar.

**Ayrıldığımız yerler:**

| | Referans | Bizde |
|---|---|---|
| Bölüm başlığı | Dolu mavi bar, içinde beyaz metin | Mavi zeminin doğrudan üstünde beyaz metin |
| Alt gezinme | Tam genişlik mavi bar | Yüzen ada; aktif öğenin arkasında açık mavi hap |
| Maskotlar | Yıldız, çiçek, amip — genel bloblar | Harfin kendi elemanları (aşağıda) |
| Mavi | Parlak kobalt | Daha derin/indigo `#1d3f8f` |
| İmza doku | — | Satır çizgisi deseni (el yazısı uygulamasıyız) |

Tüm renkler `src/ui/style.css` içinde `:root` token'ı. Tipografi **Nunito** (OFL),
kendi sunucumuzdan — CDN yok, PWA çevrimdışı çalışsın diye. Nunito değişken font olduğu
için alt küme başına tek dosya üç ağırlığı da taşıyor (3 dosya, ~94 KB).

### Maskotlar

Kadro süs değil: her karakter brief 7.2'deki temel yazı elemanlarından biri
(`элементы букв`) — müfredatın ilk dersleri bunlar, harfler bunlardan kuruluyor.

| Karakter | Eleman | Rol |
|---|---|---|
| **Çubuk** | прямая наклонная палочка | amber |
| **Kanca** | крючок | mint |
| **Oval** | овал | coral |
| **İlmek** | петелька | violet |

Beş ruh hâli var ve değerlendirmeye bağlanacak: `cheer` doğru hamle, `think` hatalı hamle
(brief 6.2'deki kontrol-bazlı Türkçe geri bildirim), `sleep` tekrar kuyruğu boş,
`open` yönerge, `happy` nötr.

Kadroyu görmek ve şekil ayarı yapmak için: **`#/dev/mascots`**.

**Çizim yüzeyi bu paleti izlemez.** Propisi zemini dekorasyon değil ölçü aleti —
taban/üst/orta çizgi ve 65° eğik çizgiler belirli oranlarda durur, değerlendirme o
oranlara göre yapılacak. Kağıt beyaza yakın tutuldu ki beyaz kartlarla uyumlu olsun,
ama satır yapısı korunuyor.

---

## Dizin

```
src/
  data/      curriculum.ts (müfredat + büyük harfler) · sentences.ts (15 cümle)
             starts.ts (başlangıç noktaları) · confusables.ts · labels.ts
  srs/       cards.ts · scheduler.ts (ts-fsrs, kuyruk) · session.ts (oturum +
             sınav listesi) · flow.ts (sıradaki adım) · stats.ts
  canvas/    pointer.ts (Pencil girişi) · ink.ts (perfect-freehand) · surface.ts (3 katman)
  ui/        paper.ts · mascot.ts (kadro) · assets.ts (görsel yuvaları) · style.css · fonts/
  db/        db.ts (IndexedDB v2: attempts · settings · cards) · export.ts (JSON yedek)
  grading/   shape.ts (örtüşme + bant kapsaması) · decimate.ts
  audio/     speech.ts (Rusça TTS) · sfx.ts (arayüz sesleri, sentez)
  screens/   tekrar · patika · alfabe · ilerleme · profil · ozet
             ders (ders dizisini kurar) · kontrol (seviye sınavı + sonuç)
             çizim:  calisma (element/harf/büyük harf/bağlantı/kelime) · cumle
             okuma:  tani · av · eksik · oku
             diğer:  kur (imlâ) · dizi (söz dizimi) · dikte · eslestir
             + sandbox · test-voice · test-latency · test-scribble · records
  dev/       mascots.ts (kadro galerisi) · baslangic.ts (başlangıç noktası kontrolü)
tools/
  fonts/     Bad Script (OFL 1.1) — Faz 1 glyph bootstrap'i, ikon üretimi
docs/
  setup-ipad.md   Scribble kapat · gelişmiş ses indirme · ana ekrana ekle
```

---

## Cihazda yapılacak üç test (brief Bölüm 13)

Bunlar araştırmada doğrulanamadı, cihazda ölçülmeli. Uygulamanın içinde birer ekran:

1. **Rusça ses** — `speechSynthesis` listesinde `ru-RU` var mı. En kritik test; yoksa ses
   mimarisi tamamen değişir (önceden üretilmiş dosyalara geçilir).
2. **Gecikme** — `desynchronized: true` gerçekten fark yaratıyor mu. Sayfa içinden gerçek
   gecikme ölçülemez; ekran hem alt sınır ölçümü hem görsel karşılaştırma sunuyor.
3. **Scribble** — hızlı `и`/`ш` çiziminde hamle düşüyor mu. `pointercancel` sayacı asıl
   sinyal.

Testleri **kurulu uygulamanın içinde** yap — Safari sekmesi ayrı depolama kavanozu
kullanır (brief 12.4).

---

## Lisans notu

`tools/fonts/BadScript-Regular.ttf` — SIL Open Font License 1.1, lisans metni yanındaki
`BadScript-OFL.txt` dosyasında.
