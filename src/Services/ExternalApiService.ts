import { CURRENCY_API_KEY, FIXER_API_KEY, OPEN_EXCHANGE_APP_ID } from "../Config/env.js";
import { ApiResponse } from "../Models/ApiResponse.js";
import ExchangeRate from "../Models/ExchangeRate.js";

class ExternalApiService {

    async fetchFromFixer(base :string, target: string): Promise<ApiResponse<ExchangeRate>> {
        try {
            const response = await fetch(`http://data.fixer.io/api/latest?access_key=${FIXER_API_KEY}&base=${base}&symbols=${target}`);
            const data = await response.json();
            let rate = data.rates[target];

            return {
                success: true,
                data: {
                    base: base, 
                    target: target,
                    rate: rate
                },
                source: "fixer"
            }
        } catch (error) {
            throw error instanceof Error ? error : new Error('Fixer API failed');
        }
    }


    async fetchFromOpenExchange(base: string, target: string):Promise<ApiResponse<ExchangeRate>> {
        try {
            const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${OPEN_EXCHANGE_APP_ID}&base=${base}&symbols=${target}`);
            const data = await response.json();
            let rate = data.rates[target];

            return {
                success: true,
                data: {
                    base: base,
                    target: target,
                    rate: rate
                },
                source: "openexchange"
            }
        } catch (error) {
            throw error instanceof Error ? error : new Error('OpenExchange API failed');
        }
    }


    async fetchFromCurrencyApi(base: string, target: string): Promise<ApiResponse<ExchangeRate>> {
        try {
            const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${CURRENCY_API_KEY}&base_currency=${base}&currencies=${target}`);
            const data = await response.json();
            let rate = data.data[target].value;

            return {
                success: true,
                data: {
                    base: base,
                    target: target,
                    rate: rate
                },
                source: "currencyapi"
            }
        } catch (error) {
            throw error instanceof Error ? error : new Error('CurrencyAPI failed');
        }
    }

    async fetchCurrenciesFromFixer(): Promise<string[]> {
    const response = await fetch(
        `http://data.fixer.io/api/currencies?access_key=${FIXER_API_KEY}`
    );

    const data = await response.json();

    const currencies = data?.currencies;

    if (!currencies || typeof currencies !== "object") {
        return [];
    }

    return Object.keys(currencies);
}


    async fetchCurrenciesFromOpenExchange(): Promise<string[]> {
        const response = await fetch(`https://openexchangerates.org/api/currencies.json?app_id=${OPEN_EXCHANGE_APP_ID}`);
        const data = await response.json();
        return Object.keys(data);
    }

    async fetchCurrenciesFromCurrencyApi(): Promise<string[]> {
        const response = await fetch(`https://api.currencyapi.com/v3/currencies?apikey=${CURRENCY_API_KEY}`);
        const data = await response.json();
        return Object.keys(data.data);
    }

    async fetchAllCurrencies(): Promise<string[]> {
        const results = await Promise.allSettled([
            this.fetchCurrenciesFromFixer(),
            this.fetchCurrenciesFromOpenExchange(),
            this.fetchCurrenciesFromCurrencyApi()
        ]);

        const allCurrencies = new Set<string>();
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                result.value.forEach(c => allCurrencies.add(c));
            }
        });

        return Array.from(allCurrencies).sort();
    }


    async fetchAllRates(base: string, target: string): Promise<ApiResponse<ExchangeRate>[]> {
        const results = await Promise.allSettled([
            this.fetchFromCurrencyApi(base, target),
            this.fetchFromFixer(base, target),
            this.fetchFromOpenExchange(base, target)
        ]);

        return results.map((result, index) => {
            const sources = ["currencyapi", "fixer", "openexchange"] as const;
            if (result.status === 'fulfilled' && result.value)
                return result.value;

            return {
                success: false,
                data: {
                    base,
                    target,
                    rate: 0.0
                },
                source: sources[index],
                error: result.status === 'rejected' ? String(result.reason?.message || 'Unknown Error') : 'No data returned',
            };
        })

    }

}

export default ExternalApiService;










// PSEUDOCODE
// OUTPUT STRUCTURE
/*
--------> BEFORE .MAP METHOD PROMISE.ALLSETTLED();   
[
  {
    status: "fulfilled",
    value: {
      success: true,
      data: {...},
      source: "currencyapi"
    }
  },

  {
    status: "rejected",
    reason: Error("Invalid API key")
  },

  {
    status: "fulfilled",
    value: {
      success: true,
      data: {...},
      source: "openexchange"
    }
  }
]


---------------> AFTER .MAP
[
  {
    success: true,
    data: {
      base: "USD",
      target: "EUR",
      rate: 0.92
    },
    source: "currencyapi"
  },

  {
    success: false,
    data: {
      base: "USD",
      target: "EUR",
      rate: 0
    },
    source: "fixer",
    error: "Invalid API key"
  },

  {
    success: true,
    data: {
      base: "USD",
      target: "EUR",
      rate: 0.93
    },
    source: "openexchange"
  }
]

*/