-- Preserve existing claims as published while making future AI checks private by default.
alter table public.claims
add column if not exists is_published boolean not null default true;

alter table public.claims
alter column is_published
set default false;

drop policy if exists "claims select" on public.claims;

create policy "claims select own or published for admin" on public.claims for
select to authenticated using (
        user_id = auth.uid ()
        or (
            is_published
            and public.has_role (auth.uid (), 'admin')
        )
    );

drop policy if exists "claims update" on public.claims;

create policy "claims update own" on public.claims for
update to authenticated using (user_id = auth.uid ())
with
    check (user_id = auth.uid ());

drop policy if exists "claims delete" on public.claims;

create policy "claims delete own or published for admin" on public.claims for delete to authenticated using (
    user_id = auth.uid ()
    or (
        is_published
        and public.has_role (auth.uid (), 'admin')
    )
);

drop policy if exists "reports select" on public.reports;

create policy "reports select own or published for admin" on public.reports for
select to authenticated using (
        user_id = auth.uid ()
        or (
            public.has_role (auth.uid (), 'admin')
            and exists (
                select 1
                from public.claims c
                where
                    c.id = reports.claim_id
                    and c.is_published
            )
        )
    );

drop policy if exists "reports update" on public.reports;

create policy "reports update own or published for admin" on public.reports for
update to authenticated using (
    user_id = auth.uid ()
    or (
        public.has_role (auth.uid (), 'admin')
        and exists (
            select 1
            from public.claims c
            where
                c.id = reports.claim_id
                and c.is_published
        )
    )
)
with
    check (
        user_id = auth.uid ()
        or (
            public.has_role (auth.uid (), 'admin')
            and exists (
                select 1
                from public.claims c
                where
                    c.id = reports.claim_id
                    and c.is_published
            )
        )
    );

drop policy if exists "reports delete" on public.reports;

create policy "reports delete own or published for admin" on public.reports for delete to authenticated using (
    user_id = auth.uid ()
    or (
        public.has_role (auth.uid (), 'admin')
        and exists (
            select 1
            from public.claims c
            where
                c.id = reports.claim_id
                and c.is_published
        )
    )
);

drop policy if exists "claim images read" on storage.objects;

create policy "claim images read own or published for admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'claim-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        public.has_role(auth.uid(), 'admin')
        and exists (
          select 1
          from public.claims c
          where c.image_path = name
            and c.is_published
        )
      )
    )
  );

-- Self-service sign-ups become factcheckers; existing admin accounts remain admins.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
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