# CaseLab Maintenance API

REST API на Express/TypeScript для учёта оборудования производственной площадки и
заявок на техническое обслуживание. PostgreSQL используется для проверки
доступности; миграционный контур настроен для последующего переноса данных из
in-memory-репозиториев. Эндпоинт прогноза использует Open-Meteo.

## Требования

- Node.js 20+
- npm 10+

## Установка и запуск

```bash
npm install
copy .env.example .env
docker compose up -d db
npm run db:migrate
npm run db:seed:all
npm run dev
```

Миграции и сиды создаются в `db/migrations` и `db/seeders`. До добавления
соответствующих файлов команды миграции/сидирования не создают прикладную схему
и не наполняют базу. Так как пакет использует ESM, файлы CLI миграций и сидов
должны быть CommonJS-файлами `.cjs` (сгенерированный CLI `.js` нужно переименовать).
Сервер дожидается доступности PostgreSQL перед запуском;
`GET /api/health` проверяет подключение через Sequelize.

Для production:

```bash
npm run build
npm start
```

Проверка доступности: `GET http://localhost:3000/api/health`.
Коллекция Postman находится в
[`docs/postman/caselab-api.postman_collection.json`](./docs/postman/caselab-api.postman_collection.json).

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---:|---|
| `NODE_ENV` | — | `production` скрывает детали внутренних ошибок |
| `PORT` | `3000` | Порт HTTP-сервера |
| `CORS_ORIGINS` | `http://localhost:5173` | Разрешённые origins через запятую |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Окно rate limit, мс |
| `RATE_LIMIT_MAX` | `100` | Максимум запросов `/api` за окно с одного IP |
| `JSON_BODY_LIMIT` | `2mb` | Максимальный JSON body |
| `URL_ENCODED_BODY_LIMIT` | `10kb` | Максимальный URL-encoded body |
| `WEATHER_API_URL` | Open-Meteo | URL внешнего погодного API |
| `REQUEST_TIMEOUT_MS` | `5000` | Таймаут запроса к погодному API |
| `WEATHER_FORECAST_DAYS` | `3` | Количество дней прогноза |
| `WEATHER_MAX_PRECIPITATION` | `1` | Допустимые осадки |
| `WEATHER_MAX_WIND_SPEED_KMH` | `30` | Допустимая скорость ветра, км/ч |
| `POSTGRES_DB` | `appdb` | Имя базы для инициализации контейнера Compose |
| `POSTGRES_USER` | `app` | Пользователь для инициализации контейнера Compose |
| `POSTGRES_PASSWORD` | — | Пароль для инициализации контейнера Compose |
| `PGHOST` | `localhost` | Хост PostgreSQL для приложения и Sequelize CLI |
| `PGPORT` | `5432` | Порт PostgreSQL |
| `PGDATABASE` | — | Имя базы данных приложения |
| `PGUSER` | — | Пользователь PostgreSQL приложения |
| `PGPASSWORD` | — | Пароль PostgreSQL приложения |
| `PG_POOL_MAX` | `10` | Максимальный размер пула Sequelize |
| `PG_POOL_MIN` | `0` | Минимальный размер пула Sequelize |
| `PG_POOL_ACQUIRE_MS` | `30000` | Таймаут получения соединения из пула |
| `PG_POOL_IDLE_MS` | `10000` | Время простоя соединения до закрытия |

Для отката последней миграции используйте `npm run db:migrate:undo`, всех
миграций — `npm run db:migrate:undo:all`. Команды `db:seed:all` и
`db:seed:undo:all` применяют и отменяют сиды. Данные подключения задаются через
`.env`; файл `.env` не следует добавлять в репозиторий.

## Эндпоинты

