
import express from "express";
import cors from "cors";
import { ALLOWED_ORIGINS } from "./Config/env.js";
import errorHandler from "./Middleware/errorHandler.js";
import router from "./Routes/route.js";

const app = express();

const originList = ALLOWED_ORIGINS?.split(',') ?? []
app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (originList.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());

app.use("/api/v1", router);

app.get("/", (req, res) => {
    res.send("Api is working!");
});

app.use(errorHandler);

export default app;

