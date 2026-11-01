const MAX_DIGITS = 10;

/** Girişe bir tuş uygular: rakam, tek virgül (en çok 2 ondalık), silme (⌫). */
export function applyKey(value: string, key: string): string {
  if (key === '⌫') return value.slice(0, -1);
  if (key === ',') return value.includes(',') ? value : (value || '0') + ',';
  const [int, frac] = value.split(',');
  if (frac !== undefined) return frac.length >= 2 ? value : value + key;
  if (int.length >= MAX_DIGITS) return value;
  if (int === '0') return key;
  return value + key;
}

/** "1250,5" → "1.250,5" (yazarken binlik ayırıcı). */
export function displayInput(value: string): string {
  const [int, frac] = value.split(',');
  const dotted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return frac !== undefined ? `${dotted},${frac}` : dotted;
}

/** Tuş takımı girişini sayıya çevirir ("1250,5" → 1250.5). */
export function inputValue(value: string): number | null {
  if (!value || value.endsWith(',')) return value ? Number(value.slice(0, -1)) || null : null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}
