# Meeno Truth Tracker

I need to build a website for Arabic fact-checking organization called The Meeno. It should only be for the management and the staff. So I need the website to have a dashboard, analytical dashboard, and also history record for all the research or claims that they have added and report they have generated. And also there's going to be an AI multi-fact-checking in the website as well. It allows the fact-checkers to upload the claim and then it gives them the feedback. So I want a design for this website, and make the colors orange and beige and white.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c93e10fe-b36e-456e-a5a3-3fc55c4ebced).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploy to Render

This app uses Supabase for authentication, claims, reports, and image storage. The
`render.yaml` Blueprint builds the TanStack Start app as a Node server; it does
not create or migrate a database. In Render, create a new Blueprint from this
repository and provide the requested environment variables from your Supabase
project and Lovable AI settings. `FIRECRAWL_API_KEY` is used by trend search.

### Connect the DEFAME fact-checking backend

The AI fact-check server function sends checks to the FastAPI service in
[`Eilaf649/fatabyyano-factchecker`](https://github.com/Eilaf649/fatabyyano-factchecker).
Deploy that service separately, then set `DEFAME_API_URL` to its HTTPS base URL
and `DEFAME_API_KEY` to the matching backend API key in the Render environment.
For local development, set the same variables in an ignored `.env` or
`.env.local` file.
These are server-only variables; do not prefix them with `VITE_` or commit their
values. The app submits jobs to `/verify` and polls `/results/{job_id}` from the
server, so the browser never receives the backend API key.

The authenticated Geospatial tools page sends image analysis to
`POST /geospatial/verify` and address lookups to `POST /geospatial/geocode`,
also from the server with the same API key. For a local backend listening on
port 3003, set `DEFAME_API_URL=http://localhost:3003` and the matching
`DEFAME_API_KEY` in `.env` or `.env.local`.

The DEFAME API keeps jobs in memory. A backend restart can therefore interrupt
an active check or make its results unavailable. Use a continuously running
backend instance for production fact-checking.

Do not commit `.env` files or paste service-role/API keys into source control.
The free Render web service may spin down after inactivity, so its first request
after a quiet period can take longer.

### Supabase setup for private drafts and staff roles

Fresh local Supabase databases can be initialized with `supabase db reset`; the
migrations in `supabase/migrations` create the app schema before applying the
private-drafts and staff-role changes.

For an existing Supabase project, run
[`supabase/migrations/20261113140000_private_drafts_and_staff_roles.sql`](./supabase/migrations/20261113140000_private_drafts_and_staff_roles.sql)
in the Supabase SQL Editor. It keeps existing claims published, makes new checks
private by default, limits management access to published claims (and their
reports and attachments), and assigns new self-registered accounts the
factchecker role. Existing administrator roles are preserved. Local Supabase
signup creates a session immediately; for a hosted Supabase project, disable
email confirmations in Authentication settings to enable the same flow. New
accounts are saved by Supabase Auth and receive their staff profile and role
through the database trigger.

If the project has no administrator yet, register the trusted admin account
first, then promote that account once in the SQL Editor (replace the email with
the account's email):

```sql
update public.user_roles
set role = 'admin'
where user_id = (select id from auth.users where email = 'admin@example.com')
  and role = 'staff';
```

After an administrator exists, role promotions can be managed from Team
Activity in the app.
