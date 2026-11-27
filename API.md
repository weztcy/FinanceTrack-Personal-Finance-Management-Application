# FinanceTrack — API Documentation

FinanceTrack is a web-based personal finance management application for recording income, expense, and inter-account transfer transactions, managing categories, monthly budgets, recurring transactions, savings goals, bills, and reminder notifications, as well as generating dashboard summaries and report exports (CSV & PDF).

The backend is built using a monolithic REST API architecture with the following stack:
- **Language & Runtime:** JavaScript (ESM) on Node.js (`"type": "module"`, using built-in `node:sqlite`)
- **HTTP Framework:** Express `^5.1.0`
- **Database:** SQLite (`DatabaseSync` with WAL mode, `foreign_keys=ON`, `busy_timeout=5000`, relational + JSON document storage pattern in the `records` table)
- **Validation:** Zod `^4.1.12`
- **Security & Utilities:** `helmet`, `cookie-parser`, `express-rate-limit`, `bcryptjs` (cost factor 12), `nodemailer`, `pdfkit`
- **Default Port:** `4000` (local development on `127.0.0.1:4000`) / `8080` (Nginx reverse proxy in Docker Compose)

---

## 1. General Information & Base URL

- **Local Development (Direct Backend):** `http://127.0.0.1:4000/api` (or `http://localhost:4000/api`)
- **Development via Vite Proxy:** `http://localhost:5173/api` (forwarded to `http://127.0.0.1:4000`)
- **Docker Compose (Nginx Frontend Proxy):** `http://localhost:8080/api` (`frontend` container forwards `/api/` to `http://backend:4000`)
- **Route Prefix:** All API endpoints are under the `/api` prefix. (If `frontend/dist` is available, the backend also serves static SPA files outside `/api`.)

### Request & Response Format
- **Request Content-Type:** `application/json` (max body `64kb` per `express.json({ limit: "64kb" })` and `client_max_body_size 64k` in Nginx). The `originGuard` middleware **requires** the `Content-Type: application/json` header for all methods other than `GET`, `HEAD`, and `OPTIONS` on `/api` — including `POST`/`PATCH`/`DELETE` endpoints without a JSON body (send `{}` if needed). There are no `multipart/form-data` endpoints.
- **Response Content-Type:**
  - Standard: `application/json; charset=utf-8`
  - CSV Export: `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="financetrack-transactions.csv"` (prefixed with UTF-8 BOM `\uFEFF`)
  - PDF Export: `application/pdf` with `Content-Disposition: attachment; filename="financetrack-report.pdf"`
- **Timestamp & Date Format:**
  - System timestamps (`createdAt`, `updatedAt`, `expires_at`, `paidAt`): ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`)
  - Transaction/bill/goal dates (`date`, `openingBalanceDate`, `startDate`, `endDate`, `dueDate`, `targetDate`): `YYYY-MM-DD`
  - Budget period (`period`): `YYYY-MM`
- **ID Type:** UUID v4 string (`xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx`)
- **Monetary Amount Conversion (`*Minor` ↔ Decimal):**
  - In the database, amounts are stored as integer *minor units* (hundredths, e.g., multiplied by 100 in `*Minor` fields such as `amountMinor`, `openingBalanceMinor`, `limitAmountMinor`, `targetAmountMinor`).
  - In the **request body**, clients send decimal/integer amounts (max 2 decimal places, e.g., `150000` or `150000.50`).
  - In the **JSON response**, `publicData()` automatically converts every key ending in `Minor` into a key without the `Minor` suffix divided by `100` (e.g., `amountMinor: 15000000` → `amount: 150000`, `balanceMinor` → `balance`, `spentMinor` → `spent`, `remainingMinor` → `remaining`, `incomeMinor` → `income`, `expenseMinor` → `expense`, `netMinor` → `net`, `transferMinor` → `transfer`, `totalBalanceMinor` → `totalBalance`, `currentAmountMinor` → `currentAmount`).

---

## 2. Authentication & Authorization

### Authentication Mechanism & CSRF Protection
- FinanceTrack uses an **HttpOnly Session Cookie** stored in the SQLite `sessions` table (`token_hash` is a SHA-256 hex digest of a 32-byte / 64-hex-character random token) combined with a **CSRF Token**.
- **Cookie Name:** `ft_session`
  - Properties: `httpOnly: true`, `sameSite: "strict"`, `secure: config.secureCookie` (`COOKIE_SECURE === "true"`), `path: "/"`, `maxAge: 7 days` (`604800000` ms).
- **Sending Credentials:**
  1. Login or registration returns `Set-Cookie: ft_session=<token>` and a JSON payload containing `{ user, csrfToken }`.
  2. On every authenticated request, the client sends the `ft_session` cookie.
  3. For **all mutating methods** (`POST`, `PATCH`, `PUT`, `DELETE` — anything other than `GET`, `HEAD`, `OPTIONS`) on authenticated routes, the client **must** include headers:
     - `X-CSRF-Token: <csrfToken>` (must match the `csrf` column on the session in the database).
     - `Content-Type: application/json` (checked by `originGuard`).
  4. The `Origin` header (if sent by the client/browser) is verified by `originGuard` to match `APP_ORIGIN` (in non-production mode, `localhost` and `127.0.0.1` on the same port and protocol are treated as equivalent).
- **Login, Profile/Session Check, & Logout Flow:**
  - **Register (`POST /api/auth/register`):** Creates a new account, automatically inserts 13 default categories (5 income, 8 expense), creates a new session (7-day expiry), and sets the `ft_session` cookie.
  - **Login (`POST /api/auth/login`):** Verifies email and password (`bcrypt`), creates a new session (while cleaning up expired sessions), and sets the `ft_session` cookie.
  - **Session Check (`GET /api/profile`):** Validates the `ft_session` cookie and returns the user profile along with the active `csrfToken` (there is no separate `/auth/refresh` endpoint).
  - **Logout (`POST /api/auth/logout`):** Deletes the active session row from `sessions` and clears the `ft_session` cookie.
  - **Change Password / Reset Password:** Deletes other device sessions (`DELETE FROM sessions WHERE user_id=? AND token_hash<>?` on password change) or all sessions (`DELETE FROM sessions WHERE user_id=?` on password reset).

### Roles & Permissions Table
FinanceTrack is a **personal (single-tier user)** finance application and does not have multiple roles (no admin/staff roles). All financial data is isolated per `user_id`.

| Access Level | Description | Endpoint Scope |
| :--- | :--- | :--- |
| **Public** | No session cookie required | `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| **Authenticated User (`user`)** | Valid `ft_session` cookie required; mutations require `X-CSRF-Token` | All `/api/profile`, `/api/auth/logout`, `/api/auth/change-password`, `/api/accounts*`, `/api/categories*`, `/api/transactions*`, `/api/transfers`, `/api/budgets*`, `/api/recurring*`, `/api/goals*`, `/api/bills*`, `/api/notifications*`, `/api/dashboard/*`, `/api/reports/*` endpoints (can only access records owned by `req.user.id`) |

