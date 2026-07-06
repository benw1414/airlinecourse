-- Adds an optional nickname students can set at signup, shown alongside
-- their full name everywhere a lecturer sees student identity.

alter table public.profiles
  add column nickname text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, first_name, last_name, nickname, student_number, group_name, role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'student_number',
    new.raw_user_meta_data ->> 'group_name',
    'student'
  );
  return new;
end;
$$;
