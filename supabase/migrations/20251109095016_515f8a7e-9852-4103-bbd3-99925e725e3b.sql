-- Create table for monitored flights
CREATE TABLE public.monitored_flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  airline TEXT NOT NULL, -- 'VJ' or 'VNA'
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  current_price NUMERIC,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  check_interval_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monitored_flights ENABLE ROW LEVEL SECURITY;

-- Users can view their own monitored flights
CREATE POLICY "Users can view their own monitored flights"
ON public.monitored_flights
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own monitored flights
CREATE POLICY "Users can insert their own monitored flights"
ON public.monitored_flights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own monitored flights
CREATE POLICY "Users can update their own monitored flights"
ON public.monitored_flights
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own monitored flights
CREATE POLICY "Users can delete their own monitored flights"
ON public.monitored_flights
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all monitored flights
CREATE POLICY "Admins can view all monitored flights"
ON public.monitored_flights
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all monitored flights
CREATE POLICY "Admins can manage all monitored flights"
ON public.monitored_flights
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_monitored_flights_updated_at
BEFORE UPDATE ON public.monitored_flights
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();