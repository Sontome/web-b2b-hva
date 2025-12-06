-- Add permission columns to profiles table
alter table public.profiles add column if not exists perm_check_vj boolean default false;
alter table public.profiles add column if not exists perm_check_vna boolean default false;
alter table public.profiles add column if not exists perm_send_ticket boolean default false;
alter table public.profiles add column if not exists perm_get_ticket_image boolean default false;
alter table public.profiles add column if not exists perm_get_pending_ticket boolean default false;
alter table public.profiles add column if not exists perm_check_discount boolean default false;
alter table public.profiles add column if not exists perm_hold_ticket boolean default false;
alter table public.profiles add column if not exists hold_ticket_quantity integer default 0;