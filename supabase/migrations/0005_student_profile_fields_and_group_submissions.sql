-- Adds richer student profile fields (collected at signup) and per-assignment
-- group submission support. Group membership is global to the student (one
-- group_name on their profile, reused across every subject); whether an
-- assignment is submitted individually or by group is a per-assignment choice.
-- Grading stays per-student even for group submissions (each member gets
-- their own ai_grading_results / published_grades row).

alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column student_number text,
  add column group_name text;

-- Re-create handle_new_user to also populate the new fields from the
-- metadata passed at signup (supabase.auth.signUp options.data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, first_name, last_name, student_number, group_name, role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'student_number',
    new.raw_user_meta_data ->> 'group_name',
    'student'
  );
  return new;
end;
$$;

alter table public.assignments
  add column submission_mode text not null default 'individual'
    check (submission_mode in ('individual', 'group'));
