/**
 * Yapar mıydın? hikâyesi (saf; testte de kullanılır). Soro hikâyeyi adım adım anlatır; her adımda hâli ve
 * yanındaki eşya değişir. Sonda soru bir kez sorulur: Evet (0) ya da Hayır (1).
 */
import type { Story } from '../api/types';

export const STORY_OPTIONS = ['Evet, yapardım', 'Hayır, yapmazdım'] as const;

/** Bir hikâyede en az ve en fazla adım (çok kısa merak uyandırmaz, çok uzun sıkar). */
export const STORY_BEATS = { min: 3, max: 5 } as const;
/** Bir adımın en uzun metni (telefonda balon iki-üç satırı geçmesin). */
export const BEAT_MAX_CHARS = 120;

export function isValidStory(s: Story): boolean {
  return (
    s.beats.length >= STORY_BEATS.min &&
    s.beats.length <= STORY_BEATS.max &&
    s.beats.every((b) => b.text.trim().length > 0 && b.text.length <= BEAT_MAX_CHARS) &&
    /\?$/.test(s.question.trim())
  );
}

/** Tahmin sorusu: oyuncunun cevabını Türkiye'nin yüzde kaçı verdi? */
export function predictionPrompt(option: number): string {
  return option === 0 ? 'Türkiye’nin yüzde kaçı da evet dedi?' : 'Türkiye’nin yüzde kaçı da hayır dedi?';
}
