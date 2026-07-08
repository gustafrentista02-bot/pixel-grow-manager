-- Add ownership-scoped UPDATE policies for lead files (metadata + storage objects)
CREATE POLICY "Update lead files"
ON public.lead_files
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_files.lead_id AND l.owner_id = auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_files.lead_id AND l.owner_id = auth.uid())
);

CREATE POLICY "Update own lead files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lead-files'
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = split_part(objects.name, '/', 1) AND l.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'lead-files'
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id::text = split_part(objects.name, '/', 1) AND l.owner_id = auth.uid()
  )
);