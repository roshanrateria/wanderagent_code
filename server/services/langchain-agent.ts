import { foursquareService } from './foursquare.js';
import { osrmService } from './osrm.js';
import { generateItinerary, optimizeItinerary } from './gemini.js';
import { wikipediaImageService } from './wikipedia-images.js';
import { budgetAgent } from './budget-agent.js';
import { photoAgent } from './photo-agent.js';
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
          // Use enriched photoUrl from Wikipedia first, fallback to Foursquare photos
          photoUrl: fullPlace?.photoUrl || this.getPhotoUrl(fullPlace?.photos),
          website: fullPlace?.website,
          tel: fullPlace?.tel,
          social_media: fullPlace?.social_media,
          placemaker_url: fullPlace?.placemaker_url,
          estimatedDuration: place.estimatedDuration,
          scheduledTime: place.scheduledTime,
          order: place.order,
          reason: place.reason, // AI recommendation
          // Preserve Wikipedia metadata if available
          photoSource: fullPlace?.photoSource,
          wikipediaUrl: fullPlace?.wikipediaUrl,
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

  /**
   * Enrich place with Wikipedia image as fallback
   * IMPORTANT: Only uses coordinate-based search (no name search)
   * This prevents unrelated images from appearing
   */
  async enrichPlaceWithImage(place: any): Promise<any> {
    // If place already has a photo, return as is
    if (place.photoUrl) {
      return place;
    }

    try {
      console.log(`🖼️ Fetching Wikipedia image for ${place.name}...`);
      
      // ONLY use coordinate-based search - name search is unreliable
      let wikiImage = null;
      if (place.latitude && place.longitude) {
        wikiImage = await wikipediaImageService.getImageByCoordinates(
          place.latitude,
          place.longitude,
          1000, // 1km radius
          500   // 500px thumbnail
        );
      }

      // DO NOT fallback to name search - it returns unrelated images
      // Example: "flora paradise" returned "James I of England" portrait

      if (wikiImage?.imageUrl) {
        console.log(`✅ Found Wikipedia image for ${place.name}`);
        return {
          ...place,
          photoUrl: wikiImage.imageUrl,
          photoSource: 'wikipedia',
          wikipediaUrl: wikiImage.pageUrl,
        };
      }

      console.log(`⚠️ No image found for ${place.name}`);
      return place;
    } catch (error) {
      console.error(`Error enriching place with Wikipedia image:`, error);
      return place;
    }
  }
}

/**
 * Multi-Agent Orchestrator
 * Coordinates specialized agents for comprehensive travel planning
 */
