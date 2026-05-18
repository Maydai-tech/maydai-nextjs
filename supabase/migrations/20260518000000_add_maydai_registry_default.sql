-- Migration UP: default explicite pour maydai_as_registry sur companies
ALTER TABLE public.companies ALTER COLUMN maydai_as_registry SET DEFAULT false;
