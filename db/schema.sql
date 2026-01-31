-- Enable uuid generation
create extension if not exists "pgcrypto";

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  name text not null,
  industry text,
  notes text,
  brand_voice jsonb,
  created_at timestamptz default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  client_id uuid references public.clients (id) on delete cascade not null,
  name text not null,
  status text not null check (status in ('ideation', 'pitch', 'revision', 'approved', 'delivered')),
  created_at timestamptz default now()
);

-- Briefs
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  raw_text text not null,
  parsed_summary jsonb,
  created_at timestamptz default now()
);

-- Ideas
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  title text not null,
  seed_text text not null,
  created_at timestamptz default now()
);

-- Outputs
create table if not exists public.outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  idea_id uuid references public.ideas (id) on delete set null,
  mode text not null check (mode in ('expand', 'alternatives', 'virality', 'pitch_outline', 'ugc_scripts', 'storyboard', 'one_pager')),
  version int not null,
  content_md text not null,
  created_at timestamptz default now()
);

-- Feedback
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  output_id uuid references public.outputs (id) on delete set null,
  text text not null,
  created_at timestamptz default now()
);

-- References
create table if not exists public."references" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  type text not null check (type in ('url', 'image')),
  url text,
  storage_path text,
  notes text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists briefs_user_id_idx on public.briefs (user_id);
create index if not exists ideas_user_id_idx on public.ideas (user_id);
create index if not exists outputs_user_id_idx on public.outputs (user_id);
create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists references_user_id_idx on public."references" (user_id);

-- RLS
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.briefs enable row level security;
alter table public.ideas enable row level security;
alter table public.outputs enable row level security;
alter table public.feedback enable row level security;
alter table public."references" enable row level security;

create policy "Clients are viewable by owner" on public.clients
  for select using (auth.uid() = user_id);
create policy "Clients are insertable by owner" on public.clients
  for insert with check (auth.uid() = user_id);
create policy "Clients are updatable by owner" on public.clients
  for update using (auth.uid() = user_id);
create policy "Clients are deletable by owner" on public.clients
  for delete using (auth.uid() = user_id);

create policy "Projects are viewable by owner" on public.projects
  for select using (auth.uid() = user_id);
create policy "Projects are insertable by owner" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "Projects are updatable by owner" on public.projects
  for update using (auth.uid() = user_id);
create policy "Projects are deletable by owner" on public.projects
  for delete using (auth.uid() = user_id);

create policy "Briefs are viewable by owner" on public.briefs
  for select using (auth.uid() = user_id);
create policy "Briefs are insertable by owner" on public.briefs
  for insert with check (auth.uid() = user_id);
create policy "Briefs are updatable by owner" on public.briefs
  for update using (auth.uid() = user_id);
create policy "Briefs are deletable by owner" on public.briefs
  for delete using (auth.uid() = user_id);

create policy "Ideas are viewable by owner" on public.ideas
  for select using (auth.uid() = user_id);
create policy "Ideas are insertable by owner" on public.ideas
  for insert with check (auth.uid() = user_id);
create policy "Ideas are updatable by owner" on public.ideas
  for update using (auth.uid() = user_id);
create policy "Ideas are deletable by owner" on public.ideas
  for delete using (auth.uid() = user_id);

create policy "Outputs are viewable by owner" on public.outputs
  for select using (auth.uid() = user_id);
create policy "Outputs are insertable by owner" on public.outputs
  for insert with check (auth.uid() = user_id);
create policy "Outputs are updatable by owner" on public.outputs
  for update using (auth.uid() = user_id);
create policy "Outputs are deletable by owner" on public.outputs
  for delete using (auth.uid() = user_id);

create policy "Feedback is viewable by owner" on public.feedback
  for select using (auth.uid() = user_id);
create policy "Feedback is insertable by owner" on public.feedback
  for insert with check (auth.uid() = user_id);
create policy "Feedback is updatable by owner" on public.feedback
  for update using (auth.uid() = user_id);
create policy "Feedback is deletable by owner" on public.feedback
  for delete using (auth.uid() = user_id);

