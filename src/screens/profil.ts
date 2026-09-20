// Profil — ayarlar, yedek, yardım, geliştirici. Bkz. docs/ekranlar.md §2.5

import { DEFAULT_PAPER, type PaperConfig } from '../ui/paper';
import { getSetting, setSetting } from '../db/db';
import { art, artCount } from '../ui/assets';
import { ELEMENTS, LEVELS } from '../data/curriculum';
import { ensureCard, getCard, putCard, review } from '../srs/scheduler';
import { Rating } from '../srs/cards';
import { mascot } from '../ui/mascot';
import { sfx, setSfxMuted, sfxMuted } from '../audio/sfx';
import { CURSIVE_FONTS, currentCursive, setCursive } from '../ui/cursive';

type Slider = {
  key: keyof PaperConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint: string;
};

// brief 7.1 — "açısı ve satır yüksekliği ayarlardan değiştirilebilir"
const SLIDERS: Slider[] = [
  { key: 'rowHeight', label: 'Satır yüksekliği', min: 40, max: 110, step: 2, unit: 'px', hint: 'рабочая строка' },
  { key: 'slantDeg', label: 'Eğim açısı', min: 50, max: 90, step: 1, unit: '°', hint: 'Rus standardı 65°' },
  { key: 'slantGap', label: 'Eğik çizgi aralığı', min: 18, max: 60, step: 2, unit: 'px', hint: '' },
];

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">Yükleniyor…</div>';

  let disposed = false;

  void (async () => {
    const paper = await getSetting<PaperConfig>('paper', DEFAULT_PAPER);
    const goal = await getSetting<number>('dailyGoal', 20);
    const lefty = await getSetting<boolean>('leftHanded', false);
    if (disposed) return;

    const { ready, total } = artCount();

    root.innerHTML = `
      <div class="card" style="display:flex;align-items:center;gap:14px">
        <span class="badge" style="width:62px;height:62px">${mascot('ilmek', { size: 46, mood: 'open' })}</span>
        <div>
          <b style="font-size:17px">Привет!</b>
          <div style="font-size:13px;color:var(--muted)">Tek kullanıcı · yerel veri</div>
        </div>
      </div>

      <h2>Defter ayarları</h2>
      <div class="card">
        ${SLIDERS.map(
          (s) => `<div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700">
              <span>${s.label}</span><span id="v-${s.key}">${paper[s.key]}${s.unit}</span>
            </div>
            <input type="range" id="s-${s.key}" min="${s.min}" max="${s.max}" step="${s.step}"
                   value="${paper[s.key]}" style="width:100%;accent-color:var(--blue)">
            ${s.hint ? `<div style="font-size:11px;color:var(--muted)">${s.hint}</div>` : ''}
          </div>`,
        ).join('')}
        <label class="toggle"><input type="checkbox" id="lefty" ${lefty ? 'checked' : ''}> Sol el modu</label>
      </div>

      <h2>Tekrar</h2>
      <div class="card">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700">
          <span>Günlük hedef</span><span id="v-goal">${goal} kart</span>
        </div>
        <input type="range" id="s-goal" min="5" max="80" step="5" value="${goal}"
               style="width:100%;accent-color:var(--blue)">
        <div style="font-size:11px;color:var(--muted)">
          Sert limit değil, yalnızca öneri (brief 8.3).
        </div>
      </div>

      <h2>El yazısı fontu</h2>
      <div class="note">
        Bu font yalnız görünüm değil: <b>kılavuzun şekli, değerlendirmenin
        hedefi ve yazım animasyonu</b> hep buradan çıkıyor. Yanlış font yanlış
        harf öğretir. Aşağıdaki örneklerde en zor harfler var — hangisi gerçek
        propisi'ye yakınsa onu seç.
      </div>
      <div class="font-picker" id="fontPick">
        ${CURSIVE_FONTS.map(
          (f) => `
          <button class="font-option${f.id === currentCursive().id ? ' on' : ''}" data-font="${f.id}">
            <div class="font-head">
              <b>${f.label}</b>
              <small>${f.license}</small>
            </div>
            <div class="font-join ${f.joins ? 'yes' : 'no'}">
              ${f.joins ? '✓ harfleri birleştiriyor' : '✕ harfleri ayrı basıyor'}
            </div>
            <div class="font-sample" style="font-family:${f.family}">бвгджктф</div>
            <div class="font-sample sm" style="font-family:${f.family}">Кот спит на окне.</div>
            <div class="fine" style="margin:0">${f.note}</div>
          </button>`,
        ).join('')}
      </div>
      <div class="note">
        Gerçek okul propisi fontu (ParaType «Прописи») <b>ticari</b> —
        depoya konamaz. Satın alırsan <code>src/ui/fonts/</code> içine koyup
        listeye bir satır eklemek yeterli, başka hiçbir yer değişmiyor.
      </div>

      <h2>Ses ve hareket</h2>
      <div class="card">
        <label class="toggle">
          <input type="checkbox" id="sfx" ${sfxMuted() ? '' : 'checked'}> Arayüz sesleri
        </label>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">
          Doğru/yanlış tonları. Rusça seslendirme bundan ayrı, hep açık.
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:10px">
          Animasyonlar cihazının <b>hareketi azalt</b> ayarını izliyor —
          açıksan uygulama kendiliğinden sakinleşiyor.
        </div>
      </div>

      <h2>Yedek</h2>
      <nav class="menu">
        <a href="#/records">
          <span class="badge">${mascot('oval', { size: 40 })}</span>
          <span class="txt"><b>Kayıtlar ve yedek</b><span>Kalibrasyon korpusu, JSON dışa/içe aktarma</span></span>
          <span class="go">›</span>
        </a>
      </nav>

      <h2>Yardım</h2>
      <div class="help-row">
        ${art('onboard-scribble', { width: '86px' })}
        <div>
          <b>Scribble kapalı olmalı</b>
          <p class="fine">Ayarlar → Apple Pencil → Scribble. Açıkken hızlı tekrarlayan
          dikey hamlelerde hamle düşüyor (brief 12.2).</p>
        </div>
      </div>
      <div class="help-row">
        ${art('onboard-voice', { width: '86px' })}
        <div>
          <b>Yüksek kaliteli Rusça sesi indirme</b>
          <p class="fine">İndirilen sesler Web Speech listesinde görünmüyor,
          dil tamamen kaybolabiliyor (brief 9.2).</p>
        </div>
      </div>
      <div class="help-row">
        ${art('onboard-install', { width: '86px' })}
        <div>
          <b>Ana ekrana ekle</b>
          <p class="fine">Kurulu uygulama Safari sekmesinden ayrı depolama kullanır;
          testi kurulu hâlde yap (brief 12.4).</p>
        </div>
      </div>

      <h2>Geliştirici</h2>
      <div class="card">
        <div style="font-size:13px;color:var(--muted);margin-bottom:10px">
          Görsel yuvaları: <b style="color:var(--ink)">${ready}/${total}</b> hazır.
          Görsel eklemek için <code>public/art/</code> + <code>ui/assets.ts → PRESENT</code>.
        </div>
        <div class="row">
          <button id="seed" class="ghost">Örnek kart üret</button>
          <button id="unseed" class="ghost">Kartları sil</button>
        </div>
        <p id="seedMsg" style="font-size:12px;color:var(--muted);margin:10px 0 0">—</p>
      </div>
      <nav class="menu" style="margin-top:12px">
        <a href="#/tests">
          <span class="badge">${mascot('kanca', { size: 40, mood: 'think' })}</span>
          <span class="txt"><b>Cihaz testleri</b><span>Ses, gecikme, Scribble (brief 13)</span></span>
          <span class="go">›</span>
        </a>
        <a href="#/sandbox">
          <span class="badge">${mascot('cubuk', { size: 40, mood: 'open' })}</span>
          <span class="txt"><b>Çizim yüzeyi</b><span>Pencil giriş katmanı, hamle kaydı</span></span>
          <span class="go">›</span>
        </a>
        <a href="#/dev/baslangic">
          <span class="badge">${mascot('cubuk', { size: 40, mood: 'think' })}</span>
          <span class="txt"><b>Başlangıç noktaları</b><span>33 harfin kalem başlangıcı — doğrulanmayı bekliyor</span></span>
          <span class="go">›</span>
        </a>
        <a href="#/dev/yazim">
          <span class="badge">${mascot('kanca', { size: 40, mood: 'open' })}</span>
          <span class="txt"><b>Yazım animasyonu</b><span>33 harfin kalem hareketi — fonttan türetildi, gözle denetle</span></span>
          <span class="go">›</span>
        </a>
        <a href="#/dev/mascots">
          <span class="badge">${mascot('ilmek', { size: 40, mood: 'cheer' })}</span>
          <span class="txt"><b>Maskot kadrosu</b><span>Karakterler ve ruh hâlleri</span></span>
          <span class="go">›</span>
        </a>
      </nav>
    `;

    // — ayar bağlamaları —
    for (const s of SLIDERS) {
      const input = root.querySelector<HTMLInputElement>(`#s-${s.key}`)!;
      const out = root.querySelector<HTMLElement>(`#v-${s.key}`)!;
      input.addEventListener('input', () => {
        out.textContent = `${input.value}${s.unit}`;
      });
      input.addEventListener('change', () => {
        void setSetting('paper', { ...paper, [s.key]: Number(input.value) });
      });
    }

    const goalInput = root.querySelector<HTMLInputElement>('#s-goal')!;
    const goalOut = root.querySelector<HTMLElement>('#v-goal')!;
    goalInput.addEventListener('input', () => {
      goalOut.textContent = `${goalInput.value} kart`;
    });
    goalInput.addEventListener('change', () => void setSetting('dailyGoal', Number(goalInput.value)));

    root
      .querySelector<HTMLInputElement>('#lefty')!
      .addEventListener('change', (e) =>
        setSetting('leftHanded', (e.target as HTMLInputElement).checked),
      );

    const msg = root.querySelector<HTMLElement>('#seedMsg')!;

    root.querySelector('#seed')!.addEventListener('click', async () => {
      try {
        const n = await seedSample();
        msg.textContent = `${n} kart üretildi. Patika ve İlerleme artık gerçek veri gösteriyor.`;
      } catch (err) {
        msg.textContent = `Üretim başarısız: ${(err as Error).message}`;
      }
    });

    // Bu düğme BÜTÜN FSRS zamanlamasını siliyor — kullanıcının biriktirdiği
    // ilerlemenin tamamı. Onaysız duruyordu; geliştirici bölümünde olması onu
    // daha az yıkıcı yapmıyor, yanlışlıkla basılması aynı sonucu veriyor.
    root.querySelector('#fontPick')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-font]');
      if (!btn) return;
      void setCursive(btn.dataset['font']!).then(() => {
        for (const b of root.querySelectorAll('[data-font]')) {
          b.classList.toggle('on', b === btn);
        }
      });
    });

    root.querySelector<HTMLInputElement>('#sfx')!.addEventListener('change', (e) => {
      const on = (e.target as HTMLInputElement).checked;
      void setSfxMuted(!on);
      if (on) sfx('correct');
    });

    root.querySelector('#unseed')!.addEventListener('click', async () => {
      const { allCards } = await import('../srs/scheduler');
      const n = (await allCards()).filter((c) => c.fsrs.reps > 0).length;
      const warning = n
        ? `${n} kartta çalışılmış ilerleme var ve GERİ ALINAMAZ. ` +
          'Kayıtlar ekranından yedek aldın mı?'
        : 'Henüz çalışılmış kart yok.';
      if (!confirm(`Bütün tekrar kartları silinecek.

${warning}`)) return;
      const { db } = await import('../db/db');
      await (await db()).clear('cards');
      msg.textContent = 'Tüm kartlar silindi.';
    });
  })();

  return () => {
    disposed = true;
  };
}

