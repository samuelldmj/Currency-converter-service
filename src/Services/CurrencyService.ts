import ConversionResult from "../Models/ConversionResult.js";
import CacheRepository from "../Repositories/CacheRepository.js";
import RateRepository from "../Repositories/RateRepository.js";
import AppError from "../Utils/AppError.js";
import RateAggregatorService from "./RateAggregatorService.js";


export class CurrencyService {

    constructor(
        private rateRepository: RateRepository,
        private cacheRepository: CacheRepository,
        private rateAggregatorService: RateAggregatorService

    ) { }
    
    async convert(from: string, to: string, amount: number): Promise<ConversionResult> {
        
        from = from.toUpperCase();
        to = to.toUpperCase();
        
        let rate = this.cacheRepository.get(from, to);
        let source = "cache";

        if (!rate) {
            rate = this.rateRepository.getLatest(from, to);
            if (rate) {
            source = "db";
        }
        }
        if (!rate) {
           rate =  await this.rateAggregatorService.getRate(from, to);

            if (rate) {

                this.rateRepository.insert(rate);
            
                this.cacheRepository.set(rate);

                source = rate.source || 'aggregator';
            } else {
                  throw new AppError(
              "Unable to fetch exchange rate",
              503
          );
            }
            
        }
        const convertedAmount = amount * (rate?.rate || 0);
        return { from, to, amount, convertedAmount, rate: rate?.rate || 0, source, timestamp: new Date().toISOString() };

    }

    async getSupportedCurrencies(): Promise<string[]> {
        return ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];
    }

    async getRateHistory(from: string, to: string): Promise<Array<{from: string, to: string, rate: number, timestamp: string}>> {
        const rates = this.rateRepository.getLast24Hours(from.toUpperCase(), to.toUpperCase());
        return rates.map(r => ({
            from: r.base,
            to: r.target,
            rate: r.rate,
            timestamp: r.timestamp || new Date().toISOString()
        }));
    }
}