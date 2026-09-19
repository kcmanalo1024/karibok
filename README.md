# KARIBOK

A React + Tailwind CSS productivity workspace for academics, work, and freelance projects.

## Run locally

Requires Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open the local address shown by Vite. Configure Supabase using the steps below before signing in. Existing Version 1 browser data is retained; the authentication gate does not delete local caches.

## Opening the app

1. A 3-second branded splash displays the logo and “Your Life Gets Chaotic. Your Tasks Don't Have To Be.” It respects reduced-motion preferences.
2. Supabase checks the persisted session. Signed-out users see the responsive Login / Sign Up screen. Returning users with a session proceed automatically after their workspace loads.
3. The existing Dashboard mounts only after authentication and workspace loading succeed. Session checks and failed workspace loads never display cached dashboard content.

Sign-up with an immediate Supabase session opens the Dashboard. If email confirmation is required, the app shows confirmation instructions and remains on the authentication screen. Signing out unmounts every workspace screen and returns to Login / Sign Up. The next sign-in begins at the Dashboard.

There is no guest bypass. Missing Supabase configuration leaves sign-in unavailable and the dashboard locked. The existing database Row Level Security policies still enforce server-side account isolation.

## Implemented

- **Tasks:** add/edit/delete, complete/reopen, priorities, project links, category filters, custom categories, progress and deadlines.
- **Calendar:** navigable month view, actual task deadlines, selected-day agenda and task editing.
- **Focus and time tracking:** countdown and stopwatch, task association, pause/resume, saved time entries, reload persistence and time-entry deletion.
- **Analytics:** this week's completions, recorded time, current completion streak, overdue count and weekly summary. Historical demo tasks without completion timestamps are not treated as real activity.
- **Recurring tasks:** daily, weekly and monthly. Completing an occurrence creates exactly one successor from its deadline. Month-end dates are clamped to the next month's final date. Reopening an occurrence does not create duplicates.
- **Notifications:** due/overdue tasks and completed focus sessions; dismissible in-app inbox. Optional desktop notifications require browser permission and the app to be open. This is not a background push or email service.
- **Freelance:** client records, projects linked to clients, project status, project progress derived from tasks, payment records, paid/unpaid toggles and a PHP income dashboard. Linked records must be reassigned or removed before their parent can be deleted.
- **Personalization:** display name, profile image, system/light/dark themes, accent presets and custom color picker.
- **Data:** browser persistence and JSON backup export. Supabase authentication, cloud persistence and conflict-aware sync are implemented; connection details are required.

## Supabase setup (Version 2)

1. Create a Supabase project and enable email/password authentication.
2. Run `supabase/schema.sql` once in the project's SQL editor.
3. Copy `.env.example` to `.env.local` and set your project URL and publishable/anon key. Never use a service-role key in frontend variables.
4. In Supabase Auth URL Configuration, add your local URL (typically `http://localhost:5173`) and eventual deployed URL as allowed redirects. Set your production Site URL when deploying.
5. Restart the development server. After the splash, use Login / Sign Up to create an account or sign in. Confirm the email when required by the project's Auth settings.
6. Test with two separate accounts and two browser sessions before production deployment: accounts must see only their own data; an edit should appear on the other device after approximately 15 seconds.

Legacy local data and each account have separate browser caches. New cloud accounts start empty; signing out returns to authentication without exposing the legacy local workspace. Unsynced changes remain cached under that account. Signing out is blocked if pending changes cannot be saved. Export a backup before changing browser data.

### Persistence design

PostgreSQL stores one JSONB workspace snapshot per authenticated user, containing profile/preferences, tasks, categories, projects, clients, legacy project payments, accounts, transactions, sessions and timer state. Profile images are embedded data URLs in the same protected snapshot (maximum upload 2 MB); a separate storage bucket is not required. This favors atomic saves of linked records for a personal workspace. It is not a normalized reporting warehouse.

The SQL migration enables Row Level Security and restricts each row to its owner. The save function uses an expected revision so concurrent device edits cannot silently overwrite each other. On a conflict, export the local draft and choose **Load cloud version**. The app also saves a recovery copy in browser storage. Saves retry during the polling interval and when the connection returns. This is polling sync, not collaborative real-time editing.

Do not edit active timers on multiple devices simultaneously. Revision conflicts will protect the snapshot, but require choosing which device's changes to keep. Timers use elapsed wall time: an active timer continues while the app is closed; completed countdowns are recorded when the app next opens.

Live Supabase validation was not performed for this update. The existing environment configuration is preserved. Local PostgreSQL tests validate the migration, constraints, revisions and two-user RLS.

