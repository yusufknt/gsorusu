# Nerede kaldık? — Günün Sorusu ?

> Son güncelleme: **2 Kasım 2026**. Yeni oturumda "nerede kaldık?" sorusunun cevabı bu dosyadır.
> Kod deposu: https://github.com/fxlonq/gununsorusu (`main`, 4 Kasım 2026'da ilk kez gönderildi).
> Ayrıntılı teknik kararlar: [`kararlar.md`](kararlar.md) (#1–50). Ürün planı: `../Gunun-Sorusu-Plan-v2.pdf`.

## Çalışma ilkeleri (birlikte karar verdiklerimiz)

- **Önce kalite**, PDF'teki tarihler ve içerik/video planı (Kanal A/B) şimdilik yok sayılıyor.
- **Expo Go ile geliştiriyoruz.** Yalnızca Expo Go'da bulunan kütüphaneler; development build sonraya.
- **Sunucu bağlama, yayın, Cloudflare, CI ve Takdir entegrasyonu en sona** bırakıldı.
- Mobil uygulama şimdilik **kendi içindeki test verisiyle** çalışıyor.
- Her şey **D: diskine** kuruluyor (C: dolu).

## Tamamlanan aşamalar

| Aşama | Durum | Nerede |
|---|---|---|
| 1. Oyun kuralları (puanlama, seri, ipucu, gün sınırı, lig) | ✅ 101 test | `services/gunun-api/src/GununSorusu.Domain` |
| 2. API + Postgres + Docker | ✅ 47 entegrasyon testi (gerçek Postgres) | `services/gunun-api` |
| 3. Expo mobil uygulama, 5 formatın hepsi oynanıyor | ✅ emülatörde denendi | `apps/mobile` |
| 4. Arayüz yenileme + uygulama içi test sunucusu | ✅ emülatörde açık/koyu temada denendi | `apps/mobile/src` |
| 5. Arkadaş ligi (kod, haftalık sıralama) | ✅ sunucu + mobil, emülatörde açık/koyu temada denendi | `Leagues/`, `app/(tabs)/leagues` |
| 6. İlk açılış ipuçları + "dün" şeridi | ✅ emülatörde denendi; mobilde toplam 29 test | `components/game/FormatTip.tsx`, `YesterdayStrip.tsx` |
| 7. Uygulama simgesi + açılış ekranı (geçici logo) | ✅ görseller üretildi, uygulama içi logo emülatörde denendi; expo-doctor 20/20 | `apps/mobile/scripts/render-brand.mjs`, `assets/` |

### Uygulamada şu an olanlar
- **Formatlar:** Fiyatı Ne?, Sayı Tahmini, Türkiye ne diyor?, Bilgi (30 sn), Hangisi daha…? (5 tur).
- **Ekranlar:** Bugün · İstatistik (seri, 4 haftalık takvim, format dağılımı) · Lig · Arşiv (son 7 gün) · Profil · Nasıl oynanır?
- **Lig:** lig kur / koda katıl, davet kodu (kopyala, paylaş), haftalık sıralama (günlük kareler, madalyalar, eşit puanda aynı sıra), geçmiş haftalar ve "haftanın birincisi", sahip üye çıkarabilir, ligden ayrılma. Sonuç ekranında "Ligde X. sıradasın" kartı.
- **İlk açılış:** her formatla ilk karşılaşmada kısa ipucu kartı (+ ilk kez açana "Hoş geldin"); tanıtım ekranı yok.
- **Dün şeridi:** Bugün ekranında dünkü puan ve Türkiye ortalaması ya da "kaçırdın, arşivden oyna"; dokununca arşivdeki o gün açılır.
- **Oyun içi:** özel sayı tuş takımı, ipucu, halka şeklinde geri sayım, VS kartları, puan halkası, konfeti, titreşim.
- **Paylaşım:** renkli kare metni, kopyalama, 1080×1920 hikâye görseli (cevabı göstermez).
- **Diğer:** yerel günlük hatırlatma (+ seri tehlikedeyse 21:00), Sistem/Açık/Koyu tema, seri kurtarma.
- **Test araçları (Profil):** "Bir gün ileri", "Sıfırla" ve "Liglerime test oyuncusu ekle"; yalnızca test modunda görünür. Test modunda geçerli herhangi bir kodla (ör. ABC234) katılınca test oyuncularından oluşan bir lig açılır.

### Sunucuda şu an olanlar (hazır ama mobil henüz bağlı değil)
- Cihaz kimliğiyle üyeliksiz giriş (JWT), bütün oyun uç noktaları, arşiv, istatistik, "Türkiye ne dedi?" dağılımı.
- Dakikalık işler: soruyu yayına alma, anketi kapatma, dağılımı hesaplama.
- Arkadaş ligi: `/leagues` uç noktaları, `leagues` ve `league_members` tabloları (migration `Leagues`).
- Geçici soru girişi: `/admin` (X-Admin-Key). Çift onay kuralı uygulanıyor. Hatalı soru iptali: herkese 100 puan, seri bozulmaz.

## Nasıl çalıştırılır

```powershell
# Mobil (sunucu gerekmez):
cd D:\GününSoru\apps\mobile
npx expo start              # GununSoru emülatörü açıkken; bağlanmak için aşağıdaki adb notuna bakın

# Sunucu (ileride bağlanınca):
cd D:\GününSoru\services\gunun-api
docker compose up -d        # API http://localhost:5080 · Postgres localhost:5433
dotnet test                 # Docker açık olmalı
```

- Emülatör olarak **GununSoru** AVD'si kullanılıyor (4 Kasım'da oluşturuldu; `D:\Dev\.android\avd\GununSoru.avd`, 16 GB veri alanı, Expo Go kurulu). Medium_Phone_API_36.1'de Expo Go kurulamıyor (yer yok; içinde başka projelerin uygulamaları var, dokunulmadı). Pixel_8_Pro'nun da depolaması dolu.
- **Metro'ya ağ adresiyle (192.168.1.106) bağlanınca paket bozuk iniyor** ve "Downloading 100%" ekranında takılıyor. Bunun yerine adb tüneliyle bağlanın:
  ```powershell
  adb reverse tcp:8081 tcp:8081
  adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
  ```
