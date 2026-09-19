// Karışan harfler.
//
// Tanıma alıştırmasında şıklar RASTGELE OLAMAZ. `и` sorulurken seçenekler
// `о`, `ж`, `ф` olursa alıştırma hiçbir şey öğretmez — el yazısında zaten
// birbirine benzemiyorlar. Şıklar karışma ihtimali olan harflerden gelmeli.
//
// Brief 6.1: "и, л, м, ш, щ, ы aynı temel elementten (noktasız ı) oluşur."
// Uygulamanın değer ürettiği yer tam olarak bu ayrım; alıştırma da oraya
// nişan almalı.
//
// İkinci büyük grup oval tabanlılar (о а д б с е), üçüncüsü tepe sayısıyla
// ayrılanlar (ш щ т м).

export const CONFUSABLES: Record<string, string[]> = {
  // Tekrarlayan dikey element — asıl zorluk
  и: ['ш', 'л', 'м', 'ц'],
  ш: ['и', 'щ', 'т', 'м'],
  щ: ['ш', 'ц', 'и', 'м'],
  л: ['м', 'и', 'я', 'ш'],
  м: ['л', 'ш', 'и', 'т'],
  ц: ['и', 'щ', 'п', 'ш'],
  т: ['ш', 'м', 'п', 'г'],
  й: ['и', 'ц', 'ш', 'н'],

  // Oval tabanlılar
  о: ['а', 'с', 'б', 'е'],
  а: ['о', 'д', 'б', 'я'],
  д: ['а', 'о', 'у', 'б'],
  б: ['о', 'в', 'д', 'ь'],
  с: ['о', 'е', 'э', 'а'],
  е: ['с', 'о', 'э', 'ё'],
  ё: ['е', 'с', 'э', 'о'],

  // İlmekli / kuyruklu
  у: ['ч', 'д', 'ц', 'г'],
  ч: ['у', 'г', 'ц', 'т'],
  з: ['э', 'в', 'ч', 'у'],
  э: ['з', 'с', 'е', 'о'],

  // Dikey + işaret
  ь: ['ъ', 'ы', 'в', 'б'],
  ъ: ['ь', 'ы', 'в', 'б'],
  ы: ['ь', 'и', 'ъ', 'ю'],
  в: ['б', 'ь', 'з', 'ъ'],

  // Yön değişimi
  н: ['п', 'к', 'ю', 'и'],
  к: ['н', 'ж', 'ю', 'х'],
  ю: ['н', 'ы', 'к', 'в'],
  п: ['т', 'н', 'г', 'и'],
  г: ['ч', 'т', 'п', 'р'],
  р: ['п', 'г', 'у', 'ф'],
  я: ['л', 'а', 'м', 'и'],

  // Saat yönü
  ж: ['х', 'к', 'ф', 'з'],
  х: ['ж', 'ф', 'к', 'у'],
  ф: ['х', 'р', 'б', 'ж'],
};

/**
 * Bir harf için şık üretir: doğru cevap + karışabilecek üç harf.
 * Karışan listesi yetmezse alfabeden tamamlanır, ama bu bir kayıptır —
 * o harf için listeyi genişletmek gerekir.
 */
export function optionsFor(ch: string, count = 4, pool: string[] = []): string[] {
  const near = (CONFUSABLES[ch] ?? []).filter((x) => x !== ch);
  const picked: string[] = [];

  for (const cand of near) {
    if (picked.length >= count - 1) break;
    if (!picked.includes(cand)) picked.push(cand);
  }
  for (const cand of pool) {
    if (picked.length >= count - 1) break;
    if (cand !== ch && !picked.includes(cand)) picked.push(cand);
  }

  const all = [ch, ...picked];
  // Karıştır — doğru cevap hep ilk sırada olmasın.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}
