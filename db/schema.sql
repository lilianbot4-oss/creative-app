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
