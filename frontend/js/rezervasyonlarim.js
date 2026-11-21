(function () {
  const h = Y.h;
  const bildirim = document.getElementById('bildirim');
  const icerik = document.getElementById('icerik');

  async function yukle() {
    const liste = await Y.api('/rezervasyonlar');
    if (liste.length === 0) {
      Y.doldur(icerik, h('p', { sinif: 'bos' }, 'Henüz rezervasyonunuz yok. Haftalık menüden rezervasyon yapabilirsiniz.'));
      return;
    }
    Y.doldur(icerik, liste.map((r) => h('section', { sinif: 'kart rez' },
      h('div', { sinif: 'rez-ust' },
        h('h2', { style: 'margin:0' }, r.ogun + ' · ' + r.yemekhane),
        h('span', { style: 'display:flex;gap:.35rem;flex-wrap:wrap' },
          r.porsiyon === 'yarim' ? h('span', { sinif: 'etiket etiket-sari' }, 'Yarım porsiyon') : null,
          Y.durumEtiketi(r.durum))),
      h('div', { sinif: 'soluk' }, Y.gunAdi(r.tarih) + ', ' + Y.tarihTR(r.tarih)),
      h('div', {}, Y.porsiyonAdi(r.porsiyon) + ' · Ücret: ', h('strong', {}, Y.para(r.ucret))),
      r.durum === 'kullanildi' ? h('div', { sinif: 'soluk' }, 'Kullanım: ' + Y.zamanTR(r.kullanma_zamani)) : null,
      r.durum === 'iptal' ? h('div', { sinif: 'soluk' }, 'İptal: ' + Y.zamanTR(r.iptal_zamani)) : null,
      r.durum === 'aktif' && r.iptal_edilebilir ? h('div', { sinif: 'dugme-satir' },
        h('button', { type: 'button', sinif: 'dugme dugme-tehlike', onclick: (o) => iptal(r, o.currentTarget) }, 'Rezervasyonu iptal et'),
        h('span', { sinif: 'soluk' }, 'Son iptal: ' + Y.zamanTR(r.rezervasyon_son))) : null,
      r.durum === 'aktif' && !r.iptal_edilebilir ? h('div', { sinif: 'soluk' }, 'İptal süresi doldu.') : null)));
  }

  async function iptal(r, dugme) {
    if (!window.confirm('Bu rezervasyonu iptal etmek istiyor musunuz?')) return;
    Y.bildir(bildirim, '');
    dugme.disabled = true;
    try {
      const sonuc = await Y.api(`/rezervasyonlar/${r.id}/iptal`, { yontem: 'POST', govde: {} });
      Y.bakiyeGoster(sonuc.bakiye); // yordamın sonucu: kaynaktan
      Y.bildir(bildirim, `Rezervasyon iptal edildi. ${Y.para(sonuc.iade)} iade edildi. Yeni bakiyeniz: ${Y.para(sonuc.bakiye)}.`, 'basari');
      await yukle();
    } catch (hata) {
      Y.bildir(bildirim, hata.message, 'hata');
      dugme.disabled = false;
    }
  }

  Y.baslat('rezervasyonlarim').then(yukle).catch((hata) => Y.bildir(bildirim, hata.message, 'hata'));
})();
