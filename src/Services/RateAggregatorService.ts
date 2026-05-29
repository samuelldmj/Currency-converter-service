import ExchangeRate from "../Models/ExchangeRate.js";
import ExternalApiService from "./ExternalApiService.js";


class RateAggregatorService {

    constructor(private apiService: ExternalApiService) { }

    async getRate(base: string, target: string): Promise<ExchangeRate | undefined> {

        //retrieve all APIs
        const api = await this.apiService.fetchAllRates(base, target);

        // FILTER only successful results
        const successfulApi = api.filter(res => res.success && res.data);


        //no successful response or all APIs failed
        if (successfulApi.length === 0)
            return undefined;

        //when only a single api success
        // if (successfulApi.length === 1) {
        //     return successfulApi[0].data?.rate;
        // }

        //total rates
        const totalRates = successfulApi.reduce((sum, response) => {
            return sum + response.data!.rate;
        }, 0)
        const averageRate = totalRates / successfulApi.length;
        return {
            base,
            target,
            rate: averageRate,
            source: 'aggregated'
        }
    }

}


export default RateAggregatorService;



//PSUEDOCODE
// IMPORT ExternalApiService and ExchangeRate

// DEFINE class RateAggregatorService
//   constructor(private apiService: ExternalApiService) {}

//   METHOD getRate(base, target): Promise<ExchangeRate | undefined>
//     CALL apiService.fetchAllRates(base, target)
//     FILTER only successful results
//     IF no successful results
//       RETURN undefined
//     IF multiple successes
//       CALCULATE average rate
//       CHOOSE source label like "aggregated"
//     ELSE
//       RETURN single successful rate
//     RETURN normalized ExchangeRate with source
// EXPORT default RateAggregatorService
