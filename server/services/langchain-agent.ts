import { foursquareService } from './foursquare.js';
import { osrmService } from './osrm.js';
import { generateItinerary, optimizeItinerary } from './gemini.js';
import type { UserPreferencesData, ItineraryPlace } from '@shared/schema';

export interface AgentContext {
  sessionId: string;
  userPreferences: UserPreferencesData;
  currentLocation: { lat: number; lng: number; address?: string };
  availablePlaces: any[];
  currentItinerary?: ItineraryPlace[];
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  message: string;
  status: 'analyzing' | 'searching' | 'optimizing' | 'complete' | 'error';
}

export class TravelPlanningAgent {
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  async executeTask(task: string): Promise<AgentResponse> {
    try {
      switch (task) {
        case 'discover_places':
          return await this.discoverPlaces();
        case 'generate_itinerary':
          return await this.generateItinerary();
        case 'optimize_route':
          return await this.optimizeRoute();
        case 'adjust_itinerary':
          return await this.adjustItinerary();
        default:
          return {
            success: false,
            message: `Unknown task: ${task}`,
            status: 'error'
          };
      }
    } catch (error) {
      console.error(`Error executing task ${task}:`, error);
      return {
        success: false,
        message: `Failed to execute ${task}: ${error}`,
        status: 'error'
      };
    }
  }

  private async discoverPlaces(): Promise<AgentResponse> {
    try {
      console.log('🔍 Discovering places based on user interests...');
      
      const places = await foursquareService.searchByInterests(
        this.context.currentLocation,
        this.context.userPreferences.interests,
        this.getRadiusFromDuration(this.context.userPreferences.duration)
      );

      // Filter places based on budget and dietary restrictions
      const filteredPlaces = this.filterPlacesByPreferences(places);

      this.context.availablePlaces = filteredPlaces;

      return {
        success: true,
        data: { places: filteredPlaces, count: filteredPlaces.length },
        message: `Found ${filteredPlaces.length} places matching your interests`,
        status: 'searching'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to discover places: ${error}`,
        status: 'error'
      };
    }
  }

  private async generateItinerary(): Promise<AgentResponse> {
    try {
      console.log('🧠 Generating optimized itinerary with AI...');

      if (!this.context.availablePlaces || this.context.availablePlaces.length === 0) {
        await this.discoverPlaces();
      }

      const aiItinerary = await generateItinerary({
        interests: this.context.userPreferences.interests,
        duration: this.context.userPreferences.duration,
        budget: this.context.userPreferences.budget,
        dietaryRestrictions: this.context.userPreferences.dietaryRestrictions,
        transportation: this.context.userPreferences.transportation,
        location: this.context.currentLocation,
        places: this.context.availablePlaces
      });

      // Convert AI response to our ItineraryPlace format
      const itineraryPlaces: ItineraryPlace[] = aiItinerary.places.map((place, index) => {
        const fullPlace = this.context.availablePlaces.find(p => p.fsq_place_id === place.fsqPlaceId);
        return {
          fsqPlaceId: place.fsqPlaceId,
          name: place.name,
          category: place.category || (fullPlace?.categories?.[0]?.name ?? 'Point of Interest'),
          latitude: fullPlace?.latitude || 0,
          longitude: fullPlace?.longitude || 0,
          rating: fullPlace?.rating,
          priceLevel: fullPlace?.price,
          address: fullPlace?.location?.formatted_address,
          description: fullPlace?.description || place.reason,
          photoUrl: this.getPhotoUrl(fullPlace?.photos),
          website: fullPlace?.website,
          tel: fullPlace?.tel,
          social_media: fullPlace?.social_media,
          placemaker_url: fullPlace?.placemaker_url,
          estimatedDuration: place.estimatedDuration,
          scheduledTime: place.scheduledTime,
          order: place.order,
          reason: place.reason // AI recommendation
        };
      });

      this.context.currentItinerary = itineraryPlaces;

      return {
        success: true,
        data: {
          itinerary: itineraryPlaces,
          totalDuration: aiItinerary.totalDuration,
          recommendations: aiItinerary.recommendations
        },
        message: 'Itinerary generated successfully',
        status: 'optimizing'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate itinerary: ${error}`,
        status: 'error'
      };
    }
  }

