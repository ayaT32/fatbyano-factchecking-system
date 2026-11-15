ALTER TABLE public.claims ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.claims ALTER COLUMN is_published SET DEFAULT false;