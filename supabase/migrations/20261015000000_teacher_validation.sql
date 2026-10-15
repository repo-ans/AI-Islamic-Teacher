-- ════════════════════════════════════════════════════════════════════
-- Teacher validation: AI-drafted lessons reach students only after a
-- teacher validates them. One validation per lesson; any teacher may
-- request improvements. Students can see who validated a lesson.
-- ════════════════════════════════════════════════════════════════════

-- ─────────── Roles ───────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));
-- Shown to students next to the teacher's name, e.g. "Alim, Darul Uloom Dhaka".
alter table public.profiles add column if not exists teacher_title text;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('teacher', 'admin'));
$$;

-- Admins promote users by email (role changes by anyone else are blocked by protect_role).
create or replace function public.set_user_role(p_email text, p_role text)
returns json language plpgsql security definer set search_path = public as $$
declare v profiles;
begin
  if not public.is_admin() then raise exception 'Only admins can change roles'; end if;
  if p_role not in ('student', 'teacher', 'admin') then raise exception 'Unknown role %', p_role; end if;
  update profiles set role = p_role where lower(email) = lower(trim(p_email)) returning * into v;
  if v.id is null then raise exception 'No account with email % — they need to sign up first', p_email; end if;
  return json_build_object('id', v.id, 'email', v.email, 'full_name', v.full_name, 'role', v.role);
end $$;

-- ─────────── Validation on lessons ───────────
alter table public.lessons
  add column if not exists validated_by uuid references public.profiles (id) on delete set null,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by_name text,
  add column if not exists validated_by_title text;

-- Validation fields can only be set through validate_lesson() (clearing them is allowed).
create or replace function public.guard_lesson_validation()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.validated_at is not null
     and (new.validated_at, new.validated_by, new.validated_by_name, new.validated_by_title)
         is distinct from (old.validated_at, old.validated_by, old.validated_by_name, old.validated_by_title)
     and coalesce(current_setting('ilm.validating', true), '') <> 'on' then
    raise exception 'Lessons can only be validated by a teacher';
  end if;
  return new;
end $$;

drop trigger if exists lessons_guard_validation on public.lessons;
create trigger lessons_guard_validation before update on public.lessons
  for each row execute function public.guard_lesson_validation();

create or replace function public.guard_lesson_validation_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  new.validated_by := null;
  new.validated_at := null;
  new.validated_by_name := null;
  new.validated_by_title := null;
  return new;
end $$;

drop trigger if exists lessons_guard_validation_insert on public.lessons;
create trigger lessons_guard_validation_insert before insert on public.lessons
  for each row execute function public.guard_lesson_validation_insert();

-- A teacher validates a submitted lesson. Exactly once: the first teacher wins, everyone else gets an error.
create or replace function public.validate_lesson(p_lesson_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_title text;
  v_row lessons;
begin
  if not public.is_teacher() then raise exception 'Only teachers can validate lessons'; end if;
  select full_name, teacher_title into v_name, v_title from profiles where id = auth.uid();
  perform set_config('ilm.validating', 'on', true);

  update lessons
     set validated_by = auth.uid(), validated_at = now(), validated_by_name = v_name, validated_by_title = v_title
   where id = p_lesson_id and published and validated_at is null
  returning * into v_row;

  if v_row.id is null then
    if exists (select 1 from lessons where id = p_lesson_id and validated_at is not null) then
      raise exception 'This lesson has already been validated';
    end if;
    raise exception 'Lesson not found or not submitted for review';
  end if;
  return json_build_object('validated_at', v_row.validated_at, 'validated_by_name', v_row.validated_by_name, 'validated_by_title', v_row.validated_by_title);
end $$;

-- ─────────── Improvement requests ───────────
create table if not exists public.lesson_reviews (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  teacher_id    uuid references public.profiles (id) on delete set null,
  teacher_name  text not null default '',
  location      text not null default 'General', -- e.g. "Part 2 · The Year of the Elephant"
  comment       text not null,
  status        text not null default 'open' check (status in ('open', 'resolved')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index if not exists lesson_reviews_lesson_idx on public.lesson_reviews (lesson_id, created_at);

create or replace function public.stamp_lesson_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.teacher_id := auth.uid();
  new.teacher_name := coalesce((select full_name from profiles where id = auth.uid()), '');
  new.status := 'open';
  new.resolved_at := null;
  return new;
end $$;

drop trigger if exists lesson_reviews_stamp on public.lesson_reviews;
create trigger lesson_reviews_stamp before insert on public.lesson_reviews
  for each row execute function public.stamp_lesson_review();

alter table public.lesson_reviews enable row level security;
create policy "staff read reviews" on public.lesson_reviews for select to authenticated using (public.is_staff());
create policy "teachers request improvements" on public.lesson_reviews for insert to authenticated with check (public.is_teacher());
create policy "admins resolve reviews" on public.lesson_reviews for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─────────── Who sees what ───────────
-- Students: published AND validated. Teachers: everything submitted (published). Admins: everything.
drop policy if exists "read published lessons" on public.lessons;
create policy "read lessons" on public.lessons for select to authenticated
  using (public.is_admin() or (published and (validated_at is not null or public.is_teacher())));

-- Lesson content follows the lesson's visibility (the subquery runs under the lessons policy).
drop policy if exists "read segments" on public.lesson_segments;
create policy "read segments" on public.lesson_segments for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));
drop policy if exists "read references" on public.lesson_references;
create policy "read references" on public.lesson_references for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));
drop policy if exists "read questions" on public.quiz_questions;
create policy "read questions" on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));

-- ─────────── Editing sends a lesson back for validation ───────────
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
    order_index = excluded.order_index, published = excluded.published,
    -- content changed → a teacher must validate it again
    validated_by = null, validated_at = null, validated_by_name = null, validated_by_title = null;

  delete from lesson_segments where lesson_id = v_id;
  insert into lesson_segments (id, lesson_id, order_index, kind, title, content, audio_url, image_url, checkpoint)
  select coalesce(nullif(s ->> 'id', '')::uuid, gen_random_uuid()), v_id, (ord - 1)::int,
         coalesce(s ->> 'kind', 'teaching'), coalesce(s ->> 'title', ''), coalesce(s ->> 'content', ''),
         nullif(s ->> 'audio_url', ''), nullif(s ->> 'image_url', ''), coalesce((s ->> 'checkpoint')::boolean, false)
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
