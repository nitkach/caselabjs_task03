import dotenv from "dotenv";

dotenv.config();

const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const requiredDatabaseValue = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value;
};

const databasePort = Number(process.env.PGPORT ?? 5432);
const poolMax = Number(process.env.PG_POOL_MAX ?? 10);
const poolMin = Number(process.env.PG_POOL_MIN ?? 0);
const poolAcquire = Number(process.env.PG_POOL_ACQUIRE_MS ?? 30_000);
const poolIdle = Number(process.env.PG_POOL_IDLE_MS ?? 10_000);

for (const [name, value] of Object.entries({
    PGPORT: databasePort,
    PG_POOL_MAX: poolMax,
    PG_POOL_MIN: poolMin,
    PG_POOL_ACQUIRE_MS: poolAcquire,
    PG_POOL_IDLE_MS: poolIdle,
})) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`Environment variable ${name} must be a non-negative integer`);
    }
}

if (databasePort === 0 || poolMax === 0 || poolMin > poolMax || poolAcquire === 0) {
    throw new Error("Invalid PostgreSQL connection or pool configuration");
}

export const env = {
    port: Number(process.env.PORT ?? 3000),
    corsOrigins,
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
    jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? "2mb",
    urlEncodedBodyLimit: process.env.URL_ENCODED_BODY_LIMIT ?? "10kb",
    weatherApiUrl: process.env.WEATHER_API_URL ??
        "https://api.open-meteo.com/v1/forecast",
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 5000),
    weatherForecastDays: Number(process.env.WEATHER_FORECAST_DAYS ?? 3),
    weatherMaxPrecipitation: Number(process.env.WEATHER_MAX_PRECIPITATION ?? 1),
    weatherMaxWindSpeedKmh: Number(
        process.env.WEATHER_MAX_WIND_SPEED_KMH ?? 30,
    ),
    database: {
        host: process.env.PGHOST ?? "localhost",
        port: databasePort,
        name: requiredDatabaseValue("PGDATABASE"),
        user: requiredDatabaseValue("PGUSER"),
        password: requiredDatabaseValue("PGPASSWORD"),
        pool: {
            max: poolMax,
            min: poolMin,
            acquire: poolAcquire,
            idle: poolIdle,
        },
    },
};
