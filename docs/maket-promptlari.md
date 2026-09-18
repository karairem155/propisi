# Ekran maketi promptları

Görsel üreticiye verilecek, ekran ekran. Yerleşim ve hiyerarşi tarif eder — üretilen
maketler **referanstır**, birebir uygulanacak spec değil. Ekran envanteri için
`ekranlar.md`, sayfaların içine giren illüstrasyonlar için bu dosyanın sonundaki
"İllüstrasyonlar" bölümü.

---

## Kullanım

1. Her promptta **BLOK A** en başa gelir.
2. Ekranda alt gezinme varsa **BLOK B** de eklenir. Hangilerinde olduğu aşağıdaki
   tabloda ve her ekranın başlığının altında yazıyor.
3. **Hiçbir görselde gerçek yazı olmasın.** Görsel üreticiler Kiril el yazısını her
   zaman bozuk üretir; bu uygulamada harf yanlışsa görsel çöptür. Her promptun
   sonundaki `no real text` ifadesini silme.
4. Boyut: dikey tablet ekranı, 1024×1366 civarı.
5. Tutarlılık için önce **01**'i beğenene kadar üret, sonra onu diğerlerinde
   "reference image" olarak kullan.

| Alt gezinme **var** | Alt gezinme **yok** |
|---|---|
| 01, 02, 03, 04, 06 | 05, 07, 08, 09, 10, 11, 12 |

---

## BLOK A — ortak stil (hepsine)

```
Mobile app UI design mockup, tablet portrait screen, flat straight-on view,
no device frame, no perspective, no shadow around the screen edge.

Background: deep blue #1D3F8F. Content sits in white rounded cards,
corner radius 24px, 16px outer margins, 12px gaps between cards.
Secondary surfaces and pills: light blue #C4D9F3.
Text: near-black navy #14213D on white, white on blue.
Accents: amber #F2A63B, mint #35C79A, coral #F2705F, violet #8E7CF0.

Typography: rounded geometric bold sans-serif. Section headings are white and
sit directly on the blue background, NOT inside filled bars.

Clean, uncluttered, large touch targets, generous whitespace.
Placeholder lorem text is fine, no real text.
```

## BLOK B — alt gezinme (01, 02, 03, 04, 06)

```
Bottom: a floating pill-shaped navigation island, dark blue, detached from the
screen edges, with exactly THREE items, each an icon above a tiny label.
The FIRST item has a small red circular badge with a number at its top-right.
The active item sits on a light blue pill behind it.
```

---

## 01 · Tekrar — kuyruk dolu
**BLOK A + BLOK B**

```
Screen title top-left, small.

Card 1 (large, dominates upper third): a small red pill badge at its top-left,
a bold heading below it, then a 2x2 grid of light-blue rounded tiles — each
tile has a large number and a short word beside it. Below the grid a
full-width blue primary button. A tiny muted line under the button.

Card 2: a bold title line, one muted line under it, then three horizontal rows.
Each row: a single large cursive character on the left, a rounded coral
progress bar in the middle, a number on the right, and a small muted caption
line underneath the row. At the bottom of the card, a full-width pale blue
secondary button.

Card 3 (small): a flame icon with a number on the left, a small muted counter
on the right, a thin rounded progress bar underneath, and a small link aligned
to the right below it.
```

## 02 · Tekrar — kuyruk boş
**BLOK A + BLOK B**

```
Card 1 (compact, centered content): a tall rounded illustration placeholder
centered, a bold heading under it, one muted line. Not full height.

Card 2 IS THE VISUAL FOCUS OF THE SCREEN: a white card outlined with a 2px
amber border, containing a bold title, one muted line, three horizontal rows
(large cursive character left, rounded coral bar middle, number right, small
caption under each), and a full-width pale blue secondary button at the bottom.
This amber-outlined card should read as the most important element.

Card 3 (small): flame icon, thin progress bar, small link aligned right.
```

## 03 · Patika — Yol görünümü
**BLOK A + BLOK B**

