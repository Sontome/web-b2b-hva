-- Add column for reprice PNR in monitored_flights
ALTER TABLE public.monitored_flights
ADD COLUMN IF NOT EXISTS reprice_pnr text;

-- Add comment for documentation  
COMMENT ON COLUMN public.monitored_flights.reprice_pnr IS 'PNR used for reprice checking for VNA flights';