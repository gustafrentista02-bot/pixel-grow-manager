
-- =========================================================
-- 1) Helper: compute_next_send_at in America/Sao_Paulo
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_next_send_at(p_delay_dias integer, p_horario text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_h int;
  v_m int;
  v_target_date date;
  v_target timestamptz;
  v_now timestamptz := now();
BEGIN
  IF p_delay_dias IS NULL OR p_delay_dias < 0 THEN
    RAISE EXCEPTION 'delay_dias inválido';
  END IF;
  IF p_horario IS NULL OR p_horario !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'horario inválido: %', p_horario;
  END IF;
  v_h := split_part(p_horario, ':', 1)::int;
  v_m := split_part(p_horario, ':', 2)::int;
  v_target_date := ((v_now AT TIME ZONE 'America/Sao_Paulo')::date) + p_delay_dias;
  v_target := ((v_target_date + make_time(v_h, v_m, 0))::timestamp) AT TIME ZONE 'America/Sao_Paulo';
  IF p_delay_dias = 0 AND v_target <= v_now THEN
    v_target := v_now + interval '1 minute';
  END IF;
  RETURN v_target;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_next_send_at(integer, text) TO authenticated, service_role;

-- =========================================================
-- 2) Enrollment status constraints
-- =========================================================
-- Ensure only known statuses; leave existing rows alone (only 'ativa' present).
ALTER TABLE public.cadence_enrollments
  DROP CONSTRAINT IF EXISTS cadence_enrollments_status_check;
ALTER TABLE public.cadence_enrollments
  ADD CONSTRAINT cadence_enrollments_status_check
  CHECK (status IN ('ativa','pausada','pausada_resposta','concluida','cancelada','cancelada_conflito','erro'));

-- Only 'ativa' may have next_send_at set.
ALTER TABLE public.cadence_enrollments
  DROP CONSTRAINT IF EXISTS cadence_enrollments_next_send_status_check;
ALTER TABLE public.cadence_enrollments
  ADD CONSTRAINT cadence_enrollments_next_send_status_check
  CHECK (
    (status = 'ativa') OR (next_send_at IS NULL)
  );

-- Unique active enrollment per lead across cadences.
DROP INDEX IF EXISTS public.uniq_active_enrollment_per_lead;
CREATE UNIQUE INDEX uniq_active_enrollment_per_lead
  ON public.cadence_enrollments (lead_id)
  WHERE status = 'ativa';

-- =========================================================
-- 3) RPC: replace_cadence_steps (transactional)
-- =========================================================
CREATE OR REPLACE FUNCTION public.replace_cadence_steps(p_cadence_id uuid, p_steps jsonb)
RETURNS SETOF public.cadence_steps
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_len int;
  v_i int;
  v_step jsonb;
  v_delay int;
  v_horario text;
  v_msg text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id INTO v_owner FROM public.cadences WHERE id = p_cadence_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'cadence not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner <> v_uid THEN
    RAISE EXCEPTION 'not owner of cadence' USING ERRCODE = '42501';
  END IF;

  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' THEN
    RAISE EXCEPTION 'p_steps must be a jsonb array';
  END IF;

  v_len := jsonb_array_length(p_steps);
  IF v_len < 1 THEN
    RAISE EXCEPTION 'cadence must have at least one step';
  END IF;

  -- Validate all steps first (before any DELETE) so we abort cleanly.
  FOR v_i IN 0..(v_len - 1) LOOP
    v_step := p_steps -> v_i;
    IF v_step IS NULL OR jsonb_typeof(v_step) <> 'object' THEN
      RAISE EXCEPTION 'step % must be an object', v_i;
    END IF;
    v_delay := COALESCE((v_step ->> 'delay_dias')::int, -1);
    v_horario := v_step ->> 'horario';
    v_msg := v_step ->> 'mensagem';
    IF v_delay IS NULL OR v_delay < 0 THEN
      RAISE EXCEPTION 'step %: delay_dias inválido', v_i;
    END IF;
    IF v_horario IS NULL OR v_horario !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
      RAISE EXCEPTION 'step %: horario inválido (esperado HH:mm)', v_i;
    END IF;
    IF v_msg IS NULL OR length(btrim(v_msg)) = 0 THEN
      RAISE EXCEPTION 'step %: mensagem vazia', v_i;
    END IF;
    IF length(v_msg) > 4000 THEN
      RAISE EXCEPTION 'step %: mensagem excede 4000 caracteres', v_i;
    END IF;
  END LOOP;

  -- Replace atomically (same transaction).
  DELETE FROM public.cadence_steps WHERE cadence_id = p_cadence_id;

  INSERT INTO public.cadence_steps (cadence_id, ordem, delay_dias, horario, mensagem)
  SELECT
    p_cadence_id,
    (idx - 1),
    (elem ->> 'delay_dias')::int,
    elem ->> 'horario',
    elem ->> 'mensagem'
  FROM jsonb_array_elements(p_steps) WITH ORDINALITY AS t(elem, idx);

  UPDATE public.cadences SET updated_at = now() WHERE id = p_cadence_id;

  RETURN QUERY
    SELECT * FROM public.cadence_steps
    WHERE cadence_id = p_cadence_id
    ORDER BY ordem ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_cadence_steps(uuid, jsonb) TO authenticated;

