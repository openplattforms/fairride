export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Driver {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  vehicle_plate: string;
  rating: number;
  is_online: boolean;
  current_location: Location | null;
  created_at: string;
}

export interface Ride {
  id: string;
  customer_id: string;
  driver_id: string | null;
  pickup_location: Location;
  dropoff_location: Location;
  status: 'pending' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  distance: number;
  duration: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'driver';
  loyalty_points: number;
  total_rides: number;
  first_ride_used: boolean;
  created_at: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  discount_percent: number;
}
