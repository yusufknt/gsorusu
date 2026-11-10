import { useId } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, Image, Path } from 'react-native-svg';

import { piecePath, PIECE_ORDER, PUZZLE_H, PUZZLE_W } from '@/lib/puzzle';
import { artById, PUZZLE_ART } from '@/lib/puzzleArt';
import { useColors } from '@/theme/useTheme';

import { puzzleImage } from './puzzleImages';

/**
 * 15 parçalık seri yapbozu; resim `art` ile seçilir (lib/puzzleArt.ts; ilki Soro'nun İstanbul'da doğuşu).
 * `pieces` kadar parça görselle dolu, kalanlar boş yuva. `highlightLast`: son parça bugün kazanıldı.
 */
export function StreakPuzzle({ pieces, width, art, highlightLast = false }: { pieces: number; width: number; art?: string; highlightLast?: boolean }) {
  const image = puzzleImage(art ?? PUZZLE_ART[0].id);
  const title = artById(art ?? PUZZLE_ART[0].id).title;
  const c = useColors();
  const id = useId().replace(/:/g, '');
  const height = (width * PUZZLE_H) / PUZZLE_W;
  const complete = pieces >= PIECE_ORDER.length;
  const owned = PIECE_ORDER.slice(0, pieces);
  const stroke = (PUZZLE_W / width) * 1.2;

  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={complete ? `Yapboz tamamlandı: ${title}` : `Yapboz: ${pieces}/${PIECE_ORDER.length} parça`}>
      <Svg width={width} height={height} viewBox={`0 0 ${PUZZLE_W} ${PUZZLE_H}`}>
        <Defs>
          <ClipPath id={`owned-${id}`}>
            {owned.map(({ r, c: col }) => (
              <Path key={`${r}-${col}`} d={piecePath(r, col)} />
            ))}
          </ClipPath>
        </Defs>

        {/* Boş yuvalar: soluk zemin ve kesik çizgi. */}
        {!complete &&
          PIECE_ORDER.slice(pieces).map(({ r, c: col }) => (
            <Path
              key={`slot-${r}-${col}`}
              d={piecePath(r, col)}
              fill={c.surfaceSunken}
              stroke={c.textSubtle}
              strokeOpacity={0.6}
              strokeWidth={stroke * 1.4}
              strokeDasharray={`${stroke * 6} ${stroke * 5}`}
            />
          ))}

        {pieces > 0 && (
          <G clipPath={`url(#owned-${id})`}>
            <Image href={image} x={0} y={0} width={PUZZLE_W} height={PUZZLE_H} preserveAspectRatio="xMidYMid slice" />
          </G>
        )}

        {/* Kazanılan parçaların ek yerleri; yapboz tamamlanınca çizgiler kaybolur. */}
        {!complete &&
          owned.map(({ r, c: col }, i) => {
            const isNew = highlightLast && i === owned.length - 1;
            return (
              <Path
                key={`seam-${r}-${col}`}
                d={piecePath(r, col)}
                fill="none"
                stroke={isNew ? c.accent : 'rgba(255,255,255,0.75)'}
                strokeWidth={isNew ? stroke * 5 : stroke * 1.5}
              />
            );
          })}
      </Svg>
    </View>
  );
}
