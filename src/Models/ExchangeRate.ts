interface ExchangeRate {
  id?: number;
  base: string;
  target: string;
  rate: number;
  timestamp?: string;
  source?: string;
}

export { ExchangeRate };





//PSUEDOCODE
// DEFINE interface ExchangeRate:
//   id?       : number        (optional, auto-set by DB)
//   base      : string        (e.g. "USD")
//   target    : string        (e.g. "EUR")
//   rate      : number        (e.g. 0.91)
//   timestamp?: string        (optional, auto-set by DB)
//   source?   : string        (optional, e.g. "fixer" | "openexchange" | "currencyapi")

// EXPORT ExchangeRate
