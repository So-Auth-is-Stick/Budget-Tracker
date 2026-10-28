// Money display helpers. peso(58530) -> "₱58,530.00", peso(1234.5, 0) -> "₱1,235"
export function groupDigits(n, decimals = 2) {
  const fixed = Math.abs(Number(n) || 0).toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

export function peso(n, decimals = 2) {
  const v = Number(n) || 0;
  return (v < 0 ? '−' : '') + '₱' + groupDigits(v, decimals);
}

// Short form for tight spaces: ₱950, ₱12.4k, ₱1.2M
export function pesoShort(n) {
  const v = Math.abs(Number(n) || 0);
  const sign = n < 0 ? '−' : '';
  if (v >= 1e6) return `${sign}₱${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e4) return `${sign}₱${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}k`;
  return sign + '₱' + groupDigits(v, 0);
}
