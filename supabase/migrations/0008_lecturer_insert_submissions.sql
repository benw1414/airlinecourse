-- Lecturers publishing a grade for a student with no existing submission row
-- (e.g. "Grade group" including someone who never personally uploaded, or
-- the per-student "Grade" button for an enrolled student who never opened
-- the assignment) need to create that submissions row themselves. Only a
-- student-owns-their-row insert policy existed before, so this failed with
-- "new row violates row-level security policy for table submissions".
create policy "lecturers can insert submissions"
  on public.submissions for insert
  with check (public.is_lecturer());