```
Top: a translucent white strip spanning the full content width, split into
three columns, each with a large number above a tiny label, and a chevron at
the far right edge.

Below it: a pill-shaped segmented control with two options; the LEFT option is
active as a solid white pill, the right option is plain on a translucent track.

Below: a winding vertical path descending the screen like a game level map.
Large circular nodes, white fill, thick colored rings, connected by a thick
rounded ribbon that curves left and right in a gentle S.
Visible in one screen:
 - several nodes with mint green rings and small green check badges
 - exactly ONE node with an amber ring and a small amber number badge
 - exactly ONE node with a thick white ring, slightly enlarged
 - several flat desaturated gray nodes
Each node has a two-line caption underneath in white.
Between groups: a centered white section header with a thin progress bar under it.
Very faint diagonal ruled-line texture over the blue background.
```

## 04 · Patika — Izgara görünümü
**BLOK A + BLOK B**

```
Same translucent three-column strip at top.
Same segmented control, but now the RIGHT option is the active white pill.

Below: stacked sections. Each section is a white heading on blue, then a wide
horizontal image placeholder card, then content.
The main section is a dense grid of small square white tiles, 6 per row, each
tile rounded with a tiny label in its top-left corner and one large cursive
character centered. Some tiles are flat gray. A few tiles have a green band
filling them from the bottom to different heights. One or two tiles have an
amber outline.
Another section shows rows of small light-blue pills.
```

## 05 · İlerleme
**BLOK A · alt gezinme YOK**

```
Top-left: a small pill-shaped back button. No bottom navigation island.

A wide horizontal image placeholder.
Then a row of 4 small white stat cards, each with a big number over a tiny label.
Then a white card containing a dense heat-map grid of small square tiles with
partial green fills at varying heights.
Then a white card with 5 horizontal bar rows — cursive character left, rounded
coral bar, number right.
Then a white card with a grid of 8 circular medal placeholders in two rows of
four: the FIRST one in full color, the other seven desaturated and faded.
```

## 06 · Profil
**BLOK A + BLOK B**

```
Card 1: horizontal — a large round light-blue avatar circle on the left,
two lines of text on the right.

Card 2: settings — three slider rows. Each row has a label left, a value right,
a horizontal slider track underneath, and a tiny muted hint line.
Below the sliders, one toggle switch row.

Then THREE amber-tinted cards stacked, each horizontal: a small tall rounded
image on the left, one bold line and two muted lines on the right.

Then a vertical list of white navigation rows — each with a round light-blue
icon circle on the left, two lines of text, and a chevron on the right.
```

## 07 · Çizim ekranı
**BLOK A · alt gezinme YOK**

```
Full-screen focused practice view.
Top bar: a small X close button on the left, a thin segmented progress bar
across the middle, a small counter on the right.

Center: a very large white writing area filling most of the screen, rounded
corners, showing faint light-blue horizontal ruled lines AND faint diagonal
slant guide lines crossing them — a handwriting practice sheet. Empty.

Floating over the bottom edge of the writing area: a small white toolbar pill
with three round icon buttons.

Below the writing area: a white card, horizontal — a small round character
illustration on the left, one line of text on the right.
```

## 08 · Çizim ekranı — hatalı hamle
**BLOK A · alt gezinme YOK**

```
Identical layout to the practice screen: top bar with X, segmented progress bar
and counter; large white ruled writing area with diagonal slant guides;
floating toolbar pill.

Differences: the feedback card at the bottom is tinted soft coral, and the
small round character on its left looks puzzled. A small coral circular marker
highlights one specific spot inside the writing area.
Tone is gentle and encouraging, NOT an error state.
```

## 09 · Dikte ekranı
**BLOK A · alt gezinme YOK**

```
Deliberately minimal and quiet, mostly empty.
Top bar: small X close button left, thin progress bar middle.

Upper center: one large circular light-blue button with a speaker icon,
centered. Beneath it, two smaller pill-shaped buttons side by side.

Lower two thirds: a large empty white writing area with faint ruled lines and
diagonal slant guides.

No hints, no illustrations, no decoration anywhere else.
```

## 10 · Eşleştirme / çoktan seçmeli
**BLOK A · alt gezinme YOK**

