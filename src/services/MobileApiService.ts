import { Http as CapacitorHttp } from '@capacitor-community/http';
import { Capacitor } from '@capacitor/core';

// Polyfill for Network and Storage without Capacitor dependencies
const Network = {
  async getStatus() {
    return {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none'
    };
  },
  addListener: (event: string, callback: Function) => {
    if (event === 'networkStatusChange') {
      window.addEventListener('online', () => callback({ connected: true }));
      window.addEventListener('offline', () => callback({ connected: false }));
    }
    return { remove: () => {} };
  }
};

const Storage = {
  async get(options: { key: string }) {
    return { value: localStorage.getItem(options.key) };
  },
  async set(options: { key: string; value: string }) {
    localStorage.setItem(options.key, options.value);
  },
  async remove(options: { key: string }) {
    localStorage.removeItem(options.key);
  },
  async clear() {
    localStorage.clear();
  },
  async keys() {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return { keys };
  }
};

export class MobileApiService {
  private static instance: MobileApiService;
  private networkStatus: boolean = true;

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  public static getInstance(): MobileApiService {
    if (!MobileApiService.instance) {
      MobileApiService.instance = new MobileApiService();
    }
    return MobileApiService.instance;
  }

  private async initializeNetworkMonitoring() {
    try {
      const status = await Network.getStatus();
      this.networkStatus = status.connected;

      Network.addListener('networkStatusChange', (status) => {
        this.networkStatus = status.connected;
      });
    } catch (error) {
      console.warn('Network monitoring not available:', error);
    }
  }

  public isOnline(): boolean {
    return this.networkStatus;
  }

  public async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<T> {
    // Try to get cached data first if offline
    if (!this.networkStatus && cacheKey) {
      const cachedData = await this.getCachedData<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Use Capacitor HTTP plugin on mobile platforms
    const isNative = typeof Capacitor !== 'undefined' && (Capacitor.isNativePlatform?.() || ['android','ios'].includes(Capacitor.getPlatform?.() || ''));
    
    if (isNative && typeof CapacitorHttp !== 'undefined') {
      try {
        const method = (options.method || 'GET').toUpperCase();
        const requestConfig: any = { 
          method, 
          url, 
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          }
        };
        
        if (method !== 'GET' && options.body) {
          requestConfig.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        }

        const response = await CapacitorHttp.request(requestConfig);
        
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

        // Cache successful responses
        if (cacheKey && this.networkStatus) {
          await this.cacheData(cacheKey, data);
        }

        return data;
      } catch (capacitorError) {
        console.warn('Capacitor HTTP failed, falling back to fetch:', capacitorError);
        // Fall through to fetch fallback
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache successful responses
      if (cacheKey && this.networkStatus) {
        await this.cacheData(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Return cached data if available
      if (cacheKey) {
        const cachedData = await this.getCachedData<T>(cacheKey);
        if (cachedData) {
          console.log('Returning cached data due to network error');
          return cachedData;
        }
      }

      throw error;
    }
  }

  private async cacheData(key: string, data: any): Promise<void> {
    try {
      await Storage.set({
        key: `cache_${key}`,
        value: JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const result = await Storage.get({ key: `cache_${key}` });
      if (result.value) {
        const cached = JSON.parse(result.value);
        const isExpired = Date.now() - cached.timestamp > 24 * 60 * 60 * 1000; // 24 hours
        
        if (!isExpired) {
          return cached.data;
        } else {
          await Storage.remove({ key: `cache_${key}` });
        }
      }
    } catch (error) {
      console.error('Failed to get cached data:', error);
    }
    return null;
  }

  public async clearCache(): Promise<void> {
    try {
      const keys = await Storage.keys();
      const cacheKeys = keys.keys.filter(key => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        await Storage.remove({ key });
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}
