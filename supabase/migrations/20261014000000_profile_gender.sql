-- The teacher's voice matches the student: girls hear the female teacher, boys the male teacher.
alter table public.profiles add column if not exists gender text check (gender in ('female', 'male'));
