import { Geolocation, PermissionStatus, Position } from '@capacitor/geolocation';

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export class GeolocationService {
  private static instance: GeolocationService;
  private watchId: string | null = null;
  private currentPosition: Position | null = null;

  private constructor() {}

  public static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Check if geolocation permissions are granted
   */
  public async checkPermissions(): Promise<PermissionStatus> {
    try {
      const status = await Geolocation.checkPermissions();
      return status;
    } catch (error) {
      console.error('Error checking geolocation permissions:', error);
      throw new Error('Failed to check location permissions');
    }
  }

  /**
   * Request geolocation permissions
   */
  public async requestPermissions(): Promise<PermissionStatus> {
    try {
      const status = await Geolocation.requestPermissions();
      return status;
    } catch (error) {
      console.error('Error requesting geolocation permissions:', error);
      throw new Error('Failed to request location permissions');
    }
  }

  /**
   * Get current position
   */
  public async getCurrentPosition(options?: LocationOptions): Promise<Position> {
    try {
      // Check permissions first
      const permissions = await this.checkPermissions();
      
      if (permissions.location !== 'granted') {
        const requestResult = await this.requestPermissions();
        if (requestResult.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 3600000 // 1 hour
      });

      this.currentPosition = position;
      return position;
    } catch (error: any) {
      console.error('Error getting current position:', error);
      
      // Handle specific error codes
      if (error.code === 1) {
        throw new Error('Location access denied by user');
      } else if (error.code === 2) {
        throw new Error('Location unavailable');
      } else if (error.code === 3) {
        throw new Error('Location request timed out');
      } else {
        throw new Error('Failed to get location: ' + error.message);
      }
    }
  }

  /**
   * Watch position changes
   */
  public async watchPosition(
    callback: (position: Position) => void,
    errorCallback?: (error: LocationError) => void,
    options?: LocationOptions
  ): Promise<string> {
    try {
      // Check permissions first
      const permissions = await this.checkPermissions();
      
      if (permissions.location !== 'granted') {
        const requestResult = await this.requestPermissions();
        if (requestResult.location !== 'granted') {
          throw new Error('Location permission denied');
        }
      }

      const watchId = await Geolocation.watchPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 3600000
      }, (position, err) => {
        if (err) {
          console.error('Error watching position:', err);
          if (errorCallback) {
            errorCallback({
              code: err.code || 0,
              message: err.message || 'Unknown location error'
            });
          }
        } else if (position) {
          this.currentPosition = position;
          callback(position);
        }
      });

      this.watchId = watchId;
      return watchId;
    } catch (error: any) {
      console.error('Error setting up position watch:', error);
      throw new Error('Failed to start location watching: ' + error.message);
    }
  }

  /**
   * Stop watching position
   */
  public async clearWatch(watchId?: string): Promise<void> {
    try {
      const id = watchId || this.watchId;
      if (id) {
        await Geolocation.clearWatch({ id });
        if (id === this.watchId) {
          this.watchId = null;
        }
      }
    } catch (error) {
      console.error('Error clearing position watch:', error);
    }
  }

  /**
   * Get last known position
   */
  public getLastKnownPosition(): Position | null {
    return this.currentPosition;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  public calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Format distance for display
   */
  public formatDistance(kilometers: number): string {
    if (kilometers < 1) {
      return `${Math.round(kilometers * 1000)} m`;
    } else if (kilometers < 10) {
      return `${kilometers.toFixed(1)} km`;
    } else {
      return `${Math.round(kilometers)} km`;
    }
  }

  /**
   * Get address from coordinates (requires geocoding service)
   */
  public async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Using a free geocoding service (replace with your preferred service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      return data.display_name || data.locality || `${latitude}, ${longitude}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  /**
   * Check if location services are enabled
   */
  public async isLocationEnabled(): Promise<boolean> {
    try {
      const permissions = await this.checkPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Error checking if location is enabled:', error);
      return false;
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Convenience functions
export const geolocationService = GeolocationService.getInstance();

export const getCurrentPosition = (options?: LocationOptions): Promise<Position> => {
  return geolocationService.getCurrentPosition(options);
};

export const watchPosition = (
  callback: (position: Position) => void,
  errorCallback?: (error: LocationError) => void,
  options?: LocationOptions
): Promise<string> => {
  return geolocationService.watchPosition(callback, errorCallback, options);
};

export const clearWatch = (watchId?: string): Promise<void> => {
  return geolocationService.clearWatch(watchId);
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  return geolocationService.calculateDistance(lat1, lon1, lat2, lon2);
};

export const formatDistance = (kilometers: number): string => {
  return geolocationService.formatDistance(kilometers);
};

export const reverseGeocode = (latitude: number, longitude: number): Promise<string> => {
  return geolocationService.reverseGeocode(latitude, longitude);
};

export const isLocationEnabled = (): Promise<boolean> => {
  return geolocationService.isLocationEnabled();
};

// Location-based utilities for travel app
export const TravelLocationUtils = {
  /**
   * Find nearby places within radius
   */
  findNearbyPlaces: (
    userLat: number,
    userLon: number,
    places: Array<{ latitude: number; longitude: number; [key: string]: any }>,
    radiusKm: number = 5
  ) => {
    return places.filter(place => {
      const distance = calculateDistance(userLat, userLon, place.latitude, place.longitude);
      return distance <= radiusKm;
    }).sort((a, b) => {
      const distanceA = calculateDistance(userLat, userLon, a.latitude, a.longitude);
      const distanceB = calculateDistance(userLat, userLon, b.latitude, b.longitude);
      return distanceA - distanceB;
    });
  },

  /**
   * Get user's current city/region
   */
  getCurrentLocation: async (): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  }> => {
    const position = await getCurrentPosition();
    const address = await reverseGeocode(
      position.coords.latitude,
      position.coords.longitude
    );
    
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      address
    };
  }
};
