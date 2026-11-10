/**
 * Günün üç modunun test stoğu (uygulama içi test sunucusu için). Değerler yaklaşıktır ve yalnızca
 * denemelik; gerçek sorular yayından önce kaynaktan çift onayla doğrulanır (docs/kararlar.md).
 *
 * - pahali: "Hangisi daha pahalı?" 5 tur, her turda iki görselli şey; doğru taraf ve yaklaşık fiyatlar.
 * - kac: "Kaç?" yukarı/aşağı ipuçlu tahmin; fiyat ve sayı soruları sırayla gelir (BANK'tan).
 * - yapar: "Yapar mıydın?" Soro adım adım bir hikâye anlatır, sonda Evet/Hayır; sonra Türkiye'yi tahmin et.
 * - unlu: "Hangi ünlü?" 10 hakta günün ünlüsünü bul (mock/celebs.ts); sıra karışık ama sabittir.
 */
import type { DailyMode, StoryMood, StoryProp } from '../api/types';
import { CELEBS } from './celebs';
import { STORY_OPTIONS } from '../lib/story';
import { BANK, type MockQuestion } from './questions';
import { mulberry32 } from './rules';

/** Zincir: her turun sağ tarafı sonraki turun sol tarafı olur (Higher-Lower gibi); ekranda kart kayar. */
const PAHALI: MockQuestion[] = [
  {
    format: 'compare',
    prompt: 'Hangisi daha pahalı?',
    rounds: [
      { a: '1 kg Rize çayı', b: '1 kg Türk kahvesi', mediaA: 'cay_yapragi', mediaB: 'kahve_cekirdek', correct: 1, valueA: '~300 TL', valueB: '~900 TL' },
      { a: '1 kg Türk kahvesi', b: '1 kg tereyağı', mediaA: 'kahve_cekirdek', mediaB: 'tereyagi', correct: 0, valueA: '~900 TL', valueB: '~550 TL' },
      { a: '1 kg tereyağı', b: '1 kg Antep fıstığı', mediaA: 'tereyagi', mediaB: 'antep_fistigi', correct: 1, valueA: '~550 TL', valueB: '~1.100 TL' },
      { a: '1 kg Antep fıstığı', b: '1 kg süzme bal', mediaA: 'antep_fistigi', mediaB: 'bal', correct: 0, valueA: '~1.100 TL', valueB: '~700 TL' },
      { a: '1 kg süzme bal', b: '1 kg vanilya çubuğu', mediaA: 'bal', mediaB: 'vanilya', correct: 1, valueA: '~700 TL', valueB: '~20.000 TL' },
    ],
    fact: 'Vanilya, safrandan sonra dünyanın en pahalı ikinci baharatı sayılır; çiçekleri elle tozlaştırılır.',
  },
  {
    format: 'compare',
    prompt: 'Hangisi daha pahalı?',
    rounds: [
      { a: '1 kg muz', b: '1 kg domates', mediaA: 'muz', mediaB: 'domates', correct: 0, valueA: '~80 TL', valueB: '~40 TL' },
      { a: '1 kg domates', b: '1 kg çilek', mediaA: 'domates', mediaB: 'cilek', correct: 1, valueA: '~40 TL', valueB: '~150 TL' },
      { a: '1 kg çilek', b: '1 kg somon fileto', mediaA: 'cilek', mediaB: 'somon', correct: 1, valueA: '~150 TL', valueB: '~900 TL' },
      { a: '1 kg somon fileto', b: '1 kg dana kıyma', mediaA: 'somon', mediaB: 'kiyma', correct: 0, valueA: '~900 TL', valueB: '~700 TL' },
      { a: '1 kg dana kıyma', b: '1 kg avokado', mediaA: 'kiyma', mediaB: 'avokado', correct: 0, valueA: '~700 TL', valueB: '~250 TL' },
    ],
    fact: 'Markette “Türk somonu” diye satılan balık, Karadeniz’de kafeslerde yetiştirilen bir alabalık türüdür.',
  },
  {
    format: 'compare',
    prompt: 'Hangisi daha pahalı?',
    rounds: [
      { a: 'Tac Mahal giriş bileti', b: 'Kolezyum giriş bileti', mediaA: 'tacmahal', mediaB: 'kolezyum', correct: 1, valueA: '~13 $', valueB: '~20 $' },
      { a: 'Kolezyum giriş bileti', b: 'Keops Piramidi bileti', mediaA: 'kolezyum', mediaB: 'piramit', correct: 0, valueA: '~20 $', valueB: '~14 $' },
      { a: 'Keops Piramidi bileti', b: 'Kapadokya balon turu', mediaA: 'piramit', mediaB: 'balon', correct: 1, valueA: '~14 $', valueB: '~200 $' },
      { a: 'Kapadokya balon turu', b: 'Venedik gondol turu (30 dk)', mediaA: 'balon', mediaB: 'gondol', correct: 0, valueA: '~200 $', valueB: '~100 $' },
      { a: 'Venedik gondol turu (30 dk)', b: 'Eyfel Kulesi zirve bileti', mediaA: 'gondol', mediaB: 'eyfel', correct: 0, valueA: '~100 $', valueB: '~39 $' },
    ],
    fact: 'Venedik’te gondol ücretini belediye belirler; gece turu gündüzden daha pahalıdır.',
  },
  {
    format: 'compare',
    prompt: 'Hangisi daha pahalı?',
    rounds: [
      { a: 'Bir buket gül', b: 'Saksıda kaktüs', mediaA: 'gul', mediaB: 'kaktus', correct: 0, valueA: '~800 TL', valueB: '~150 TL' },
      { a: 'Saksıda kaktüs', b: 'Şehir bisikleti', mediaA: 'kaktus', mediaB: 'bisiklet', correct: 1, valueA: '~150 TL', valueB: '~15.000 TL' },
      { a: 'Şehir bisikleti', b: 'Akustik gitar', mediaA: 'bisiklet', mediaB: 'gitar', correct: 0, valueA: '~15.000 TL', valueB: '~5.000 TL' },
      { a: 'Akustik gitar', b: 'Duvar piyanosu', mediaA: 'gitar', mediaB: 'piyano', correct: 1, valueA: '~5.000 TL', valueB: '~150.000 TL' },
      { a: 'Duvar piyanosu', b: 'Kaykay', mediaA: 'piyano', mediaB: 'kaykay', correct: 0, valueA: '~150.000 TL', valueB: '~2.500 TL' },
    ],
    fact: 'Standart bir piyanoda 88 tuş vardır: 52 beyaz, 36 siyah.',
  },
];

