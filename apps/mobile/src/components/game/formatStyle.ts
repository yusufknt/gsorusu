import type { QuestionFormat } from '@/api/types';
import { formatStyle } from '@/theme/tokens';
import { useIsDark } from '@/theme/useTheme';

export function useFormatStyle(format: QuestionFormat) {
  const dark = useIsDark();
  const s = formatStyle[format];
  return { color: s.color, soft: dark ? s.darkSoft : s.soft, icon: s.icon };
}
