# MBU Digital Library

A React + Vite student portal frontend and separate Express/PostgreSQL API for Mohan Babu University. Administrator-provisioned student sign-in, logout, personal profile, subjects, coding practice, tool learning progress, and cloud study records are backed by the API; other academic modules remain frontend previews.

## Run the frontend

From the repository root:

```powershell
npm.cmd --prefix client install
npm.cmd --prefix client run dev
```

Open `http://localhost:5173`. The root URL opens the existing Dashboard in public preview mode. Its student identity card uses a clearly labeled demo profile when there is no authenticated student session; it is not a real account.

To verify a production build:

```powershell
npm.cmd --prefix client run build
```

## Deploy the frontend to Render Static Sites

The frontend is the React/Vite app in `client` (not the Express API package). Configure the Render Static Site with:

| Setting | Value |
| --- | --- |
| Root Directory | `client` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

Set `VITE_API_URL` in the Render site environment to the deployed API base URL, including `/api` (for example, `https://your-api-service.onrender.com/api`). This value is public frontend configuration; do not put database credentials, JWT secrets, or other private values in `VITE_` variables. If it is omitted, the frontend's development fallback points to `http://localhost:5000/api`, which is not suitable for a deployed site.

Add a rewrite rule in the Render Static Site dashboard so client-side routes such as `/digital-library` work on direct navigation and refresh:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

Render manages static-site rewrites in the dashboard; no `_redirects` file is used. Vite requires Node.js `^20.19.0` or `>=22.12.0`; select a compatible Node version in the Render build environment.

When deploying the API separately, set its server-side `CLIENT_URL` to the exact Render frontend origin. The server uses that setting to allow credentialed browser requests; do not loosen or bypass backend authorization to resolve CORS or login problems.

## Authentication and student profile

Run the backend and frontend in separate terminals after completing the database setup below:

```powershell
npm.cmd --prefix server run dev
npm.cmd --prefix client run dev
```

Apply the checked-in database migrations and generate the Prisma client before starting the API:

```powershell
npm.cmd --prefix server run db:migrate:deploy
npm.cmd --prefix server run db:generate
```

There are exactly two account roles: `ADMIN` and `STUDENT`. The sign-in pages remain available by their direct `/student/login` and `/admin/login` URLs for account workflows, but are not linked from the dashboard. `/login` and `/register` return to the Dashboard. Student accounts are provisioned by an administrator; public registration is disabled. The browser receives a one-hour JWT in an HttpOnly, SameSite=Strict cookie; the token is not stored in local storage or exposed to frontend code. Configure `CLIENT_URL` with the exact frontend origin and set a private `JWT_SECRET` of at least 32 characters in `server\.env`. Production cookies are Secure automatically. If the frontend/API are hosted on different sites, configure HTTPS and review the cookie/CORS deployment settings before launch.

The public dashboard presents the existing layout and navigation, but personal routes render an access-restricted page unless the correct authenticated role is present. Admin APIs, student profiles, borrowing history, notes, progress, resumes, certificates, projects, and other private records remain protected by backend authentication and ownership checks. Publicly deploy only material intended for general access (such as approved static learning content, the public book catalog, and explicitly shared public portfolios); do not make private account records, account management, circulation actions, or uploads public.

Student profile fields are read from the authenticated account at `/api/auth/me` and `/api/profile`. Students may update their own profile and upload a JPEG, PNG, or WebP photo (maximum 5 MB); photo reads are authenticated and scoped to the current user. Student ID and email uniqueness are enforced by PostgreSQL.

### First administrator and student account management

In local development, the first administrator can be initialized once through the protected setup page. First ensure `server\.env` points at the local `digital_library` database and has `NODE_ENV=development`. Generate a one-time secret in PowerShell and add it to `server\.env` as `ADMIN_SETUP_KEY` (at least 32 characters). Keep it server-side only; do not use a `VITE_` variable or commit the secret:

