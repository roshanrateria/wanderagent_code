import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import MapView from "./map-view";
import PlaceCard from "./place-card";
import LiveNavigation from "./live-navigation";
import AlbumCreator from './album-creator';
import BudgetTracker from './budget-tracker';
import TripJournal from './trip-journal';
import EmergencyHub from './emergency-hub';
import type { Itinerary as ItineraryType, Place } from "@/lib/types";
import { useEffect, useRef } from "react";
import { Capacitor } from '@capacitor/core';
import { isLocalMode } from '@/lib/localApi';
import { routeApiCall } from '@/lib/offline';

interface ItineraryDisplayProps {
  itinerary: ItineraryType & {
    budgetInsights?: {
      estimatedTotal: number;
      breakdown: Record<string, number>;
      recommendations: string[];
    };
  };
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

  // Busy indicator to show spinner while exporting/sharing
  const [isBusy, setIsBusy] = useState(false);

  // Minimal compass-like spinner SVG
  const CompassSpinner = ({ size = 16 }: { size?: number }) => (
    <span className="inline-flex items-center justify-center mr-2" aria-hidden={!isBusy}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isBusy ? 'animate-spin text-primary' : 'text-primary'}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.14" />
        <path d="M12 6l3.5 6-6 3.5L12 6z" fill="currentColor" />
      </svg>
    </span>
  );

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

  const buildExportItineraryForPdf = (baseItin: any, placesList: Place[]) => {
    // Helper: normalize various possible description fields into a single description string
    const normalizeDescription = (p: any) => {
      return (
        p?.description || p?.summary || p?.tipsSummary || p?.notes || p?.details?.text || p?.details || p?.descriptionText || p?.blurb || p?.name || ''
      );
    };

    // Helper: attempt to resolve a place reference (string id or lightweight object) to the full place from placesList
    const resolvePlaceRef = (ref: any) => {
      if (!ref) return ref;
      if (typeof ref === 'string') {
        // try to find by id or fsqPlaceId or name
        const found = placesList.find((pp: any) => pp.fsqPlaceId === ref || String(pp.id) === ref || pp.name === ref);
        return found ? { ...found, description: normalizeDescription(found) } : { name: ref };
      }
      if (typeof ref === 'object') {
        // if it's already a full place (has latitude/longitude or fsqPlaceId), prefer merging with master list
        if (ref.fsqPlaceId || ref.id) {
          const found = placesList.find((pp: any) => pp.fsqPlaceId === ref.fsqPlaceId || String(pp.id) === String(ref.id));
          if (found) return { ...found, ...ref, description: normalizeDescription({ ...found, ...ref }) };
        }
        // otherwise, ensure description
        return { ...ref, description: normalizeDescription(ref) };
      }
      return ref;
    };

    // Helper: parse day number from various shapes (number, numeric string, dayIndex/dayNumber)
    const parseDayNumber = (v: any) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === 'number' && Number.isFinite(v)) return Math.max(1, Math.floor(v));
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Math.max(1, Math.floor(Number(v)));
      if (typeof v === 'object') {
        if (typeof v.day === 'number') return Math.max(1, Math.floor(v.day));
        if (typeof v.day === 'string' && !Number.isNaN(Number(v.day))) return Math.max(1, Math.floor(Number(v.day)));
        if (typeof v.dayIndex === 'number') return Math.max(1, Math.floor(v.dayIndex));
        if (typeof v.dayNumber === 'number') return Math.max(1, Math.floor(v.dayNumber));
      }
      return undefined;
    };

    // Helper: robust meal detection based on multiple fields
    const looksLikeMeal = (p: any) => {
      if (!p) return false;
      const mealType = String(p?.mealType || p?.type || '').toLowerCase();
      if (mealType && /meal|breakfast|lunch|dinner|brunch|supper/.test(mealType)) return true;
      const cat = String(p?.category || (Array.isArray(p?.categories) ? p.categories.join(' ') : '') || (Array.isArray(p?.tags) ? p.tags.join(' ') : '') || p?.name || '').toLowerCase();
      if (cat && /breakfast|brunch|lunch|dinner|supper|restaurant|cafe|food|meal/.test(cat)) return true;
      return false;
    };

    // Helper: extract/normalize flights from many possible keys into an array
    const normalizeFlights = (src: any) => {
      if (!src) return [];
      const candidates = src.flights || src.plannedFlights || src.flightOptions || src.flight || src.flightSummary || src.flight_details || src.planned_flights || [];
      if (Array.isArray(candidates)) return candidates;
      if (typeof candidates === 'object') return [candidates];
      return [];
    };

    // If the itinerary already provides a multiDay structure, normalize descriptions, resolve place refs, and preserve flights
    if (baseItin?.multiDay && Array.isArray(baseItin.multiDay.days) && baseItin.multiDay.days.length) {
      const days = baseItin.multiDay.days.map((d: any, index: number) => {
        // items may be under .places or .items
        const rawItems = Array.isArray(d.places) ? d.places : Array.isArray(d.items) ? d.items : [];
        const placesNorm = rawItems.map((p: any) => {
          const resolved = resolvePlaceRef(p);
          // ensure day if present on day object
          if (typeof resolved === 'object' && !resolved.day) resolved.day = parseDayNumber(d.day) || index + 1;
          return { ...resolved, description: normalizeDescription(resolved) };
        });
        const meals = Array.isArray(d.meals)
          ? d.meals.map((m: any) => ({ ...m, description: m.description || m.notes || m.title || (typeof m === 'string' ? m : ''), time: m.time || m.scheduledTime || m.when }))
          : [];
        return { day: parseDayNumber(d.day) || (typeof d.day === 'number' ? d.day : index + 1), places: placesNorm, meals };
      });

      // Ensure places list also has normalized descriptions (merge in master places where possible)
      const normalizedPlacesList = placesList.map(p => ({ ...p, description: normalizeDescription(p) }));

      const flights = normalizeFlights(baseItin);
      // also include any top-level flight-like keys on baseItin (do NOT duplicate `flights` key)
      const flightAliases = { plannedFlights: baseItin.plannedFlights, flightOptions: baseItin.flightOptions, flight: baseItin.flight, flightSummary: baseItin.flightSummary };

      return { ...baseItin, places: normalizedPlacesList, multiDay: { days }, totalDays: days.length, flights, ...flightAliases };
    }

    // --- No explicit multiDay provided: infer and build one from placesList ---
    // Ensure description is present from tipsSummary/summary/notes
    const mapped = placesList.map((p, idx) => ({ ...p, description: normalizeDescription(p) }));

    // Try to infer totalDays from existing place.day fields (allow numeric strings) or baseItin.totalDays
    const maxDayFromPlaces = Math.max(0, ...mapped.map(p => { const d = parseDayNumber((p as any).day); return d || 0; }));
    const baseTotal = typeof baseItin?.totalDays === 'number' && baseItin.totalDays > 0 ? Number(baseItin.totalDays) : 0;
    let totalDays = baseTotal || maxDayFromPlaces || 0;
    if (!totalDays) {
      // Heuristic: spread across multiple days if many places; default 5 places/day
      totalDays = Math.max(1, Math.ceil(mapped.length / 5));
    }

    // Build map of days
    const dayMap = new Map<number, { day: number; places: any[]; meals: any[] }>();
    mapped.forEach((p, idx) => {
      // Try to detect any day-like field on the place using parseDayNumber
      const explicitDay = parseDayNumber((p as any).day || (p as any).dayIndex || (p as any).dayNumber || (p as any).scheduledDay || (p as any).day_of_trip);
      let day = explicitDay || 0;
      if (!day) {
        // distribute by index evenly across totalDays
        const perDay = Math.ceil(mapped.length / totalDays) || 1;
        day = Math.min(totalDays, Math.max(1, Math.ceil((idx + 1) / perDay)));
      }
      // attach normalized day to the place so downstream consumers that group by per-place day work
      (p as any).day = day;

      if (!dayMap.has(day)) dayMap.set(day, { day, places: [], meals: [] });
      const bucket = dayMap.get(day)!;

      // Broaden meal detection: explicit mealType/type or keywords in name/category/tags
      if (looksLikeMeal(p)) {
        bucket.meals.push({ type: (p as any).mealType || (p as any).type || 'Meal', time: (p as any).scheduledTime || (p as any).time || (p as any).scheduled || (p as any).when, description: p.description || p.name, day });
      } else {
        bucket.places.push(p);
      }
    });

    // Build ordered days array; ensure at least totalDays entries
    const keys = Array.from(dayMap.keys());
    const maxDay = Math.max(totalDays, ...(keys.length ? keys : [1]));
    const days: any[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const e = dayMap.get(d) || { day: d, places: [], meals: [] };
      days.push({ day: d, places: e.places, meals: e.meals });
    }

    const flights = normalizeFlights(baseItin);
    const flightAliases = { plannedFlights: baseItin.plannedFlights, flightOptions: baseItin.flightOptions, flight: baseItin.flight, flightSummary: baseItin.flightSummary };

    return { ...baseItin, places: mapped, multiDay: { days }, totalDays: days.length, flights, ...flightAliases };
  };

  const handleShareItinerary = async () => {
    setIsBusy(true);
    try {
      // Export PDF (dynamic import to avoid bundling pdf-lib in initial bundle)
      const mod = await import('@/lib/exportItinerary');
      const exportItin = buildExportItineraryForPdf(itinerary, places);
      const res = await mod.exportItineraryToPdf(exportItin);
      if (!res.success) throw new Error(res.error || 'Failed to export PDF');

      // Native flow: exportItineraryToPdf already attempts Capacitor sharing and returns a filePath
      if (res.filePath) {
        toast({ title: 'Shared', description: `Saved and shared: ${res.filePath}` });
        return;
      }

      // Web flow: we got a blob URL
      if (res.blobUrl) {
        try {
          // Try to fetch blob and share as File if supported
          const fetched = await fetch(res.blobUrl);
          const blob = await fetched.blob();
          const fileName = `itinerary-${Date.now()}.pdf`;
          const file = new File([blob], fileName, { type: 'application/pdf' });

          // Web Share Level 2 (files) support
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: 'My Travel Itinerary', text: 'Here is my itinerary PDF', files: [file] as any });
            toast({ title: 'Shared', description: 'PDF shared via system share sheet' });
            return;
          }

          // Fallback: Web Share with URL if available
          if (navigator.share) {
            await navigator.share({ title: 'My Travel Itinerary', text: 'Here is my itinerary', url: res.blobUrl });
            toast({ title: 'Shared', description: 'Shared PDF link' });
            return;
          }

          // Final fallback: force download
          const a = document.createElement('a');
          a.href = res.blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          toast({ title: 'Downloaded', description: 'PDF downloaded to your device' });
        } finally {
          // Revoke the object URL after some time
          setTimeout(() => { try { URL.revokeObjectURL(res.blobUrl!); } catch {} }, 10000);
        }
      } else {
        toast({ title: 'Exported', description: 'PDF is ready' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Share failed', variant: 'destructive' });
    } finally {
      setIsBusy(false);
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

            {/* AI Budget Insights Section - NEW! */}
            {itinerary.budgetInsights && itinerary.budgetInsights.estimatedTotal > 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                <h4 className="text-lg font-bold text-green-700 mb-3 flex items-center">
                  <i className="fas fa-rupee-sign mr-2"></i>
                  Estimated Trip Cost (Per Person)
                </h4>
                
                {/* Total Cost */}
                <div className="bg-white rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Total Estimated Cost:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ₹{itinerary.budgetInsights.estimatedTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                {Object.keys(itinerary.budgetInsights.breakdown).length > 0 && (
                  <div className="bg-white rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Cost Breakdown:</p>
                    <div className="space-y-3">
                      {Object.entries(itinerary.budgetInsights.breakdown).map(([category, amount]) => (
                        <div key={category} className="border-b border-gray-100 pb-2 last:border-0">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600 font-medium">
                              {category.includes('Food') && '🍽️'}
                              {category.includes('Activities') && '🎯'}
                              {category.includes('Transport') && '🚗'}
                              {' '}{category}:
                            </span>
                            <span className="font-bold text-gray-900">₹{(amount as number).toLocaleString('en-IN')}</span>
                          </div>
                          {/* Grey disclaimer note */}
                          <p className="text-xs text-gray-500 italic ml-5">
                            {category.includes('Food') && '(Approx. per person for meals & snacks during trip)'}
                            {category.includes('Activities') && '(Entry fees & activity charges; actual may vary)'}
                            {category.includes('Transport') && '(Auto/cab fares between locations; can be shared)'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {(itinerary.budgetInsights as any).explanation && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-700 whitespace-pre-line font-mono">
                      {(itinerary.budgetInsights as any).explanation}
                    </p>
                  </div>
                )}

                {/* AI Recommendations */}
                {itinerary.budgetInsights.recommendations && itinerary.budgetInsights.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">💡 Money-Saving Tips:</p>
                    <ul className="list-disc pl-5 text-gray-600 text-xs space-y-1">
                      {itinerary.budgetInsights.recommendations.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

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
                className="w-full font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
                aria-busy={isBusy}
              >
                {isBusy ? <CompassSpinner size={16} /> : <i className="fas fa-share-alt mr-2"></i>}
                <span>{isBusy ? 'Working...' : 'Share Itinerary'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const mod = await import('@/lib/exportItinerary');
                    const exportItin = buildExportItineraryForPdf(itinerary, places);
                    const res = await mod.exportItineraryToPdf(exportItin);
                    if (res.success) {
                      if (res.blobUrl) {
                        const fileName = `itinerary-${Date.now()}.pdf`;
                        const a = document.createElement('a');
                        a.href = res.blobUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        // Free object URL after short delay
                        setTimeout(() => { try { URL.revokeObjectURL(res.blobUrl!); } catch {} }, 10000);
                        toast({ title: 'Exported', description: 'PDF downloaded' });
                      } else if (res.filePath) {
                        toast({ title: 'Exported', description: `Saved to ${res.filePath}` });
                      } else {
                        toast({ title: 'Exported', description: 'PDF ready' });
                      }
                    } else {
                      toast({ title: 'Error', description: res.error || 'Failed to export PDF', variant: 'destructive' });
                    }
                  } catch (e: any) {
                    toast({ title: 'Error', description: e?.message || 'Export failed', variant: 'destructive' });
                  }
                }}
                className="w-full font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                Export PDF
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
              <i className="fas fa-sort mr-1"></i>
              Customize Order
            </Button>
          </div>

          {places.length > 0 ? (
            places.map((place) => (
              <PlaceCard
                key={place.fsqPlaceId}
                place={place}
                onGetDirections={handleGetDirections}
                onRemove={handleRemovePlace}
              />
            ))
          ) : (
            <p className="text-gray-500">No places in itinerary yet. Add some to get started!</p>
          )}
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
              <Button
                variant="outline"
                disabled
                className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl opacity-50 cursor-not-allowed"
              >
                <i className="fas fa-wallet text-gray-500 mr-2"></i>
                <span className="font-medium">Budget Tracker (Active During Trip)</span>
              </Button>
              <AlbumCreator />
              <BudgetTracker />
              <TripJournal />
              <EmergencyHub />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
