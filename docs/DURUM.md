# Nerede kaldık? — Günün Sorusu ?

> Son güncelleme: **5 Kasım 2026**. Yeni oturumda "nerede kaldık?" sorusunun cevabı bu dosyadır.
> Kod deposu: https://github.com/fxlonq/gununsorusu (`main`, 4 Kasım 2026'da ilk kez gönderildi).
> Ayrıntılı teknik kararlar: [`kararlar.md`](kararlar.md) (#1–56). Ürün planı: `../Gunun-Sorusu-Plan-v2.pdf`.

## Çalışma ilkeleri (birlikte karar verdiklerimiz)

- **Önce kalite**, PDF'teki tarihler ve içerik/video planı (Kanal A/B) şimdilik yok sayılıyor.
- **Expo Go ile geliştiriyoruz.** Yalnızca Expo Go'da bulunan kütüphaneler; development build sonraya.
- **Sunucu bağlama, yayın, Cloudflare, CI ve Takdir entegrasyonu en sona** bırakıldı.
- Mobil uygulama şimdilik **kendi içindeki test verisiyle** çalışıyor.
- Her şey **D: diskine** kuruluyor (C: dolu).

## Tamamlanan aşamalar

| Aşama | Durum | Nerede |
|---|---|---|
| 1. Oyun kuralları (puanlama, seri, ipucu, gün sınırı) | ✅ 101 test | `services/gunun-api/src/GununSorusu.Domain` |
| 2. API + Postgres + Docker | ✅ 47 entegrasyon testi (gerçek Postgres) | `services/gunun-api` |
| 3. Expo mobil uygulama, 5 formatın hepsi oynanıyor | ✅ emülatörde denendi | `apps/mobile` |
| 4. Arayüz yenileme + uygulama içi test sunucusu | ✅ emülatörde açık/koyu temada denendi | `apps/mobile/src` |
| 5. Arkadaş ligi | ❌ 9 Kasım'da kaldırıldı (sunucu + mobil; tablolar migration `RemoveLeagues` ile silinir) | — |
| 6. İlk açılış ipuçları + "dün" şeridi | ✅ emülatörde denendi; mobilde toplam 29 test | `components/game/FormatTip.tsx`, `YesterdayStrip.tsx` |
| 7. Uygulama simgesi + açılış ekranı (geçici logo) | ✅ görseller üretildi, uygulama içi logo emülatörde denendi; expo-doctor 20/20 | `apps/mobile/scripts/render-brand.mjs`, `assets/` |
| 8. Reklam yerleşimleri (ödüllü + geçiş), Expo Go'da test reklamıyla | ✅ emülatörde denendi; mobilde toplam 36 test | `apps/mobile/src/ads/` |

### Uygulamada şu an olanlar
- **Premium, sınırsız mod, sıralama, grafikler (karar #84–89, yalnız test sunucusunda):** onboarding'de girişten önce Ücretsiz / Premium (aylık 20 TL, test satın alması) seçimi, Profil'de premium bölümü; premium: sınırsız Hangisi pahalı? (`/practice`, günün pahalı oyunu bitince) ve reklamsız oyun. Gün bitince "Bugün oyuncuların %X'inden iyisin" kartı; Seri sayfasında mod mod başarı ve Wordle tarzı dağılım.
- **Hangi ünlü?, ikonlar, koleksiyon (karar #74–79):** 135 ünlü (110'unda açık lisanslı fotoğraf), 10 hak, ipuçları, olası ünlüler ve gizli ünlü kartı; Soro tarzı çizim ikonlar; 15 günlük yapboz, her yapbozda farklı resim, Koleksiyonum sayfası (Bugün'den bağlantı). Açık konu: ünlü fotoğrafları için hukuk görüşü.
- **Web kabuğu ve maskot (karar #71–72):** web'de üst menü / alt sekme + her sayfada aynı başlık kalıbı (PageHero) ve konuşan Soro; Bugün'de 2×2 mod kartları.
- **Günlük set (karar #61–70):** her gün 4 mod: Hangisi pahalı? (Higher-Lower sahnesi, zincirli turlar, her turda görsel) · Kaç? · Yapar mıydın? · Hangi ünlü? (Loldle gibi 8 kutu). Dördü bitince gün tamamlanır; seri +1 ve 14 parçalık yapboza 1 parça. Kaçırılan günde parçalar dağılır; haftada 1 seri kurtarma.
- **Ekranlar:** Bugün (mod kartları, ilerleme, yapboz önizlemesi, gün bitince sıralama + geri sayım) · Seri (büyük yapboz, sayılar) · Profil. Arşiv ve Nasıl oynanır? Bugün'den açılır. Web'de geniş ekranda iki sütun.
- **İlk açılış:** Soro'lu üç adımlık tanıtım (Skia ile canlandırılmış, atlanabilir; karar #57–59), ardından her formatla ilk karşılaşmada kısa ipucu kartı (+ ilk kez açana "Hoş geldin").
- **Görseller:** sorularda ve "Hangisi pahalı?" kartlarında CC0 / kamu malı fotoğraflar, altında kaynak yazısı (karar #65).
- **Oyun içi:** özel sayı tuş takımı, ipucu, halka şeklinde geri sayım, VS kartları, puan halkası, konfeti, titreşim.
- **Reklamlar (test reklamıyla):** ödüllü video → 6 hak bitince 1 tahmin daha, ipucu, seri kurtarma, arşivde günlük ücretsiz hak bitince soru açma. Premium aboneye reklam gösterilmez. Geçiş reklamı → sonuçtan sonra sekme değiştirirken, arşiv oyunu bitince, genel sekme geçişlerinde; günde en fazla 2, ilk 2 gün yok, soru bitmeden yok. Ayrıntı: kararlar #51–56.
- **Diğer:** yerel günlük hatırlatma (+ seri tehlikedeyse 21:00), Sistem/Açık/Koyu tema, seri kurtarma.
- **Test araçları (Profil):** "Bir gün ileri", "Sıfırla"; ayrıca Reklam testi: kurulum günü, bugünkü geçiş reklamı sayısı, son reklam olayları, "İlk 2 günü atla", "Sayaçları sıfırla". Yalnızca test modunda görünür.

### Sunucuda şu an olanlar (hazır ama mobil henüz bağlı değil)
- Cihaz kimliğiyle üyeliksiz giriş (JWT), bütün oyun uç noktaları, arşiv, istatistik, "Türkiye ne dedi?" dağılımı.
- Dakikalık işler: soruyu yayına alma, anketi kapatma, dağılımı hesaplama.
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
3. **Reklamlar için kalanlar**: sunucuya ek tahmin / arşiv kilidi / `extra`·`reveal`·`unlock` uç noktaları (kararlar #55), AdMob SSV doğrulaması, development build'de `react-native-google-mobile-ads` + UMP/ATT onayı, gerçek reklam birimi kimlikleri.
4. **En son: sunucuya bağlama ve yayın**: mobilin gerçek API'ye geçmesi, üretim ayarları, Cloudflare, GitHub Actions, Sentry, Takdir entegrasyonu.
5. **v1.1 (plana göre):** soru paneli, Apple/Google ile giriş, webde oynama. Bunlar development build gerektirir.

## Senin karar vermen gerekenler

- [ ] **Uygulama kimliği** `app.gununsorusu` uygun mu? Mağazaya ilk yüklemeden sonra değiştirilemez.
- [ ] **"Bilindi" ölçütü:** sayısalda ±%5, bilgide süresinde doğru, Hangisi daha…?'da ≥3/5, ankette ≥80 puan. Uygun mu?
- [ ] **Logo:** şimdilik Claude'un tasarladığı geçici logo kullanılıyor (güneş noktalı "?"). Beğenmezsen ya da profesyonel logo gelirse `scripts/render-brand.mjs` ile tek komutta değişir.
- [ ] **Reklam sıklığı:** geçiş reklamı günde en fazla 2 (plandaki sınır), sekme geçişinde her 4 geçişte bir aday, ödüllü video Expo Go testinde 5 sn. Uygun mu? (`src/ads/config.ts`)
- [ ] **Mağaza adı rezervasyonu** (App Store Connect / Play Console): plandaki ilk iş, senin hesabınla yapılmalı.

## Bilinen eksikler / notlar

- Test sorularındaki fiyat ve sayılar **yaklaşık değerler**, yalnızca deneme için. Uygulamada "Test verisi" etiketiyle görünüyor.
- Hatırlatma bildiriminin gerçekten geldiği emülatörde denenmedi; ayar ve zamanlama kodu hazır.
- iOS'ta hiç çalıştırılmadı (bu makinede mümkün değil).
- Yeni simge ve açılış ekranı yalnızca dosya olarak kontrol edildi; Expo Go bunları göstermez (bkz. sıradaki adımlar).
- Reklamlar yalnızca test ekranıyla gösteriliyor; ödüller şimdilik istemcide veriliyor (gerçek sunucuda SSV şart). "Arşiv oyunu bitince geçiş reklamı" (after_archive) emülatörde henüz denenmedi; diğer reklam akışları denendi.
- `appsettings.Development.json` içindeki anahtarlar yalnızca geliştirme içindir; üretimde ortam değişkeni kullanılacak.
