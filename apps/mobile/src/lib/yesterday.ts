/**
 * Bugün ekranındaki "dün" şeridinin metni. Oyuncuyu ertesi gün geri getiren şey çoğu zaman dünün
 * sonucudur (özellikle gece yarısı kesinleşen anket puanı). Saf fonksiyon; Node'da test edilir.
 */
import type { ArchiveItem, Crowd } from '../api/types';
import { formatTrNumber } from './format';

export interface YesterdaySummary {
  title: string;
  subtitle: string;
  /** Şeridin vurgusu: iyi sonuç yeşil, kaçırılan gün turuncu çağrı, diğerleri nötr. */
  tone: 'good' | 'call' | 'neutral';
  /** Dokununca arşivdeki o güne gidilir. */
  actionLabel: string;
}

export function yesterdaySummary(item: ArchiveItem | undefined, crowd: Crowd | null | undefined): YesterdaySummary | null {
  if (!item || item.cancelled) return null;
  const head = `Dün #${item.no}`;
  const avg = crowd && crowd.plays > 0 ? crowd.avgScore : null;

  if (!item.started) {
    return {
      title: `${head}: kaçırdın`,
      subtitle: avg != null ? `Türkiye ortalaması ${formatTrNumber(avg, 1)} puan. Arşivden oynayabilirsin.` : 'Arşivden oynayabilirsin; serini etkilemez.',
      tone: 'call',
      actionLabel: 'Oyna',
    };
  }

  if (!item.finished) {
    return { title: `${head}: yarım kaldı`, subtitle: 'Arşivden bitirebilirsin; serini etkilemez.', tone: 'call', actionLabel: 'Devam et' };
  }

  if (item.score == null) {
    return { title: `${head}: puanın kesinleşiyor`, subtitle: 'Anket sonuçları birazdan açıklanacak.', tone: 'neutral', actionLabel: 'Bak' };
  }

  const title = item.format === 'poll' ? `Dünkü anket sonuçlandı: ${item.score} puan` : `${head}: ${item.score} puan`;
  if (avg == null) return { title, subtitle: 'Sonuçlara ve doğru cevaba bak.', tone: 'neutral', actionLabel: 'Bak' };

  // Şerit tek bakışta okunmalı: alt satır kısa tutulur (bilme oranı arşivdeki sonuç ekranında).
  const diff = Math.round(item.score - avg);
  const versus = diff > 0 ? `${diff} puan öndesin 👏` : diff < 0 ? `${-diff} puan geridesin` : 'tam ortalamadasın';
  return {
    title,
    subtitle: `Türkiye ortalaması ${formatTrNumber(avg, 1)} · ${versus}`,
    tone: diff >= 0 ? 'good' : 'neutral',
    actionLabel: 'Bak',
  };
}