/**
 * Geliştirme kolaylığı: elemanları ve ilk grubun bir kısmını çalışılmış gibi işaretler.
 * Böylece patika/ısı haritası/kuyruk gerçek veriyle görülebilir. Alıştırma ekranları
 * Faz 1'de gelince bu düğmeye gerek kalmayacak.
 */
async function seedSample(): Promise<number> {
  let n = 0;

  for (const el of ELEMENTS) {
    await ensureCard('element:write', el.id, 'elements');
    await review(`element:${el.id}:write`, Rating.Good);
    n++;
  }
  // Biri geciksin ki `fading` durumu görünsün.
  // DİKKAT: review()'a geçmiş tarih verme — ts-fsrs son inceleme tarihinden önceki
  // bir tarihi reddedip fırlatıyor. Vadeyi doğrudan geriye almak doğru yol.
  const oval = ELEMENTS.find((e) => e.id === 'el-oval');
  if (oval) {
    const card = await getCard(`element:${oval.id}:write`);
    if (card) {
      card.fsrs.due = new Date(Date.now() - 3 * 86_400_000);
      card.errors['humps'] = 4;
      await putCard(card);
    }
  }

  const g1 = LEVELS[0]!;
  for (const letter of g1.letters.slice(0, 2)) {
    await ensureCard('letter:write', letter.ch, g1.id);
    await review(`letter:${letter.ch}:write`, Rating.Good);
    await ensureCard('letter:read', letter.ch, g1.id);
    await review(`letter:${letter.ch}:read`, Rating.Hard, ['shape']);
    n += 2;
  }

  return n;
}
