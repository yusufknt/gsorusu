import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type { ArchiveItem, Crowd, Me, PlayState, PublicQuestion, Stats } from './types';

export const keys = {
  question: (day: string) => ['question', day] as const,
  play: (day: string) => ['play', day] as const,
  crowd: (day: string) => ['crowd', day] as const,
  stats: ['stats'] as const,
  archive: ['archive'] as const,
  me: ['me'] as const,
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
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  });
}

export type PlayAction =
  | { kind: 'start' }
  | { kind: 'guess'; value: number }
  | { kind: 'hint' }
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
      if (state.finished) {
        void qc.invalidateQueries({ queryKey: keys.stats });
        void qc.invalidateQueries({ queryKey: keys.archive });
        void qc.invalidateQueries({ queryKey: keys.crowd(day) });
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
