CREATE TABLE public.investigation_chats (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), title text NOT NULL DEFAULT 'New investigation', messages jsonb NOT NULL DEFAULT '[]'::jsonb, enabled_tools text[] NOT NULL DEFAULT ARRAY['manipulation','geolocation']::text[], created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigation_chats TO authenticated;
GRANT ALL ON public.investigation_chats TO service_role;
ALTER TABLE public.investigation_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investigation chats owner only" ON public.investigation_chats FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX investigation_chats_owner_updated ON public.investigation_chats(user_id, updated_at DESC);