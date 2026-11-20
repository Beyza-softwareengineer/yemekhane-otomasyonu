(function () {
  const h = Y.h;
  const bildirim = document.getElementById('bildirim');
  const icerik = document.getElementById('icerik');

  let secimler = null;
  let yemekler = [];

  async function baslat() {
    const ben = await Y.baslat('yonetici');
    if (ben.rol !== 'yonetici') {
      Y.doldur(icerik, h('p', { sinif: 'bildirim bildirim-hata', role: 'alert' }, 'Bu sayfa yalnızca yöneticiler içindir.'));
      return;
    }
    [secimler, yemekler] = await Promise.all([Y.api('/secimler'), Y.api('/yonetici/yemekler')]);

    // ---------- Rapor ----------
    const bas = h('input', { id: 'r-bas', type: 'date', value: Y.bugun() });
    const bit = h('input', { id: 'r-bit', type: 'date', value: Y.gunEkle(Y.bugun(), 6) });
    const raporKutu = h('div', { sinif: 'tablo-kaydir' });

    async function raporYukle() {
      try {
        const liste = await Y.api(`/yonetici/rapor?baslangic=${bas.value}&bitis=${bit.value}`);
        if (liste.length === 0) { Y.doldur(raporKutu, h('p', { sinif: 'bos' }, 'Bu aralıkta menü yok.')); return; }
        Y.doldur(raporKutu, h('table', { sinif: 'tablo' },
          h('thead', {}, h('tr', {},
            h('th', {}, 'Tarih'), h('th', {}, 'Yemekhane'), h('th', {}, 'Öğün'),
            h('th', { sinif: 'sayi' }, 'Rezerve'), h('th', { sinif: 'sayi' }, 'Doluluk'),
            h('th', { sinif: 'sayi' }, 'Puan'), h('th', {}, ''))),
          h('tbody', {}, liste.map((r) => h('tr', {},
            h('td', {}, Y.tarihTR(r.tarih)),
            h('td', {}, r.yemekhane),
            h('td', {}, r.ogun),
            h('td', { sinif: 'sayi' }, r.rezerve + ' / ' + r.kapasite),
            h('td', { sinif: 'sayi' }, '%' + r.doluluk_yuzde),
            h('td', { sinif: 'sayi' }, r.ortalama_puan === null ? '–' : r.ortalama_puan + ' (' + r.oy_sayisi + ' oy)'),
            h('td', {}, h('button', { type: 'button', sinif: 'dugme dugme-ikincil', style: 'min-height:36px;padding:.25rem .7rem', onclick: () => duzenle(r.menu_id) }, 'Düzenle')))))));
      } catch (hata) { Y.bildir(bildirim, hata.message, 'hata'); }
    }

    // ---------- Menü formu ----------
    const fId = h('input', { type: 'hidden', id: 'f-id' });
    const fYemekhane = h('select', { id: 'f-yemekhane' }, Y.secenekler(secimler.yemekhaneler, 1));
    const fTarih = h('input', { id: 'f-tarih', type: 'date', value: Y.gunEkle(Y.bugun(), 1) });
    const fOgun = h('select', { id: 'f-ogun' }, Y.secenekler(secimler.ogunler, 2));
    const fOgr = h('input', { id: 'f-ogr', type: 'text', inputMode: 'decimal', placeholder: 'Örn. 40' });
    const fPer = h('input', { id: 'f-per', type: 'text', inputMode: 'decimal', placeholder: 'Örn. 90' });
    const formBaslik = h('h2', {}, 'Yeni menü');
    const kaydetDugme = h('button', { type: 'submit', sinif: 'dugme' }, 'Menüyü kaydet');

    const kategoriler = new Map();
    for (const y of yemekler) {
      if (!kategoriler.has(y.kategori)) kategoriler.set(y.kategori, []);
      kategoriler.get(y.kategori).push(y);
    }
    const kutular = [];
    const yemekAlani = h('div', {}, [...kategoriler].map(([kat, liste]) =>
      h('fieldset', {}, h('legend', {}, kat), liste.map((y) => {
        const kutu = h('input', { type: 'checkbox', value: y.id, id: 'y-' + y.id });
        kutular.push(kutu);
        return h('label', { sinif: 'secenek', for: 'y-' + y.id }, kutu, y.ad + ' (' + y.kalori + ' kcal)');
      }))));

    function formuSifirla() {
      fId.value = '';
      formBaslik.textContent = 'Yeni menü';
      fYemekhane.disabled = fTarih.disabled = fOgun.disabled = false;
      fOgr.value = fPer.value = '';
      kutular.forEach((k) => { k.checked = false; });
    }

    async function duzenle(menuId) {
      Y.bildir(bildirim, '');
      try {
        const m = await Y.api('/yonetici/menuler/' + menuId);
        fId.value = m.id;
        formBaslik.textContent = 'Menüyü düzenle (' + Y.tarihTR(m.tarih) + ')';
        fYemekhane.value = m.yemekhane_id; fTarih.value = m.tarih; fOgun.value = m.ogun_id;
        fYemekhane.disabled = fTarih.disabled = fOgun.disabled = true; // yemekhane/tarih/öğün değişmez
        fOgr.value = m.ogrenci_fiyati; fPer.value = m.personel_fiyati;
        kutular.forEach((k) => { k.checked = m.yemek_idler.includes(Number(k.value)); });
        formBaslik.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (hata) { Y.bildir(bildirim, hata.message, 'hata'); }
    }

    const form = h('form', { novalidate: true, onsubmit: async (olay) => {
      olay.preventDefault();
      Y.bildir(bildirim, '');
      kaydetDugme.disabled = true;
      const govde = {
        ogrenci_fiyati: fOgr.value, personel_fiyati: fPer.value,
        yemek_idler: kutular.filter((k) => k.checked).map((k) => Number(k.value)),
      };
      try {
        if (fId.value) {
          await Y.api('/yonetici/menuler/' + fId.value, { yontem: 'PUT', govde });
          Y.bildir(bildirim, 'Menü güncellendi.', 'basari');
        } else {
          Object.assign(govde, { yemekhane_id: Number(fYemekhane.value), ogun_id: Number(fOgun.value), tarih: fTarih.value });
          await Y.api('/yonetici/menuler', { yontem: 'POST', govde });
          Y.bildir(bildirim, 'Menü oluşturuldu.', 'basari');
          bas.value = bit.value = fTarih.value; // yeni menü raporda görünsün
        }
        formuSifirla();
        await raporYukle();
      } catch (hata) {
        Y.bildir(bildirim, hata.message, 'hata');
      } finally {
        kaydetDugme.disabled = false;
      }
    } },
      fId, formBaslik,
      h('div', { sinif: 'filtre' },
        h('div', {}, h('label', { for: 'f-yemekhane' }, 'Yemekhane'), fYemekhane),
        h('div', {}, h('label', { for: 'f-tarih' }, 'Tarih'), fTarih),
        h('div', {}, h('label', { for: 'f-ogun' }, 'Öğün'), fOgun)),
      h('div', { sinif: 'alan-satir alan' },
        h('div', {}, h('label', { for: 'f-ogr' }, 'Öğrenci fiyatı (TL)'), fOgr),
        h('div', {}, h('label', { for: 'f-per' }, 'Personel fiyatı (TL)'), fPer)),
      h('h3', {}, 'Yemekler'), yemekAlani,
      h('div', { sinif: 'dugme-satir' }, kaydetDugme,
        h('button', { type: 'button', sinif: 'dugme dugme-ikincil', onclick: formuSifirla }, 'Yeni menü / temizle')));

    Y.doldur(icerik,
      h('section', { sinif: 'kart' },
        h('h2', {}, 'Doluluk ve ortalama puan'),
        h('div', { sinif: 'filtre' },
          h('div', {}, h('label', { for: 'r-bas' }, 'Başlangıç'), bas),
          h('div', {}, h('label', { for: 'r-bit' }, 'Bitiş'), bit),
          h('div', { style: 'align-self:end' }, h('button', { type: 'button', sinif: 'dugme dugme-tam', onclick: raporYukle }, 'Listele'))),
        raporKutu),
      h('section', { sinif: 'kart' }, form));
    await raporYukle();
  }

  baslat().catch((hata) => Y.bildir(bildirim, hata.message, 'hata'));
})();
