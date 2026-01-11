-- Create role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'driver', 'admin');

-- Create user_roles table (security best practice - roles separate from profiles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    loyalty_points INTEGER DEFAULT 0,
    first_ride_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create drivers table
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    vehicle_model TEXT,
    vehicle_plate TEXT,
    is_online BOOLEAN DEFAULT false,
    rating NUMERIC(2,1) DEFAULT 5.0,
    total_rides INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create driver_locations table for real-time tracking
CREATE TABLE public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    speed DOUBLE PRECISION DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rides table
CREATE TABLE public.rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    pickup_address TEXT,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    dropoff_address TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled')),
    price NUMERIC(10,2),
    distance_km NUMERIC(10,2),
    duration_minutes INTEGER,
    loyalty_points_earned INTEGER DEFAULT 0,
    first_ride_discount BOOLEAN DEFAULT false,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create SEPA transactions table for payment tracking
CREATE TABLE public.sepa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    iban_last4 TEXT,
    cardholder_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sepa_transactions ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for drivers
CREATE POLICY "Anyone can view online drivers"
ON public.drivers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Drivers can insert their own record"
ON public.drivers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own record"
ON public.drivers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for driver_locations
CREATE POLICY "Anyone can view driver locations"
ON public.driver_locations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Drivers can upsert their location"
ON public.driver_locations FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid()));

CREATE POLICY "Drivers can update their location"
ON public.driver_locations FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid()));

-- RLS Policies for rides
CREATE POLICY "Customers can view their own rides"
ON public.rides FOR SELECT
TO authenticated
USING (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid()));

CREATE POLICY "Customers can create rides"
ON public.rides FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Drivers and customers can update rides"
ON public.rides FOR UPDATE
TO authenticated
USING (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid()));

-- RLS Policies for sepa_transactions
CREATE POLICY "Users can view their own transactions"
ON public.sepa_transactions FOR SELECT
TO authenticated
USING (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid()));

CREATE POLICY "System can create transactions"
ON public.sepa_transactions FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Function to award loyalty points
CREATE OR REPLACE FUNCTION public.award_loyalty_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET loyalty_points = loyalty_points + p_points,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;