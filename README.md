# Yemekhane Otomasyonu

Web Teknolojileri dönem ödevi. Kampüs yemekhanesi için menü, rezervasyon ve bakiye işlemlerini yöneten bir web uygulaması. Sistemin tamamı Docker container'ları üzerinde çalışır.

**Seçilen yol:** Web API + arayüz. API, Node.js ve Express ile yazılmış, yalnızca JSON döner. Arayüz düz HTML5 + CSS3 + JavaScript (`fetch`), React gibi bir çerçeve kullanılmamıştır.

## Çalıştırma

Gerekenler: Docker Desktop (ya da Docker Engine + Compose v2) ve Git.

```
git clone https://github.com/Beyza-softwareengineer/yemekhane-otomasyonu.git
cd yemekhane-otomasyonu
docker compose up -d
docker compose ps -a
```

İlk açılış 1-2 dakika sürer (MySQL kurulumu, örnek veri, replika kopyası, uygulama imajı). Beklenen durum:

| Servis | Beklenen |
| --- | --- |
| mysql-primary | `Up (healthy)` |
| mysql-replica | `Up (healthy)` |
| redis | `Up (healthy)` |
| uygulama | `Up (healthy)` |
| frontend | `Up (healthy)` |
| replica-setup | `Exited (0)`, replikayı bir kez kurup çıkar |

Tarayıcıda: <http://localhost:8080>

Ek bir adım gerekmez. Aşama 4'ün migration dosyası (`db/init/04_degisiklik.sql`) temiz kurulumda şema ve örnek veriden sonra kendiliğinden çalışır.

## Test hesapları

Tüm kullanıcıların şifresi `Yemek2026!`.

| E-posta | Rol | Not |
| --- | --- | --- |
| ayse.demir@ogr.kampus.edu.tr | öğrenci | başlangıç bakiyesi 12,50 TL, "Bakiye yetersiz." denemesi için |
| mehmet.yildiz@ogr.kampus.edu.tr | öğrenci | normal bakiye |
| murat.kaya@kampus.edu.tr | personel | personel fiyatı |
| leyla.arslan@kampus.edu.tr | yönetici | yönetici paneli |

## Mimari

```
Tarayıcı -> frontend (Apache, :8080) -> uygulama (Express, :8000) -> mysql-primary  (yazma)
                                                                   -> mysql-replica  (okuma)
                                                                   -> redis          (önbellek, oturum)
```

Tarayıcı veritabanına doğrudan bağlanamaz, veriye yalnızca uygulamanın veri katmanı ulaşır. Apache `/api/` isteklerini uygulamaya iletir, geri kalanı `frontend/` klasöründen sunar.

### Uygulama katmanları

```
uygulama/src/
  routes/         URL -> middleware -> controller eşlemesi
  controllers/    istek doğrulama, repository çağırma, yanıt (SQL yok)
  repositories/   veri katmanı: tüm SQL ve CALL ifadeleri yalnızca burada
  middleware/     oturum kontrolü, rol kontrolü, hata yakalama
  db.js           iki bağlantı havuzu: yazma (kaynak) ve okuma (replika)
  redis.js        Redis bağlantısı
  oturum.js       Redis'te oturum deposu
```

- **Stored procedure:** Para hareketi yapan işlemler (`sp_rezervasyon_yap`, `sp_rezervasyon_iptal`, `sp_bakiye_yukle`) SQL ile yeniden yazılmaz, repository içinde `CALL` ile çağrılır. Procedure'ün Türkçe hata mesajları (SQLSTATE 45000) değiştirilmeden arayüze iletilir.
- **Okuma/yazma ayrımı:** Yazma işlemleri kaynağa, listeleme ve raporlar replikaya gider. Replikasyon eşzamansız olduğu için rezervasyondan sonra gösterilen bakiye procedure'ün döndürdüğü değerden (kaynaktan) alınır. Kullanıcı son 3 saniye içinde yazma yaptıysa listeler de kaynaktan okunur (`middleware/oturum.js`, `okumaHavuzu`).
- **Arayüz:** İş kuralı içermez. Kurallar procedure'de ve API'dedir, arayüz sunucunun döndürdüğü alanlara göre gösterir.

