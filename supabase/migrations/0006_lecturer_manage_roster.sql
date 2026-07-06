-- Lets a lecturer edit a student's profile details (name/student ID/group)
-- and remove (unenroll) a student from a subject's roster. Both were
-- previously only self-service by the student themselves.

create policy "lecturers can update any profile"
  on public.profiles for update
  using (public.is_lecturer())
  with check (public.is_lecturer());

create policy "lecturers can unenroll students"
  on public.enrollments for delete
  using (public.is_lecturer());
