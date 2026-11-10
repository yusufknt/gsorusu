/** Sorunun istemciye giden hâli (cevap ve değerler gizli). */
import type { PublicQuestion } from '../api/types';
import { CELEB } from '../lib/celeb';
import { CELEBS, publicProfiles } from './celebs';
import { mediaOf } from './media';
import type { ResolvedQuestion } from './questions';
import * as R from './rules';

const CELEB_NAMES = CELEBS.map((c) => c.name).sort((a, b) => a.localeCompare(b, 'tr'));

export function toPublic(q: ResolvedQuestion): PublicQuestion {
  const numeric = q.format === 'price' || q.format === 'number';
  return {
    id: q.id,
    no: q.no,
    day: q.day,
    format: q.format,
    prompt: q.prompt,
    mediaUrl: null,
    media: mediaOf(q.media),
    unit: q.unit ?? null,
    cancelled: false,
    maxAttempts: numeric ? R.NUMERIC.maxAttempts : null,
    hintAfterAttempts: numeric ? R.NUMERIC.hintAfter : null,
    timeLimitSec: q.format === 'trivia' ? R.TRIVIA.limitMs / 1000 : null,
    options: q.format === 'poll' ? (q.options ?? null) : null,
    rounds: q.format === 'compare' ? (q.rounds ?? []).map((r) => ({ prompt: r.prompt ?? null, optionA: r.a, optionB: r.b, mediaA: mediaOf(r.mediaA), mediaB: mediaOf(r.mediaB) })) : null,
    celeb: q.format === 'celeb' ? { names: CELEB_NAMES, people: publicProfiles(), maxGuesses: CELEB.maxGuesses } : null,
    story: q.story ?? null,
    isSponsored: false,
  };
}