```powershell
$setupBytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($setupBytes)
$setupKey = [Convert]::ToBase64String($setupBytes)
Add-Content -Path .\server\.env -Value "ADMIN_SETUP_KEY=$setupKey"
$setupKey | Set-Clipboard
```

Restart the backend after updating the environment, then open `http://localhost:5173/admin/setup`. Enter the admin's name, email/Admin ID, a unique password of at least 12 characters, and paste the one-time setup key. The API checks that no administrator already exists, hashes the password with bcrypt, and only assigns `ADMIN` through this trusted setup process. Setup becomes unavailable immediately after the first admin has been created. The setup page is enabled only in development/test and will not create a second administrator. Clear the clipboard after use with `Set-Clipboard -Value ''`.

For database setup, apply the checked-in migrations and regenerate Prisma client as described above. The optional CLI bootstrap remains available for trusted operations: it requires `NODE_ENV=development` or `test`, `ADMIN_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN`, and verifies it is targeting a local `digital_library` development database or a local `_test` database. It also refuses if an administrator already exists.

If an administrator already exists but its password needs to be changed, use the existing-admin-only reset command below. It never creates a user, requires explicit confirmation, refuses non-local/production databases, bcrypt-hashes the new password, and revokes that administrator's existing sessions. Enter the password through the non-echoing PowerShell prompt; the application does not print or store it in source files:

```powershell
Set-Location "D:\Digital Library System"
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:NODE_ENV = "development"
$env:ADMIN_PASSWORD_RESET_CONFIRM = "RESET_EXISTING_ADMIN_PASSWORD"
$env:ADMIN_PASSWORD_RESET_EMAIL = Read-Host "Existing administrator email"
$securePassword = Read-Host "New administrator password (12+ characters)" -AsSecureString
try {
  $env:ADMIN_PASSWORD_RESET_VALUE = [System.Net.NetworkCredential]::new("", $securePassword).Password
  npm.cmd --prefix server run admin:reset-password
  if ($LASTEXITCODE -ne 0) { throw "Administrator password reset failed with exit code $LASTEXITCODE." }
} finally {
  Remove-Item Env:NODE_ENV, Env:ADMIN_PASSWORD_RESET_CONFIRM, Env:ADMIN_PASSWORD_RESET_EMAIL, Env:ADMIN_PASSWORD_RESET_VALUE -ErrorAction SilentlyContinue
  $securePassword.Dispose()
}
```

Successful output identifies only the existing admin and status. Sign in using that email and the newly entered password from the **Administrator Login** option at `/admin/login`. The reset does not modify student accounts or library records.

Start the backend and frontend in separate PowerShell terminals with `npm.cmd --prefix server run dev` and `npm.cmd --prefix client run dev`. Sign in as an administrator at `http://localhost:5173/admin/login`; admins land on `/admin/dashboard`. **Users Management** at `/admin/users/create` allows admins to create student accounts, edit academic details, search/filter students, activate/deactivate accounts, reset passwords, and optionally upload a student photo. New users always receive the STUDENT role. Share the displayed initial/reset credentials directly with the student over a secure channel. Students sign in at `http://localhost:5173/student/login` using their Student ID or registered email and the password provided by the administrator. Inactive accounts and sessions are rejected. Public registration is not available.

All `/api/admin/users` endpoints require both authentication and the ADMIN role; unauthenticated requests receive 401 and non-admin requests receive 403. Client-supplied roles are rejected by the create schema; the service assigns STUDENT itself. Account responses exclude password hashes and passwords. Deactivation and password reset revoke existing student sessions.

If an admin URL redirects to login, confirm that the API is running at `http://localhost:5000/api/health`, then initialize an administrator using the bootstrap steps above. Bootstrap reads `DATABASE_URL` from `server\.env`; it must be the same database used by the running API. On page refresh, the frontend calls `/api/auth/me` with the HttpOnly session cookie to restore the user. A database with no ADMIN account cannot authenticate an administrator; do not use the isolated `_test` database for local sign-in.