---

## 3. Standard Response Format & Error Handling

### Success Response Pattern
The API returns JSON payloads directly **without a global wrapper envelope** (`data`/`meta`):
- **Single Resource / Mutation:** Returns the resource object directly (e.g., `{ "id": "...", "name": "...", ... }`), a status message (`{ "message": "..." }`), or an auth object (`{ "user": {...}, "csrfToken": "..." }`).
- **List / Collection (without pagination):** Returns a JSON array directly `[ { ... }, { ... } ]` (for `/accounts`, `/categories`, `/budgets`, `/recurring`, `/goals`, `/goals/:id/contributions`, `/bills`, `/notifications`).
- **Paginated List (`GET /api/transactions`):**
  ```json
  {
    "items": [ { "id": "...", "type": "expense", "amount": 50000, ... } ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "pages": 3
  }
  ```

### Error Response Pattern
Handled centrally by the error middleware in `backend/src/app.js`:
1. **Zod Schema Validation (`422 Unprocessable Entity`):**
   ```json
   {
     "message": "Periksa isian formulir.",
     "errors": [
       {
         "field": "email",
         "message": "Invalid email address"
       }
     ]
   }
   ```
2. **Application Error (`AppError`) / Express Body Error (`400`, `401`, `403`, `404`, `409`, `413`, `415`):**
   ```json
   {
     "message": "Data tidak ditemukan."
   }
   ```
   *(For status `413` from the Express JSON parser >64KB, the message is automatically replaced with `"Ukuran permintaan terlalu besar."`.)*
3. **SQLite UNIQUE Constraint Violation (`409 Conflict`):**
   ```json
   {
     "message": "Data sudah ada. Kategori anggaran hanya boleh satu per periode, dan pembayaran tidak boleh diduplikasi."
   }
   ```
4. **Rate Limiter (`429 Too Many Requests`):**
   ```json
   {
     "message": "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
   }
   ```
5. **Internal Server Error (`500`):**
   ```json
   {
     "message": "Terjadi kesalahan server. Silakan coba lagi."
   }
   ```

### HTTP Status Code Table
| Status Code | Usage Condition |
| :--- | :--- |
| `200 OK` | `GET`, `PATCH`, `POST` (non-create such as login, logout, void, archive, pay, read, process, reset/forgot password), or `DELETE` request succeeded |
| `201 Created` | New resource created (`register`, `accounts`, `categories`, `transactions`, `transfers`, `budgets`, `recurring`, `goals`, `contributions`, `bills`) |
| `400 Bad Request` | Invalid business/domain rule (`AppError(400, ...)` or default `ensure(...)`), e.g., invalid `Idempotency-Key` format, transaction date before account opening balance date, mismatched category type |
| `401 Unauthorized` | Missing / invalid / expired session cookie, or incorrect email/password on login |
| `403 Forbidden` | `X-CSRF-Token` mismatch, disallowed `Origin`, or incorrect current password on password change / account deletion |
| `404 Not Found` | `/api/*` endpoint not found, or record not found / not owned by the user |
| `409 Conflict` | Email already registered, currency changed after financial data exists, category already in use cannot change type, goal/bill/transaction already finalized/void/archived, `Idempotency-Key` reused with a different body, or duplicate budget per category+period |
| `413 Payload Too Large` | JSON request body exceeds `64kb` limit |
| `415 Unsupported Media Type` | Mutating request (`POST`/`PATCH`/`DELETE`) did not send `Content-Type: application/json` |
| `422 Unprocessable Entity` | Zod schema validation failed (`ZodError`) |
| `429 Too Many Requests` | Exceeded `authLimiter` limit (20 requests per 15 minutes per IP) |
| `500 Internal Server Error` | Unexpected server error |

---

## 4. Endpoint Summary (Quick Reference)

