import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Place } from "@/lib/types";

interface PlaceCardProps {
  place: Place;
  onGetDirections: (place: Place) => void;
  onRemove: (place: Place) => void;
}

export default function PlaceCard({ place, onGetDirections, onRemove }: PlaceCardProps) {
  const getPriceDisplay = (level?: number) => {
    if (!level) return 'N/A';
    return '$'.repeat(level);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Get photo from photos array if photoUrl is missing
  const photoUrl = place.photoUrl || (place.photos && place.photos.length > 0
    ? `${place.photos[0].prefix}${place.photos[0].width}x${place.photos[0].height}${place.photos[0].suffix}`
    : undefined);

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow">
      <div className="md:flex">
        <div className="md:w-1/3">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={place.name}
              className="w-full h-48 md:h-full object-cover"
            />
          ) : (
            <div className="w-full h-48 md:h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <i className="fas fa-image text-gray-400 text-4xl"></i>
            </div>
          )}
        </div>
        <CardContent className="p-6 md:w-2/3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-xl font-bold text-gray-900 mb-1">{place.name}</h4>
              <p className="text-gray-600">{place.category}</p>
              {/* Reason/Recommendation from AI */}
              {place.reason && (
                <p className="text-xs text-blue-700 mt-1">{place.reason}</p>
              )}
              {/* Hours + Open Now */}
              {place.hours && (
                <div className="mt-1 flex items-center gap-2">
                  {typeof place.hours.open_now === 'boolean' && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${place.hours.open_now ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <i className={`fas ${place.hours.open_now ? 'fa-door-open' : 'fa-door-closed'} mr-1`} />
                      {place.hours.open_now ? 'Open now' : 'Closed'}
                    </span>
                  )}
                  {place.hours.display && (
                    <span className="text-xs text-gray-500">{place.hours.display}</span>
                  )}
                </div>
              )}
              {/* Tips summary chip */}
              {place.tipsSummary && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs">
                    <i className="fas fa-comment-dots mr-1" /> {place.tipsSummary}
                  </span>
                </div>
              )}
            </div>
            {place.rating && (
              <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                <i className="fas fa-star text-yellow-400 text-sm mr-1"></i>
                <span className="text-sm font-semibold">{place.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {place.description && (
            <p className="text-gray-700 mb-4 line-clamp-2">{place.description}</p>
          )}

          {/* Foursquare/Contact/Meta info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <i className="fas fa-clock mr-2 text-primary"></i>
              <span>{formatDuration(place.estimatedDuration)}</span>
            </div>
            {place.distanceToNext && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-map-marker-alt mr-2 text-red-500"></i>
                <span>{place.distanceToNext.toFixed(1)} km away</span>
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600">
              <i className="fas fa-dollar-sign mr-2 text-green-500"></i>
              <span>{getPriceDisplay(place.priceLevel)}</span>
            </div>
            {place.scheduledTime && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-calendar mr-2 text-blue-500"></i>
                <span>{place.scheduledTime}</span>
              </div>
            )}
            {/* Website */}
            {place.website && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-globe mr-2 text-blue-700"></i>
                <a href={place.website} target="_blank" rel="noopener noreferrer" className="underline">Website</a>
              </div>
            )}
            {/* Phone */}
            {place.tel && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-phone mr-2 text-green-700"></i>
                <a href={`tel:${place.tel}`}>{place.tel}</a>
              </div>
            )}
            {/* Email */}
            {place.email && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-envelope mr-2 text-blue-700"></i>
                <a href={`mailto:${place.email}`}>{place.email}</a>
              </div>
            )}
            {/* Social Media */}
            {place.social_media && place.social_media.twitter && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fab fa-twitter mr-2 text-blue-400"></i>
                <a href={`https://twitter.com/${place.social_media.twitter}`} target="_blank" rel="noopener noreferrer" className="underline">Twitter</a>
              </div>
            )}
            {place.social_media && place.social_media.facebook_id && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fab fa-facebook mr-2 text-blue-600"></i>
                <a href={`https://facebook.com/${place.social_media.facebook_id}`} target="_blank" rel="noopener noreferrer" className="underline">Facebook</a>
              </div>
            )}
            {/* Foursquare Review Link */}
            {place.placemaker_url && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-external-link-alt mr-2 text-purple-700"></i>
                <a href={place.placemaker_url} target="_blank" rel="noopener noreferrer" className="underline">FSQ Reviews</a>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                onClick={() => onGetDirections(place)}
                className="bg-primary hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <i className="fas fa-directions mr-1"></i>Directions
              </Button>
              {place.address && (
                <Button
                  variant="outline"
                  className="text-sm px-4 py-2 rounded-lg"
                  onClick={() => {
                    // Copy address to clipboard
                    navigator.clipboard.writeText(place.address!);
                  }}
                >
                  <i className="fas fa-copy mr-1"></i>Address
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(place)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <i className="fas fa-times"></i>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
