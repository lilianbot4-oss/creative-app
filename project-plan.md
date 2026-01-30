# Project Plan - Creative Campaign Copilot
Last updated: 2026-01-30

## Product summary
Creative Campaign Copilot is an MVP workspace for freelance creative advertisers to organize clients, projects, briefs, and generate pitch-ready campaign outputs with AI. The app supports fully manual workflows with optional AI acceleration.

## Current status
MVP is functional with auth, core workflow screens, AI generation for text and images, and export views. Supabase is the system of record and enforces RLS. AI model selection, usage limits, and guardrails are implemented. PDF/PPTX brief parsing runs client-side and only stores extracted text.

## Core workflow (implemented)
- Auth and onboarding: email auth, protected /app routes, onboarding wizard, demo data seed.
- Clients: CRUD, brand voice profile, notes, industry, filters.
- Projects: CRUD, status tracking (ideation, pitch, revision, approved, delivered), filters, dashboard stats.
- Project setup: paste brief or upload PDF/PPTX for local text extraction, save creative spec, parse with AI.
- Ideas (concepts): manual creation, AI generation, AI assist from seed, import ideas from text or PDF, variants.
- Scripts: generate per format, rewrite with goals + feedback, manual creation, set primary.
- Storyboards: generate frames and shotlist from scripts (text only today).
- Outputs (Idea Composer): generate multiple output modes, versioning, comparison, set primary.
- Feedback: capture notes linked to outputs, generate rewrites from selected feedback.
- References: upload images, add URLs, generate AI moodboards.
- Key visuals: generate concept-specific images, manage gallery, set primary.
- Presentation + export: pitch pack view with filters, export view for PDF (browser print).

## Feature inventory (what exists in code)
### UI and UX
- Dashboard with stats, recent projects, quick actions, and help.
- Sidebar navigation with sectioned tools per project.
- Markdown output viewer with copy, plain text copy, and download.
- Print-friendly export and pitch views with optional toggles.
- Keyboard shortcuts (G+D, G+P, G+C, ?).

### AI generation capabilities
- Brief parsing and creative spec extraction.
- Output generation modes: expand, alternatives, virality, pitch outline, UGC scripts, storyboard, one pager, press release, FAQ.
- Content pack generator (one pager, expand, UGC scripts, pitch outline, virality).
- Concept generation and variant generation.
- Script generation + rewrite goals.
- Storyboard generation from scripts.
- Image generation for moodboards and key visuals (OpenAI and Google Imagen support).
- Usage limits (50 requests per user per day) with token estimate tracking.
- Guardrails from creative spec and client brand voice.
- AI model settings (text and image) with reasoning mode presets.

### Data model (Supabase)
- clients: name, industry, notes, brand_voice.
- projects: client linkage, status.
- briefs: raw_text, parsed_summary.
- creative_specs: structured brief parsing, constraints, deliverables, key message, audience.
- project_brief_uploads: extracted text + metadata from PDF/PPTX.
- concepts: idea territories, provenance, lineage, and meta fields.
- concept_variants: angles + tradeoffs.
- scripts: format, markdown content, provenance, primary flag.
- storyboards: frames + shotlist linked to scripts.
- outputs: generation mode, versioning, primary flag.
- feedback: notes linked to outputs.
- references: URLs and images (Supabase Storage).
- concept_assets: key visuals and other generated images (Supabase Storage).
- usage: per-user daily usage tracking.
- ai_settings + project_ai_settings: model selections and overrides.

### Storage
- references bucket: public, used for uploaded references and moodboard images.
- assets bucket: public, used for key visuals and concept assets.

### Integrations and infra
- Supabase Auth, Postgres, Storage, and RLS.
- Next.js App Router + server actions + API routes.
- AI providers: OpenAI (text + image), Google Gemini/Vertex (text), Google Imagen (image).

## Technical stack
- Next.js 16 App Router, React 19, TypeScript.
- Tailwind CSS v4 + shadcn/ui + Radix + Sonner.
- Supabase (Auth, Postgres, Storage, SSR client).
- AI SDK (ai), OpenAI SDK, Google GenAI SDK.
- PDF parsing: pdfjs-dist; PPTX parsing: jszip + XML parsing.

## Deployment and configuration
- Vercel-ready, with DEPLOY.md instructions.
- Required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (optional for text), GEMINI_API_KEY (required for Imagen), GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_CLOUD_PROJECT (Gemini text), OPENAI_MODEL (legacy).
- Supabase setup: run db/schema.sql, create public buckets references and assets, update Auth redirect URLs.

## QA and operations
- Manual QA checklist is defined in README.md and covers onboarding, creative map, concepts, scripts, storyboard, pitch, outputs, export, and AI-disabled flows.

## Known gaps and remaining work
### Must do (explicit or inferred from code)
- Implement storyboard frame image generation when "Include AI-generated frame visuals" is checked.
- Expose project-level AI model overrides (project_ai_settings) in the UI or remove the table if not needed.
- Reconcile documentation mismatches (README says Next.js 14, env docs vs current model settings).
- Verify OPENAI_MODEL usage or remove if no longer needed for text generation.

### Recommended next steps
- Add automated tests (unit + integration) for critical flows and API routes.
- Add CI pipeline (lint, typecheck, tests).
- Add error monitoring and runtime logging for AI failures and storage errors.
- Add role-based sharing or public share links if client review is required outside auth.
- Add project-level activity history or audit log for provenance.

## Open questions
- Do we want per-project AI model settings surfaced to users, or only global settings?
- Should the pitch/export views be available as shareable public links?
- Is there a preferred model default for text and images, or should the app always use settings only?

