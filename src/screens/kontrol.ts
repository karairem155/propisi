// Kontrol noktası — seviye sınavı. Bkz. docs/ekranlar.md §2.2
//
// Patikada her seviyenin sonunda bir hedef tahtası duruyordu ama tıklanmıyordu:
// ekranı yoktu. Bu o ekran.
//
// TASARIM KARARI — sınav kendi soru tiplerini YAZMIYOR.
// Mevcut beş alıştırma ekranını sırayla çalıştırıyor (srs/session.ts →
// sınav listesi). Sebebi iki tane:
//
//   · Sınav, öğrenilenin aynısını istemeli. Ayrı bir soru tipi icat etmek
//     "çalıştığın şeyden başka bir şeyden sınav olmak" demek.
//   · İkinci bir değerlendirme yolu ikinci bir hata kaynağıdır. Puanlama
//     tek yerde kalsın (grading/shape.ts).
//
// Dersten farkı ekranların davranışında: sınav listesi açıkken çalışma ekranı
// yedi denemelik diziyi bırakıp TEK, KILAVUZSUZ denemeye geçiyor
// (screens/calisma.ts → EXAM_LESSON).

import { ELEMENTS, LEVELS, type Level } from '../data/curriculum';
import { checkpointLevel, labelOf } from '../data/labels';
import { cardId, mastery, Rating } from '../srs/cards';
import { ensureCard, progressBySubject, review } from '../srs/scheduler';
import { recordReview } from '../srs/stats';
import { endPlaylist, playlistResults, startPlaylist } from '../srs/session';
import { mascot } from '../ui/mascot';

/** Geçme eşiği — ortalama. Ders eşiği 0.72; sınav biraz daha yukarıda. */
const PASS_AVERAGE = 0.75;
/** Tek bir adım bunun altındaysa ortalama kurtarsa bile geçilmez. */
const PASS_FLOOR = 0.5;

type Exam = {
  subject: string;
  levelId: string;
  title: string;
  steps: ExamStep[];
};

type ExamStep = {
  href: string;
  /** Adımın ne ölçtüğü — giriş listesinde ve sonuçta gösteriliyor. */
  kind: string;
  label: string;
  /** Etiket el yazısıyla basılsın mı. Element adları Türkçe — basılmamalı. */
  cursive: boolean;
};

// ── Sınavı kur ───────────────────────────────────────────────────────────────

/**
 * Sınav içeriği o seviyenin kendi malzemesinden çıkar; en zayıf konular öne
 * alınır. "Zayıf" = FSRS stability'den türeyen ustalık (cards.ts → mastery).
 */
async function buildExam(subject: string): Promise<Exam | null> {
  const progress = await progressBySubject();
  const weakestFirst = (list: string[]): string[] =>
    [...list].sort((a, b) => scoreOf(a) - scoreOf(b));

  function scoreOf(subj: string): number {
    const cards = progress.get(subj)?.cards ?? [];
    if (!cards.length) return 0;
    return cards.reduce((n, c) => n + mastery(c), 0) / cards.length;
  }

  if (subject === 'cp-elements') {
    const ids = weakestFirst(ELEMENTS.map((e) => e.id)).slice(0, 3);
    return {
      subject,
      levelId: 'elements',
      title: 'Elemanlar sınavı',
      steps: ids.map((id) => ({
        href: `#/calis/${encodeURIComponent(id)}`,
        kind: 'Şekil',
        label: labelOf(id).label,
        cursive: false,
      })),
    };
  }

  const level = LEVELS.find((l) => `cp-${l.id}` === subject);
  if (!level) return null;

  return {
    subject,
    levelId: level.id,
    title: `${level.ru} sınavı`,
    steps: stepsForLevel(level, weakestFirst(level.letters.map((l) => l.ch))),
  };
}

/**
 * Altı adım, dört ayrı beceri: yazmak · tanımak · ayırt etmek · duyup yazmak.
 * Tek tip sınav tek tip beceriyi ölçer; brief 7.0 aynı gerekçeyle kuyruğu da
 * karıştırıyor.
 */
