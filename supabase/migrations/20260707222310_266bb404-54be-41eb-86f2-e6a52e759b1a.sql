-- Storage RLS for lead-files bucket. Files are stored under "{lead_id}/{filename}".
CREATE POLICY "Read own lead files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lead-files' AND (
    public.has_role(auth.uid(),'gerente')
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id::text = split_part(name, '/', 1) AND l.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Insert own lead files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lead-files' AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = split_part(name, '/', 1) AND l.owner_id = auth.uid()
  )
);

CREATE POLICY "Delete own lead files" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lead-files' AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = split_part(name, '/', 1) AND l.owner_id = auth.uid()
  )
);