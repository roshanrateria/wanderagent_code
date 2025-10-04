import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

export interface PhotoMetadata {
  id: string;
  caption?: string;
  location?: string;
  timestamp: string;
  tags?: string[];
  placeContext?: string;
}

export interface AlbumGenerationRequest {
  photos: Array<{
    id: string;
    base64?: string;
    url?: string;
    location?: string;
    timestamp?: string;
  }>;
  tripTitle?: string;
  tripLocation?: string;
  tripDates?: { start: string; end: string };
  preferences?: {
    style?: "poetic" | "casual" | "descriptive" | "funny";
    length?: "short" | "medium" | "long";
  };
}

export interface AlbumPhoto {
  id: string;
  caption: string;
  tags: string[];
  context: string;
  alternativeCaptions?: string[];
}

export interface Album {
  title: string;
  description: string;
  photos: AlbumPhoto[];
  highlights: string[];
  story: string;
}

export class PhotoAlbumAgent {
  private groqClient: OpenAI;
  private readonly visionModel = "llama-3.2-90b-vision-preview";
  private readonly textModel = "llama-3.3-70b-versatile";

  constructor() {
    this.groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || "",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  /**
   * Generate a caption for a single photo using vision model
   */
  async generatePhotoCaption(
    imageData: string,
    context?: {
      location?: string;
      placeName?: string;
      timestamp?: string;
      style?: "poetic" | "casual" | "descriptive" | "funny";
    }
  ): Promise<string> {
    try {
      const style = context?.style || "casual";
      const styleInstructions = {
        poetic: "Create a poetic, artistic caption that evokes emotion",
        casual: "Create a casual, friendly caption like you're sharing with friends",
        descriptive: "Create a detailed, descriptive caption explaining what's in the photo",
        funny: "Create a fun, witty caption with a touch of humor",
      };

      const prompt = `Generate a compelling caption for this travel photo.

${context?.location ? `Location: ${context.location}` : ""}
${context?.placeName ? `Place: ${context.placeName}` : ""}
${context?.timestamp ? `Time: ${context.timestamp}` : ""}

Style: ${styleInstructions[style]}

Requirements:
- Keep it under 150 characters
- Make it engaging and personal
- Avoid generic phrases like "beautiful moment"
- Include relevant emojis if appropriate

Caption:`;

      const response = await this.groqClient.chat.completions.create({
        model: this.visionModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageData.startsWith("data:") ? imageData : `data:image/jpeg;base64,${imageData}`,
                },
              },
            ],
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      });

      const caption = response.choices[0]?.message?.content?.trim() || "A memorable moment from your journey ✨";
      
      // Clean up the caption
      return caption.replace(/^(Caption|Response):\s*/i, "").trim();
    } catch (error) {
      console.error("Error generating photo caption:", error);
      
      // Fallback caption based on context
      if (context?.placeName) {
        return `Amazing time at ${context.placeName}! 📸`;
      } else if (context?.location) {
        return `Exploring ${context.location} 🌍✨`;
      }
      return "A beautiful moment captured 📸✨";
    }
  }

  /**
   * Generate captions for multiple photos in batch
   */
  async generateBatchCaptions(
    photos: Array<{
      id: string;
      imageData: string;
      context?: {
        location?: string;
        placeName?: string;
        timestamp?: string;
      };
    }>,
    style?: "poetic" | "casual" | "descriptive" | "funny"
  ): Promise<Map<string, string>> {
    const captions = new Map<string, string>();

    // Process photos in parallel with a limit to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      const batchPromises = batch.map(async (photo) => {
        const caption = await this.generatePhotoCaption(photo.imageData, {
          ...photo.context,
          style,
        });
        return { id: photo.id, caption };
      });

      const results = await Promise.all(batchPromises);
      results.forEach(({ id, caption }) => {
        captions.set(id, caption);
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < photos.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return captions;
  }

  /**
   * Analyze a photo and extract tags/themes
   */
  async analyzePhoto(imageData: string): Promise<{
    tags: string[];
    theme: string;
    description: string;
  }> {
    try {
      const prompt = `Analyze this travel photo and provide:
1. 5 relevant tags (single words or short phrases)
2. The main theme (e.g., "nature", "architecture", "food", "people", "culture")
3. A brief description (one sentence)

Format your response as:
TAGS: tag1, tag2, tag3, tag4, tag5
THEME: theme
DESCRIPTION: description`;

      const response = await this.groqClient.chat.completions.create({
        model: this.visionModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageData.startsWith("data:") ? imageData : `data:image/jpeg;base64,${imageData}`,
                },
              },
            ],
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || "";

      // Parse the response
      const tagsMatch = content.match(/TAGS:\s*(.+)/i);
      const themeMatch = content.match(/THEME:\s*(.+)/i);
      const descMatch = content.match(/DESCRIPTION:\s*(.+)/i);

      const tags = tagsMatch
        ? tagsMatch[1]
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
            .slice(0, 5)
        : ["travel", "memories"];

      const theme = themeMatch ? themeMatch[1].trim() : "travel";
      const description = descMatch ? descMatch[1].trim() : "A moment from your journey";

      return { tags, theme, description };
    } catch (error) {
      console.error("Error analyzing photo:", error);
      return {
        tags: ["travel", "adventure", "memories"],
        theme: "travel",
        description: "A memorable moment",
      };
    }
  }

  /**
   * Generate a complete album with organized photos and narrative
   */
  async generateAlbum(request: AlbumGenerationRequest): Promise<Album> {
    try {
      // Analyze all photos first
      const photoAnalyses = await Promise.all(
        request.photos.map(async (photo) => {
          const imageData = photo.base64 || photo.url || "";
          if (!imageData) {
            return {
              id: photo.id,
              tags: ["travel"],
              theme: "travel",
              description: "A travel moment",
              caption: "A beautiful memory",
            };
          }

          const analysis = await this.analyzePhoto(imageData);
          const caption = await this.generatePhotoCaption(imageData, {
            location: photo.location || request.tripLocation,
            timestamp: photo.timestamp,
            style: request.preferences?.style || "casual",
          });

          return {
            id: photo.id,
            ...analysis,
            caption,
          };
        })
      );      // Generate album title and description using text model
      const allTags = photoAnalyses.flatMap((p) => p.tags);
      const uniqueTags = Array.from(new Set(allTags));
      const themes = photoAnalyses.map((p) => p.theme);
      const uniqueThemes = Array.from(new Set(themes));

      const albumMetaPrompt = `Create a compelling title and description for a travel photo album:

Trip Title: ${request.tripTitle || "My Journey"}
Location: ${request.tripLocation || "Various locations"}
${request.tripDates ? `Dates: ${request.tripDates.start} to ${request.tripDates.end}` : ""}
Number of Photos: ${request.photos.length}
Main Themes: ${uniqueThemes.join(", ")}
Tags: ${uniqueTags.slice(0, 10).join(", ")}

Provide:
TITLE: A creative, engaging album title (max 50 characters)
DESCRIPTION: A 2-3 sentence description that captures the essence of the trip
HIGHLIGHTS: 3-4 key highlights from the journey (bullet points)

Make it personal and evocative.`;

      const metaResponse = await this.groqClient.chat.completions.create({
        model: this.textModel,
        messages: [{ role: "user", content: albumMetaPrompt }],
        temperature: 0.8,
        max_tokens: 400,
      });

      const metaContent = metaResponse.choices[0]?.message?.content || "";      // Parse album metadata
      const titleMatch = metaContent.match(/TITLE:\s*(.+)/);
      const descLines = metaContent.split(/HIGHLIGHTS:/)[0];
      const descMatch = descLines.match(/DESCRIPTION:\s*(.+)/);
      const highlightsSection = metaContent.split(/HIGHLIGHTS:/)[1] || '';

      const title = titleMatch
        ? titleMatch[1].trim().replace(/^["']|["']$/g, "")
        : request.tripTitle || "My Travel Album";      const description = descMatch
        ? descMatch[1].trim().replace(/\n/g, " ")
        : `A collection of ${request.photos.length} memorable moments from ${request.tripLocation || "my journey"}.`;      const highlights = highlightsSection
        .split("\n")
        .filter((line: string) => line.trim().match(/^[-•*]/))
        .map((line: string) => line.replace(/^[-•*]\s*/, "").trim())
        .filter((line: string) => line.length > 0)
        .slice(0, 4);

      // Fallback if no highlights found
      const finalHighlights = highlights.length > 0
        ? highlights
        : ["Unforgettable experiences", "Beautiful destinations", "Precious memories"];

      // Generate a narrative story
      const storyPrompt = `Write a brief, engaging narrative (3-4 sentences) that ties together this travel album:

${photoAnalyses
  .map((p, i) => `Photo ${i + 1}: ${p.description}`)
  .join("\n")}

Create a cohesive story that flows naturally and captures the journey's essence.`;

      const storyResponse = await this.groqClient.chat.completions.create({
        model: this.textModel,
        messages: [{ role: "user", content: storyPrompt }],
        temperature: 0.8,
        max_tokens: 300,
      });

      const story =
        storyResponse.choices[0]?.message?.content?.trim() ||
        `This journey took us through amazing places and unforgettable experiences. Each moment captured here tells a story of adventure, discovery, and joy. From sunrise to sunset, every photo represents a memory we'll treasure forever.`;

      // Create album photos with enriched data
      const albumPhotos: AlbumPhoto[] = photoAnalyses.map((analysis) => ({
        id: analysis.id,
        caption: analysis.caption,
        tags: analysis.tags,
        context: analysis.description,
        alternativeCaptions: [], // Could generate multiple caption options
      }));      return {
        title,
        description,
        photos: albumPhotos,
        highlights: finalHighlights,
        story,
      };
    } catch (error) {
      console.error("Error generating album:", error);

      // Return a basic album structure
      return {
        title: request.tripTitle || "My Travel Album",
        description: `A collection of memories from ${request.tripLocation || "my journey"}.`,
        photos: request.photos.map((photo) => ({
          id: photo.id,
          caption: "A beautiful moment captured 📸",
          tags: ["travel", "memories"],
          context: "A memorable experience",
          alternativeCaptions: [],
        })),
        highlights: [
          "Unforgettable experiences",
          "Beautiful destinations",
          "Precious memories",
        ],
        story: "Every journey has a story. These photos capture the essence of adventure, exploration, and the joy of discovery.",
      };
    }
  }

  /**
   * Generate alternative captions for a photo
   */
  async generateAlternativeCaptions(
    imageData: string,
    originalCaption: string,
    count: number = 3
  ): Promise<string[]> {
    try {
      const prompt = `Generate ${count} alternative captions for this photo. 

Current caption: "${originalCaption}"

Create variations that are:
1. Different in tone or style
2. Unique and creative
3. Under 150 characters each

List them one per line.`;

      const response = await this.groqClient.chat.completions.create({
        model: this.visionModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageData.startsWith("data:") ? imageData : `data:image/jpeg;base64,${imageData}`,
                },
              },
            ],
          },
        ],
        temperature: 0.9,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || "";
      const alternatives = content
        .split("\n")
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((line) => line.length > 10 && line.length < 200)
        .slice(0, count);

      return alternatives.length > 0
        ? alternatives
        : [
            "Another beautiful moment to remember",
            "Making memories that last forever",
            "Adventure is out there",
          ];
    } catch (error) {
      console.error("Error generating alternative captions:", error);
      return [
        "A moment to cherish",
        "Creating lasting memories",
        "Adventures and discoveries",
      ];
    }
  }
}

export const photoAgent = new PhotoAlbumAgent();