function stepsForLevel(level: Level, letters: string[]): ExamStep[] {
  const pick = (i: number): string => letters[i] ?? letters[0] ?? level.letters[0]!.ch;
  const steps: ExamStep[] = [
    { href: `#/calis/${encodeURIComponent(pick(0))}`, kind: 'Yazım', label: pick(0), cursive: true },
    { href: `#/tani/${encodeURIComponent(pick(1))}`, kind: 'Tanıma', label: pick(1), cursive: true },
  ];

  const join = level.joins[0];
  if (join) {
    steps.push({
      href: `#/calis/${encodeURIComponent(join)}`,
      kind: 'Bağlantı',
      label: join,
      cursive: true,
    });
  }
  steps.push({
    href: `#/av/${encodeURIComponent(pick(2))}`,
    kind: 'Harf avı',
    label: pick(2),
    cursive: true,
  });

  const word = level.words[0];
  if (word) {
    steps.push({
      href: `#/dikte/${encodeURIComponent(word.ru)}`,
      kind: 'Dikte',
      label: word.ru,
      cursive: true,
    });
  }
  // Eşleştirme dört kelime karşılaştırır; üçten azıyla ölçmüyor.
  if (level.words.length >= 3 && word) {
    steps.push({
      href: `#/eslestir/${encodeURIComponent(word.ru)}`,
      kind: 'Eşleştirme',
      label: level.words
        .slice(0, 4)
        .map((w) => w.ru)
        .join(' · '),
      cursive: false,
    });
  }
  return steps;
}

// ── Giriş ekranı ─────────────────────────────────────────────────────────────

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'cp-elements';
  const tag = checkpointLevel(target);

  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">Sınav hazırlanıyor…</div>';

  let disposed = false;

  void (async () => {
    const exam = await buildExam(target);
    if (disposed) return;

    if (!exam) {
      root.innerHTML = `<div class="warn">Böyle bir kontrol noktası yok: <code>${target}</code></div>
        <a class="btn primary" href="#/patika" style="display:block;text-align:center;text-decoration:none">Patikaya dön</a>`;
      return;
    }

    const progress = await progressBySubject();
    if (disposed) return;
    const passedBefore = (progress.get(target)?.cards ?? []).some((c) => c.fsrs.reps > 0);

    root.innerHTML = `
      <div class="exam-hero">
        ${mascot('kanca', { size: 78, mood: passedBefore ? 'cheer' : 'open' })}
        <b>${tag ?? 'Kontrol noktası'}</b>
        <h2>${exam.title}</h2>
      </div>

      ${
        passedBefore
          ? `<div class="ok">Bu sınavı geçtin. Tekrar çözebilirsin — sonuç kartı günceller.</div>`
          : ''
      }

      <div class="note">
        Sınavda <b>kılavuz yok</b> ve her adımda <b>tek deneme</b> hakkın var.
        Geçmek için ortalama <b>${Math.round(PASS_AVERAGE * 100)}</b> ve hiçbir adımda
        <b>${Math.round(PASS_FLOOR * 100)}</b> altına düşmemek gerekiyor.
      </div>

      <ol class="exam-list">
        ${exam.steps
          .map(
            (s, i) => `<li>
              <span class="exam-no">${i + 1}</span>
              <span class="exam-txt">
                <b>${s.kind}</b>
                <span class="${s.cursive ? 'cursive' : 'fine'}">${s.label}</span>
              </span>
            </li>`,
          )
          .join('')}
      </ol>

      <button class="primary" id="start" style="width:100%">
        Sınavı başlat · ${exam.steps.length} adım
      </button>
      <a class="btn ghost" href="#/patika" style="display:block;text-align:center;text-decoration:none;margin-top:10px">
        Sonra
      </a>
    `;

    root.querySelector('#start')!.addEventListener('click', () => {
      const first = startPlaylist(
        tag ? `${tag} sınavı` : 'Sınav',
        exam.steps.map((s) => s.href),
        `#/kontrol-sonuc/${encodeURIComponent(target)}`,
        { exam: true },
      );
      if (first) location.hash = first;
    });
  })();

  return () => {
    disposed = true;
  };
}

/**
 * Adımın tam adı — "Şekil" tek başına yetmiyor: elemanlar sınavında üç adımın
 * da türü "Şekil", hangisinin düştüğü belli olmuyordu.
 */
function stepName(step: ExamStep | undefined, subject: string): string {
  if (!step) return labelOf(subject).label;
  return `${step.kind} · ${step.label}`;
}

// ── Sonuç ekranı ─────────────────────────────────────────────────────────────

