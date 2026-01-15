import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { Location } from '@/types/ride';

interface MapViewProps {
  center?: Location;
  pickup?: Location | null;
  dropoff?: Location | null;
  driverLocation?: Location | null;
  onMapClick?: (location: Location) => void;
  showRoute?: boolean;
  className?: string;
  pickupDraggable?: boolean;
  dropoffDraggable?: boolean;
  onPickupChange?: (location: Location) => void;
  onDropoffChange?: (location: Location) => void;
}

const createCustomIcon = (color: string, pulse: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="${pulse ? 'pulse-marker' : ''}" style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createCarIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="pulse-marker" style="
        width: 40px;
        height: 40px;
        background: hsl(142 76% 45%);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export default function MapView({
  center = { lat: 52.52, lng: 13.405 },
  pickup,
  dropoff,
  driverLocation,
  onMapClick,
  showRoute = false,
  className = '',
  pickupDraggable = false,
  dropoffDraggable = false,
  onPickupChange,
  onDropoffChange,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeControlRef = useRef<L.Routing.Control | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([center.lat, center.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lng], mapInstanceRef.current.getZoom());
    }
  }, [center]);

  // Update pickup marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (pickupMarkerRef.current) {
      mapInstanceRef.current.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], {
        icon: createCustomIcon('hsl(142, 76%, 45%)'),
        draggable: pickupDraggable,
      }).addTo(mapInstanceRef.current);

      if (pickupDraggable && onPickupChange) {
        pickupMarkerRef.current.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          onPickupChange({ lat: latlng.lat, lng: latlng.lng });
        });
      }
    }
  }, [pickup, pickupDraggable, onPickupChange]);

  // Update dropoff marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (dropoffMarkerRef.current) {
      mapInstanceRef.current.removeLayer(dropoffMarkerRef.current);
      dropoffMarkerRef.current = null;
    }

    if (dropoff) {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], {
        icon: createCustomIcon('hsl(0, 84%, 60%)'),
        draggable: dropoffDraggable,
      }).addTo(mapInstanceRef.current);

      if (dropoffDraggable && onDropoffChange) {
        dropoffMarkerRef.current.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          onDropoffChange({ lat: latlng.lat, lng: latlng.lng });
        });
      }
    }
  }, [dropoff, dropoffDraggable, onDropoffChange]);

  // Update driver marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!driverLocation && driverMarkerRef.current) {
      mapInstanceRef.current.removeLayer(driverMarkerRef.current);
      driverMarkerRef.current = null;
      return;
    }

    if (driverLocation) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
      } else {
        driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], {
          icon: createCarIcon(),
        }).addTo(mapInstanceRef.current);
      }
    }
  }, [driverLocation]);

  // Update route
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (routeControlRef.current) {
      mapInstanceRef.current.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }

    if (showRoute && pickup && dropoff) {
      routeControlRef.current = L.Routing.control({
        waypoints: [L.latLng(pickup.lat, pickup.lng), L.latLng(dropoff.lat, dropoff.lng)],
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: 'hsl(142, 76%, 45%)', weight: 5, opacity: 0.8 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
      } as any).addTo(mapInstanceRef.current);

      routeControlRef.current.on('routesfound', (e: any) => {
        const route = e.routes[0];
        setRouteInfo({
          distance: route.summary.totalDistance / 1000,
          duration: route.summary.totalTime / 60,
        });
      });
    }
  }, [showRoute, pickup, dropoff]);

  // Fit bounds when both markers exist
  useEffect(() => {
    if (mapInstanceRef.current && pickup && dropoff) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [pickup, dropoff]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
      {routeInfo && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            {routeInfo.distance.toFixed(1)} km • {Math.round(routeInfo.duration)} min
          </p>
        </div>
      )}
    </div>
  );
}
