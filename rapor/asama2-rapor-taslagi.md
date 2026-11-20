# Aşama 2 · Rapor taslağı

> Bu dosya rapora kopyalanacak metni içerir. Adınızı, ekran görüntülerini ve gerekirse kendi cümlelerinizi ekleyin.
> Canlı gösterimde her cümleyi kendi kodunuzdan açıklayabilmelisiniz.

## 1. Seçilen yol (raporun ilk sayfasında yer almalı)

**Web API + arayüz.** Uygulama Node.js + Express ile yazılmış, yalnızca JSON dönen bir API'dir
(`/api/...`). HTML5 + CSS3 arayüz `frontend` container'ında (Apache) durur ve veriyi JavaScript
`fetch` ile alır; React gibi bir çerçeve kullanılmamıştır. Apache `-D WEBAPI` modunda `/api/`
isteklerini `uygulama` servisine iletir.

## 2. Katmanlar

```
uygulama/src/
  routes/          URL -> middleware -> controller eşlemesi
  controllers/     istek doğrulama, repository çağırma, yanıt (SQL YOK)
  repositories/    veri katmanı: tüm SQL ve CALL ifadeleri yalnızca burada
  middleware/      oturum kontrolü, rol kontrolü, hata yakalama
  db.js            iki bağlantı havuzu: yazma (mysql-primary) ve okuma (mysql-replica)
```

Arayüz kodunda (`frontend/js/`) iş kuralı yoktur: düğmenin pasif olması gibi durumlar API'nin
döndürdüğü bayraklara (`kapandi`, `bos_yer`, `rezervasyon_durum`) göre gösterilir. Para hareketi
yapan işlemler SQL ile yeniden yazılmaz, stored procedure çağrılır.

## 3. Bir isteğin yolu: rezervasyon yapma

Tarayıcı `POST /api/rezervasyonlar` gönderir (gövde: `{"menu_id": 50}`).

**route** (`routes/index.js`):
```js
r.post('/rezervasyonlar', oturumGerekli, a(rezervasyon.yap));
```

**Controller** (`controllers/rezervasyonController.js`): girdiyi doğrular, veri katmanını çağırır.
```js
async function yap(req, res) {
  const menuId = dogrula.tamsayi(req.body && req.body.menu_id, 'Menü');
  const sonuc = await rezervasyonRepo.yap(req.kullanici.id, menuId);
  await yazmaIsaretle(req);
  res.status(201).json(sonuc);
}
```

**Veri katmanı** (`repositories/rezervasyonRepo.js`): kaynak sunucuda stored procedure'ü çağırır.
```js
async function yap(kullaniciId, menuId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_yap(?, ?)', [kullaniciId, menuId]);
  return sonuc[0][0]; // { rezervasyon_id, ucret, bakiye }
}
```

**Yanıt:** `201 {"rezervasyon_id":368,"ucret":40,"bakiye":72.5}`.
Hata olursa (örn. bakiye yetersiz) yordam `SQLSTATE 45000` (MySQL hata kodu 1644) ile Türkçe mesaj
döndürür; `middleware/hataYakala.js` bu mesajı **değiştirmeden** `422 {"hata":true,"mesaj":"Bakiye yetersiz."}`
olarak iletir, arayüz de mesajı bildirim kutusunda gösterir.

## 4. Okuma/yazma ayrımı ve hata mesajları

| İşlem | Nereye gider |
|---|---|
| Rezervasyon, iptal, bakiye yükleme, menü oluşturma/düzenleme, değerlendirme ekleme | `mysql-primary` (kaynak) |
| Günün menüsü, haftalık menü, rezervasyon listesi, hareket geçmişi, yönetici raporu | `mysql-replica` (replika) |
| Güncel bakiye (`/api/ben`, `/api/bakiye`) | `mysql-primary` (para olduğu için) |

Ayrım `db.js` içindeki iki havuzla yapılır; hangi sorgunun hangi havuzu kullandığı repository
fonksiyonlarında açıkça görünür.

Hata mesajları: `Bakiye yetersiz.`, `Bu menü için rezervasyon süresi doldu.`,
`Bu menü için zaten rezervasyonunuz var.`, `Yemekhane kapasitesi dolu.`,
`Yükleme tutarı 10 ile 1000 TL arasında olmalıdır.` gibi yordam mesajları arayüze aynen taşınır.
CHECK kısıtı ihlali (3819) bir programlama hatası sayılır: kullanıcıya ham hali gösterilmez,
günlüğe yazılır ve genel bir mesaj döner.

## 5. Replikasyon gecikmesi (rezervasyondan sonra bakiye neden kaynaktan okunur?)

Replikasyon eşzamansızdır: kaynağa yazılan bir değişiklik replikaya çok kısa bir gecikmeyle
ulaşır. Kullanıcı rezervasyon yaptıktan hemen sonra bakiyeyi replikadan okursak, değişiklik
henüz replikaya geçmemiş olabilir ve ekranda eski (yüksek) bakiye görünür; bu hem kullanıcıyı
yanıltır hem de aynı parayı ikinci kez harcayabileceği izlenimini verir. Bu nedenle rezervasyondan
sonra gösterilen bakiye stored procedure'ün sonucundan, yani kaynak sunucudan gelir; güncel
bakiyeyi okuyan uç noktalar da kaynağa sorar. Aynı sebeple, kullanıcı kısa bir süre önce yazma
yaptıysa (3 saniye) listeleme sorguları da kaynaktan okunur (`okumaHavuzu`); böylece yeni yaptığı
rezervasyon listede hemen görünür. Bu süre dışında listeleme ve raporlar replikaya gider.

## 6. Eklenecek ekran görüntüleri (her biri 400 px genişlikte)

1. Giriş (hatalı şifre mesajı görünürken)
2. Günün menüsü (toplam kalori, vejetaryen ve alerjen etiketleri görünür)
3. Haftalık menü (en az bir pasif düğme: "Süre doldu")
4. Rezervasyonlarım (aktif, kullanıldı, iptal durumları)
5. Bakiye ("Yükleme tutarı 10 ile 1000 TL arasında olmalıdır." mesajı görünürken)
6. Değerlendirme
7. Yönetici paneli (rapor tablosu ve menü formu)
8. "Bakiye yetersiz." mesajı (örn. Ayşe Demir ile)