| Module | Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| System | `GET` | `/api/health` | Public | Check API health and SQLite connection |
| Auth | `POST` | `/api/auth/register` | Public (Rate Limit) | Register new user + default categories |
| Auth | `POST` | `/api/auth/login` | Public (Rate Limit) | Login & create session cookie + CSRF token |
| Auth | `POST` | `/api/auth/forgot-password` | Public (Rate Limit) | Request password reset link |
| Auth | `POST` | `/api/auth/reset-password` | Public (Rate Limit) | Reset password using token |
| Auth | `POST` | `/api/auth/logout` | Auth + CSRF | Logout & delete current session |
| Auth | `POST` | `/api/auth/change-password` | Auth + CSRF + Rate Limit | Change password & terminate other device sessions |
| Profile | `GET` | `/api/profile` | Auth | Get user profile & `csrfToken` |
| Profile | `PATCH` | `/api/profile` | Auth + CSRF | Update profile & notification preferences |
| Profile | `DELETE` | `/api/profile` | Auth + CSRF + Rate Limit | Permanently delete account & all financial data |
| Accounts | `GET` | `/api/accounts` | Auth | List accounts with running balance |
| Accounts | `POST` | `/api/accounts` | Auth + CSRF + Idempotency | Create new account |
| Accounts | `GET` | `/api/accounts/:id` | Auth | Get single account details with balance |
| Accounts | `PATCH` | `/api/accounts/:id` | Auth + CSRF | Update account name, type, or description |
| Accounts | `POST` | `/api/accounts/:id/archive` | Auth + CSRF | Archive account |
| Categories | `GET` | `/api/categories` | Auth | List all user categories |
| Categories | `POST` | `/api/categories` | Auth + CSRF + Idempotency | Create new category |
| Categories | `PATCH` | `/api/categories/:id` | Auth + CSRF | Update category name, color, or type |
| Categories | `DELETE` | `/api/categories/:id` | Auth + CSRF | Archive category (`isArchived: true`) |
| Transactions | `GET` | `/api/transactions` | Auth | List active transactions with filters & pagination |
| Transactions | `POST` | `/api/transactions` | Auth + CSRF + Idempotency | Create transaction (`income`/`expense`/`transfer`) |
| Transactions | `POST` | `/api/transfers` | Auth + CSRF + Idempotency | Alias to create a `transfer` transaction |
| Transactions | `GET` | `/api/transactions/:id` | Auth | Transaction details with audit history |
| Transactions | `PATCH` | `/api/transactions/:id` | Auth + CSRF | Update active transaction |
| Transactions | `POST` | `/api/transactions/:id/void` | Auth + CSRF | Void transaction (`status: "void"`) |
| Budgets | `GET` | `/api/budgets` | Auth | List budgets with spending realization |
| Budgets | `POST` | `/api/budgets` | Auth + CSRF + Idempotency | Create category budget for a monthly period |
| Budgets | `PATCH` | `/api/budgets/:id` | Auth + CSRF | Update budget limit, period, or warning threshold |
| Budgets | `DELETE` | `/api/budgets/:id` | Auth + CSRF | Permanently delete budget |
| Recurring | `GET` | `/api/recurring` | Auth | List recurring transaction schedules |
| Recurring | `POST` | `/api/recurring` | Auth + CSRF + Idempotency | Create new recurring transaction schedule |
| Recurring | `PATCH` | `/api/recurring/:id` | Auth + CSRF | Update, pause (`isPaused`), or end schedule |
| Recurring | `POST` | `/api/recurring/process` | Auth + CSRF | Manually trigger execution of user's recurring schedules |
| Goals | `GET` | `/api/goals` | Auth | List savings goals with progress |
| Goals | `POST` | `/api/goals` | Auth + CSRF + Idempotency | Create new savings goal |
| Goals | `PATCH` | `/api/goals/:id` | Auth + CSRF | Update savings goal details or status |
| Goals | `GET` | `/api/goals/:id/contributions` | Auth | List contributions for a specific goal |
| Goals | `POST` | `/api/goals/:id/contributions` | Auth + CSRF + Idempotency | Add contribution (progress-only) to goal |
| Goals | `PATCH` | `/api/goals/:id/contributions/:contributionId` | Auth + CSRF | Update amount, date, or note of active contribution |
| Goals | `POST` | `/api/goals/:id/contributions/:contributionId/void` | Auth + CSRF | Void contribution (`status: "void"`) |
| Bills | `GET` | `/api/bills` | Auth | List bills with dynamic status (`paid`/`overdue`/`due`/`upcoming`) |
| Bills | `POST` | `/api/bills` | Auth + CSRF + Idempotency | Create new bill |
| Bills | `PATCH` | `/api/bills/:id` | Auth + CSRF | Update unpaid bill |
| Bills | `POST` | `/api/bills/:id/pay` | Auth + CSRF + Idempotency | Pay bill (create new transaction or link existing) |
| Notifications | `GET` | `/api/notifications` | Auth | Evaluate reminders & fetch notification list |
| Notifications | `PATCH` | `/api/notifications/:id/read` | Auth + CSRF | Mark one notification as read |
| Notifications | `POST` | `/api/notifications/read-all` | Auth + CSRF | Mark all notifications as read |
| Dashboard | `GET` | `/api/dashboard/summary` | Auth | Financial summary, 6-month trend, budgets, goals, bills |
| Dashboard | `GET` | `/api/dashboard/trends` | Auth | Identical alias to `/api/dashboard/summary` |
| Reports | `GET` | `/api/reports/summary` | Auth | Aggregate summary + paginated transaction list |
| Reports | `GET` | `/api/reports/export.csv` | Auth | Download filtered transactions report as CSV |
| Reports | `GET` | `/api/reports/export.pdf` | Auth | Download summary & transaction breakdown report as PDF |

---

## 5. Endpoint Details by Module

### 5.1 System Health

