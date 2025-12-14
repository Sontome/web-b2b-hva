-- Create table to log search actions
CREATE TABLE public.search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  search_data JSONB
);

-- Enable RLS
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own search logs
CREATE POLICY "Users can insert their own search logs"
ON public.search_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own search logs
CREATE POLICY "Users can view their own search logs"
ON public.search_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all search logs
CREATE POLICY "Admins can view all search logs"
ON public.search_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_search_logs_user_id ON public.search_logs(user_id);
CREATE INDEX idx_search_logs_searched_at ON public.search_logs(searched_at);