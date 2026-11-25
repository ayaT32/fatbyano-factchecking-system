# Design Decisions (interface)

A log of design decisions for the Fatabyyano fact-checker's interface. Newest decisions go at the bottom. Backend and fact-checking decisions are logged in `DECISIONS.md` of `Eilaf649/fatabyyano-factchecker` (DEFAME).

Scope for now: the **log-in** and **fact-check** screens. Trending and management come later.

---

## 1. Verdicts use Fatabyyano's six labels plus NEI
- **Date:** 2026-11-24
- **Decision:** The verdict values are `false`, `altered`, `misleading`, `missing_context`, `true`, `satire` and `nei` (not enough information; a human decides). They replace the old `true`, `false`, `misleading`, `partly_true` and `unverifiable`. Each has its own colour token (`--verdict-*` in `src/styles.css`). The hues follow fatabyyano.net (its red "false" and magenta "misleading" badges; its success, warning, sub-accent and muted tokens), darkened so white badge text has a contrast of at least 4.5:1. "Altered" is purple because its colour on fatabyyano.net could not be read. DEFAME's labels map one-to-one (`mapDefameVerdict`); a submission whose claims are both true and false becomes `misleading` (Fatabyyano's definition of a mix of accurate and inaccurate). Old rows still display: `unverifiable` as NEI and `partly_true` as misleading. No database change: `verdict` is a text column.
- **Options:** (a) keep the old five values and map Fatabyyano's labels onto them; (b) use Fatabyyano's six labels plus NEI.
- **Reason:** Eilaf chose (b): the interface must show the same labels the backend and Fatabyyano's fact-checkers use.

## 2. The browser reaches the fact-check backend through the app's server
- **Date:** 2026-11-24
- **Decision:** Browser → the app's TanStack server functions → DEFAME's FastAPI (as `src/lib/ai/defame.server.ts` already does).
- **Options:** (a) through the app's server; (b) the browser calls FastAPI directly.
- **Reason:** Eilaf chose (a): the DEFAME API key stays on the server and no CORS setup is needed.

## 3. Live progress arrives through Supabase Realtime
- **Date:** 2026-11-24
- **Decision:** The backend writes each stage, Reviewer check and pause to Supabase tables; the chat subscribes to them.
- **Options:** (a) Supabase Realtime; (b) DEFAME's `/status` WebSocket passed through; (c) polling every few seconds.
- **Reason:** Eilaf chose (a): a page refresh loses nothing, and history, reports and the future dashboard read the same rows. The backend needs Supabase's service key (server-side only).

## 4. One session in the sidebar is one claim
- **Date:** 2026-11-24
- **Decision:** Each session holds one claim with its steps, verdict, review and report.
- **Options:** (a) one claim per session; (b) one chat with several claims.
- **Reason:** Eilaf chose (a): it maps cleanly to the `claims` and `reports` tables and to per-claim statistics.

## 5. Roles: fact-checker and manager
- **Date:** 2026-11-24
- **Decision:** Rename the roles `staff` → `fact_checker` and `admin` → `manager` (a migration on `app_role`).
- **Options:** (a) rename; (b) keep admin and staff; (c) add a separate reviewer role.
- **Reason:** Eilaf chose (a): it matches the proposal; managers will also get the dashboard later.

## 6. Mode and model are chosen in a picker next to Send
- **Date:** 2026-11-24
- **Decision:** A picker beside the Send button, like Claude's model picker, always shows the mode. The modes are the backend's: `auto` (no pauses), `disagreement` (pause when the agent and the Reviewer disagree, and at NEI) and `supervised` (also after the first plan); see DEFAME's decision #43. The model choice sits in the same picker and only appears once there are two or more models. The `+` menu holds tools and attachments.
- **Options:** (a) picker next to Send; (b) inside the `+` menu.
- **Reason:** Eilaf chose (a): the mode matters for every claim, so it must stay visible.

