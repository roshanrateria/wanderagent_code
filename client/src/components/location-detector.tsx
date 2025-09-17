import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useToast } from "@/hooks/use-toast";

interface LocationDetectorProps {
  onLocationDetected: (location: { lat: number; lng: number; address?: string }) => void;
}

export default function LocationDetector({ onLocationDetected }: LocationDetectorProps) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { latitude, longitude, loading, error } = useGeolocation();
  const { toast } = useToast();

  useEffect(() => {
    if (latitude && longitude && !error) {
      // Reverse geocode to get address
      reverseGeocode(latitude, longitude);
    }
  }, [latitude, longitude, error]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const ct = response.headers.get('content-type') || '';
      let data: any = null;
      if (ct.toLowerCase().includes('application/json')) {
        data = await response.json();
      } else {
        // Graceful fallback: don't throw JSON parse errors
        data = {};
      }
      onLocationDetected({
        lat,
        lng,
        address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      });
    } catch (error) {
      onLocationDetected({
        lat,
        lng,
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      });
    }
  };

  const handleManualLocationSubmit = async () => {
    if (!manualAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a location",
        variant: "destructive"
      });
      return;
    }

    setIsGeocoding(true);
    try {
      // Geocode the manual address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&limit=1`
      );
      const ct = response.headers.get('content-type') || '';
      if (!ct.toLowerCase().includes('application/json')) {
        throw new Error('Geocoding service returned non-JSON response');
      }
      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Location not found");
      }

      const location = data[0];
      onLocationDetected({
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon),
        address: location.display_name
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to find that location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  if (showManualInput) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 sm:p-8">
          <div className="text-center">
            <div className="bg-blue-50 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-map-marker-alt text-primary text-2xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Enter Your Location</h3>
            <p className="text-gray-600 mb-6">Tell us where you are so we can find the best places nearby</p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="location" className="text-left block mb-2 font-medium">
                  Enter city, address, or landmark
                </Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g., Times Square, New York"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="text-base p-3"
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLocationSubmit()}
                />
              </div>
              
              <div className="flex space-x-3 justify-center">
                <Button
                  onClick={handleManualLocationSubmit}
                  disabled={isGeocoding}
                  className="bg-primary hover:bg-blue-700 text-white px-6 py-2"
                >
                  {isGeocoding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Finding...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search mr-2"></i>
                      Find Location
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowManualInput(false)}
                  className="px-6 py-2"
                >
                  Back to Auto-Detect
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6 sm:p-8">
        <div className="text-center">
          <div className="bg-blue-50 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-map-marker-alt text-primary text-2xl"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Detecting Your Location</h3>
          <p className="text-gray-600 mb-6">We need to know where you are to find the best places nearby</p>
          
          {loading && (
            <>
              {/* Loading Animation */}
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <i className="fas fa-info-circle mr-2"></i>
                  Please allow location access in your browser for the best experience
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {error}
              </p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setShowManualInput(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl"
          >
            Enter Location Manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