#### `GET /api/health`
- **Description & Business Logic:** Checks service readiness by running a lightweight `SELECT 1` query on SQLite.
- **Access:** Public (no authentication).
- **Success Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "service": "FinanceTrack API"
  }
  ```
- **Error Response:** `500` if the database cannot be accessed.

---

### 5.2 Authentication & Profile

#### `POST /api/auth/register`
- **Description & Business Logic:** Registers a new user, hashes the password using `bcryptjs` (12 salt rounds), normalizes email to lowercase, and in a single database transaction automatically creates 13 initial categories (5 `income` and 8 `expense`) plus a new login session.
- **Access:** Public (rate-limited by `authLimiter`: max 20 requests/15 min/IP).
- **Special Request Headers:** `Content-Type: application/json`
- **Request Body:**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | Yes | Trim, 1–120 characters | User full name |
  | `email` | string | Yes | Valid email format, max 254 chars, auto-lowercased | Unique user email |
  | `password` | string | Yes | 10–72 characters, max 72 UTF-8 bytes, must contain letters `[a-zA-Z]` and digits `\d` | Account password |
  | `currency` | string | No | Enum: `IDR`, `USD`, `EUR`, `SGD`, `MYR` (default: `IDR`) | Primary account currency |
  | `timezone` | string | No | Valid IANA timezone max 80 chars (default: `Asia/Jakarta`) | User timezone |
  ```json
  {
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "Password123",
    "currency": "IDR",
    "timezone": "Asia/Jakarta"
  }
  ```
- **Success Response (`201 Created`):** Sets `ft_session` cookie and returns profile + `csrfToken`.
  ```json
  {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "currency": "IDR",
      "timezone": "Asia/Jakarta",
      "theme": "light",
      "notificationPreferences": { "budget": true, "bill": true, "recurring": true },
      "createdAt": "2026-01-15T10:00:00.000Z"
    },
    "csrfToken": "a1b2c3..."
  }
  ```
- **Error Response:** `403` (Origin not allowed), `409` (`"Email sudah digunakan."`), `415` (not JSON), `422` (Zod validation failed), `429` (rate limit).
- **`curl` Example:**
  ```bash
  curl -X POST http://127.0.0.1:4000/api/auth/register \
    -H "Content-Type: application/json" \
    -c cookies.txt \
    -d '{"name":"Budi Santoso","email":"budi@example.com","password":"Password123"}'
  ```

#### `POST /api/auth/login`
- **Description & Business Logic:** Verifies email & password credentials (using *constant-time* comparison with a dummy hash if user is not found), cleans up expired sessions, creates a new session, and sets the `ft_session` cookie. Note: `SELECT * FROM users WHERE email=?` uses an `email` column with `COLLATE NOCASE`.
- **Access:** Public (rate-limited by `authLimiter`).
- **Request Body:**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | string | Yes | Valid email format, max 254 chars | Registered email |
  | `password` | string | Yes | String max 100 chars | Password |
  ```json
  {
    "email": "budi@example.com",
    "password": "Password123"
  }
  ```
- **Success Response (`200 OK`):** Sets `ft_session` cookie, returns `{ "user": {...}, "csrfToken": "..." }`.
- **Error Response:** `401` (`"Email atau kata sandi salah."`), `403`, `415`, `422`, `429`.

#### `POST /api/auth/forgot-password`
- **Description & Business Logic:** Initiates password recovery. If the email is registered, a 64-hex-character random token is generated with a 30-minute expiry (previous user tokens are deleted). If `SMTP_HOST` is configured, an email is sent via `nodemailer`; if `SMTP_HOST` is absent and `NODE_ENV !== "production"`, an `.eml` file is saved to `<databaseDir>/outbox/`. Always returns a generic message to prevent email enumeration.
- **Access:** Public (rate-limited by `authLimiter`).
- **Request Body:** `{ "email": "budi@example.com" }` (valid `email`, max 254 chars).
- **Success Response (`200 OK`):**
  ```json
  {
    "message": "Jika email terdaftar, petunjuk pemulihan akan dikirim. Tautan berlaku 30 menit."
  }
  ```
- **Error Response:** `403`, `415`, `422`, `429`.

#### `POST /api/auth/reset-password`
- **Description & Business Logic:** Resets the password using a valid 64-character token (`expires_at > now`). Tokens are single-use; all reset tokens and all active sessions for the user are deleted.
- **Access:** Public (rate-limited by `authLimiter`).
- **Request Body:**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `token` | string | Yes | Exact length 64 characters | Recovery token from email/outbox |
  | `password` | string | Yes | 10–72 chars, max 72 UTF-8 bytes, letters + digits | New password |
- **Success Response (`200 OK`):** `{ "message": "Kata sandi diperbarui. Silakan masuk kembali." }`
- **Error Response:** `400` (`"Tautan pemulihan tidak valid atau kedaluwarsa."`), `403`, `415`, `422`, `429`.

#### `GET /api/profile`
- **Description & Business Logic:** Retrieves the currently logged-in user's profile along with the active `csrfToken` for the current session.
- **Access:** Authenticated (`ft_session` cookie).
- **Success Response (`200 OK`):** `{ "user": {...}, "csrfToken": "..." }`
- **Error Response:** `401`.

#### `PATCH /api/profile`
- **Description & Business Logic:** Updates profile fields (`name`, `currency`, `timezone`, `theme`, `notificationPreferences`). Uses `.strict()` so unknown fields are rejected. Changing `currency` is rejected (`409`) if the user already has any financial records (`account`, `transaction`, `budget`, `goal`, `bill`, or `recurring`).
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (all optional, `.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | No | Trim, 1–120 characters | Display name |
  | `currency` | string | No | Enum: `IDR`, `USD`, `EUR`, `SGD`, `MYR` | Can only be changed before financial data exists |
  | `timezone` | string | No | Valid IANA timezone max 80 chars | Timezone |
  | `theme` | string | No | Enum: `light`, `dark`, `system` | UI theme |
  | `notificationPreferences` | object | No | `{ budget: boolean, bill: boolean, recurring: boolean }` (all 3 fields required if object is sent) | Reminder preferences |
- **Success Response (`200 OK`):** `{ "user": { ... } }`
- **Error Response:** `401`, `403`, `409` (currency cannot be changed after financial data is created), `415`, `422`.

#### `POST /api/auth/logout`
- **Description & Business Logic:** Deletes the current session from the database and clears the `ft_session` cookie.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** `{ "message": "Berhasil keluar." }`
- **Error Response:** `401`, `403`, `415`.

#### `POST /api/auth/change-password`
- **Description & Business Logic:** Changes the user's password after verifying `currentPassword`. Deletes all other device sessions belonging to the user (`token_hash <> req.sessionHash`), keeping the current session.
- **Access:** Authenticated + `X-CSRF-Token` + `authLimiter`.
- **Request Body:**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `currentPassword` | string | Yes | Max 100 characters | Current password |
  | `password` | string | Yes | 10–72 chars, letters + digits | New password |
- **Success Response (`200 OK`):** `{ "message": "Kata sandi diperbarui. Sesi perangkat lain telah diakhiri." }`
- **Error Response:** `401`, `403` (`"Kata sandi saat ini salah."` or CSRF/Origin), `415`, `422`, `429`.

#### `DELETE /api/profile`
- **Description & Business Logic:** Permanently deletes the user account and all related data (`ON DELETE CASCADE` across all tables), then clears the `ft_session` cookie.
- **Access:** Authenticated + `X-CSRF-Token` + `authLimiter`.
- **Request Body:**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `password` | string | Yes | Max 100 characters | Password verification |
  | `confirmation` | string | Yes | Must be exact value `"HAPUS AKUN"` | Explicit confirmation |
- **Success Response (`200 OK`):** `{ "message": "Akun dan seluruh data keuangan telah dihapus." }`
- **Error Response:** `401`, `403` (`"Kata sandi salah."` or CSRF/Origin), `415`, `422`, `429`.

---

### 5.3 Accounts (`Accounts`)

All creation mutations (`POST`) in this module require the `Idempotency-Key` header (matching regex `/^[\w-]{8,100}$/`) and record an `audit` log.

