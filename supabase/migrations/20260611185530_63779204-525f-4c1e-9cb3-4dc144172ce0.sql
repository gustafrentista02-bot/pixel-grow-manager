-- Aggregated team metrics for managers (gerente). Returns per-seller rollups only.
CREATE OR REPLACE FUNCTION public.get_team_metrics()
RETURNS TABLE (
  user_id uuid,
  nome text,
  total_leads bigint,
  ganhos bigint,
  propostas bigint,
  perdidos bigint,
  reunioes bigint,
  faturamento_ganho numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.nome,
    COUNT(l.id),
    COUNT(l.id) FILTER (WHERE l.stage = 'ganho'),
    COUNT(l.id) FILTER (WHERE l.stage = 'proposta'),
    COUNT(l.id) FILTER (WHERE l.stage = 'perdido'),
    COUNT(l.id) FILTER (WHERE l.stage = 'reuniao'),
    COALESCE(SUM(l.faturamento_mensal) FILTER (WHERE l.stage = 'ganho'), 0)
  FROM public.profiles p
  LEFT JOIN public.leads l ON l.owner_id = p.id
  WHERE public.has_role(auth.uid(), 'gerente')
  GROUP BY p.id, p.nome
  ORDER BY COUNT(l.id) FILTER (WHERE l.stage = 'ganho') DESC, COUNT(l.id) DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_team_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_metrics() TO authenticated;