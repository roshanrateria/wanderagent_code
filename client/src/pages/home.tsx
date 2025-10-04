import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PreferencesForm from "@/components/preferences-form";
import LocationDetector from "@/components/location-detector";
import AIAgentStatus from "@/components/ai-agent-status";
import ItineraryDisplay from "@/components/itinerary-display";
import TripPlannerForm from "@/components/trip-planner-form";
import DayCarousel from "@/components/day-carousel";
import MapView from "@/components/map-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { UserPreferences, Itinerary as ItineraryType, AgentStatus, Place } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation as CapGeolocation } from '@capacitor/geolocation';
import { isLocalMode } from '@/lib/localApi';
import { routeApiCall } from '@/lib/offline';
import { ICON_SRC } from '@/lib/assetPath';

// Robust JSON fetch helper using our routing system
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method || 'GET';
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  const res = await routeApiCall(method, url, body);

  // Read the body once as text (safe on mobile webview), then parse
  let text = '';
  try {
    text = await res.text();
    // where you currently read the response text in home.tsx fetchJson
    // debug: if response looks like HTML, log and throw detailed error
    if (text.trim().startsWith('<')) {
      console.error(`[fetchJson] Expected JSON but got HTML`, {
        url,
        status: res.status,
        bodyPreview: text.slice(0, 200)
      });
      throw new Error(`Unexpected token '<' - server returned HTML for ${url} (status ${res.status})`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to read response body: ${msg}`);
  }

  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON: ${msg}`);
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || 'Request failed';
    throw new Error(`${res.status}: ${msg}`);
  }
  return data as T;
}

type AppSection = 'welcome' | 'preferences' | 'location' | 'generating' | 'itinerary' | 'jobselect' | 'tripplanner';

// Add a narrow type for session API response
interface SessionInfo { sessionId?: string }