create policy "References are viewable by owner" on public."references"
  for select using (auth.uid() = user_id);
create policy "References are insertable by owner" on public."references"
  for insert with check (auth.uid() = user_id);
create policy "References are updatable by owner" on public."references"
  for update using (auth.uid() = user_id);
create policy "References are deletable by owner" on public."references"
  for delete using (auth.uid() = user_id);

-- Storage policies for references bucket
drop policy if exists "Public read references" on storage.objects;
create policy "Public read references" on storage.objects
  for select using (bucket_id = 'references');

drop policy if exists "Users can upload references" on storage.objects;
create policy "Users can upload references" on storage.objects
  for insert with check (
    bucket_id = 'references' and
    auth.role() = 'authenticated' and
    name like auth.uid() || '/%'
  );

drop policy if exists "Users can delete own references" on storage.objects;
create policy "Users can delete own references" on storage.objects
  for delete using (
    bucket_id = 'references' and
    owner = auth.uid() and
    name like auth.uid() || '/%'
  );

-- Storage policies for assets bucket
drop policy if exists "Public read assets" on storage.objects;
create policy "Public read assets" on storage.objects
  for select using (bucket_id = 'assets');

drop policy if exists "Users can upload assets" on storage.objects;
create policy "Users can upload assets" on storage.objects
  for insert with check (
    bucket_id = 'assets' and
    auth.role() = 'authenticated' and
    name like auth.uid() || '/%'
  );

drop policy if exists "Users can delete own assets" on storage.objects;
create policy "Users can delete own assets" on storage.objects
  for delete using (
    bucket_id = 'assets' and
    owner = auth.uid() and
    name like auth.uid() || '/%'
  );

-- PHASE 1+ UPDATES
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).
alter table public.outputs add column if not exists is_primary boolean default false;

alter table public.outputs drop constraint if exists outputs_mode_check;
alter table public.outputs add constraint outputs_mode_check
  check (mode in ('expand', 'alternatives', 'virality', 'pitch_outline', 'ugc_scripts', 'storyboard', 'one_pager', 'press_release', 'faq'));

create unique index if not exists outputs_primary_unique on public.outputs (project_id)
  where is_primary = true;

create table if not exists public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  usage_date date not null,
  tokens_estimate int default 0,
  requests_count int default 0,
  created_at timestamptz default now()
);

create index if not exists usage_user_date_idx on public.usage (user_id, usage_date);
create unique index if not exists usage_user_date_unique on public.usage (user_id, usage_date);

create index if not exists clients_user_name_idx on public.clients (user_id, name);
create index if not exists projects_user_client_status_idx on public.projects (user_id, client_id, status);

alter table public.usage enable row level security;

create policy "Usage is viewable by owner" on public.usage
  for select using (auth.uid() = user_id);
create policy "Usage is insertable by owner" on public.usage
  for insert with check (auth.uid() = user_id);
create policy "Usage is updatable by owner" on public.usage
  for update using (auth.uid() = user_id);
create policy "Usage is deletable by owner" on public.usage
  for delete using (auth.uid() = user_id);

-- PHASE 2+ CREATIVE MAP / CONCEPTS / SCRIPTS / STORYBOARDS
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).

create table if not exists public.creative_specs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  raw_brief_text text not null,
  parsed_json jsonb,
  must_do jsonb,
  must_avoid jsonb,
  tone_tags jsonb,
  deliverables jsonb,
  key_message text,
  audience text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists creative_specs_project_unique on public.creative_specs (project_id);
create index if not exists creative_specs_project_idx on public.creative_specs (project_id);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  title text not null,
  one_liner text,
  thesis text,
  share_triggers jsonb,
  product_integration text,
  -- Deprecated: keep doordash_integration for backwards compatibility.
  doordash_integration text,
  cast_archetypes jsonb,
  beats jsonb,
  risks jsonb,
  scalability jsonb,
  created_at timestamptz default now()
);

alter table public.concepts add column if not exists doordash_integration text;
alter table public.concepts add column if not exists product_integration text;

create index if not exists concepts_project_idx on public.concepts (project_id);

