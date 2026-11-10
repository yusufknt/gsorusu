/** Yapboz resimlerinin uygulamaya gömülü dosyaları (lib/puzzleArt.ts ile aynı kimlikler). */
const FILES: Record<string, number> = {
  istanbul: require('../../../assets/puzzles/istanbul.jpg'),
  kapadokya: require('../../../assets/puzzles/kapadokya.jpg'),
  galata: require('../../../assets/puzzles/galata.jpg'),
  efes: require('../../../assets/puzzles/efes.jpg'),
  kizkulesi: require('../../../assets/puzzles/kizkulesi.jpg'),
  ayasofya: require('../../../assets/puzzles/ayasofya.jpg'),
};

export function puzzleImage(id: string): number {
  return FILES[id] ?? FILES.istanbul;
}