## 7. The chat shows four expandable steps
- **Date:** 2026-11-24
- **Decision:** Plan → Evidence → Analysis → Verdict, each a collapsible card; searches, sources and tool results appear inside when expanded.
- **Options:** (a) four big steps; (b) one card per graph node; (c) a progress bar and the final result only.
- **Reason:** Eilaf chose (a): calm by default, full detail one click away, and it still meets FR08 (each stage's output is visible).

## 8. The Reviewer's evaluation is a document review in a panel beside the chat
- **Date:** 2026-11-24
- **Decision:** A "Review" panel opens beside the chat (full screen on mobile) and shows the draft report as a document, in the style of the debrief review view. The Reviewer's evaluations appear as Google Docs–style comments in the margin, anchored to the highlighted text they refer to, and its proposed changes appear as suggestions. The human does not act on comments: human input happens only at the backend's pauses (plan, disagreement, NEI).
- **Options:** where: (a) a panel beside the chat; (b) a separate review page; (c) threads inside the chat. What the human can do with comments: accept or reject suggestions, reply, resolve, add their own; or nothing (pauses only).
- **Reason:** Eilaf chose (a), with comments read-only: the double review is shown where it applies, and the human's role stays limited to the defined pauses.

## 9. "Need your input" is an inline card in the chat
- **Date:** 2026-11-24
- **Decision:** A pause shows as a highlighted card at the end of the conversation with its choices and reason box, and the session gets a badge in the sidebar. It is still there after a refresh.
- **Options:** (a) an inline card; (b) a pop-up dialog.
- **Reason:** Eilaf chose (a): nothing blocks the rest of the app, and it works on mobile and with several waiting claims.

## 10. Reports download as PDF and Markdown, stored with the claim
- **Date:** 2026-11-24
- **Decision:** The backend's `report.pdf` and `report.md` are saved to Supabase Storage, linked to the claim, and downloadable from the chat and the history.
- **Options:** (a) PDF and Markdown, stored; (b) PDF only; (c) generated in the browser.
- **Reason:** Eilaf chose (a): instant, archived downloads; the Markdown is reusable when writing the published article.

## 11. Arabic first, with an English toggle
- **Date:** 2026-11-24
- **Decision:** Right-to-left Arabic by default, with an English toggle (`src/lib/i18n.tsx`). The backend sends label codes; the interface shows their names.
- **Options:** (a) Arabic first; (b) English first; (c) Arabic only.
- **Reason:** Eilaf chose (a): Fatabyyano's fact-checkers work in Arabic, and the English toggle helps demos and examiners.

## 12. Tools in the `+` menu are all on, and can be turned off per claim
- **Date:** 2026-11-24
- **Decision:** Geolocation, the AI and manipulation detectors and the other tools are on by default, as today; switching one off removes it for that claim only (the backend passes the choice to `FactChecker`).
- **Options:** (a) all on, can turn off; (b) all off, can turn on; (c) listed only, no toggles.
- **Reason:** Eilaf chose (a): the planner keeps choosing what fits, and a user can still skip a slow tool.

## 13. Images are uploaded to Supabase Storage first
- **Date:** 2026-11-24
- **Decision:** An attached image goes to the claim-images bucket; the backend receives a link.
- **Options:** (a) Storage first; (b) sent straight to FastAPI.
- **Reason:** Eilaf chose (a): the image is stored once, shows in history and the report, and keeps large files out of the API call.

## 14. No follow-up chat after the verdict, for now
- **Date:** 2026-11-24
- **Decision:** A session ends with the verdict, the report and the review panel.
- **Options:** (a) not for now; (b) follow-up questions answered from that claim's report only.
- **Reason:** Eilaf chose (a): it keeps the first version focused; follow-ups can be added later as their own feature.

## 15. Mobile uses drawers
- **Date:** 2026-11-24
- **Decision:** The sessions sidebar becomes a slide-out drawer, the review panel opens full screen, and the chat, input card and `+` menu stack vertically.
- **Options:** (a) drawers; (b) desktop first, mobile later.
- **Reason:** Eilaf chose (a): NFR06 requires mobile, and retrofitting the layout later costs more.

## 16. The screens read a typed data contract; a demo source stands in for the backend
- **Date:** 2026-11-24
- **Decision:** `src/lib/factcheck/types.ts` defines what the screens read: a run (claim, mode, tools, model, status), its four steps with the Reviewer's status, the pause, the agent's, Reviewer's and final verdicts, the human's decisions, and the draft report with anchored Reviewer comments. The screens get runs from a `FactCheckSource`. For now that is `DemoSource` (`demo-source.ts`), which plays one scripted claim, pauses where the mode says, and keeps runs in this browser's localStorage. A Supabase Realtime source with the same interface replaces it once DEFAME writes runs to Supabase; the screens stay unchanged. The sidebar says "demo data" while the demo source is in use.
- **Options:** (a) contract + demo source now; (b) wait for the backend tables and endpoints first.
- **Reason:** The backend doesn't write steps, pauses or comments to Supabase yet; (a) lets the screens be built and tested now and fixes the shapes the backend must produce (the API contract).

## 17. `/check` is the new fact-check screen; the app's sidebar steps aside there
- **Date:** 2026-11-24
- **Decision:** `/check` (new claim) and `/check/<id>` (one session) show the new workspace. On these routes `AppShell` renders only the page, because the workspace has its own sessions sidebar (logo, new fact-check, previous sessions, user and language). After sign-in everyone goes to `/check`; the dashboard and team pages come later. Aya's research chat (`investigation-workspace.tsx`) stays in the repo, unused, until she decides.
- **Options:** (a) replace `/check`; (b) a new route next to the old chat.
- **Reason:** Eilaf chose (a): one chat screen avoids confusing fact-checkers.

## 18. The default mode is Auto
- **Date:** 2026-11-24
- **Decision:** The mode picker starts at Auto (no pauses), matching the backend's default. At a pause, "/auto" (typed in the plan pause, or the link under any pause card) finishes the claim without pauses; a pause the new mode doesn't have is settled as that mode would (plan kept, disagreement → NEI with "Needs Human Review", NEI left as NEI).
- **Options:** (a) Auto; (b) Disagreement.
- **Reason:** Same behaviour as the backend when nothing is chosen; supervision is a deliberate choice per claim.

## 19. A development-only preview route
- **Date:** 2026-11-24
- **Decision:** `/preview/check` shows the workspace with demo data and no sign-in, for checking layouts. Outside development (`import.meta.env.DEV` false) it returns "not found".
- **Options:** (a) a dev-only route; (b) sign in every time to check a layout change.
- **Reason:** Faster checks of the screens without touching real accounts; it reads no real data.

## 20. The repo must live in a folder without an apostrophe
- **Date:** 2026-11-24
- **Decision:** The local clone is at `C:\dev\fatbyano-factchecking-system`, not under `C:\Users\Eilaf's\`.
- **Options:** none that work: TanStack Router's code splitter writes file paths inside single quotes, so a `'` in the path breaks the generated code (a 500 error on every page).
- **Reason:** Required for the dev server to run.

## 21. The database keeps an archive and model-feedback data, not everything (draft, not applied)
- **Date:** 2026-11-24
- **Decision:** `supabase/migrations/20261124150000_factcheck_archive.sql` matches the latest DEFAME workflow (memory branch: agent and Reviewer must agree, else a human decides or the claim is NEI, DEFAME #43). Kept:
  - `claims` (one row per session) gains the mode, tools, model, agent and Reviewer verdicts, `settled_by` (agreement / human / unresolved), `needs_human_review`, the extra round, run time without human wait, human wait, cost and a small `stats` JSON;
  - `fact_check_steps`: per step and round, a short summary and the Reviewer's status and issues;
  - `evidence_sources`: only the sources the agent kept, with credibility, stance, snippet-only flag and an archived link (FR09);
  - `human_decisions`: every pause, what the human saw and the answer (label + required reason, or feedback), who and when;
  - `review_comments`: the Reviewer's comments anchored to the report;
  - `reports` gains links to `report.md` / `report.pdf` in a private `reports` bucket;
  - `report_feedback`: the fact-checker's endorsement (yes/no, 1–5, comment) for the 70% endorsement goal.
  Not kept: scraped page text, dropped search candidates, prompts and raw model answers, the full reasoning record (it stays in `report.md`), and checkpoints (deleted when a claim finishes, DEFAME #39). The backend writes with the service-role key; signed-in users only read (owner or manager), except their own endorsement. Four tables publish live updates for the chat. LangGraph's own tables (memory store, checkpoints), if created in `public`, are locked to the backend. Tested on an in-memory Postgres with stand-ins for Supabase's auth, storage and realtime: Aya's migrations and this one run, the access rules hold, and the migration can run twice.
- **Options:** (a) store everything DEFAME produces (full record, all search results, prompts); (b) only what the archive and model improvement need; (c) only the final label and report.
- **Reason:** Eilaf asked for (b): an organisational archive plus the signals that show where the model goes wrong (both verdicts, the Reviewer's per-step issues, human overrides with reasons, endorsements), without the cost and privacy risk of storing raw pages and prompts. Not applied yet; see #22 for the project and how it gets applied.

## 22. Database decisions: project, visibility, checkpoints, roles, retention, archiving, applying, answers
- **Date:** 2026-11-24
- **Decision:**
  - **Project:** the live Supabase project is `fdwmnszimvfnzzgpwaba` (the one in `.env`, which has Aya's tables). Aya should confirm that Lovable uses it too.
  - **Visibility:** a fact-check is readable by its owner and by managers (Aya's existing rule), through `can_read_claim()`.
  - **Checkpoints:** stay in DEFAME's `InMemorySaver` for now; a paused claim is lost if the server restarts. LangGraph's tables in `public`, if any, are still locked to the backend.
  - **Roles:** renamed in the same migration: `staff` → `fact_checker`, `admin` → `manager` (enum values renamed, so stored roles and Aya's policies follow; the sign-up function is redefined). The app's role checks and generated types were updated to match. The migration and this code must go live together, or the deployed app would stop recognising managers.
  - **Retention:** finished checks are kept forever (the archive); failed or cancelled runs are deleted after 30 days with everything linked to them (`purge_failed_claims()`, run daily by pg_cron when enabled). The backend removes their Storage files.
  - **Archiving sources:** a Wayback Machine link per kept source, stored in `evidence_sources.archived_url` (written by DEFAME; not built yet).
  - **Applying:** reviewed in a pull request, then run in the SQL Editor of the live project.
  - **Answers at a pause:** browser → app server → FastAPI `/resume`, which checks the answer, writes `human_decisions` and resumes the graph; the browser never writes decisions.
- **Options:** project: fdwmn… / rrsrw… / khfbi… / ask Aya; visibility: owner + managers / whole team / team after finish; checkpoints: Postgres in its own schema / InMemorySaver; roles: rename now / keep / separate migration; retention: finished forever + failed 30 days / everything forever / everything N years; archiving: Wayback / copy in Storage / none yet; applying: PR + SQL Editor / Supabase CLI / Lovable; answers: through FastAPI / the browser writes the row.
- **Reason:** Eilaf chose each first option, except checkpoints (InMemorySaver for now: no DEFAME change needed before the pilot). Tested on an in-memory Postgres with Supabase stand-ins: 21 checks pass (access, roles, retention, constraints, realtime, re-running).

## 23. The screen shows the plan and the final verdict, not live progress; `fact_check_steps` keeps two rows
- **Date:** 2026-11-25
- **Decision:** The fact-check screen shows only two moments where the human can give feedback: the plan (plan pause) and, at the end, the verdict with its analysis. There is no live step-by-step view. `fact_check_steps` stays, but DEFAME writes only the `plan` row (when the plan is made) and the `analysis`/`verdict` rows at the end, each with the Reviewer's status and issues; no row is updated during the run. Realtime on `fact_check_steps` is no longer needed (`claims` and `human_decisions` keep it, so the screen still sees "waiting for you" and "done").
- **Options:** (a) keep the table and write only those rows; (b) drop it, put the plan in `human_decisions.context` and the analysis on `claims` or `reports`; (c) keep live per-step progress (decision #3).
- **Reason:** Eilaf chose (a) for now: no rebuild, and the plan and the Reviewer's per-step issues are still stored for model feedback, even in Auto mode when no pause shows the plan. Supersedes the live-progress part of decision #3 and the four live step cards of decision #7.

## 24. A `verdict` review mode: the human gives feedback on every final verdict (draft migration, not applied)
- **Date:** 2026-11-26
- **Decision:** New review mode `verdict` = the disagreement and NEI pauses **plus** a pause at the final verdict when the agent and the Reviewer **agree**. At that pause the human can confirm (`continue`), override with one of the six labels and a required reason (`label`), keep the label and leave a note for the record (`comment`, text required), or send feedback for one more agent round (`feedback`, reviewed again, once per claim). The other modes are unchanged (the verdict pause is only in `verdict` mode). Migration `20261126100000_verdict_mode.sql` allows the new mode, pause type and action; tested together with the earlier migrations on the in-memory Postgres (25 checks). DEFAME and the interface still need the matching node and screen.
- **Options:** what the human can do: confirm / override with a reason / comment / one more round, or any mix; which modes: only a new `verdict` mode, or also `supervised`. Verdict mode with or without the disagreement and NEI pauses.
- **Reason:** Eilaf chose all four actions, only in a new verdict mode. The disagreement and NEI pauses are included in it (my reading, to confirm) so that a disagreement in verdict mode still reaches a human instead of becoming NEI unseen.

## 25. Connecting the screens to DEFAME: claim flow, screens and the demo source
- **Date:** 2026-11-26
- **Decision:**
  - **Claim flow:** the app's server inserts the `claims` row as the signed-in user, uploads the image to Storage, then calls DEFAME's new endpoints (`/claims/start`, `/claims/{id}/resume`, `/claims/{id}/mode`) with the shared `api-key` header. DEFAME runs claims one at a time from a queue in one worker; a claim waiting at a pause keeps its own FactChecker, so it doesn't block the queue. DEFAME writes to Supabase with supabase-py and the service key, from one listener outside the graph's nodes.
  - **Screens:** cards in the chat: the claim, a plan card (feedback at the plan pause), a status line with elapsed time while DEFAME works (needs a small `phase` field on `claims`, updated once per phase), a verdict card (label, both verdicts, analysis, sources, Reviewer comments, feedback and endorsement), and the review panel for the full report.
  - **Demo source:** removed once the Supabase source works (with the development-only `/preview/check` route, which depends on it).
- **Options:** API: new endpoints with one worker / extend the 8-worker pool; claim row: app as the user / DEFAME with the service key; API auth: shared key / verify the Supabase token; concurrency: one at a time / a few in parallel; waiting claims: own FactChecker / queue waits with a timeout / queue waits; screens: chat cards / two pages; while running: status line + time / spinner; demo source: keep for development / remove.
- **Reason:** Eilaf chose the first option each time, except the demo source (removed: less code to maintain, at the cost of needing DEFAME running for every screen change). The DEFAME-side choices are also logged in DEFAME's DECISIONS.md when that work starts.

## 26. A `phase` column for the status line (draft migration, not applied)
- **Date:** 2026-11-26
- **Decision:** `claims.phase` (planning, gathering_evidence, analysing, reviewing, finalizing; null when not running), set by DEFAME once per phase change and cleared at the end (`20261126110000_claim_phase.sql`). Tested with the earlier migrations on the in-memory Postgres (28 checks).
- **Options:** a phase column / reuse `status` with more values / derive it from `fact_check_steps`.
- **Reason:** Follows decision #25's status line. A separate column keeps `status` simple (running / paused / done / failed) and needs one small write per phase.

## 27. The screens read the real archive; the demo is gone
- **Date:** 2026-11-26
- **Decision:** `SupabaseSource` (`src/lib/factcheck/supabase-source.ts`) replaces the demo source. It reads a run from `claims`, `fact_check_steps`, `human_decisions`, `evidence_sources`, `reports` and the user's own `report_feedback`, and reloads on Realtime changes to the claim, its pauses and its steps. Two server functions (`server.functions.ts`) are the only code that calls DEFAME: `startFactCheck` uploads nothing itself (the browser uploads the image to the user's own `claim-images` folder), creates the claim row as the user, then calls `/claims/start`; `answerPause` checks the user can read the claim, then calls `/claims/{id}/resume` with `decided_by`. The screen shows the claim, a plan card, a status line ("Gathering evidence… 2:14") while DEFAME works, the pause card for any of the four pauses (plan, disagreement, NEI, verdict; it offers exactly the answers DEFAME allows), and at the end a verdict card: final label, both verdicts, how it was settled, the verdict text and the analysis, the sources, the Reviewer's issues, the human's decision or comment, PDF/Markdown downloads and the endorsement (yes/no, 1–5, comment). The review panel anchors each step's Reviewer issues to the start of that step's text, because DEFAME's Reviewer doesn't quote text yet. The mode picker includes `verdict`; geolocation is off by default. Removed: the demo source, the live step cards and the `/preview/check` route. The archive's tables aren't in the generated Supabase types yet, so the source and server functions use an untyped client until the types are regenerated in Lovable.
- **Options:** as decided in #23–#26.
- **Reason:** Implements #23–#26. Not checked end to end yet: that needs a signed-in user, DEFAME running (`python scripts/run_claims_api.py`) and the two new migrations applied.

## 28. The status line is a phase checklist
- **Date:** 2026-11-26
- **Decision:** While a claim is queued, running or paused, the screen shows DEFAME's five phases as a checklist (plan the checks, gather evidence, analyse and judge, the Reviewer's double check, write the report): finished phases ticked, the current one with a spinner (or "waiting for you" at a pause), the rest dashed, with the elapsed time below. It reads only `claims.phase`, so it needs nothing new from DEFAME.
- **Options:** (a) one status line ("Gathering evidence… 2:14"); (b) a checklist of the phases.
- **Reason:** Eilaf asked for (b) during the first real run, modelled on Claude's task list: it shows what is done and what is left at a glance, which matters when a claim takes 6–10 minutes.
