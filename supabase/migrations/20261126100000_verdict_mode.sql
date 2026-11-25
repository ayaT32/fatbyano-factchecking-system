-- Verdict review mode and the end-of-run verdict pause (DECISIONS.md #24).
--
-- New mode `verdict`: pauses when the agent and the Reviewer disagree, at NEI, and also
-- when they AGREE, so the fact-checker can give feedback on every final verdict.
-- At the verdict pause the human can:
--   continue  confirm the agreed label
--   label     override it with one of the six labels + a required reason
--   comment   keep the label and leave a note for the record (stored in `feedback`)
--   feedback  send feedback for one more agent round (reviewed again; once per claim)
-- Apply in the SQL Editor of project fdwmnszimvfnzzgpwaba, after the archive migration.

alter table public.claims drop constraint if exists claims_mode_check;
alter table public.claims add constraint claims_mode_check
  check (mode in ('auto', 'disagreement', 'supervised', 'verdict'));
comment on column public.claims.mode is
  'Review mode: auto, disagreement, supervised or verdict (disagreement + NEI + a pause at every agreed verdict)';

alter table public.human_decisions drop constraint if exists human_decisions_pause_check;
alter table public.human_decisions add constraint human_decisions_pause_check
  check (pause in ('plan', 'disagree', 'nei', 'verdict'));

alter table public.human_decisions drop constraint if exists human_decisions_action_check;
alter table public.human_decisions add constraint human_decisions_action_check
  check (action is null or action in ('continue', 'feedback', 'label', 'comment'));

alter table public.human_decisions drop constraint if exists human_decisions_switched_mode_to_check;
alter table public.human_decisions add constraint human_decisions_switched_mode_to_check
  check (switched_mode_to is null or switched_mode_to in ('auto', 'disagreement', 'supervised', 'verdict'));

alter table public.human_decisions drop constraint if exists human_decisions_comment_needs_text;
alter table public.human_decisions add constraint human_decisions_comment_needs_text
  check (action <> 'comment' or coalesce(feedback, '') <> '');

comment on column public.human_decisions.feedback is
  'With action feedback: guidance for one more agent round. With action comment: a note kept with the record.';
