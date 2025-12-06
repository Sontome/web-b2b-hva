-- Create table for held tickets/PNRs
CREATE TABLE public.held_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pnr text NOT NULL,
  flight_details jsonb,
  hold_date timestamp with time zone NOT NULL DEFAULT now(),
  expire_date timestamp with time zone,
  status text NOT NULL DEFAULT 'holding',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.held_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all held tickets"
ON public.held_tickets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all held tickets"
ON public.held_tickets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own held tickets"
ON public.held_tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own held tickets"
ON public.held_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own held tickets"
ON public.held_tickets
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_held_tickets_user_id ON public.held_tickets(user_id);
CREATE INDEX idx_held_tickets_status ON public.held_tickets(status);
CREATE INDEX idx_held_tickets_pnr ON public.held_tickets(pnr);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_held_tickets_updated_at
BEFORE UPDATE ON public.held_tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();