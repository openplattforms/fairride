import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DriverLocation {
  driver_id: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
}

/**
 * Find available drivers for a ride request.
 * Strategy:
 * 1. First, find drivers within 5km radius
 * 2. If none, find drivers within 15km radius
 * 3. If none, return all online drivers
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pickup_lat, pickup_lng, exclude_driver_ids = [] } = await req.json();

    if (!pickup_lat || !pickup_lng) {
      return new Response(
        JSON.stringify({ error: 'pickup_lat and pickup_lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all online drivers with their locations
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id, user_id')
      .eq('is_online', true);

    if (driversError) {
      throw driversError;
    }

    if (!drivers || drivers.length === 0) {
      return new Response(
        JSON.stringify({ drivers: [], message: 'No online drivers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get locations for all online drivers
    const driverIds = drivers.map(d => d.id);
    const { data: locations, error: locError } = await supabase
      .from('driver_locations')
      .select('driver_id, latitude, longitude')
      .in('driver_id', driverIds);

    if (locError) {
      throw locError;
    }

    // Calculate distance for each driver
    const driversWithDistance: DriverLocation[] = (locations || [])
      .filter(loc => !exclude_driver_ids.includes(loc.driver_id))
      .map(loc => ({
        driver_id: loc.driver_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        distance_km: calculateDistance(
          pickup_lat,
          pickup_lng,
          loc.latitude,
          loc.longitude
        ),
      }))
      .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

    // Strategy: Find nearest drivers first
    const RADIUS_1 = 5; // km
    const RADIUS_2 = 15; // km

    let selectedDrivers = driversWithDistance.filter(d => (d.distance_km || 999) <= RADIUS_1);

    if (selectedDrivers.length === 0) {
      selectedDrivers = driversWithDistance.filter(d => (d.distance_km || 999) <= RADIUS_2);
    }

    if (selectedDrivers.length === 0) {
      // Return all available drivers if no one is nearby
      selectedDrivers = driversWithDistance;
    }

    return new Response(
      JSON.stringify({
        drivers: selectedDrivers.slice(0, 5), // Return max 5 nearest drivers
        total_online: drivers.length,
        pickup: { lat: pickup_lat, lng: pickup_lng },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error finding drivers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
