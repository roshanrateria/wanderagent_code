import { useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Place } from "@/lib/types";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  places: Place[];
  userLocation: { lat: number; lng: number };
  totalDistance: number;
  totalDuration: number;
  routeGeometry?: Array<{ lat: number; lng: number }>;
}

export default function MapView({ places, userLocation, totalDistance, totalDuration, routeGeometry }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    initializeMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapInstance.current) {
      updateMapMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, routeGeometry, userLocation]);

  const initializeMap = () => {
    if (!mapRef.current) return;

    try {
      mapInstance.current = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], 13);

      // Online tiles (will silently fail offline leaving a blank background)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      updateMapMarkers();
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const updateMapMarkers = () => {
    if (!mapInstance.current) return;

    // Clear existing markers and polylines (markers live in markerPane, polylines are instances of L.Polyline)
    mapInstance.current.eachLayer((layer: any) => {
      const anyLayer = layer as any;
      if ((anyLayer.options && anyLayer.options.pane === 'markerPane') || (layer instanceof (L as any).Polyline)) {
        mapInstance.current!.removeLayer(layer);
      }
    });

    const bounds = L.latLngBounds([]);

    // Add user location marker
    const userIcon = L.divIcon({
      html: '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="font-size: 10px;"></i></div>',
      iconSize: [20, 20],
      className: 'custom-div-icon'
    });

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapInstance.current)
      .bindPopup('Your Location');

    bounds.extend([userLocation.lat, userLocation.lng]);

    // Add place markers
    places.forEach((place, index) => {
      const placeIcon = L.divIcon({
        html: `<div style="background: #f59e0b; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${index + 1}</div>`,
        iconSize: [24, 24],
        className: 'custom-div-icon'
      });

      L.marker([place.latitude, place.longitude], { icon: placeIcon })
        .addTo(mapInstance.current!)
        .bindPopup(`
          <div>
            <strong>${place.name}</strong><br>
            <small>${place.category || ''}</small><br>
            ${place.rating ? `⭐ ${Number(place.rating).toFixed(1)}` : ''}<br>
            <em>${place.scheduledTime || ''}</em>
          </div>
        `);

      bounds.extend([place.latitude, place.longitude]);
    });

    if (bounds.isValid()) {
      mapInstance.current.fitBounds(bounds, { padding: [20, 20] });
    }

    // Draw route polyline from geometry if available
    if (routeGeometry && routeGeometry.length > 1) {
      let segmentStart = 0;
      const allCoords = [userLocation, ...places.map(p => ({ lat: p.latitude, lng: p.longitude }))];
      for (let i = 0; i < allCoords.length - 1; i++) {
        const nextWaypoint = allCoords[i + 1];
        let segmentEnd = segmentStart;
        let minDist = Infinity;
        for (let j = segmentStart; j < routeGeometry.length; j++) {
          const dist = Math.hypot(routeGeometry[j].lat - nextWaypoint.lat, routeGeometry[j].lng - nextWaypoint.lng);
          if (dist < minDist) { minDist = dist; segmentEnd = j; }
        }
        const segment = routeGeometry.slice(segmentStart, segmentEnd + 1).map(pt => [pt.lat, pt.lng]) as [number, number][];
        const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#a21caf', '#eab308', '#6366f1'];
        const color = colors[i % colors.length];
        L.polyline(segment, { color, weight: 4, opacity: 0.8 }).addTo(mapInstance.current);
        segmentStart = segmentEnd;
      }
    } else if (places.length > 1) {
      const routeCoordinates: [number, number][] = [
        [userLocation.lat, userLocation.lng],
        ...places.map(place => [place.latitude, place.longitude] as [number, number])
      ];
      L.polyline(routeCoordinates, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(mapInstance.current);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) return `${hours}h ${remainingMinutes}m`;
    return `${remainingMinutes}m`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div ref={mapRef} className="h-96 w-full bg-gray-100"></div>
        {/* Map Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          <Button size="sm" variant="outline" className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg" onClick={() => mapInstance.current?.zoomIn()}>
            <i className="fas fa-plus text-gray-600"></i>
          </Button>
          <Button size="sm" variant="outline" className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg" onClick={() => mapInstance.current?.zoomOut()}>
            <i className="fas fa-minus text-gray-600"></i>
          </Button>
          <Button size="sm" variant="outline" className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg" onClick={() => mapInstance.current?.setView([userLocation.lat, userLocation.lng], 13)}>
            <i className="fas fa-crosshairs text-gray-600"></i>
          </Button>
        </div>
        {/* Route Info Overlay */}
        <div className="absolute bottom-4 left-4 bg-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{formatDuration(totalDuration)}</div>
              <div className="text-xs text-gray-500">Total Time</div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{totalDistance.toFixed(1)} km</div>
              <div className="text-xs text-gray-500">Distance</div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{places.length}</div>
              <div className="text-xs text-gray-500">Places</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
