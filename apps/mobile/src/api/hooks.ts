import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type { Crowd, DailyMode, DayRank, DaySet, Me, PlayState, PracticeState, PremiumState, PublicQuestion, Stats } from './types';

export const keys = {
  day: (day: string) => ['day', day] as const,
  question: (day: string, mode: DailyMode) => ['question', day, mode] as const,
  play: (day: string, mode: DailyMode) => ['play', day, mode] as const,
  crowd: (day: string, mode: DailyMode) => ['crowd', day, mode] as const,
  stats: ['stats'] as const,
  archive: ['archive'] as const,
  me: ['me'] as const,
  rank: (day: string) => ['rank', day] as const,
  practice: ['practice', 'pahali'] as const,
  premium: ['premium'] as const,
};

/** Günün dört modlu seti; day verilmezse bugün. */
export function useDay(day?: string) {
  return useQuery({ queryKey: keys.day(day ?? 'today'), queryFn: () => api<DaySet>('GET', day ? `/days/${day}` : '/days/today') });
}

export function useQuestion(day: string | undefined, mode: DailyMode) {
  return useQuery({ queryKey: keys.question(day ?? '', mode), queryFn: () => api<PublicQuestion>('GET', `/q/${day}/${mode}`), enabled: !!day });
}

export function usePlay(day: string | undefined, mode: DailyMode) {
  return useQuery({ queryKey: keys.play(day ?? '', mode), queryFn: () => api<PlayState>('GET', `/plays/${day}/${mode}`), enabled: !!day });
}

export function useCrowd(day: string, mode: DailyMode, enabled: boolean) {
  return useQuery({
    queryKey: keys.crowd(day, mode),
    queryFn: () => api<Crowd>('GET', `/q/${day}/${mode}/crowd`),
    enabled,
    refetchInterval: 5 * 60_000,
  });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => api<Stats>('GET', '/stats/me') });
}

/** Son 7 günün setleri. */
export function useArchive() {
  return useQuery({ queryKey: keys.archive, queryFn: () => api<DaySet[]>('GET', '/plays/archive') });
}

/** Ödüllü reklamdan sonra kilitli arşiv gününü açar. */
export function useUnlockDay(day: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<DaySet>('POST', `/days/${day}/unlock`),
    onSuccess: (set) => {
      qc.setQueryData(keys.day(day), set);
      void qc.invalidateQueries({ queryKey: keys.archive });
    },
  });
}

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => api<Me>('GET', '/me') });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pick<Me, 'displayName' | 'city' | 'notifyHour'>>) => api<Me>('PATCH', '/me', body),
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  });
}

export type PlayAction =
  | { kind: 'start' }
  | { kind: 'guess'; value: number }
  | { kind: 'hint' }
  /** Ödüllü reklamdan sonra: 7. tahmin hakkı. */
  | { kind: 'extra' }
  /** Ek tahmin istemeyen oyuncu cevabı görür. */
  | { kind: 'reveal' }
  /** Ödüllü reklamdan sonra: kilitli arşiv gününü açar. */
  | { kind: 'unlock' }
  | { kind: 'answer'; option: number }
  | { kind: 'compare'; round: number; choice: number }
  | { kind: 'poll'; option: number; predictedPct: number }
  /** "Hangi ünlü?" tahmini (listedeki tam ad). */
  | { kind: 'celeb'; name: string };

/** Tüm oyun işlemleri; sunucunun döndürdüğü güncel durum önbelleğe yazılır. */
export function usePlayAction(day: string, mode: DailyMode) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: PlayAction) => {
      const path = `/plays/${day}/${mode}`;
      switch (a.kind) {
        case 'start':
          return api<PlayState>('POST', `${path}/start`);
        case 'guess':
          return api<PlayState>('POST', `${path}/guess`, { value: a.value });
        case 'hint':
          return api<PlayState>('POST', `${path}/hint`);
        case 'extra':
          return api<PlayState>('POST', `${path}/extra`);
        case 'reveal':
          return api<PlayState>('POST', `${path}/reveal`);
        case 'unlock':
          return api<PlayState>('POST', `${path}/unlock`);
        case 'answer':
          return api<PlayState>('POST', `${path}/answer`, { option: a.option });
        case 'compare':
          return api<PlayState>('POST', `${path}/compare`, { round: a.round, choice: a.choice });
        case 'poll':
          return api<PlayState>('POST', `${path}/poll`, { option: a.option, predictedPct: a.predictedPct });
        case 'celeb':
          return api<PlayState>('POST', `${path}/celeb`, { name: a.name });
      }
    },
    onSuccess: (state) => {
      qc.setQueryData(keys.play(day, mode), state);
      // Hub kartları (başladı/bitti/sonuç) her işlemde güncellenir.
      void qc.invalidateQueries({ queryKey: ['day'] });
      // Arşivde ilk işlem günün ücretsiz hakkını kullanır; listedeki kilitler değişir.
      if (state.archive) void qc.invalidateQueries({ queryKey: keys.archive });
      if (state.finished) {
        void qc.invalidateQueries({ queryKey: keys.stats });
        void qc.invalidateQueries({ queryKey: keys.archive });
        void qc.invalidateQueries({ queryKey: keys.crowd(day, mode) });
        // Pahalı bitince sınırsız mod açılır.
        void qc.invalidateQueries({ queryKey: keys.practice });
        void qc.invalidateQueries({ queryKey: ['rank'] });
      }
    },
    // Çakışmada (ör. iki cihazdan aynı anda) en güncel durumu sunucudan al.
    onError: () => void qc.invalidateQueries({ queryKey: keys.play(day, mode) }),
  });
}

export function useStreakRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<unknown>('POST', '/streak/repair'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.stats });
      void qc.invalidateQueries({ queryKey: ['day'] });
    },
  });
}

/** Gün bitince: oyuncuların yüzde kaçından iyi olduğun. */
export function useDayRank(day: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: keys.rank(day ?? ''), queryFn: () => api<DayRank>('GET', `/days/${day}/rank`), enabled: enabled && !!day });
}

// --- Sınırsız "Hangisi pahalı?" ---

export function usePractice() {
  return useQuery({ queryKey: keys.practice, queryFn: () => api<PracticeState>('GET', '/practice/pahali') });
}

function usePracticeMutation<V>(fn: (v: V) => Promise<PracticeState>, after?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (state) => {
      qc.setQueryData(keys.practice, state);
      after?.();
    },
  });
}

/** Yeni 10 turluk set (premium; sınırsız). */
export function useOpenPracticeSet() {
  return usePracticeMutation(() => api<PracticeState>('POST', '/practice/pahali/sets'));
}

export function useFinishPracticeSet() {
  return usePracticeMutation((correct: number) => api<PracticeState>('POST', '/practice/pahali/finish', { correct }));
}

// --- Premium (aylık abonelik) ---

export function usePremium() {
  return useQuery({ queryKey: keys.premium, queryFn: () => api<PremiumState>('GET', '/me/premium'), staleTime: 5 * 60_000 });
}

function usePremiumMutation(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<PremiumState>('POST', path),
    onSuccess: (state) => {
      qc.setQueryData(keys.premium, state);
      void qc.invalidateQueries({ queryKey: keys.practice });
    },
  });
}

/** Test satın alması; gerçek sürümde mağaza aboneliği başlatılır, sunucu makbuzu doğrular. */
export function usePurchasePremium() {
  return usePremiumMutation('/me/premium/purchase');
}

/** İptal: dönem sonuna kadar premium sürer. */
export function useCancelPremium() {
  return usePremiumMutation('/me/premium/cancel');
}
