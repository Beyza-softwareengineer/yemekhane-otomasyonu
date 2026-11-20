(function () {
  const h = Y.h;
  const bildirim = document.getElementById('bildirim');
  const icerik = document.getElementById('icerik');
  const TUR = { yukleme: 'Yükleme', rezervasyon: 'Rezervasyon', iade: 'İade' };

  const bakiyeKutu = h('div', { sinif: 'buyuk-bakiye', 'aria-live': 'polite' }, '…');
  const gecmis = h('div', { sinif: 'tablo-kaydir' });
  const tutarKutu = h('input', { id: 'tutar', type: 'text', inputMode: 'decimal', autocomplete: 'off', placeholder: 'Örn. 100' });
  const yukleDugme = h('button', { type: 'submit', sinif: 'dugme dugme-tam' }, 'Bakiye yükle');

  async function yukle() {
    const veri = await Y.api('/bakiye');
    bakiyeKutu.textContent = Y.para(veri.bakiye);
    Y.bakiyeGoster(veri.bakiye);
    if (veri.hareketler.length === 0) {
      Y.doldur(gecmis, h('p', { sinif: 'bos' }, 'Henüz hareket yok.'));
      return;
    }
    Y.doldur(gecmis, h('table', { sinif: 'tablo' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Tarih'), h('th', {}, 'Tür'), h('th', {}, 'Açıklama'), h('th', { sinif: 'sayi' }, 'Tutar'))),
      h('tbody', {}, veri.hareketler.map((x) => h('tr', {},
        h('td', {}, Y.zamanTR(x.olusturma)),
        h('td', {}, TUR[x.tur] || x.tur),
        h('td', {}, x.aciklama || ''),
        h('td', { sinif: 'sayi ' + (x.tutar > 0 ? 'arti' : 'eksi') }, (x.tutar > 0 ? '+' : '−') + Y.para(Math.abs(x.tutar))))))));
  }

  // novalidate: 10–1000 TL kuralının mesajı tarayıcıdan değil, stored procedure'den gelir
  const form = h('form', { novalidate: true, onsubmit: async (olay) => {
    olay.preventDefault();
    Y.bildir(bildirim, '');
    yukleDugme.disabled = true;
    try {
      const sonuc = await Y.api('/bakiye/yukle', { yontem: 'POST', govde: { tutar: tutarKutu.value } });
      Y.bildir(bildirim, `Bakiye yüklendi. Yeni bakiyeniz: ${Y.para(sonuc.bakiye)}.`, 'basari');
      tutarKutu.value = '';
      await yukle();
    } catch (hata) {
      Y.bildir(bildirim, hata.message, 'hata');
    } finally {
      yukleDugme.disabled = false;
    }
  } },
    h('div', { sinif: 'alan' },
      h('label', { for: 'tutar' }, 'Yüklenecek tutar (TL)'), tutarKutu,
      h('p', { sinif: 'yardim' }, 'Tek seferde 10 ile 1000 TL arası yükleyebilirsiniz.')),
    yukleDugme);

  Y.baslat('bakiye').then(() => {
    Y.doldur(icerik,
      h('section', { sinif: 'kart' }, h('h2', {}, 'Güncel bakiye'), bakiyeKutu),
      h('section', { sinif: 'kart' }, h('h2', {}, 'Bakiye yükle'), form),
      h('section', { sinif: 'kart' }, h('h2', {}, 'Hareket geçmişi'), gecmis));
    return yukle();
  }).catch((hata) => Y.bildir(bildirim, hata.message, 'hata'));
})();
