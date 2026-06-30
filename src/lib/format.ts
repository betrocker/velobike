export function getLocale(language: string) {
  return language.startsWith("en") ? "en-US" : "sr-RS";
}

export function formatCurrency(value: number, language: string, currency: string) {
  return `${value.toLocaleString(getLocale(language), {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })} ${currency}`;
}
