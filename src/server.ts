import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/database.js"

const port = env.port;

const server = app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});


for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
        console.log(`Получен ${signal}, завершаю работу`);
        server.close(async () => {
            await pool.end();   // дождаться завершения активных запросов и закрыть соединения
            process.exit(0);
        });
    });
}