export function renderResult(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'cp-elements';
  const tag = checkpointLevel(target);
  const results = playlistResults();
  // Not okundu; liste kapanmalı ki sonraki alıştırma normal kuyruğa dönsün.
  endPlaylist();

  root.className = 'screen';

  if (!results.length) {
    // Sayfa yenilenmişse oturum sıfırlanır ve sınav kaydı kalmaz.
    root.innerHTML = `
      <div class="warn">Sınav kaydı bulunamadı — sayfa yenilenmiş olabilir.</div>
      <a class="btn primary" href="#/kontrol/${encodeURIComponent(target)}"
         style="display:block;text-align:center;text-decoration:none">Sınavı yeniden çöz</a>`;
    return () => {};
  }

  const average = results.reduce((n, r) => n + r.score, 0) / results.length;
  let worstAt = 0;
  results.forEach((r, i) => {
    if (r.score < results[worstAt]!.score) worstAt = i;
  });
  const worst = results[worstAt]!;
  const passed = average >= PASS_AVERAGE && worst.score >= PASS_FLOOR;
  const pct = (v: number) => Math.round(v * 100);

  root.innerHTML = '<div class="empty-hint">Sonuç hesaplanıyor…</div>';
  let disposed = false;

  void (async () => {
    const exam = await buildExam(target);
    if (disposed) return;

    if (passed) {
      // Kart yalnız GEÇİLİNCE ilerletilir. Kalınca reps 0 kalır, patika
      // düğümü 'current' durur ve sınav açık kalmaya devam eder.
      await ensureCard('checkpoint', target, exam?.levelId ?? 'elements');
      await review(
        cardId('checkpoint', target),
        average >= 0.9 ? Rating.Easy : Rating.Good,
        [],
      );
      await recordReview();
    }
    if (disposed) return;

    // Adımlar sırayla çalıştığı için sonuç i'inci adımın sonucudur. Konu adı
    // tek başına yetmiyor: dikte ve eşleştirme aynı kelimeyi kullanıyor,
    // ikisi de "три" diye görünüyordu.
    const rows = results
      .map((r, i) => {
        const step = exam?.steps[i];
        const info = step ?? labelOf(r.subject);
        const color =
          r.score >= PASS_AVERAGE
            ? 'var(--mint)'
            : r.score >= PASS_FLOOR
              ? 'var(--amber)'
              : 'var(--coral)';
        return `<div class="bar-row">
          <span class="bar-name">
            ${step ? `${step.kind} · ` : ''}<span class="${
              'cursive' in info ? (info.cursive ? 'cursive' : '') : info.isLetter ? 'cursive' : ''
            }">${info.label}</span>
          </span>
          <div class="bar-track"><i style="width:${pct(r.score)}%;background:${color}"></i></div>
          <b>${pct(r.score)}</b>
        </div>`;
      })
      .join('');

    root.innerHTML = `
      <div class="exam-hero">
        ${mascot(passed ? 'oval' : 'ilmek', { size: 78, mood: passed ? 'cheer' : 'think' })}
        <b>${tag ?? 'Kontrol noktası'}</b>
        <h2>${passed ? 'Geçtin' : 'Henüz olmadı'}</h2>
        <div class="exam-score">${pct(average)}</div>
      </div>

      <div class="card">
        ${rows}
      </div>

      <div class="${passed ? 'ok' : 'warn'}">
        ${
          passed
            ? 'Bir sonraki seviye açıldı. Zayıf kalan adımlar tekrar kuyruğunda.'
            : `Geçmek için ortalama ${Math.round(PASS_AVERAGE * 100)} gerekiyor${
                worst.score < PASS_FLOOR
                  ? ` ve <b>${stepName(exam?.steps[worstAt], worst.subject)}</b> adımı
                     ${Math.round(PASS_FLOOR * 100)} altında kaldı`
                  : ''
              }. Zayıf adımlar tekrar kuyruğuna girdi — çalışıp geri gel.`
        }
      </div>

      <a class="btn primary" href="#/patika" style="display:block;text-align:center;text-decoration:none">Patikaya dön</a>
      ${
        passed
          ? ''
          : `<a class="btn ghost" href="#/" style="display:block;text-align:center;text-decoration:none;margin-top:10px">
               Tekrar kuyruğuna git
             </a>`
      }
    `;
  })();

  return () => {
    disposed = true;
  };
}
