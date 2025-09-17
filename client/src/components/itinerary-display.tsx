import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MapView from "./map-view";
import PlaceCard from "./place-card";
import LiveNavigation from "./live-navigation";
import type { Itinerary as ItineraryType, Place } from "@/lib/types";
import { useEffect, useRef } from "react";
import { Capacitor } from '@capacitor/core';
import { isLocalMode } from '@/lib/localApi';
import { routeApiCall } from '@/lib/offline';

interface ItineraryDisplayProps {
  itinerary: ItineraryType;
  userLocation: { lat: number; lng: number };
  onUpdateItinerary: (places: Place[]) => void;
  sessionId?: string;
}

export default function ItineraryDisplay({ 
  itinerary, 
  userLocation, 
  onUpdateItinerary,
  sessionId,
}: ItineraryDisplayProps) {
  const [places, setPlaces] = useState<Place[]>(itinerary.places);
  const [showLiveNav, setShowLiveNav] = useState(false);
  const [routeGeometryState, setRouteGeometryState] = useState(itinerary.routeGeometry);
  const [totalDistanceState, setTotalDistanceState] = useState(itinerary.totalDistance);
  const [totalDurationState, setTotalDurationState] = useState(itinerary.totalDuration);
  const [osrmInstructionsState, setOsrmInstructionsState] = useState<string[][] | undefined>(itinerary.osrmInstructions);
  const { toast } = useToast();

  const isNativePlatform = (Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || '')) as boolean;
  const isLocalNative = isLocalMode() || isNativePlatform;

  // --- Quick-win enrichment: Hours (open_now/display) ---
  const hoursEnrichedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (isLocalNative) return; // Skip server-dependent enrichment on native/local-only
    const ids = places
      .filter((p) => p.fsqPlaceId && (!p.hours || typeof p.hours.open_now === 'undefined'))
      .map((p) => p.fsqPlaceId)
      .filter((id) => !hoursEnrichedRef.current.has(id));
    if (ids.length === 0) return;
    (async () => {
      try {
        const res = await fetch('/api/enrich/hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(sessionId ? { 'session-id': sessionId } : {}) },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json();
        if (!res.ok || data?.success === false) throw new Error(data?.message || 'Failed to enrich hours');
        const map = new Map<string, any>();
        (data?.data || []).forEach((row: any) => { if (row?.id) map.set(row.id, row.hours); });
        if (map.size > 0) {
          setPlaces((prev) => prev.map((p) => (map.has(p.fsqPlaceId) ? { ...p, hours: map.get(p.fsqPlaceId) } : p)));
        }
        ids.forEach((id) => hoursEnrichedRef.current.add(id));
      } catch {
        // Silent; avoid UX noise
      }
    })();
  }, [places, sessionId, isLocalNative]);

  // --- Quick-win enrichment: Tips summary via Gemini ---
  const tipsEnrichedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (isLocalNative) return; // Skip on native/local-only
    const pending = places
      .filter((p) => p.fsqPlaceId && !p.tipsSummary)
      .map((p) => p.fsqPlaceId)
      .filter((id) => !tipsEnrichedRef.current.has(id));
    if (pending.length === 0) return;
    // Limit to first 6 at a time to avoid rate limits
    const batch = pending.slice(0, 6);
    (async () => {
      try {
        const results = await Promise.all(batch.map(async (id) => {
          try {
            const res = await fetch(`/api/places/${encodeURIComponent(id)}/tips-summary`, { headers: { ...(sessionId ? { 'session-id': sessionId } : {}) } });
            const data = await res.json();
            if (res.ok && data?.success && data?.summary) {
              return { id, summary: String(data.summary).slice(0, 280) };
            }
          } catch {}
          return { id, summary: undefined };
        }));
        const map = new Map<string, string | undefined>();
        results.forEach((r) => { map.set(r.id, r.summary); tipsEnrichedRef.current.add(r.id); });
        setPlaces((prev) => prev.map((p) => (map.has(p.fsqPlaceId) && map.get(p.fsqPlaceId)
          ? { ...p, tipsSummary: map.get(p.fsqPlaceId) }
          : p)));
      } catch {}
    })();
  }, [places, sessionId, isLocalNative]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Trigger server-side optimization for single-day flow
  const handleOptimizeRoute = async () => {
    try {
      const resp = await routeApiCall('POST', '/api/optimize-route', { places }, sessionId);
      const data = await resp.json();
      if (!resp.ok || !data?.success) throw new Error(data?.message || 'Failed to optimize route');
      const updated = data.itinerary;
      if (Array.isArray(updated?.places)) {
        setPlaces(updated.places);
        onUpdateItinerary(updated.places);
      }
      if (Array.isArray(updated?.routeGeometry)) setRouteGeometryState(updated.routeGeometry);
      if (typeof updated?.totalDistance === 'number') setTotalDistanceState(updated.totalDistance);
      if (typeof updated?.totalDuration === 'number') setTotalDurationState(updated.totalDuration);
      if (Array.isArray(updated?.osrmInstructions)) setOsrmInstructionsState(updated.osrmInstructions);
      else if (Array.isArray(data?.osrmInstructions)) setOsrmInstructionsState(data.osrmInstructions);
      toast({ title: 'Optimized', description: 'Route optimized successfully' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Optimize route failed', variant: 'destructive' });
    }
  };

  const handleGetDirections = (place: Place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    window.open(url, '_blank');
  };

  const handleRemovePlace = (placeToRemove: Place) => {
    const updatedPlaces = places
      .filter(place => place.fsqPlaceId !== placeToRemove.fsqPlaceId)
      .map((place, index) => ({ ...place, order: index + 1 }));
    setPlaces(updatedPlaces);
    onUpdateItinerary(updatedPlaces);
    toast({
      title: "Place Removed",
      description: `${placeToRemove.name} has been removed from your itinerary`,
    });
  };

  const handleShareItinerary = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Travel Itinerary',
        text: `Check out my personalized travel itinerary with ${places.length} amazing places!`,
        url: window.location.href,
      });
    } else {
      const itineraryText = places
        .map((place, index) => `${index + 1}. ${place.name} - ${place.category}`)
        .join('\n');
      navigator.clipboard.writeText(itineraryText);
      toast({ title: "Copied to Clipboard", description: "Your itinerary has been copied to the clipboard" });
    }
  };

  const handleStartNavigation = () => {
    if (places.length === 0) return;
    setShowLiveNav(true);
  };

  const handleFinishLiveNav = () => {
    setShowLiveNav(false);
    toast({
      title: "Itinerary Complete!",
      description: "You have completed your travel itinerary. 🎉",
    });
  };

  if (showLiveNav) {
    const itineraryForLive: ItineraryType = {
      ...itinerary,
      places,
      totalDistance: totalDistanceState,
      totalDuration: totalDurationState,
      routeGeometry: routeGeometryState,
      osrmInstructions: osrmInstructionsState,
    } as any;
    return (
      <LiveNavigation
        itinerary={itineraryForLive}
        userLocation={userLocation}
        onUpdateItinerary={onUpdateItinerary}
        onFinish={handleFinishLiveNav}
      />
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Itinerary Timeline */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Your Itinerary</h3>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-primary hover:text-blue-700 text-sm font-medium"
              >
                <i className="fas fa-edit mr-1"></i>Edit
              </Button>
            </div>

            {/* Itinerary Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Duration</span>
                <span className="font-semibold text-gray-900">
                  {formatDuration(totalDurationState)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Places to Visit</span>
                <span className="font-semibold text-gray-900">{places.length} places</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Travel Distance</span>
                <span className="font-semibold text-gray-900">
                  {totalDistanceState.toFixed(1)} km
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              {places.map((place, index) => (
                <div key={place.fsqPlaceId || `${place.name}-${index}`} className="relative">
                  <div className="flex items-start">
                    <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900">{place.name}</h4>
                        {place.scheduledTime && (
                          <span className="text-xs text-gray-500">{place.scheduledTime}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {place.category}
                        {place.distanceToNext && ` • ${place.distanceToNext.toFixed(1)} km away`}
                      </p>
                      <div className="flex items-center space-x-2">
                        {place.rating && (
                          <div className="flex items-center">
                            <i className="fas fa-star text-yellow-400 text-xs"></i>
                            <span className="text-xs text-gray-600 ml-1">{place.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {place.rating && <span className="text-xs text-gray-400">•</span>}
                        <span className="text-xs text-gray-600">
                          {formatDuration(place.estimatedDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {index < places.length - 1 && (
                    <div className="absolute left-4 top-8 w-px h-6 bg-gray-200"></div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Recommendations Section */}
            {Array.isArray(itinerary.recommendations) && itinerary.recommendations.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <h4 className="text-lg font-bold text-blue-700 mb-2">AI Recommendations</h4>
                <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                  {itinerary.recommendations?.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <Button 
                onClick={handleStartNavigation}
                className="w-full bg-primary hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                disabled={places.length === 0}
              >
                <i className="fas fa-navigation mr-2"></i>
                Start Navigation
              </Button>
              <Button 
                variant="outline"
                onClick={handleShareItinerary}
                className="w-full font-medium py-3 px-4 rounded-xl transition-colors"
              >
                <i className="fas fa-share-alt mr-2"></i>
                Share Itinerary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Place Details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Map Container */}
        <MapView
          places={places}
          userLocation={userLocation}
          totalDistance={totalDistanceState}
          totalDuration={totalDurationState}
          routeGeometry={routeGeometryState}
        />

        {/* Place Details Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Place Details</h3>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-primary hover:text-blue-700 text-sm font-medium"
            >
              <i className="fas fa-sort mr-1"></i>Customize Order
            </Button>
          </div>

          {places.map((place) => (
            <PlaceCard
              key={place.fsqPlaceId}
              place={place}
              onGetDirections={handleGetDirections}
              onRemove={handleRemovePlace}
            />
          ))}
        </div>

        {/* Adjustment Controls */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Adjustments</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all"
              >
                <i className="fas fa-plus-circle text-primary mr-2"></i>
                <span className="font-medium">Add More Time</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all"
              >
                <i className="fas fa-utensils text-orange-500 mr-2"></i>
                <span className="font-medium">Find Food Nearby</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleOptimizeRoute}
                className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <i className="fas fa-route text-green-500 mr-2"></i>
                <span className="font-medium">Optimize Route</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