```
Top bar: small X close button left, thin segmented progress bar middle.

Upper third: a white card containing one very large cursive character centered.

Middle: a 2x2 grid of four large white answer cards, each rounded, each
containing one large cursive character centered. Exactly ONE card has a 2px
mint green border.

Bottom: a full-width blue primary button.
```

## 11 · Oturum özeti (modal)
**BLOK A · alt gezinme YOK**

```
The background screen is dimmed and blurred.

A white sheet slides up from the bottom covering the lower two thirds, with
large rounded top corners and a small gray drag handle centered at the top.

Inside, centered: a round illustration placeholder, then a bold two-line
heading, then two labeled rows — each with a label on the left, a value on the
right, and a thick rounded progress bar underneath. The first bar is violet,
the second amber.

At the bottom of the sheet: a full-width green primary button.
```

## 12 · Harf kartı (detay)
**BLOK A · alt gezinme YOK**

```
Top-left: a small pill-shaped back button.

Card 1 (fills the upper half): one very large cursive character centered, with
a small round play button in the top-right corner of the card.

Below: a horizontal row of three small light-blue pills.

Card 2: three stacked rows, each with a small circular step indicator on the
left and two lines of text on the right. The first two indicators are filled
and checked, the third is empty.

Card 3: amber-tinted, one line of text.

Bottom: a full-width blue primary button.
```

---

# İllüstrasyonlar

Bunlar sayfaların **içine** giren resimler; yukarıdakiler sayfaların kendisi.
Yuvaların tamamı `src/ui/assets.ts` içinde tanımlı.

**Durum (19 Eylül 2026):** 29/35 teslim alındı ve bağlandı. Gelenler 3B render
çıktı, dolayısıyla kalan 6 tanesi de onlara uymalı — aşağıdaki stil bloğu ilk
listeden farklı, düz vektör değil 3B.

## Ortak stil bloğu

```
Soft 3D rendered illustration, cute mobile app style, clay-like matte surfaces
with subtle gloss. Pastel scene: rolling green hills, soft white clouds, warm
yellow sun, cream sandy ground, small rounded bushes. Soft ambient light,
gentle shadows, shallow depth of field.
Palette stays soft and pastel: cream, sky blue, mint green, warm yellow,
coral accents. No text, no letters, no writing, no symbols.
```

## Kalan 6 görsel

```
09 · path-bg-tile
SEAMLESS TILEABLE pattern — very low contrast, deep blue #1D3F8F background,
scattered soft 3D pencils, notebooks and ink drops, small and sparse.
Must tile perfectly with no visible seams. Subtle background texture only.

20 · section-elements
Four abstract 3D shapes in a row on the cream ground: a tilted capsule,
a hook, an egg, a loop. Each a different pastel color. Wide horizontal.
Abstract shapes only, NOT letters.

21 · section-letters
A soft 3D fountain pen nib resting on a cream ruled notebook page,
wide horizontal. The page is blank — no writing on it.

22 · section-joins
Two rounded 3D shapes connected by a flowing ribbon arcing between them,
wide horizontal.

23 · progress-hero
A soft 3D rising bar chart with a small sprout growing from the tallest bar,
wide horizontal.

35 · session-summary
Four cute 3D characters gathered around a small gold trophy, celebrating,
wide horizontal.
```

## Görsel geldiğinde

1. Dosyayı `public/art/<anahtar>.webp` olarak koy (PNG gelirse WebP'ye çevir —
   29 görsel PNG'de 9 MB, WebP'de 756 KB oldu).
2. `src/ui/assets.ts` içindeki `PRESENT` listesine anahtarı ekle.
3. Oran farklıysa aynı dosyadaki `ratio` alanını güncelle.

Başka hiçbir yer değişmez; yuvası olmayan görsel numaralı yer tutucu olarak görünür.

## Maskot kadrosu — 3B'ye geçiriliyor

**Karar verildi (19 Eylül 2026):** kadro 3B olacak, teslim edilen illüstrasyonlarla
aynı dilde.

### Şanslı nokta: kadro zaten eşleşiyor

