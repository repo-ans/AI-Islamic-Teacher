-- ════════════════════════════════════════════════════════════════════
-- Ilm AI — AI Islamic Teacher · initial schema
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────── Profiles & roles ───────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '',
  age         int check (age between 3 and 120),
  level       text check (level in ('child', 'teen', 'adult', 'new_muslim', 'non_muslim')),
  language    text not null default 'en',
  country     text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Students can edit their own profile but never promote themselves.
-- (Promote an admin from the SQL editor: update profiles set role = 'admin' where email = '...';)
create or replace function public.protect_role()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.role() = 'authenticated' and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end $$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- ─────────────────────────── Curriculum ───────────────────────────
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  description  text not null default '',
  category     text not null default '',
  color        text not null default 'brand' check (color in ('brand', 'lime', 'amber', 'ink')),
  order_index  int not null default 0,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.modules (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  order_index  int not null default 0
);
create index on public.modules (course_id);

create table public.lessons (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  module_id    uuid not null references public.modules (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  objectives   text[] not null default '{}',
  est_minutes  int not null default 10,
  order_index  int not null default 0,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on public.lessons (module_id);
create index on public.lessons (course_id);

-- The "pre-recorded" narration the teacher plays, one row per segment.
create table public.lesson_segments (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  order_index  int not null default 0,
  kind         text not null default 'teaching' check (kind in ('intro', 'teaching', 'example', 'story', 'summary')),
  title        text not null default '',
  content      text not null,
  audio_url    text,
  checkpoint   boolean not null default false -- teacher checks understanding after this segment
);
create index on public.lesson_segments (lesson_id);

create table public.lesson_references (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  source_type  text not null check (source_type in ('quran', 'hadith', 'tafsir', 'book')),
  citation     text not null,
  text         text not null default '',
  arabic       text,
  url          text
);
create index on public.lesson_references (lesson_id);

create table public.quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  order_index     int not null default 0,
  type            text not null check (type in ('mcq', 'true_false', 'short_answer', 'reflection')),
  prompt          text not null,
  options         jsonb not null default '[]',
  correct_answer  text not null default '',
  explanation     text not null default '',
  topic           text not null default ''
);
create index on public.quiz_questions (lesson_id);

-- ─────────────────────────── Learner data ───────────────────────────
create table public.enrollments (
  user_id     uuid not null references auth.users (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.lesson_progress (
  user_id       uuid not null references auth.users (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete cascade,
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  score         int,
  total         int,
  primary key (user_id, lesson_id)
);

create table public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  lesson_id   uuid references public.lessons (id) on delete set null,
  module_id   uuid references public.modules (id) on delete set null,
  kind        text not null default 'lesson' check (kind in ('lesson', 'assessment')),
  answers     jsonb not null default '[]',
  score       int not null default 0,
  total       int not null default 0,
  feedback    text not null default '',
  created_at  timestamptz not null default now()
);
create index on public.quiz_attempts (user_id, created_at);

-- Questions a student got wrong → next-day 30-second review + weak-area revision.
-- question_id has no FK on purpose: prompt/answer are copied so edits to a lesson never erase history.
create table public.missed_questions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  course_id       uuid not null references public.courses (id) on delete cascade,
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  question_id     uuid not null,
  topic           text not null default '',
  prompt          text not null,
  correct_answer  text not null default '',
  explanation     text not null default '',
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, question_id)
);

create table public.reflections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  content      text not null,
  ai_feedback  text not null default '',
  created_at   timestamptz not null default now()
);

create table public.question_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  lesson_id   uuid references public.lessons (id) on delete set null,
  question    text not null,
  answer      text not null,
  "references" jsonb not null default '[]',
  created_at  timestamptz not null default now()
);
create index on public.question_history (user_id, created_at);

-- One row per learner per local day — powers streaks and "week at a glance".
create table public.activity_days (
  user_id            uuid not null references auth.users (id) on delete cascade,
  day                date not null,
  minutes            int not null default 0,
  lessons_completed  int not null default 0,
  primary key (user_id, day)
);

-- Written by the ai-teacher edge function (service role) for auditing and rate limiting.
create table public.ai_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  action      text not null,
  model       text,
  latency_ms  int,
  ok          boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on public.ai_logs (user_id, created_at);

-- ─────────────────────────── Row level security ───────────────────────────
alter table public.profiles          enable row level security;
alter table public.courses           enable row level security;
alter table public.modules           enable row level security;
alter table public.lessons           enable row level security;
alter table public.lesson_segments   enable row level security;
alter table public.lesson_references enable row level security;
alter table public.quiz_questions    enable row level security;
alter table public.enrollments       enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.quiz_attempts     enable row level security;
alter table public.missed_questions  enable row level security;
alter table public.reflections       enable row level security;
alter table public.question_history  enable row level security;
alter table public.activity_days     enable row level security;
alter table public.ai_logs           enable row level security;

create policy "own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Content: everyone signed in can read published content; admins manage everything.
create policy "read published courses" on public.courses for select to authenticated
  using (published or public.is_admin());
create policy "read modules" on public.modules for select to authenticated using (true);
create policy "read published lessons" on public.lessons for select to authenticated
  using (published or public.is_admin());
create policy "read segments" on public.lesson_segments for select to authenticated using (true);
create policy "read references" on public.lesson_references for select to authenticated using (true);
create policy "read questions" on public.quiz_questions for select to authenticated using (true);

create policy "admin writes courses"    on public.courses           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin writes modules"    on public.modules           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin writes lessons"    on public.lessons           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin writes segments"   on public.lesson_segments   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin writes references" on public.lesson_references for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin writes questions"  on public.quiz_questions    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Learner data: each student sees and writes only their own rows.
create policy "own enrollments" on public.enrollments      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own progress"    on public.lesson_progress  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own attempts"    on public.quiz_attempts    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own missed"      on public.missed_questions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own reflections" on public.reflections      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own questions"   on public.question_history for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own activity"    on public.activity_days    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins read ai logs" on public.ai_logs for select to authenticated using (public.is_admin());