/**
 * Yapar mıydın? — Soro'nun hikâyesi: her adımda Soro'nun hâli ve elindeki eşya değişir, merak adım adım
 * büyür, en sonda soru bir kez sorulur (Evet / Hayır). Oy ağırlığı: [evet, hayır] (toplam 100, simülasyon).
 */
type Beat = [text: string, mood: StoryMood, prop?: StoryProp];

const hikaye = (beats: Beat[], question: string, yes: number, fact?: string): MockQuestion => ({
  format: 'poll',
  prompt: question,
  options: [...STORY_OPTIONS],
  pollWeights: [yes, 100 - yes],
  story: { beats: beats.map(([text, mood, prop]) => ({ text, mood, prop })), question },
  fact,
});

const YAPAR: MockQuestion[] = [
  hikaye(
    [
      ['Bugün sana bir tapu getirdim. Hazır mısın?', 'wave', 'mektup'],
      ['Boğaz’da, denize sıfır, üç katlı bir yalı. Tamamen bedava!', 'cheer', 'anahtar'],
      ['Tek bir şart var: her gece saat 03.00’te kapı üç kez çalınacak.', 'think'],
      ['Kapıyı asla açmayacaksın. Kimin çaldığını da hiçbir zaman öğrenemeyeceksin.', 'sad', 'ter'],
    ],
    'Yalıya taşınır mıydın?',
    58,
  ),
  hikaye(
    [
      ['Telefonuna bir mesaj geldi. Gönderen: sen. Tarih: 2036.', 'think', 'telefon'],
      ['Mesajda tek bir cümle var: “Yarın sabah evden çıkma.”', 'sad', 'telefon'],
      ['Ama yarın hayatının en önemli iş görüşmesi var. Yıllardır bunu bekliyordun.', 'think', 'mektup'],
      ['Mesaj başka hiçbir şey söylemiyor. Geri de yazamıyorsun.', 'sad', 'ter'],
    ],
    'Yarın görüşmeye gider miydin?',
    41,
  ),
  hikaye(
    [
      ['Çay ocağında, masada unutulmuş bir piyango bileti buldun.', 'think', 'mektup'],
      ['Merak edip kontrol ettin: büyük ikramiye! Tam 50 milyon TL.', 'cheer', 'para'],
      ['Kimin olduğunu kimse bilmiyor. Kamera yok, tanık yok.', 'think', 'gozluk'],
      ['Ama ocaktaki Hasan Amca sabahtan beri “biletimi kaybettim” diye üzülüyordu.', 'sad', 'ter'],
    ],
    'Bileti Hasan Amca’ya geri verir miydin?',
    63,
  ),
  hikaye(
    [
      ['Telefon çaldı… NASA! Mars’a gidecek ilk ekibe seni seçmişler.', 'cheer', 'yildiz'],
      ['Tarihe geçeceksin. Adın ders kitaplarında yazacak.', 'happy', 'yildiz'],
      ['Yolculuk yedi ay sürecek. Bavulunu bu akşam hazırlaman lazım.', 'think', 'bavul'],
      ['Bir şey daha var… Dönüş bileti yok.', 'sad', 'ter'],
    ],
    'Mars’a gider miydin?',
    22,
  ),
  hikaye(
    [
      ['Bit pazarında tuhaf bir gözlük buldum. Sana hediye!', 'happy', 'gozluk'],
      ['Takınca insanların seninle ilgili gerçekte ne düşündüğünü duyuyorsun.', 'think', 'gozluk'],
      ['Patronun, arkadaşların, annen… Herkesin aklından geçen her şey.', 'think', 'kalp'],
      ['Ama bir kez takarsan bir hafta boyunca çıkaramıyorsun.', 'sad', 'ter'],
    ],
    'Gözlüğü takar mıydın?',
    47,
  ),
  hikaye(
    [
      ['Önünde kırmızı bir buton var.', 'think', 'buton'],
      ['Basarsan yarın sabah Türkiye’nin en ünlü insanı olarak uyanacaksın.', 'cheer', 'yildiz'],
      ['Milyonlarca takipçi, reklam anlaşmaları, her yerde senin yüzün.', 'happy', 'para'],
      ['Ama bir daha asla sokakta tanınmadan yürüyemeyeceksin. Hiçbir zaman.', 'sad', 'gozluk'],
    ],
    'Butona basar mıydın?',
    38,
  ),
  hikaye(
    [
      ['Yaşlı bir eczacı bana küçük bir hap verdi. Senin için sakladım.', 'happy', 'yildiz'],
      ['Bu hapı içersen bugünden sonra bir gün bile yaşlanmayacaksın.', 'cheer', 'yildiz'],
      ['Hastalanmayacaksın, yorulmayacaksın. Hep bugünkü gibi kalacaksın.', 'happy', 'kalp'],
      ['Ama sevdiğin herkes yaşlanmaya devam edecek.', 'sad', 'ter'],
    ],
    'Hapı içer miydin?',
    33,
  ),
  hikaye(
    [
      ['Sana bir bavul hazırladım: bir yıllık dünya turu!', 'cheer', 'bavul'],
      ['Otuz ülke, en güzel oteller. Bütün masraflar ödendi.', 'happy', 'para'],
      ['Tek şart: bu yolculuk hakkında kimseye tek kelime etmeyeceksin.', 'think', 'telefon'],
      ['Ne bir fotoğraf ne bir hikâye. Sanki hiç gitmemişsin gibi.', 'sad', 'ter'],
    ],
    'Tura çıkar mıydın?',
    71,
  ),
  hikaye(
    [
      ['Yarın hayatını değiştirecek sınava giriyorsun. Aylardır çalışıyorsun.', 'think', 'mektup'],
      ['Bu gece kapının önünde kapalı bir zarf buldun.', 'think', 'mektup'],
      ['İçinde yarınki sınavın bütün soruları ve cevapları var.', 'cheer', 'mektup'],
      ['Kimse bilmeyecek. Ama en yakın arkadaşın da aynı salonda; onun zarfı yok.', 'sad', 'ter'],
    ],
    'Zarfı açar mıydın?',
    39,
  ),
  hikaye(
    [
      ['Hayatının en utanç verici anını hatırlıyor musun? Hani o an…', 'sad', 'ter'],
      ['O anı herkesin hafızasından silebilirim. Seninki dahil.', 'cheer', 'yildiz'],
      ['Videolar, fotoğraflar, mesajlar… Hepsi yok olacak.', 'happy', 'telefon'],
      ['Karşılığında en güzel anılarından birini unutacaksın. Hangisi olduğunu ben seçeceğim.', 'think', 'kalp'],
    ],
    'Silmemi ister miydin?',
    44,
  ),
  hikaye(
    [
      ['Bu sabah büyülü bir sesle uyandın.', 'cheer', 'yildiz'],
      ['Ağzını açınca Sezen Aksu gibi söylüyorsun. Herkes hayran.', 'happy', 'kalp'],
      ['Konser teklifleri yağıyor; ilk ay 5 milyon TL.', 'cheer', 'para'],
      ['Tek bir yan etkisi var: artık hiç yalan söyleyemiyorsun. Beyaz yalan bile.', 'sad', 'ter'],
    ],
    'Bu sesi kabul eder miydin?',
    61,
  ),
  hikaye(
    [
      ['Hiç tanımadığın bir teyzen sana miras bırakmış.', 'sad', 'mektup'],
      ['Kadıköy’de koca bir apartman! Tam on iki daire.', 'cheer', 'anahtar'],
      ['Vasiyette bir şart var: teyzenin on dört kedisine ömür boyu sen bakacaksın.', 'think', 'kalp'],
      ['Ve kedilerin her biri ayrı bir dairede, kirasız yaşayacak.', 'happy', 'ter'],
    ],
    'Mirası kabul eder miydin?',
    76,
  ),
  hikaye(
    [
      ['Eski bir kumanda buldum. Üstünde tek bir tuş var: geri sar.', 'think', 'buton'],
      ['Basarsan hayatın tam on yıl geri sarılacak.', 'cheer', 'yildiz'],
      ['Bildiğin her şey aklında kalacak: maç sonuçları, borsa, her şey.', 'happy', 'para'],
      ['Ama bu on yılda tanıştığın hiç kimse seni tanımayacak.', 'sad', 'kalp'],
    ],
    'Geri sarar mıydın?',
    37,
  ),
  hikaye(
    [
      ['Senin dijital bir ikizini yaptılar. Sesin, yüzün, konuşman birebir.', 'think', 'telefon'],
      ['İkizin senin yerine toplantılara, düğünlere, aile ziyaretlerine gidebilir.', 'cheer', 'bavul'],
      ['Sen evde uyurken kimse farkı anlamıyor.', 'sleep'],
      ['Ama ikizin ne konuştuysa sen söylemiş sayılacaksın. Hepsini.', 'sad', 'ter'],
    ],
    'İkizini kullanır mıydın?',
    48,
  ),
];

/** "Kaç?" modu: fiyat ve sayı soruları dönüşümlü gelir. */
const KAC: MockQuestion[] = BANK.price.flatMap((p, i) => (BANK.number[i] ? [p, BANK.number[i]] : [p]));

/** "Hangi ünlü?": ünlüler sabit tohumla karıştırılır (art arda günlerde aynı alandan ünlü yığılmasın). */
const UNLU: MockQuestion[] = shuffled(CELEBS.map((c) => c.name), 2026).map((name) => ({
  format: 'celeb',
  prompt: 'Bugünün ünlüsü kim?',
  celeb: name,
}));

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const rnd = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const MODE_BANK: Record<DailyMode, MockQuestion[]> = { pahali: PAHALI, kac: KAC, yapar: YAPAR, unlu: UNLU };
