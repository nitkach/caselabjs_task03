import { Pool } from "pg";

export const pool = new Pool({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 10,                       // столько соединений максимум
    idleTimeoutMillis: 30_000,     // закрыть простаивающее через 30 с
    connectionTimeoutMillis: 5_000 // не ждать соединения дольше 5 с
});

// Соединение может оборваться, когда оно простаивает в пуле.
// Без этого обработчика такая ошибка обрушит процесс.
pool.on("error", (err) => {
    console.error("Ошибка соединения в пуле", err);
});

export async function waitForDatabase({ attempts = 10, baseDelayMs = 500 } = {}) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await pool.query("SELECT 1");
            return;
        } catch (err) {
            if (attempt === attempts) throw err;
            const delay = baseDelayMs * attempt;
            console.warn(`База недоступна (попытка ${attempt}/${attempts}), повтор через ${delay} мс`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
