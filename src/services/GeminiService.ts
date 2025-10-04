import { MobileApiService } from './MobileApiService';

export interface ItineraryRequest {
  destination: string;
  duration: number;
  interests: string[];
  budget?: string;
  startDate?: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  location: string;
  duration: string;
  cost?: string;
  type: 'attraction' | 'restaurant' | 'activity' | 'transport';
}

export interface ItineraryResponse {
  destination: string;
  totalDays: number;
  overview: string;
  days: ItineraryDay[];
  estimatedBudget: string;
  tips: string[];
}

export class GeminiService {
  private apiService: MobileApiService;
  private apiKey: string;

  constructor() {
    this.apiService = MobileApiService.getInstance();
    const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
    // Prefer Vite-injected env for mobile build
    this.apiKey = viteEnv.VITE_GEMINI_API_KEY || viteEnv.VITE_REACT_APP_GEMINI_API_KEY || (process.env as any)?.VITE_GEMINI_API_KEY || (process.env as any)?.REACT_APP_GEMINI_API_KEY || '';
  }

  public async generateItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const prompt = this.createItineraryPrompt(request);
    const cacheKey = `itinerary_${JSON.stringify(request)}`;

    try {
      const response = await this.apiService.makeRequest<any>(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          })
        },
        cacheKey
      );

      const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error('No response generated from Gemini');
      }

      return this.parseItineraryResponse(generatedText, request);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      throw new Error('Failed to generate itinerary. Please try again.');
    }
  }

  private createItineraryPrompt(request: ItineraryRequest): string {
    return `Create a detailed ${request.duration}-day travel itinerary for ${request.destination}.

Requirements:
- Duration: ${request.duration} days
- Interests: ${request.interests.join(', ')}
${request.budget ? `- Budget: ${request.budget}` : ''}
${request.startDate ? `- Start Date: ${request.startDate}` : ''}

Please provide a JSON response with the following structure:
{
  "destination": "${request.destination}",
  "totalDays": ${request.duration},
  "overview": "Brief overview of the trip",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Activity description",
          "location": "Specific location",
          "duration": "2 hours",
          "cost": "Estimated cost",
          "type": "attraction"
        }
      ]
    }
  ],
  "estimatedBudget": "Total estimated budget",
  "tips": ["Travel tip 1", "Travel tip 2"]
}

Make sure to include:
- Realistic timing and durations
- Mix of attractions, restaurants, and activities
- Local transportation suggestions
- Cultural experiences and local cuisine
- Budget considerations
- Practical travel tips

Response must be valid JSON only.`;
  }

  private parseItineraryResponse(text: string, request: ItineraryRequest): ItineraryResponse {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsedResponse.days || !Array.isArray(parsedResponse.days)) {
        throw new Error('Invalid itinerary structure');
      }

      return {
        destination: parsedResponse.destination || request.destination,
        totalDays: parsedResponse.totalDays || request.duration,
        overview: parsedResponse.overview || 'Generated travel itinerary',
        days: parsedResponse.days,
        estimatedBudget: parsedResponse.estimatedBudget || 'Budget varies',
        tips: parsedResponse.tips || []
      };
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      
      // Return a basic fallback itinerary
      return this.createFallbackItinerary(request);
    }
  }

  private createFallbackItinerary(request: ItineraryRequest): ItineraryResponse {
    const days: ItineraryDay[] = [];
    
    for (let i = 1; i <= request.duration; i++) {
      days.push({
        day: i,
        date: new Date(Date.now() + (i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        activities: [
          {
            time: '09:00',
            title: `Explore ${request.destination}`,
            description: 'Discover the main attractions and landmarks',
            location: request.destination,
            duration: '4 hours',
            type: 'attraction'
          },
          {
            time: '13:00',
            title: 'Local Cuisine Experience',
            description: 'Try authentic local dishes',
            location: request.destination,
            duration: '2 hours',
            type: 'restaurant'
          }
        ]
      });
    }

    return {
      destination: request.destination,
      totalDays: request.duration,
      overview: `A ${request.duration}-day exploration of ${request.destination}`,
      days,
      estimatedBudget: 'Varies based on preferences',
      tips: [
        'Check local weather conditions',
        'Learn basic local phrases',
        'Keep important documents safe',
        'Try local transportation'
      ]
    };
  }
}
