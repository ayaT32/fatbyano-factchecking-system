-- The AI Reviewer can be switched off per claim (DEFAME DECISIONS.md #47, interface DECISIONS.md #29).
-- Without it the agent's verdict is final, recorded as settled_by = 'agent'.
-- Apply in the SQL Editor of project fdwmnszimvfnzzgpwaba, after the earlier migrations.

alter table public.claims add column if not exists reviewer_enabled boolean not null default true;
comment on column public.claims.reviewer_enabled is
  'false when the fact-checker switched the AI Reviewer off for this claim (the agent''s verdict is then final)';

alter table public.claims drop constraint if exists claims_settled_by_check;
alter table public.claims add constraint claims_settled_by_check
  check (settled_by is null or settled_by in ('agreement', 'agent', 'human', 'unresolved'));
comment on column public.claims.settled_by is
  'agreement (agent = Reviewer), agent (Reviewer off), human (a fact-checker chose the label) or unresolved (NEI, needs human review)';