  private async optimizeRoute(): Promise<AgentResponse> {
    try {
      console.log('🛣️ Optimizing route with OSRM...');

      if (!this.context.currentItinerary || this.context.currentItinerary.length === 0) {
        throw new Error('No itinerary to optimize');
      }

      // Validate and filter coordinates
      const validPlaces = this.context.currentItinerary.filter(
        place => typeof place.longitude === 'number' && typeof place.latitude === 'number' &&
          !isNaN(place.longitude) && !isNaN(place.latitude) &&
          place.longitude !== 0 && place.latitude !== 0
      );
      const coordinates: Array<[number, number]> = [
        [this.context.currentLocation.lng, this.context.currentLocation.lat],
        ...validPlaces.map(place => [place.longitude, place.latitude] as [number, number])
      ];

      // Log for debugging
      console.log('OSRM coordinates:', coordinates);

      if (coordinates.length < 2) {
        throw new Error('Not enough valid locations for route optimization');
      }

      const profile = osrmService.getProfileFromTransportation(this.context.userPreferences.transportation);
      const optimizationResult = await osrmService.optimizeRoute(coordinates, profile);

      // Update itinerary with travel times
      const optimizedItinerary = validPlaces.map((place, index) => {
        const routeInfo = optimizationResult.routes.find(r => r.from === index);
        return {
          ...place,
          travelTimeToNext: routeInfo?.duration,
          distanceToNext: routeInfo?.distance
        };
      });

      return {
        success: true,
        data: {
          itinerary: optimizedItinerary,
          totalDistance: optimizationResult.totalDistance,
          totalDuration: optimizationResult.totalDuration,
          optimizedRoute: optimizationResult.optimizedOrder
        },
        message: 'Route optimized successfully',
        status: 'complete'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to optimize route: ${error}`,
        status: 'error'
      };
    }
  }

  private async adjustItinerary(feedback?: string): Promise<AgentResponse> {
    try {
      console.log('🔄 Adjusting itinerary based on feedback...');

      if (!this.context.currentItinerary) {
        throw new Error('No current itinerary to adjust');
      }

      const adjustedItinerary = await optimizeItinerary(
        this.context.currentItinerary,
        feedback || 'Optimize for better experience'
      );

      return {
        success: true,
        data: { itinerary: adjustedItinerary },
        message: 'Itinerary adjusted successfully',
        status: 'complete'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to adjust itinerary: ${error}`,
        status: 'error'
      };
    }
  }

  private filterPlacesByPreferences(places: any[]): any[] {
    return places.filter(place => {
      // Filter by budget (price level)
      if (this.context.userPreferences.budget && place.price) {
        const budgetLevel = this.getBudgetLevel(this.context.userPreferences.budget);
        if (place.price > budgetLevel) return false;
      }

      // Filter by dietary restrictions (for restaurants)
      if (this.context.userPreferences.dietaryRestrictions.length > 0) {
        const isRestaurant = place.categories?.some((cat: any) => 
          cat.name.toLowerCase().includes('restaurant') || 
          cat.name.toLowerCase().includes('food')
        );
        
        if (isRestaurant) {
          // This would require more detailed filtering based on place details
          // For now, we'll keep all restaurants and let the AI handle dietary restrictions
        }
      }

      return true;
    });
  }

  private getBudgetLevel(budget: string): number {
    switch (budget.toLowerCase()) {
      case 'budget-friendly': return 1;
      case 'moderate': return 2;
      case 'premium': return 3;
      case 'luxury': return 4;
      default: return 4;
    }
  }

  private getRadiusFromDuration(duration: string): number {
    switch (duration.toLowerCase()) {
      case '2-3 hours': return 5000;
      case 'half day (4-6 hours)': return 10000;
      case 'full day (8+ hours)': return 20000;
      case 'multiple days': return 50000;
      default: return 10000;
    }
  }

  private getPhotoUrl(photos: any[]): string | undefined {
    if (!photos || photos.length === 0) return undefined;
    const photo = photos[0];
    return `${photo.prefix}300x200${photo.suffix}`;
  }
}

export { TravelPlanningAgent as Agent };
