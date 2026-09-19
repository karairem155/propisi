// Kayıtlar ve yedekleme — brief 6.3 (kalibrasyon korpusu) + 12.3 (JSON dışa aktarma).
//
// Faz 1'de bu ekranın yanına src/dev/ altında kalibrasyon ekranı gelecek: korpusu
// yeniden oynatıp güncel eşiklerle yeniden puanlayan ekran. Şimdilik korpusun
// toplanması ve dışarı çıkarılabilmesi yeterli.

import {
  allAttempts,
  clearAttempts,
  countAttempts,
  requestPersistence,
  storageEstimate,
} from '../db/db';
import { downloadBackup, importBackup } from '../db/export';
import type { StrokeAttempt } from '../types';

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = `
    <div class="note">
      <b>brief 12.4 tuzağı:</b> ana ekrana eklenen uygulama, Safari sekmesinden
      <b>ayrı</b> bir depolama kavanozu kullanır. Safari'de topladığın korpus kurulu
      uygulamada görünmez. Korpusu hangi ortamda topluyorsan testi de orada yap.
    </div>

    <div class="stats" id="stats"></div>

    <h2>Yedekleme</h2>
    <p class="note">
      Biriken kayıt bu uygulamanın asıl değeri. <code>navigator.storage.persist()</code>
      garanti değil — düzenli olarak dışa aktar.
    </p>
    <div class="row">
      <button id="export" class="primary on-blue">JSON dışa aktar</button>
      <button id="importBtn" class="ghost">JSON içe aktar</button>
      <input type="file" id="file" accept="application/json" hidden>
      <button id="persist" class="ghost">Kalıcı depolama iste</button>
      <button id="clear" class="danger">Tümünü sil</button>
    </div>
    <p class="note" id="status" style="margin-top:12px">—</p>

    <h2>Son kayıtlar</h2>
    <div class="table-card">
      <table>
        <thead>
          <tr><th>Zaman</th><th>Hedef</th><th>Hamle</th><th>Nokta</th><th>Girdi</th><th>Ortam</th></tr>
        </thead>
        <tbody id="rows"><tr><td colspan="6">Yükleniyor…</td></tr></tbody>
      </table>
    </div>
  `;

  const statsBox = root.querySelector<HTMLElement>('#stats')!;
  const rows = root.querySelector<HTMLElement>('#rows')!;
  const status = root.querySelector<HTMLElement>('#status')!;
  const file = root.querySelector<HTMLInputElement>('#file')!;

  let disposed = false;

  async function refresh() {
    const [count, estimate, attempts] = await Promise.all([
      countAttempts(),
      storageEstimate(),
      allAttempts(),
    ]);
    if (disposed) return;

    const points = attempts.reduce(
      (n, a) => n + a.strokes.reduce((m, s) => m + s.points.length, 0),
      0,
    );
    const persisted = (await navigator.storage?.persisted?.()) ?? false;

    statsBox.innerHTML = [
      card(String(count), 'deneme'),
      card(String(points), 'ham nokta'),
      card(estimate ? mb(estimate.usage) : '—', 'kullanılan'),
      card(estimate ? mb(estimate.quota) : '—', 'kota'),
      card(persisted ? 'evet' : 'hayır', 'kalıcı depolama'),
    ].join('');

    rows.innerHTML = attempts.length
      ? attempts.slice(0, 60).map(row).join('')
      : '<tr><td colspan="6">Henüz kayıt yok. Çizim yüzeyinde bir deneme kaydet.</td></tr>';
  }

  root.querySelector('#export')!.addEventListener('click', async () => {
    const n = await downloadBackup();
    status.textContent = `${n} deneme dışa aktarıldı.`;
  });

  root.querySelector('#importBtn')!.addEventListener('click', () => file.click());

  file.addEventListener('change', async () => {
    const picked = file.files?.[0];
    if (!picked) return;
    try {
      const n = await importBackup(picked);
      status.textContent = `${n} deneme içe aktarıldı.`;
      await refresh();
    } catch (err) {
      status.textContent = `İçe aktarma başarısız: ${(err as Error).message}`;
    }
    file.value = '';
  });

  root.querySelector('#persist')!.addEventListener('click', async () => {
    const ok = await requestPersistence();
    status.textContent = ok
      ? 'Kalıcı depolama verildi. Yine de düzenli dışa aktar — garanti değil.'
      : 'Kalıcı depolama verilmedi. JSON yedeği tek güvence.';
    await refresh();
  });

  root.querySelector('#clear')!.addEventListener('click', async () => {
    if (!confirm('Tüm kayıtlar silinecek. Önce dışa aktardın mı?')) return;
    await clearAttempts();
    status.textContent = 'Tüm kayıtlar silindi.';
    await refresh();
  });

  void refresh();

  return () => {
    disposed = true;
  };
}

function row(a: StrokeAttempt): string {
  const points = a.strokes.reduce((n, s) => n + s.points.length, 0);
  const types = [...new Set(a.strokes.map((s) => s.pointerType))].join(', ') || '—';
  const canceled = a.strokes.some((s) => s.canceled) ? ' ⚠︎' : '';
  const env = `${a.env.standalone ? 'kurulu' : 'tarayıcı'} · dsync=${
    a.env.desynchronized === null ? '?' : a.env.desynchronized ? 'e' : 'h'
  }`;
  return `<tr>
    <td>${new Date(a.ts).toLocaleString('tr-TR')}</td>
    <td><code>${a.target}</code></td>
    <td>${a.strokes.length}${canceled}</td>
    <td>${points}</td>
    <td>${types}</td>
    <td>${env}</td>
  </tr>`;
}

function card(value: string, label: string): string {
  return `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
}

function mb(bytes: number): string {
  if (bytes > 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
