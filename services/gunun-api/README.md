# gunun-api

Günün Sorusu sunucusu: .NET 10 Minimal API + Postgres 16. Kararlar: `../../docs/kararlar.md`.

## Çalıştırma

```powershell
# Veritabanı + API (Docker)
docker compose up -d --build        # http://localhost:5080

# ya da yalnızca veritabanı, API'yi yerelde
docker compose up -d db
dotnet run --project src/GununSorusu.Api   # http://localhost:5080
```

Geliştirme ortamında açılışta migration'lar uygulanır ve veritabanı boşsa bugünün ±7 günü için
`[Örnek]` etiketli sorular eklenir. OpenAPI: `http://localhost:5080/openapi/v1.json`.
Yönetim anahtarı (yalnızca geliştirme): `X-Admin-Key: dev-admin-key`.

## Testler

```powershell
dotnet test    # Docker açık olmalı: API testleri Testcontainers ile gerçek Postgres kullanır
```

## Uç noktalar

| Yöntem | Adres | Açıklama |
|---|---|---|
| POST | `/auth/device` | `{deviceId}` → `{token, playerId}`. Üyeliksiz kimlik. |
| POST | `/auth/google` | `{idToken}` → `{token, playerId, email, displayName, switched}`. Cihaz oturumunu Google hesabına bağlar (`Google:ClientIds`). |
| GET/PATCH | `/me` | Görünen ad, şehir, bildirim saati. |
| GET | `/q/today`, `/q/{gün}` | Herkese açık soru (cevapsız, önbelleklenebilir). |
| GET | `/plays/{gün}` | Oyuncunun o sorudaki durumu. |
| POST | `/plays/{gün}/start` | Soruyu açar; bilgi formatında süre başlar, şıklar gelir. |
| POST | `/plays/{gün}/guess` | Fiyat / sayı tahmini `{value}`. |
| POST | `/plays/{gün}/hint` | "Aralığı daralt" (3. tahminden sonra, −10). |
| POST | `/plays/{gün}/answer` | Bilgi cevabı `{option}`. |
| POST | `/plays/{gün}/compare` | Hangisi daha…? turu `{round, choice}`. |
| POST | `/plays/{gün}/poll` | Anket `{option, predictedPct}`. |
| GET | `/q/{gün}/crowd` | Türkiye ne dedi? (bugün için önce oyunu bitirmek gerekir). |
| GET | `/stats/me` | Seri, istatistik, son 30 gün. |
| POST | `/streak/repair` | Seri kurtarma. |
| PUT | `/admin/questions/{gün}` | Soru girişi (`X-Admin-Key`). |
| POST | `/admin/questions/{gün}/cancel` | Hatalı soru protokolü. |

Hatalar her zaman `ProblemDetails` biçimindedir: `title` ekranda gösterilebilecek Türkçe mesaj, `code` istemcinin dallanması için.