### Redis

| Görev | Anahtar | Süre | Ne zaman silinir |
| --- | --- | --- | --- |
| Menü önbelleği | `menu:{yemekhane_id}:{tarih}:{ogun_id}` | o günün sonuna kadar | yönetici o menüyü değiştirdiğinde |
| Oturum | `oturum:{token}` | 30 dakika, her istekte yenilenir | çıkış yapıldığında |

- Menü değişince kaydı silmek yetmez: replikasyon gecikmesi yüzünden hemen ardından replikadan okunan eski içerik tekrar önbelleğe yazılabilir. Bu yüzden değişiklikten sonraki 5 saniye boyunca önbellek kaynaktan doldurulur (kısa ömürlü `menudegisti:...` işareti).
- Önbellek kayıtlarında yapı sürümü tutulur. Uygulama açılırken eski yapıdaki kayıtları siler.
- Oturum Redis'te durduğu için uygulama container'ı yeniden başlasa da kullanıcının oturumu düşmez.

## Ekranlar

Giriş ve çıkış, Günün menüsü, Haftalık menü ve rezervasyon, Rezervasyonlarım, Bakiye, Değerlendirme, Yönetici paneli ve Profil (alerjen seçimi, Aşama 4). Arayüz telefon genişliğinde (yaklaşık 400 px) kullanılabilir.

## Aşama 4: değişiklik talebi

- **Yarım porsiyon:** Öğle ve akşam menülerinde seçilebilir, ücret tam fiyatın %60'ıdır. Kahvaltıda yoktur. Geçmiş rezervasyonlar tam porsiyon sayılır. Kural veride durur: `ogunler.yarim_porsiyon_orani` (kahvaltı `NULL`, öğle ve akşam `0.60`).
- **Alerjen uyarısı:** Kullanıcı profilinde alerjenlerini seçer (`kullanici_alerjenleri` tablosu). Menüde bu alerjenleri içeren yemekler uyarıyla gösterilir.
- **Migration:** `db/init/04_degisiklik.sql`. Çalışan bir sistemde kaynağa bir kez uygulanır, değişiklik replikasyonla replikaya geçer:

```
docker compose exec mysql-primary sh -c "mysql -uroot -pyemekhane_kok yemekhane < /docker-entrypoint-initdb.d/04_degisiklik.sql"
```

## Klasörler

```
docker-compose.yml   servisler
db/init/             01_sema.sql, 02_ornek_veri.sql, 04_degisiklik.sql
db/replica-setup.sh  replikayı bir kez kurar ve salt okunur yapar
apache/              Apache imajı ve yönlendirme ayarı
frontend/            HTML, CSS ve JavaScript arayüzü
uygulama/            Express API (Dockerfile ile)
rapor/               rapor PDF'i ve komut çıktı kayıtları
```

`db/init` içindeki dosyalar yalnızca veritabanı ilk kez oluşturulurken çalışır. Sıfırlamak için:

```
docker compose down -v      # container'lar ve TÜM veri silinir
docker compose up -d
```

## Aşamalar ve etiketler

| Etiket | İçerik |
| --- | --- |
| `asama-1` | Altyapı: compose, replikasyon doğrulaması |
| `asama-2` | Express Web API ve yedi ekranlı arayüz |
| `asama-3` | Redis menü önbelleği ve oturum |
| `asama-4` | Yarım porsiyon, alerjen uyarısı ve rapor (PDF) |

## Bağlantı bilgileri (ders ortamı)

| | Uygulamadan (container içi) | Bilgisayardan |
| --- | --- | --- |
| Yazma (kaynak) | `mysql-primary:3306` | `localhost:3307` |
| Okuma (replika) | `mysql-replica:3306` | `localhost:3308` |
| Redis | `redis:6379` | `localhost:6379` |
| Web | | `localhost:8080` |

Veritabanı: `yemekhane`, uygulama kullanıcısı `yemekhane_app`. Bu şifreler ders ortamı içindir, gerçek bir sistemde koda yazılmaz.