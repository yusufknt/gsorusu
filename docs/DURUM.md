# Nerede kaldık? — Günün Sorusu ?

> Son güncelleme: **1 Kasım 2026**. Yeni oturumda "nerede kaldık?" sorusunun cevabı bu dosyadır.
> Ayrıntılı teknik kararlar: [`kararlar.md`](kararlar.md) (#1–36). Ürün planı: `../Gunun-Sorusu-Plan-v2.pdf`.

## Çalışma ilkeleri (birlikte karar verdiklerimiz)

- **Önce kalite**, PDF'teki tarihler ve içerik/video planı (Kanal A/B) şimdilik yok sayılıyor.
- **Expo Go ile geliştiriyoruz.** Yalnızca Expo Go'da bulunan kütüphaneler; development build sonraya.
- **Sunucu bağlama, yayın, Cloudflare, CI ve Takdir entegrasyonu en sona** bırakıldı.
- Mobil uygulama şimdilik **kendi içindeki test verisiyle** çalışıyor.
- Her şey **D: diskine** kuruluyor (C: dolu).

## Tamamlanan aşamalar

| Aşama | Durum | Nerede |
|---|---|---|
| 1. Oyun kuralları (puanlama, seri, ipucu, gün sınırı) | ✅ 81 test | `services/gunun-api/src/GununSorusu.Domain` |
| 2. API + Postgres + Docker | ✅ 37 entegrasyon testi (gerçek Postgres) | `services/gunun-api` |
| 3. Expo mobil uygulama, 5 formatın hepsi oynanıyor | ✅ emülatörde denendi | `apps/mobile` |
| 4. Arayüz yenileme + uygulama içi test sunucusu | ✅ emülatörde açık/koyu temada denendi, 19 test | `apps/mobile/src` |

### Uygulamada şu an olanlar
- **Formatlar:** Fiyatı Ne?, Sayı Tahmini, Türkiye ne diyor?, Bilgi (30 sn), Hangisi daha…? (5 tur).
- **Ekranlar:** Bugün · İstatistik (seri, 4 haftalık takvim, format dağılımı) · Arşiv (son 7 gün) · Profil · Nasıl oynanır?
- **Oyun içi:** özel sayı tuş takımı, ipucu, halka şeklinde geri sayım, VS kartları, puan halkası, konfeti, titreşim.
- **Paylaşım:** renkli kare metni, kopyalama, 1080×1920 hikâye görseli (cevabı göstermez).
- **Diğer:** yerel günlük hatırlatma (+ seri tehlikedeyse 21:00), Sistem/Açık/Koyu tema, seri kurtarma.
- **Test araçları (Profil):** "Bir gün ileri" ve "Sıfırla"; yalnızca test modunda görünür.

### Sunucuda şu an olanlar (hazır ama mobil henüz bağlı değil)
- Cihaz kimliğiyle üyeliksiz giriş (JWT), bütün oyun uç noktaları, arşiv, istatistik, "Türkiye ne dedi?" dağılımı.
- Dakikalık işler: soruyu yayına alma, anketi kapatma, dağılımı hesaplama.
- Geçici soru girişi: `/admin` (X-Admin-Key). Çift onay kuralı uygulanıyor. Hatalı soru iptali: herkese 100 puan, seri bozulmaz.

## Nasıl çalıştırılır

```powershell
# Mobil (sunucu gerekmez):
cd D:\GününSoru\apps\mobile
npx expo start              # Android emülatörü açıkken "a" tuşu

# Sunucu (ileride bağlanınca):
cd D:\GününSoru\services\gunun-api
docker compose up -d        # API http://localhost:5080 · Postgres localhost:5433
dotnet test                 # Docker açık olmalı
```

- Emülatör olarak **Medium_Phone_API_36.1** kullanılıyor (Expo Go kurulu). Pixel_8_Pro'nun depolaması dolu; içindeki verilere dokunulmadı.
- Expo Go'da Fast Refresh kapalı geliyor; kod değişince uygulamayı yeniden yükleyin.
- Bu makinede 8080 portunu bir Oracle dinleyicisi kullanıyor; bu yüzden API **5080** portunda.

## Sıradaki adımlar (önerilen sıra)

1. **Arkadaş ligi**: grup kodu ve haftalık sıralama. Plan bunu MVP'de istiyor; şimdilik test verisiyle yapılabilir.
2. **Uygulama simgesi ve açılış ekranı**: şu an Expo'nun varsayılanları duruyor. Logo varsa o kullanılacak.
3. **Gerçek soru içeriği**: test sorularının yerine doğrulanmış sorular. Soru paneli v1.1'de; şimdilik `/admin`.
4. **En son: sunucuya bağlama ve yayın**: mobilin gerçek API'ye geçmesi, üretim ayarları, Cloudflare, GitHub Actions, Sentry, Takdir entegrasyonu.
5. **v1.1 (plana göre):** reklamlar (AdMob, UMP, ATT), soru paneli, Apple/Google ile giriş, webde oynama. Bunlar development build gerektirir.

## Senin karar vermen gerekenler

- [ ] **Uygulama kimliği** `app.gununsorusu` uygun mu? Mağazaya ilk yüklemeden sonra değiştirilemez.
- [ ] **"Bilindi" ölçütü:** sayısalda ±%5, bilgide süresinde doğru, Hangisi daha…?'da ≥3/5, ankette ≥80 puan. Uygun mu?
- [ ] **Logo ve marka renkleri** var mı? Şu an turuncu degrade ve Nunito yazı tipi kullanılıyor.
- [ ] **Mağaza adı rezervasyonu** (App Store Connect / Play Console): plandaki ilk iş, senin hesabınla yapılmalı.

## Bilinen eksikler / notlar

- Test sorularındaki fiyat ve sayılar **yaklaşık değerler**, yalnızca deneme için. Uygulamada "Test verisi" etiketiyle görünüyor.
- Hatırlatma bildiriminin gerçekten geldiği emülatörde denenmedi; ayar ve zamanlama kodu hazır.
- iOS'ta hiç çalıştırılmadı (bu makinede mümkün değil).
- `appsettings.Development.json` içindeki anahtarlar yalnızca geliştirme içindir; üretimde ortam değişkeni kullanılacak.