#### `GET /api/accounts`
- **Description & Business Logic:** Retrieves the user's accounts (ordered by `created_at, id`) complete with running `balance` dynamically calculated from `openingBalance + delta` of all `active` transactions (`+income`, `-expense`, `+incoming transfer`, `-outgoing transfer`).
- **Access:** Authenticated.
- **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "name": "BCA Utama",
      "type": "bank",
      "openingBalance": 5000000,
      "openingBalanceDate": "2026-01-01",
      "description": "Rekening gaji",
      "currency": "IDR",
      "isArchived": false,
      "balance": 6250000,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
  ```
- **Error Response:** `401`.

#### `POST /api/accounts`
- **Description & Business Logic:** Creates a new account with currency following `user.currency`, then triggers reminder evaluation and audit logging (`create`).
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars `[A-Za-z0-9_-]`), `Content-Type: application/json`.
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | Yes | Trim, 1–120 characters | Account name |
  | `type` | string | Yes | Enum: `cash`, `bank`, `ewallet`, `other` | Account type |
  | `openingBalance` | number \| string | Yes | Number / decimal string `^-?\d+(\.\d{1,2})?$`, minor value `-10^12` to `10^12` (can be negative or 0) | Opening balance |
  | `openingBalanceDate` | string | Yes | Valid date `YYYY-MM-DD` | Opening balance effective date |
  | `description` | string | No | Trim, max 1000 chars (default `""`) | Account notes |
- **Success Response (`201 Created`):** Created account object (`openingBalance`, `currency`, `isArchived: false`, without `balance` since `balance` is computed in list/detail endpoints).
- **Error Response:** `400`, `401`, `403`, `409` (Idempotency-Key conflict), `415`, `422`.
- **`curl` Example:**
  ```bash
  curl -X POST http://127.0.0.1:4000/api/accounts \
    -b cookies.txt -H "Content-Type: application/json" \
    -H "X-CSRF-Token: <csrf>" -H "Idempotency-Key: acc-create-001" \
    -d '{"name":"BCA Utama","type":"bank","openingBalance":5000000,"openingBalanceDate":"2026-01-01"}'
  ```

#### `GET /api/accounts/:id`
- **Description & Business Logic:** Retrieves details of a single account along with its running `balance`.
- **Access:** Authenticated (owner only).
- **Path Parameters:** `id` (Account UUID).
- **Success Response (`200 OK`):** Account object with `balance`.
- **Error Response:** `401`, `404`.

#### `PATCH /api/accounts/:id`
- **Description & Business Logic:** Updates account `name`, `type`, or `description`. `openingBalance` and `openingBalanceDate` **cannot be changed** through this endpoint.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (partial, `.strict()`):** `name`, `type`, `description`.
- **Success Response (`200 OK`):** Updated account object.
- **Error Response:** `401`, `403`, `404`, `415`, `422`.

#### `POST /api/accounts/:id/archive`
- **Description & Business Logic:** Archives an account (`isArchived: true`). Archived accounts cannot be used in new transactions/goals/schedules, but their historical data is preserved.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** Account object with `isArchived: true`.
- **Error Response:** `401`, `403`, `404`, `415`.

---

### 5.4 Categories (`Categories`)

#### `GET /api/categories`
- **Description & Business Logic:** Retrieves all categories owned by the user (both active and archived), ordered by `created_at DESC, id DESC`.
- **Access:** Authenticated.
- **Success Response (`200 OK`):** Array of category objects (`id`, `name`, `type`, `color`, `isArchived`, `createdAt`, `updatedAt`).

#### `POST /api/categories`
- **Description & Business Logic:** Adds a new income or expense category.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars).
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | Yes | Trim, 1–120 characters | Category name |
  | `type` | string | Yes | Enum: `income`, `expense` | Category type |
  | `color` | string | No | Regex `^#[a-fA-F0-9]{6}$` (default: `#478673`) | Hex color code |
- **Success Response (`201 Created`):** New category object with `isArchived: false`.
- **Error Response:** `400`, `401`, `403`, `409`, `415`, `422`.

#### `PATCH /api/categories/:id`
- **Description & Business Logic:** Updates category `name`, `type`, or `color`. If `type` is changed, the system rejects (`409`) if the category has already been used in any transaction, budget, bill, or recurring schedule.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (partial, `.strict()`):** `name`, `type`, `color`.
- **Success Response (`200 OK`):** Updated category object.
- **Error Response:** `401`, `403`, `404`, `409`, `415`, `422`.

#### `DELETE /api/categories/:id`
- **Description & Business Logic:** Archives a category (*soft delete*, setting `isArchived` to `true`) so transaction history remains intact.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** Category object with `isArchived: true`.
- **Error Response:** `401`, `403`, `404`, `415`.

---

### 5.5 Transactions & Transfers (`Transactions`)

#### `GET /api/transactions`
- **Description & Business Logic:** Retrieves the user's **active** transactions (`status = 'active'`) with support for filtering, description search (case-insensitive substring via SQLite `instr(lower(...))`), sorting, and pagination.
- **Access:** Authenticated.
- **Query Parameters:**
  | Name | Type | Required | Default / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `startDate` | string | No | `YYYY-MM-DD`, must be `<= endDate` | Start date filter (inclusive) |
  | `endDate` | string | No | `YYYY-MM-DD` | End date filter (inclusive) |
  | `accountId` | string (UUID) | No | Valid UUID | Filter transactions involving this account (`accountId`, `fromAccountId`, or `toAccountId`) |
  | `categoryId` | string (UUID) | No | Valid UUID | Filter by category |
  | `type` | string | No | `income`, `expense`, `transfer` | Filter transaction type |
  | `search` | string | No | Trim, max 200 chars | Search text in `description` |
  | `sort` | string | No | `date_desc` (default), `date_asc`, `amount_desc`, `amount_asc` | Result sort order |
  | `page` | integer | No | Min `1`, max `100000`, default `1` | Page number |
  | `pageSize` | integer | No | Min `1`, max `100`, default `20` | Items per page |
- **Success Response (`200 OK`):**
  ```json
  {
    "items": [
      {
        "id": "...",
        "type": "expense",
        "amount": 45000,
        "date": "2026-01-15",
        "description": "Makan siang",
        "accountId": "...",
        "categoryId": "...",
        "currency": "IDR",
        "source": "manual",
        "status": "active",
        "createdAt": "2026-01-15T05:00:00.000Z",
        "updatedAt": "2026-01-15T05:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "pages": 1
  }
  ```
- **Error Response:** `400` (`startDate > endDate`), `401`, `422`.

#### `POST /api/transactions` and `POST /api/transfers`
- **Description & Business Logic:** Records a new transaction (`income`, `expense`, or `transfer`). `/api/transfers` is an alias that automatically forces `type: "transfer"`.
  - For `income` / `expense`: requires `accountId` and `categoryId` (both active/unarchived), forbids `fromAccountId`/`toAccountId`, `category.type` must match `type`, and `date >= account.openingBalanceDate`.
  - For `transfer`: requires distinct and active `fromAccountId` and `toAccountId`, forbids `accountId`/`categoryId`, and `date >= openingBalanceDate` for both accounts.
  - Saves `source: "manual"`, `status: "active"`, records `create` audit, and triggers budget/bill reminder evaluation.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars), `Content-Type: application/json`.
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `type` | string | Yes (auto `"transfer"` on `/transfers`) | Enum: `income`, `expense`, `transfer` | Transaction type |
  | `amount` | number \| string | Yes | > 0, max 2 decimals, minor `1` to `10^12` | Transaction amount |
  | `date` | string | Yes | Valid date `YYYY-MM-DD`, `>= openingBalanceDate` | Transaction date |
  | `description` | string | No | Trim, max 1000 chars (default `""`) | Note/description |
  | `accountId` | string (UUID) | Conditional | Required if `income`/`expense`; forbidden if `transfer` | Account ID |
  | `categoryId` | string (UUID) | Conditional | Required if `income`/`expense`; forbidden if `transfer` | Category ID |
  | `fromAccountId` | string (UUID) | Conditional | Required if `transfer`; forbidden if not `transfer` | Source account |
  | `toAccountId` | string (UUID) | Conditional | Required if `transfer` & different from source; forbidden if not `transfer` | Destination account |
