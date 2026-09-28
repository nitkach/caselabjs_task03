require("dotenv").config();

const required = (name) => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value;
};

const numeric = (name, fallback, { min = 0 } = {}) => {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value < min) {
        throw new Error(`Environment variable ${name} must be an integer >= ${min}`);
    }
    return value;
};

const config = {
    dialect: "postgres",
    host: process.env.PGHOST ?? "localhost",
    port: numeric("PGPORT", 5432, { min: 1 }),
    database: required("PGDATABASE"),
    username: required("PGUSER"),
    password: required("PGPASSWORD"),
    pool: {
        max: numeric("PG_POOL_MAX", 10, { min: 1 }),
        min: numeric("PG_POOL_MIN", 0),
        acquire: numeric("PG_POOL_ACQUIRE_MS", 30_000, { min: 1 }),
        idle: numeric("PG_POOL_IDLE_MS", 10_000),
    },
    logging: false,
};

if (config.pool.min > config.pool.max) {
    throw new Error("PG_POOL_MIN must not exceed PG_POOL_MAX");
}

module.exports = {
    development: config,
    test: config,
    production: config,
};
