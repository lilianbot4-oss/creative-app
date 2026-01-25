# Deployment Guide (Vercel)

## Prerequisites
- Supabase project created and schema applied.
- Storage bucket `references` created and set to public.
- Environment variables ready.

## Required environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (optional if AI features enabled)
- `OPENAI_MODEL` (optional, defaults to gpt-4o-mini)

## Vercel steps
1. Push this repo to GitHub/GitLab.
2. In Vercel, click **New Project** and import the repo.
3. Set the environment variables above in **Project Settings → Environment Variables**.
4. Deploy.

## Post-deploy
- In Supabase Auth settings, add your Vercel URL to **Site URL** and **Redirect URLs**.
- Verify you can log in and access `/app`.

## Notes
- This app uses Supabase RLS; confirm policies are applied.
- If AI is disabled, the UI will show an "AI Disabled" badge and guard calls.
