import CurrencyController from "./Controllers/CurrencyController.js";
import RateController from "./Controllers/RateController.js";
import { CurrencyService } from "./Services/CurrencyService.js";
import RateRepository from "./Repositories/RateRepository.js";
import CacheRepository from "./Repositories/CacheRepository.js";
import RateAggregatorService from "./Services/RateAggregatorService.js";
import ExternalApiService from "./Services/ExternalApiService.js";

class Container {
    private static _externalApiService: ExternalApiService;
    private static _rateAggregatorService: RateAggregatorService;
    private static _rateRepository: RateRepository;
    private static _cacheRepository: CacheRepository;
    private static _currencyService: CurrencyService;
    private static _currencyController: CurrencyController;
    private static _rateController: RateController;

    static get externalApiService(): ExternalApiService {
        if (!this._externalApiService) {
            this._externalApiService = new ExternalApiService();
        }
        return this._externalApiService;
    }

    static get rateAggregatorService(): RateAggregatorService {
        if (!this._rateAggregatorService) {
            this._rateAggregatorService = new RateAggregatorService(
                this.externalApiService,
                this.cacheRepository
            );
        }
        return this._rateAggregatorService;
    }

    static get rateRepository(): RateRepository {
        if (!this._rateRepository) {
            this._rateRepository = new RateRepository();
        }
        return this._rateRepository;
    }

    static get cacheRepository(): CacheRepository {
        if (!this._cacheRepository) {
            this._cacheRepository = new CacheRepository();
        }
        return this._cacheRepository;
    }

    static get currencyService(): CurrencyService {
        if (!this._currencyService) {
            this._currencyService = new CurrencyService(
                this.rateRepository,
                this.cacheRepository,
                this.rateAggregatorService
            );
        }
        return this._currencyService;
    }

    static get currencyController(): CurrencyController {
        if (!this._currencyController) {
            this._currencyController = new CurrencyController(this.currencyService);
        }
        return this._currencyController;
    }

    static get rateController(): RateController {
        if (!this._rateController) {
            this._rateController = new RateController(this.currencyService);
        }
        return this._rateController;
    }
}

export default Container;