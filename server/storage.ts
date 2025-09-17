import { type User, type UserPreferences, type InsertUserPreferences, type Itinerary, type InsertItinerary, type Place, type InsertPlace } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: { username: string; password: string }): Promise<User>;
  
  // User preferences
  getUserPreferences(sessionId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(sessionId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined>;
  
  // Itineraries
  getItinerary(sessionId: string): Promise<Itinerary | undefined>;
  createItinerary(itinerary: InsertItinerary): Promise<Itinerary>;
  updateItinerary(sessionId: string, itinerary: Partial<InsertItinerary>): Promise<Itinerary | undefined>;
  
  // Places cache
  getPlace(fsqPlaceId: string): Promise<Place | undefined>;
  createPlace(place: InsertPlace): Promise<Place>;
  updatePlace(fsqPlaceId: string, place: Partial<InsertPlace>): Promise<Place | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userPreferences: Map<string, UserPreferences>;
  private itineraries: Map<string, Itinerary>;
  private places: Map<string, Place>;

  constructor() {
    this.users = new Map();
    this.userPreferences = new Map();
    this.itineraries = new Map();
    this.places = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(userData: { username: string; password: string }): Promise<User> {
    const id = randomUUID();
    const user: User = { ...userData, id };
    this.users.set(id, user);
    return user;
  }

  async getUserPreferences(sessionId: string): Promise<UserPreferences | undefined> {
    return Array.from(this.userPreferences.values()).find(
      (prefs) => prefs.sessionId === sessionId
    );
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const id = randomUUID();
    const userPrefs: UserPreferences = {
      id,
      sessionId: preferences.sessionId,
      interests: preferences.interests,
      duration: preferences.duration,
      budget: preferences.budget,
      dietaryRestrictions: preferences.dietaryRestrictions,
      transportation: preferences.transportation,
      location: preferences.location || null,
      createdAt: new Date(),
    };
    this.userPreferences.set(id, userPrefs);
    return userPrefs;
  }

  async updateUserPreferences(sessionId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const existing = await this.getUserPreferences(sessionId);
    if (!existing) return undefined;

    const updated: UserPreferences = {
      ...existing,
      ...preferences,
    };
    this.userPreferences.set(existing.id, updated);
    return updated;
  }

  async getItinerary(sessionId: string): Promise<Itinerary | undefined> {
    return Array.from(this.itineraries.values()).find(
      (itinerary) => itinerary.sessionId === sessionId
    );
  }

  async createItinerary(itinerary: InsertItinerary): Promise<Itinerary> {
    const id = randomUUID();
    const newItinerary: Itinerary = {
      id,
      sessionId: itinerary.sessionId,
      places: itinerary.places,
      totalDuration: itinerary.totalDuration,
      totalDistance: itinerary.totalDistance,
      optimizedRoute: itinerary.optimizedRoute || null,
      routeGeometry: itinerary.routeGeometry || null, // <-- Add geometry
      // @ts-ignore store osrmInstructions if provided
      osrmInstructions: (itinerary as any).osrmInstructions || null,
      multiDay: (itinerary as any).multiDay || null, // <-- store multi-day
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
    this.itineraries.set(id, newItinerary);
    return newItinerary;
  }

  async updateItinerary(sessionId: string, itinerary: Partial<InsertItinerary>): Promise<Itinerary | undefined> {
    const existing = await this.getItinerary(sessionId);
    if (!existing) return undefined;

    const updated: Itinerary = {
      ...existing,
      places: itinerary.places || existing.places,
      totalDuration: itinerary.totalDuration || existing.totalDuration,
      totalDistance: itinerary.totalDistance || existing.totalDistance,
      optimizedRoute: itinerary.optimizedRoute || existing.optimizedRoute,
      routeGeometry: itinerary.routeGeometry || existing.routeGeometry, // <-- Add geometry
      // @ts-ignore
      osrmInstructions: (itinerary as any).osrmInstructions ?? (existing as any).osrmInstructions ?? null,
      multiDay: (itinerary as any).multiDay ?? existing.multiDay, // <-- update multi-day
      updatedAt: new Date(),
    } as any;
    this.itineraries.set(existing.id, updated);
    return updated;
  }

  async getPlace(fsqPlaceId: string): Promise<Place | undefined> {
    return Array.from(this.places.values()).find(
      (place) => place.fsqPlaceId === fsqPlaceId
    );
  }

  async createPlace(place: InsertPlace): Promise<Place> {
    const id = randomUUID();
    const newPlace: Place = {
      id,
      fsqPlaceId: place.fsqPlaceId,
      name: place.name,
      category: place.category,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating || null,
      priceLevel: place.priceLevel || null,
      address: place.address || null,
      description: place.description || null,
      photoUrl: place.photoUrl || null,
      website: place.website || null,
      phone: place.phone || null,
      openingHours: place.openingHours || null,
      lastUpdated: new Date(),
    };
    this.places.set(id, newPlace);
    return newPlace;
  }

  async updatePlace(fsqPlaceId: string, place: Partial<InsertPlace>): Promise<Place | undefined> {
    const existing = await this.getPlace(fsqPlaceId);
    if (!existing) return undefined;

    const updated: Place = {
      ...existing,
      ...place,
      lastUpdated: new Date(),
    };
    this.places.set(existing.id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
