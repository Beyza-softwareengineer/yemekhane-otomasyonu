(function () {
  const h = Y.h;
  const bildirim = document.getElementById('bildirim');
  const icerik = document.getElementById('icerik');

  async function baslat() {
    await Y.baslat('menu');
    const s = await Y.api('/secimler');

    const yemekhane = h('select', { id: 'yemekhane' }, Y.secenekler(s.yemekhaneler, s.yemekhaneler[0].id));
    const tarih = h('input', { id: 'tarih', type: 'date', value: Y.bugun() });
    const ogun = h('select', { id: 'ogun' }, Y.secenekler(s.ogunler, 2));
    const sonuc = h('div', { id: 'sonuc' });

    async function yukle() {
      Y.bildir(bildirim, '');
      if (!tarih.value) { Y.doldur(sonuc, h('p', { sinif: 'bos' }, 'Bir tarih seçin.')); return; }
      try {
        const veri = await Y.api(`/menu?yemekhane=${yemekhane.value}&tarih=${tarih.value}&ogun=${ogun.value}`);
        goster(veri);
      } catch (hata) {
        Y.bildir(bildirim, hata.message, 'hata');
      }
    }

    function goster(veri) {
      if (!veri.menu) {
        Y.doldur(sonuc, h('p', { sinif: 'bos' }, 'Bu yemekhane, tarih ve öğün için menü yok.'));
        return;
      }
      const m = veri.menu;
      const d = veri.doluluk;
      const rez = veri.rezervasyonum;

      const satirlar = [];
      let sonKategori = null;
      for (const y of m.yemekler) {
        if (y.kategori !== sonKategori) {
          satirlar.push(h('li', { sinif: 'kategori', role: 'presentation' }, y.kategori));
          sonKategori = y.kategori;
        }
        // Sunucu, kullanıcının profilindeki alerjenlerle eşleşen yemeklere uyari_alerjenleri ekler
        const uyari = y.uyari_alerjenleri.length > 0;
        satirlar.push(h('li', { sinif: uyari ? 'yemek yemek-uyari' : 'yemek' },
          h('div', {},
            h('div', { sinif: 'yemek-ad' }, y.ad),
            h('div', { sinif: 'yemek-ek' },
              uyari ? h('span', { sinif: 'etiket etiket-kirmizi', role: 'alert' }, '⚠ Alerjen uyarısı: ' + y.uyari_alerjenleri.join(', ')) : null,
              y.vejetaryen ? h('span', { sinif: 'etiket etiket-yesil' }, 'Vejetaryen') : null,
              y.alerjenler.length ? h('span', { sinif: 'etiket etiket-sari' }, 'İçerir: ' + y.alerjenler.map((a) => a.ad).join(', ')) : null)),
          h('span', { sinif: 'kalori' }, y.kalori + ' kcal')));
      }

      Y.doldur(sonuc, h('section', { sinif: 'kart' },
        h('div', { sinif: 'kart-baslik' },
          h('h2', {}, m.yemekhane + ' · ' + m.ogun),
          h('span', { sinif: 'soluk' }, Y.gunAdi(m.tarih) + ', ' + Y.tarihTR(m.tarih))),
        h('div', { sinif: 'ozet' },
          h('span', { sinif: 'etiket' }, 'Toplam ' + m.toplam_kalori + ' kcal'),
          m.tamami_vejetaryen ? h('span', { sinif: 'etiket etiket-yesil' }, 'Tamamı vejetaryen') : null,
          m.uyari_var ? h('span', { sinif: 'etiket etiket-kirmizi' }, '⚠ Alerjenlerinizi içeren yemek var') : null,
          h('span', { sinif: 'etiket' }, 'Son rezervasyon: ' + Y.zamanTR(m.rezervasyon_son)),
          rez && rez.durum !== 'iptal' ? h('span', { sinif: 'etiket etiket-sari' }, 'Rezervasyonunuz var') : null),
        h('ul', { sinif: 'yemek-liste' }, satirlar),
        h('p', { sinif: 'soluk', style: 'margin-top:1rem' },
          'Fiyatınız: ', h('span', { sinif: 'fiyat-vurgu' }, Y.para(m.fiyat)),
          m.yarim_fiyat !== null ? ' · Yarım porsiyon: ' + Y.para(m.yarim_fiyat) : '',
          ' · Boş yer: ', h('strong', {}, d.bos_yer), ' / ' + d.kapasite,
          d.kapandi ? ' · Rezervasyon süresi doldu' : ''),
        h('a', { href: '/haftalik.html', sinif: 'dugme dugme-ikincil' }, 'Rezervasyon için haftalık menüye git')));
    }

    [yemekhane, tarih, ogun].forEach((k) => k.addEventListener('change', yukle));
    Y.doldur(icerik,
      h('div', { sinif: 'filtre' },
        h('div', {}, h('label', { for: 'yemekhane' }, 'Yemekhane'), yemekhane),
        h('div', {}, h('label', { for: 'tarih' }, 'Tarih'), tarih),
        h('div', {}, h('label', { for: 'ogun' }, 'Öğün'), ogun)),
      sonuc);
    yukle();
  }

  baslat().catch((hata) => Y.bildir(bildirim, hata.message, 'hata'));
})();
