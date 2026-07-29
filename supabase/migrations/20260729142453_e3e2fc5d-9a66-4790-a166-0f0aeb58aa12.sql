
-- Resolve conflitos existentes: mantém a inscrição ativa mais antiga por lead,
-- marca as demais como 'cancelada_conflito' preservando histórico.
WITH ranked AS (
  SELECT id, lead_id,
         row_number() OVER (PARTITION BY lead_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.cadence_enrollments
  WHERE status = 'ativa'
)
UPDATE public.cadence_enrollments e
SET status = 'cancelada_conflito', next_send_at = NULL
FROM ranked r
WHERE e.id = r.id AND r.rn > 1;

-- Índice único parcial: apenas uma inscrição ATIVA por lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_cadence_enrollments_one_active_per_lead
  ON public.cadence_enrollments (lead_id)
  WHERE status = 'ativa';
