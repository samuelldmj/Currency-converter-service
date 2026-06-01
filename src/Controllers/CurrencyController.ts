import { CurrencyService } from "../Services/CurrencyService.js";
import AppError from "../Utils/AppError.js";
import { Request, Response, NextFunction } from "express";

class CurrencyController {
    constructor(private currencyService: CurrencyService) {}

    async convert(req: Request, res: Response, next: NextFunction): Promise<void> {
        const body = req.body || {};
        const query = req.query;

        const from = body.from ?? query.from;
        const to = body.to ?? query.to;
        const amount = body.amount ?? query.amount;

        if (!from || !to || !amount) {
            return next(new AppError("Missing required parameters: from, to, amount", 400));
        }

        if (typeof from === "string" && !from.trim()) {
            return next(new AppError("Invalid 'from' parameter", 400));
        }
        if (typeof to === "string" && !to.trim()) {
            return next(new AppError("Invalid 'to' parameter", 400));
        }

        this.handleConversion(String(from).toUpperCase(), String(to).toUpperCase(), Number(amount), res, next);
    }

    private async handleConversion(from: string, to: string, amount: number, res: Response, next: NextFunction): Promise<void> {
        if (isNaN(amount) || amount <= 0) {
            return next(new AppError("Amount must be a positive number", 400));
        }

        try {
            const result = await this.currencyService.convert(from, to, amount);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async getSupportedCurrencies(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const currencies = await this.currencyService.getSupportedCurrencies();
            res.json({ success: true, data: currencies });
        } catch (error) {
            next(error);
        }
    }
}

export default CurrencyController;