# DueFlow Production Backend (Java 21 + Spring Boot 3)

DueFlow's authoritative backend service is built using **Java 21 LTS**, **Spring Boot 3.3.5**, **PostgreSQL (Supabase)**, **Flyway**, and the official **Google Gmail API**.

---

## 1. System Requirements

- **Java JDK**: 21 LTS (Oracle, Eclipse Temurin, or Microsoft OpenJDK)
- **Build Tool**: Apache Maven 3.9+ (portable wrapper `mvnw` / `mvnw.cmd` included)
- **Database**: PostgreSQL 15+ (Hosted on Supabase)

---

## 2. Local Development Setup

### A. Environment Configuration
Copy `.env.example` to `.env` in the root directory (or configure environment variables in your IDE):

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<your-db-password>

# Supabase Auth & Storage
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=dueflow-qr-codes

# Google OAuth & Gmail API
GOOGLE_OAUTH_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=<client-secret>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8080/api/integrations/gmail/oauth/callback
GMAIL_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### B. Compile and Run
Run from the `backend/` directory:

```bash
# On Windows
mvnw.cmd spring-boot:run

# On Linux / macOS
./mvnw spring-boot:run
```

The server starts on port `8080`. Health check endpoint:
```
http://localhost:8080/api/health
```

### C. Run Tests
```bash
mvnw.cmd test
```

---

## 3. Architecture & Security Highlights

1. **Strict Tenant Isolation**:
   - Every invoice, client, reminder, payment setting, and history record is strictly tied to `userId` extracted from the cryptographically verified Supabase JWT (`sub` claim).
2. **Durable Reminder Scheduler**:
   - `ReminderSchedulerService` periodically scans pending reminders and claims them using optimistic/pessimistic DB locking.
   - On invoice settlement or cancellation, future reminders are instantly marked `CANCELLED`.
3. **Exclusive Gmail Provider**:
   - Dispatches invoice emails with attached PDFs exclusively through the user's connected Gmail via Google OAuth 2.0 (`https://www.googleapis.com/auth/gmail.send`).
   - Refresh tokens are encrypted at rest using AES-256-GCM.
4. **Authoritative OpenPDF Generation**:
   - Generates pixel-perfect, printer-ready PDF invoices on the backend with client details, itemized breakdown, tax/discount calculations, seller bank details, and embedded settlement QR code.
5. **Decimal-Safe Financial Arithmetic**:
   - All calculations use `BigDecimal` with 2-decimal half-up rounding. Currencies (INR and USD) are calculated and aggregated in separate buckets without cross-conversion errors.

---

## 4. Production Deployment Guide

### Deploy Backend to Render (Docker)
1. In Render, select **New Web Service**.
2. Connect your repository.
3. Select **Docker** environment.
4. Set **Docker Context** to `backend` and **Dockerfile Path** to `backend/Dockerfile`.
5. Add the environment variables from `.env.example`.
6. Health Check Path: `/api/health`.

### Deploy Frontend to Vercel
1. In Vercel, connect the repository.
2. Build Command: `npm run build`.
3. Output Directory: `dist`.
4. Set Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
