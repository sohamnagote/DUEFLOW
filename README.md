# DueFlow 🚀

> **India-first automated invoice follow-up SaaS for freelancers and boutique studios.**

DueFlow automates invoice follow-ups, sends deterministic payment reminders directly from the user's connected Gmail or Outlook account, generates and attaches real A4 invoice PDFs, embeds UPI payment coordinates and QR codes, provides AI-crafted reminder copy using Google Gemini with reliable fallbacks, and maintains audit ledgers with Supabase PostgreSQL persistence.

---

## Architecture Overview

- **Frontend (`/frontend`)**:
  - React 19 + TypeScript + Vite + Tailwind CSS.
  - Responsive minimal UI with custom reminder schedule builder, live template inspector, and payment details overview.
  - Proxies `/api` to the Spring Boot backend (`http://localhost:8080`) in development and Render in production.
- **Backend (`/backend`)**:
  - **Java 21** + **Spring Boot 3.3.5**.
  - **Spring Web** REST APIs maintaining exact endpoint contracts and response shapes.
  - **Spring Security** with Supabase JWT access token verification.
  - **Spring Data JPA** with PostgreSQL/Supabase-compatible persistence and H2 in-memory test fallback.
  - **Connected Email Delivery**: Direct RFC-2822 multipart delivery via user's authenticated Gmail or Microsoft Outlook OAuth 2.0 integration.
  - **Real PDF Generation**: OpenPDF-powered A4 invoice PDF rendering with complete itemization, INR formatting, payment coordinates, and embedded Payment QR thumbnail.
  - **Google Gemini AI Service**: Reminder copy generation with deterministic fallback and `ai_actions` logging.
  - **Custom Reminder Scheduler**: Autonomous background worker executing user-defined reminder rules (before, on, after due date) with atomic worker claims, exponential backoff, and crash recovery.
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
Run the comprehensive Java test suite (JWT verification, client/invoice CRUD, cross-user isolation, scheduler calculations, Gmail/Outlook dispatch, OpenPDF generation, and MIME attachments):
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
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID for Gmail sending | Server-only |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret for Gmail sending | Server-only |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra App ID for Outlook sending | Server-only |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Entra App Secret for Outlook sending | Server-only |
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
2. Build Command: `npm run frontend:build`.
3. Output Directory: `frontend/dist`.
4. Configure environment variables in Vercel:
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase publishable key.
   - `VITE_API_URL`: The URL of your deployed Java backend (e.g., `https://dueflow-backend.onrender.com`).

### 2. Backend (Render)
1. Root directory: `backend/`.
2. Build command: `mvn clean package -DskipTests`.
3. Start command: `java -jar target/dueflow-backend-1.0.0.jar`.
4. Set required environment variables:
   - `DATABASE_URL`: Your Supabase PostgreSQL database URL (`postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require`).
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_ANON_KEY`.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
   - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`.
   - `GEMINI_API_KEY`, `GEMINI_MODEL`.
   - `CRON_SECRET`.
   - `APP_BASE_URL`: URL of your frontend on Vercel (`https://dueflow-kappa.vercel.app`).

### 3. Database & Migrations (Supabase)
Run the SQL migrations in order in the Supabase SQL Editor:
1. `supabase/migrations/20260927000000_dueflow_schema.sql`
2. `supabase/migrations/20261007000000_integrations_and_channel_settings.sql`
3. `supabase/migrations/20261009000000_profile_and_scheduler_enhancements.sql`
4. `supabase/migrations/20261009100000_custom_reminder_schedule_and_template.sql`

### 4. Scheduled Reminders (Cron)
- The Java backend contains an automated `@Scheduled` runner executing continuously in the background.
- Recovers pending work after restarts and processes due reminders.
