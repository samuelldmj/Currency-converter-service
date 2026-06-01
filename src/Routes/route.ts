import { Router } from "express";
import Container from "../Container.js";

const router = Router();

router.get("/convert", (req, res, next) => Container.currencyController.convert(req, res, next));
router.get("/currencies", (req, res, next) => Container.currencyController.getSupportedCurrencies(req, res, next));
router.get("/rates/history/:from/:to", (req, res, next) => Container.rateController.getRateHistory(req, res, next));

export default router;