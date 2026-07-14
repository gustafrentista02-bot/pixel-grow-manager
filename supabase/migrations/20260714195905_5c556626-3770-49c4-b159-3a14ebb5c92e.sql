
CREATE POLICY "Authenticated read team profile names"
ON public.profiles FOR SELECT TO authenticated
USING (true);
