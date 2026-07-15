
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS onboarding_concluido BOOLEAN NOT NULL DEFAULT false;
UPDATE public.organizations SET onboarding_concluido = true;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primeiro_login_concluido BOOLEAN NOT NULL DEFAULT false;
UPDATE public.profiles SET primeiro_login_concluido = true;
