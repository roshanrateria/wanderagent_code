import { MobileApiService } from './MobileApiService';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  geometry: number[][];
}

export interface Route {
  distance: number;
  duration: number;
  geometry: number[][];
  steps: RouteStep[];
}

export interface DirectionsRequest {
  points: RoutePoint[];
  profile?: 'driving' | 'walking' | 'cycling';
  alternatives?: boolean;
  steps?: boolean;
  geometries?: 'polyline' | 'geojson';
}

export interface DirectionsResponse {
  routes: Route[];
  waypoints: RoutePoint[];
}

export class OSRMService {
  private apiService: MobileApiService;
  private baseUrl: string;

  constructor() {
    this.apiService = MobileApiService.getInstance();
    this.baseUrl = 'https://router.project-osrm.org';
  }

  public async getDirections(request: DirectionsRequest): Promise<DirectionsResponse> {
    if (!request.points || request.points.length < 2) {
      throw new Error('At least 2 points are required for directions');
    }

    const profile = request.profile || 'driving';
    const coordinates = request.points
      .map(point => `${point.longitude},${point.latitude}`)
      .join(';');

    const url = new URL(`${this.baseUrl}/route/v1/${profile}/${coordinates}`);
    
    // Add query parameters
    url.searchParams.append('overview', 'full');
    url.searchParams.append('geometries', request.geometries || 'geojson');
    
    if (request.steps !== false) {
      url.searchParams.append('steps', 'true');
    }
    
    if (request.alternatives) {
      url.searchParams.append('alternatives', 'true');
    }

    const cacheKey = `osrm_directions_${url.toString()}`;

    try {
      const response = await this.apiService.makeRequest<any>(
        url.toString(),
        {},
        cacheKey
      );

      if (response.code !== 'Ok') {
        throw new Error(`OSRM API error: ${response.code}`);
      }

      return this.parseDirectionsResponse(response, request.points);
    } catch (error) {
      console.error('Error getting directions:', error);
      throw new Error('Failed to get directions. Please try again.');
    }
  }

  public async getRoute(
    start: RoutePoint,
    end: RoutePoint,
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<Route | null> {
    try {
      const response = await this.getDirections({
        points: [start, end],
        profile,
        steps: true,
        alternatives: false
      });

      return response.routes[0] || null;
    } catch (error) {
      console.error('Error getting route:', error);
      return null;
    }
  }

  public async getMatrix(
    sources: RoutePoint[],
    destinations?: RoutePoint[],
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<{ distances: number[][]; durations: number[][] }> {
    const coords = destinations ? [...sources, ...destinations] : sources;
    const coordinates = coords
      .map(point => `${point.longitude},${point.latitude}`)
      .join(';');

    const url = new URL(`${this.baseUrl}/table/v1/${profile}/${coordinates}`);
    
    if (destinations) {
      const sourceIndices = sources.map((_, i) => i).join(';');
      const destIndices = destinations.map((_, i) => i + sources.length).join(';');
      url.searchParams.append('sources', sourceIndices);
      url.searchParams.append('destinations', destIndices);
    }

    const cacheKey = `osrm_matrix_${url.toString()}`;

    try {
      const response = await this.apiService.makeRequest<any>(
        url.toString(),
        {},
        cacheKey
      );

      if (response.code !== 'Ok') {
        throw new Error(`OSRM API error: ${response.code}`);
      }

      return {
        distances: response.distances || [],
        durations: response.durations || []
      };
    } catch (error) {
      console.error('Error getting matrix:', error);
      throw new Error('Failed to get distance matrix. Please try again.');
    }
  }

  public async optimizeRoute(points: RoutePoint[], profile: 'driving' | 'walking' | 'cycling' = 'driving'): Promise<Route | null> {
    if (points.length < 3) {
      // For less than 3 points, just return regular route
      if (points.length === 2) {
        return this.getRoute(points[0], points[1], profile);
      }
      return null;
    }

    const coordinates = points
      .map(point => `${point.longitude},${point.latitude}`)
      .join(';');

    const url = new URL(`${this.baseUrl}/trip/v1/${profile}/${coordinates}`);
    url.searchParams.append('overview', 'full');
    url.searchParams.append('geometries', 'geojson');
    url.searchParams.append('steps', 'true');

    const cacheKey = `osrm_trip_${url.toString()}`;

    try {
      const response = await this.apiService.makeRequest<any>(
        url.toString(),
        {},
        cacheKey
      );

      if (response.code !== 'Ok') {
        throw new Error(`OSRM API error: ${response.code}`);
      }

      const trip = response.trips?.[0];
      if (!trip) {
        return null;
      }

      return {
        distance: trip.distance,
        duration: trip.duration,
        geometry: trip.geometry?.coordinates || [],
        steps: trip.legs?.flatMap((leg: any) => leg.steps || []).map(this.parseStep) || []
      };
    } catch (error) {
      console.error('Error optimizing route:', error);
      return null;
    }
  }

  private parseDirectionsResponse(response: any, originalPoints: RoutePoint[]): DirectionsResponse {
    const routes = response.routes?.map((route: any) => ({
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry?.coordinates || [],
      steps: route.legs?.flatMap((leg: any) => leg.steps || []).map(this.parseStep) || []
    })) || [];

    return {
      routes,
      waypoints: response.waypoints?.map((waypoint: any, index: number) => ({
        latitude: waypoint.location[1],
        longitude: waypoint.location[0],
        name: originalPoints[index]?.name
      })) || originalPoints
    };
  }

  private parseStep = (step: any): RouteStep => ({
    instruction: step.maneuver?.instruction || 'Continue',
    distance: step.distance || 0,
    duration: step.duration || 0,
    geometry: step.geometry?.coordinates || []
  });

  public formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }

  public formatDuration(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}
