# Teknik kararlar

Ürün planı: `Gunun-Sorusu-Plan-v2.pdf`. Bu dosya plandan ayrıldığımız ya da planın açık bıraktığı noktaları kaydeder.

| # | Konu | Karar | Gerekçe |
|---|---|---|---|
| 1 | .NET sürümü | **.NET 10 LTS** (plan: .NET 9) | .NET 9 desteği 10 Kasım 2026'da bitiyor. .NET 10, Kasım 2028'e kadar destekli. |
| 2 | Puanlama yeri | Yalnızca sunucu (`GununSorusu.Domain`) | Hile engeli; istemci yalnızca sonucu gösterir. |
| 3 | Gün sınırı | `Europe/Istanbul`, sunucu saati | Telefon saatine güvenilmez. |
| 4 | Türkiye ne diyor? puanı | `100 − 2×|fark|`, **0–100 arasında sınırlı** | Formül fark > 50'de negatife düşüyordu. |
| 5 | Çözülemeyen sayısal oyun | Son tahmin hatası ≤ %10 → 20 puan, %50 ve üstü → 0, arası doğrusal | Plan "0–20" diyordu, eğri tanımsızdı. |
| 6 | İpucu ("aralığı daralt") | Cevabın ~%20'si genişliğinde aralık; cevap aralığın %20–80'i arasında rastgele konumda; **seed = soru id** | Herkese aynı aralık, yeniden istenerek yeni aralık çekilemez, cevap ortada olmadığı için ele verilmez. |
| 7 | Bilgi formatı süresi | Soru metni ve şıklar `POST /start` ile açılır, süre sunucuda ölçülür, 1 sn ağ payı | Herkese açık `today.json` içinde şıklar olursa hız bonusu hilelenebilirdi. |
| 8 | Seri kurtarma | Tam 1 gün kaçırıldıysa, 7 günde 1 kez | Plan: "haftada 1". `freeze_tokens` yerine `last_repair_day`. |
| 9 | İptal edilen soru | O gün "mazeretli gün" sayılır; kimsenin serisi bozulmaz | Plan: "kimsenin serisi bozulmaz". |
| 10 | Soru önbelleği | Gün bazlı değişmez adres (`/q/{tarih}.json`) + kısa süreli `/q/today` | Gece yarısı bayat soru riski yok. |
| 11 | Play kapalı testi | Mümkün olan en erken sürümle başlatılır | 12 testçi × 14 gün kuralı. |
| 12 | Oyunun bitişi | Ayrı `POST /finish` yok; oyun son tahminde / son turda / cevapta sunucuda kendiliğinden biter | İstemci "bitti" diyemez; puan yalnızca sunucuda oluşur. |
| 13 | Uç nokta adresleri | Soru ve oyun **gün** ile adreslenir: `/q/{gün}`, `/plays/{gün}/…`, `/q/{gün}/crowd` (plan: `/q/{n}/crowd`) | Gün tekil ve önbellek adresiyle (#10) aynı; numara yalnızca paylaşım içindir. |
| 14 | `player_stats` | Yalnızca seri durumu tutulur; oynanan, bilinen, ortalama puan, format dağılımı `plays` tablosundan hesaplanır | İptal (100 puan) ve anket kapanışı sonrası sayaçlar bozulmaz. Oyuncu başına yılda ~365 satır, sorgu ucuz. |
| 15 | Mazeretli gün | O gün **yayında soru yoksa** (iptal edildi ya da hiç girilmedi) seri bozulmaz | #9'un genellemesi; içerik eksiği oyuncuyu cezalandırmaz. |
| 16 | "Bilindi" tanımı | Sayısal: ±%5 içinde bulundu · Bilgi: doğru ve süresinde · Hangisi daha…?: en az 3/5 · Anket: puan ≥ 80 | İstatistikteki "bilinen" sayısı için; plan tanımlamıyordu. |
| 17 | Bilgi formatında seri | Soru açıldığı an (`/start`) seri sayılır; cevapsız kalırsa 0 puanla kapanır | Tek hak var; açıp kapatıp yeniden denemek mümkün değil. |
| 18 | Arşiv | Son 7 gün; seriye ve istatistiğe girmez. Arşivden verilen anket oyu sonucu değiştirmez, kapanmış ankette hemen puanlanır | Plan: "seriyi etkilemez". Anket sonucu o günün oyuncularını yansıtmalı. |
| 19 | Bugünün dağılımı | `/q/{bugün}/crowd` yalnızca oyununu bitirene açılır | Dağılım cevabı ele verebilir. |
| 20 | Anonim kimlik | Cihaz kimliği ham saklanmaz (SHA-256). JWT HS256, 180 gün; süre dolunca uygulama aynı cihaz kimliğiyle yeniden alır | Veritabanı sızsa bile cihaz kimlikleri ele geçmez. |
| 21 | Soru girişi (panel öncesi) | `X-Admin-Key` ile `/admin/questions`. Yayına girmiş soru değiştirilemez, yalnızca iptal edilir. "Planlandı" için kaynak + doğrulayıcı zorunlu; fiyat/sayıda iki **farklı** kişi | Plan A9 çift onay kuralı sunucuda zorlanır. Panel v1.1'de bu uç noktaları kullanır. |
| 22 | Soru numarası | `no = gün − LaunchDay + 1` (ayar: `Game:LaunchDay`) | Numara gün ile birebir; arada boş gün olursa numara atlanır, kayma olmaz. |
| 23 | Seri kurtarma doğrulaması | Kural sunucuda (#8); ödüllü reklam doğrulaması (AdMob SSV) v1.1'de | Reklam altyapısı plana göre v1.1. |
| 24 | Yerel port | API `localhost:5080`, Postgres `localhost:5433` | 8080 bu makinede Oracle TNS dinleyicisinde. |

## Dağıtım aşamasında yapılacaklar

- Cloudflare + Caddy arkasında gerçek istemci IP'si (`CF-Connecting-IP` / `X-Forwarded-For`) için `ForwardedHeaders` ayarı; yoksa hız sınırı IP bazında tek anahtara düşer.
- Üretim compose dosyası: `ASPNETCORE_ENVIRONMENT=Production`, `Auth__SigningKey`, `Admin__ApiKey`, `POSTGRES_PASSWORD` sırları; imaj GHCR'den.
- Birden çok API kopyası çalışacaksa dakikalık işlere Postgres advisory lock.

## Mobil (aşama 3)

| # | Konu | Karar | Gerekçe |
|---|---|---|---|
| 25 | Expo sürümü | **SDK 58** (React Native 0.88), expo-router NativeTabs | Kurulum günündeki güncel sürüm. |
| 26 | Uygulama kimliği | `app.gununsorusu` (Android paketi ve iOS bundle id) — **mağazaya ilk yüklemeden önce onaylanmalı, sonra değiştirilemez** | Alan adı `gununsorusu.app` ile uyumlu. |
| 27 | Veri katmanı | TanStack Query; oyun işlemleri sunucunun döndürdüğü durumu doğrudan önbelleğe yazar | Uygulama öne gelince ve gece yarısı yeni soru kendiliğinden yüklenir. |
| 28 | Sayı girişi | Türkçe biçim: "1.250" = bin iki yüz elli, "45,5" = kırk beş buçuk; nokta ancak ardından tam 3 rakam varsa binlik ayırıcıdır | Kullanıcı nasıl yazarsa yazsın doğru anlaşılsın. |
| 29 | Yüzde ekleri | "%62'si", "%40'ı", "%100'ü" — ek sayının okunuşuna göre seçilir | Sabit "'i" eki çoğu sayıda yanlış olur. |
| 30 | Arşiv listesi | Yeni uç nokta `GET /plays/archive` (son 7 gün + oyuncunun durumu) | Sekme tek istekle dolsun. |
| 31 | Geliştirme modu | Mobil uygulama varsayılan olarak **uygulama içi test sunucusuyla** çalışır; gerçek sunucu `EXPO_PUBLIC_API_URL` ile seçilir | Ekip Expo Go ile sunucusuz çalışabilsin; sunucu bağlama en sona bırakıldı (2026-11-01). |
| 32 | Kuralların iki kopyası | Puanlama ve seri kuralları test sunucusu için TypeScript'e taşındı (`apps/mobile/src/mock/rules.ts`); testleri sunucu testleriyle aynı beklenen değerleri kullanır | Gerçek modda puanı yine yalnızca sunucu hesaplar; kural değişirse iki taraf birlikte güncellenir. |
| 33 | Sayı girişi | Sistem klavyesi yerine oyuna özel tuş takımı | Klavye tahmin geçmişini örtüyordu; Türkçe virgül her cihazda aynı yerde. |
| 34 | Yazı tipi ve tema | Nunito (Türkçe karakterler tam); açık/koyu/sistem teması ve titreşim cihazda saklanır | Sıcak, oyunsu kimlik; tercihler sunucu gerektirmez. |
| 35 | Hatırlatma | Yerel bildirim: seçilen saatte günlük + seri tehlikedeyse 21:00 (Expo Go'da çalışır) | Plan A4; push sunucusu gerekmez. |
| 36 | Paylaşım görseli | 1080×1920 hikâye kartı (react-native-view-shot + expo-sharing); cevabı göstermez | Plan A6. |

## Arkadaş ligi (2026-11-02)

Plan yalnızca "özel grup kodu ve haftalık sıralama (aile, iş yeri) — MVP" diyordu; ayrıntılar burada.

| # | Konu | Karar | Gerekçe |
|---|---|---|---|
| 37 | Hafta | Pazartesi 00:00 – Pazar 23:59, İstanbul günü; her Pazartesi sıfırdan başlar. Geçmiş haftalar (lig kurulduğu haftaya kadar) görülebilir | Türkiye'de hafta Pazartesi başlar; geçen haftanın birincisi konuşulabilsin. |
| 38 | Haftalık puan | Üyenin o hafta **kendi gününde** oynadığı soruların puan toplamı. Arşiv oyunları ve **iptal edilen** sorular sayılmaz; anket puanı kesinleşene kadar 0 (⏳ ile gösterilir) | Herkes aynı soruyu aynı gün çözer; iptalde oynayana 100 verilir (#9) ama henüz oynamamış olan geride kalmasın. |
| 39 | Sonradan katılan | Lige hafta ortasında katılan, o haftanın önceki günlerindeki puanını da getirir | Puanlar oyuna bağlı, lige değil; kimse geç katıldığı için cezalandırılmaz. |
| 40 | Sıralama | Toplam puana göre; eşit puan aynı sırayı alır, sonraki sıra atlanır (1, 1, 3). Listede eşitlikte çok oynayan, sonra ad (Türkçe alfabe) önce | Bilinen spor tablosu mantığı. |
| 41 | Lig kodu | 6 karakter, `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (0/O, 1/I yok). Boşluk, tire ve küçük harf kabul edilir; "K7P 2QX" diye gösterilir | Sesli okunurken ve elle yazılırken karışmasın; 32⁶ ≈ 1 milyar olasılık tahmini önler. |
| 42 | Görünen ad zorunlu | Lig kurmak ya da katılmak için görünen ad gerekir (`display_name_required`); uygulama formda ad ister | Sıralamada kimin kim olduğu görünmeli; üyelik yine yok. |
| 43 | Sınırlar | Ligde en fazla 50 kişi, oyuncu başına en fazla 10 lig | Aile/iş yeri ölçeği; sorgu maliyeti sınırlı. |
| 44 | Sahiplik | Kuran sahip olur; üyeleri yalnızca sahip çıkarır. Sahip ayrılınca en eski üye sahip olur; son üye ayrılınca lig silinir | Ad değiştirme gibi yönetim ihtiyacı yok; "terk edilmiş lig" kalmaz. |
| 45 | Gizlilik | Üye olmayan, lig kimliğini bilse bile içeriği göremez (404) | Kod paylaşılmadıkça lig özeldir. |
| 46 | Davet bağlantısı | Paylaşım metni: ad + kod + `gununsorusu.app/lig/KOD`. Uygulama içi adres: `gununsorusu://leagues/join?code=KOD` | Alan adı yayında değil; bağlantı yayın aşamasında universal link olacak, o zamana kadar kod elle girilir. |

Uç noktalar: `GET /leagues`, `POST /leagues`, `POST /leagues/join`, `GET /leagues/{id}?week=YYYY-MM-DD`, `DELETE /leagues/{id}/members/{playerId}` (kendini çıkarmak = ayrılmak, 204).

### Yayın aşamasında lig için yapılacaklar
- `gununsorusu.app/lig/{kod}` için universal link / App Links (apple-app-site-association, assetlinks.json) ve web karşılama sayfası.
- Üye ve lig sayısı sınırı aynı anda gelen isteklerde birkaç kişi aşılabilir (sayım + ekleme); gerekirse serializable işlem ya da advisory lock.

## İlk açılış ve "dün" şeridi (2026-11-02)

| # | Konu | Karar | Gerekçe |
|---|---|---|---|
| 47 | İlk açılış | Ayrı tanıtım ekranı yok. Bir formatla ilk karşılaşmada sorunun altında 1–2 cümlelik, kapatılabilir ipucu kartı; hiç oynamamış oyuncuya ayrıca "Hoş geldin" cümlesi. Format bir kez oynanınca (ya da "Anladım" denince) bir daha çıkmaz; bilgi cihazda saklanır (`seenFormats`) | Plan A4/A5: soruya en fazla 1 dokunuş. Formatlar haftanın günlerine dağıldığı için ipucu ilk karşılaşmada gerekir, ilk açılışta değil. Bilgi formatının kuralları zaten "Başla" kartında yazıyor. |
| 48 | "Dün" şeridi | Bugünün sorusu bitmeden, başlığın altında: dünkü puan ve Türkiye ortalaması, ya da kaçırılan/yarım kalan gün için arşiv çağrısı. Hiç oynamamış oyuncuya ve iptal edilen günde gösterilmez. Yeni uç nokta yok (`/plays/archive` + `/q/{dün}/crowd`) | Ertesi gün geri dönme sebebi (özellikle gece yarısı kesinleşen anket puanı); arşivi de canlandırır. |

## Simge ve açılış ekranı (2026-11-02)

| # | Konu | Karar | Gerekçe |
|---|---|---|---|
| 49 | Logo | Turuncu degrade zeminde beyaz, kalın "?"; noktası sarı bir güneş ("**gün**ün sorusu"). Tek vektör kaynaktan üretilir: `apps/mobile/scripts/render-brand.mjs` → `assets/images/*.png` ve `assets/brand/*.svg`. Uygulama içinde aynı geometri `BrandMark` bileşeninde (başlık filigranı, paylaşım kartı rozeti) | Profesyonel logo yokken tutarlı, küçük boyutta okunur bir işaret. Değiştirmek için tek dosya düzenlenip betik yeniden çalıştırılır. |
| 50 | Platform dosyaları | iOS: 1024 PNG (Icon Composer `.icon` paketi yerine; bu makinede Xcode yok, doğrulanamaz). Android: uyarlanabilir simge (ön plan güvenli dairede, degrade arka plan, tek renkli katman). Açılış: saydam zeminde yuvarlak rozet, `imageWidth` 200; zemin renkleri uygulama temasıyla aynı (`#FBF7F1` / `#111216`) | Expo belgesinin önerileri; açılıştan uygulamaya geçişte renk sıçraması olmasın. |
