-- The phase a running claim is in, for the fact-check screen's status line
-- ("Checking evidence… 2:14"; DECISIONS.md #25). DEFAME updates it once per phase change,
-- not per step, and clears it when the claim finishes.
-- Apply in the SQL Editor of project fdwmnszimvfnzzgpwaba, after the earlier migrations.

alter table public.claims add column if not exists phase text;
alter table public.claims drop constraint if exists claims_phase_check;
alter table public.claims add constraint claims_phase_check
  check (phase is null or phase in ('planning', 'gathering_evidence', 'analysing', 'reviewing', 'finalizing'));
comment on column public.claims.phase is
  'While running: planning, gathering_evidence, analysing, reviewing or finalizing (null otherwise)';
