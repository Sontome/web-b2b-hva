-- Rename existing columns
ALTER TABLE public.profiles RENAME COLUMN price_ow TO price_ow_vj;
ALTER TABLE public.profiles RENAME COLUMN price_rt TO price_rt_vj;

-- Add new columns for VNA
ALTER TABLE public.profiles ADD COLUMN price_ow_vna numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN price_rt_vna numeric DEFAULT 0;