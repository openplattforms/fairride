-- Create messages table for driver-customer chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "Users can view messages for their rides" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM rides 
    WHERE rides.id = messages.ride_id 
    AND (
      rides.customer_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM drivers 
        WHERE drivers.id = rides.driver_id 
        AND drivers.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can send messages for their rides" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM rides 
    WHERE rides.id = messages.ride_id 
    AND (
      rides.customer_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM drivers 
        WHERE drivers.id = rides.driver_id 
        AND drivers.user_id = auth.uid()
      )
    )
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;