-- Add new fields to monitored_flights table for VJ flights
ALTER TABLE public.monitored_flights
ADD COLUMN departure_time TEXT,
ADD COLUMN is_round_trip BOOLEAN DEFAULT false,
ADD COLUMN return_date TEXT,
ADD COLUMN return_time TEXT;

-- Add segments field for VNA multi-city flights (stores array of segments)
ALTER TABLE public.monitored_flights
ADD COLUMN segments JSONB;

-- Add ticket class field for VNA flights
ALTER TABLE public.monitored_flights
ADD COLUMN ticket_class TEXT DEFAULT 'economy';

-- Add index for efficient queries on active flights that need checking
CREATE INDEX idx_monitored_flights_active_check 
ON public.monitored_flights(is_active, last_checked_at)
WHERE is_active = true;