Все пути ниже начинаются с `/api`.

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/health` | Проверка сервиса |
| GET | `/equipment` | Список оборудования: фильтры, сортировка, пагинация |
| POST | `/equipment` | Создание оборудования |
| GET | `/equipment/:id` | Получение оборудования |
| PATCH | `/equipment/:id` | Частичное обновление |
| DELETE | `/equipment/:id` | Удаление; запрещено при открытых заявках |
| GET | `/equipment/:id/requests` | Заявки оборудования |
| GET | `/equipment/:id/weather` | Прогноз и пригодность для наружных работ |
| GET | `/requests` | Список заявок: фильтры, сортировка, пагинация |
| POST | `/requests` | Создание заявки |
| GET | `/requests/:id` | Получение заявки |
| PATCH | `/requests/:id` | Редактирование заявки |
| PATCH | `/requests/:id/status` | Смена статуса |
| DELETE | `/requests/:id` | Удаление заявки |

У списков доступны `page`, `limit` (до 100), `sortBy`, `sortOrder`, а также
ресурсные фильтры: `status`, `type`, `priority`, `equipmentId` и диапазоны дат.

## Модель данных

**Equipment**

```json
{
  "id": "uuid",
  "name": "North Wind Turbine",
  "type": "turbine",
  "serialNumber": "WT-001",
  "location": { "lat": 55.75, "lon": 37.62 },
  "status": "operational",
  "installedAt": "2024-01-15T10:00:00.000Z"
}
```

`type`: `turbine | inverter | sensor | substation`.  
`status`: `operational | maintenance | fault | decommissioned`. Имя содержит
3–100 символов, serial number уникален, координаты находятся в пределах
широты/долготы, `installedAt` не может быть датой будущего.

**Maintenance request**

```json
{
  "id": "uuid",
  "equipmentId": "uuid",
  "title": "Inspect turbine bearings",
  "description": "Check vibration and lubrication.",
  "priority": "high",
  "status": "new",
  "plannedAt": "2030-06-15T09:00:00.000Z",
  "createdAt": "2026-09-22T05:00:00.000Z",
  "updatedAt": "2026-09-22T05:00:00.000Z"
}
```

`title`: 5–120 символов, `description`: до 2000 символов.  
`priority`: `low | medium | high | critical`.

Схема переходов статуса:

```text
new -> in_progress -> done
new -> rejected
in_progress -> rejected
```

Переходы из `done` и `rejected` запрещены и возвращают `409 Conflict`.

## Формат ошибок

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [
      { "field": "name", "message": "Имя должно содержать минимум 3 символа" }
    ],
    "requestId": "req-uuid"
  }
}
```

Основные коды: `400` — ошибка валидации, `404` — ресурс не найден,
`409` — конфликт, `429` — превышен лимит, `502` — недоступен погодный сервис,
`500` — внутренняя ошибка. В development добавляется `stack`; в production
детали внутренних ошибок не раскрываются.

## Примеры

Создание оборудования:

```bash
curl -X POST http://localhost:3000/api/equipment \
  -H "Content-Type: application/json" \
  -d '{"name":"North Wind Turbine","type":"turbine","serialNumber":"WT-001","location":{"lat":55.75,"lon":37.62},"status":"operational","installedAt":"2024-01-15T10:00:00.000Z"}'
```

Ответ `201`:

```json
{ "success": true, "data": { "id": "generated-uuid", "name": "North Wind Turbine", "type": "turbine", "serialNumber": "WT-001", "location": { "lat": 55.75, "lon": 37.62 }, "status": "operational", "installedAt": "2024-01-15T10:00:00.000Z" } }
```

Создание заявки:

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"<equipment-id>","title":"Inspect turbine bearings","priority":"high"}'
```

Ошибочные примеры:

```bash
curl http://localhost:3000/api/equipment/00000000-0000-4000-8000-000000000000
# 404: { "error": { "code": "NOT_FOUND", "message": "Equipment not found", "details": [], "requestId": "..." } }

curl -X POST http://localhost:3000/api/equipment \
  -H "Content-Type: application/json" -d '{"name":"x"}'
# 400: error.code = "VALIDATION_ERROR"

curl -X PATCH http://localhost:3000/api/requests/<done-request-id>/status \
  -H "Content-Type: application/json" -d '{"status":"rejected"}'
# 409: error.code = "CONFLICT"
```

## Безопасность

- CORS разрешает только origins из `CORS_ORIGINS`.
- Для всех `/api` включён rate limit: по умолчанию 100 запросов за 15 минут
  с одного IP; при превышении возвращается `429` и `RateLimit-*` headers.
- `helmet` устанавливает защитные заголовки, включая HSTS и запрет
  встраивания во frame.
- Размеры JSON и URL-encoded тела ограничены соответствующими переменными.
- `requestId` возвращается в ошибке и записывается в логах для диагностики.

## Структура проекта

```text
src/
  config/          конфигурация окружения
  controllers/     обработчики HTTP
  routes/          маршруты API
  schemas/         Zod-схемы валидации
  services/        бизнес-правила и интеграция с погодой
  repositories/    слой хранения данных
  models/          типы доменных моделей
  middleware/      CORS, rate limit, логирование, ошибки
  errors/          классы ошибок
docs/postman/      коллекция Postman
```
