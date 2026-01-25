# Creative Campaign Copilot

An MVP workspace for freelance creative advertisers to organize clients, projects, briefs, and generate pitch-ready campaign outputs with AI.

## Tech stack
- Next.js 14 App Router + TypeScript
- Supabase (Auth, Postgres, Storage)
- Tailwind CSS + shadcn/ui
- OpenAI API

## Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Supabase project
1. Create a new Supabase project.
2. In **Authentication → Providers**, enable **Email** auth.
3. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000`
   - Additional Redirect URLs: `http://localhost:3000/**`

### 3) Database schema + RLS
Run the SQL in `db/schema.sql` in the Supabase SQL editor.

### 4) Storage bucket
Create a bucket named `references`.
- Set it to **public** (so uploaded reference images can be previewed in the app).

### 5) Environment variables
Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)

### 6) Run locally
```bash
npm run dev
```
Open `http://localhost:3000`.

## Demo data
If you log in and see an empty dashboard, use **Create demo data** to seed a sample client/project.

## App flow
1. Sign up / log in.
2. Create a client.
3. Create a project.
4. Paste a brief and save it.
5. Parse the brief (AI) for a snapshot.
6. Use the Idea Composer to generate outputs.
7. Review outputs, add feedback, and regenerate.
8. Upload references and export a PDF report.

## Troubleshooting
- **Auth redirect loop**: confirm Site URL + redirect URLs in Supabase Auth settings.
- **RLS errors**: ensure you ran `db/schema.sql` and that the user is logged in.
- **Images not loading**: ensure the `references` bucket is public and the supabase URL is correct.
- **OpenAI errors**: verify `OPENAI_API_KEY` in `.env.local` and restart the dev server.

## Deploy
Deploy to Vercel or any Node host. Ensure environment variables are set on the host.
