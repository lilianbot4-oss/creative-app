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
create policy "Public read references" on storage.objects
  for select using (bucket_id = 'references');

create policy "Users can upload references" on storage.objects
  for insert with check (bucket_id = 'references' and auth.role() = 'authenticated');

create policy "Users can delete own references" on storage.objects
  for delete using (bucket_id = 'references' and owner = auth.uid());

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
  doorDash_integration text,
  cast_archetypes jsonb,
  beats jsonb,
  risks jsonb,
  scalability jsonb,
  created_at timestamptz default now()
);

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
