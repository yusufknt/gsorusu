import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type { ArchiveItem, Crowd, League, LeagueSummary, Me, PlayState, PublicQuestion, Stats } from './types';

export const keys = {
  question: (day: string) => ['question', day] as const,
  play: (day: string) => ['play', day] as const,
  crowd: (day: string) => ['crowd', day] as const,
  stats: ['stats'] as const,
  archive: ['archive'] as const,
  me: ['me'] as const,
  leagues: ['leagues'] as const,
  league: (id: string, week: string | null) => ['leagues', id, week ?? 'current'] as const,
};

/** day verilmezse bugünün sorusu. */
export function useQuestion(day?: string) {
  return useQuery({
    queryKey: keys.question(day ?? 'today'),
    queryFn: () => api<PublicQuestion>('GET', day ? `/q/${day}` : '/q/today'),
  });
}

export function usePlay(day: string | undefined) {
  return useQuery({
    queryKey: keys.play(day ?? ''),
    queryFn: () => api<PlayState>('GET', `/plays/${day}`),
    enabled: !!day,
  });
}

export function useCrowd(day: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.crowd(day),
    queryFn: () => api<Crowd>('GET', `/q/${day}/crowd`),
    enabled,
    refetchInterval: 5 * 60_000,
  });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => api<Stats>('GET', '/stats/me') });
}

export function useArchive() {
  return useQuery({ queryKey: keys.archive, queryFn: () => api<ArchiveItem[]>('GET', '/plays/archive') });
}

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => api<Me>('GET', '/me') });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Pick<Me, 'displayName' | 'city' | 'notifyHour'>>) => api<Me>('PATCH', '/me', body),
    onSuccess: (me) => {
      qc.setQueryData(keys.me, me);
      // Görünen ad liglerdeki sıralamada da görünür.
      void qc.invalidateQueries({ queryKey: keys.leagues });
    },
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
  | { kind: 'poll'; option: number; predictedPct: number };

/** Tüm oyun işlemleri; sunucunun döndürdüğü güncel durum önbelleğe yazılır. */
export function usePlayAction(day: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: PlayAction) => {
      const path = `/plays/${day}`;
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
      }
    },
    onSuccess: (state) => {
      qc.setQueryData(keys.play(day), state);
      // Arşivde ilk işlem günün ücretsiz hakkını kullanır; listedeki kilitler değişir.
      if (state.archive) void qc.invalidateQueries({ queryKey: keys.archive });
      if (state.finished) {
        void qc.invalidateQueries({ queryKey: keys.stats });
        void qc.invalidateQueries({ queryKey: keys.archive });
        void qc.invalidateQueries({ queryKey: keys.crowd(day) });
        void qc.invalidateQueries({ queryKey: keys.leagues });
      }
    },
    // Çakışmada (ör. iki cihazdan aynı anda) en güncel durumu sunucudan al.
    onError: () => void qc.invalidateQueries({ queryKey: keys.play(day) }),
  });
}

export function useStreakRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<unknown>('POST', '/streak/repair'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.stats }),
  });
}

// --- Arkadaş ligi ---

export function useLeagues() {
  return useQuery({ queryKey: keys.leagues, queryFn: () => api<LeagueSummary[]>('GET', '/leagues') });
}

/** week: haftanın Pazartesisi; null = bu hafta. */
export function useLeague(id: string | undefined, week: string | null) {
  return useQuery({
    queryKey: keys.league(id ?? '', week),
    queryFn: () => api<League>('GET', week ? `/leagues/${id}?week=${week}` : `/leagues/${id}`),
    enabled: !!id,
    // Hafta değiştirirken eski tablo yerinde kalsın, ekran boşalıp dolmasın.
    placeholderData: keepPreviousData,
  });
}

function useLeagueMutation<V>(fn: (v: V) => Promise<League>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (league) => {
      qc.setQueryData(keys.league(league.id, null), league);
      void qc.invalidateQueries({ queryKey: keys.leagues, refetchType: 'active' });
    },
  });
}

export function useCreateLeague() {
  return useLeagueMutation((name: string) => api<League>('POST', '/leagues', { name }));
}

export function useJoinLeague() {
  return useLeagueMutation((code: string) => api<League>('POST', '/leagues/join', { code }));
}

/** Başka bir üyeyi çıkarır (yalnızca lig sahibi). */
export function useRemoveMember(leagueId: string) {
  return useLeagueMutation((playerId: string) => api<League>('DELETE', `/leagues/${leagueId}/members/${playerId}`));
}

export function useLeaveLeague(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (myId: string) => api<void>('DELETE', `/leagues/${leagueId}/members/${myId}`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['leagues', leagueId] });
      void qc.invalidateQueries({ queryKey: keys.leagues });
    },
  });
}
