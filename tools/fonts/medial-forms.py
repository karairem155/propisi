"""Russkopis'e kelime içi л м я э biçimlerini ekler.

Sorun: fontta л м я э her konumda süs topuyla başlıyor. Kelime başında doğru,
ama kelime içinde önceki harfin kuyruğu topa çarpıyor ve kalem kalkıp yeniden
başlamış gibi görünüyor. Kullanıcı "мама tam birleşik değil" dedi; ölçüm
aracı (boş sütun sayımı) bunu göremiyordu çünkü top boşluğu kapatıyor.

Çözüm: `.medi` biçimleri + `calt` kuralı. Kuyruğu standart kesitte biten bir
harften sonra gelen л м я э kelime içi biçime geçer.

Kelime içi biçimin şekli propisi'nin "Основные соединения букв" tablosundan
(ял, ям, ол, вл, оя): kanca KORUNUYOR, top yok; önceki harfin bağlantısı
aşağı inip kancanın dibine giriyor. İlk denemede kancayı da atıp girişi
doğrudan tepeye çıkarmıştım — л ve м "и"ye benzedi, yanlıştı.

Kullanım (projeden):  python tools/fonts/medial-forms.py
Kaynak: tools/fonts/Russkopis-Normalny.orig.otf  (değiştirilmemiş özgün)
Çıktı:  src/ui/fonts/Russkopis-Normalny.otf

Lisans X11 — değiştirilmiş sürüm dağıtılabilir, telif satırları korunuyor.
"""

import math
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.otlLib.builder import buildLookup, buildSingleSubstSubtable
from fontTools.ttLib.tables import otTables as ot

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/fonts/Russkopis-Normalny.orig.otf'
OUT = ROOT / 'src/ui/fonts/Russkopis-Normalny.otf'

# Kelime içi girişin kesiti — öbür küçük harflerin hepsi buradan başlıyor.
J_TOP = (0, 156)
J_LOW = (14, 148)


def unit(dx, dy):
    n = math.hypot(dx, dy)
    return dx / n, dy / n


def ctrl_from(p, ang_deg, length):
    a = math.radians(ang_deg)
    return (round(p[0] + math.cos(a) * length), round(p[1] + math.sin(a) * length))


def ctrl_back(p, d, length):
    return (round(p[0] - d[0] * length), round(p[1] - d[1] * length))


def segments(gs, name):
    pen = RecordingPen()
    gs[name].draw(pen)
    # konturlara böl
    contours, cur = [], []
    for op, args in pen.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            contours.append(cur)
            cur = []
    return contours


def index_of(contour, op, end):
    for i, (o, a) in enumerate(contour):
        if o == op and a and tuple(a[-1]) == end:
            return i
    raise SystemExit(f'segment not found: {op} {end}')


# Kancanın sağa kayması: bağlantı çizgisi tepeden kancaya dik değil,
# kuyruğun yükselişinin aynası gibi ~55° ile insin diye.
SHIFT = 70


def shifted(seg, dx):
    op, args = seg
    return (op, tuple((x + dx, y) for x, y in args))


def medial(contours):
    """Kelime içi biçim: top yok, kanca var, bağlantı tepeden kancaya iniyor.

    Propisi'de (ял, ям, ол, вл) önceki harfin bağlantı çizgisi aşağı inip
    л/м/я'nın alt kancasına giriyor. Russkopis'te kuyruklar x-yüksekliğinin
    ortasında (0,156)/(14,148) kesitinde bitiyor; oradan küçük yuvarlak bir
    tepe yapıp kancanın dibine iniyoruz, kancadan sonrası özgün harf.

    Özgün konturda top, alt kenarın (65,0)'dan başlayan ince çizgisi ile
    üst kenarın (41,17)'de biten son parçası arasında. Bu ikisinin arasını
    söküp bağlantı çizgisini koyuyoruz.
    """
    c = contours[0]
    i_low = 1                                         # topun sonu = alt kenar başı
    i_up = index_of(c, 'curveTo', (41, 17))          # üst kenarın top öncesi son parçası
    u_start = tuple(c[i_up - 1][1][-1])               # o parçanın başlangıcı
    u_ctrl = c[i_up][1][0]
    S = SHIFT
    U = (u_start[0] + S, u_start[1])
    d = unit(u_ctrl[0] - u_start[0], u_ctrl[1] - u_start[1])
    low0 = (c[i_low][1][-1][0] + S, 0)
    cup = (low0[0] + 15, 17)                          # kancanın iç dibi

    out = [('moveTo', (J_LOW,))]
    # sol kenar: tepenin içinden aşağı, kancanın dış dibine yatay varış
    out.append(('curveTo', ((J_LOW[0] + 20, J_LOW[1] - 35), (low0[0] - 60, 0), low0)))
    out.extend(shifted(sg, S) for sg in c[i_low + 1: i_up])
    # sağ kenar: ince çizginin üst kenarı kancanın iç dibine, oradan yukarı
    out.append(('curveTo', ((round(U[0] + d[0] * 55), round(U[1] + d[1] * 55)), (cup[0] + 70, 17), cup)))
    out.append(('curveTo', ((cup[0] - 50, 17), (42, 212), J_TOP)))
    out.append(('closePath', ()))
    rest = [[shifted(sg, S) if sg[1] else sg for sg in k] for k in contours[1:]]
    return [out] + rest


