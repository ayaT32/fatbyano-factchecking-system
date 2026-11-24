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
