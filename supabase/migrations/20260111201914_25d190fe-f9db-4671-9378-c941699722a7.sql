-- Add SEPA payment details to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cardholder_name TEXT;

-- Add cancellation fields to rides
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC DEFAULT 0;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS distance_at_cancel_km NUMERIC DEFAULT 0;

-- Add promo discount tracking
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS promo_discount NUMERIC DEFAULT 0;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS promo_type TEXT;