### My Subjects and private academic resources

Open **My Subjects** in the sidebar or use `/my-subjects`. Subject records, optional semester labels, syllabus links/files, notes, assignments, and references are stored in PostgreSQL. Subjects can be added, edited, searched, filtered by semester, and deleted from the signed-in student's own list. Each subject detail page lists its private resources and supports resource edits/deletion, PDF upload/download, HTTP(S) reference links, and marking resources reviewed. The review percentage is calculated from that student's saved resource rows; it is not a claim of course completion. Adding a subject does not create an official MBU syllabus. The six optional demo subject names are clearly marked placeholders, are added only by a user action, and leave semester unset.

Private resource operations use `/api/subjects` and `/api/subjects/:subjectId/resources`; the API derives the owner from the authenticated session and verifies ownership on every subject/resource operation. PDF uploads are limited to 20 MB, checked for PDF signatures, stored outside the public web root, and only downloadable by their owner. In development, storage defaults to ignored `server/storage/academic-resources`. In production, set `ACADEMIC_RESOURCE_STORAGE_DIR` to a private, durable mounted storage directory and include it in backup/retention operations. Do not point this setting to a temporary container filesystem or a public static directory.

Yasasvi is not hardcoded into the shared dashboard. To create an explicitly labeled local demo student, set `DEMO_STUDENT_ENABLED=true`, `DEMO_STUDENT_EMAIL` to a dedicated address, and `DEMO_STUDENT_PASSWORD` (12–72 bytes) in `server\.env`, then run the seed script. The seed refuses to overwrite an account not labeled `Yasasvi (DEMO)`. Keep the demo option disabled outside local development.

### Coding Practice, Data Science Tools, and Cloud & AWS

**Coding Practice** saves each student's problem statements, language/topic, difficulty, solution notes, bookmarks, completion status, and activity history in PostgreSQL. Search and filters operate on the signed-in student's records. It is a personal tracker—not a code runner—and does not claim integration with a compiler or third-party coding platform. Execute code only in a trusted local environment or a properly sandboxed service; the application server never executes submitted code.

**Data Science Tools** provides detail pages for Python, Jupyter Notebook, NumPy, pandas, Matplotlib, SQL, Excel, Power BI, and Machine Learning. Purpose, setup guidance, exercises, and official documentation links are reference content; personal notes and completion/progress are saved per account. The portal does not install or run these tools.

**Cloud & AWS** includes official AWS learning links and account-owned course progress, lab notes, and AWS certificate records. The portal does not connect to AWS, provision resources, run cloud labs, or verify/issue certificates. Certificate records are student-maintained.

These records use `/api/learning/coding`, `/api/learning/tools`, and `/api/learning/cloud` endpoints and are scoped to the authenticated student. A database migration for these modules is in `server/prisma/migrations/20261010161800_coding_learning_cloud`; apply it with `npm.cmd --prefix server run db:migrate:deploy`.

### My Projects, Resume, Certificates, and Career Preparation

The private career area is available from the sidebar at **My Projects**, **My Resume**, **Certificates**, and **Career Preparation**. Project records support technology stacks, documentation, GitHub/live URLs, development status, and private screenshot uploads. Resume data is structured for a simple, selectable-text, ATS-oriented print layout; use **Export / Print PDF** and choose **Save as PDF** in the browser. Certificates support search/category filtering, credential links, PDF uploads, and independent visibility controls. Career Preparation stores private internship application status/history and private interview/aptitude resources. These views show database records rather than fabricated counts.

