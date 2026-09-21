# Конструктор образовательных программ

Веб-приложение для подготовки программ ДООП, ДПП ПК и ДПП ПП по утверждённым макетам. Проект хранит данные на сервере, поддерживает личные кабинеты, роли, комментарии проверяющего, рабочие программы дисциплин/разделов и выгрузку редактируемого `.docx`.

## Что входит в проект

- выбор типа программы: ДООП, ПК, ПП;
- регистрация и вход по email + пароль;
- личный кабинет автора со списком программ и статусами;
- роли `author`, `reviewer`, `admin`;
- назначение фактических ролей администратором;
- переключение администратора между режимами автора, проверяющего и администратора;
- серверное хранение программ, РПД/РПР, комментариев и статусов;
- комментарии проверяющего к полям, строкам и числовым значениям;
- критические ошибки, блокирующие отправку/выгрузку;
- DOCX-выгрузка программ по структуре макета;
- библиотека РПД/РПР с возможностью взять утверждённый раздел за основу.

## Архитектура

| Слой | Решение |
| --- | --- |
| Интерфейс | Next.js / React / Vinext |
| API | серверные маршруты `app/api/*` |
| База данных | Cloudflare D1 через Drizzle |
| Авторизация | email + пароль, bcrypt-хэши, серверные сессии в D1 |
| Роли | `user_profiles`: `author`, `reviewer`, `admin` |
| DOCX | серверная генерация через `docx` |

GitHub Pages для этого проекта не подходит: приложению нужны серверные API, D1, сессии и генерация DOCX.

## Как развернуть с нуля

### 1. Подготовить окружение

Нужны:

- Node.js `>=22.13.0`;
- pnpm;
- Cloudflare account;
- Wrangler CLI, который уже есть в зависимостях проекта.

```bash
git clone https://github.com/oblachko95-beep/educationalprogrambuilder.git
cd educationalprogrambuilder
pnpm install
```

### 2. Войти в Cloudflare

```bash
pnpm exec wrangler login
```

Для CI/CD вместо интерактивного входа задайте `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` в секретах GitHub Actions.

### 3. Создать D1-базу

```bash
pnpm exec wrangler d1 create educational_program_builder
```

Cloudflare вернёт `database_id`. После этого укажите реальный `database_id` в D1-конфигурации сборки/деплоя Cloudflare. Binding должен называться `DB`, потому что код ожидает именно его.

Для команд remote-миграции и деплоя задайте локальные переменные окружения:

```bash
export CLOUDFLARE_D1_DATABASE_NAME=educational_program_builder
export CLOUDFLARE_D1_DATABASE_ID=<database_id из команды wrangler d1 create>
```

Эти значения не нужно коммитить в GitHub. Скрипт `pnpm run cf:prepare` подставит их в `dist/server/wrangler.json` после сборки.

### 4. Собрать приложение

```bash
pnpm run build
```

После сборки Wrangler-конфигурация находится в `dist/server/wrangler.json`.

### 5. Применить миграции

Для локальной D1:

```bash
pnpm run db:migrate:local
```

Для удалённой D1:

```bash
pnpm run db:migrate:remote
```

Эта команда применяет все миграции из папки `drizzle/`, включая таблицы программ, РПД/РПР, пользователей, сессий и восстановления пароля.

### 6. Задать секреты Cloudflare

Минимально нужен первый администратор:

```bash
pnpm exec wrangler secret put INITIAL_ADMIN_EMAIL --config dist/server/wrangler.json
```

Опционально можно задать список администраторов:

```bash
pnpm exec wrangler secret put PROGRAM_ADMIN_EMAILS --config dist/server/wrangler.json
```

Секреты нельзя хранить в коде, `.env`, GitHub и README.

### 7. Задеплоить Worker

```bash
pnpm run deploy
```

Wrangler выведет URL опубликованного приложения. Первый пользователь с email из `INITIAL_ADMIN_EMAIL` после регистрации автоматически получит роль администратора.

### 8. Проверить после деплоя

1. Открыть сайт.
2. Зарегистрироваться под email из `INITIAL_ADMIN_EMAIL`.
3. Проверить, что доступен режим администратора.
4. Создать обычного пользователя и убедиться, что его фактическая роль `author`.
5. Администратором назначить пользователю роль `reviewer`.
6. Автором создать программу и отправить её на проверку.
7. Проверяющим открыть программу, оставить комментарии и согласовать/вернуть на доработку.
8. Проверить DOCX-выгрузку согласованной программы.

## Переменные окружения

| Переменная | Обязательна | Где задавать | Назначение |
| --- | --- | --- | --- |
| `INITIAL_ADMIN_EMAIL` | да | Cloudflare secret | email первого администратора |
| `PROGRAM_ADMIN_EMAILS` | нет | Cloudflare secret | дополнительный comma-separated список администраторов |
| `CLOUDFLARE_D1_DATABASE_ID` | да для деплоя | локальное окружение или GitHub Actions variable/secret | ID D1-базы для подготовки `dist/server/wrangler.json` |
| `CLOUDFLARE_D1_DATABASE_NAME` | нет | локальное окружение или GitHub Actions variable | имя D1-базы, по умолчанию `educational_program_builder` |
| `CLOUDFLARE_API_TOKEN` | для CI/CD | GitHub Actions secret | деплой без `wrangler login` |
| `CLOUDFLARE_ACCOUNT_ID` | для CI/CD | GitHub Actions secret | Cloudflare account для CI/CD |

Пример локальных значений без реальных секретов находится в `.env.example`.

## Основные команды

```bash
pnpm run dev               # локальная разработка
pnpm run build             # сборка Worker
pnpm run start             # локальный запуск собранного Worker
pnpm run lint              # статическая проверка
pnpm run db:generate       # генерация SQL-миграции после изменения db/schema.ts
pnpm run cf:prepare        # подставить реальный D1 ID в dist/server/wrangler.json
pnpm run db:migrate:local  # применить миграции к локальной D1
pnpm run db:migrate:remote # применить миграции к удалённой D1
pnpm run deploy            # деплой Cloudflare Worker
```

## База данных

Прикладная схема находится в `db/schema.ts`, SQL-миграции — в `drizzle/`.

Ключевые таблицы:

- `auth_users` — учётные записи и bcrypt-хэши паролей;
- `auth_sessions` — серверные сессии;
- `password_reset_tokens` — одноразовые токены восстановления пароля;
- `programs` — программы, статус, данные формы, комментарии проверяющего;
- `disciplines` — рабочие программы дисциплин/разделов;
- `user_profiles` — желаемая роль, фактическая роль, отображаемое имя и email.

## Роли

- Пользователь при регистрации выбирает желаемую роль.
- Фактическая роль нового пользователя по умолчанию — `author`.
- Фактическую роль меняет администратор.
- Email из `INITIAL_ADMIN_EMAIL` получает роль `admin` при регистрации/входе.

## Восстановление пароля

Почтовый сервис пока не подключён. Сейчас `/forgot-password` создаёт одноразовую ссылку восстановления и показывает её на экране. Позже эту же ссылку можно отправлять через Resend, SendGrid, SMTP-провайдер или корпоративный почтовый шлюз.

## DOCX-выгрузка

Формирование документа находится в `lib/program-export.ts`. Требования к выгрузке:

- формат OOXML `.docx`, редактируемый;
- A4, книжная ориентация;
- поля и шрифты по макету;
- порядок разделов и нумерация по утверждённому образцу;
- литература собирается автоматически по ГОСТ Р 7.0.100-2018;
- файл именуется по шаблону `ДПП_ПП_[Наименование]_[Год].docx`.
 
