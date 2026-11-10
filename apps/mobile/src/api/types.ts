/** Sunucu DTO'ları (services/gunun-api/src/GununSorusu.Api/Game/Dtos.cs ile birebir). */

export type QuestionFormat = 'price' | 'number' | 'poll' | 'trivia' | 'compare' | 'celeb';
export type GuessDirection = 'higher' | 'lower' | 'correct';

/**
 * Günün dört modu (her gün aynı sırada, Loldle gibi): "Hangisi pahalı?" (compare turları),
 * "Kaç?" (yukarı/aşağı ipuçlu sayı ya da fiyat tahmini), "Yapar mıydın?" (seç + Türkiye'yi tahmin et),
 * "Hangi ünlü?" (ünlü tahmini; 8 özellik kutusu yeşil/turuncu/kırmızı yanar).
 * Gün, hepsi bitince tamamlanır; seri ve yapboz parçası tamamlanan günle gelir.
 */
export type DailyMode = 'pahali' | 'kac' | 'yapar' | 'unlu';
/** Ekrandaki sıra (Bugün'deki 2×2 kartlar: üstte pahalı ve ünlü, altta Kaç? ve Yapar). */
export const DAILY_MODES: readonly DailyMode[] = ['pahali', 'unlu', 'kac', 'yapar'];

/** Hub kartı için bir modun o günkü durumu. */
export interface ModeSummary {
  mode: DailyMode;
  format: QuestionFormat;
  /** Kartta gösterilen kısa soru metni (compare'de ilk turun sorusu). */
  teaser: string;
  started: boolean;
  finished: boolean;
  score: number | null;
  scorePending: boolean;
  solved: boolean;
  /** Paylaşım ve kart için kısa sonuç ("3/5", "4/6", "%72"). Bitmediyse null. */
  result: string | null;
  /** Paylaşımdaki renkli kareler (cevabı vermez). Anket ve bitmemiş oyunda null. */
  squares: string | null;
}

export interface DaySet {
  day: string;
  no: number;
  archive: boolean;
  modes: ModeSummary[];
  finishedCount: number;
  complete: boolean;
  /** Arşiv günleri için: ücretsiz hak bitti, ödüllü reklamla açılır (v1.1). */
  locked?: boolean;
}

/** 15 günlük seri yapbozu: her tamamlanan gün bir parça; gün kaçırılırsa parçalar dağılır. */
export interface Puzzle {
  /** Bu yapbozun resmi (lib/puzzleArt.ts kimliği). Eski sunucuda gelmez → ilk resim. */
  art?: string;
  size: number;
  /** Bu turdaki parça sayısı (0…size). */
  pieces: number;
  /** Bugün kazanıldı mı (son parça bugünün). */
  earnedToday: boolean;
  /** Şimdiye kadar tamamlanan yapboz sayısı. */
  completed: number;
}

/** Koleksiyondaki tamamlanmış bir yapboz: resim ve tamamlandığı gün. */
export interface CollectionItem {
  art: string;
  day: string;
}

/**
 * Soru görseli. Gerçek sunucuda `src` adres (metin); test sunucusunda uygulamaya gömülü dosya (require:
 * telefonda sayı, web'de nesne). Yalnız metin olan `{ uri }` içine sarılır.
 */
export interface Media {
  src: string | number;
  /** Kaynak yazısı ("Yazar · CC0 · Flickr"); görselin altında gösterilir. */
  credit: string;
}

export interface PublicRound {
  prompt: string | null;
  optionA: string;
  optionB: string;
  /** İki tarafın görselleri; ikisi de varsa kartlarda gösterilir. */
  mediaA?: Media | null;
  mediaB?: Media | null;
}

export interface PublicQuestion {
  id: number;
  no: number;
  day: string;
  format: QuestionFormat;
  prompt: string;
  mediaUrl: string | null;
  /** Kaynak yazılı görsel (mediaUrl'in yerini alır). */
  media?: Media | null;
  unit: string | null;
  cancelled: boolean;
  maxAttempts: number | null;
  hintAfterAttempts: number | null;
  timeLimitSec: number | null;
  options: string[] | null;
  rounds: PublicRound[] | null;
  /**
   * "Hangi ünlü?": tahmin edilebilecek ünlüler (ad + 8 kutunun bilgisi; cevap hangisi olduğu gizli) ve hak sayısı.
   * Bilgiler istemcide "olası ünlüler" ve "bildiklerin" için kullanılır.
   */
  celeb?: { names: string[]; people?: CelebProfile[]; maxGuesses: number } | null;
  /** Yapar mıydın?: Soro'nun anlattığı hikâye (adım adım) ve sonda bir kez sorulan Evet/Hayır sorusu. */
  story?: Story | null;
  isSponsored: boolean;
}

