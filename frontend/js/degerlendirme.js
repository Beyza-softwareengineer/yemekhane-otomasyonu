(function () {
  const h = Y.h;
  const bildirim = document.getElementById('bildirim');
  const icerik = document.getElementById('icerik');

  function formYap(m) {
    const puan = h('select', { id: 'puan-' + m.menu_id },
      h('option', { value: '' }, 'Puan seçin'),
      [5, 4, 3, 2, 1].map((p) => h('option', { value: p }, p + ' · ' + Y.yildiz(p))));
    const yorum = h('textarea', { id: 'yorum-' + m.menu_id, rows: 2, maxLength: 500, placeholder: 'Yorumunuz (isteğe bağlı)' });
    const dugme = h('button', { type: 'submit', sinif: 'dugme' }, 'Gönder');
    return h('form', { novalidate: true, sinif: 'kart', onsubmit: async (olay) => {
      olay.preventDefault();
      Y.bildir(bildirim, '');
      dugme.disabled = true;
      try {
        await Y.api('/degerlendirmeler', { yontem: 'POST', govde: { menu_id: m.menu_id, puan: Number(puan.value), yorum: yorum.value } });
        Y.bildir(bildirim, 'Değerlendirmeniz kaydedildi. Teşekkürler!', 'basari');
        await yukle();
      } catch (hata) {
        Y.bildir(bildirim, hata.message, 'hata');
        dugme.disabled = false;
      }
    } },
      h('div', { sinif: 'kart-baslik' },
        h('h2', {}, m.ogun + ' · ' + m.yemekhane), h('span', { sinif: 'soluk' }, Y.tarihTR(m.tarih))),
      h('div', { sinif: 'alan' }, h('label', { for: 'puan-' + m.menu_id }, 'Puan'), puan),
      h('div', { sinif: 'alan' }, h('label', { for: 'yorum-' + m.menu_id }, 'Yorum'), yorum),
      dugme);
  }

  async function yukle() {
    const veri = await Y.api('/degerlendirmeler');
    Y.doldur(icerik,
      h('h2', {}, 'Değerlendirmeyi bekleyen menüler'),
      veri.bekleyenler.length
        ? veri.bekleyenler.map(formYap)
        : h('p', { sinif: 'bos' }, 'Değerlendirilecek menü yok. Yemekhanede kullandığınız menüler burada görünür.'),
      h('h2', { style: 'margin-top:1.5rem' }, 'Değerlendirmelerim'),
      veri.verdiklerim.length
        ? veri.verdiklerim.map((d) => h('section', { sinif: 'kart' },
            h('div', { sinif: 'kart-baslik' },
              h('strong', {}, d.ogun + ' · ' + d.yemekhane), h('span', { sinif: 'soluk' }, Y.tarihTR(d.tarih))),
            h('div', { sinif: 'yildiz', 'aria-label': d.puan + ' puan' }, Y.yildiz(d.puan)),
            d.yorum ? h('p', { style: 'margin:.4rem 0 0' }, d.yorum) : null))
        : h('p', { sinif: 'bos' }, 'Henüz değerlendirme yapmadınız.'));
  }

  Y.baslat('degerlendirme').then(yukle).catch((hata) => Y.bildir(bildirim, hata.message, 'hata'));
})();
