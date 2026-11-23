do $$
begin
  create type public.app_role as enum ('admin', 'staff');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "read profiles" on public.profiles;
drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());

drop policy if exists "read own roles or admin" on public.user_roles;
create policy "read own roles or admin" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "admins manage roles" on public.user_roles;
create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email
  );
  insert into public.user_roles (user_id, role) values (new.id, 'staff');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  claim_text text not null,
  source_url text,
  image_path text,
  category text,
  verdict text,
  confidence integer,
  summary text,
  analysis jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.claims
  add column if not exists is_published boolean not null default true;
alter table public.claims
  alter column is_published set default false;
grant select, insert, update, delete on public.claims to authenticated;
grant all on public.claims to service_role;
alter table public.claims enable row level security;
drop policy if exists "claims select" on public.claims;
create policy "claims select" on public.claims
  for select to authenticated
  using (
    user_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );
drop policy if exists "claims insert" on public.claims;
create policy "claims insert" on public.claims
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "claims update" on public.claims;
create policy "claims update" on public.claims
  for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "claims delete" on public.claims;
create policy "claims delete" on public.claims
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  claim_id uuid references public.claims(id) on delete set null,
  title text not null,
  body text not null,
  verdict text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
drop policy if exists "reports select" on public.reports;
create policy "reports select" on public.reports
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reports update" on public.reports;
create policy "reports update" on public.reports
  for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "reports delete" on public.reports;
create policy "reports delete" on public.reports
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public)
values ('claim-images', 'claim-images', false)
on conflict (id) do nothing;
drop policy if exists "claim images upload" on storage.objects;
create policy "claim images upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'claim-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "claim images read" on storage.objects;
create policy "claim images read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'claim-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role(auth.uid(), 'admin')
    )
  );

create table if not exists public.investigation_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null default 'New investigation',
  messages jsonb not null default '[]'::jsonb,
  enabled_tools text[] not null default array['manipulation', 'geolocation']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.investigation_chats to authenticated;
grant all on public.investigation_chats to service_role;
alter table public.investigation_chats enable row level security;
drop policy if exists "investigation chats owner only" on public.investigation_chats;
create policy "investigation chats owner only" on public.investigation_chats
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists investigation_chats_owner_updated
  on public.investigation_chats(user_id, updated_at desc);
