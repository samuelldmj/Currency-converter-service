
import { CURRENCY_API_KEY, FIXER_API_KEY, OPEN_EXCHANGE_APP_ID } from "../Config/env.js";
import { ApiResponse } from "../Models/ApiResponse.js";
import ExchangeRate from "../Models/ExchangeRate.js";


class ExternalApiService {

   async fetchFromFixer(base :string, target: string): Promise<ApiResponse<ExchangeRate>> {
       const response = await fetch(`http://data.fixer.io/api/latest?access_key=${FIXER_API_KEY}&base=${base}&symbols=${target}`);
       
        // PARSE response to rate(extract the rate value from the API response JSON.)
       const data = await response.json();

       let rate = data.rates[target];

       return {
           success: true,
           data: {
               base: base, 
               target: target,
               rate: rate,
           },
           source: "fixer"    
       }
    }


    async fetchFromOpenExchange(base: string, target: string):Promise<ApiResponse<ExchangeRate>> {
        
        const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${OPEN_EXCHANGE_APP_ID}&base=${base}&symbols=${target}`);
        const data = await response.json();
        let rate = data.rates[target];

        return {
            success: true,
            data: {
                base: base,
                target: target,
                rate: rate,
            },
            source: "openexchange"
        }
    }


    async fetchFromCurrencyApi(base: string, target: string): Promise<ApiResponse<ExchangeRate>> {

        const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${CURRENCY_API_KEY}&base_currency=${base}&currencies=${target}`);
        const data = await response.json();
        let rate = data.data[target].value;

        return {
            success: true,
            data: {
                base: base,
                target: target,
                rate: rate,
            },
            source: "currencyapi"
        }
    }


    //parallel with error handling
    async fetchAllRates(base: string, target: string): Promise<ApiResponse<ExchangeRate>[]> {
        const results = await Promise.allSettled([
            this.fetchFromCurrencyApi(base, target),
            this.fetchFromFixer(base, target),
            this.fetchFromOpenExchange(base, target)
        ]);

        return results.map((result, index) => {
            //order is important here, as a result of the api call above.
            const sources = ["currencyapi", "fixer", "openexchange"] as const;
            if (result.status === 'fulfilled')
                return result.value;

            return {
                success: false,
                data: {
                    base,
                    target,
                    rate: 0.0,
                },
                source: sources[index],
                error: result.reason?.message || 'Unknown Error',
            };
        })

    }
}

export default ExternalApiService;





// IMPORT env keys from Config/env.ts
// IMPORT ExchangeRate and ApiResponse types

// DEFINE class ExternalApiService
//   METHOD fetchFromFixer(base, target): Promise<ApiResponse<ExchangeRate>>
//     CALL Fixer API endpoint with FIXER_API_KEY
//     PARSE response to rate
//     RETURN { success, data: { base, target, rate, source: "fixer" }, source: "fixer" }
//   METHOD fetchFromOpenExchange(base, target): Promise<ApiResponse<ExchangeRate>>
//     CALL Open Exchange endpoint with OPEN_EXCHANGE_APP_ID
//     PARSE response
//   METHOD fetchFromCurrencyApi(base, target): Promise<ApiResponse<ExchangeRate>>
//     CALL CurrencyAPI endpoint with CURRENCY_API_KEY
//     PARSE response
//   METHOD fetchAllRates(base, target): Promise<ApiResponse<ExchangeRate>[]>
//     CALL each provider in parallel or sequentially
//     RETURN array of responses
// EXPORT default ExternalApiService