create table if not exists public.concept_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  concept_id uuid references public.concepts (id) on delete cascade not null,
  angle text not null,
  summary text,
  tradeoffs jsonb,
  created_at timestamptz default now()
);

create index if not exists concept_variants_concept_idx on public.concept_variants (concept_id);

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  concept_id uuid references public.concepts (id) on delete set null,
  variant_id uuid references public.concept_variants (id) on delete set null,
  format text not null,
  script_md text not null,
  meta jsonb,
  version int default 1,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create index if not exists scripts_project_format_created_idx
  on public.scripts (project_id, format, created_at);
create unique index if not exists scripts_primary_unique on public.scripts (project_id, format)
  where is_primary = true;

create table if not exists public.storyboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  script_id uuid references public.scripts (id) on delete cascade not null,
  frames jsonb not null,
  shotlist jsonb,
  created_at timestamptz default now()
);

create index if not exists storyboards_script_idx on public.storyboards (script_id);

alter table public.creative_specs enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_variants enable row level security;
alter table public.scripts enable row level security;
alter table public.storyboards enable row level security;

create policy "Creative specs are viewable by owner" on public.creative_specs
  for select using (auth.uid() = user_id);
create policy "Creative specs are insertable by owner" on public.creative_specs
  for insert with check (auth.uid() = user_id);
create policy "Creative specs are updatable by owner" on public.creative_specs
  for update using (auth.uid() = user_id);
create policy "Creative specs are deletable by owner" on public.creative_specs
  for delete using (auth.uid() = user_id);

create policy "Concepts are viewable by owner" on public.concepts
  for select using (auth.uid() = user_id);
create policy "Concepts are insertable by owner" on public.concepts
  for insert with check (auth.uid() = user_id);
create policy "Concepts are updatable by owner" on public.concepts
  for update using (auth.uid() = user_id);
create policy "Concepts are deletable by owner" on public.concepts
  for delete using (auth.uid() = user_id);

create policy "Concept variants are viewable by owner" on public.concept_variants
  for select using (auth.uid() = user_id);
create policy "Concept variants are insertable by owner" on public.concept_variants
  for insert with check (auth.uid() = user_id);
create policy "Concept variants are updatable by owner" on public.concept_variants
  for update using (auth.uid() = user_id);
create policy "Concept variants are deletable by owner" on public.concept_variants
  for delete using (auth.uid() = user_id);

create policy "Scripts are viewable by owner" on public.scripts
  for select using (auth.uid() = user_id);
create policy "Scripts are insertable by owner" on public.scripts
  for insert with check (auth.uid() = user_id);
create policy "Scripts are updatable by owner" on public.scripts
  for update using (auth.uid() = user_id);
create policy "Scripts are deletable by owner" on public.scripts
  for delete using (auth.uid() = user_id);

create policy "Storyboards are viewable by owner" on public.storyboards
  for select using (auth.uid() = user_id);
create policy "Storyboards are insertable by owner" on public.storyboards
  for insert with check (auth.uid() = user_id);
create policy "Storyboards are updatable by owner" on public.storyboards
  for update using (auth.uid() = user_id);
create policy "Storyboards are deletable by owner" on public.storyboards
  for delete using (auth.uid() = user_id);

create or replace function public.set_creative_specs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists creative_specs_set_updated_at on public.creative_specs;
create trigger creative_specs_set_updated_at
  before update on public.creative_specs
  for each row execute function public.set_creative_specs_updated_at();

-- PHASE 3+ AI SETTINGS (MODEL PICKER)
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null unique,
  text_model text not null default 'gpt-4.1-mini',
  image_model text,
  image_provider text not null default 'openai',
  reasoning_mode text not null default 'balanced',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  text_model text,
  image_model text,
  image_provider text,
  reasoning_mode text,
  created_at timestamptz default now()
);

alter table public.ai_settings
  add column if not exists image_provider text not null default 'openai';
alter table public.project_ai_settings
  add column if not exists image_provider text;

create unique index if not exists project_ai_settings_project_unique on public.project_ai_settings (project_id);

