export interface UserPreferences {
  interests: string[];
  duration: string;
  budget: string;
  dietaryRestrictions: string[];
  transportation: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface Place {
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
  estimatedDuration: number;
  travelTimeToNext?: number;
  distanceToNext?: number;
  scheduledTime?: string;
  order: number;
  reason?: string;
  photos?: Array<{
    prefix: string;
    suffix: string;
    width: number;
    height: number;
  }>;
  email?: string;
  // Optional quick-win extensions
  hours?: {
    open_now?: boolean;
    display?: string;
  };
  tipsSummary?: string;
}

export interface Itinerary {
  id: string;
  sessionId: string;
  places: Place[];
  totalDuration: number;
  totalDistance: number;
  optimizedRoute?: Array<{ lat: number; lng: number }>;
  routeGeometry?: Array<{ lat: number; lng: number }>;
  recommendations?: string[];
  budgetInsights?: {
    estimatedTotal: number;
    breakdown: Record<string, number>;
    recommendations: string[];
  };
  osrmInstructions?: string[][]; // Array of instruction arrays per leg
  multiDay?: any; // <-- persisted multi-day structure
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentStatus {
  status: 'analyzing' | 'searching' | 'optimizing' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export const INTEREST_OPTIONS = [
  { id: 'art', label: 'Art & Culture', icon: 'fas fa-palette' },
  { id: 'food', label: 'Food & Dining', icon: 'fas fa-utensils' },
  { id: 'history', label: 'History', icon: 'fas fa-landmark' },
  { id: 'nature', label: 'Nature & Parks', icon: 'fas fa-tree' },
  { id: 'shopping', label: 'Shopping', icon: 'fas fa-shopping-bag' },
  { id: 'entertainment', label: 'Entertainment', icon: 'fas fa-music' },
  { id: 'sports', label: 'Sports & Fitness', icon: 'fas fa-dumbbell' },
  { id: 'religious', label: 'Religious Sites', icon: 'fas fa-pray' },
];

export const DURATION_OPTIONS = [
  { value: '2-3 hours', label: '2-3 hours' },
  { value: 'half day (4-6 hours)', label: 'Half day (4-6 hours)' },
  { value: 'full day (8+ hours)', label: 'Full day (8+ hours)' },
  { value: 'multiple days', label: 'Multiple days' },
];

export const BUDGET_OPTIONS = [
  { value: 'budget-friendly', label: 'Budget-friendly ($)' },
  { value: 'moderate', label: 'Moderate ($$)' },
  { value: 'premium', label: 'Premium ($$$)' },
  { value: 'luxury', label: 'Luxury ($$$$)' },
];

export const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'halal', label: 'Halal' },
];

export const TRANSPORTATION_OPTIONS = [
  { value: 'walking', label: 'Walking', icon: 'fas fa-walking' },
  { value: 'driving', label: 'Driving', icon: 'fas fa-car' },
  { value: 'public transit', label: 'Public Transit', icon: 'fas fa-bus' },
  { value: 'cycling', label: 'Cycling', icon: 'fas fa-bicycle' },
];