-- =========================================================
-- 4) RPC: enroll_leads_in_cadence (transactional, per-lead result)
-- =========================================================
CREATE OR REPLACE FUNCTION public.enroll_leads_in_cadence(p_cadence_id uuid, p_lead_ids uuid[])
RETURNS TABLE(
  lead_id uuid,
  status text,
  message text,
  enrollment_id uuid,
  next_send_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
  v_cad_org uuid;
  v_cad_ativa boolean;
  v_first_delay int;
  v_first_horario text;
  v_next timestamptz;
  v_lead record;
  v_active_cad uuid;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO v_org FROM public.profiles WHERE id = v_uid;

  SELECT c.organization_id, c.ativa
    INTO v_cad_org, v_cad_ativa
  FROM public.cadences c
  WHERE c.id = p_cadence_id;

  IF v_cad_org IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'cadence not found' USING ERRCODE = 'P0002';
  END IF;

  -- Organization isolation
  IF v_org IS DISTINCT FROM v_cad_org THEN
    RAISE EXCEPTION 'cadence does not belong to your organization' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(v_cad_ativa, false) THEN
    RAISE EXCEPTION 'cadence is paused';
  END IF;

  SELECT delay_dias, horario
    INTO v_first_delay, v_first_horario
  FROM public.cadence_steps
  WHERE cadence_id = p_cadence_id
  ORDER BY ordem ASC
  LIMIT 1;

  IF v_first_delay IS NULL THEN
    RAISE EXCEPTION 'cadence has no steps';
  END IF;

  v_next := public.compute_next_send_at(v_first_delay, v_first_horario);

  IF p_lead_ids IS NULL OR array_length(p_lead_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR v_lead IN
    SELECT l.id, l.telefone, l.whatsapp, l.organization_id
    FROM unnest(p_lead_ids) AS x(id)
    LEFT JOIN public.leads l ON l.id = x.id
  LOOP
    IF v_lead.id IS NULL THEN
      lead_id := NULL;
      status := 'erro';
      message := 'lead não encontrado';
      enrollment_id := NULL;
      next_send_at := NULL;
      RETURN NEXT;
      CONTINUE;
    END IF;

    lead_id := v_lead.id;
    enrollment_id := NULL;
    next_send_at := NULL;

    IF v_lead.organization_id IS DISTINCT FROM v_org THEN
      status := 'erro';
      message := 'lead de outra organização';
      RETURN NEXT;
      CONTINUE;
    END IF;

    IF COALESCE(btrim(v_lead.telefone), '') = '' AND COALESCE(btrim(v_lead.whatsapp), '') = '' THEN
      status := 'sem_telefone';
      message := 'lead sem telefone/WhatsApp';
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT e.cadence_id INTO v_active_cad
    FROM public.cadence_enrollments e
    WHERE e.lead_id = v_lead.id AND e.status = 'ativa'
    LIMIT 1;

    IF v_active_cad IS NOT NULL THEN
      IF v_active_cad = p_cadence_id THEN
        status := 'ja_inscrito';
        message := 'lead já está nesta cadência';
      ELSE
        status := 'outra_cadencia';
        message := 'lead já em outra cadência ativa';
      END IF;
      RETURN NEXT;
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.cadence_enrollments
        (owner_id, cadence_id, lead_id, current_step, next_send_at, status, organization_id)
      VALUES
        (v_uid, p_cadence_id, v_lead.id, 0, v_next, 'ativa', v_org)
      RETURNING id INTO v_new_id;

      status := 'adicionado';
      message := 'inscrito';
      enrollment_id := v_new_id;
      next_send_at := v_next;
    EXCEPTION WHEN unique_violation THEN
      status := 'outra_cadencia';
      message := 'lead já possui inscrição ativa';
    WHEN OTHERS THEN
      status := 'erro';
      message := SQLERRM;
    END;

    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_leads_in_cadence(uuid, uuid[]) TO authenticated;
