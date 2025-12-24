-- Add new columns for agent registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS business_number TEXT;