export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatMoney(amount: number, currency: string, locale: string = "es-PE"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount);
}