- **Success Response (`201 Created`):** Created transaction object.
- **Error Response:** `400`, `401`, `403`, `404` (account/category not found), `409` (archived / idempotency conflict), `415`, `422`.
- **`curl` Example:**
  ```bash
  curl -X POST http://127.0.0.1:4000/api/transactions \
    -b cookies.txt -H "Content-Type: application/json" \
    -H "X-CSRF-Token: <csrf>" -H "Idempotency-Key: tx-create-001" \
    -d '{"type":"expense","amount":45000,"date":"2026-01-15","accountId":"<acc-id>","categoryId":"<cat-id>","description":"Makan siang"}'
  ```

#### `GET /api/transactions/:id`
- **Description & Business Logic:** Retrieves details of a single transaction (active or void) along with its `history` array from related `audit` records.
- **Access:** Authenticated.
- **Success Response (`200 OK`):** Transaction object plus `history: [...]`.
- **Error Response:** `401`, `404`.

#### `PATCH /api/transactions/:id`
- **Description & Business Logic:** Updates an `active` transaction. Transactions already marked `void` are rejected (`409`). If the transaction is linked to a bill payment (`bill.paidTransactionId`), updates are restricted to keep it `expense` with the exact same `categoryId` and `amount` as the bill (`409` if violated). Records `update` audit.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body:** Partial transaction schema (`.strict()`).
- **Success Response (`200 OK`):** Updated transaction object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `POST /api/transactions/:id/void`
- **Description & Business Logic:** Voids a transaction (`status: "void"`). If this transaction marked a bill as paid (`paidTransactionId`), the payment link on that bill is automatically cleared (`paidTransactionId: null, paidAt: null`). Records `void` audit.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** Transaction object with `status: "void"`.
- **Error Response:** `401`, `403`, `404`, `415`.

---

### 5.6 Budgets (`Budgets`)

