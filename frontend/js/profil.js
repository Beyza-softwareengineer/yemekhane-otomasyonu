(function () {
  const h = Y.h;
  const bildirim = document.getElementById('bildirim');
  const icerik = document.getElementById('icerik');
  const ROL = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' };

  async function baslat() {
    await Y.baslat('profil');
    const veri = await Y.api('/profil');
    const k = veri.kullanici;

    const kutular = veri.alerjenler.map((a) => {
      const kutu = h('input', { type: 'checkbox', id: 'a-' + a.id, value: a.id, checked: a.secili });
      return h('label', { sinif: 'secenek', for: 'a-' + a.id }, kutu, a.ad);
    });
    const kaydet = h('button', { type: 'submit', sinif: 'dugme dugme-tam' }, 'Kaydet');

    const form = h('form', { novalidate: true, onsubmit: async (olay) => {
      olay.preventDefault();
      Y.bildir(bildirim, '');
      kaydet.disabled = true;
      const secili = kutular.map((l) => l.querySelector('input')).filter((c) => c.checked).map((c) => Number(c.value));
      try {
        await Y.api('/profil/alerjenler', { yontem: 'PUT', govde: { alerjen_idler: secili } });
        Y.bildir(bildirim, secili.length
          ? `Alerjenleriniz kaydedildi (${secili.length} seçili).`
          : 'Alerjen seçiminiz temizlendi.', 'basari');
      } catch (hata) {
        Y.bildir(bildirim, hata.message, 'hata');
      } finally {
        kaydet.disabled = false;
      }
    } },
      h('fieldset', {}, h('legend', {}, 'Alerjenlerim'), kutular),
      kaydet);

    Y.doldur(icerik,
      h('section', { sinif: 'kart' },
        h('h2', {}, k.ad + ' ' + k.soyad),
        h('p', { sinif: 'soluk' }, ROL[k.rol] || k.rol)),
      h('section', { sinif: 'kart' }, h('h2', {}, 'Alerjen tercihleri'), form));
  }

  baslat().catch((hata) => Y.bildir(bildirim, hata.message, 'hata'));
})();