class MultiAgentOrchestrator {
  private travelAgent: TravelPlanningAgent;
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.travelAgent = null as any; // Will be initialized when needed
  }

  /**
   * Initialize the travel planning agent
   */
  initializeTravelAgent(context: AgentContext) {
    this.travelAgent = new TravelPlanningAgent(context);
  }

  /**
   * Coordinate all agents to create a comprehensive itinerary
   */
  async createComprehensiveItinerary(context: AgentContext): Promise<AgentResponse> {
    try {
      console.log('🎯 Multi-Agent System: Starting comprehensive itinerary generation...');

      // Initialize travel agent
      this.initializeTravelAgent(context);

      // Step 1: Discover places (Travel Agent)
      console.log('👤 Agent 1 (Discovery): Searching for places...');
      const discoverResult = await this.travelAgent.executeTask('discover_places');
      if (!discoverResult.success) {
        return discoverResult;
      }

      // Step 2: Enrich places with images (Photo Agent + Wikipedia fallback)
      console.log('📸 Agent 2 (Image Enrichment): Adding photos to places...');
      const enrichedPlaces = await Promise.all(
        discoverResult.data.places.map(async (place: any) => {
          return await this.travelAgent.enrichPlaceWithImage(place);
        })
      );

      // Update context with enriched places
      context.availablePlaces = enrichedPlaces;
      this.initializeTravelAgent(context);

      // Step 3: Generate itinerary (Travel Agent)
      console.log('🗓️ Agent 3 (Planning): Generating optimized itinerary...');
      const itineraryResult = await this.travelAgent.executeTask('generate_itinerary');
      if (!itineraryResult.success) {
        return itineraryResult;
      }

      // Step 4: Optimize route (Travel Agent)
      console.log('🛣️ Agent 4 (Optimization): Optimizing route...');
      const optimizeResult = await this.travelAgent.executeTask('optimize_route');
      if (!optimizeResult.success) {
        return optimizeResult;
      }

      // Step 5: Budget estimation (Budget Agent)
      console.log('💰 Agent 5 (Budget): Analyzing estimated costs...');
      const budgetInsights = await this.estimateTripCosts(
        optimizeResult.data.itinerary,
        context.userPreferences.budget
      );

      console.log('✅ Multi-Agent System: Comprehensive itinerary created successfully!');

      return {
        success: true,
        data: {
          ...optimizeResult.data,
          budgetInsights,
          agentContributions: {
            discovery: `Found ${enrichedPlaces.length} places`,
            imageEnrichment: `Enhanced ${enrichedPlaces.filter((p: any) => p.photoUrl).length} places with photos`,
            planning: `Created ${itineraryResult.data.itinerary.length}-stop itinerary`,
            optimization: `Optimized ${optimizeResult.data.totalDistance.toFixed(1)}km route`,
            budget: `Estimated trip cost: $${budgetInsights.estimatedTotal}`,
          }
        },
        message: 'Comprehensive itinerary created with multi-agent collaboration',
        status: 'complete'
      };
    } catch (error) {
      console.error('Multi-Agent System Error:', error);
      return {
        success: false,
        message: `Multi-agent coordination failed: ${error}`,
        status: 'error'
      };
    }
  }

  /**
   * Estimate trip costs using Budget Agent
   * Uses realistic INR costs based on Indian tourism standards
   */
  private async estimateTripCosts(
    itinerary: ItineraryPlace[],
    budgetLevel: string
  ): Promise<{
    estimatedTotal: number;
    breakdown: Record<string, number>;
    recommendations: string[];
    explanation: string;
  }> {
    try {
      // Realistic budget multipliers for India (INR)
      const budgetMultipliers: Record<string, { food: number; activity: number; transport: number; name: string }> = {
        'budget-friendly': { food: 0.6, activity: 0.5, transport: 0.7, name: 'Budget-Friendly' },
        'budget': { food: 0.6, activity: 0.5, transport: 0.7, name: 'Budget-Friendly' },
        'low': { food: 0.6, activity: 0.5, transport: 0.7, name: 'Budget-Friendly' },
        'moderate': { food: 1.0, activity: 1.0, transport: 1.0, name: 'Moderate' },
        'medium': { food: 1.0, activity: 1.0, transport: 1.0, name: 'Moderate' },
        'premium': { food: 1.8, activity: 1.5, transport: 1.3, name: 'Premium' },
        'high': { food: 1.8, activity: 1.5, transport: 1.3, name: 'Premium' },
        'luxury': { food: 3.0, activity: 2.5, transport: 2.0, name: 'Luxury' },
      };

      // Normalize budget level and get multiplier
      const normalizedBudget = (budgetLevel || 'moderate').toLowerCase().trim();
      const multiplier = budgetMultipliers[normalizedBudget] || budgetMultipliers['moderate'];
      
      console.log(`💰 Budget level: "${budgetLevel}" → Normalized: "${normalizedBudget}" → Multipliers:`, multiplier);

      // Calculate trip duration in hours
      const totalDuration = itinerary.reduce((sum, place) => sum + (place.estimatedDuration || 30), 0);
      const hours = Math.ceil(totalDuration / 60);

      // Identify restaurants in itinerary
      const restaurants = itinerary.filter(p => 
        p.category?.toLowerCase().includes('restaurant') ||
        p.category?.toLowerCase().includes('food') ||
        p.category?.toLowerCase().includes('cafe') ||
        p.category?.toLowerCase().includes('dining')
      );

      // Estimate meals based on scheduled times and duration
      let breakfastNeeded = false;
      let lunchNeeded = false;
      let dinnerNeeded = false;
      let snacksNeeded = 0;

      // Check scheduled times to determine meal needs
      itinerary.forEach(place => {
        if (place.scheduledTime) {
          const hour = parseInt(place.scheduledTime.split(':')[0]);
          if (hour >= 7 && hour < 10) breakfastNeeded = true;
          if (hour >= 12 && hour < 15) lunchNeeded = true;
          if (hour >= 18 && hour < 22) dinnerNeeded = true;
        }
      });

      // If trip is 2-3 hours, assume 1 meal
      // If trip is 4-6 hours (half day), assume lunch + snacks
      // If trip is 8+ hours (full day), assume lunch + dinner + snacks
      if (hours <= 3) {
        if (!lunchNeeded && !dinnerNeeded && !breakfastNeeded) {
          lunchNeeded = true; // Default to lunch for short trips
        }
        snacksNeeded = 1;
      } else if (hours <= 6) {
        lunchNeeded = true;
        snacksNeeded = 2;
      } else {
        lunchNeeded = true;
        dinnerNeeded = true;
        snacksNeeded = 2;
      }

      // Base meal costs per person in INR (Indian standards)
      const baseMealCosts = {
        breakfast: 150,  // Tea/coffee + snack
        lunch: 300,      // Full meal at restaurant
        dinner: 350,     // Full meal at restaurant
        snack: 100,      // Coffee/tea + small snack
      };

      // Calculate food costs
      let foodCost = 0;
      if (breakfastNeeded) foodCost += baseMealCosts.breakfast * multiplier.food;
      if (lunchNeeded) foodCost += baseMealCosts.lunch * multiplier.food;
      if (dinnerNeeded) foodCost += baseMealCosts.dinner * multiplier.food;
      foodCost += snacksNeeded * baseMealCosts.snack * multiplier.food;

      // Add explicit restaurant visits
      foodCost += restaurants.length * 250 * multiplier.food;

      // Calculate activity costs (entry fees, tickets, etc.)
      const activities = itinerary.filter(p => 
        !p.category?.toLowerCase().includes('restaurant') &&
        !p.category?.toLowerCase().includes('food')
      );

      // Entry fees: Museums (₹200), Monuments (₹250), Parks (₹100), Shopping (₹500), Entertainment (₹400)
      let activityCost = 0;
      activities.forEach(place => {
        const cat = place.category?.toLowerCase() || '';
        if (cat.includes('museum')) activityCost += 200 * multiplier.activity;
        else if (cat.includes('monument') || cat.includes('landmark')) activityCost += 250 * multiplier.activity;
        else if (cat.includes('park') || cat.includes('garden')) activityCost += 100 * multiplier.activity;
        else if (cat.includes('shop') || cat.includes('mall')) activityCost += 500 * multiplier.activity;
        else if (cat.includes('entertainment') || cat.includes('theater')) activityCost += 400 * multiplier.activity;
        else activityCost += 150 * multiplier.activity; // Default activity cost
      });

      // Calculate transport costs
      // Per stop: Auto (₹50-100), Cab (₹150-300), Public transport (₹20-50)
      const baseTransportPerStop = 80; // Average for moderate budget
      const transportCost = itinerary.length * baseTransportPerStop * multiplier.transport;

      const estimatedTotal = foodCost + activityCost + transportCost;

      const breakdown = {
        'Food & Dining': Math.round(foodCost),
        'Activities & Entry Fees': Math.round(activityCost),
        'Local Transport': Math.round(transportCost),
      };

      // Build explanation
      const mealsList = [];
      if (breakfastNeeded) mealsList.push('Breakfast');
      if (lunchNeeded) mealsList.push('Lunch');
      if (dinnerNeeded) mealsList.push('Dinner');
      if (snacksNeeded > 0) mealsList.push(`${snacksNeeded} Snack(s)`);

      const explanation = `💡 Cost Estimation Method (${multiplier.name} Budget):
      
• **Trip Duration**: ~${hours} hours
• **Meals Included**: ${mealsList.join(', ')}
• **Activities**: ${activities.length} places with entry fees
• **Transport**: ${itinerary.length} stops (Auto/Cab/Public transport)

**Base Rates (Per Person):**
- Breakfast: ₹${Math.round(baseMealCosts.breakfast * multiplier.food)}
- Lunch: ₹${Math.round(baseMealCosts.lunch * multiplier.food)}
- Dinner: ₹${Math.round(baseMealCosts.dinner * multiplier.food)}
- Snacks/Coffee: ₹${Math.round(baseMealCosts.snack * multiplier.food)}
- Entry Fees: ₹${Math.round(150 * multiplier.activity)} - ₹${Math.round(500 * multiplier.activity)}
- Transport/Stop: ₹${Math.round(baseTransportPerStop * multiplier.transport)}

*Costs are per person and may vary based on actual choices.`;

      // Get AI recommendations
      const mockExpenses = [
        {
          id: '1',
          category: 'Food',
          amount: foodCost,
          description: 'Estimated meal costs',
          date: new Date().toISOString(),
        },
        {
          id: '2',
          category: 'Activities',
          amount: activityCost,
          description: 'Estimated entry fees and activities',
          date: new Date().toISOString(),
        },
        {
          id: '3',
          category: 'Transport',
          amount: transportCost,
          description: 'Estimated local transport',
          date: new Date().toISOString(),
        },
      ];

      const budgetRecommendations = await budgetAgent.getRecommendations(
        mockExpenses,
        estimatedTotal * 1.2 // Budget with 20% buffer
      );

      return {
        estimatedTotal: Math.round(estimatedTotal),
        breakdown,
        recommendations: budgetRecommendations.tips.slice(0, 3),
        explanation,
      };
    } catch (error) {
      console.error('Error estimating trip costs:', error);
      return {
        estimatedTotal: 0,
        breakdown: {},
        recommendations: ['Track your expenses during the trip', 'Look for free activities', 'Use public transportation'],
        explanation: 'Unable to estimate costs at this time.',
      };
    }
  }

  /**
   * Get budget analysis for current trip
   */
  async analyzeBudget(
    expenses: Array<{ id: string; category: string; amount: number; description: string; date: string }>,
    totalBudget: number
  ) {
    return await budgetAgent.analyzeSpending(expenses, totalBudget);
  }

  /**
   * Get budget recommendations
   */
  async getBudgetRecommendations(
    expenses: Array<{ id: string; category: string; amount: number; description: string; date: string }>,
    totalBudget: number,
    preferences?: { interests?: string[]; location?: string; remainingDays?: number }
  ) {
    return await budgetAgent.getRecommendations(expenses, totalBudget, preferences);
  }

  /**
   * Generate photo captions
   */
  async generatePhotoCaption(
    imageData: string,
    context?: {
      location?: string;
      placeName?: string;
      timestamp?: string;
      style?: "poetic" | "casual" | "descriptive" | "funny";
    }
  ) {
    return await photoAgent.generatePhotoCaption(imageData, context);
  }

  /**
   * Generate complete album
   */
  async generateAlbum(
    photos: Array<{
      id: string;
      base64?: string;
      url?: string;
      location?: string;
      timestamp?: string;
    }>,
    albumInfo?: {
      title?: string;
      location?: string;
      dates?: { start: string; end: string };
      style?: "poetic" | "casual" | "descriptive" | "funny";
    }
  ) {
    return await photoAgent.generateAlbum({
      photos,
      tripTitle: albumInfo?.title,
      tripLocation: albumInfo?.location,
      tripDates: albumInfo?.dates,
      preferences: {
        style: albumInfo?.style,
      },
    });
  }

  /**
   * Predict budget health
   */
  async predictBudgetHealth(
    expenses: Array<{ id: string; category: string; amount: number; description: string; date: string }>,
    totalBudget: number,
    remainingDays: number
  ) {
    return await budgetAgent.predictBudgetHealth(expenses, totalBudget, remainingDays);
  }
}

export { TravelPlanningAgent as Agent, MultiAgentOrchestrator };
