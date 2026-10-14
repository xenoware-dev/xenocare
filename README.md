# XenoCare / vSchool

Clinic & therapy management (speech, OT, physio) for one organization with multiple branches.

**Stack:** React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui · Node.js + Express 5 + TypeScript · Supabase (Postgres, Auth, Storage) · WhatsApp Cloud API

```
xenocare/
├── client/                    React app (staff only: owner / admin / therapist)
│   └── src/
│       ├── components/
│       │   ├── ui/            shadcn/ui primitives (npx shadcn@latest add <name>)
│       │   ├── layout/        AppLayout, Sidebar, Topbar, BranchSwitcher
│       │   └── common/        PageHeader, StatCard, LoadingScreen ...
│       ├── features/          one folder per module: api.ts (queries) + pages/ + components/
│       │   ├── auth  dashboard  students  parents  staff  branches
│       │   ├── appointments  attendance  sessions  assessments
│       │   └── billing  reports  settings  errors
│       ├── providers/         AuthProvider (session, profile, permissions), BranchProvider
│       ├── hooks/             useAuth, useBranch, usePermission
│       ├── routes/            router, nav config, ProtectedRoute, RequirePermission
│       ├── lib/               supabase client, api (Express fetch), queryClient, format, utils
│       ├── config/            env
│       └── types/             app types, database.types.ts (generated)
├── server/                    Express API (business logic + service-role jobs)
│   └── src/
│       ├── modules/<name>/    <name>.routes · .controller · .service · .schema (zod)
│       │   ├── users          create staff, role/status/branches (auth admin API)
│       │   ├── appointments   recurring series expansion, cancel series
│       │   ├── billing        WhatsApp payment reminder, invoice refresh
│       │   ├── whatsapp       send to parents, webhook (delivery status), queue
│       │   ├── dashboard      owner / branch summary
│       │   └── health
│       ├── jobs/              node-cron: message queue, appointment & payment reminders
│       ├── middleware/        authenticate (Supabase JWT), requireRole, validateBody, errorHandler
│       ├── lib/               supabaseAdmin + createUserClient (RLS), logger, org settings
│       ├── utils/             AppError, access checks, timezone helpers
│       ├── config/            env (zod-validated)
│       ├── app.ts  routes.ts  index.ts
│       └── types/
├── supabase/                  migrations, seed.sql, tests (see docs/database.md)
└── docs/
```

## How data flows

- **React → Supabase directly** for normal reads and writes (students, appointments, notes, invoices, payments). Row Level Security decides what each user can see.
- **React → Express** (`/api/*`, with the Supabase access token) for anything that needs the service role or touches many rows:
  - creating staff users
  - expanding recurring appointment series
  - sending WhatsApp messages
  - the dashboard summary
- **Express request handlers** use `req.db`, a client acting as the signed-in user, so RLS still applies. `supabaseAdmin` (which bypasses RLS) is used only for auth admin calls, WhatsApp logging, and cron jobs.
- **Parents never log in.** Every notification goes through WhatsApp templates (`message_templates`). Each send is logged in `whatsapp_messages`.

## Getting started

```bash
npm install
supabase init && supabase start && supabase db reset   # DB + seed
npm run db:types                                      # generate DB types into client & server

cp server/.env.example server/.env   # fill SUPABASE_* from `supabase status`
cp client/.env.example client/.env   # anon key only

npm run dev                          # server :4000 + client :5173
```

Create the first owner (once). Safe to re-run; it promotes an existing user instead:

```bash
npm run create-owner -w server -- owner@clinic.in "Owner Name"   # asks for a password
```

### Google sign-in (invite-only)

Staff sign in with Google, but only emails added on the **Staff** page (or via `create-owner`) get in.

Workflow: the **owner** creates branches and branch admins (and views everything). A **branch
admin** adds therapists, registers patients and books appointments for their own branches.
**Therapists** see their own schedule and assigned patients. Enforced by the UI, Express and RLS
(migration `20261014000014_role_workflow.sql`).

1. Google Cloud → APIs & Services → OAuth consent screen (External), then
   Credentials → Create OAuth client ID → Web application:
   - Authorized JavaScript origins: `http://localhost:5173` (+ production URL)
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Sign In / Providers → Google: paste client ID + secret, enable.
3. Supabase → Authentication → Sign In / Providers: **turn off "Allow new users to sign up"**.
   This is what makes it invite-only: unknown Google accounts are rejected.
4. Supabase → Authentication → URL Configuration: Site URL `http://localhost:5173`,
   Redirect URLs `http://localhost:5173/**` (+ production URL).

### Hosted Supabase without Postgres access

If ports 5432/6543 are blocked on your network, `supabase db push` cannot connect.
Paste `supabase/remote-setup/apply_schema.sql` (all migrations + seed + migration history)
into **Dashboard → SQL Editor** instead, then run `npm run db:types:remote`.
Regenerate that file after adding migrations.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | API + web in watch mode |
| `npm run typecheck` | TypeScript check for both apps |
| `npm run build` | Production build (`server/dist`, `client/dist`) |
| `npm run db:types` | Regenerate `database.types.ts` from the local DB |
| `npm run db:types:remote` | Same, from the linked hosted project |
| `npm run create-owner -w server -- <email> [name]` | Create or promote the owner account |
| `supabase test db` | Database tests (RLS, triggers) |

Locale: India (INR, `Asia/Kolkata`, `en-IN` formatting).
