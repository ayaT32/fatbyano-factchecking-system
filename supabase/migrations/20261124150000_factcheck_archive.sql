-- Fact-check archive for DEFAME runs (agent + Reviewer + human in the loop).
--
-- What is kept, and why (see DECISIONS.md #21):
--   * organisational archive: the claim, the final label and how it was settled, the
--     sources the verdict rests on (with archived links, FR09), the report, who decided;
--   * model feedback: the agent's and the Reviewer's verdicts, the Reviewer's status per
--     step, every human answer at a pause, and the fact-checker's endorsement of the
--     final report (the 70% endorsement goal), plus time and cost per run (NFR01, CR03).
-- What is NOT kept: scraped page text, the search candidates that were dropped, prompts
-- and raw model answers, the full reasoning record (it stays in report.md), and LangGraph
-- checkpoints (deleted when a claim finishes, DEFAME decision #39).
--
-- Writes come from the DEFAME backend with the service-role key (it bypasses RLS).
-- Signed-in users only read, except their own endorsement of a report.
-- Apply after review (pull request), in the SQL Editor of project fdwmnszimvfnzzgpwaba.

-- 0. Roles: staff → fact_checker, admin → manager (DECISIONS.md #5) ----------------------
-- Renaming an enum value keeps every stored role and every policy that compares with it.
-- Only the sign-up function has the old name written in its text, so it is redefined.

do $$
begin
  if exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
             where t.typname = 'app_role' and e.enumlabel = 'staff') then
    alter type public.app_role rename value 'staff' to 'fact_checker';
  end if;
  if exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
             where t.typname = 'app_role' and e.enumlabel = 'admin') then
    alter type public.app_role rename value 'admin' to 'manager';
  end if;
end $$;

-- Self-service sign-ups become fact-checkers; managers are promoted by a manager.
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
  insert into public.user_roles (user_id, role) values (new.id, 'fact_checker');
  return new;
end;
$$;

-- 1. claims: one row per fact-check session ---------------------------------------------

alter table public.claims
  add column if not exists mode text not null default 'auto',
  add column if not exists tools text[] not null default '{}',
  add column if not exists model text,
  add column if not exists agent_verdict text,
  add column if not exists reviewer_verdict text,
  add column if not exists settled_by text,
  add column if not exists needs_human_review boolean not null default false,
  add column if not exists extra_round boolean not null default false,
  add column if not exists error text,
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists duration_seconds real,
  add column if not exists human_wait_seconds real,
  add column if not exists cost_usd numeric(10, 4),
  add column if not exists stats jsonb;

comment on column public.claims.mode is 'Review mode: auto, disagreement or supervised';
comment on column public.claims.settled_by is 'agreement (agent = Reviewer), human (a fact-checker chose the label) or unresolved (NEI, needs human review)';
comment on column public.claims.duration_seconds is 'Run time without the time spent waiting for a human';
comment on column public.claims.stats is 'Calls and tokens per model and calls per tool (DEFAME meta["Statistics"])';

alter table public.claims drop constraint if exists claims_mode_check;
alter table public.claims add constraint claims_mode_check
  check (mode in ('auto', 'disagreement', 'supervised'));
alter table public.claims drop constraint if exists claims_settled_by_check;
alter table public.claims add constraint claims_settled_by_check
  check (settled_by is null or settled_by in ('agreement', 'human', 'unresolved'));
alter table public.claims drop constraint if exists claims_agent_verdict_check;
alter table public.claims add constraint claims_agent_verdict_check
  check (agent_verdict is null or agent_verdict in
         ('false', 'altered', 'misleading', 'missing_context', 'true', 'satire', 'nei'));
alter table public.claims drop constraint if exists claims_reviewer_verdict_check;
alter table public.claims add constraint claims_reviewer_verdict_check
  check (reviewer_verdict is null or reviewer_verdict in
         ('false', 'altered', 'misleading', 'missing_context', 'true', 'satire', 'nei'));

-- Who may read a claim's archive rows: its owner or a manager (same rule as claims)
create or replace function public.can_read_claim(_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.claims c
    where c.id = _claim_id
      and (c.user_id = auth.uid() or public.has_role(auth.uid(), 'manager'))
  )
$$;

-- 2. fact_check_steps: the four steps the chat shows, with the Reviewer's evaluation -----

create table if not exists public.fact_check_steps (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  step text not null check (step in ('plan', 'evidence', 'analysis', 'verdict')),
  round smallint not null default 1,          -- 2+: the Reviewer's rerun or a human feedback round
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  summary text,                                -- short, as shown in the chat
  review_status text check (review_status is null or review_status in
                            ('approved', 'incomplete', 'misleading', 'flagged', 'not_reviewed')),
  review_issues text,                          -- the Reviewer's issues for this step (model feedback)
  updated_at timestamptz not null default now(),
  unique (claim_id, step, round)
);
create index if not exists fact_check_steps_claim_idx on public.fact_check_steps (claim_id);

-- 3. evidence_sources: only the sources the agent kept (the top-ranked ones) -----------

create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  round smallint not null default 1,
  found_by text,                               -- the search query or tool that found it
  url text not null,
  title text,
  published_on date,
  credibility real check (credibility is null or credibility between 0 and 1),
  stance text check (stance is null or stance in ('supports', 'refutes', 'neutral')),
  snippet_only boolean not null default false, -- scraping failed; only the search snippet was used
  archived_url text,                           -- Wayback / archive.today copy (FR09)
  added_by text not null default 'agent' check (added_by in ('agent', 'reviewer')),
  created_at timestamptz not null default now()
);
create index if not exists evidence_sources_claim_idx on public.evidence_sources (claim_id);
create index if not exists evidence_sources_domain_idx
  on public.evidence_sources ((split_part(split_part(url, '://', 2), '/', 1)));

