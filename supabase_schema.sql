create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  role text default 'patient' check (role in ('patient', 'nurse'))
);

create table if not exists public.attack_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  logged_at timestamp with time zone default timezone('utc'::text, now()) not null,
  duration_hours integer default 0,
  duration_minutes integer default 0,
  pain_level integer not null check (pain_level between 1 and 10),
  pain_areas text[] default '{}',
  symptoms text[] default '{}',
  triggers text[] default '{}',
  custom_triggers text,
  psychological_state text,
  medication_taken text,
  side_effects text,
  overall_relief_achieved boolean default false,
  notes text
);

alter table public.profiles enable row level security;
alter table public.attack_logs enable row level security;

drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles
  for all using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Patients can manage own logs" on public.attack_logs;
create policy "Patients can manage own logs" on public.attack_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'MigraLog User'), 'patient')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