alter table public.ai_settings enable row level security;
alter table public.project_ai_settings enable row level security;

drop policy if exists "AI settings are viewable by owner" on public.ai_settings;
drop policy if exists "AI settings are insertable by owner" on public.ai_settings;
drop policy if exists "AI settings are updatable by owner" on public.ai_settings;
drop policy if exists "AI settings are deletable by owner" on public.ai_settings;

create policy "AI settings are viewable by owner" on public.ai_settings
  for select using (auth.uid() = user_id);
create policy "AI settings are insertable by owner" on public.ai_settings
  for insert with check (auth.uid() = user_id);
create policy "AI settings are updatable by owner" on public.ai_settings
  for update using (auth.uid() = user_id);
create policy "AI settings are deletable by owner" on public.ai_settings
  for delete using (auth.uid() = user_id);

drop policy if exists "Project AI settings are viewable by owner" on public.project_ai_settings;
drop policy if exists "Project AI settings are insertable by owner" on public.project_ai_settings;
drop policy if exists "Project AI settings are updatable by owner" on public.project_ai_settings;
drop policy if exists "Project AI settings are deletable by owner" on public.project_ai_settings;

create policy "Project AI settings are viewable by owner" on public.project_ai_settings
  for select using (auth.uid() = user_id);
create policy "Project AI settings are insertable by owner" on public.project_ai_settings
  for insert with check (auth.uid() = user_id);
create policy "Project AI settings are updatable by owner" on public.project_ai_settings
  for update using (auth.uid() = user_id);
create policy "Project AI settings are deletable by owner" on public.project_ai_settings
  for delete using (auth.uid() = user_id);

create or replace function public.set_ai_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ai_settings_set_updated_at on public.ai_settings;
create trigger ai_settings_set_updated_at
  before update on public.ai_settings
  for each row execute function public.set_ai_settings_updated_at();

-- PHASE 4+ BRIEF UPLOADS + PROVENANCE
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).

create table if not exists public.project_brief_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  filename text not null,
  file_type text not null,
  file_size int null,
  extracted_text text not null,
  extracted_meta jsonb null,
  created_at timestamptz default now()
);

create index if not exists project_brief_uploads_project_created_idx
  on public.project_brief_uploads (project_id, created_at desc);

alter table public.project_brief_uploads enable row level security;

drop policy if exists "Brief uploads are viewable by owner" on public.project_brief_uploads;
drop policy if exists "Brief uploads are insertable by owner" on public.project_brief_uploads;
drop policy if exists "Brief uploads are updatable by owner" on public.project_brief_uploads;
drop policy if exists "Brief uploads are deletable by owner" on public.project_brief_uploads;

create policy "Brief uploads are viewable by owner" on public.project_brief_uploads
  for select using (auth.uid() = user_id);
create policy "Brief uploads are insertable by owner" on public.project_brief_uploads
  for insert with check (auth.uid() = user_id);
create policy "Brief uploads are updatable by owner" on public.project_brief_uploads
  for update using (auth.uid() = user_id);
create policy "Brief uploads are deletable by owner" on public.project_brief_uploads
  for delete using (auth.uid() = user_id);

alter table public.creative_specs
  add column if not exists active_brief_upload_id uuid null;

alter table public.concepts
  add column if not exists origin_type text not null default 'human',
  add column if not exists ai_generation_id uuid null,
  add column if not exists seed_text text null,
  add column if not exists last_edited_by_user_id uuid null,
  add column if not exists updated_at timestamptz default now();

alter table public.scripts
  add column if not exists origin_type text not null default 'human',
  add column if not exists ai_generation_id uuid null,
  add column if not exists seed_text text null,
  add column if not exists updated_at timestamptz default now();

create index if not exists concepts_origin_type_idx on public.concepts (origin_type);
create index if not exists scripts_origin_type_idx on public.scripts (origin_type);

-- PHASE 5+ CONCEPT ASSETS (KEY VISUALS)
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).

