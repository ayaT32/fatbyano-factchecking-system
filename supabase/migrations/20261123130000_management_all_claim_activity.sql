-- Management can review all staff claim activity; staff remain owner-only.
drop policy if exists "claims select" on public.claims;
drop policy if exists "claims select own or published for admin" on public.claims;
create policy "claims select own or admin" on public.claims
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "reports select" on public.reports;
drop policy if exists "reports select own or published for admin" on public.reports;
create policy "reports select own or admin" on public.reports
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );
