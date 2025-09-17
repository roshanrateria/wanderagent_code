import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

export interface ItineraryGenerationRequest {
  interests: string[];
  duration: string;
  budget: string;
  dietaryRestrictions: string[];
  transportation: string;
  location: { lat: number; lng: number; address?: string };
  places: any[];
}

// Single-day optimized itinerary structure used by agent
export interface OptimizedItinerary {
  places: Array<{
    fsqPlaceId: string;
    name: string;
    category: string;
    estimatedDuration: number;
    scheduledTime: string;
    order: number;
    reason: string;
  }>;
  totalDuration: number;
  recommendations: string[];
}

// New types for multi-day itineraries
export interface PlanPlaceItem {
  fsqPlaceId: string;
  name: string;
  category: string;
  estimatedDuration: number;
  scheduledTime: string;
  order: number;
  reason: string;
}

export interface MultiDayItineraryDay {
  day: number;
  date?: string;
  theme?: string;
  places: PlanPlaceItem[];
  meals: {
    lunch: PlanPlaceItem | null;
    dinner: PlanPlaceItem | null;
  };
}

export interface MultiDayOptimizedItinerary {
  days: MultiDayItineraryDay[];
  recommendations: string[];
  summary?: string;
}

export async function generateItinerary(request: ItineraryGenerationRequest): Promise<OptimizedItinerary> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const config = {
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 3072,
    };

    const model = 'gemini-2.0-flash-exp';

    // Determine recommended stops based on duration
    const durationLower = request.duration.toLowerCase();
    const recommendedStops = durationLower.includes('2-3') ? '3-4' : durationLower.includes('half') ? '4-6' : '6-10';

    const systemPrompt = `You are an expert travel itinerary planner. Based on user preferences and available places, create an optimized single-day itinerary.

User Preferences:
- Interests: ${request.interests.join(", ")}
- Duration: ${request.duration}
- Budget: ${request.budget}  
- Dietary Restrictions: ${request.dietaryRestrictions.join(", ")}
- Transportation: ${request.transportation}
- Location: ${request.location.address || `${request.location.lat}, ${request.location.lng}`}

Available Places: ${JSON.stringify(request.places)}

IMPORTANT: You MUST respond with ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks.

Create an optimized itinerary that:
1. Includes ${recommendedStops} total stops for the day
2. Includes exactly one lunch stop (~1-2 PM) and one dinner stop (~7-8 PM), categorized as "Restaurant"
3. Prioritizes famous landmarks and top-rated attractions first, matching user interests
4. Fits within the time duration and minimizes travel time
5. Respects budget constraints and dietary restrictions for meal stops
6. Uses realistic scheduled times from morning to evening without overlaps

Respond with ONLY this exact JSON structure (no markdown, no explanations):
{
  "places": [
    {
      "fsqPlaceId": "string",
      "name": "string", 
      "category": "string",
      "estimatedDuration": 60,
      "scheduledTime": "9:00 AM",
      "order": 1,
      "reason": "string explaining why this place fits user preferences"
    }
  ],
  "totalDuration": 480,
  "recommendations": ["helpful tip 1", "helpful tip 2"]
}`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let fullText = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }

    console.log("Raw AI response:", fullText);

    // Check if response is empty
    if (!fullText || fullText.trim().length === 0) {
      throw new Error("Empty response from AI - please try again");
    }

    // Clean the response to extract JSON - handle markdown code blocks
    let jsonText = fullText.trim();

    // Remove markdown code blocks - handle both ```json and plain ```
    jsonText = jsonText.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '');
    jsonText = jsonText.replace(/\s*```$/gm, '');

    // Try to find JSON object if still needed
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Clean up common formatting issues
    jsonText = jsonText.trim();
    
    // Final check before parsing
    if (!jsonText || jsonText.length === 0) {
      throw new Error("No valid JSON found in AI response");
    }

    const parsedResponse = JSON.parse(jsonText);
    return parsedResponse;
  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error(`Failed to generate itinerary: ${error}`);
  }
}

// New: generate multi-day itinerary with meals and famous places per day
export async function generateMultiDayItinerary(request: ItineraryGenerationRequest & { startDate?: string; endDate?: string; days?: number }): Promise<MultiDayOptimizedItinerary> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const config = {
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 6144,
    };

    const model = 'gemini-2.0-flash-exp';

    // Compute number of days
    let days = request.days || 0;
    let dates: string[] = [];
    if (!days && request.startDate && request.endDate) {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay) + 1);
      days = diff;
      for (let i = 0; i < diff; i++) {
        const d = new Date(start.getTime() + i * msPerDay);
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    if (!days) days = 3; // sensible default

    const systemPrompt = `You are an expert travel planner. Create a comprehensive multi-day itinerary.

User Preferences:
- Interests: ${request.interests.join(", ")}
- Budget: ${request.budget}
- Dietary Restrictions: ${request.dietaryRestrictions.join(", ")}
- Transportation: ${request.transportation}
- Location: ${request.location.address || `${request.location.lat}, ${request.location.lng}`}
- Number of days: ${days}
- Dates (if provided): ${JSON.stringify(dates)}

Available Places (with ratings/prices if any): ${JSON.stringify(request.places)}

Rules:
1) Plan ${days} full days. Each day must have: morning attractions, lunch (~1 PM), afternoon attractions, dinner (~7-8 PM). Lunch and dinner must be real restaurants from the available places when possible and respect dietary restrictions; otherwise choose popular restaurants in the city.
2) Include famous landmarks and iconic attractions every day, prioritized by rating/popularity. Mix with user-interest-specific places.
3) Minimize backtracking and keep travel time reasonable.
4) Provide clear scheduled times and durations for each place, ordered sequentially. No time overlaps.
5) Use items from Available Places whenever possible. Use their fsqPlaceId so we can map geocoordinates.
6) Respond with ONLY valid JSON in the exact schema below.

Required JSON schema:
{
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "string",
      "places": [
        {"fsqPlaceId":"string","name":"string","category":"string","estimatedDuration":60,"scheduledTime":"9:00 AM","order":1,"reason":"string"}
      ],
      "meals": {
        "lunch": {"fsqPlaceId":"string","name":"string","category":"Restaurant","estimatedDuration":60,"scheduledTime":"1:00 PM","order":3,"reason":"string"},
        "dinner": {"fsqPlaceId":"string","name":"string","category":"Restaurant","estimatedDuration":90,"scheduledTime":"7:30 PM","order":6,"reason":"string"}
      }
    }
  ],
  "recommendations": ["tip 1", "tip 2"],
  "summary": "overall summary"
}`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
    ];

    const response = await ai.models.generateContentStream({ model, config, contents });

    let fullText = '';
    for await (const chunk of response) {
      if (chunk.text) fullText += chunk.text;
    }

    console.log('Raw Multi-day AI response:', fullText);

    if (!fullText || fullText.trim().length === 0) {
      throw new Error('Empty response from AI - please try again');
    }

    let jsonText = fullText.trim();
    jsonText = jsonText.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '');
    jsonText = jsonText.replace(/\s*```$/gm, '');
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];
    jsonText = jsonText.trim();
    if (!jsonText) throw new Error('No valid JSON found in AI response');

    const parsed = JSON.parse(jsonText);
    return parsed as MultiDayOptimizedItinerary;
  } catch (error) {
    console.error('Error generating multi-day itinerary:', error);
    throw new Error(`Failed to generate multi-day itinerary: ${error}`);
  }
}

export async function optimizeItinerary(currentItinerary: any[], userFeedback: string): Promise<OptimizedItinerary> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const config = {
      temperature: 0.5,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };

    const model = 'gemini-2.0-flash-exp';

    const prompt = `You are an expert travel itinerary optimizer. 

Current Itinerary: ${JSON.stringify(currentItinerary)}

User Feedback: ${userFeedback}

Based on the feedback, optimize the itinerary while maintaining the same structure. 
Return ONLY a JSON object with the same structure as the original itinerary.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let fullText = '';
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }

    console.log("Raw optimization AI response:", fullText);

    // Check if response is empty
    if (!fullText || fullText.trim().length === 0) {
      throw new Error("Empty response from AI - please try again");
    }

    // Clean the response to extract JSON - handle markdown code blocks
    let jsonText = fullText.trim();

    // Remove markdown code blocks - handle both ```json and plain ```
    jsonText = jsonText.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '');
    jsonText = jsonText.replace(/\s*```$/gm, '');

    // Try to find JSON object if still needed
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Clean up common formatting issues
    jsonText = jsonText.trim();
    
    // Final check before parsing
    if (!jsonText || jsonText.length === 0) {
      throw new Error("No valid JSON found in AI optimization response");
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error optimizing itinerary:", error);
    throw new Error(`Failed to optimize itinerary: ${error}`);
  }
}

export async function getGeminiPlan({ flights, places, preferences, tripDetails }: any) {
  // Compose the request for Gemini
  const request = {
    interests: preferences?.interests || [],
    duration: preferences?.duration || '',
    budget: preferences?.budget || '',
    dietaryRestrictions: preferences?.dietaryRestrictions || [],
    transportation: preferences?.transportation || '',
    location: { lat: 0, lng: 0, address: tripDetails?.destinationCity || '' },
    places: places || [],
  };

  // Prefer multi-day plan when dates are provided or duration indicates multiple days
  const isMultiDay = Boolean(tripDetails?.startDate && tripDetails?.endDate) || (request.duration?.toLowerCase?.().includes('multiple days'));
  if (isMultiDay) {
    return await generateMultiDayItinerary({
      ...request,
      startDate: tripDetails?.startDate,
      endDate: tripDetails?.endDate,
    });
  }

  return await generateItinerary(request);
}

// New helper function to summarize Foursquare tips into a concise highlight string for UI
export async function summarizeTips(placeName: string, tips: string[]): Promise<string> {
  try {
    if (!tips || tips.length === 0) return '';
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const config = { temperature: 0.3, topK: 40, topP: 0.9, maxOutputTokens: 256 };
    const model = 'gemini-2.0-flash-exp';
    const prompt = `You will receive several short user tips about a place. Write a single, ultra-concise highlight summary for travelers in under 280 characters. Avoid repetition, no markdown, no preface. Place: ${placeName}\n\nTips:\n${tips.map((t, i) => `- ${t}`).join('\n')}`;
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const response = await ai.models.generateContentStream({ model, config, contents });
    let fullText = '';
    for await (const chunk of response) { if (chunk.text) fullText += chunk.text; }
    const text = (fullText || '').trim();
    return text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim().slice(0, 280);
  } catch (err) {
    console.error('summarizeTips error', err);
    return '';
  }
}

