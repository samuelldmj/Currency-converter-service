import { Request, Response, NextFunction } from "express";
import { CurrencyService } from "../Services/CurrencyService.js";
import AppError from "../Utils/AppError.js";

class RateController {
    constructor(private currencyService: CurrencyService) { }

    async getRateHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        const from = Array.isArray(req.params.from) ? req.params.from[0] : req.params.from;
        const to = Array.isArray(req.params.to) ? req.params.to[0] : req.params.to;

        if (!from || !to) {
            return next(new AppError("Missing required parameters: from, to", 400));
        }

        try {
            const history = await this.currencyService.getRateHistory(from, to);
            res.json({ success: true, data: history });
        } catch (error) {
            next(error);
        }
    }
}

export default RateController;
