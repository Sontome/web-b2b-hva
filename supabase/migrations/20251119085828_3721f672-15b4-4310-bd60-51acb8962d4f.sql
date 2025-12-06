-- Add pnr column to monitored_flights table
ALTER TABLE public.monitored_flights 
ADD COLUMN pnr text;

-- Add comment explaining the column
COMMENT ON COLUMN public.monitored_flights.pnr IS 'PNR code for this monitored flight. Auto-generated 6 characters for manual entries, or original PNR when imported from existing PNR.';