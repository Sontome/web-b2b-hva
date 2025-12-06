-- Add columns to monitored_flights table for passenger info and booking keys
ALTER TABLE monitored_flights
ADD COLUMN IF NOT EXISTS passengers jsonb,
ADD COLUMN IF NOT EXISTS booking_key_departure text,
ADD COLUMN IF NOT EXISTS booking_key_return text;