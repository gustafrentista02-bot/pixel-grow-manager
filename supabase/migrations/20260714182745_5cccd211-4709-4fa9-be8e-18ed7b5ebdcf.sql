ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'media';

CREATE INDEX IF NOT EXISTS tasks_categoria_idx ON public.tasks(categoria);
CREATE INDEX IF NOT EXISTS tasks_prioridade_idx ON public.tasks(prioridade);