#### `GET /api/budgets`
- **Description & Business Logic:** Retrieves all user budgets (ordered by `period DESC`) along with calculated spending realization (`spent`), remaining (`remaining`), percentage (`percentage`), and status (`safe`, `warning`, or `exceeded`).
- **Access:** Authenticated.
- **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": "...",
      "categoryId": "...",
      "period": "2026-01",
      "limitAmount": 2000000,
      "warningThreshold": 80,
      "spent": 1650000,
      "remaining": 350000,
      "percentage": 82.5,
      "status": "warning",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
  ```

#### `POST /api/budgets`
- **Description & Business Logic:** Creates a budget for an `expense` category in a `YYYY-MM` monthly period. Only one budget is allowed per `(user_id, categoryId, period)` combination.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars).
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `categoryId` | string (UUID) | Yes | Active `expense` category | Expense category |
  | `period` | string | Yes | Format `YYYY-MM` (`01`–`12`) | Budget month period |
  | `limitAmount` | number \| string | Yes | > 0, max 2 decimals, minor `1` to `10^12` | Budget limit |
  | `warningThreshold` | number | No | `1`–`99` (default: `80`) | Percentage triggering `warning` status & notification |
- **Success Response (`201 Created`):** Created budget object.
- **Error Response:** `400`, `401`, `403`, `404`, `409` (archived category or category+period already exists), `415`, `422`.

#### `PATCH /api/budgets/:id`
- **Description & Business Logic:** Updates budget data (category is still validated to be `expense` and active).
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (partial, `.strict()`):** `categoryId`, `period`, `limitAmount`, `warningThreshold`.
- **Success Response (`200 OK`):** Updated budget object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `DELETE /api/budgets/:id`
- **Description & Business Logic:** Permanently deletes a budget record.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** `{ "message": "Anggaran dihapus." }`
- **Error Response:** `401`, `403`, `404`, `415`.

---

### 5.7 Recurring Transactions (`Recurring`)

#### `GET /api/recurring`
- **Description & Business Logic:** Retrieves all recurring transaction schedules owned by the user.
- **Access:** Authenticated.
- **Success Response (`200 OK`):** Array of schedule objects (`id`, `type`, `amount`, `accountId`, `categoryId`, `description`, `startDate`, `endDate`, `frequency`, `currency`, `nextRunAt`, `lastRunAt`, `isPaused`, `isEnded`, `lastError`, `createdAt`, `updatedAt`).

#### `POST /api/recurring`
- **Description & Business Logic:** Creates a recurring transaction schedule for `income` or `expense`. Validates active account & category per `ledger.validate` rules, and ensures `endDate >= startDate` (if `endDate` is provided). Initializes `nextRunAt = startDate`, `isPaused = false`, `isEnded = false`.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars).
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `type` | string | Yes | Enum: `income`, `expense` | Transaction type |
  | `amount` | number \| string | Yes | > 0, max 2 decimals | Amount per execution |
  | `accountId` | string (UUID) | Yes | Active account, `startDate >= openingBalanceDate` | Account |
  | `categoryId` | string (UUID) | Yes | Active category matching `type` | Category |
  | `description` | string | No | Trim, max 1000 chars (default `""`) | Transaction note |
  | `startDate` | string | Yes | `YYYY-MM-DD` | Start date |
  | `endDate` | string \| null | No | `YYYY-MM-DD` or `null`, `>= startDate` | Optional end date |
  | `frequency` | string | Yes | Enum: `daily`, `weekly`, `monthly`, `yearly` | Recurrence frequency |
- **Success Response (`201 Created`):** Created schedule object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `PATCH /api/recurring/:id`
- **Description & Business Logic:** Updates a schedule, pauses (`isPaused`), or ends (`isEnded`) it. A schedule with `isEnded: true` cannot be reactivated (`isEnded: false` is rejected with `400`). Pausing/ending is still allowed even if the account/category has been archived. If `startDate` or `frequency` is changed, the new `startDate` must be `> lastRunAt` (if previously executed) and `nextRunAt` is reset to `startDate`. Clears `lastError`.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (partial, `.strict()`):** `recurringSchema` fields plus `isPaused` (boolean) and `isEnded` (boolean).
- **Success Response (`200 OK`):** Updated schedule object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `POST /api/recurring/process`
- **Description & Business Logic:** Manually runs the scheduler for the current user: executes all active schedules where `nextRunAt <= today` (max 400 iterations per schedule per cycle), creates transactions with `source: "recurring"` and a unique `occurrenceKey`, and evaluates reminders.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** `{ "processed": 2 }`
- **Error Response:** `401`, `403`, `415`.

---

### 5.8 Savings Goals (`Goals`) & Contributions

#### `GET /api/goals`
- **Description & Business Logic:** Retrieves all user savings goals complete with active contribution aggregations (`currentAmount`, `remaining`, `percentage`, `isAchieved`).
- **Access:** Authenticated.
- **Success Response (`200 OK`):** Array of savings goal objects.

#### `POST /api/goals`
- **Description & Business Logic:** Creates a new savings goal. If `accountId` is provided, the account must be active and owned by the user.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars).
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | Yes | Trim, 1–120 characters | Goal name |
  | `targetAmount` | number \| string | Yes | > 0, max 2 decimals | Target amount |
  | `targetDate` | string \| null | No | `YYYY-MM-DD` or `null` | Optional target date |
  | `accountId` | string (UUID) \| null | No | Active account UUID or `null` | Optional reference account |
  | `status` | string | No | Enum: `active`, `paused`, `completed`, `archived` (default: `active`) | Goal status |
- **Success Response (`201 Created`):** Created goal object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `PATCH /api/goals/:id`
- **Description & Business Logic:** Updates savings goal details or status.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (partial, `.strict()`):** `name`, `targetAmount`, `targetDate`, `accountId`, `status`.
- **Success Response (`200 OK`):** Updated goal object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `GET /api/goals/:id/contributions`
- **Description & Business Logic:** Retrieves the full contribution history (active and void) for a specific savings goal.
- **Access:** Authenticated.
- **Success Response (`200 OK`):** Array of contribution objects (`id`, `goalId`, `amount`, `date`, `note`, `status`, `mode: "progress-only"`, `createdAt`, `updatedAt`).
- **Error Response:** `401`, `404`.

#### `POST /api/goals/:id/contributions`
- **Description & Business Logic:** Records a new progress contribution on an `active` savings goal (`mode: "progress-only"`, does not alter account balance). Goals that are not `active` are rejected (`409`).
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars).
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `amount` | number \| string | Yes | > 0, max 2 decimals | Contribution amount |
  | `date` | string | Yes | `YYYY-MM-DD` | Contribution date |
  | `note` | string | No | Trim, max 1000 chars (default `""`) | Note |
- **Success Response (`201 Created`):** New contribution object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `PATCH /api/goals/:id/contributions/:contributionId`
- **Description & Business Logic:** Updates an `active` contribution (`void` contributions are rejected with `409`).
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (partial, `.strict()`):** `amount`, `date`, `note`.
- **Success Response (`200 OK`):** Updated contribution object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `POST /api/goals/:id/contributions/:contributionId/void`
- **Description & Business Logic:** Voids a contribution (`status: "void"`) so it is no longer counted toward goal progress.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** Contribution object with `status: "void"`.
- **Error Response:** `401`, `403`, `404`, `415`.

---

### 5.9 Bills (`Bills`)

#### `GET /api/bills`
- **Description & Business Logic:** Retrieves the user's bills with a dynamically computed `status` field based on `today(user.timezone)`: `"paid"` (if `paidTransactionId` is set), `"overdue"` (`dueDate < day`), `"due"` (`dueDate === day`), or `"upcoming"`.
- **Access:** Authenticated.
- **Success Response (`200 OK`):** Array of bill objects.

#### `POST /api/bills`
- **Description & Business Logic:** Creates a new bill reminder. Category must be active and of type `expense`. Stores `anchorDate = dueDate`, `isArchived = false`, `paidTransactionId = null`.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars).
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | Yes | Trim, 1–120 characters | Bill name |
  | `amount` | number \| string | Yes | > 0, max 2 decimals | Bill amount |
  | `dueDate` | string | Yes | `YYYY-MM-DD` | Due date |
  | `frequency` | string | No | Enum: `once`, `daily`, `weekly`, `monthly`, `yearly` (default: `once`) | Bill recurrence |
  | `categoryId` | string (UUID) | Yes | Active `expense` category | Expense category |
  | `reminderDays` | integer | No | `0`–`30` (default: `3`) | Days before due date for reminder |
  | `note` | string | No | Trim, max 1000 chars (default `""`) | Note |
- **Success Response (`201 Created`):** Created bill object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `PATCH /api/bills/:id`
- **Description & Business Logic:** Updates a bill (including `isArchived`). Paid bills (`paidTransactionId !== null`) cannot be modified (`409`). If `dueDate` is changed, `anchorDate` is also updated.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Request Body (partial, `.strict()`):** `billSchema` fields plus `isArchived` (boolean).
- **Success Response (`200 OK`):** Updated bill object.
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

#### `POST /api/bills/:id/pay`
- **Description & Business Logic:** Pays a bill idempotently. If already paid, immediately returns the bill data. Archived bills are rejected (`409`).
  - **Mode 1 (`transactionId` provided):** Links an existing active `expense` transaction with the exact same `amount` and `categoryId` (and not yet linked to another bill).
  - **Mode 2 (`accountId` provided):** Automatically creates a new `expense` transaction (`source: "bill"`, `billId`) on `date` (or today in the user's timezone).
  - If `frequency !== "once"` and the next bill has not been created yet, automatically creates the next period's bill (`parentBillId = bill.id`) with the new `dueDate`. Records `pay` audit.
- **Access:** Authenticated + `X-CSRF-Token`.
- **Special Request Headers:** `Idempotency-Key` (required, 8–100 chars).
- **Request Body (`.strict()`):**
  | Name | Type | Required | Validation / Rules | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `accountId` | string (UUID) | Conditional | Required if `transactionId` is not sent | Paying account |
  | `transactionId` | string (UUID) | Conditional | Alternative to `accountId` | Existing expense transaction ID |
  | `date` | string | No | `YYYY-MM-DD` (default: today) | Payment date (for `accountId` mode) |
- **Success Response (`200 OK`):** Updated bill object (`paidTransactionId`, `paidAt`).
- **Error Response:** `400`, `401`, `403`, `404`, `409`, `415`, `422`.

---

### 5.10 Notifications (`Notifications`)

#### `GET /api/notifications`
- **Description & Business Logic:** First runs `scheduled.reminders(userId)` atomically to generate budget & due bill reminders (according to `notificationPreferences` and *dedupeKey*), then returns the user's notification list.
- **Access:** Authenticated.
- **Success Response (`200 OK`):** Array of notification objects (`id`, `type`, `title`, `message`, `relatedEntityId`, `dedupeKey`, `isRead`, `createdAt`, `updatedAt`).

#### `PATCH /api/notifications/:id/read`
- **Description & Business Logic:** Marks a single notification as read (`isRead: true`).
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** Updated notification object.
- **Error Response:** `401`, `403`, `404`, `415`.

#### `POST /api/notifications/read-all`
- **Description & Business Logic:** Marks all unread notifications for the user as `isRead: true`.
- **Access:** Authenticated + `X-CSRF-Token` + `Content-Type: application/json`.
- **Request Body:** None (send `{}`).
- **Success Response (`200 OK`):** `{ "message": "Semua notifikasi dibaca." }`

---

### 5.11 Dashboard & Reports (`Dashboard & Reports`)

All endpoints in this module accept transaction filter query parameters (`filtersSchema`: `startDate`, `endDate`, `accountId`, `categoryId`, `type`, `search`, `sort`, `page`, `pageSize`).

#### `GET /api/dashboard/summary` and `GET /api/dashboard/trends`
- **Description & Business Logic:** Returns a comprehensive dashboard summary. By default the date range is the start of the current month to today (`YYYY-MM-01` to `today`), overridable via `startDate`/`endDate` queries. Includes total `income`, `expense`, `net` cash flow, `transfer`, category breakdown, monthly & daily trends, all accounts + `totalBalance`, budgets for the `startDate` month, all savings goals, up to 4 nearest unpaid bills, 5 `recent` transactions, and `comparison` (last 6 months trend).
- **Access:** Authenticated.
- **Query Parameters:** Same as `GET /api/transactions`.
- **Success Response (`200 OK`):** Combined dashboard summary object.

#### `GET /api/reports/summary`
- **Description & Business Logic:** Returns an aggregate summary of filtered transactions (`income`, `expense`, `net`, `transfer`, `transactionCount`, `categories`, `trends`, `daily`, `filters`) along with a paginated `transactions` object.
- **Access:** Authenticated.
- **Query Parameters:** Same as `GET /api/transactions`.
- **Success Response (`200 OK`):** Report summary object + `transactions`.

#### `GET /api/reports/export.csv`
- **Description & Business Logic:** Exports all matching filtered transactions (without pagination) in UTF-8 CSV format (with BOM `\uFEFF`), protected against *CSV formula injection* (prefixes cells starting with `=`, `+`, `@`, `-`, `\t`, `\r` with a single quote `'`). Columns: `Tanggal, Jenis, Deskripsi, Kategori, Rekening, Tujuan, Nominal, Mata uang`.
- **Access:** Authenticated.
- **Query Parameters:** Transaction filters (`startDate`, `endDate`, `accountId`, `categoryId`, `type`, `search`, `sort`).
- **Success Response (`200 OK`):** File download `financetrack-transactions.csv` (`text/csv; charset=utf-8`).

