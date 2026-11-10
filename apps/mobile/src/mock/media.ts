/** Soru görsellerinin uygulamaya gömülü dosyaları (yalnız test sunucusu; gerçek sunucu adres döndürür). */
import type { Media } from '../api/types';
import { MEDIA_CREDITS, type MediaKey } from './mediaCredits';

const FILES: Record<MediaKey, number> = {
  sut: require('../../assets/questions/sut.jpg'),
  turk_kahvesi: require('../../assets/questions/turk_kahvesi.jpg'),
  galata: require('../../assets/questions/galata.jpg'),
  agri: require('../../assets/questions/agri.jpg'),
  istanbul: require('../../assets/questions/istanbul.jpg'),
  kahve_cekirdek: require('../../assets/questions/kahve_cekirdek.jpg'),
  cay_yapragi: require('../../assets/questions/cay_yapragi.jpg'),
  antep_fistigi: require('../../assets/questions/antep_fistigi.jpg'),
  vanilya: require('../../assets/questions/vanilya.jpg'),
  piramit: require('../../assets/questions/piramit.jpg'),
  eyfel: require('../../assets/questions/eyfel.jpg'),
  domates: require('../../assets/questions/domates.jpg'),
  kiyma: require('../../assets/questions/kiyma.jpg'),
  dolar: require('../../assets/questions/dolar.jpg'),
  tereyagi: require('../../assets/questions/tereyagi.jpg'),
  bal: require('../../assets/questions/bal.jpg'),
  muz: require('../../assets/questions/muz.jpg'),
  cilek: require('../../assets/questions/cilek.jpg'),
  somon: require('../../assets/questions/somon.jpg'),
  avokado: require('../../assets/questions/avokado.jpg'),
  tacmahal: require('../../assets/questions/tacmahal.jpg'),
  kolezyum: require('../../assets/questions/kolezyum.jpg'),
  balon: require('../../assets/questions/balon.jpg'),
  gondol: require('../../assets/questions/gondol.jpg'),
  gul: require('../../assets/questions/gul.jpg'),
  kaktus: require('../../assets/questions/kaktus.jpg'),
  bisiklet: require('../../assets/questions/bisiklet.jpg'),
  gitar: require('../../assets/questions/gitar.jpg'),
  piyano: require('../../assets/questions/piyano.jpg'),
  kaykay: require('../../assets/questions/kaykay.jpg'),
};

export function mediaOf(key: MediaKey | undefined): Media | null {
  return key ? { src: FILES[key], credit: MEDIA_CREDITS[key] } : null;
}
