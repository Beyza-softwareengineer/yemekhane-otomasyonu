(function () {
  const h = Y.h;
  const bildirim = document.getElementById('bildirim');
  const icerik = document.getElementById('icerik');

  async function baslat() {
    await Y.baslat('haftalik');
    const s = await Y.api('/secimler');

    const yemekhane = h('select', { id: 'yemekhane' }, Y.secenekler(s.yemekhaneler, s.yemekhaneler[0].id));
    const baslangic = h('input', { id: 'baslangic', type: 'date', value: Y.bugun() });
    const liste = h('div', { id: 'liste' });

    async function yukle() {
      if (!baslangic.value) return;
      try {
        const veri = await Y.api(`/haftalik?yemekhane=${yemekhane.value}&baslangic=${baslangic.value}`);
        goster(veri.menuler);
      } catch (hata) {
        Y.bildir(bildirim, hata.message, 'hata');
      }
    }

    // Düğmenin durumu sunucudan gelen bayraklara göre belirlenir (kapandi, bos_yer, rezervasyon_durum)
    function dugmeYap(m) {
      const pasif = (metin) => h('button', { sinif: 'dugme', type: 'button', disabled: true }, metin);
      if (m.rezervasyon_durum === 'aktif' || m.rezervasyon_durum === 'kullanildi') {
        return h('div', { sinif: 'ogun-islem' },
          pasif(m.rezervasyon_durum === 'aktif' ? 'Rezerve edildi' : 'Kullanıldı'),
          h('span', { sinif: 'soluk' }, Y.porsiyonAdi(m.rezervasyon_porsiyon)));
      }
      if (m.kapandi) return pasif('Süre doldu');
      if (m.bos_yer <= 0) return pasif('Dolu');

      // Yarım porsiyon seçeneği yalnızca sunucu yarim_fiyat gönderdiyse (öğle, akşam) gösterilir.
      // Kahvaltıda yarim_fiyat yoktur, seçim kutusu da yoktur.
      const porsiyon = m.yarim_fiyat !== null
        ? h('select', { 'aria-label': 'Porsiyon seçimi', sinif: 'porsiyon-sec' },
            h('option', { value: 'tam' }, 'Tam porsiyon · ' + Y.para(m.fiyat)),
            h('option', { value: 'yarim' }, 'Yarım porsiyon · ' + Y.para(m.yarim_fiyat)))
        : null;
      return h('div', { sinif: 'ogun-islem' }, porsiyon,
        h('button', { sinif: 'dugme', type: 'button',
          onclick: (olay) => rezervasyonYap(m, porsiyon ? porsiyon.value : 'tam', olay.currentTarget) }, 'Rezervasyon yap'));
    }

    async function rezervasyonYap(m, porsiyon, dugme) {
      Y.bildir(bildirim, '');
      dugme.disabled = true;
      try {
        const sonuc = await Y.api('/rezervasyonlar', { yontem: 'POST', govde: { menu_id: m.menu_id, porsiyon } });
        // Bakiye, yordamın sonucudur (kaynak sunucudan), replikadan okunmaz
        Y.bakiyeGoster(sonuc.bakiye);
        Y.bildir(bildirim, `Rezervasyon yapıldı (${Y.porsiyonAdi(sonuc.porsiyon).toLowerCase()}). Ücret: ${Y.para(sonuc.ucret)}. Yeni bakiyeniz: ${Y.para(sonuc.bakiye)}.`, 'basari');
        await yukle();
      } catch (hata) {
        Y.bildir(bildirim, hata.message, 'hata'); // "Bakiye yetersiz." gibi yordam mesajı
        dugme.disabled = false;
      }
    }

    function goster(menuler) {
      if (menuler.length === 0) {
        Y.doldur(liste, h('p', { sinif: 'bos' }, 'Bu tarih aralığında menü yok.'));
        return;
      }
      const gunler = new Map();
      for (const m of menuler) {
        if (!gunler.has(m.tarih)) gunler.set(m.tarih, []);
        gunler.get(m.tarih).push(m);
      }
      Y.doldur(liste, [...gunler].map(([tarih, ogunler]) =>
        h('section', { sinif: 'kart' },
          h('div', { sinif: 'kart-baslik' },
            h('h2', {}, Y.gunAdi(tarih)), h('span', { sinif: 'soluk' }, Y.tarihTR(tarih))),
          ogunler.map((m) => h('div', { sinif: 'ogun-satir' },
            h('div', {},
              h('div', { sinif: 'ogun-ad' }, m.ogun, ' ',
                h('span', { sinif: 'soluk' }, '(son: ' + Y.saat(m.rezervasyon_son) + ')')),
              h('div', { sinif: 'ogun-yemekler' }, m.yemekler),
              m.uyari_alerjenleri.length
                ? h('div', { style: 'margin-top:.35rem' },
                    h('span', { sinif: 'etiket etiket-kirmizi', role: 'alert' }, '⚠ Alerjen uyarısı: ' + m.uyari_alerjenleri.join(', ')))
                : null,
              h('div', { sinif: 'ogun-meta', style: 'margin-top:.35rem' },
                h('span', { sinif: 'fiyat-vurgu' }, Y.para(m.fiyat)),
                h('span', { sinif: 'soluk' }, 'Boş yer: ' + m.bos_yer + ' / ' + m.kapasite))),
            dugmeYap(m))))));
    }

    const onceki = h('button', { type: 'button', sinif: 'dugme dugme-ikincil', onclick: () => { baslangic.value = Y.gunEkle(baslangic.value || Y.bugun(), -7); yukle(); } }, '← Önceki hafta');
    const sonraki = h('button', { type: 'button', sinif: 'dugme dugme-ikincil', onclick: () => { baslangic.value = Y.gunEkle(baslangic.value || Y.bugun(), 7); yukle(); } }, 'Sonraki hafta →');
    yemekhane.addEventListener('change', yukle);
    baslangic.addEventListener('change', yukle);

    Y.doldur(icerik,
      h('div', { sinif: 'filtre' },
        h('div', {}, h('label', { for: 'yemekhane' }, 'Yemekhane'), yemekhane),
        h('div', {}, h('label', { for: 'baslangic' }, 'Hafta başlangıcı'), baslangic)),
      h('div', { sinif: 'dugme-satir', style: 'margin-bottom:1rem' }, onceki, sonraki),
      liste);
    yukle();
  }

  baslat().catch((hata) => Y.bildir(bildirim, hata.message, 'hata'));
})();
