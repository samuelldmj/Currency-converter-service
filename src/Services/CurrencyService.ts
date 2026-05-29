import ConversionResult from "../Models/ConversionResult.js";
import CacheRepository from "../Repositories/CacheRepository.js";
import RateRepository from "../Repositories/RateRepository.js";
import RateAggregatorService from "./RateAggregatorService.js";


export class CurrencyService {

    constructor(
        private rateRepository: RateRepository,
        private cacheRepository: CacheRepository,
        private rateAggregatorService: RateAggregatorService

    ) { }
    
    async convert(from: string, to: string, amount: number): Promise<ConversionResult> {
        
        //normalize currency codes(That is make it consistent).
        from = from.toUpperCase();
        to = to.toUpperCase();
        
        // 1. Try cache first
        let rate = this.cacheRepository.get(from, to);
        let source = "cache";

        // 2. If not in cache, try DB
        if (!rate) {
            rate = this.rateRepository.getLatest(from, to);
            if (rate) {
            source = "db";
        }
        }
        // 3. If not in DB, fetch from API
        if (!rate) {
           rate =  await this.rateAggregatorService.getRate(from, to);

            if (rate) {

                //persist to db
                this.rateRepository.insert(rate);
            
                //cache rate
                this.cacheRepository.set(rate);

                source = rate.source || 'api';
            } else {
                 throw new Error("Unable to fetch exchange rate");
            }
            
        }
        // 4. Calculate conversion
        const convertedAmount = amount * (rate?.rate || 0);
        return { from, to, amount, convertedAmount, rate: rate?.rate || 0, source, timestamp: new Date().toISOString() };

    }
}





//PSUEDOCODE
// IMPORT CacheRepository, RateRepository, RateAggregatorService, ExchangeRate, ConversionResult

// DEFINE class CurrencyService
//   constructor(private rateRepository, private cacheRepository, private rateAggregatorService) {}

//   async convert(from, to, amount)
//     NORMALIZE currency codes
//     TRY cacheRepository.get(from, to)
//       IF found -> source = "cache"
//     ELSE
//       TRY rateRepository.getLatest(from, to)
//         IF found -> source = "db"
//     IF still no rate
//       CALL rateAggregatorService.getRate(from, to)
//       IF rate found
//         rateRepository.insert(rate)
//         cacheRepository.set(rate)
//         source = rate.source || "api"
//       ELSE
//         THROW error("Unable to fetch exchange rate")
//     CALCULATE convertedAmount = amount * rate.rate
//     RETURN ConversionResult object
