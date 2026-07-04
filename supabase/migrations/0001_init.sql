-- Airline Business Course Manager: initial schema, triggers, and RLS policies
-- Phase 1 scope: profiles, semesters, subjects, enrollments, assignments, rubric_criteria, submissions
-- (submission_files / ai_grading_results / published_grades land in later migrations)

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('lecturer', 'student');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: is the current user a lecturer? SECURITY DEFINER so this lookup
-- runs without triggering RLS on `profiles` again — without this, a policy
-- on `profiles` that queries `profiles` recurses into itself infinitely.
create function public.is_lecturer()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'lecturer'
  );
$$;

create policy "profiles are viewable by their owner"
  on public.profiles for select
  using (id = auth.uid());

create policy "lecturers can view all profiles"
  on public.profiles for select
  using (public.is_lecturer());

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'student'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- semesters
-- ---------------------------------------------------------------------------
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

alter table public.semesters enable row level security;

create policy "anyone authenticated can view semesters"
  on public.semesters for select
  to authenticated
  using (true);

create policy "lecturers manage semesters"
  on public.semesters for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters (id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (semester_id, code)
);

alter table public.subjects enable row level security;

create policy "anyone authenticated can view subjects"
  on public.subjects for select
  to authenticated
  using (true);

create policy "lecturers manage subjects"
  on public.subjects for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

-- ---------------------------------------------------------------------------
-- enrollments (student self-enrolls)
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (subject_id, student_id)
);

alter table public.enrollments enable row level security;

create policy "students view their own enrollments"
  on public.enrollments for select
  using (student_id = auth.uid());

create policy "lecturers view all enrollments"
  on public.enrollments for select
  using (public.is_lecturer());

create policy "students self-enroll"
  on public.enrollments for insert
  with check (student_id = auth.uid());

create policy "students can unenroll themselves"
  on public.enrollments for delete
  using (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  week_number int not null check (week_number > 0),
  title text not null,
  instructions text,
  due_at timestamptz,
  max_points numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (subject_id, week_number)
);

alter table public.assignments enable row level security;

create policy "anyone authenticated can view assignments"
  on public.assignments for select
  to authenticated
  using (true);

create policy "lecturers manage assignments"
  on public.assignments for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

-- ---------------------------------------------------------------------------
-- rubric_criteria (assignments.max_points is kept in sync via trigger below)
-- ---------------------------------------------------------------------------
create table public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  name text not null,
  description text,
  max_points numeric not null check (max_points > 0),
  position int not null default 0
);

alter table public.rubric_criteria enable row level security;

create policy "anyone authenticated can view rubric criteria"
  on public.rubric_criteria for select
  to authenticated
  using (true);

create policy "lecturers manage rubric criteria"
  on public.rubric_criteria for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

create function public.recompute_assignment_max_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_assignment_id uuid;
begin
  target_assignment_id := coalesce(new.assignment_id, old.assignment_id);

  update public.assignments
  set max_points = coalesce(
    (select sum(max_points) from public.rubric_criteria where assignment_id = target_assignment_id),
    0
  )
  where id = target_assignment_id;

  return null;
end;
$$;

create trigger rubric_criteria_after_change
  after insert or update or delete on public.rubric_criteria
  for each row execute function public.recompute_assignment_max_points();

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------
create type public.submission_status as enum (
  'draft',
  'submitted',
  'graded_pending_review',
  'published'
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table public.submissions enable row level security;

create policy "students manage their own submissions"
  on public.submissions for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "lecturers view all submissions"
  on public.submissions for select
  using (public.is_lecturer());

create policy "lecturers update submissions"
  on public.submissions for update
  using (public.is_lecturer())
  with check (public.is_lecturer());
