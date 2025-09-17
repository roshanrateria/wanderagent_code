import { useState, useEffect } from "react";
import MapView from "./map-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Itinerary as ItineraryType, Place } from "@/lib/types";

interface LiveNavigationProps {
  itinerary: ItineraryType;
  userLocation: { lat: number; lng: number };
  onUpdateItinerary: (places: Place[]) => void;
  onFinish: () => void;
}

export default function LiveNavigation({
  itinerary,
  userLocation,
  onUpdateItinerary,
  onFinish,
}: LiveNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [overTime, setOverTime] = useState(false);
  const [timer, setTimer] = useState(0);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();
  const places = itinerary.places;
  const currentPlace = places[currentIndex];
  const nextPlace = places[currentIndex + 1];

  // Real-time location tracking
  useEffect(() => {
    const geo = navigator.geolocation;
    let watchId: number | null = null;
    if (geo) {
      watchId = geo.watchPosition(
        (pos) => {
          setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          toast({ title: "Location Error", description: err.message, variant: "destructive" });
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
    return () => {
      if (watchId !== null && geo) geo.clearWatch(watchId);
    };
  }, [toast]);

  // Simulate timer for time spent at spot
  useEffect(() => {
    let interval: any;
    if (arrived) {
      interval = setInterval(() => setTimer((t) => t + 1), 60000); // 1 min
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [arrived]);

  useEffect(() => {
    if (arrived && timer > currentPlace.estimatedDuration) {
      setOverTime(true);
    }
  }, [timer, arrived, currentPlace]);

  // Calculate live distance to destination
  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Auto-arrive if user is close to destination
  useEffect(() => {
    if (!arrived && liveLocation) {
      const dist = getDistance(liveLocation.lat, liveLocation.lng, currentPlace.latitude, currentPlace.longitude);
      if (dist < 0.05) { // 50 meters
        setArrived(true);
        toast({ title: "Arrived!", description: `You have arrived at ${currentPlace.name}.` });
      }
    }
  }, [liveLocation, arrived, currentPlace, toast]);

  // Use real OSRM instructions per leg (currentIndex leg from start->place[currentIndex])
  const instructions: string[] = Array.isArray(itinerary.osrmInstructions)
    ? (itinerary.osrmInstructions[currentIndex] || [])
    : [];

  const handleArrive = () => {
    setArrived(true);
    setTimer(0);
  };

  const handleLeave = () => {
    setArrived(false);
    setOverTime(false);
    setTimer(0);
    if (currentIndex < places.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish();
    }
  };

  const handleAdjustItinerary = () => {
    toast({
      title: "Itinerary Adjustment",
      description:
        "You can delete a stop or adjust your timings to stay on schedule.",
    });
  };

  const handleDeleteStop = () => {
    const updatedPlaces = places.filter((_, idx) => idx !== currentIndex);
    onUpdateItinerary(updatedPlaces);
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setArrived(false);
    setOverTime(false);
    setTimer(0);
    toast({
      title: "Stop Removed",
      description: `${currentPlace.name} has been removed from your itinerary.`,
    });
  };

  // Remaining distance and time
  const remainingDistance = liveLocation
    ? getDistance(liveLocation.lat, liveLocation.lng, currentPlace.latitude, currentPlace.longitude)
    : currentPlace.distanceToNext || 0;
  const remainingDuration = currentPlace.estimatedDuration - timer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-orange-100 flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl mb-8 animate-fade-in">
        <CardContent className="p-8">
          <h2 className="text-3xl font-bold text-primary mb-4 text-center animate-slide-in">Live Navigation</h2>
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${liveLocation ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-sm text-gray-700">{liveLocation ? `Live location active` : `Waiting for location...`}</span>
          </div>
          <MapView
            places={[currentPlace]}
            userLocation={liveLocation || userLocation}
            routeGeometry={itinerary.routeGeometry}
            totalDistance={remainingDistance}
            totalDuration={currentPlace.estimatedDuration}
          />
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Next Destination</h3>
            <div className="bg-white rounded-xl p-4 shadow flex flex-col items-center">
              <span className="text-lg font-bold text-primary">{currentPlace.name}</span>
              <span className="text-sm text-gray-600 mb-2">{currentPlace.category}</span>
              <span className="text-sm text-gray-700">Remaining Distance: <b>{remainingDistance.toFixed(2)} km</b></span>
              <span className="text-sm text-gray-700">Estimated Time Left: <b>{remainingDuration > 0 ? `${remainingDuration} min` : "Arrived"}</b></span>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Directions</h3>
            {instructions.length > 0 ? (
              <ul className="list-decimal pl-6 text-gray-800 space-y-1">
                {instructions.map((inst: string, idx: number) => (
                  <li key={idx} className="text-base">{inst}</li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-600 text-sm">No turn-by-turn steps available for this leg.</div>
            )}
          </div>
          <div className="mt-8 flex flex-col items-center">
            {!arrived ? (
              <Button
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl text-lg shadow-lg animate-bounce"
                onClick={handleArrive}
                disabled={!!liveLocation && remainingDistance > 0.05}
              >
                Arrived at Destination
              </Button>
            ) : (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-lg shadow-lg animate-pulse"
                onClick={handleLeave}
              >
                Leave for Next Destination
              </Button>
            )}
            {overTime && (
              <div className="mt-6 bg-orange-100 border-l-4 border-orange-500 p-4 rounded-xl text-orange-800 animate-shake">
                <p>
                  You are spending more time here than AI expected. This may delay your itinerary timings.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={handleDeleteStop} className="border-orange-500 text-orange-700">Delete This Stop</Button>
                  <Button variant="outline" onClick={handleAdjustItinerary} className="border-blue-500 text-blue-700">I'll Adjust Myself</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="w-full max-w-2xl text-center mt-4 animate-fade-in">
        <span className="text-lg text-gray-700 font-medium">Progress: {currentIndex + 1} / {places.length}</span>
        {currentIndex === places.length - 1 && arrived && (
          <div className="mt-4 text-2xl font-bold text-green-600 animate-bounce">Congratulations! You have completed your itinerary 🎉</div>
        )}
      </div>
    </div>
  );
}
