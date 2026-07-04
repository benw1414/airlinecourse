-- Phase 3: AI grading pipeline tables + RLS.
--
-- Key invariant: ai_grading_results / ai_criterion_scores have NO student-facing
-- RLS policy at all, so an unpublished AI score can never leak to a student
-- through any code path. Only the copy into published_grades /
-- published_criterion_scores (done explicitly by the lecturer) is student-visible.

create type public.ai_grading_status as enum ('pending', 'completed', 'failed');

create table public.grading_batches (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  anthropic_batch_id text not null,
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);

alter table public.grading_batches enable row level security;

create policy "lecturers manage grading batches"
  on public.grading_batches for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

create table public.ai_grading_results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  grading_batch_id uuid references public.grading_batches (id) on delete set null,
  model_used text not null,
  status public.ai_grading_status not null default 'pending',
  total_score numeric,
  overall_feedback text,
  raw_response jsonb,
  needs_attention boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ai_grading_results enable row level security;

create policy "lecturers manage ai grading results"
  on public.ai_grading_results for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

create table public.ai_criterion_scores (
  id uuid primary key default gen_random_uuid(),
  ai_grading_result_id uuid not null references public.ai_grading_results (id) on delete cascade,
  rubric_criterion_id uuid not null references public.rubric_criteria (id) on delete cascade,
  score numeric not null,
  feedback text,
  unique (ai_grading_result_id, rubric_criterion_id)
);

alter table public.ai_criterion_scores enable row level security;

create policy "lecturers manage ai criterion scores"
  on public.ai_criterion_scores for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

-- ---------------------------------------------------------------------------
-- published_grades / published_criterion_scores — student-visible once created
-- ---------------------------------------------------------------------------
create table public.published_grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  total_score numeric not null,
  overall_feedback text,
  published_by uuid not null references public.profiles (id),
  published_at timestamptz not null default now(),
  source_ai_grading_result_id uuid references public.ai_grading_results (id) on delete set null
);

alter table public.published_grades enable row level security;

create policy "students view their own published grades"
  on public.published_grades for select
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.student_id = auth.uid()
    )
  );

create policy "lecturers manage published grades"
  on public.published_grades for all
  using (public.is_lecturer())
  with check (public.is_lecturer());

create table public.published_criterion_scores (
  id uuid primary key default gen_random_uuid(),
  published_grade_id uuid not null references public.published_grades (id) on delete cascade,
  rubric_criterion_id uuid not null references public.rubric_criteria (id) on delete cascade,
  score numeric not null,
  feedback text,
  unique (published_grade_id, rubric_criterion_id)
);

alter table public.published_criterion_scores enable row level security;

create policy "students view their own published criterion scores"
  on public.published_criterion_scores for select
  using (
    exists (
      select 1 from public.published_grades pg
      join public.submissions s on s.id = pg.submission_id
      where pg.id = published_grade_id and s.student_id = auth.uid()
    )
  );

create policy "lecturers manage published criterion scores"
  on public.published_criterion_scores for all
  using (public.is_lecturer())
  with check (public.is_lecturer());