All portfolio editing endpoints use the authenticated student's owner ID; the API never accepts a browser-supplied owner ID. Projects, certificates, resume sections, internship applications, and saved resources remain private by default. To publish, enable the resume and choose which resume sections to expose, then separately opt in individual projects and certificates. Copy the generated opaque link from **My Resume** to share `/portfolio/:slug`. The read-only public API is `/api/public/portfolio/:slug` and only returns explicitly public resume sections, projects, and certificates. Internship applications and career resources are never included in the public response. Private screenshot/certificate downloads require authentication; public file access requires both a public resume and a separately public project/certificate.

Private project screenshots accept JPEG, PNG, or WebP up to 8 MB; certificate uploads accept PDF up to 20 MB. Files are signature-checked, stored with random names outside the web root, and served only by authorized API handlers. Development storage defaults to ignored `server/storage/portfolio`. In production, set `PORTFOLIO_STORAGE_DIR` in `server\.env` to a durable, private mounted directory with appropriate backups and access controls. Do not commit `.env` or point the directory to a public/static or ephemeral location.

The career schema migration is `server/prisma/migrations/20261010170000_portfolio_career`. Apply pending migrations and regenerate the client with:

```powershell
npm.cmd --prefix server run db:migrate:dev
npm.cmd --prefix server run db:generate
```

## Frontend structure

- `client/src/data/mockFaculty.js` — placeholder faculty card content; student identity comes from the signed-in API user
- `client/src/data/socialLinks.js` — LinkedIn, GitHub, and resume URLs for the dashboard Connect with me card
- `client/src/data/navigation.js` — sidebar destinations and module labels
- `client/src/data/learningTools.js` — tool learning guides, installation notes, exercises, and official documentation links
- `client/src/components/` — shared portal shell and loading view
- `client/src/pages/` — dashboard, subjects, coding practice, tool learning, cloud study tracker, Modules catalog, search, and not-found view
- `client/src/style.css` — Tailwind entry point, theme tokens, and responsive portal styling

The supplied MBU logo is stored at `client/public/images/mbu-logo.png`. The dashboard uses the authenticated student's profile photo when available and an initials/avatar fallback otherwise. No student photo or campus photograph is used as real student/campus data.

The dashboard shows Quick Access; the Data Science modules are available separately at `/modules`. Coding Practice, Data Science Tools, Cloud & AWS, and My Subjects now save student-owned data through the API. Other sidebar sections still use frontend preview pages. Existing routes such as `/my-resume` and `/digital-library` remain available from the profile menu and related links.

The Quick Access "View All" link opens `/quick-access`, which lists all seven Quick Access destinations. To enable the social cards, replace the empty `linkedin`, `github`, and `resume` values in `client/src/data/socialLinks.js` with your real URLs. Until configured, those cards are visibly disabled rather than linking to invented profiles or files.

## Run the backend

The Express API is maintained separately from the React frontend. Create `server\.env` from the example if you do not already have one. Set a unique `JWT_SECRET` of at least 32 characters and configure a local PostgreSQL `DATABASE_URL`:

```powershell
if (-not (Test-Path server\.env)) { Copy-Item server\.env.example server\.env }
```

If PostgreSQL is installed locally, create a database named `digital_library` using your PostgreSQL administrator account, for example:

```powershell
createdb -U postgres digital_library
```

Set `DATABASE_URL` in `server\.env` to `postgresql://USERNAME:PASSWORD@localhost:5432/digital_library?schema=public`, replacing the username and password with your local PostgreSQL credentials. URL-encode reserved characters in the password. Generate a development JWT secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and put the generated value in `JWT_SECRET`. Do not reuse local credentials in production or commit `server\.env`. The server validates both `DATABASE_URL` and `JWT_SECRET` on startup.

From the repository root, install backend dependencies, generate the Prisma client, apply a development migration, and load clearly labeled example records:

```powershell
npm.cmd --prefix server install
npm.cmd --prefix server run db:generate
npm.cmd --prefix server run db:migrate:dev
npm.cmd --prefix server run db:seed
npm.cmd --prefix server run dev
```

