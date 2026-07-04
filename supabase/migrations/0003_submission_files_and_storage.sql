-- Phase 2: submission file metadata + private Storage bucket + RLS.
--
-- Storage object path convention (relative to the "submissions" bucket):
--   {subject_id}/{assignment_id}/{student_id}/{submission_id}/{filename}
-- The {student_id} segment doubles as the RLS predicate below.

create type public.scan_status as enum ('pending', 'clean', 'infected', 'error');

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  scan_status public.scan_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (storage_path)
);

alter table public.submission_files enable row level security;

create policy "students manage their own submission files"
  on public.submission_files for all
  using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.student_id = auth.uid()
    )
  );

create policy "lecturers view all submission files"
  on public.submission_files for select
  using (public.is_lecturer());

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

create policy "students upload their own submission files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

create policy "students view their own storage objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

create policy "students delete their own storage objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

create policy "lecturers view all submission storage objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'submissions' and public.is_lecturer());
