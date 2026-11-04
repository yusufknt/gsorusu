/** Sunucu DTO'ları (services/gunun-api/src/GununSorusu.Api/Game/Dtos.cs ile birebir). */

export type QuestionFormat = 'price' | 'number' | 'poll' | 'trivia' | 'compare';
export type GuessDirection = 'higher' | 'lower' | 'correct';

export interface PublicRound {
  prompt: string | null;
  optionA: string;
  optionB: string;
}

export interface PublicQuestion {
  id: number;
  no: number;
  day: string;
  format: QuestionFormat;
  prompt: string;
  mediaUrl: string | null;
  unit: string | null;
  cancelled: boolean;
  maxAttempts: number | null;
  hintAfterAttempts: number | null;
  timeLimitSec: number | null;
  options: string[] | null;
  rounds: PublicRound[] | null;
  isSponsored: boolean;
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
  reveal: Reveal | null;
}

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
  playedToday: boolean;
  played: number;
  solved: number;
  avgScore: number | null;
  scoreSum: number;
  pendingScores: number;
  byFormat: FormatStats[];
  recent: { day: string; no: number; format: QuestionFormat; score: number | null; solved: boolean }[];
}

export interface ArchiveItem {
  day: string;
  no: number;
  format: QuestionFormat;
  prompt: string;
  cancelled: boolean;
  started: boolean;
  finished: boolean;
  score: number | null;
  playedFromArchive: boolean;
}

export interface Me {
  playerId: string;
  displayName: string | null;
  city: string | null;
  notifyHour: number;
  createdAt: string;
}

// --- Arkadaş ligi (services/gunun-api/src/GununSorusu.Api/Leagues/LeagueEndpoints.cs) ---

export interface LeagueSummary {
  id: string;
  code: string;
  name: string;
  isOwner: boolean;
  memberCount: number;
  /** Bu haftaki sıran; eşit puanda aynı sıra. */
  myRank: number;
  myTotal: number;
  /** Üyelerden bugünün sorusunu bitirenler. */
  playedToday: number;
  /** Haftanın lideri; henüz kimse puan almadıysa null. */
  leaderName: string | null;
}

export interface LeagueDay {
  day: string;
  /** O günün soru numarası; soru yoksa ya da gün gelmediyse null. */
  no: number | null;
  format: QuestionFormat | null;
  /** İptal edilen soru haftalık toplama girmez. */
  cancelled: boolean;
  future: boolean;
}

export interface LeagueWeek {
  start: string;
  end: string;
  isCurrent: boolean;
  previous: string | null;
  next: string | null;
  days: LeagueDay[];
}

/** played && score === null: anket puanı gün bitince kesinleşir. */
export interface LeagueCell {
  played: boolean;
  score: number | null;
}

export interface LeagueStanding {
  playerId: string;
  displayName: string;
  isMe: boolean;
  isOwner: boolean;
  rank: number;
  total: number;
  played: number;
  /** Pazartesi → Pazar. */
  days: LeagueCell[];
}

export interface League {
  id: string;
  code: string;
  name: string;
  isOwner: boolean;
  memberCount: number;
  maxMembers: number;
  week: LeagueWeek;
  standings: LeagueStanding[];
}
