
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: "fixer" | "openexchange" | "currencyapi";
}




//PSUEDOCODE
// DEFINE interface ApiResponse<T>:
//   success : boolean
//   data?   : T        (present when success = true)
//   error?  : string   (present when success = false)
//   source  : string   (which API returned this — "fixer" | "openexchange" | "currencyapi")

// USAGE EXAMPLES:
//   ApiResponse<ExchangeRate>   — single rate fetch result
//   ApiResponse<ExchangeRate[]> — multiple rates fetch result

// EXPORT ApiResponse