`db:migrate:dev` applies the checked-in initial migration. For later schema changes, create a named migration with `npm.cmd --prefix server run db:migrate:dev -- --name describe_change`. Commit migration files, not environment files. For an existing database deployment, use `npm.cmd --prefix server run db:migrate:deploy`; validate the schema with `npm.cmd --prefix server run db:validate`. The API listens on `http://localhost:5000` and verifies the PostgreSQL connection before accepting requests. Check `http://localhost:5000/api/health`.

The database includes users with a one-to-one student profile, owner-linked academic records, subjects, categories and books, and circulation records. Library catalog and circulation operations are available through authenticated, role-protected API routes. Demo catalog seed rows are explicitly labeled `DEMO`; review/remove them before production use.

## Phase 8 — Library management

Sign in as an administrator to manage books, categories, circulation, and reports at `/library-admin`. Students can browse the paginated catalog at `/digital-library`, open active book details, and view only their own paginated borrowing history at `/my-borrowing-history`.

Library API routes use the `/api/library` prefix. Authenticated students and administrators can read active books and categories. Administrator-only endpoints under `/api/library/admin` provide book/category management, student lookup, issue/return operations, borrowing records, and reports. Issue and return operations update inventory in PostgreSQL transactions; a partial unique index prevents duplicate active issues for the same student/book. Books with borrowing history must be deactivated rather than deleted. Do not expose administrator endpoints to student-facing UI.

## Backend structure

- `server/src/config/` — environment loading and validation
- `server/src/routes/` — API route registration
- `server/src/controllers/` — HTTP request handlers
- `server/src/services/` — authentication, profile/photo, subject/resource, coding/learning, health, and circulation operations
- `server/src/middleware/` — request validation, cookie authentication, role/origin checks, rate limiting, and centralized errors
- `server/src/validators/` — request body schemas
- `server/src/utils/` — API errors and response helpers
- `server/src/config/prisma.js` — Prisma client singleton
- `server/src/services/libraryService.js` — catalog, category, transaction-safe circulation, and report operations
- `server/src/routes/libraryRoutes.js` — authenticated catalog and administrator library routes
- `server/src/services/learningService.js` — owner-scoped coding practice, tool progress, and cloud study records
- `server/src/routes/learningRoutes.js` — authenticated learning and practice API routes
- `server/prisma/schema.prisma` — PostgreSQL relational schema
- `server/prisma/seed.js` — idempotent demonstration catalog seed
- `server/prisma/migrations/` — committed database migrations
- `server/test/` — API smoke, validation, and library circulation/security tests

Backend checks:

```powershell
npm.cmd --prefix server run build
npm.cmd --prefix server run db:validate
```

## Application test suite

Frontend behavior tests use Vitest, React Testing Library, and jsdom:

```powershell
npm.cmd --prefix client test
npm.cmd --prefix client run build
```

Backend integration tests exercise the real API and PostgreSQL transactions, including administrator bootstrap and account authorization. They refuse to run unless `TEST_DATABASE_URL` names a separate database ending in `_test`; never point it at a development or production database. Create the test database first, then set both variables for the migration and test commands:

```powershell
$env:TEST_DATABASE_URL = "postgresql://<user>:<url-encoded-password>@localhost:5432/digital_library_test?schema=public"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm.cmd --prefix server run db:migrate:deploy
npm.cmd --prefix server run db:status
npm.cmd --prefix server test
npm.cmd --prefix server run build
```

The integration suite creates and cleans up its own test records and upload files. It covers login/logout, disabled accounts, session expiration and protected APIs, profile access, subject/resource CRUD and uploads, coding and learning progress, portfolio/projects/resume/certificate privacy and uploads, library search and circulation, inventory consistency, administrator provisioning and permissions, ownership, validation, and standard API errors. Resume PDF export uses the browser's print dialog; the frontend test verifies that export action invokes it.
