DROP POLICY IF EXISTS "read profiles" ON public.profiles;
CREATE POLICY "read own profile or admin" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));