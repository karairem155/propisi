# Русская пропись

Rus el yazısı (прописи) öğrenme uygulaması. iPad + Apple Pencil, PWA.

Spesifikasyon: `rus-el-yazisi-app-brief.md` (Rev. 2). Bu depo o brief'in **Faz 0**'ıdır.

---

## Faz 0 kapsamı

| Ne | Durum |
|---|---|
| Vite + TS iskeleti, PWA manifest + service worker | ✅ |
| Apple Pencil giriş katmanı (coalesced + predicted, basınç, palm rejection) | ✅ |
| perfect-freehand mürekkep render'ı, üç katmanlı canvas | ✅ |
| Propisi defter zemini (taban/üst/orta çizgi + 65° eğik çizgiler) | ✅ |
| Hamle kaydı + IndexedDB + JSON dışa/içe aktarma (brief 6.3, 12.3) | ✅ |
| Bölüm 13'ün üç cihaz testi | ✅ (cihazda çalıştırılacak) |
| Cloudflare Pages dağıtımı | hazır, henüz yayınlanmadı |

**Faz 0 bir öğrenme uygulaması değil.** Riskleri ölçen bir ölçüm aletidir. Harf verisi,
değerlendirme ve tekrar sistemi Faz 1+'te gelir.

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

## Dağıtım (Cloudflare Pages)

```bash
npm run deploy
```

İlk seferde `wrangler login` gerekir. Netlify kullanma: ücretsiz planı kredi bazlı,
kredi bitince site kapanıyor (brief 10).

Service worker'ın `SHELL` listesi ve `VERSION`'u **otomatik üretiliyor**
(`tools/gen-sw-shell.mjs`, `postbuild` adımında). Elle güncellemeye gerek yok:

- SHELL doğrudan `dist/` içeriğinden çıkar — Vite parça adları kaydığında liste kaymaz
- VERSION dosya listesi + boyutlarının özetinden türer — çıktı değiştiyse sürüm de
  değişir, değişmediyse aynı kalır

Bu otomatikleştirilmeden önce iki kez kayma yaşandı (`assets.js` listede olup üretilmedi,
`scheduler.js` üretilip listede olmadı); ikisi de sessiz hata — biri çevrimdışı açılışı
bozar, diğeri install adımını 404'te patlatır.

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

**Görsel yuvaları** (`src/ui/assets.ts`) 35 yuva tanımlar. Dosya yoksa numaralı yer
tutucu çizilir, istek atılmaz. Görsel geldiğinde yapılacak tek şey:

1. dosyayı `public/art/<anahtar>.png` olarak koy
2. `assets.ts` içindeki `PRESENT` listesine anahtarı ekle

Başka hiçbir yer değişmez.

**Not:** alıştırma ekranları (çizim, dikte, eşleştirme) henüz yok — harf çizim verisi
Faz 1'de üretiliyor. O gelene kadar `Profil → Geliştirici → Örnek kart üret` ile
sistemi gerçek veriyle görebilirsin.

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
  data/      curriculum.ts — 7 eleman + 8 harf grubu + bağlantı/kelime listeleri
  srs/       cards.ts (kart modeli, not eşleme) · scheduler.ts (ts-fsrs, kuyruk)
  canvas/    pointer.ts (Pencil girişi) · ink.ts (perfect-freehand) · surface.ts (3 katman)
  ui/        paper.ts · mascot.ts (kadro) · assets.ts (görsel yuvaları) · style.css · fonts/
  db/        db.ts (IndexedDB v2: attempts · settings · cards) · export.ts (JSON yedek)
  grading/   decimate.ts — Faz 1'de adapter.ts, diagnose.ts, elements.ts, humps.ts gelecek
  screens/   bugun · patika · alfabe · ilerleme · profil
             + sandbox · test-voice · test-latency · test-scribble · records
  dev/       mascots.ts (kadro galerisi) — Faz 1'de kalibrasyon ekranı buraya
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
