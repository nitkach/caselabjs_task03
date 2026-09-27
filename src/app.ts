import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { pool } from "./config/database.js"
import { requestLogger } from "./middleware/requestLogger.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { equipmentRouter } from "./routes/equipment.routes.js";
import { maintenanceRequestRouter } from "./routes/maintenanceRequest.routes.js";

export const app = express();

app.use(requestId);

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'",],
                fontSrc: ["'self'"],
                imgSrc: ["'self'"],
                connectSrc: ["'self'"],
                frameAncestors: ["'none'"],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 год
            includeSubDomains: true,
            preload: true,
        },
        frameguard: {
            action: "deny",
        },
        referrerPolicy: {
            policy: "strict-origin-when-cross-origin",
        },
    })
);

app.use(
    cors({
        origin: env.corsOrigins,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    })
);

const apiLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    message: {
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests, please try again later.",
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use(requestLogger);
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: env.urlEncodedBodyLimit }));

app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", database: "up" });
    } catch {
        res.status(503).json({ status: "error", database: "down" });
    }
});

app.use("/api", equipmentRouter);
app.use("/api", maintenanceRequestRouter);

app.use(notFoundHandler);
app.use(errorHandler);