create table if not exists public.concept_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  concept_id uuid references public.concepts (id) on delete set null,
  variant_id uuid references public.concept_variants (id) on delete set null,
  script_id uuid references public.scripts (id) on delete set null,
  asset_type text not null default 'key_visual',
  prompt_text text null,
  storage_bucket text not null default 'assets',
  storage_path text not null,
  mime_type text null,
  width int null,
  height int null,
  file_size int null,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create index if not exists concept_assets_project_idx
  on public.concept_assets (project_id, created_at desc);
create index if not exists concept_assets_concept_idx
  on public.concept_assets (concept_id, created_at desc);
create index if not exists concept_assets_variant_idx
  on public.concept_assets (variant_id, created_at desc);
create index if not exists concept_assets_script_idx
  on public.concept_assets (script_id, created_at desc);

create unique index if not exists concept_assets_primary_key_visual_unique
  on public.concept_assets (concept_id)
  where is_primary = true and asset_type = 'key_visual' and concept_id is not null;

alter table public.concept_assets enable row level security;

drop policy if exists "Concept assets are viewable by owner" on public.concept_assets;
drop policy if exists "Concept assets are insertable by owner" on public.concept_assets;
drop policy if exists "Concept assets are updatable by owner" on public.concept_assets;
drop policy if exists "Concept assets are deletable by owner" on public.concept_assets;

create policy "Concept assets are viewable by owner" on public.concept_assets
  for select using (auth.uid() = user_id);
create policy "Concept assets are insertable by owner" on public.concept_assets
  for insert with check (auth.uid() = user_id);
create policy "Concept assets are updatable by owner" on public.concept_assets
  for update using (auth.uid() = user_id);
create policy "Concept assets are deletable by owner" on public.concept_assets
  for delete using (auth.uid() = user_id);

-- PHASE 6+ CONCEPT INTEGRATION RENAME
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).

-- Deprecated: keep doordash_integration for backwards compatibility.
alter table public.concepts
  add column if not exists product_integration text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'concepts'
      and column_name = 'doordash_integration'
  ) then
    update public.concepts
    set product_integration = coalesce(product_integration, doordash_integration)
    where doordash_integration is not null;
  end if;
end $$;

-- PHASE 7+ IMPORT IDEAS + LINEAGE TRACKING
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- Adds parent_concept_id for tracking lineage between imported ideas and AI iterations.

alter table public.concepts
  add column if not exists parent_concept_id uuid references public.concepts (id) on delete set null;

create index if not exists concepts_parent_concept_idx on public.concepts (parent_concept_id);

-- PHASE 8+ PUBLIC SHARE LINKS
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  project_id uuid references public.projects (id) on delete cascade not null,
  token text not null unique,
  label text,
  view_type text not null default 'pitch' check (view_type in ('pitch', 'export')),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists share_links_project_idx on public.share_links (project_id);

alter table public.share_links enable row level security;

drop policy if exists "Share links are viewable by owner" on public.share_links;
drop policy if exists "Share links are insertable by owner" on public.share_links;
drop policy if exists "Share links are updatable by owner" on public.share_links;
drop policy if exists "Share links are deletable by owner" on public.share_links;

create policy "Share links are viewable by owner" on public.share_links
  for select using (auth.uid() = user_id);
create policy "Share links are insertable by owner" on public.share_links
  for insert with check (auth.uid() = user_id);
create policy "Share links are updatable by owner" on public.share_links
  for update using (auth.uid() = user_id);
create policy "Share links are deletable by owner" on public.share_links
  for delete using (auth.uid() = user_id);

-- PHASE 8+ ACTIVITY LOG
-- Run the statements below in the Supabase SQL Editor to apply the latest schema updates.
-- All statements are intended to be safe to run on an existing database (idempotent).

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  project_id uuid references public.projects (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists activity_log_project_created_idx
  on public.activity_log (project_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "Activity log is viewable by owner" on public.activity_log;
drop policy if exists "Activity log is insertable by owner" on public.activity_log;

create policy "Activity log is viewable by owner" on public.activity_log
  for select using (auth.uid() = user_id);
create policy "Activity log is insertable by owner" on public.activity_log
  for insert with check (auth.uid() = user_id);
