export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatCurrencyCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${sign}€${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}€${Math.round(abs / 1000)}k`;
  return `${sign}€${Math.round(abs)}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}
