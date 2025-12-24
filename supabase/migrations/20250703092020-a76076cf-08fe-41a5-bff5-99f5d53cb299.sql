
-- Update the price_markup column comment to reflect it's now a fixed amount instead of percentage
COMMENT ON COLUMN public.profiles.price_markup IS 'Fixed amount to add to flight prices (in KRW)';

-- Update existing percentage values to fixed amounts (assuming current values are percentages)
-- This converts percentage to approximate fixed amounts based on average flight price of 500,000 KRW
UPDATE public.profiles 
SET price_markup = CASE 
  WHEN price_markup <= 100 THEN price_markup * 5000  -- Convert percentage to fixed amount
  ELSE price_markup  -- Keep if already looks like fixed amount
END
WHERE price_markup IS NOT NULL AND price_markup > 0;
