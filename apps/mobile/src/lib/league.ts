/**
 * Lig kodu kuralları (GununSorusu.Domain/Leagues/League.cs ile aynı). Ekranlar kodu yazarken
 * anında doğrulamak için, test sunucusu da kod üretmek için kullanır.
 */

export const LEAGUE = { maxMembers: 50, maxPerPlayer: 10, nameMin: 2, nameMax: 30, codeLength: 6 } as const;

/** 0, O, 1 ve I yok: sesli okunurken ve elle yazılırken karışmasın. */
export const LEAGUE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** "k7p-2qx" → "K7P2QX"; geçerli bir kod değilse null. Türkçe i/ı/İ alfabede olmayan "I" sayılır. */
export function normalizeLeagueCode(input: string | null | undefined): string | null {
  if (input == null) return null;
  const chars = [...input]
    .filter((ch) => !/\s/.test(ch) && ch !== '-')
    .map((ch) => (ch === 'ı' || ch === 'i' || ch === 'İ' ? 'I' : ch.toUpperCase()));
  return chars.length === LEAGUE.codeLength && chars.every((ch) => LEAGUE_CODE_ALPHABET.includes(ch)) ? chars.join('') : null;
}

export function generateLeagueCode(random: () => number = Math.random): string {
  return Array.from({ length: LEAGUE.codeLength }, () => LEAGUE_CODE_ALPHABET[Math.floor(random() * LEAGUE_CODE_ALPHABET.length)]).join('');
}

/** Lig haftasının Pazartesisi ("2026-12-10" → "2026-12-07"). */
export function weekStart(day: string): string {
  const date = new Date(Date.parse(`${day}T00:00:00Z`));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