Teslim edilen sahnelerdeki dört karakter, bizim dört elemanımıza birebir oturuyor.
Yeni render'ları üretirken **mevcut görselleri referans ver** — yeni karakter tasarlama.

| Gelen karakter | Bizim eleman | Neden |
|---|---|---|
| Mavi fasulye / kapsül | **Çubuk** (`наклонная`) | eğik düz çizgi |
| Turuncu-sarı kıvrım | **Kanca** (`крючок`) | kıvrımın kendisi kanca |
| Beyaz yumurta | **Oval** (`овал`) | oval gövde |
| Yeşil halka | **İlmek** (`петелька`) | halka = kapalı ilmek |

### Önce karakter sayfası

Tek tek üretmeden önce **bir referans sayfası** üret, beğen, sonra onu bütün mood
render'larında "reference image" olarak kullan. Tutarlılığın tek yolu bu.

```
KARAKTER SAYFASI
Soft 3D rendered character sheet, four cute characters standing in a row on a
plain neutral background, full body, front view, evenly spaced, same scale.
Clay-like matte surfaces with subtle gloss, soft ambient light, gentle shadows.
Character 1: a soft blue tilted capsule / bean shape with tiny arms and feet.
Character 2: a warm orange-yellow hook shape, curling at the bottom.
Character 3: a white egg shape.
Character 4: a green closed loop / ring shape.
Each has a simple face: two small dot eyes and a tiny smile, no nose.
Pastel palette. No text, no letters, no symbols.
```

### 16 render — 4 karakter × 4 ruh hâli

Her biri **şeffaf arka planla**, sahne YOK — bunlar beyaz kartların ve mavi zeminin
üstüne binecek. Boyut 512×512.

Ortak blok:

```
Soft 3D rendered character, clay-like matte surface with subtle gloss,
soft ambient light, gentle contact shadow only.
TRANSPARENT BACKGROUND, isolated subject, no scene, no landscape, no ground.
Centered, full body, front view. Pastel palette.
No text, no letters, no symbols.
Use the reference image for the character design.
```

Karakter satırı (birini seç):

```
A soft blue tilted capsule character with tiny arms and feet.
A warm orange-yellow hook-shaped character curling at the bottom.
A white egg-shaped character.
A green closed loop / ring-shaped character.
```

Ruh hâli satırı (birini seç):

```
happy  · Content expression: closed smiling arc eyes, small gentle smile, relaxed pose.
cheer  · Excited: wide open eyes, open happy mouth, both arms raised, a few small
         confetti pieces around it.
think  · Puzzled: one eye open one squinting, slightly tilted head, a small floating
         question mark beside its head, one hand near its chin.
sleep  · Asleep: closed downward-curved eyes, peaceful, slightly slumped,
         two small floating "z" shapes beside its head.
```

### Dosya adları

```
mascot-cubuk-happy   mascot-cubuk-cheer   mascot-cubuk-think   mascot-cubuk-sleep
mascot-kanca-happy   mascot-kanca-cheer   mascot-kanca-think   mascot-kanca-sleep
mascot-oval-happy    mascot-oval-cheer    mascot-oval-think    mascot-oval-sleep
mascot-ilmek-happy   mascot-ilmek-cheer   mascot-ilmek-think   mascot-ilmek-sleep
```

`open` ruh hâli için ayrı render gerekmiyor — kod onu `happy`'ye eşliyor.

### Kod tarafı hazır

`src/ui/mascot.ts` içindeki `mascot()` fonksiyonu 3B görseli arar, yoksa mevcut
SVG'ye düşer. Görseller gelene kadar hiçbir şey bozulmaz, geldikçe kendiliğinden
yükselir. Yuvalar `assets.ts`'te 36–51 numaralarla tanımlı.

**Küçük boyut uyarısı:** 3B render 40–54 px'te detay kaybediyor, SVG orada daha
keskin. `PREFER_SVG_BELOW = 44` eşiğinin altında SVG kullanılmaya devam ediyor —
yani patika düğümü ve liste ikonu gibi küçük yerler vektör kalıyor, büyük yerler
3B oluyor. Eşiği `mascot.ts`'ten değiştirebilirsin.