#### `GET /api/reports/export.pdf`
- **Description & Business Logic:** Generates an A4 PDF report using `pdfkit` (`NotoSans.ttf` font) containing owner info, period, active filters, income/expense/cashflow/transfer summary, and the full list of filtered transactions with page numbers.
- **Access:** Authenticated.
- **Query Parameters:** Transaction filters (`startDate`, `endDate`, `accountId`, `categoryId`, `type`, `search`, `sort`).
- **Success Response (`200 OK`):** File download `financetrack-report.pdf` (`application/pdf`).

---

## 6. Real-Time / WebSocket / SSE / Webhooks

The FinanceTrack API **only uses HTTP REST** and **does not provide** WebSocket, Server-Sent Events (SSE), or Webhook endpoints.

Recurring transaction processing and budget/bill reminders are executed via:
1. **Internal Periodic Scheduler:** `setInterval` in `src/server.js` runs every `SCHEDULER_INTERVAL_MS` ms (default `60000` ms / 1 minute, minimum `1000` ms).
2. **Synchronous Evaluation on Mutation & Notification Fetch:** Every financial data mutation calls `scheduled.reminders(userId)`, and `GET /api/notifications` evaluates the latest reminders before returning results.
3. **Manual Trigger:** `POST /api/recurring/process`.

---

## 7. Rate Limiting, Security & Operational Notes

- **Rate Limiting:**
  - `authLimiter` (`express-rate-limit`): maximum **20 requests per 15 minutes per IP** (`standardHeaders: "draft-8"`, `legacyHeaders: false`). Applied to: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/change-password`, and `DELETE /api/profile`.
- **HTTP Security & CORS:**
  - The application does not use permissive CORS headers; cross-origin protection is enforced by `originGuard`:
    - For mutating requests (`POST`/`PATCH`/`DELETE`), the `Origin` header (if present) must match `APP_ORIGIN` (in non-production mode, `localhost` and `127.0.0.1` on the same port are allowed).
    - All mutating requests on `/api` must have `Content-Type: application/json`.
  - `helmet` is enabled (`strictTransportSecurity` is active only when `COOKIE_SECURE=true`).
  - `TRUST_PROXY=1` is enabled in Docker Compose so `req.ip` reads the real client IP behind Nginx.
  - Passwords are hashed with `bcryptjs` (12 rounds), max 72 characters / 72 UTF-8 bytes.
  - Session tokens and password reset tokens are stored as SHA-256 hashes in SQLite.
- **Payload & Upload Limits:**
  - Express JSON body limit: `64kb` (`client_max_body_size 64k` in Nginx). There is no file upload feature.
- **Pagination:**
  - Only applies to `GET /api/transactions` and `GET /api/reports/summary`: `page` default `1` (max `100000`), `pageSize` default `20` (min `1`, max `100`).
- **Idempotency-Key:**
  - Required (`8–100` alphanumeric/`_`/`-` characters) on: `POST /api/accounts`, `POST /api/categories`, `POST /api/transactions`, `POST /api/transfers`, `POST /api/budgets`, `POST /api/recurring`, `POST /api/goals`, `POST /api/goals/:id/contributions`, `POST /api/bills`, `POST /api/bills/:id/pay`. Reusing the same key with a different payload returns `409 Conflict`.
