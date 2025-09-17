import polyline from '@mapbox/polyline';

export interface OSRMStep {
  distance: number; // meters
  duration: number; // seconds
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
    location?: [number, number];
  };
}

export interface OSRMLeg {
  distance: number;
  duration: number;
  steps?: OSRMStep[];
}

export interface OSRMRoute {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: string; // polyline
  legs?: OSRMLeg[];
}

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints: Array<{
    location: [number, number];
    name: string;
  }>;
  // Augmented fields
  decodedGeometry?: Array<{ lat: number; lng: number }>;
  instructionsByLeg?: string[][];
}

export interface RouteOptimizationResult {
  optimizedOrder: number[];
  totalDistance: number; // in kilometers
  totalDuration: number; // in minutes
  routes: Array<{
    from: number;
    to: number;
    distance: number; // in kilometers
    duration: number; // in minutes
  }>;
}

const OSRM_BASE_URL = "https://router.project-osrm.org";

function metersToText(meters: number): string {
  if (!isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function stepToText(step: OSRMStep): string {
  const t = step.maneuver?.type || '';
  const m = step.maneuver?.modifier || '';
  const road = step.name || 'road';
  const dist = metersToText(step.distance);
  const withDist = dist ? ` for ${dist}` : '';
  switch (t) {
    case 'depart':
      return `Head ${m || 'out'} on ${road}${withDist}`;
    case 'arrive':
      return `Arrive at destination on ${road}`;
    case 'turn':
      return `Turn ${m || ''} onto ${road}${withDist}`.replace(/\s+/g, ' ').trim();
    case 'continue':
      return `Continue on ${road}${withDist}`;
    case 'fork':
      return `Keep ${m || 'to the indicated side'} onto ${road}${withDist}`.replace(/\s+/g, ' ').trim();
    case 'merge':
      return `Merge ${m ? m + ' ' : ''}onto ${road}${withDist}`.replace(/\s+/g, ' ').trim();
    case 'roundabout':
      return `Take the roundabout onto ${road}${withDist}`;
    case 'new name':
      return `Continue onto ${road}${withDist}`;
    case 'end of road':
      return `At the end of the road, turn ${m || ''} onto ${road}${withDist}`.replace(/\s+/g, ' ').trim();
    case 'use lane':
      return `Use the ${m || ''} lane${withDist}`.replace(/\s+/g, ' ').trim();
    case 'on ramp':
      return `Take the ramp ${m || ''} onto ${road}${withDist}`.replace(/\s+/g, ' ').trim();
    case 'off ramp':
      return `Take the exit ${m || ''} onto ${road}${withDist}`.replace(/\s+/g, ' ').trim();
    case 'uturn':
      return `Make a U-turn onto ${road}${withDist}`;
    default:
      return `${t || 'Proceed'} on ${road}${withDist}`.trim();
  }
}

export class OSRMService {
  async getRoute(coordinates: Array<[number, number]>, profile: string = "foot"): Promise<OSRMResponse> {
    try {
      const coordString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
      const url = `${OSRM_BASE_URL}/route/v1/${profile}/${coordString}?overview=full&geometries=polyline&steps=true`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }
      const result: OSRMResponse = await response.json();
      // Decode polyline geometry to array of lat/lng
      if (result.routes && result.routes[0]?.geometry) {
        const decoded = polyline.decode(result.routes[0].geometry).map((point: [number, number]) => ({ lat: point[0], lng: point[1] }));
        result.decodedGeometry = decoded;
      }
      // Build human-readable instructions per leg if steps are present
      const legs = result.routes?.[0]?.legs;
      if (Array.isArray(legs)) {
        result.instructionsByLeg = legs.map((leg) =>
          (leg.steps || []).map((s: any) => stepToText(s as OSRMStep))
        );
      } else {
        result.instructionsByLeg = [];
      }
      return result;
    } catch (error) {
      console.error('Error getting route:', error);
      throw new Error(`Failed to get route: ${error}`);
    }
  }

  async optimizeRoute(
    coordinates: Array<[number, number]>, 
    profile: string = "foot"
  ): Promise<RouteOptimizationResult> {
    try {
      // For optimization, we'll use the trip service
      const coordString = coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
      const url = `${OSRM_BASE_URL}/trip/v1/${profile}/${coordString}?source=first&destination=last&roundtrip=false`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.trips || data.trips.length === 0) {
        throw new Error('No trips found in OSRM response');
      }

      const trip = data.trips[0];
      const optimizedOrder = data.waypoints.map((wp: any) => wp.waypoint_index);

      // Get individual route segments
      const routes = [] as RouteOptimizationResult['routes'];
      for (let i = 0; i < coordinates.length - 1; i++) {
        const segmentCoords = [coordinates[i], coordinates[i + 1]] as Array<[number, number]> ;
        const segmentRoute = await this.getRoute(segmentCoords, profile);
        
        if (segmentRoute.routes && segmentRoute.routes.length > 0) {
          routes.push({
            from: i,
            to: i + 1,
            distance: segmentRoute.routes[0].distance / 1000, // convert to km
            duration: segmentRoute.routes[0].duration / 60, // convert to minutes
          });
        }
      }

      return {
        optimizedOrder,
        totalDistance: trip.distance / 1000, // convert to km
        totalDuration: trip.duration / 60, // convert to minutes
        routes,
      };
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw new Error(`Failed to optimize route: ${error}`);
    }
  }

  async calculateTravelTime(
    from: [number, number],
    to: [number, number],
    profile: string = "foot"
  ): Promise<{ distance: number; duration: number }> {
    try {
      const route = await this.getRoute([from, to], profile);
      
      if (!route.routes || route.routes.length === 0) {
        throw new Error('No route found');
      }

      return {
        distance: route.routes[0].distance / 1000, // convert to km
        duration: route.routes[0].duration / 60, // convert to minutes
      };
    } catch (error) {
      console.error('Error calculating travel time:', error);
      return { distance: 0, duration: 0 };
    }
  }

  getProfileFromTransportation(transportation: string): string {
    switch (transportation.toLowerCase()) {
      case 'driving':
        return 'driving';
      case 'cycling':
        return 'bicycle';
      case 'walking':
      default:
        return 'foot';
    }
  }
}

export const osrmService = new OSRMService();
