import dotenv from "dotenv";
dotenv.config();

export interface WikipediaImageResult {
  title: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  pageUrl?: string;
}

export class WikipediaImageService {
  private readonly baseUrl = "https://en.wikipedia.org/w/api.php";

  /**
   * Find the nearest Wikipedia article to given coordinates
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Search radius in meters (default: 1000)
   * @returns Wikipedia page title or null
   */
  async findNearestArticle(
    lat: number,
    lon: number,
    radius: number = 1000
  ): Promise<string | null> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set("action", "query");
      url.searchParams.set("list", "geosearch");
      url.searchParams.set("gscoord", `${lat}|${lon}`);
      url.searchParams.set("gsradius", radius.toString());
      url.searchParams.set("gslimit", "1");
      url.searchParams.set("format", "json");
      url.searchParams.set("origin", "*"); // CORS

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data?.query?.geosearch;

      if (results && results.length > 0) {
        return results[0].title;
      }

      return null;
    } catch (error) {
      console.error("Error finding nearest Wikipedia article:", error);
      return null;
    }
  }

  /**
   * Get the main image from a Wikipedia article
   * @param title Wikipedia article title
   * @param thumbSize Thumbnail size in pixels (default: 500)
   * @returns Image data or null
   */
  async getArticleImage(
    title: string,
    thumbSize: number = 500
  ): Promise<WikipediaImageResult | null> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set("action", "query");
      url.searchParams.set("prop", "pageimages");
      url.searchParams.set("titles", title);
      url.searchParams.set("pithumbsize", thumbSize.toString());
      url.searchParams.set("format", "json");
      url.searchParams.set("origin", "*"); // CORS

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }

      const data = await response.json();
      const pages = data?.query?.pages;

      if (pages) {
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (page.thumbnail) {
          return {
            title: page.title,
            imageUrl: page.thumbnail.source,
            thumbnailUrl: page.thumbnail.source,
            width: page.thumbnail.width,
            height: page.thumbnail.height,
            pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(
              page.title
            )}`,
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting Wikipedia article image:", error);
      return null;
    }
  }

  /**
   * Get image for a location by coordinates
   * Combines geosearch and image retrieval
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Search radius in meters (default: 1000)
   * @param thumbSize Thumbnail size in pixels (default: 500)
   * @returns Image data or null
   */
  async getImageByCoordinates(
    lat: number,
    lon: number,
    radius: number = 1000,
    thumbSize: number = 500
  ): Promise<WikipediaImageResult | null> {
    try {
      // Step 1: Find nearest article
      const title = await this.findNearestArticle(lat, lon, radius);
      if (!title) {
        console.log(
          `No Wikipedia article found near coordinates ${lat}, ${lon}`
        );
        return null;
      }

      // Step 2: Get image from that article
      const imageResult = await this.getArticleImage(title, thumbSize);
      return imageResult;
    } catch (error) {
      console.error("Error getting image by coordinates:", error);
      return null;
    }
  }
  /**
   * Get image for a place by name (searches Wikipedia directly)
   * DISABLED: This method produces unreliable results - unrelated images
   * Use coordinate-based search only for better accuracy
   * @param placeName Name of the place
   * @param thumbSize Thumbnail size in pixels (default: 500)
   * @returns Image data or null
   */
  async getImageByPlaceName(
    placeName: string,
    thumbSize: number = 500
  ): Promise<WikipediaImageResult | null> {
    // DISABLED: Name-based Wikipedia search returns too many false positives
    // Example: "flora paradise" (a garden) returned "James I of England" portrait
    // Only use coordinate-based geosearch for accurate results
    console.log(`⚠️ Wikipedia name search disabled for "${placeName}" (prevents unrelated images)`);
    return null;
  }
}

export const wikipediaImageService = new WikipediaImageService();
