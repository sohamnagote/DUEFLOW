# DueFlow 🚀

> **India-first automated invoice follow-up SaaS for freelancers and boutique studios.**

DueFlow automates invoice follow-ups, sends deterministic payment reminders via Resend email and WhatsApp, provides AI-crafted reminder copy using Google Gemini with reliable fallbacks, and keeps accurate ledger audits with tenant isolation and Supabase PostgreSQL persistence.

---

## Architecture Overview

- **Frontend (`/frontend`)**:
  - React 19 + TypeScript + Vite + Tailwind CSS.
  - Retains existing responsive UI, client modals, invoice editor, email previews, and live telemetry cards.
  - Proxies `/api` to the Spring Boot backend (`http://localhost:8080`) in development.
- **Backend (`/backend`)**:
  - **Java 21** + **Spring Boot 3.3.5**.
  - **Spring Web** REST APIs maintaining exact endpoint contracts and response shapes.
  - **Spring Security** with Supabase JWT access token verification.
  - **Spring Data JPA** with PostgreSQL/Supabase-compatible persistence and H2 in-memory test fallback.
  - **Bean Validation** with standardized error messages.
  - **Resend Email Service**: Real HTML & plaintext reminder emails across Friendly, Professional, and Firm templates, plus Svix webhook signature verification.
  - **Google Gemini AI Service**: Reminder copy generation with deterministic fallback and `ai_actions` logging.
  - **Scheduled Reminder Engine**: Automated background cadence (-3 days, due date, +3 days overdue, +7 days overdue) with duplicate send prevention and atomic claim handling.
- **Database & Auth (`/supabase`)**:
  - Supabase PostgreSQL with Row Level Security (RLS) enabled on all tables:
    - `profiles`, `clients`, `invoices`, `reminder_rules`, `reminder_logs`, `ai_actions`, `integrations`.

---

## Local Development Setup

### Prerequisites
- **Java 21+** (OpenJDK 21, 25, or compatible)
- **Apache Maven 3.9+**
- **Node.js 20+** and **npm**

### 1. Environment Configuration
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Fill in your credentials or keep defaults for local testing with deterministic fallback.

### 2. Running the Java Spring Boot Backend
From the repository root:
```bash
npm run backend:dev
```
Or directly using Maven:
```bash
cd backend
mvn spring-boot:run
```
The backend starts on `http://localhost:8080`.
- Health check: `http://localhost:8080/api/health`

### 3. Running the Frontend
In a separate terminal:
```bash
npm run frontend:dev
```
The Vite frontend starts on `http://localhost:5173` and automatically proxies `/api` calls to `http://localhost:8080`.

### 4. Running the Test Suite
Run the comprehensive Java test suite (JWT verification, client/invoice CRUD, cross-user isolation, scheduler calculations, Resend failure handling, and Svix webhook verification):
```bash
npm run backend:test
```
Or with Maven:
```bash
cd backend
mvn test
```

---

## Environment Variables Reference

| Variable | Description | Exposure |
|---|---|---|
| `PORT` | Java server port (default `8080`) | Server-only |
| `NODE_ENV` | Environment mode (`development` or `production`) | Server-only |
| `APP_BASE_URL` | Base frontend URL for CORS (default `http://localhost:3000`) | Server-only |
| `DATABASE_URL` | Supabase PostgreSQL JDBC/connection pool URL | Server-only |
| `SUPABASE_URL` | Supabase project URL | Server-only |
| `SUPABASE_SECRET_KEY` | Supabase Service Role Secret Key | Server-only |
| `SUPABASE_ANON_KEY` | Supabase Public / Anon API Key | Server-only |
| `VITE_SUPABASE_URL` | Supabase URL for browser auth | Public (Vite) |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key for browser auth | Public (Vite) |
| `VITE_API_URL` | Backend URL for production frontend (e.g. `https://api.dueflow.in`) | Public (Vite) |
| `RESEND_API_KEY` | Resend API Key for live outbound email delivery | Server-only |
| `RESEND_FROM_EMAIL` | From address (e.g., `DueFlow Reminders <reminders@dueflow.in>`) | Server-only |
| `RESEND_WEBHOOK_SECRET` | Resend / Svix signing secret (`whsec_...`) | Server-only |
| `GEMINI_API_KEY` | Google Gemini API Key | Server-only |
| `GEMINI_MODEL` | Gemini model name (default `gemini-3.8-flash`) | Server-only |
| `CRON_SECRET` | Secret token to authenticate `/api/cron/process-reminders` | Server-only |

---

## Google Cloud Auth Platform Branding & Consent Screen Reference

Configure these exact public URLs in your **Google Cloud Console** under **APIs & Services > OAuth consent screen > Branding**:

| Field | Production Value |
|---|---|
| **App Name** | `DueFlow` |
| **Application Home Page** | `https://dueflow-kappa.vercel.app` |
| **Application Privacy Policy Link** | `https://dueflow-kappa.vercel.app/privacy` |
| **Application Terms of Service Link** | `https://dueflow-kappa.vercel.app/terms` |
| **Authorized Domains** | `dueflow-kappa.vercel.app` |
| **Authorized Redirect URI (Gmail OAuth)** | `https://dueflow-backend.onrender.com/api/integrations/email/google/callback` |

---

## Deployment Guidance

### 1. Frontend (Vercel)
1. Deploy the `frontend/` directory to Vercel (Root Directory: `frontend`).
2. Build Command: `npm run build`.
3. Output Directory: `dist`.
4. Configure environment variables in Vercel:
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase publishable key.
   - `VITE_API_URL`: The URL of your deployed Java backend (e.g., `https://dueflow-api.onrender.com`).

### 2. Backend (Render / Railway / Fly.io / AWS ECS)
1. Set the root directory to `backend/`.
2. Build command: `mvn clean package -DskipTests`.
3. Start command: `java -jar target/dueflow-backend-1.0.0.jar`.
4. Set required environment variables:
   - `DATABASE_URL`: Your Supabase PostgreSQL database URL (`postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require`).
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_ANON_KEY`.
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`.
   - `GEMINI_API_KEY`, `GEMINI_MODEL`.
   - `CRON_SECRET`.
   - `APP_BASE_URL`: URL of your frontend on Vercel.
   - `NODE_ENV`: `production`.

### 3. Database & Migrations (Supabase)
Run the SQL migrations in order in the Supabase SQL Editor:
1. `supabase/migrations/20260927000000_dueflow_schema.sql`
2. `supabase/migrations/20261007000000_integrations_and_channel_settings.sql`

### 4. Scheduled Reminders (Cron)
- The Java backend contains an automated `@Scheduled` runner executing every 5 minutes.
- Alternatively, trigger via external cron (e.g., cron-job.org, GitHub Actions, or Vercel Cron):
  `POST https://your-backend.com/api/cron/process-reminders` with header:
  `Authorization: Bearer <CRON_SECRET>`

### 5. Resend Webhooks
Configure your Resend Webhook endpoint in the Resend Dashboard:
- Webhook URL: `https://your-backend.com/api/webhooks/resend`
- Events: `email.delivered`, `email.bounced`, `email.complained`
- Copy the Signing Secret to `RESEND_WEBHOOK_SECRET`.