/** Hikâyede Soro'nun hâli (SoroFigure ile aynı adlar) ve yanındaki eşya (SoroProp). */
export type StoryMood = 'happy' | 'wave' | 'think' | 'cheer' | 'sad' | 'sleep';
export type StoryProp = 'para' | 'gozluk' | 'telefon' | 'bavul' | 'ter' | 'kalp' | 'buton' | 'mektup' | 'yildiz' | 'anahtar';

export interface StoryBeat {
  text: string;
  mood: StoryMood;
  prop?: StoryProp;
}

export interface Story {
  beats: StoryBeat[];
  /** Hikâyenin sonunda sorulan soru (seçenekler: Evet / Hayır). */
  question: string;
}

export interface Guess {
  value: number;
  direction: GuessDirection;
  close: boolean;
}

export interface NumericState {
  attemptsUsed: number;
  maxAttempts: number;
  guesses: Guess[];
  hintUsed: boolean;
  canUseHint: boolean;
  hintAfterAttempts: number;
  hint: { min: number; max: number } | null;
  /**
   * v1.1 (sunucuya henüz eklenmedi): 6 hak bitti, bilinemedi; cevap açılmadan önce
   * ödüllü reklamla 1 tahmin daha alınabilir. Eski sunucuda alan gelmez → sunulmaz.
   */
  canBuyExtraGuess?: boolean;
  extraGuessUsed?: boolean;
}

export interface TriviaState {
  options: string[];
  timeLimitSec: number;
  startedAt: string;
  deadline: string;
  chosenOption: number | null;
  elapsedMs: number | null;
  timedOut: boolean;
}

export interface CompareResult {
  round: number;
  choice: number;
  correct: boolean;
  correctChoice: number;
  valueA: string | null;
  valueB: string | null;
}

export interface CompareState {
  rounds: number;
  answered: CompareResult[];
}

export interface PollState {
  option: number;
  predictedPct: number;
  actualPct: number | null;
}

/** "Hangi ünlü?" kutuları; sıra ekrandaki sırayla aynı. */
export type CelebAttr = 'alan' | 'tur' | 'cinsiyet' | 'dogumYili' | 'dogumYeri' | 'donem' | 'hayatta' | 'basHarf';

export type CelebField = 'muzik' | 'oyunculuk' | 'spor' | 'edebiyat' | 'televizyon' | 'internet';
export type CelebRegion = 'Marmara' | 'Ege' | 'Akdeniz' | 'İç Anadolu' | 'Karadeniz' | 'Doğu Anadolu' | 'Güneydoğu Anadolu' | 'Yurt dışı';

/** Bir ünlünün oyundaki bilgileri (sonuçtaki tek cümlelik bilgi hariç). */
export interface CelebProfile {
  name: string;
  fields: CelebField[];
  /** Alan içindeki tür: Pop, Arabesk, Dizi, Futbol, YouTube… */
  genre: string;
  sex: 'k' | 'e';
  /** YYYY-AA-GG */
  birth: string;
  /** Türkiye'de il, yurt dışında ülke. */
  place: string;
  region: CelebRegion;
  alive: boolean;
  /** Ünlendiği on yıl (elle seçildi). */
  decade: number;
  /** Açık lisanslı fotoğraf ve kaynak yazısı; yoksa baş harfli yuvarlak gösterilir. */
  photo?: { url: string; credit: string } | null;
}
/** correct: aynı (yeşil) · partial: yakın (turuncu) · wrong: farklı (kırmızı). */
export type CelebStatus = 'correct' | 'partial' | 'wrong';

export interface CelebCell {
  attr: CelebAttr;
  /** Kutuda yazan değer ("1972", "Ege · Denizli", "Müzik"). */
  value: string;
  status: CelebStatus;
  /** Sayısal ve sıralı kutularda doğru cevap ne yönde: up = daha büyük/sonra, down = daha küçük/önce. */
  arrow: 'up' | 'down' | null;
}

export interface CelebGuess {
  name: string;
  correct: boolean;
  cells: CelebCell[];
}

