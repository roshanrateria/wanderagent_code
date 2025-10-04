import React, { useState, useEffect } from 'react';
import { ItineraryResponse } from '../services/GeminiService';
import { Place } from '../services/FoursquareService';
import { OSRMService, RoutePoint } from '../services/OSRMService';

interface RouteMapProps {
  itinerary: ItineraryResponse | null;
  currentLocation: { lat: number; lng: number } | null;
  nearbyPlaces: Place[];
  isMobile: boolean;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  itinerary,
  currentLocation,
  nearbyPlaces,
  isMobile
}) => {
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    steps: string[];
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const osrmService = new OSRMService();

  useEffect(() => {
    if (itinerary && currentLocation) {
      calculateDayRoute(1);
    }
  }, [itinerary, currentLocation]);

  const calculateDayRoute = async (dayNumber: number) => {
    if (!itinerary || !currentLocation) return;

    const day = itinerary.days.find(d => d.day === dayNumber);
    if (!day) return;

    setIsCalculating(true);
    try {
      // Create route points from day activities
      const routePoints: RoutePoint[] = [
        {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          name: 'Your Location'
        },
        ...day.activities.map((activity, index) => ({
          latitude: currentLocation.lat + (Math.random() - 0.5) * 0.01, // Mock coordinates
          longitude: currentLocation.lng + (Math.random() - 0.5) * 0.01, // In real app, geocode activity.location
          name: activity.title
        }))
      ];

      const route = await osrmService.optimizeRoute(routePoints, 'driving');
      if (route) {
        setSelectedRoute(route);
        setRouteInfo({
          distance: osrmService.formatDistance(route.distance),
          duration: osrmService.formatDuration(route.duration),
          steps: route.steps.map(step => step.instruction)
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const containerStyle = {
    maxWidth: isMobile ? '100%' : '800px',
    margin: isMobile ? '0' : '0 auto'
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginBottom: '1rem'
  };

  return (
    <div style={containerStyle}>
      {/* Map Placeholder */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Interactive Map</h3>
        
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Map Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 60% 60%, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 80% 30%, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
          
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>
              Interactive Map View
            </h4>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
              {currentLocation 
                ? `Current Location: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                : 'Location services required for map features'
              }
            </p>
          </div>
        </div>

        {!currentLocation && (
          <div style={{
            background: '#fff3cd',
            color: '#856404',
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            📍 Enable location services to use map features and get directions
          </div>
        )}
      </div>

      {/* Route Information */}
      {itinerary && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
            Daily Routes
          </h3>

          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            {itinerary.days.map((day) => (
              <button
                key={day.day}
                onClick={() => calculateDayRoute(day.day)}
                disabled={isCalculating}
                style={{
                  flex: isMobile ? '1' : 'none',
                  padding: '0.5rem 1rem',
                  border: `2px solid ${selectedRoute ? '#667eea' : '#e0e0e0'}`,
                  background: selectedRoute ? '#667eea' : 'white',
                  color: selectedRoute ? 'white' : '#666',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  cursor: isCalculating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isCalculating ? 0.7 : 1
                }}
              >
                Day {day.day}
              </button>
            ))}
          </div>

          {isCalculating && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#666',
              padding: '1rem'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Calculating optimal route...
            </div>
          )}

          {routeInfo && !isCalculating && (
            <div style={{
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '1.5rem', color: '#667eea', fontWeight: 'bold' }}>
                    {routeInfo.distance}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Distance</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', color: '#667eea', fontWeight: 'bold' }}>
                    {routeInfo.duration}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Duration</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', color: '#667eea', fontWeight: 'bold' }}>
                    {routeInfo.steps.length}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Stops</div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Route Directions</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {routeInfo.steps.map((step, index) => (
                  <div key={index} style={{
                    padding: '0.5rem',
                    borderLeft: '3px solid #667eea',
                    marginBottom: '0.5rem',
                    background: 'white',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    <span style={{ fontWeight: 'bold', color: '#667eea', marginRight: '0.5rem' }}>
                      {index + 1}.
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nearby Places Quick View */}
      {nearbyPlaces.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
            Nearby Places on Map
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: '1rem'
          }}>
            {nearbyPlaces.slice(0, 6).map((place, index) => (
              <div key={place.id || index} style={{
                background: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '0.75rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  marginBottom: '0.5rem'
                }}>
                  {place.category.includes('food') || place.category.includes('restaurant') ? '🍽️' :
                   place.category.includes('hotel') ? '🏨' :
                   place.category.includes('shop') ? '🛍️' :
                   place.category.includes('museum') ? '🏛️' : '📍'}
                </div>
                <h5 style={{
                  margin: '0 0 0.25rem 0',
                  fontSize: '0.9rem',
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {place.name}
                </h5>
                <p style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {place.category}
                </p>
                {place.rating && (
                  <div style={{
                    marginTop: '0.25rem',
                    fontSize: '0.8rem',
                    color: '#4caf50',
                    fontWeight: 'bold'
                  }}>
                    ⭐ {place.rating}
                  </div>
                )}
              </div>
            ))}
          </div>

          {nearbyPlaces.length > 6 && (
            <p style={{
              textAlign: 'center',
              color: '#666',
              fontSize: '0.9rem',
              margin: '1rem 0 0 0'
            }}>
              And {nearbyPlaces.length - 6} more places nearby...
            </p>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
