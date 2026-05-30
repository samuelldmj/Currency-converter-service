import { Request, Response, NextFunction } from "express";
import logger from "../Utils/logger.js";

function errorHandler(
    err: Error & { status?: number },
    req: Request,
    res: Response,
    next: NextFunction
) {

    const status = err.status || 500;

    // log detailed error
    logger.error(`
REQUEST:
${req.method} ${req.originalUrl}

STATUS:
${status}

MESSAGE:
${err.message}

STACK:
${err.stack}
`);

    res.status(status).json({
        success: false,
        error: err.message || "Internal Server Error"
    });
}

export default errorHandler;