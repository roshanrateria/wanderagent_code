import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  interests: json("interests").$type<string[]>().notNull(),
  duration: text("duration").notNull(),
  budget: text("budget").notNull(),
  dietaryRestrictions: json("dietary_restrictions").$type<string[]>().notNull(),
  transportation: text("transportation").notNull(),
  location: json("location").$type<{ lat: number; lng: number; address?: string }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const itineraries = pgTable("itineraries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  places: json("places").$type<ItineraryPlace[]>().notNull(),
  totalDuration: integer("total_duration").notNull(), // in minutes
  totalDistance: real("total_distance").notNull(), // in kilometers
  optimizedRoute: json("optimized_route").$type<{ lat: number; lng: number }[]>(),
  routeGeometry: json("route_geometry").$type<{ lat: number; lng: number }[]>(), // <-- Add geometry
  osrmInstructions: json("osrm_instructions").$type<string[][] | null>(), // <-- Persist OSRM turn-by-turn
  multiDay: json("multi_day").$type<any>(), // <-- Persist multi-day structure for editing
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const places = pgTable("places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fsqPlaceId: text("fsq_place_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  rating: real("rating"),
  priceLevel: integer("price_level"),
  address: text("address"),
  description: text("description"),
  photoUrl: text("photo_url"),
  website: text("website"),
  phone: text("phone"),
  openingHours: json("opening_hours"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Types for the application
export interface ItineraryPlace {
  fsqPlaceId: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  rating?: number;
  priceLevel?: number;
  address?: string;
  description?: string;
  photoUrl?: string;
  website?: string;
  tel?: string;
  social_media?: any;
  placemaker_url?: string;
  estimatedDuration: number; // in minutes
  travelTimeToNext?: number; // in minutes
  distanceToNext?: number; // in kilometers
  scheduledTime?: string;
  order: number;
  reason?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface UserPreferencesData {
  interests: string[];
  duration: string;
  budget: string;
  dietaryRestrictions: string[];
  transportation: string;
  location?: UserLocation;
}

// Zod schemas
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
}).extend({
  interests: z.array(z.string()),
  dietaryRestrictions: z.array(z.string()),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }).optional(),
});

export const insertItinerarySchema = createInsertSchema(itineraries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  places: z.array(z.any()),
  optimizedRoute: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).optional(),
  routeGeometry: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).optional(), // <-- Add geometry to zod schema
  osrmInstructions: z.array(z.array(z.string())).optional(), // <-- Persist OSRM turn-by-turn
  multiDay: z.any().optional(), // <-- Allow multi-day
});

export const insertPlaceSchema = createInsertSchema(places).omit({
  id: true,
  lastUpdated: true,
}).extend({
  openingHours: z.any().optional(),
});

export const userPreferencesInputSchema = z.object({
  interests: z.array(z.string()).min(1, "Please select at least one interest"),
  duration: z.string().min(1, "Please select duration"),
  budget: z.string().min(1, "Please select budget"),
  dietaryRestrictions: z.array(z.string()),
  transportation: z.string().min(1, "Please select transportation"),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }).optional(),
});

export const locationInputSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type User = typeof users.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type Itinerary = typeof itineraries.$inferSelect;
export type Place = typeof places.$inferSelect;
