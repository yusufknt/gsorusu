/**
 * Soru görsellerinin kaynak yazıları (saf; testte de kullanılır). Görseller yalnız CC0 ya da kamu malı
 * (Openverse ve Wikimedia Commons üzerinden; Flickr, rawpixel, StockSnap). Atıf yasal olarak gerekmese de kaynak gösterilir.
 * Dosyalar: assets/questions/<anahtar>.jpg (640 px). Eşleme: mock/media.ts.
 */
export const MEDIA_CREDITS = {
  sut: 'Alabama Extension · CC0 · Flickr',
  turk_kahvesi: 'Travel Coffee Book · CC0 · StockSnap',
  galata: 'Frantisek_Trampota · Kamu malı · Flickr',
  agri: 'fz1844 · Kamu malı · Flickr',
  istanbul: 'lensnmatter · CC0 · Flickr',
  kahve_cekirdek: 'CC0 · rawpixel',
  cay_yapragi: 'mkniebes · CC0 · Flickr',
  antep_fistigi: 'jlcampbell104 · CC0 · Flickr',
  vanilya: 'mtnmapper · Kamu malı · Flickr',
  piramit: 'w_lemay · CC0 · Flickr',
  eyfel: 'Mustang Joe · CC0 · Flickr',
  domates: 'Krzysztof Puszczyński · CC0 · StockSnap',
  kiyma: 'Gary Lee Todd, Ph.D. · CC0 · Flickr',
  dolar: 'athrasher · CC0 · Flickr',
  tereyagi: 'Meanos · Kamu malı · Wikimedia Commons',
  bal: 'Krzysztof Puszczyński · CC0 · StockSnap',
  muz: 'Wallboat · CC0 · Flickr',
  cilek: 'Fried Dough · Kamu malı · Flickr',
  somon: 'Jakub Kapusnak · CC0 · rawpixel',
  avokado: 'CC0 · rawpixel',
  tacmahal: 'Unseen Horizons · CC0 · Flickr',
  kolezyum: 'Image Catalog · CC0 · Flickr',
  balon: 'CC0 · rawpixel',
  gondol: 'Travel Coffee Book · CC0 · StockSnap',
  gul: 'CC0 · rawpixel',
  kaktus: 'CC0 · rawpixel',
  bisiklet: 'Bernard Spragg · CC0 · Flickr',
  gitar: 'Wilfred Iven · CC0 · StockSnap',
  piyano: 'Open Grid Scheduler · CC0 · Flickr',
  kaykay: 'Rawpixel Ltd · CC0 · Flickr',
} as const;

export type MediaKey = keyof typeof MEDIA_CREDITS;