export interface CelebState {
  maxGuesses: number;
  /** İpuçları: belli sayıda tahminden sonra açılır (bilinen işi, sonra adın kalıbı "S•••• U••••"). */
  hints?: { fact: string | null; pattern: string | null; factAfter: number; patternAfter: number };
  /** Yeniden eskiye değil, tahmin sırasıyla. */
  guesses: CelebGuess[];
  /** Oyun bitince doğru ünlünün satırı (bulunamadıysa da gösterilir). */
  answer: CelebGuess | null;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface Reveal {
  answer: number | null;
  unit: string | null;
  correctOption: number | null;
  factText: string | null;
  priceHistory: PricePoint[] | null;
  sourceText: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
}

export interface PlayState {
  questionId: number;
  no: number;
  day: string;
  /** Günlük set modu (sunucu 3 modlu yapıya geçmeden önce yoktu). */
  mode?: DailyMode;
  format: QuestionFormat;
  started: boolean;
  archive: boolean;
  cancelled: boolean;
  finished: boolean;
  score: number | null;
  scorePending: boolean;
  solved: boolean;
  numeric: NumericState | null;
  trivia: TriviaState | null;
  compare: CompareState | null;
  poll: PollState | null;
  celeb?: CelebState | null;
  reveal: Reveal | null;
  /**
   * v1.1 (sunucuya henüz eklenmedi): yalnızca arşiv günlerinde. `free`: ilk işlemde günün
   * ücretsiz arşiv hakkı kullanılır; `locked`: ödüllü reklamla açılmalı. Gelmezse kilit yok sayılır.
   */
  archiveAccess?: ArchiveAccess | null;
}

export type ArchiveAccess = 'open' | 'free' | 'locked';

export interface Crowd {
  questionId: number;
  plays: number;
  avgScore: number | null;
  histogram: number[];
  solvedPct: number | null;
  underPct: number | null;
  overPct: number | null;
  optionPcts: number[] | null;
  final: boolean;
  updatedAt: string | null;
}

export interface FormatStats {
  format: QuestionFormat;
  played: number;
  solved: number;
  avgScore: number | null;
}

export interface Stats {
  currentStreak: number;
  maxStreak: number;
  canRepairStreak: boolean;
  /** Bugünün seti tamamlandı (seri bugün için sayıldı). */
  playedToday: boolean;
  puzzle?: Puzzle;
  /** Tamamlanan yapbozlar, eskiden yeniye. */
  collection?: CollectionItem[];
  played: number;
  solved: number;
  avgScore: number | null;
  scoreSum: number;
  pendingScores: number;
  byFormat: FormatStats[];
  /** Mod başına sayılar ve Wordle tarzı dağılım (Seri sayfasındaki grafikler). Eski sunucuda gelmez. */
  byMode?: ModeStats[];
  recent: { day: string; no: number; format: QuestionFormat; score: number | null; solved: boolean }[];
}

export interface ModeStats {
  mode: DailyMode;
  played: number;
  solved: number;
  /** Puanı gece yarısı belli olacak anketler (başarı oranına girmez). */
  pending: number;
  avgScore: number | null;
  /** Kova sırası sabit (ör. Kaç?: 1…7, X); sayı o kovada biten oyun. */
  distribution: { label: string; count: number }[];
  /** En son oyunun kovası (grafikte vurgulanır); oyun yoksa null. */
  lastBucket: number | null;
}

// --- Günün sıralaması (yalnız test sunucusunda) ---

/** Gün bitince: oyuncuların yüzde kaçından iyi olduğun, mod mod ve genel. */
export interface DayRank {
  day: string;
  /** Mod yüzdeliklerinin ortalaması; hiçbiri hazır değilse null. */
  overall: number | null;
  /** Günü oynayan (simüle) oyuncu sayısı. */
  players: number;
  modes: { mode: DailyMode; percentile: number | null; pending: boolean }[];
}

// --- Premium abonelik (yalnız test sunucusunda; aylık, lib/premium.ts) ---

export interface PremiumState {
  active: boolean;
  /** Dönemin bittiği an; aktif değilse null. */
  renewsAt: string | null;
  /** false: iptal edildi, dönem sonunda biter. */
  autoRenew: boolean;
  price: string;
}

// --- Sınırsız "Hangisi pahalı?" (premium; yalnız test sunucusunda) ---

/** Pratik turunda cevap istemcide değerlendirilir (puan seriyi etkilemez). */
export interface PracticeRound extends PublicRound {
  correct: 0 | 1;
  valueA: string;
  valueB: string;
}

export interface PracticeState {
  /** Sınırsız mod premium özelliği. */
  premium: boolean;
  /** Günün "Hangisi pahalı?" oyunu bitince açılır (günün fiyatlarını ele vermesin). */
  unlocked: boolean;
  setsToday: number;
  /** Bir sette en çok doğru. */
  best: number;
  totalCorrect: number;
  /** Açık set; bittiyse `finished` true. */
  set: { no: number; rounds: PracticeRound[]; finished: boolean; correct: number | null } | null;
}

export interface Me {
  playerId: string;
  displayName: string | null;
  city: string | null;
  notifyHour: number;
  createdAt: string;
}
