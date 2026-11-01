# Günün Sorusu ? — mobil

Expo SDK 58 · React Native 0.88 · expo-router (NativeTabs) · TanStack Query. Sunucu: `../../services/gunun-api`.

## Çalıştırma

```powershell
npx expo start          # Expo Go ile (Android emülatöründe: a tuşu)
```

Uygulama varsayılan olarak **kendi içindeki test sunucusuyla** çalışır (`src/mock/`): sunucu, Docker ya da
internet gerekmez. Sorular, "Türkiye ne dedi?" sonuçları ve puanlama cihazda üretilir; oyun kuralları
sunucudaki `GununSorusu.Domain` ile birebir aynıdır (`src/mock/rules.ts`, testli). Profil sekmesindeki
**Test araçları** ile saat bir gün ileri alınabilir (seri, anket sonucu, arşiv denemek için) ve veriler sıfırlanabilir.

Gerçek sunucuya bağlanmak için (`services/gunun-api`, `docker compose up -d`):
`EXPO_PUBLIC_API_URL=http://10.0.2.2:5080` (emülatör) ya da bilgisayarın yerel ağ adresi (gerçek telefon).

Yalnızca Expo Go'da bulunan kütüphaneler kullanılır; development build şimdilik gerekmez.

## Komutlar

```powershell
npm test            # saf yardımcılar (sayı biçimi, paylaşım kartı, Türkçe ekler)
npm run typecheck
npx expo lint
```

## Yapı

```
src/app/            ekranlar (her dosya bir rota): Bugün, İstatistik, Arşiv (yığın), Profil
src/components/     ui.tsx (ortak bileşenler), game/ (format başına oyun bileşenleri, sonuç paneli)
src/api/            sunucu istemcisi (cihaz kimliği + JWT, Türkçe hata), sorgu kancaları, tipler
src/lib/            saf yardımcılar + testleri (sayı biçimi, Türkçe ekler, paylaşım kartı, tuş takımı, titreşim, hatırlatma)
src/mock/           uygulama içi test sunucusu: kurallar, soru bankası, API taklidi
src/settings/       cihaz tercihleri (tema, titreşim, hatırlatma)
src/theme/tokens.ts tek tema kaynağı (renk, boşluk, yazı); açık/koyu
```

Kurallar: puan yalnızca sunucuda hesaplanır, istemci yalnızca gösterir. Ekranlarda sabit renk/ölçü yazılmaz,
`theme/tokens.ts` kullanılır. Kullanıcıya gösterilen her hata sunucunun Türkçe `title` alanından gelir.