Official references: [password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Checks

```sh
pnpm test
pnpm build
```

Browser tests use Playwright with installed Microsoft Edge. Set PLAYWRIGHT_MODULE to an existing Playwright module path if it is not installed in the test environment.

Start a dedicated test server on port 5174 with VITE_SUPABASE_URL=https://karibok-test.supabase.co and VITE_SUPABASE_ANON_KEY=public-test. These are deliberately fake test values, not project credentials. The browser tests intercept all Supabase traffic to that hostname using tests/mock-cloud.cjs.

```sh
node tests/cloud-browser.cjs
node tests/browser.cjs
node tests/edge-cases.cjs
node tests/v4-browser.cjs
```

The authentication suite covers splash/login gating, invalid credentials, confirmation-required and immediate-session signup, returning sessions, delayed/error workspace loading, sync conflicts, logout/reload protection, and mobile layouts. The feature suite signs in through the same gate before exercising the existing workflows. The edge-case suite covers pictures, system theme changes, accent contrast and empty workspaces.

Browser tests simulate Supabase HTTP responses. The separate database.test.js suite executes the actual migration in PGlite (PostgreSQL), including owner-only RLS, invalid relationships, ledger validation, revision conflicts and repeat migration. Neither suite validates live email delivery or the deployed project configuration.


## V4 freelance and personal finances

Clients now have contact details and project summaries. Open a project to manage its tasks, assign existing tasks, inspect deadlines and reference links, and see completed-task progress. Independent projects and standalone tasks remain supported. Linked clients/projects cannot be deleted until their dependent records are reassigned or removed.

Finances supports Bank, E-wallet, Cash, Savings and Other accounts, plus income, expense and transfer transactions. Amounts are stored as integer centavos; balances are derived from starting balances and the ledger. Editing or deleting a transaction recalculates affected accounts. Transfers affect neither combined balance nor monthly income/expenses. Overview includes monthly totals and category spending; history filters by type and either account involved in a transfer.

Existing billed/paid/unpaid records remain under Project payments. They are not automatically converted into cash income because they have no receiving account. Record actual receipts as income transactions. Account deletion is blocked when transactions reference it.

### Upgrade the existing Supabase project

Run the updated supabase/schema.sql in the project SQL editor. It reuses public.workspaces and save_workspace; it does not introduce duplicate tables or erase existing snapshots. The migration adds server validation for record IDs, linked references, account amounts and transactions, while retaining owner-only RLS and revision checks. Legacy snapshots without finance accounts are accepted, but a later save cannot silently discard populated account/transaction collections.

After applying it, manually verify your real account can save, reload and sign back in, and that a second real account sees only its own workspace. Test email confirmation using your configured email provider. The browser and local PostgreSQL checks cannot certify those live settings.

### Account colors, payment methods and Utang

Finance has Overview, Accounts, Transactions and Utang tabs; legacy Project payments remain available. Account colors use independent hexadecimal values and never change the workspace accent. Existing accounts without a color use a neutral fallback.

Expense payment methods include Cash, Bank, E-wallet, COD, Online Payment and Other. Cash/Bank/E-wallet require an account of that type. Online Payment and Other select a specific account; Other also requires a description. Unpaid COD can be recorded without an account and does not affect balances or expense totals. Edit it, tick Payment recorded, choose the actual account and payment date to recognize the expense once.

Utang records have nested repayments and an optional original movement account. Choosing an original account decreases it for lending or increases it for borrowing. Leave it unset for historical debts already included in opening balances. Actual repayments always select an account. Status and progress are derived from repayments; Mark as Paid opens a repayment confirmation form for the remaining amount. Neither the original movement nor repayments count as normal income/expense. Deleting a debt or repayment reverses its associated movements. Linked accounts cannot be deleted.

Apply the updated supabase/schema.sql before using these new cloud features. It retains the JSONB workspace and existing RPC/RLS, adds validation for colors, payment methods and nested repayments, and accepts legacy snapshots. No .env.local changes are needed. Check saving and reloading these features with your live Supabase project after applying SQL; automated browser tests mock HTTP authentication, while database tests execute the schema locally in PostgreSQL/PGlite.

Additional browser check: node tests/finance-browser.cjs. pnpm test runs all domain and PostgreSQL tests.


## Organization update

Projects have been replaced by folders. On the first authenticated load, existing project IDs become folder IDs, their metadata is retained, and linked tasks/notes/payments retain their IDs. The associated client becomes a direct `clientId`. This idempotent upgrade saves through the existing revision-checked `save_workspace` RPC. No task or note copies are created.

The sidebar now contains Workspace (Dashboard, Tasks, Notes, Calendar), Organize (Folders, Favorites, Clients), Productivity (Focus), and bottom Trash/Settings. Existing finance features remain reachable from Settings and Quick Add; project payments are now client payments.

Folders allow one child level. Archive and favorite are independent flags. Tasks and notes can have a folder and a client, or neither. Trash uses `deletedAt` and a deletion-group identifier on the original records, with no automatic expiry. Restoring a folder restores records deleted with it; previously deleted contents stay in Trash. Restoring an individual item also restores its required folder ancestors. Permanent folder deletion deletes its descendants; permanent client deletion unlinks surviving tasks, notes, and payments.

Deadline reminders begin 14 days before the due date, refresh at seven days and daily through the final week, then show Today or Overdue. Read/dismiss state persists in the workspace. Completed and trashed tasks are excluded. Desktop notifications require the application to be open and browser permission; there is no background push service.

### Database rollout

For an existing installation, apply `supabase/organization.sql` in the Supabase SQL editor. It adds only a validation trigger to the existing workspace table: folder depth, unique IDs, direct references, and an old-client write guard. It does not change authentication, ownership, RLS, or copy user data. The complete `supabase/schema.sql` includes the same migration for fresh installations.

Local verification uses `node --test tests/*.test.js`, including real PostgreSQL semantics through PGlite, revision conflicts, anonymous access denial, and two-user RLS isolation. `tests/organization-browser.cjs` exercises organization CRUD, cloud-adapter save/reload, reminders, trash/restore, permanent-deletion confirmation, and desktop/mobile layout against `tests/mock-cloud.cjs`. Run it against a dev server on port 5174 configured with the test Supabase URL in that mock. These tests do not claim verification against the live Supabase project.