export default function Home() {
  const [currentSection, setCurrentSection] = useState<AppSection>('welcome');
  const [sessionId, setSessionId] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    status: 'analyzing',
    message: 'Initializing AI agent...'
  });
  const [jobType, setJobType] = useState<'create' | 'plan'>('create');
  const [flightOptions, setFlightOptions] = useState<any>(null);
  const [plannedItinerary, setPlannedItinerary] = useState<any>(null);
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [generatedMultiDay, setGeneratedMultiDay] = useState<any>(null);
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);
  const [perDayMap, setPerDayMap] = useState<Record<number, { geometry: Array<{ lat: number; lng: number }>; totalDistance: number; totalDuration: number }>>({});
  const [quickOpen, setQuickOpen] = useState<false | 'coffee' | 'atm' | 'restroom'>(false);
  const [quickResults, setQuickResults] = useState<any[]>([]);
  const [isLoadingQuick, setIsLoadingQuick] = useState<boolean>(false);
  const [assistantOpen, setAssistantOpen] = useState<boolean>(false);
  const { toast } = useToast();

  const isNativePlatform = (Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || '')) as boolean;
  const isLocalNative = isLocalMode() || isNativePlatform;

  // Get session ID
  const { data: sessionData } = useQuery<SessionInfo>({
    queryKey: ['/api/session'],
    queryFn: async () => {
      const response = await routeApiCall('GET', '/api/session');
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, raw: text };
      }
    },
    enabled: !sessionId,
  });

  // Set session ID when data is available
  useEffect(() => {
    if (sessionData?.sessionId && !sessionId) {
      setSessionId(sessionData.sessionId);
    }
  }, [sessionData, sessionId]);

  // Proactively ensure session + location on mount
  useEffect(() => {
    (async () => {
      try { await ensureSessionAndLocation(); } catch {}
    })();
  }, []);

  // Helper: ensure we have a session and a saved location on the server
  const ensureSessionAndLocation = async (): Promise<string | null> => {
    let sid = sessionId;
    try {
      if (!sid) {
        const d = await fetchJson<SessionInfo>('/api/session');
        if (d?.sessionId) { sid = d.sessionId; setSessionId(d.sessionId); }
      }
    } catch {}

    const hasLoc = !!(userLocation && isFinite(userLocation.lat) && isFinite(userLocation.lng));
    if (!hasLoc) {
      try {
        const isNative = Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || '');
        let coords: { lat: number; lng: number } | null = null;
        if (isNative) {
          const perm = await CapGeolocation.checkPermissions();
            if (perm.location !== 'granted') {
              const req = await CapGeolocation.requestPermissions();
              if (req.location !== 'granted') throw new Error('Location permission denied');
            }
          const pos = await CapGeolocation.getCurrentPosition({ enableHighAccuracy: true });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          coords = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
            );
          });
        } else {
          throw new Error('Geolocation is not supported');
        }
        if (coords) {
          setUserLocation(coords);
          try { await routeApiCall('POST', '/api/location', coords, sid); } catch {}
        }
      } catch (e: any) {
        throw new Error(e?.message || 'Enable location to use quick actions');
      }
    }
    return sid ?? null;
  };

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      const response = await routeApiCall('POST', '/api/preferences', preferences, sessionId);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, raw: text };
      }
    },
    onSuccess: (data) => {
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
      // Mobile/local build: skip flights/planner, go straight to location
      if (isLocalNative) {
        setJobType('create');
        setCurrentSection('location');
        return;
      }
      // Web: keep existing behavior
      if (isMultiDay(data.preferences)) {
        setJobType('plan');
        setCurrentSection('tripplanner');
      } else {
        setCurrentSection('jobselect');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive"
      });
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (location: { lat: number; lng: number; address?: string }) => {
      const response = await routeApiCall('POST', '/api/location', location, sessionId);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, raw: text };
      }
    },
    onSuccess: () => {
      setCurrentSection('generating');
      generateItinerary();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive"
      });
    }
  });

  // Generate itinerary mutation
  const generateItineraryMutation = useMutation({
    mutationFn: async () => {
      const response = await routeApiCall('POST', '/api/generate-itinerary', {}, sessionId);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, raw: text };
      }
    },
    onSuccess: (data) => {
      setCurrentSection('itinerary');
      // Capture multi-day structure if returned by the server
      if (data?.multiDay && Array.isArray(data.multiDay.days)) {
        setGeneratedMultiDay(data.multiDay);
      } else {
        setGeneratedMultiDay(null);
      }
      toast({
        title: "Success",
        description: "Your personalized itinerary is ready!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate itinerary",
        variant: "destructive"
      });
      setAgentStatus({
        status: 'error',
        message: error.message || "Failed to generate itinerary"
      });
    }
  });

  // Get current itinerary
  const { data: currentItinerary } = useQuery({
    queryKey: ['/api/itinerary'],
    queryFn: async () => {
      const response = await routeApiCall('GET', '/api/itinerary', undefined, sessionId);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, raw: text };
      }
    },
    enabled: currentSection === 'itinerary' && !!sessionId,
    refetchOnWindowFocus: false,
  });

  const itineraryData = currentItinerary as { success: boolean; itinerary: any } | undefined;

  // Update itinerary mutation
  const updateItineraryMutation = useMutation({
    mutationFn: async (places: Place[]) => {
      const response = await routeApiCall('PUT', '/api/itinerary', { places }, sessionId);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, raw: text };
      }
    },
    onSuccess: () => {
      toast({
        title: "Updated",
        description: "Your itinerary has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update itinerary",
        variant: "destructive"
      });
    }
  });

  const generateItinerary = () => {
    setAgentStatus({ status: 'analyzing', message: 'Analyzing your preferences...' });
    
    setTimeout(() => {
      setAgentStatus({ status: 'searching', message: 'Discovering amazing places nearby...' });
      
      setTimeout(() => {
        setAgentStatus({ status: 'optimizing', message: 'Optimizing your route for the best experience...' });
        generateItineraryMutation.mutate();
      }, 2000);
    }, 1500);
  };

  // Add a helper to check if multi-day is selected
  const isMultiDay = (preferences: UserPreferences) => {
    return preferences.duration && preferences.duration.toLowerCase().includes('multiple days');
  };

  // Update handlePreferencesSubmit to force simple itinerary flow for mobile
  const handlePreferencesSubmit = (preferences: UserPreferences) => {
    // On native/local builds, always use the simplified itinerary flow
    if (isLocalNative) {
      setJobType('create');
      setCurrentSection('location');
      savePreferencesMutation.mutate(preferences);
      return;
    }
    
    // Web only: support flights for multi-day
    if (isMultiDay(preferences)) {
      setJobType('plan');
      setCurrentSection('tripplanner');
    } else {
      setCurrentSection('jobselect');
    }
    savePreferencesMutation.mutate(preferences);
  };

  const handleLocationDetected = (location: { lat: number; lng: number; address?: string }) => {
    setUserLocation({ lat: location.lat, lng: location.lng });
    updateLocationMutation.mutate(location);
  };

  const handleUpdateItinerary = (places: Place[]) => {
    updateItineraryMutation.mutate(places);
  };

  const mapDayPlacesToPlaceType = (dayPlaces: any[] = []): Place[] => {
    return (dayPlaces || [])
      .filter((p: any) => typeof p?.latitude === 'number' && typeof p?.longitude === 'number')
      .map((p: any, idx: number) => ({
        fsqPlaceId: p.fsqPlaceId || `${p.name || 'place'}-${idx}`,
        name: p.name || `Place ${idx + 1}`,
        category: p.category || '',
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        priceLevel: undefined,
        address: undefined,
        description: p.reason,
        photoUrl: undefined,
        website: undefined,
        tel: undefined,
        social_media: undefined,
        placemaker_url: undefined,
        estimatedDuration: p.estimatedDuration || 0,
        travelTimeToNext: undefined,
        distanceToNext: undefined,
        scheduledTime: p.scheduledTime,
        order: p.order || idx + 1,
        reason: p.reason,
        photos: undefined,
        email: undefined,
      } as unknown as Place));
  };

  const optimizeDay = async (days: any[], idx: number, onAfter: (newDays: any[]) => void) => {
    try {
      const day = days[idx];
      const places = (day?.places || []).filter((p: any) => typeof p?.latitude === 'number' && typeof p?.longitude === 'number');
      if (!day || places.length < 2) {
        toast({ title: 'Need more places', description: 'Add at least 2 places with coordinates to optimize this day', variant: 'destructive' });
        return;
      }
      const data = await fetchJson<any>('/api/optimize-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'session-id': sessionId },
        body: JSON.stringify({ places: places.map((p: any) => ({ latitude: p.latitude, longitude: p.longitude })) }),
      });
      if (!Array.isArray(data.optimizedOrder) || data.optimizedOrder.length !== places.length) throw new Error('Invalid optimize result');
      const order: number[] = data.optimizedOrder;
      const reordered = order.map(i => places[i]).map((p, i) => ({ ...p, order: i + 1 }));
      const newDays = days.map((d, di) => di === idx ? { ...d, places: reordered } : d);
      // Save geometry per day
      setPerDayMap(prev => ({
        ...prev,
        [idx]: {
          geometry: Array.isArray(data.routeGeometry) ? data.routeGeometry : [],
          totalDistance: Number(data.totalDistance) || 0,
          totalDuration: Math.round(Number(data.totalDuration) || 0),
        }
      }));
      onAfter(newDays);
      toast({ title: 'Optimized', description: `Day ${idx + 1} route optimized` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Optimization failed', variant: 'destructive' });
    }
  };

  // Trip planner form submit handler
  const handleTripPlannerSubmit = async (details: {
    startAirport: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
  }) => {
    setTripDetails(details);
    setAgentStatus({ status: 'analyzing', message: 'Searching flights and planning your trip...' });
    setCurrentSection('generating');
    try {
      // 1. Search flights
      const flightData = await fetchJson<any>('/api/flight-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'session-id': sessionId,
        },
        body: JSON.stringify(details),
      });
      setFlightOptions(flightData);
      // 2. Fetch places
      const placesData = await fetchJson<any>('/api/foursquare-places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'session-id': sessionId,
        },
        body: JSON.stringify({ city: details.destinationCity, preferences: {} }),
      });
      // 3. Plan itinerary
      const planData = await fetchJson<any>('/api/gemini-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'session-id': sessionId,
        },
        body: JSON.stringify({ flights: flightData, places: placesData, preferences: {}, tripDetails: details }),
      });
      setPlannedItinerary(planData);
      setCurrentSection('itinerary');
      toast({ title: 'Success', description: 'Trip planned with flights and itinerary!' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to plan trip', variant: 'destructive' });
      setAgentStatus({ status: 'error', message: error.message || 'Failed to plan trip' });
    }
  };

  // Fetch quick nearby needs (coffee/atm/restroom)
  const fetchQuick = async (type: 'coffee' | 'atm' | 'restroom') => {
    console.log('[Quick Debug] fetchQuick called with type:', type);
    console.log('[Quick Debug] userLocation:', userLocation);
    console.log('[Quick Debug] isLocalNative:', isLocalNative);
    
    setQuickOpen(type);
    setQuickResults([]);
    setIsLoadingQuick(true);
    try {
      const sid = await ensureSessionAndLocation();
      console.log('[Quick Debug] sessionId:', sid || sessionId);
      
      // Wait for location if still null (up to 2s)
      let tries = 0;
      while (!userLocation && tries < 10) { // poll every 200ms
        await new Promise(r => setTimeout(r, 200));
        tries++;
      }
      const loc = userLocation;
      if (!loc) throw new Error('Location not available yet');
      const headers: Record<string,string> = { 'session-id': sid || sessionId };
      if (isFinite(loc.lat) && isFinite(loc.lng)) {
        headers['x-user-lat'] = String(loc.lat);
        headers['x-user-lng'] = String(loc.lng);
      }
      const url = `/api/quick/${type}`; // avoid ?lat=0&lng=0; server reads headers or stored prefs
      const res = await fetch(url, { headers });
      console.log('[Quick Debug] Response status:', res.status);
      
      const data = await res.json();
      console.log('[Quick Debug] Response data:', data);
      
      if (!res.ok || data?.success === false) throw new Error(data?.message || 'Failed to fetch nearby');
      setQuickResults(Array.isArray(data?.results) ? data.results.slice(0,5) : []);
    } catch (e: any) {
      console.error('[Quick Debug] Error in fetchQuick:', e);
      toast({ title: 'Quick actions', description: e?.message || 'Enable location and try again.', variant: 'destructive' });
      setQuickOpen(false);
      setQuickResults([]);
    } finally {
      setIsLoadingQuick(false);
    }
  };

  const renderWelcomeSection = () => (
    <section className="mb-8">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          {isLocalNative ? 'Your AI Travel Companion' : 'Your AI Travel Companion'}
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          {isLocalNative 
            ? 'Discover amazing places nearby with our intelligent AI agent. No internet required for planning!'
            : 'Let our intelligent agent craft the perfect itinerary based on your preferences, location, and available time.'
          }
        </p>
        
        {/* Hero Illustration */}
        <div className="relative bg-gradient-to-br from-blue-50 to-orange-50 rounded-2xl p-8 mb-8">
          <img 
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
            alt="AI travel planning interface with maps and destinations" 
            className="rounded-xl w-full h-64 object-cover shadow-lg" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-xl"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-xl font-semibold">
              {isLocalNative ? 'Discover • Explore • Enjoy' : 'Discover • Plan • Explore'}
            </h3>
          </div>
        </div>

        <Button 
          onClick={() => setCurrentSection('preferences')}
          className="bg-primary hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          <i className={`fas ${isLocalNative ? 'fa-map-marked-alt' : 'fa-rocket'} mr-2`}></i>
          {isLocalNative ? 'Start Exploring Nearby' : 'Start Planning Your Adventure'}
        </Button>
      </div>
    </section>
  );

  const renderJobSelectSection = () => (
    <section className="mb-8">
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Select Your Trip Type
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Choose how you want to proceed with your trip planning.
        </p>
        
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => {
              setJobType('create');
              setCurrentSection('location');
            }}
            className="bg-primary hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <i className="fas fa-map-marker-alt mr-2"></i>
            Create Itinerary
          </Button>
          {/* Hide flights option on mobile/local builds */}
          {!isLocalNative && (
            <Button 
              onClick={() => {
                setJobType('plan');
                setCurrentSection('tripplanner');
              }}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <i className="fas fa-route mr-2"></i>
              Plan with Flights
            </Button>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src={ICON_SRC} alt="WanderAgent Logo" className="h-8 w-8 rounded" />
              <h1 className="text-xl font-bold text-gray-900">
                {isLocalNative ? 'WanderAgent Mobile' : 'WanderAgent'}
              </h1>
              {isLocalNative && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Offline Ready
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!isLocalNative && (
                <Button variant="ghost" size="sm">
                  <i className="fas fa-cog"></i>
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <i className="fas fa-user-circle text-xl"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentSection === 'welcome' && renderWelcomeSection()}
        {currentSection === 'preferences' && (
          <PreferencesForm
            onSubmit={handlePreferencesSubmit}
            loading={savePreferencesMutation.isPending}
          />
        )}
        {currentSection === 'jobselect' && jobType !== 'plan' && renderJobSelectSection()}
        {currentSection === 'location' && jobType === 'create' && (
          <LocationDetector onLocationDetected={handleLocationDetected} />
        )}
        {/* Guard trip planner on native/local builds */}
        {currentSection === 'tripplanner' && jobType === 'plan' && !isLocalNative && (
          <TripPlannerForm onSubmit={handleTripPlannerSubmit} />
        )}
        {currentSection === 'generating' && (
          <AIAgentStatus status={agentStatus} />
        )}
        {currentSection === 'itinerary' && jobType === 'create' && itineraryData?.success && (
          generatedMultiDay?.days?.length ? (
            <div>
              <h3 className="text-xl font-bold mb-1 text-primary">Planned Itinerary</h3>
              <p className="text-sm text-gray-500 mb-4">Swipe through days or use arrows to navigate</p>
              <DayCarousel
                days={generatedMultiDay.days}
                editable
                currentIndex={activeDayIdx}
                onActiveIndexChange={setActiveDayIdx}
                perDayMeta={perDayMap}
                onChange={(days) => {
                  // Persist multi-day grouping and update flattened storage for compatibility
                  const flatPlaces = days.flatMap((d) => {
                    const items: any[] = [];
                    if (Array.isArray(d.places)) items.push(...d.places);
                    if (d.meals?.lunch) items.push({ ...d.meals.lunch, order: 9998 });
                    if (d.meals?.dinner) items.push({ ...d.meals.dinner, order: 9999 });
                    return items;
                  }).sort((a, b) => (a.order || 0) - (b.order || 0));

                  handleUpdateItinerary(flatPlaces as any);

                  // Also store multiDay on itinerary for future edits
                  // fetch('/api/itinerary', { ... }) -> use router for standalone
                  routeApiCall('PUT', '/api/itinerary', { multiDay: { days } }, sessionId).catch(() => {});

                  setGeneratedMultiDay({ ...generatedMultiDay, days });
                }}
              />
              <div className="flex items-center justify-between mt-3">
                <Button size="sm" variant="outline" onClick={() => optimizeDay(generatedMultiDay.days, activeDayIdx, (newDays) => {
                  setGeneratedMultiDay({ ...generatedMultiDay, days: newDays });
                  // Persist updated order and multiDay
                  const flatPlaces = newDays.flatMap((d: any) => (d.places || []));
                  handleUpdateItinerary(flatPlaces as any);
                  // fetch('/api/itinerary', { ... }) -> use router for standalone
                  routeApiCall('PUT', '/api/itinerary', { multiDay: { days: newDays } }, sessionId).catch(() => {});
                })}>
                  <i className="fas fa-magic mr-2" /> Optimize Day
                </Button>
              </div>
              {/* Flights are only shown in plan flow; not rendering here */}
            </div>
          ) : (
            <ItineraryDisplay
              itinerary={itineraryData.itinerary}
              userLocation={userLocation || { lat: 0, lng: 0 }}
              onUpdateItinerary={handleUpdateItinerary}
              sessionId={sessionId}
            />
          )
        )}
        {/* Web-only: itinerary with flights for plan flow */}
        {currentSection === 'itinerary' && jobType === 'plan' && plannedItinerary && flightOptions && !isLocalNative && (
          <div className="space-y-8">{/* Stack: flights on top, itinerary below */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-primary">Selected Flights</h3>
              {/* Route tags and total cost header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                    {(tripDetails?.startAirport || 'A')} → {(tripDetails?.destinationCity || 'B')}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                    {(tripDetails?.destinationCity || 'B')} → {(tripDetails?.startAirport || 'A')}
                  </span>
                </div>
                {typeof flightOptions.totalPrice !== 'undefined' && (
                  <div className="text-sm sm:text-base font-semibold text-gray-900">
                    Total: <span className="text-primary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(flightOptions.totalPrice)}</span>
                  </div>
                )}
              </div>
              {/* Two flight cards side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(flightOptions.flights || []).slice(0, 2).map((flight: any, idx: number) => {
                  const isOutbound = (flight.leg === 'outbound') || idx === 0;
                  const originCity = isOutbound ? (tripDetails?.startAirport || 'A') : (tripDetails?.destinationCity || 'B');
                  const destCity = isOutbound ? (tripDetails?.destinationCity || 'B') : (tripDetails?.startAirport || 'A');
                  const routeTag = `${originCity} → ${destCity}`;
                  // Use server normalized date if available
                  const rawDate = flight.departureDateISO || (flight.date || flight.departure_date || flight.depart_date || flight.departure_time || flight.departureTime || flight.departure?.at || flight.departure?.time || (flight.legs && flight.legs[0]?.departure_time) || (flight.segments && flight.segments[0]?.departure_time) || (flight.itineraries && flight.itineraries[0]?.segments && flight.itineraries[0].segments[0]?.departure?.at));
                  const extractISODate = (val: any) => {
                    if (!val) return undefined;
                    const s = String(val);
                    const m = s.match(/\d{4}-\d{2}-\d{2}/);
                    if (m) return m[0];
                    const d = new Date(s);
                    return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0,10);
                  };
                  const dateFromFlight = extractISODate(rawDate);
                  const dateTag = dateFromFlight || (isOutbound ? tripDetails?.startDate : tripDetails?.endDate);
                  const airline = flight.name || flight.airline || 'Airline';
                  const departure = flight.departure || flight.departure_time || flight.departureTime || '-';
                  const arrival = flight.arrival || flight.arrival_time || flight.arrivalTime || '-';
                  const duration = flight.duration || flight.total_duration || '-';
                  const stops = (flight.stops ?? (Array.isArray(flight.legs) ? Math.max(0, flight.legs.length - 1) : undefined));
                  const price = flight.price;
                  const fromCode = flight.from_airport || flight.from || flight.origin || '';
                  const toCode = flight.to_airport || flight.to || flight.destination || '';
                  return (
                    <div key={idx} className="p-4 bg-white rounded-xl shadow border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-lg text-blue-700">{airline}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${isOutbound ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{isOutbound ? 'Outbound' : 'Return'}</span>
                          {flight.is_best && (<span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Best</span>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{routeTag}</span>
                        {fromCode && toCode && (<span className="text-xs text-gray-500">({String(fromCode).toUpperCase()} → {String(toCode).toUpperCase()})</span>)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                        <div><span className="font-bold">Departure:</span> {departure}</div>
                        <div><span className="font-bold">Arrival:</span> {arrival}</div>
                        <div><span className="font-bold">Duration:</span> {duration}</div>
                        <div><span className="font-bold">Stops:</span> {stops ?? '-'}</div>
                        <div className="col-span-2"><span className="font-bold">Date:</span> {dateTag || '-'}</div>
                        <div className="col-span-2"><span className="font-bold">Price:</span> <span className="text-primary font-bold">{price}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-primary">Planned Itinerary</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      // Persist current multi-day plan
                      try {
                        await routeApiCall('PUT', '/api/itinerary', { multiDay: { days: plannedItinerary.days } }, sessionId);
                        toast({ title: 'Saved', description: 'Multi-day plan saved' });
                      } catch (err) {
                        toast({ title: 'Error', description: 'Failed to save plan', variant: 'destructive' });
                      }

                      // Also export PDF for multi-day plan (flatten days -> places)
                      try {
                        const mod = await import('@/lib/exportItinerary');
                        const flatPlaces = (Array.isArray(plannedItinerary.days) ? plannedItinerary.days.flatMap((d: any) => (d.places || [])) : [] )
                          .map((p: any, idx: number) => ({ ...p, order: idx + 1 }));
                        const exportItin = {
                          ...plannedItinerary,
                          places: flatPlaces,
                          totalDays: Array.isArray(plannedItinerary.days) ? plannedItinerary.days.length : undefined,
                        };
                        const res = await mod.exportItineraryToPdf(exportItin, { fileName: `itinerary-${Date.now()}.pdf` });
                        if (res.success) {
                          if (res.blobUrl) {
                            const fileName = `itinerary-${Date.now()}.pdf`;
                            const a = document.createElement('a');
                            a.href = res.blobUrl;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
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
                  >
                    <i className="fas fa-save mr-2" /> Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => optimizeDay(plannedItinerary.days, activeDayIdx, (newDays) => {
                      setPlannedItinerary({ ...plannedItinerary, days: newDays });
                      const flatPlaces = newDays.flatMap((d: any) => (d.places || []));
                      handleUpdateItinerary(flatPlaces as any);
                      // fetch('/api/itinerary', { ... }) -> use router for standalone
                      routeApiCall('PUT', '/api/itinerary', { multiDay: { days: newDays } }, sessionId).catch(() => {});
                    })}
                  >
                    <i className="fas fa-magic mr-2" /> Optimize Day
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">Swipe through days or use arrows to navigate</p>
              <div className="bg-transparent">
                {Array.isArray(plannedItinerary.days) && plannedItinerary.days.length > 0 ? (
                  <>
                    <DayCarousel
                      days={plannedItinerary.days}
                      editable
                      currentIndex={activeDayIdx}
                      onActiveIndexChange={setActiveDayIdx}
                      perDayMeta={perDayMap}
                      onChange={(days) => {
                        setPlannedItinerary({ ...plannedItinerary, days });
                        const flatPlaces = days.flatMap((d) => {
                          const items: any[] = [];
                          if (Array.isArray(d.places)) items.push(...d.places);
                          if (d.meals?.lunch) items.push({ ...d.meals.lunch, order: 9998 });
                          if (d.meals?.dinner) items.push({ ...d.meals.dinner, order: 9999 });
                          return items;
                        }).sort((a, b) => (a.order || 0) - (b.order || 0));
                        handleUpdateItinerary(flatPlaces as any);
                        fetch('/api/itinerary', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'session-id': sessionId },
                          body: JSON.stringify({ multiDay: { days } }),
                        }).catch(() => {});
                      }}
                    />
                    {/* Removed per-day map for multi-day view as requested */}
                  </>
                ) : (
                  // Fallback to single-day rendering
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                    <ol className="space-y-6">
                      {plannedItinerary.places?.map((place: any, idx: number) => (
                        <li key={place.fsqPlaceId || idx} className="relative pl-8">
                          <div className="absolute left-0 top-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center font-bold">{place.order}</div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-lg text-blue-700">{place.name}</span>
                            <span className="text-sm text-gray-500 mb-1">{place.category}</span>
                            <span className="text-xs text-gray-400">Scheduled: {place.scheduledTime} • Duration: {place.estimatedDuration} min</span>
                            <span className="mt-1 text-gray-700">{place.reason}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <Popover open={assistantOpen} onOpenChange={setAssistantOpen}>
          <PopoverTrigger asChild>
            <Button
              className="bg-primary hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
              aria-label="Quick actions"
            >
              <i className="fas fa-bolt text-xl"></i>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="left" align="end" className="w-64">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Quick Actions</div>
              <div className="text-xs text-gray-500">Nearby</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setAssistantOpen(false); fetchQuick('coffee'); }}>
                  <i className="fas fa-mug-hot mr-1" /> Coffee
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setAssistantOpen(false); fetchQuick('atm'); }}>
                  <i className="fas fa-university mr-1" /> ATM
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setAssistantOpen(false); fetchQuick('restroom'); }}>
                  <i className="fas fa-restroom mr-1" /> Restroom
                </Button>
              </div>
              <div className="text-xs text-gray-600">
                Status: <span className="font-medium">{agentStatus.status}</span><br />
                <span className="text-[11px]">{agentStatus.message}</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick results dialog; ensure high z-index and hide underlying map interactions */}
      <Dialog open={!!quickOpen} onOpenChange={() => { setQuickOpen(false); setQuickResults([]); }}>
        <DialogContent className="sm:max-w-3xl z-[10000]">
           <DialogHeader>
             <DialogTitle>Nearby {quickOpen}</DialogTitle>
           </DialogHeader>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
             {/* Prevent Leaflet panes from visually overlapping inside dialog on some browsers */}
             <style>{`.leaflet-pane, .leaflet-top, .leaflet-bottom { z-index: 0 !important; }`}</style>
             {isLoadingQuick && (
               <div className="col-span-2 text-sm text-gray-500">Loading nearby {quickOpen}...</div>
             )}
             {quickResults.slice(0,5).map((p: any) => (
               <div key={p.fsq_place_id} className="p-3 border rounded-xl bg-white">
                 <div className="font-semibold text-gray-900">{p.name}</div>
                 <div className="text-xs text-gray-500 mb-1">{p.location?.formatted_address}</div>
                 <div className="flex items-center justify-between mt-2">
                   <Button size="sm" variant="outline" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`, '_blank')}>
                     <i className="fas fa-directions mr-1" /> Go
                   </Button>
                   <Button size="sm" onClick={() => {
                     // Add to itinerary as a quick stop at next position
                     if (!itineraryData?.itinerary) return;
                     const newPlace: Place = {
                       fsqPlaceId: p.fsq_place_id,
                       name: p.name,
                       category: p.categories?.[0]?.name || 'Point of Interest',
                       latitude: p.latitude,
                       longitude: p.longitude,
                       rating: p.rating,
                       priceLevel: p.price,
                       address: p.location?.formatted_address,
                       description: '',
                       photoUrl: p.photos?.[0] ? `${p.photos[0].prefix}300x200${p.photos[0].suffix}` : undefined,
                       website: p.website,
                       tel: p.tel,
                       social_media: p.social_media,
                       placemaker_url: p.placemaker_url,
                       estimatedDuration: 20,
                       order: (itineraryData.itinerary.places?.length || 0) + 1,
                       reason: `Quick ${String(quickOpen)}`,
                     } as any;
                     const nextPlaces = [...(itineraryData.itinerary.places || []), newPlace];
                     fetch('/api/itinerary', {
                       method: 'PUT',
                       headers: { 'Content-Type': 'application/json', 'session-id': sessionId },
                       body: JSON.stringify({ places: nextPlaces }),
                     }).then(() => {
                       toast({ title: 'Added', description: `${p.name} added to itinerary` });
                       setQuickOpen(false); setQuickResults([]);
                     }).catch(() => {});
                   }}>
                     <i className="fas fa-plus mr-1" /> Add
                   </Button>
                 </div>
               </div>
             ))}
             {!isLoadingQuick && quickResults.length === 0 && (
               <div className="text-sm text-gray-500">No results</div>
             )}
           </div>
         </DialogContent>
       </Dialog>
    </div>
  );
}
