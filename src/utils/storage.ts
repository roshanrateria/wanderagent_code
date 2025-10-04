// Polyfill for Storage without Capacitor dependency
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

export interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export class AppStorage {
  private static instance: AppStorage;

  private constructor() {}

  public static getInstance(): AppStorage {
    if (!AppStorage.instance) {
      AppStorage.instance = new AppStorage();
    }
    return AppStorage.instance;
  }

  /**
   * Store data with optional expiration
   */
  public async set<T>(key: string, data: T, expirationHours?: number): Promise<void> {
    const item: StorageItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: expirationHours ? Date.now() + (expirationHours * 60 * 60 * 1000) : undefined
    };

    try {
      await Storage.set({
        key,
        value: JSON.stringify(item)
      });
    } catch (error) {
      console.error(`Failed to store data for key ${key}:`, error);
      throw new Error(`Failed to store data: ${error}`);
    }
  }

  /**
   * Get stored data
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const result = await Storage.get({ key });
      
      if (!result.value) {
        return null;
      }

      const item: StorageItem<T> = JSON.parse(result.value);
      
      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.remove(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error(`Failed to retrieve data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove stored data
   */
  public async remove(key: string): Promise<void> {
    try {
      await Storage.remove({ key });
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
    }
  }

  /**
   * Check if key exists and is not expired
   */
  public async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Get all keys
   */
  public async getKeys(): Promise<string[]> {
    try {
      const result = await Storage.keys();
      return result.keys;
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      return [];
    }
  }

  /**
   * Clear all stored data
   */
  public async clear(): Promise<void> {
    try {
      await Storage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Get storage info
   */
  public async getStorageInfo(): Promise<{
    totalKeys: number;
    expiredKeys: number;
    validKeys: number;
  }> {
    const keys = await this.getKeys();
    let expiredKeys = 0;
    let validKeys = 0;

    for (const key of keys) {
      const data = await this.get(key);
      if (data === null) {
        expiredKeys++;
      } else {
        validKeys++;
      }
    }

    return {
      totalKeys: keys.length,
      expiredKeys,
      validKeys
    };
  }

  /**
   * Clean up expired data
   */
  public async cleanup(): Promise<number> {
    const keys = await this.getKeys();
    let cleanedCount = 0;

    for (const key of keys) {
      const data = await this.get(key);
      if (data === null) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Convenience functions for common operations
export const storage = AppStorage.getInstance();

// Specific storage helpers for the travel app
export const TravelStorage = {
  // Itinerary storage
  saveItinerary: async (itinerary: any) => {
    await storage.set('current_itinerary', itinerary, 24); // Expire after 24 hours
  },

  getItinerary: async () => {
    return await storage.get('current_itinerary');
  },

  // User preferences
  savePreferences: async (preferences: any) => {
    await storage.set('user_preferences', preferences); // No expiration
  },

  getPreferences: async () => {
    return await storage.get('user_preferences');
  },

  // Search history
  saveSearchHistory: async (searches: string[]) => {
    const maxHistory = 10;
    const limitedSearches = searches.slice(-maxHistory);
    await storage.set('search_history', limitedSearches, 24 * 7); // Expire after 1 week
  },

  getSearchHistory: async (): Promise<string[]> => {
    const history = await storage.get<string[]>('search_history');
    return history || [];
  },

  addToSearchHistory: async (search: string) => {
    const currentHistory = await TravelStorage.getSearchHistory();
    const updatedHistory = [search, ...currentHistory.filter(s => s !== search)];
    await TravelStorage.saveSearchHistory(updatedHistory);
  },

  // Favorite places
  saveFavorites: async (favorites: any[]) => {
    await storage.set('favorite_places', favorites);
  },

  getFavorites: async (): Promise<any[]> => {
    const favorites = await storage.get<any[]>('favorite_places');
    return favorites || [];
  },

  addToFavorites: async (place: any) => {
    const favorites = await TravelStorage.getFavorites();
    const updatedFavorites = [...favorites, { ...place, favorited_at: Date.now() }];
    await TravelStorage.saveFavorites(updatedFavorites);
  },

  removeFromFavorites: async (placeId: string) => {
    const favorites = await TravelStorage.getFavorites();
    const updatedFavorites = favorites.filter(fav => fav.id !== placeId);
    await TravelStorage.saveFavorites(updatedFavorites);
  },

  // Offline cache
  cacheApiResponse: async (cacheKey: string, data: any, expirationHours = 2) => {
    await storage.set(`cache_${cacheKey}`, data, expirationHours);
  },

  getCachedResponse: async (cacheKey: string) => {
    return await storage.get(`cache_${cacheKey}`);
  }
};
