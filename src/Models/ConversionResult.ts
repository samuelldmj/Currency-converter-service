interface ConversionResult {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  source: string;
  timestamp: string;
}

export { ConversionResult };



//PSUEDOCODE
// DEFINE interface ConversionResult:
//   from            : string   (e.g. "USD")
//   to              : string   (e.g. "EUR")
//   amount          : number   (original amount requested)
//   convertedAmount : number   (amount * rate)
//   rate            : number   (exchange rate used)
//   source          : string   (which API or "cache" or "db")
//   timestamp       : string   (when the rate was fetched)

// EXPORT ConversionResult