
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "self select profile" on public.profiles for select using (auth.uid() = id);
create policy "self update profile" on public.profiles for update using (auth.uid() = id);
create policy "self insert profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Subjects
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  daily_target int not null default 10
);
alter table public.subjects enable row level security;
create policy "subjects readable" on public.subjects for select using (true);

insert into public.subjects (code, name, daily_target) values
  ('BIO','Biologia',20),
  ('QUI','Química',15),
  ('FIS','Física',10),
  ('REV','Revisões',5);

-- Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  statement text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text,
  created_at timestamptz not null default now()
);
alter table public.questions enable row level security;
create policy "questions readable" on public.questions for select using (true);

-- Daily missions
create table public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  bio_target int not null default 20,
  qui_target int not null default 15,
  fis_target int not null default 10,
  rev_target int not null default 5,
  completed boolean not null default false,
  completed_at timestamptz,
  score_total numeric,
  score_bio numeric,
  score_qui numeric,
  score_fis numeric,
  score_rev numeric,
  created_at timestamptz not null default now(),
  unique(user_id, mission_date)
);
alter table public.daily_missions enable row level security;
create policy "own missions select" on public.daily_missions for select using (auth.uid() = user_id);
create policy "own missions insert" on public.daily_missions for insert with check (auth.uid() = user_id);
create policy "own missions update" on public.daily_missions for update using (auth.uid() = user_id);

-- Mission attempts (each question answered)
create table public.mission_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.daily_missions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  subject_code text not null,
  selected_index int not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);
alter table public.mission_attempts enable row level security;
create policy "own attempts select" on public.mission_attempts for select using (auth.uid() = user_id);
create policy "own attempts insert" on public.mission_attempts for insert with check (auth.uid() = user_id);

-- User stats (streak and delay)
create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  delay_days int not null default 0,
  last_completed_date date,
  updated_at timestamptz not null default now()
);
alter table public.user_stats enable row level security;
create policy "own stats select" on public.user_stats for select using (auth.uid() = user_id);
create policy "own stats insert" on public.user_stats for insert with check (auth.uid() = user_id);
create policy "own stats update" on public.user_stats for update using (auth.uid() = user_id);