-- 4. human_decisions: every pause and the human's answer (model feedback + accountability)

create table if not exists public.human_decisions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  pause text not null check (pause in ('plan', 'disagree', 'nei')),
  context jsonb,                               -- what the human was shown (the plan, or both verdicts)
  asked_at timestamptz not null default now(),
  answered_at timestamptz,                     -- null while the claim waits
  action text check (action is null or action in ('continue', 'feedback', 'label')),
  label text check (label is null or label in
                    ('false', 'altered', 'misleading', 'missing_context', 'true', 'satire')),
  reason text,                                 -- required with a label
  feedback text,                               -- plan or NEI feedback for the agent
  switched_mode_to text check (switched_mode_to is null or
                               switched_mode_to in ('auto', 'disagreement', 'supervised')),
  decided_by uuid references auth.users(id) on delete set null,
  constraint human_decisions_label_needs_reason check (action <> 'label' or (label is not null and coalesce(reason, '') <> '')),
  constraint human_decisions_feedback_needs_text check (action <> 'feedback' or coalesce(feedback, '') <> '')
);
create index if not exists human_decisions_claim_idx on public.human_decisions (claim_id);
create index if not exists human_decisions_waiting_idx
  on public.human_decisions (claim_id) where answered_at is null;

-- 5. review_comments: the Reviewer's comments anchored to the draft report ---------------

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  block_id text not null,                      -- which report section
  quote text not null,                         -- the text the comment is anchored to
  body text not null,
  stage text not null check (stage in ('plan', 'evidence', 'analysis', 'verdict')),
  status text not null check (status in ('approved', 'incomplete', 'misleading', 'flagged', 'not_reviewed')),
  suggestion text,                             -- proposed replacement for the quote
  created_at timestamptz not null default now()
);
create index if not exists review_comments_claim_idx on public.review_comments (claim_id);

-- 6. reports: link to the stored files -------------------------------------------------

alter table public.reports
  add column if not exists markdown_path text,
  add column if not exists pdf_path text;

-- 7. report_feedback: the fact-checker's endorsement of the final report ----------------

create table if not exists public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endorsed boolean not null,                   -- "would you publish this explanation?"
  rating smallint check (rating is null or rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (claim_id, user_id)
);

-- 8. Access rules ------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['fact_check_steps', 'evidence_sources', 'human_decisions',
                           'review_comments', 'report_feedback'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('drop policy if exists "%s read" on public.%I', t, t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (public.can_read_claim(claim_id))', t, t);
  end loop;
end $$;

-- A fact-checker gives (and may change) only their own endorsement
grant insert, update on public.report_feedback to authenticated;
drop policy if exists "report_feedback write own" on public.report_feedback;
create policy "report_feedback write own" on public.report_feedback
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_claim(claim_id));
drop policy if exists "report_feedback update own" on public.report_feedback;
create policy "report_feedback update own" on public.report_feedback
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 9. Live updates for the chat (Supabase Realtime; RLS still applies) -------------------

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['claims', 'fact_check_steps', 'human_decisions', 'review_comments'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- 10. Private bucket for report files ---------------------------------------------------

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Files are stored as <claim id>/report.pdf and <claim id>/report.md by the backend.
-- (The folder is compared as text: casting every object name to uuid would fail on other buckets.)
create or replace function public.can_read_claim_file(_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.claims c
    where c.id::text = split_part(_path, '/', 1)
      and (c.user_id = auth.uid() or public.has_role(auth.uid(), 'manager'))
  )
$$;

drop policy if exists "report files read" on storage.objects;
create policy "report files read" on storage.objects
  for select to authenticated
  using (bucket_id = 'reports' and public.can_read_claim_file(name));

-- 11. LangGraph's own tables -----------------------------------------------------------
-- DEFAME's long-term memory (PostgresStore) and a future PostgreSQL checkpointer create
-- their tables themselves (setup()). If they are in the public schema, the browser API
-- could read them, so lock them: RLS on and no policies (only the backend's service role).
do $$
declare t text;
begin
  foreach t in array array['store', 'store_migrations', 'store_vectors', 'vector_migrations',
                           'checkpoints', 'checkpoint_blobs', 'checkpoint_writes',
                           'checkpoint_migrations'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- 12. Retention (DECISIONS.md #22) -------------------------------------------------------
-- Finished checks are the archive and are kept. Failed or cancelled runs are deleted after
-- 30 days, with their steps, sources, decisions and comments (on delete cascade).
-- Their files in Storage (claim-images, reports) are removed by the backend, which knows the paths.

alter table public.claims drop constraint if exists claims_status_check;
alter table public.claims add constraint claims_status_check
  check (status in ('pending', 'checked', 'queued', 'running', 'paused', 'done', 'failed', 'cancelled')) not valid;  -- 'checked': Aya's earlier screens

create or replace function public.purge_failed_claims(_older_than interval default interval '30 days')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare removed integer;
begin
  delete from public.claims
  where status in ('failed', 'cancelled')
    and coalesce(finished_at, created_at) < now() - _older_than;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.purge_failed_claims(interval) from public, anon, authenticated;

-- Run it daily at 03:00 UTC when pg_cron is enabled (Database → Extensions → pg_cron);
-- otherwise call `select public.purge_failed_claims();` by hand or from the backend.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-failed-claims';
    perform cron.schedule('purge-failed-claims', '0 3 * * *', 'select public.purge_failed_claims()');
  end if;
end $$;