def draw(contours, pen):
    for c in contours:
        for op, args in c:
            getattr(pen, op)(*args)


def joins_at_standard_point(gs, name):
    """Kuyruğu standart kesitte (genişlik+5..19, 148..162) biten glifler."""
    pen = RecordingPen()
    gs[name].draw(pen)
    w = gs[name].width
    pts = [tuple(a[-1]) for o, a in pen.value if a]
    return any(abs(x - w - 5) <= 4 and abs(y - 162) <= 6 for x, y in pts) and \
        any(abs(x - w - 19) <= 4 and abs(y - 154) <= 6 for x, y in pts)


def main():
    if not SRC.exists():
        sys.exit('missing original font: ' + str(SRC))
    font = TTFont(str(SRC))
    gs = font.getGlyphSet()
    cff = font['CFF '].cff
    top = cff.topDictIndex[0]
    cs = top.CharStrings
    private = top.Private
    hmtx = font['hmtx']

    builders = {'el': medial, 'em': medial, 'ia': medial, 'ecyrilrev': medial}
    order = font.getGlyphOrder()
    new_names = []
    for base, fn in builders.items():
        contours = segments(gs, base)
        new = fn(contours)
        name = base + '.medi'
        w = gs[base].width + SHIFT
        # CFF genişliği nominalWidthX'e göre kodlanıyor; ham verilirse
        # tarayıcı ilerlemeyi nominalWidthX kadar fazla görüyor.
        pen = T2CharStringPen(w - private.nominalWidthX, None)
        draw(new, pen)
        charstring = pen.getCharString(private=private, globalSubrs=cff.GlobalSubrs)
        bp = BoundsPen(None)
        draw(new, bp)
        lsb = int(bp.bounds[0]) if bp.bounds else 0
        # CharStrings'e ekle
        if hasattr(cs, 'charStringsIndex'):
            cs.charStringsIndex.append(charstring)
            cs.charStrings[name] = len(cs.charStringsIndex) - 1
        else:
            cs[name] = charstring
        hmtx.metrics[name] = (w, lsb)
        new_names.append(name)

    order = order + new_names
    font.setGlyphOrder(order)
    top.charset = order
    font['maxp'].numGlyphs = len(order)

    # Bağlam: standart kesitte biten her harf (küçük + büyük + yeni biçimler).
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    letters = [cmap[c] for c in cmap if chr(c).isalpha()]
    backtrack = sorted({g for g in letters if joins_at_standard_point(gs, g)} | set(new_names),
                       key=order.index)

    # Tekil değiştirme (л→л.medi …)
    single = buildLookup([buildSingleSubstSubtable({b: b + '.medi' for b in builders})])

    gsub = font['GSUB'].table
    gsub.LookupList.Lookup.append(single)
    single_idx = len(gsub.LookupList.Lookup) - 1

    # Zincirli bağlam (format 3): [geri: harf] [girdi: л м я]
    chain = ot.ChainContextSubst()
    chain.Format = 3
    bt = ot.Coverage(); bt.glyphs = backtrack
    inp = ot.Coverage(); inp.glyphs = sorted(builders, key=order.index)
    chain.BacktrackCoverage = [bt]
    chain.BacktrackGlyphCount = 1
    chain.InputCoverage = [inp]
    chain.InputGlyphCount = 1
    chain.LookAheadCoverage = []
    chain.LookAheadGlyphCount = 0
    rec = ot.SubstLookupRecord(); rec.SequenceIndex = 0; rec.LookupListIndex = single_idx
    chain.SubstLookupRecord = [rec]
    chain.SubstCount = 1
    lookup = ot.Lookup()
    lookup.LookupType = 6
    lookup.LookupFlag = 0
    lookup.SubTable = [chain]
    lookup.SubTableCount = 1
    gsub.LookupList.Lookup.append(lookup)
    chain_idx = len(gsub.LookupList.Lookup) - 1
    gsub.LookupList.LookupCount = len(gsub.LookupList.Lookup)

    feat = ot.Feature()
    feat.FeatureParams = None
    feat.LookupListIndex = [chain_idx]
    feat.LookupCount = 1
    frec = ot.FeatureRecord()
    frec.FeatureTag = 'calt'
    frec.Feature = feat
    gsub.FeatureList.FeatureRecord.append(frec)
    gsub.FeatureList.FeatureCount = len(gsub.FeatureList.FeatureRecord)
    fidx = gsub.FeatureList.FeatureCount - 1
    for srec in gsub.ScriptList.ScriptRecord:
        langs = [srec.Script.DefaultLangSys] + [l.LangSys for l in srec.Script.LangSysRecord]
        for ls in langs:
            if ls is None:
                continue
            ls.FeatureIndex.append(fidx)
            ls.FeatureCount = len(ls.FeatureIndex)

    # Değiştirildiğini adda belirt (X11: telif satırı korunuyor).
    for rec_ in font['name'].names:
        if rec_.nameID == 5:
            rec_.string = rec_.toUnicode() + '; propisi medial el em ya'

    font.save(str(OUT))
    print('ok', OUT.name, 'backtrack', len(backtrack), 'glyphs')


if __name__ == '__main__':
    main()
