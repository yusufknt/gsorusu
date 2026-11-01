/**
 * Uygulama içi test verisi. Değerler yaklaşıktır ve yalnızca deneme içindir; gerçek sorular
 * sunucudan, doğrulanmış kaynaklarla gelir.
 */
import type { PricePoint, QuestionFormat } from '../api/types';

export interface MockQuestion {
  format: QuestionFormat;
  prompt: string;
  unit?: string;
  answer?: number;
  options?: string[];
  correctOption?: number;
  rounds?: { prompt?: string; a: string; b: string; correct: 0 | 1; valueA: string; valueB: string }[];
  fact?: string;
  priceHistory?: PricePoint[];
  /** "Türkiye ne diyor?" için simüle edilen oy dağılımı (ağırlıklar). */
  pollWeights?: number[];
}

export const SOURCE_TEXT = 'Test verisi — değerler yaklaşıktır';

export const BANK: Record<QuestionFormat, MockQuestion[]> = {
  price: [
    {
      format: 'price',
      prompt: 'İstanbul’da bir simit kaç TL?',
      unit: 'TL',
      answer: 20,
      fact: 'Simit fiyatını belediye ile esnaf odası birlikte belirler; ilçeye göre küçük farklar olabilir.',
      priceHistory: [
        { date: '2025-11-01', price: 15 },
        { date: '2023-11-01', price: 7.5 },
      ],
    },
    {
      format: 'price',
      prompt: '1 litre tam yağlı süt kaç TL?',
      unit: 'TL',
      answer: 45,
      fact: 'Çiğ süt fiyatı yılda birkaç kez Ulusal Süt Konseyi tarafından açıklanır; raf fiyatı buna göre değişir.',
      priceHistory: [
        { date: '2025-11-01', price: 34 },
        { date: '2023-11-01', price: 18 },
      ],
    },
    {
      format: 'price',
      prompt: '6’lı ince belli çay bardağı seti kaç TL?',
      unit: 'TL',
      answer: 180,
      fact: 'İnce belli bardak, çayın rengini göstermesi ve elde kolay tutulması için yaygınlaştı.',
      priceHistory: [{ date: '2025-11-01', price: 140 }],
    },
    {
      format: 'price',
      prompt: 'Bir kafede orta boy Türk kahvesi kaç TL?',
      unit: 'TL',
      answer: 120,
      fact: 'Türk kahvesi kültürü ve geleneği 2013’te UNESCO Somut Olmayan Kültürel Miras listesine girdi.',
      priceHistory: [
        { date: '2025-11-01', price: 90 },
        { date: '2023-11-01', price: 45 },
      ],
    },
    {
      format: 'price',
      prompt: '1 kg domates (semt pazarı) kaç TL?',
      unit: 'TL',
      answer: 40,
      fact: 'Domates fiyatı mevsime göre en çok oynayan ürünlerden; kışın sera üretimi fiyatı yukarı çeker.',
      priceHistory: [{ date: '2025-11-01', price: 30 }],
    },
  ],
  number: [
    { format: 'number', prompt: 'Galata Kulesi kaç metre?', unit: 'm', answer: 63, fact: 'Kule 1348’de Cenevizliler tarafından inşa edildi.' },
    {
      format: 'number',
      prompt: 'Boğaziçi Köprüsü’nün iki ayağı arası kaç metre?',
      unit: 'm',
      answer: 1074,
      fact: 'Köprü 1973’te, Cumhuriyet’in 50. yılında açıldı.',
    },
    { format: 'number', prompt: 'Ağrı Dağı kaç metre?', unit: 'm', answer: 5137, fact: 'Türkiye’nin en yüksek dağıdır.' },
    { format: 'number', prompt: 'İstanbul’da kaç ilçe var?', unit: 'ilçe', answer: 39, fact: '25’i Avrupa, 14’ü Anadolu yakasındadır.' },
    { format: 'number', prompt: 'Van Gölü’nün yüzölçümü kaç km²?', unit: 'km²', answer: 3713, fact: 'Dünyanın en büyük sodalı göllerinden biridir.' },
  ],
  poll: [
    { format: 'poll', prompt: 'Kahvaltıda çay mı, kahve mi?', options: ['Çay', 'Kahve', 'İkisi de', 'Hiçbiri'], pollWeights: [62, 14, 20, 4] },
    { format: 'poll', prompt: 'Menemen soğanlı mı olur, soğansız mı?', options: ['Soğanlı', 'Soğansız'], pollWeights: [47, 53] },
    { format: 'poll', prompt: 'Tatilde deniz mi, dağ mı?', options: ['Deniz', 'Dağ', 'Şehir turu'], pollWeights: [58, 24, 18] },
    { format: 'poll', prompt: 'Simit mi, poğaça mı?', options: ['Simit', 'Poğaça', 'Açma'], pollWeights: [44, 38, 18] },
    { format: 'poll', prompt: 'Sabah insanı mısın, gece kuşu mu?', options: ['Sabah insanı', 'Gece kuşu'], pollWeights: [41, 59] },
  ],
  trivia: [
    {
      format: 'trivia',
      prompt: 'Tamamı Türkiye sınırları içinde kalan en uzun nehir hangisi?',
      options: ['Fırat', 'Kızılırmak', 'Sakarya', 'Dicle'],
      correctOption: 1,
      fact: 'Kızılırmak yaklaşık 1.355 km uzunluğundadır ve Karadeniz’e dökülür.',
    },
    {
      format: 'trivia',
      prompt: 'Pamukkale travertenleri hangi ildedir?',
      options: ['Muğla', 'Aydın', 'Denizli', 'Isparta'],
      correctOption: 2,
      fact: 'Pamukkale ve antik Hierapolis kenti 1988’den beri UNESCO Dünya Mirası listesinde.',
    },
    {
      format: 'trivia',
      prompt: 'Mimar Sinan’ın “ustalık eserim” dediği cami hangisi?',
      options: ['Süleymaniye', 'Şehzade', 'Selimiye', 'Mihrimah Sultan'],
      correctOption: 2,
      fact: 'Edirne’deki Selimiye Camii 1575’te tamamlandı.',
    },
    {
      format: 'trivia',
      prompt: 'İstanbul Boğazı hangi iki denizi birbirine bağlar?',
      options: ['Karadeniz – Marmara', 'Marmara – Ege', 'Ege – Akdeniz', 'Karadeniz – Ege'],
      correctOption: 0,
      fact: 'Boğaz yaklaşık 31 km uzunluğundadır.',
    },
    {
      format: 'trivia',
      prompt: 'Türk bayrağındaki yıldızın kaç köşesi vardır?',
      options: ['4', '5', '6', '8'],
      correctOption: 1,
      fact: 'Bayrağın ölçüleri 1936 tarihli Türk Bayrağı Kanunu ile belirlenmiştir.',
    },
  ],
  compare: [
    {
      format: 'compare',
      prompt: 'Hangisi daha kalabalık?',
      rounds: [
        { a: 'Norveç', b: 'İzmir', correct: 0, valueA: '~5,5 milyon', valueB: '~4,5 milyon' },
        { a: 'İstanbul', b: 'Londra', correct: 0, valueA: '~15,7 milyon', valueB: '~9 milyon' },
        { a: 'Estonya', b: 'Bursa', correct: 1, valueA: '~1,4 milyon', valueB: '~3,2 milyon' },
        { a: 'Konya', b: 'Slovenya', correct: 0, valueA: '~2,3 milyon', valueB: '~2,1 milyon' },
        { a: 'Kıbrıs adası', b: 'Antalya', correct: 1, valueA: '~1,3 milyon', valueB: '~2,7 milyon' },
      ],
      fact: 'Türkiye’nin en kalabalık 5 ili: İstanbul, Ankara, İzmir, Bursa, Antalya.',
    },
    {
      format: 'compare',
      prompt: 'Hangisi daha uzun / yüksek?',
      rounds: [
        { prompt: 'Hangisi daha yüksek?', a: 'Ağrı Dağı', b: 'Erciyes', correct: 0, valueA: '5.137 m', valueB: '3.917 m' },
        { prompt: 'Hangisi daha uzun?', a: 'Sakarya Nehri', b: 'Kızılırmak', correct: 1, valueA: '~824 km', valueB: '~1.355 km' },
        { prompt: 'Hangisi daha uzun?', a: 'Osmangazi Köprüsü', b: 'Boğaziçi Köprüsü', correct: 0, valueA: '~2.682 m', valueB: '~1.560 m' },
        { prompt: 'Hangisi daha yüksek?', a: 'Galata Kulesi', b: 'Kız Kulesi', correct: 0, valueA: '~63 m', valueB: '~23 m' },
        { prompt: 'Hangisi daha büyük?', a: 'Tuz Gölü', b: 'Van Gölü', correct: 1, valueA: '~1.500 km²', valueB: '~3.713 km²' },
      ],
      fact: 'Osmangazi Köprüsü açıldığında dünyanın en uzun 4. asma köprüsüydü.',
    },
  ],
};

/** Plan A3, MVP haftası. */
export function formatForWeekday(weekday: number): QuestionFormat {
  return (['poll', 'price', 'number', 'poll', 'trivia', 'price', 'compare'] as const)[weekday];
}
