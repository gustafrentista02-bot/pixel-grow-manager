DELETE FROM auth.users WHERE email <> 'pixel.mkt.ofc@gmail.com';

DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'pixel.mkt.ofc@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'gerente'::app_role FROM public.profiles WHERE email = 'pixel.mkt.ofc@gmail.com';