- **Gerçek telefonda test:** bilgisayarın Wi-Fi'si Windows'ta "Ortak" ağ ve Node'a güvenlik duvarı izni yok, bu yüzden düz QR çalışmaz. `npx expo start --tunnel ngrok` kullanın (`@expo/ngrok` projede devDependency; düz `--tunnel` Expo hesabı ister). Adres: `curl http://127.0.0.1:4040/api/tunnels` → `exp://<adres>` ile Expo Go'da açılır.
- Expo Go'da Fast Refresh kapalı geliyor; kod değişince uygulamayı yeniden yükleyin.
- Bu makinede 8080 portunu bir Oracle dinleyicisi kullanıyor; bu yüzden API **5080** portunda.

## Sıradaki adımlar (önerilen sıra)

1. **Gerçek soru içeriği**: test sorularının yerine doğrulanmış sorular (en az 30–60 günlük stok). Soru paneli v1.1'de; şimdilik `/admin`.
2. **Simgeyi ve açılış ekranını gerçek bir derlemede görmek**: Expo Go kendi simgesini ve açılışını gösterir; development build ya da ilk EAS derlemesinde kontrol edilmeli.
3. **En son: sunucuya bağlama ve yayın**: mobilin gerçek API'ye geçmesi, üretim ayarları, Cloudflare, GitHub Actions, Sentry, Takdir entegrasyonu, lig davet bağlantısı (universal link).
4. **v1.1 (plana göre):** reklamlar (AdMob, UMP, ATT), soru paneli, Apple/Google ile giriş, webde oynama. Bunlar development build gerektirir.

## Senin karar vermen gerekenler

- [ ] **Uygulama kimliği** `app.gununsorusu` uygun mu? Mağazaya ilk yüklemeden sonra değiştirilemez.
- [ ] **"Bilindi" ölçütü:** sayısalda ±%5, bilgide süresinde doğru, Hangisi daha…?'da ≥3/5, ankette ≥80 puan. Uygun mu?
- [ ] **Logo:** şimdilik Claude'un tasarladığı geçici logo kullanılıyor (güneş noktalı "?"). Beğenmezsen ya da profesyonel logo gelirse `scripts/render-brand.mjs` ile tek komutta değişir.
- [ ] **Mağaza adı rezervasyonu** (App Store Connect / Play Console): plandaki ilk iş, senin hesabınla yapılmalı.

## Bilinen eksikler / notlar

- Test sorularındaki fiyat ve sayılar **yaklaşık değerler**, yalnızca deneme için. Uygulamada "Test verisi" etiketiyle görünüyor.
- Hatırlatma bildiriminin gerçekten geldiği emülatörde denenmedi; ayar ve zamanlama kodu hazır.
- iOS'ta hiç çalıştırılmadı (bu makinede mümkün değil).
- Yeni simge ve açılış ekranı yalnızca dosya olarak kontrol edildi; Expo Go bunları göstermez (bkz. sıradaki adımlar).
- Lig davet bağlantısı (`gununsorusu.app/lig/KOD`) yayın aşamasına kadar çalışmaz; kod elle girilir.
- `appsettings.Development.json` içindeki anahtarlar yalnızca geliştirme içindir; üretimde ortam değişkeni kullanılacak.
