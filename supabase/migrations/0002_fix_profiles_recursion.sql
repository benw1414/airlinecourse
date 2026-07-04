-- Fixes infinite recursion in the "lecturers can view all profiles" policy:
-- it queried `profiles` directly instead of via the SECURITY DEFINER
-- `is_lecturer()` helper, so Postgres recursed into the same policy forever.

drop policy if exists "lecturers can view all profiles" on public.profiles;

create policy "lecturers can view all profiles"
  on public.profiles for select
  using (public.is_lecturer());
