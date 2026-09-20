// Ders kurucu — patikadaki her düğümün girdiği kapı.
//
// NEDEN VAR: `#/calis/и` aynı harfi arka arkaya YEDİ kez yazdırıyordu.
// Kullanıcının ilk cümlesi buydu: "beş kere üst üste yazdırıyorsun". Yedi
// tekrar kas hafızası için iyi, motivasyon için felaket — ve aynı zamanda
// dil uygulamasının yaptığı şey değil. Dil uygulaması tek beceriyi arka
// arkaya değil, BİRBİRİNE BAĞLI FARKLI BECERİLERİ sırayla ister.
//
// Ders artık bir dizi:
//
//   harf     kılavuzla yaz → TANI → ezberden yaz → HARF AVI
//   eleman   kılavuzla çiz → ezberden çiz
//   bağlantı kılavuzla yaz → ezberden yaz
//   kelime   kılavuzla yaz → DİKTE → EŞLEŞTİR
//   cümle    kelime kelime yaz
//
// Toplam yazma sayısı yediden beşe indi ve aradaki üç adım başka bir kas
// kullanıyor. Bu ekranın kendi arayüzü yok: listeyi kurar ve ilk adıma
// yönlendirir — araya bir "başla" ekranı koymak fazladan dokunuş olurdu.

import { CONFUSABLES } from '../data/confusables';
import { ELEMENTS, capitalOf, findJoin, findWord, wordsWith } from '../data/curriculum';
import { findSentence } from '../data/sentences';
import { labelOf } from '../data/labels';
import { startPlaylist } from '../srs/session';

type Step = { href: string; label: string; mode?: string };

function stepsFor(subject: string): Step[] {
  const enc = encodeURIComponent(subject);

  // Cümle: önce OKU (anlamını çöz), sonra YAZ. Anlamadığın bir cümleyi
  // kopyalamak kopyalamaktan ibaret kalıyor.
  if (findSentence(subject)) {
    return [
      { href: `#/oku/${enc}`, label: 'Okuma' },
      { href: `#/cumle/${enc}`, label: 'Yazım' },
    ];
  }

  // Büyük harf: tanıma ve harf avı küçük harf için kurulu, büyüğe uymuyor.
  if (capitalOf(subject)) {
    return [
      { href: `#/calis/${enc}`, label: 'Büyük harf', mode: 'trace' },
      { href: `#/calis/${enc}`, label: 'Ezberden', mode: 'memory' },
    ];
  }

  if (ELEMENTS.some((e) => e.id === subject)) {
    return [
      { href: `#/calis/${enc}`, label: 'Çizim', mode: 'trace' },
      { href: `#/calis/${enc}`, label: 'Ezberden', mode: 'memory' },
    ];
  }

  if (findJoin(subject)) {
    return [
      { href: `#/calis/${enc}`, label: 'Bağlantı', mode: 'trace' },
      { href: `#/calis/${enc}`, label: 'Ezberden', mode: 'memory' },
    ];
  }

  const word = findWord(subject);
  if (word) {
    // Beş adım, beş ayrı kanal: imlâ → yazım → okuma → duyma → anlam.
    const steps: Step[] = [
      { href: `#/kur/${enc}`, label: 'Kelime kur' },
      { href: `#/calis/${enc}`, label: 'Yazım', mode: 'trace' },
      { href: `#/eksik/${enc}`, label: 'Eksik harf' },
      { href: `#/dikte/${enc}`, label: 'Dikte' },
    ];
    // Eşleştirme dört kelimeyi karşılaştırıyor; seviyede o kadar yoksa atla.
    if (word.level.words.length >= 3) {
      steps.push({ href: `#/eslestir/${enc}`, label: 'Eşleştirme' });
    }
    return steps;
  }

  // Harf — dersin en uzunu, dört adım.
  const steps: Step[] = [
    { href: `#/calis/${enc}`, label: 'Yazım', mode: 'trace' },
  ];
  // Tanıma yalnız karışanı olan harfte anlamlı; şıklar oradan geliyor.
  if ((CONFUSABLES[subject] ?? []).length) {
    steps.push({ href: `#/tani/${enc}`, label: 'Tanıma' });
  }
  steps.push({ href: `#/calis/${enc}`, label: 'Ezberden', mode: 'memory' });
  // Harf avı harfi içeren kelime ister (bkz. curriculum → wordsWith).
  if (wordsWith(subject).length) {
    steps.push({ href: `#/av/${enc}`, label: 'Harf avı' });
  }
  return steps;
}

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'и';
  const steps = stepsFor(target);

  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">Ders hazırlanıyor…</div>';

  const name = labelOf(target).label;
  const first = startPlaylist(
    `${name} dersi`,
    steps.map((s) => s.href),
    '#/ozet',
    {
      labels: steps.map((s) => s.label),
      modes: steps.map((s) => s.mode),
    },
  );

  // Yönlendirme bir sonraki tik'te: aynı çağrı yığınında hash değiştirmek
  // yönlendiriciyi kendi içinde yeniden çalıştırıyor.
  setTimeout(() => {
    location.replace(first ?? `#/calis/${encodeURIComponent(target)}`);
  }, 0);

  return () => {};
}

/** Patika ve kuyruk bu adresi kullanıyor. */
export function lessonHref(subject: string): string {
  return `#/ders/${encodeURIComponent(subject)}`;
}

/** Dersin kaç adımdan oluştuğu — patikada rozet olarak gösteriliyor. */
export function lessonSteps(subject: string): number {
  return stepsFor(subject).length;
}
