import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation as CapGeolocation } from '@capacitor/geolocation';

interface GeolocationState {
  loading: boolean;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  timestamp: number | null;
  error: string | null;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export const useGeolocation = (options: GeolocationOptions = {}) => {
  const [location, setLocation] = useState<GeolocationState>({
    loading: true,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    latitude: null,
    longitude: null,
    speed: null,
    timestamp: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const setErr = (msg: string) => {
      if (cancelled) return;
      setLocation(prev => ({ ...prev, loading: false, error: msg }));
    };

    const applyPosition = (coords: {
      latitude: number;
      longitude: number;
      accuracy?: number | null;
      altitude?: number | null;
      altitudeAccuracy?: number | null;
      heading?: number | null;
      speed?: number | null;
    }, timestamp: number) => {
      if (cancelled) return;
      setLocation({
        loading: false,
        accuracy: coords.accuracy ?? null,
        altitude: coords.altitude ?? null,
        altitudeAccuracy: coords.altitudeAccuracy ?? null,
        heading: coords.heading ?? null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed: coords.speed ?? null,
        timestamp,
        error: null,
      });
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 300000, // 5 minutes
    };

    const useCapacitor = Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || '');

    const run = async () => {
      try {
        if (useCapacitor) {
          // Request permission first
          const perm = await CapGeolocation.checkPermissions();
          if (perm.location !== 'granted') {
            const req = await CapGeolocation.requestPermissions();
            if (req.location !== 'granted') {
              return setErr('Location permission denied');
            }
          }
          const pos = await CapGeolocation.getCurrentPosition({ enableHighAccuracy: geoOptions.enableHighAccuracy });
          return applyPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy as any,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          }, pos.timestamp || Date.now());
        }

        // Fallback to browser geolocation
        if (!navigator.geolocation) {
          return setErr('Geolocation is not supported by this browser.');
        }
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const { coords, timestamp } = position;
            applyPosition({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              altitude: coords.altitude,
              altitudeAccuracy: coords.altitudeAccuracy,
              heading: coords.heading,
              speed: coords.speed,
            }, timestamp);
          },
          (error: GeolocationPositionError) => setErr(error.message),
          geoOptions
        );
      } catch (e: any) {
        setErr(e?.message || 'Failed to get location');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge]);

  const getCurrentPosition = () => {
    const useCapacitor = Capacitor.isNativePlatform?.() || ['android', 'ios'].includes(Capacitor.getPlatform?.() || '');

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    return new Promise<GeolocationPosition>((resolve, reject) => {
      (async () => {
        try {
          if (useCapacitor) {
            const perm = await CapGeolocation.checkPermissions();
            if (perm.location !== 'granted') {
              const req = await CapGeolocation.requestPermissions();
              if (req.location !== 'granted') throw new Error('Location permission denied');
            }
            const pos = await CapGeolocation.getCurrentPosition({ enableHighAccuracy: options.enableHighAccuracy ?? true });
            setLocation(prev => ({ ...prev, loading: false }));
            // Create a GeolocationPosition-like object
            resolve({
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy ?? null as any,
                altitude: pos.coords.altitude ?? null,
                altitudeAccuracy: pos.coords.altitudeAccuracy as any,
                heading: pos.coords.heading ?? null,
                speed: pos.coords.speed ?? null,
              } as any,
              timestamp: pos.timestamp || Date.now(),
            } as GeolocationPosition);
            return;
          }

          if (!navigator.geolocation) throw new Error('Geolocation is not supported');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { coords, timestamp } = position;
              setLocation({
                loading: false,
                accuracy: coords.accuracy,
                altitude: coords.altitude,
                altitudeAccuracy: coords.altitudeAccuracy,
                heading: coords.heading,
                latitude: coords.latitude,
                longitude: coords.longitude,
                speed: coords.speed,
                timestamp,
                error: null,
              });
              resolve(position);
            },
            (error) => {
              setLocation(prev => ({ ...prev, loading: false, error: error.message }));
              reject(error);
            },
            {
              enableHighAccuracy: options.enableHighAccuracy ?? true,
              timeout: options.timeout ?? 15000,
              maximumAge: options.maximumAge ?? 300000,
            }
          );
        } catch (err: any) {
          setLocation(prev => ({ ...prev, loading: false, error: err?.message || 'Failed to get location' }));
          reject(err);
        }
      })();
    });
  };

  return {
    ...location,
    getCurrentPosition,
  };
};
