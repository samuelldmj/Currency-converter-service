import { config } from "dotenv";

const envPath: string = `.env.${process.env.NODE_ENV || "development"}.local`;

config({ path: envPath });

export const {
    PORT,
    SERVER_URL,
    DB_PATH,
    FIXER_API_KEY,
    OPEN_EXCHANGE_APP_ID,
    CURRENCY_API_KEY,
    ALLOWED_ORIGINS
} = process.env;
