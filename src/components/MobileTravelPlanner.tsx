import React, { useState, useEffect } from 'react';
import { useDeviceType } from '../hooks/useDeviceType';
import { GeminiService, ItineraryRequest, ItineraryResponse } from '../services/GeminiService';
import { FoursquareService, Place } from '../services/FoursquareService';
import { OSRMService } from '../services/OSRMService';
import { getCurrentPosition } from '../utils/geolocation';
import { ItineraryPlanner } from './ItineraryPlanner';
import { LocationSearch } from './LocationSearch';
import { RouteMap } from './RouteMap';

interface MobileTravelPlannerProps {
  className?: string;
}

export const MobileTravelPlanner: React.FC<MobileTravelPlannerProps> = ({ className = '' }) => {
  const deviceInfo = useDeviceType();
  const [currentTab, setCurrentTab] = useState<'planner' | 'search' | 'map'>('planner');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);

  const geminiService = new GeminiService();
  const foursquareService = new FoursquareService();
  const osrmService = new OSRMService();

  useEffect(() => {
    if (deviceInfo.isMobile) {
      getCurrentUserLocation();
    }
  }, [deviceInfo.isMobile]);

  const getCurrentUserLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      // Load nearby places
      loadNearbyPlaces(position.coords.latitude, position.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Unable to get your location. Please enable location services.');
    }
  };

  const loadNearbyPlaces = async (latitude: number, longitude: number) => {
    try {
      const places = await foursquareService.searchPlaces({
        latitude,
        longitude,
        radius: 5000,
        limit: 20
      });
      setNearbyPlaces(places);
    } catch (error) {
      console.error('Error loading nearby places:', error);
    }
  };

  const handleCreateItinerary = async (request: ItineraryRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await geminiService.generateItinerary(request);
      setItinerary(response);
      setCurrentTab('planner');
    } catch (error) {
      console.error('Error creating itinerary:', error);
      setError(error instanceof Error ? error.message : 'Failed to create itinerary');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceSearch = async (query: string, location?: { lat: number; lng: number }) => {
    const searchLocation = location || currentLocation;
    if (!searchLocation) return [];

    try {
      return await foursquareService.searchPlaces({
        query,
        latitude: searchLocation.lat,
        longitude: searchLocation.lng,
        limit: 10
      });
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  };

  if (!deviceInfo.isMobile) {
    return null; // This component is only for mobile
  }

  return (
    <div className={`mobile-travel-planner ${className}`} style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '1rem',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          WanderAgent Mobile
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
          Your AI Travel Companion
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        background: 'white',
        borderBottom: '1px solid #e0e0e0'
      }}>
        {[
          { key: 'planner', label: 'Planner', icon: '🗓️' },
          { key: 'search', label: 'Search', icon: '🔍' },
          { key: 'map', label: 'Map', icon: '🗺️' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCurrentTab(tab.key as any)}
            style={{
              flex: 1,
              padding: '1rem',
              border: 'none',
              background: currentTab === tab.key ? '#667eea' : 'transparent',
              color: currentTab === tab.key ? 'white' : '#666',
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {error && (
          <div style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #ffcdd2'
          }}>
            {error}
          </div>
        )}

        {currentTab === 'planner' && (
          <ItineraryPlanner
            onCreateItinerary={handleCreateItinerary}
            itinerary={itinerary}
            isLoading={isLoading}
            isMobile={true}
          />
        )}

        {currentTab === 'search' && (
          <LocationSearch
            onSearch={handlePlaceSearch}
            nearbyPlaces={nearbyPlaces}
            currentLocation={currentLocation}
            isMobile={true}
          />
        )}

        {currentTab === 'map' && (
          <RouteMap
            itinerary={itinerary}
            currentLocation={currentLocation}
            nearbyPlaces={nearbyPlaces}
            isMobile={true}
          />
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 1000
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Creating your itinerary...
          </p>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
};
