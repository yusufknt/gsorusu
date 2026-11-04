import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Logo: kalın "?" ve noktası güneş ("günün" sorusu). Geometri scripts/render-brand.mjs ile aynıdır;
 * biri değişirse diğeri de güncellenmeli.
 *
 * - `variant="mark"`: yalnızca işaret (ör. degrade başlık üzerinde silik filigran).
 * - `variant="icon"`: uygulama simgesinin küçük hâli (yuvarlatılmış kare, degrade zemin).
 */
export function BrandMark({
  size,
  variant = 'mark',
  color = '#FFFFFF',
  sun = true,
  opacity = 1,
}: {
  size: number;
  variant?: 'mark' | 'icon';
  color?: string;
  /** false: nokta da `color` olur (filigran gibi tek renkli kullanım). */
  sun?: boolean;
  opacity?: number;
}) {
  const icon = variant === 'icon';
  // İşaret 203–948 arasında; simgede kutunun ortasına %92 ölçekle yerleşir (render-brand.mjs ile aynı).
  const transform = icon ? 'translate(512 512) scale(0.92) translate(-512 -575)' : 'translate(512 512) scale(1.3) translate(-512 -575)';
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return { x1: 512 + 88 * Math.cos(a), y1: 836 + 88 * Math.sin(a), x2: 512 + 110 * Math.cos(a), y2: 836 + 110 * Math.sin(a) };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" opacity={opacity} accessible={false}>
      <Defs>
        <LinearGradient id="bm-bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF8A3D" />
          <Stop offset="1" stopColor="#EC3F2A" />
        </LinearGradient>
        <RadialGradient id="bm-sun" cx="0.4" cy="0.35" r="0.7">
          <Stop offset="0" stopColor="#FFF3B0" />
          <Stop offset="0.55" stopColor="#FFD84A" />
          <Stop offset="1" stopColor="#FFB000" />
        </RadialGradient>
      </Defs>
      {icon && <Rect width={1024} height={1024} rx={230} fill="url(#bm-bg)" />}
      <G transform={transform}>
        <Path
          d="M 372 404 A 142 142 0 1 1 588 525 C 536 556 512 580 512 628"
          fill="none"
          stroke={color}
          strokeWidth={118}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {sun && (
          <G stroke="#FFD84A" strokeWidth={20} strokeLinecap="round">
            {rays.map((r, i) => (
              <Line key={i} {...r} />
            ))}
          </G>
        )}
        <Circle cx={512} cy={836} r={66} fill={sun ? 'url(#bm-sun)' : color} />
      </G>
    </Svg>
  );
}