-- ─────────────────────────── RPC functions ───────────────────────────

-- Marks a lesson complete. completed_at is only set once, so replaying a
-- lesson never moves the next day's unlock.
create or replace function public.complete_lesson(p_lesson_id uuid, p_score int, p_total int)
returns void language sql security invoker set search_path = public as $$
  update lesson_progress
     set status = 'completed',
         completed_at = coalesce(completed_at, now()),
         score = p_score,
         total = p_total
   where user_id = auth.uid() and lesson_id = p_lesson_id;
$$;

create or replace function public.log_activity(p_day date, p_minutes int, p_lessons int)
returns void language sql security invoker set search_path = public as $$
  insert into activity_days (user_id, day, minutes, lessons_completed)
  values (auth.uid(), p_day, least(greatest(p_minutes, 0), 240), greatest(p_lessons, 0))
  on conflict (user_id, day) do update
    set minutes = least(activity_days.minutes + excluded.minutes, 1440),
        lessons_completed = activity_days.lessons_completed + excluded.lessons_completed;
$$;

-- Saves a lesson with its segments, references and questions in one transaction.
-- Existing child ids are kept so audio files and missed-question history stay linked.
create or replace function public.save_lesson(p_lesson jsonb, p_segments jsonb, p_references jsonb, p_questions jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := coalesce(nullif(p_lesson ->> 'id', '')::uuid, gen_random_uuid());
begin
  if not public.is_admin() then
    raise exception 'Only admins can edit lessons';
  end if;

  insert into lessons (id, course_id, module_id, title, description, objectives, est_minutes, order_index, published)
  values (
    v_id,
    (p_lesson ->> 'course_id')::uuid,
    (p_lesson ->> 'module_id')::uuid,
    coalesce(p_lesson ->> 'title', 'Untitled lesson'),
    coalesce(p_lesson ->> 'description', ''),
    array(select jsonb_array_elements_text(coalesce(p_lesson -> 'objectives', '[]'::jsonb))),
    coalesce((p_lesson ->> 'est_minutes')::int, 10),
    coalesce((p_lesson ->> 'order_index')::int, 0),
    coalesce((p_lesson ->> 'published')::boolean, false)
  )
  on conflict (id) do update set
    course_id = excluded.course_id, module_id = excluded.module_id, title = excluded.title,
    description = excluded.description, objectives = excluded.objectives, est_minutes = excluded.est_minutes,
    order_index = excluded.order_index, published = excluded.published;

  delete from lesson_segments where lesson_id = v_id;
  insert into lesson_segments (id, lesson_id, order_index, kind, title, content, audio_url, checkpoint)
  select coalesce(nullif(s ->> 'id', '')::uuid, gen_random_uuid()), v_id, (ord - 1)::int,
         coalesce(s ->> 'kind', 'teaching'), coalesce(s ->> 'title', ''), coalesce(s ->> 'content', ''),
         nullif(s ->> 'audio_url', ''), coalesce((s ->> 'checkpoint')::boolean, false)
    from jsonb_array_elements(coalesce(p_segments, '[]'::jsonb)) with ordinality as t(s, ord);

  delete from lesson_references where lesson_id = v_id;
  insert into lesson_references (id, lesson_id, source_type, citation, text, arabic, url)
  select coalesce(nullif(r ->> 'id', '')::uuid, gen_random_uuid()), v_id, coalesce(r ->> 'source_type', 'book'),
         coalesce(r ->> 'citation', ''), coalesce(r ->> 'text', ''), nullif(r ->> 'arabic', ''), nullif(r ->> 'url', '')
    from jsonb_array_elements(coalesce(p_references, '[]'::jsonb)) as t(r);

  delete from quiz_questions where lesson_id = v_id;
  insert into quiz_questions (id, lesson_id, order_index, type, prompt, options, correct_answer, explanation, topic)
  select coalesce(nullif(q ->> 'id', '')::uuid, gen_random_uuid()), v_id, (ord - 1)::int,
         coalesce(q ->> 'type', 'mcq'), coalesce(q ->> 'prompt', ''), coalesce(q -> 'options', '[]'::jsonb),
         coalesce(q ->> 'correct_answer', ''), coalesce(q ->> 'explanation', ''), coalesce(q ->> 'topic', '')
    from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) with ordinality as t(q, ord);

  return v_id;
end $$;

-- Used by the n8n daily-reminder workflow (service role only).
create or replace function public.students_due_reminder()
returns table (user_id uuid, email text, full_name text, language text, last_active date)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.language,
         (select max(a.day) from activity_days a where a.user_id = p.id)
    from profiles p
   where p.onboarded
     and p.email is not null
     and exists (select 1 from enrollments e where e.user_id = p.id)
     and not exists (select 1 from activity_days a where a.user_id = p.id and a.day = current_date);
$$;
revoke execute on function public.students_due_reminder() from public, anon, authenticated;
grant execute on function public.students_due_reminder() to service_role;

-- ─────────────────────────── Storage ───────────────────────────
-- Narration audio (uploaded by admins or generated by the tts edge function).
insert into storage.buckets (id, name, public)
values ('lesson-audio', 'lesson-audio', true)
on conflict (id) do nothing;

create policy "admins upload lesson audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-audio' and public.is_admin());
create policy "admins update lesson audio" on storage.objects for update to authenticated
  using (bucket_id = 'lesson-audio' and public.is_admin());
create policy "admins delete lesson audio" on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-audio' and public.is_admin());
