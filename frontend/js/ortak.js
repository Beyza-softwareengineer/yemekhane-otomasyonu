/* Ortak yardımcılar: API istemcisi, güvenli DOM üretimi, biçimlendirme, üst menü.
   Arayüzde iş kuralı yoktur: hesaplama ve kontroller API'dedir, burada yalnızca gösterilir. */
(function () {
  const Y = (window.Y = {});

  // ---------- API ----------
  // Hata durumunda Error fırlatır; mesaj, API'nin (ve stored procedure'ün) Türkçe mesajıdır.
  Y.api = async function (yol, secenek) {
    const s = Object.assign({ yontem: 'GET', govde: undefined, yonlendir: true }, secenek);
    const yanit = await fetch('/api' + yol, {
      method: s.yontem,
      headers: s.govde !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: s.govde !== undefined ? JSON.stringify(s.govde) : undefined,
      credentials: 'same-origin',
    });
    let veri = null;
    try { veri = await yanit.json(); } catch (e) { /* JSON olmayan yanıt */ }

    if (yanit.status === 401 && s.yonlendir) {
      window.location.href = '/index.html';
      throw new Error('Oturum açmanız gerekiyor.');
    }
    if (!yanit.ok) {
      const hata = new Error((veri && veri.mesaj) || 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
      hata.durum = yanit.status;
      throw hata;
    }
    return veri;
  };

  // ---------- Güvenli DOM üretimi (innerHTML kullanılmaz) ----------
  // Y.h('div', { sinif: 'kart', onclick: fn }, 'metin', Y.h('span', {}, '...'))
  Y.h = function (etiket, ozellik, ...cocuklar) {
    const e = document.createElement(etiket);
    for (const [k, v] of Object.entries(ozellik || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'sinif') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'for') e.htmlFor = v;
      else if (k in e && k !== 'list') e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c of cocuklar.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  };

  Y.temizle = function (kutu) { while (kutu.firstChild) kutu.removeChild(kutu.firstChild); };
  Y.doldur = function (kutu, ...cocuklar) { Y.temizle(kutu); kutu.append(...cocuklar.flat().filter(Boolean)); };

  // Bildirim kutusu: tur = 'hata' | 'basari'. mesaj boşsa kutuyu temizler.
  Y.bildir = function (kutu, mesaj, tur) {
    Y.temizle(kutu);
    kutu.className = 'bildirim';
    if (!mesaj) return;
    kutu.classList.add(tur === 'basari' ? 'bildirim-basari' : 'bildirim-hata');
    kutu.setAttribute('role', tur === 'basari' ? 'status' : 'alert');
    kutu.textContent = mesaj;
    kutu.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // ---------- Biçimlendirme ----------
  Y.para = function (n) {
    return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  };
  Y.tarihTR = function (t) { return t ? t.slice(8, 10) + '.' + t.slice(5, 7) + '.' + t.slice(0, 4) : ''; };
  Y.saat = function (zaman) { return zaman ? zaman.slice(11, 16) : ''; };
  Y.zamanTR = function (z) { return z ? Y.tarihTR(z.slice(0, 10)) + ' ' + Y.saat(z) : ''; };
  Y.gunAdi = function (t) {
    return new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10)))
      .toLocaleDateString('tr-TR', { weekday: 'long' });
  };
  Y.bugun = function () { return new Date().toLocaleDateString('sv-SE'); }; // GGGG-AA-GG
  Y.gunEkle = function (t, gun) {
    const d = new Date(Number(t.slice(0, 4)), Number(t.slice(5, 7)) - 1, Number(t.slice(8, 10)) + gun);
    return d.toLocaleDateString('sv-SE');
  };
  Y.yildiz = function (puan) { return '★'.repeat(puan) + '☆'.repeat(5 - puan); };

  Y.durumEtiketi = function (durum) {
    const harita = {
      aktif: ['Aktif', 'etiket-sari'],
      kullanildi: ['Kullanıldı', 'etiket-yesil'],
      iptal: ['İptal', 'etiket-gri'],
    };
    const [metin, sinif] = harita[durum] || [durum, ''];
    return Y.h('span', { sinif: 'etiket ' + sinif }, metin);
  };

  // ---------- Üst menü ----------
  const SAYFALAR = [
    ['menu', '/menu.html', 'Günün Menüsü'],
    ['haftalik', '/haftalik.html', 'Haftalık Menü'],
    ['rezervasyonlarim', '/rezervasyonlarim.html', 'Rezervasyonlarım'],
    ['bakiye', '/bakiye.html', 'Bakiye'],
    ['degerlendirme', '/degerlendirme.html', 'Değerlendirme'],
    ['yonetici', '/yonetici.html', 'Yönetici'],
  ];

  Y.bakiyeGoster = function (bakiye) {
    const kutu = document.getElementById('ust-bakiye');
    if (kutu) kutu.textContent = Y.para(bakiye);
  };

  // Her korumalı sayfa başlarken çağırır; kullanıcıyı döndürür, oturum yoksa girişe yönlendirir.
  Y.baslat = async function (aktif) {
    const ben = await Y.api('/ben');
    const ust = document.getElementById('ust');
    ust.className = 'ust';

    const nav = Y.h('nav', { sinif: 'kapsayici ust-nav', 'aria-label': 'Ana menü' },
      SAYFALAR
        .filter(([ad]) => ad !== 'yonetici' || ben.rol === 'yonetici')
        .map(([ad, yol, etiket]) => Y.h('a', { href: yol, 'aria-current': ad === aktif ? 'page' : null }, etiket)));

    const cikis = Y.h('button', {
      type: 'button', sinif: 'dugme dugme-ikincil',
      onclick: async () => {
        try { await Y.api('/cikis', { yontem: 'POST', govde: {} }); } catch (e) { /* oturum zaten bitmiş olabilir */ }
        window.location.href = '/index.html';
      },
    }, 'Çıkış');

    Y.doldur(ust,
      Y.h('div', { sinif: 'kapsayici ust-ic' },
        Y.h('a', { sinif: 'marka', href: '/menu.html' }, 'Yemekhane'),
        Y.h('div', { sinif: 'kisi' },
          Y.h('span', {}, ben.ad + ' ' + ben.soyad),
          Y.h('span', { sinif: 'bakiye-etiket', id: 'ust-bakiye', title: 'Bakiye' }, Y.para(ben.bakiye)),
          cikis)),
      nav);
    return ben;
  };

  // Yemekhane ve öğün seçim kutularını doldurur (günün menüsü ve haftalık menü kullanır)
  Y.secenekler = function (liste, secili) {
    return liste.map((x) => Y.h('option', { value: x.id, selected: String(x.id) === String(secili) }, x.ad));
  };
})();
