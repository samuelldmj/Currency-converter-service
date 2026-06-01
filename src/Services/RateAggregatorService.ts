import ExchangeRate from "../Models/ExchangeRate.js";
import ExternalApiService from "./ExternalApiService.js";
import CacheRepository from "../Repositories/CacheRepository.js";
import logger from "../Utils/logger.js";

class RateAggregatorService {

    constructor(
        private apiService: ExternalApiService,
        private cacheRepository: CacheRepository
    ) { }

    async getRate(base: string, target: string): Promise<ExchangeRate | undefined> {
        return this.fallbackStrategy(base, target);
    }

    private async fallbackStrategy(base: string, target: string): Promise<ExchangeRate | undefined> {
        try {
            const primary = await this.apiService.fetchFromCurrencyApi(base, target);
            if (primary.success && primary.data) {
                return { ...primary.data, source: primary.source! };
            }
        } catch (error) {
            logger.error(`Primary API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        try {
            const secondary = await this.apiService.fetchFromFixer(base, target);
            if (secondary.success && secondary.data) {
                return { ...secondary.data, source: secondary.source! };
            }
        } catch (error) {
            logger.error(`Secondary API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        try {
            const backup = await this.apiService.fetchFromOpenExchange(base, target);
            if (backup.success && backup.data) {
                return { ...backup.data, source: backup.source! };
            }
        } catch (error) {
            logger.error(`Backup API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        const cached = this.cacheRepository.get(base, target);
        if (cached) {
            logger.warn(`All APIs failed, returning cached data for ${base}/${target}`);
            return cached;
        }

        return undefined;
    }

    private async parallelAverageStrategy(base: string, target: string): Promise<ExchangeRate | undefined> {
        const api = await this.apiService.fetchAllRates(base, target);
        const successfulApi = api.filter(res => res.success && res.data);

        if (successfulApi.length === 0) {
            const cached = this.cacheRepository.get(base, target);
            if (cached) {
                logger.warn(`All APIs failed (parallel), returning cached data for ${base}/${target}`);
                return cached;
            }
            return undefined;
        }

        const totalRates = successfulApi.reduce((sum, response) => {
            return sum + response.data!.rate;
        }, 0);
        const averageRate = totalRates / successfulApi.length;
        return {
            base,
            target,
            rate: averageRate,
            source: 'aggregated'
        };
    }
}

export default RateAggregatorService;