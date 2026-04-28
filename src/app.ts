
// IMPORT express, cors
import express from "express";
import cors from "cors";
import { ALLOWED_ORIGINS } from "./Config/env.js";

// IMPORT router from Routes/
// IMPORT errorHandler from Middleware/

// CREATE express app instance
const app = express();

// ATTACH cors middleware
// FIX: use explicit allowlist array, NOT a dynamic env var directly in origin
//   DEFINE allowedOrigins = [SERVER_URL from env, "http://localhost:3000"]
//   SET origin to a function that checks req origin against allowedOrigins
// FIX 1: store the parsed array so it can be used in the callback
// DEFINE originList = ALLOWED_ORIGINS?.split(',') ?? []
const originList = ALLOWED_ORIGINS?.split(',') ?? []
app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // FIX 2: check against originList (array), not allowedOrigins (string)
      // IF originList.includes(origin) -> callback(null, true)
      // ELSE -> callback(new Error("Not allowed by CORS"))
      if (originList.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ATTACH express.json() middleware
app.use(express.json());

// MOUNT router at /api/v1
// app.use("/api/v1", router);
app.get("/", (req, res) => {
    res.send("Api is working!");
});

// ATTACH errorHandler middleware (must be last, after all routes)
// app.use(errorHandler);

// EXPORT app
export default app;
