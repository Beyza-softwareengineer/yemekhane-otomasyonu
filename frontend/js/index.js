(function () {
  const bildirim = document.getElementById('bildirim');
  const form = document.getElementById('giris-formu');
  const dugme = document.getElementById('giris-dugme');

  // Zaten giriş yapılmışsa menüye geç
  Y.api('/ben', { yonlendir: false }).then(() => { window.location.href = '/menu.html'; }).catch(() => {});

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    Y.bildir(bildirim, '');
    dugme.disabled = true;
    try {
      await Y.api('/giris', {
        yontem: 'POST', yonlendir: false,
        govde: { eposta: document.getElementById('eposta').value, sifre: document.getElementById('sifre').value },
      });
      window.location.href = '/menu.html';
    } catch (hata) {
      Y.bildir(bildirim, hata.message, 'hata');
      dugme.disabled = false;
    }
  });
})();
