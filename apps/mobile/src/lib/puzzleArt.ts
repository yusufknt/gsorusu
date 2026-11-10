/**
 * Seri yapbozlarının resimleri (saf; testte de kullanılır). Her 15 günlük yapboz sıradaki resimle başlar;
 * tamamlanan resim koleksiyona girer. Sıra sabit: herkesin 1. yapbozu Soro'nun İstanbul'da doğuşu.
 * Fotoğraflar yalnız CC0 ya da kamu malı (Openverse, Wikimedia Commons). Dosyalar: assets/puzzles/<id>.jpg.
 */
export interface PuzzleArt {
  id: string;
  title: string;
  /** Koleksiyon kartındaki kısa alt yazı. */
  place: string;
  credit: string;
}

export const PUZZLE_ART: readonly PuzzleArt[] = [
  { id: 'istanbul', title: 'Soro İstanbul’da doğuyor', place: 'İstanbul', credit: 'Günün Sorusu ?' },
  { id: 'kapadokya', title: 'Kapadokya’da balonlar', place: 'Nevşehir', credit: 'Netha Hussain · CC0 · Wikimedia Commons' },
  { id: 'galata', title: 'Galata Kulesi', place: 'İstanbul', credit: 'CC0 · rawpixel' },
  { id: 'efes', title: 'Efes, Celsus Kütüphanesi', place: 'İzmir', credit: 'CC0 · rawpixel' },
  { id: 'kizkulesi', title: 'Kız Kulesi', place: 'İstanbul', credit: 'dancetrax · Kamu malı · Flickr' },
  { id: 'ayasofya', title: 'Ayasofya', place: 'İstanbul', credit: 'Julien Maury · Kamu malı · Flickr' },
];

/** k'ıncı yapbozun (0'dan) resmi; liste bitince başa döner. */
export function artFor(index: number): PuzzleArt {
  return PUZZLE_ART[((index % PUZZLE_ART.length) + PUZZLE_ART.length) % PUZZLE_ART.length];
}

export function artById(id: string): PuzzleArt {
  return PUZZLE_ART.find((a) => a.id === id) ?? PUZZLE_ART[0];
}
