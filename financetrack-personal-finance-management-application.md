# Portfolio Project Data — FinanceTrack - Personal Finance Management Application

- **Category:** `web-development` (`Web Development`)
- **Accent Color:** `cyan`
- **Target Assets Folder:** `public/images/projects/financetrack_personal_finance_management/`
- **Required Local Images:** `banner.webp`, `image01.webp` .. `image12.webp`

## TypeScript Data (`ProjectCaseStudy`)

```typescript
{
  "id": "financetrack-personal-finance-management-application",
  "code": "PRO-72 // WEB-18",
  "title": "FinanceTrack - Personal Finance Management Application",
  "category": "web-development",
  "categoryLabel": "Website",
  "year": "2026",
  "status": "Completed",
  "accentColor": "cyan",
  "repoUrl": "https://github.com/weztcy/FinanceTrack-Personal-Finance-Management-Application",
  "license": "MIT License",
  "banner": "/images/projects/financetrack_personal_finance_management/banner.webp",
  "summary": "Full-stack personal finance web app with ACID SQLite ledger, budgets, recurring schedules, goals, bills, and CSV/PDF reporting.",
  "projectDescription": "FinanceTrack is a full-stack personal finance web application engineered with React, Express, and native SQLite. It unifies multi-account cash flow tracking, monthly budgets, automated recurring schedules, bill reminders, savings goals, and CSV/PDF exports with strict ACID integrity.",
  "architectureSummary": "Lazy-loaded React 19 SPA communicating via same-origin Nginx/Vite proxy with an Express 5 REST API backed by WAL-enabled SQLite ACID transactions.",
  "techStack": [
    "React",
    "React Router",
    "Vite",
    "Recharts",
    "Lucide React",
    "Node.js",
    "Express",
    "SQLite",
    "Zod",
    "PDFKit",
    "Nodemailer",
    "bcryptjs",
    "Helmet",
    "Nginx",
    "Docker",
    "Mailpit"
  ],
  "telemetryMatrix": {
    "projectType": "Full-Stack Personal Finance Web App",
    "targetPlatform": "Web Browser & Docker Compose",
    "primaryDomain": "Personal Finance & Ledger Management",
    "architecturePipeline": "React SPA -> Express REST API -> SQLite WAL",
    "testingAndAudit": "18/18 Integration Tests & Smoke Passed",
    "projectStatus": "Completed",
    "projectYear": "2026"
  },
  "projectInfo": {
    "projectType": "Full-Stack Personal Finance Management Web Application",
    "developmentStatus": "Completed",
    "developmentYear": "2026",
    "platform": "Web Browser (Desktop & Mobile) / Docker Compose",
    "projectCategory": "Web Development"
  },
  "projectBackground": "Personal finance tracking often suffers from fragmented spreadsheets, inconsistent running balances, and duplicate entries during retries. FinanceTrack solves this by unifying accounts, budgets, bills, goals, and recurring transactions on an ACID SQLite ledger with strict per-user isolation.",
  "problemStatements": [
    {
      "title": "Balance Drift from Cached Totals",
      "description": "Manually maintained spreadsheets and cached account balance columns frequently desynchronize when historical transactions are edited, voided, or transferred between accounts.",
      "issueCode": "ISSUE_01"
    },
    {
      "title": "Duplicate Financial Records on Retries",
      "description": "Double clicks or transient network retries on transaction, payment, and goal contribution forms can insert duplicate monetary entries without request-level deduplication.",
      "issueCode": "ISSUE_02"
    },
    {
      "title": "Floating-Point Rounding Errors",
      "description": "Storing currency values as IEEE-754 floating-point numbers introduces rounding inaccuracies across multi-month aggregations, budgets, and transfer ledgers.",
      "issueCode": "ISSUE_03"
    },
    {
      "title": "Unattended Recurring & Bill Blind Spots",
      "description": "Client-dependent reminders fail to trigger when users do not open the application, causing missed recurring entries, unmonitored budget overruns, and late bill payments.",
      "issueCode": "ISSUE_04"
    }
  ],
  "projectObjectives": [
    {
      "title": "ACID Minor-Unit Financial Ledger",
      "description": "Compute account balances, budget utilization, and goal progress dynamically from active ledger records stored as integer minor units inside BEGIN IMMEDIATE SQLite transactions.",
      "targetTag": "TARGET_01"
    },
    {
      "title": "Idempotent & Deduplicated Mutations",
      "description": "Enforce Idempotency-Key payload fingerprinting across creation and payment endpoints while preventing duplicate recurring occurrences and bill payment links via unique database constraints.",
      "targetTag": "TARGET_02"
    },
    {
      "title": "Autonomous Backend Scheduler & Alerts",
      "description": "Execute recurring schedules and evaluate budget and bill reminders at backend startup and 60-second intervals according to each user's configured IANA timezone.",
      "targetTag": "TARGET_03"
    },
    {
      "title": "Verified Security & Export Pipeline",
      "description": "Deliver HttpOnly SameSite=Strict session cookies, CSRF header validation, strict Zod input schemas, and filter-consistent UTF-8 CSV and Noto Sans A4 PDF reporting.",
      "targetTag": "TARGET_04"
    }
  ],
  "coreFeatures": [
    {
      "title": "Multi-Account Ledger & Atomic Transfers",
      "description": "Supports cash, bank, e-wallet, and custom accounts with real-time aggregated balances, single-document inter-account transfers, edit audit trails, and non-destructive voiding.",
      "badge": "Ledger"
    },
    {
      "title": "Monthly Budgets & Threshold Alerts",
      "description": "Enforces one budget per expense category and monthly period with customizable warning thresholds (1%–99%), live safe/warning/exceeded states, and deduplicated notifications.",
      "badge": "Budgeting"
    },
    {
      "title": "Background Recurring Scheduler",
      "description": "Automates daily, weekly, monthly, and yearly income or expense transactions with catch-up execution, pause/end lifecycle controls, and failure notifications.",
      "badge": "Automation"
    },
    {
      "title": "Bills & Idempotent Payment Linking",
      "description": "Tracks upcoming, due-today, and overdue bills with configurable lead reminders, allowing users to pay by generating a new expense or linking an existing transaction.",
      "badge": "Bills"
    },
    {
      "title": "Savings Goals & Progress Contributions",
      "description": "Tracks target amounts, completion percentages, and optional linked accounts using progress-only contributions that can be edited or voided without mutating account balances.",
      "badge": "Goals"
    },
    {
      "title": "Interactive Dashboard & CSV/PDF Reports",
      "description": "Visualizes daily cash flow trends, category expense donuts, and 6-month comparisons while exporting filtered records as formula-safe CSV or multi-page A4 PDF documents.",
      "badge": "Analytics"
    }
  ],
  "interfaceShowcase": [
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image01.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image02.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image03.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image04.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image05.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image06.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image07.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image08.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image09.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image10.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image11.webp"
    },
    {
      "imageUrl": "/images/projects/financetrack_personal_finance_management/image12.webp"
    }
  ],
  "userFlow": {
    "summary": "Users authenticate via HttpOnly session cookies, configure accounts and categories, and record income, expenses, or transfers with idempotency guards. The dashboard aggregates live cash flow, budgets, bills, and goals while background workers process recurring schedules and alerts.",
    "steps": [
      {
        "step": "01",
        "title": "Authenticate & Initialize Workspace",
        "description": "User registers or signs in to receive an HttpOnly ft_session cookie, a session-bound CSRF token, and 13 seeded income and expense categories.",
        "actorOrNode": "Auth Page / Express Auth Routes"
      },
      {
        "step": "02",
        "title": "Configure Accounts & Financial Plans",
        "description": "User creates bank, cash, or e-wallet accounts with opening balances, sets monthly category budgets, defines savings goals, and registers recurring bills or schedules.",
        "actorOrNode": "Accounts / Budgets / Goals / Bills UI"
      },
      {
        "step": "03",
        "title": "Record & Audit Ledger Mutations",
        "description": "Client submits income, expense, or inter-account transfer payloads with X-CSRF-Token and Idempotency-Key headers; backend validates ownership and writes atomically.",
        "actorOrNode": "Transaction Form / Ledger Service"
      },
      {
        "step": "04",
        "title": "Automated Scheduling & Alert Evaluation",
        "description": "Backend scheduler processes due recurring entries every 60 seconds per user timezone and evaluates deduplicated budget threshold and bill due-date alerts.",
        "actorOrNode": "Scheduler Worker / Notification Engine"
      },
      {
        "step": "05",
        "title": "Analyze Trends & Export Reports",
        "description": "User inspects live dashboard KPIs, filters transactions by date, account, or category, and downloads formula-safe CSV or formatted A4 PDF reports.",
        "actorOrNode": "Dashboard / Reports Service"
      }
    ]
  },
  "systemArchitecture": {
    "summary": "The application uses a layered full-stack topology where a lazy-loaded React SPA communicates over same-origin /api routes proxied by Nginx or Vite. An Express 5 REST API enforces origin, CSRF, and Zod checks before executing atomic transactions on WAL-enabled SQLite storage.",
    "layers": [
      {
        "name": "Presentation & Client Layer",
        "role": "Renders lazy-loaded React 19 pages, Recharts visualizations, native dialog modals, and in-memory auth/CSRF state without localStorage tokens.",
        "components": [
          "React 19 SPA",
          "React Router 7",
          "Recharts 3",
          "Auth & CSRF Context",
          "Vite 7"
        ]
      },
      {
        "name": "Edge & Reverse Proxy Layer",
        "role": "Serves immutable static frontend assets, enforces Content Security Policy and security headers, and proxies /api requests to the backend.",
        "components": [
          "Nginx 1.28",
          "Vite Dev Proxy",
          "CSP & Security Headers",
          "64KB Body Limit"
        ]
      },
      {
        "name": "API & Security Middleware Layer",
        "role": "Validates Origin headers, JSON content types, HttpOnly session cookies, CSRF tokens, IP rate limits, and idempotency payload fingerprints.",
        "components": [
          "Express 5",
          "originGuard",
          "authenticate",
          "idempotent",
          "express-rate-limit",
          "Helmet"
        ]
      },
      {
        "name": "Domain Services & Workers Layer",
        "role": "Executes business rules for ledger aggregations, Zod validation, background recurring jobs, reminder deduplication, and CSV/PDF/email generation.",
        "components": [
          "ledger service",
          "scheduler worker",
          "reports & PDFKit",
          "Zod validation",
          "Nodemailer"
        ]
      },
      {
        "name": "Persistence Layer",
        "role": "Stores relational user/session/idempotency tables and indexed JSON financial documents with WAL concurrency and foreign-key cascades.",
        "components": [
          "SQLite (node:sqlite)",
          "WAL Journal Mode",
          "Expression Indexes",
          "Docker finance-data Volume"
        ]
      }
    ]
  },
  "databaseDataFlow": {
    "type": "Database Schema / ERD",
    "summary": "Uses a hybrid relational and JSON-document SQLite schema where users, sessions, password resets, and idempotency keys are relational tables while financial entities reside in an indexed records table partitioned by user_id and kind.",
    "entitiesOrPipelines": [
      {
        "name": "users",
        "type": "Table",
        "fields": [
          "id",
          "email",
          "password_hash",
          "name",
          "currency",
          "timezone",
          "theme",
          "preferences",
          "created_at",
          "updated_at"
        ]
      },
      {
        "name": "sessions & password_resets",
        "type": "Table",
        "fields": [
          "token_hash",
          "user_id",
          "csrf",
          "expires_at"
        ]
      },
      {
        "name": "idempotency",
        "type": "Table",
        "fields": [
          "user_id",
          "key",
          "scope",
          "fingerprint",
          "response"
        ]
      },
      {
        "name": "records (account & category)",
        "type": "Document Kind",
        "fields": [
          "id",
          "user_id",
          "name",
          "type",
          "openingBalanceMinor",
          "openingBalanceDate",
          "currency",
          "color",
          "isArchived"
        ]
      },
      {
        "name": "records (transaction & audit)",
        "type": "Document Kind",
        "fields": [
          "id",
          "type",
          "amountMinor",
          "date",
          "accountId",
          "categoryId",
          "fromAccountId",
          "toAccountId",
          "source",
          "status",
          "occurrenceKey"
        ]
      },
      {
        "name": "records (budget, recurring, goal, contribution, bill, notification)",
        "type": "Document Kind",
        "fields": [
          "limitAmountMinor",
          "period",
          "frequency",
          "nextRunAt",
          "targetAmountMinor",
          "dueDate",
          "paidTransactionId",
          "dedupeKey"
        ]
      }
    ]
  },
  "technicalImplementation": [
    {
      "category": "Financial Integrity",
      "title": "Minor-Unit Integer Arithmetic & Dynamic Balance Aggregation",
      "description": "All monetary inputs are validated to at most two decimal places, converted into integer minor units (*Minor) for SQLite storage, and aggregated on read from active transactions using SQL JSON extraction to prevent floating-point drift and stale balance caches.",
      "badge": "Ledger Math"
    },
    {
      "category": "Concurrency & Idempotency",
      "title": "BEGIN IMMEDIATE Transactions with Payload Fingerprinting",
      "description": "Every state-changing financial operation runs inside an explicit SQLite BEGIN IMMEDIATE transaction. Creation endpoints require an Idempotency-Key whose SHA-256 request body fingerprint returns cached responses on identical retries and 409 Conflict on altered payloads.",
      "badge": "ACID & Retry"
    },
    {
      "category": "Security & Auth",
      "title": "HttpOnly SameSite=Strict Cookies & Origin-Guarded CSRF",
      "description": "Sessions store SHA-256 hashes of 32-byte random tokens in SQLite without localStorage exposure. Mutating requests are protected by originGuard (strict APP_ORIGIN and application/json enforcement), X-CSRF-Token matching, Helmet headers, and per-IP rate limiting.",
      "badge": "AppSec"
    },
    {
      "category": "Automation & Reliability",
      "title": "Timezone-Aware Recurring Catch-Up & Unique Occurrence Guards",
      "description": "The scheduler runs at server startup and every 60 seconds, computing per-user local dates via IANA timezones, committing transaction creation and nextRunAt updates atomically, and enforcing a partial unique index on occurrenceKey to prevent duplicate postings across restarts.",
      "badge": "Scheduler"
    }
  ],
  "primaryTechSpecs": {
    "programmingLanguage": "JavaScript",
    "framework": "React & Express",
    "database": "SQLite"
  },
  "architectureQuality": {
    "badges": [
      "ACID SQLite Ledger",
      "Idempotent Mutations",
      "CSRF Session Guard",
      "Automated Recurring Jobs"
    ]
  }
}
```
