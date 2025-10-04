import React, { useState, useEffect } from 'react';
import { Place } from '../services/FoursquareService';

interface LocationSearchProps {
  onSearch: (query: string, location?: { lat: number; lng: number }) => Promise<Place[]>;
  nearbyPlaces: Place[];
  currentLocation: { lat: number; lng: number } | null;
  isMobile: boolean;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onSearch,
  nearbyPlaces,
  currentLocation,
  isMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { key: 'all', label: 'All', icon: '🌍' },
    { key: 'restaurant', label: 'Food', icon: '🍽️' },
    { key: 'attraction', label: 'Attractions', icon: '🎯' },
    { key: 'hotel', label: 'Hotels', icon: '🏨' },
    { key: 'shopping', label: 'Shopping', icon: '🛍️' }
  ];

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const performSearch = async () => {
    if (!searchQuery.trim() || !currentLocation) return;

    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery, currentLocation);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredNearbyPlaces = selectedCategory === 'all' 
    ? nearbyPlaces 
    : nearbyPlaces.filter(place => 
        place.category.toLowerCase().includes(selectedCategory) ||
        (selectedCategory === 'restaurant' && place.category.toLowerCase().includes('food')) ||
        (selectedCategory === 'attraction' && (
          place.category.toLowerCase().includes('museum') ||
          place.category.toLowerCase().includes('park') ||
          place.category.toLowerCase().includes('landmark')
        ))
      );

  const displayPlaces = searchQuery.trim() ? searchResults : filteredNearbyPlaces;

  const containerStyle = {
    maxWidth: isMobile ? '100%' : '800px',
    margin: isMobile ? '0' : '0 auto'
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginBottom: '1rem'
  };

  return (
    <div style={containerStyle}>
      {/* Search Input */}
      <div style={cardStyle}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for places..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              border: '2px solid #e0e0e0',
              borderRadius: '25px',
              fontSize: '1rem',
              boxSizing: 'border-box',
              background: '#f8f9fa'
            }}
          />
          <span style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.2rem'
          }}>
            🔍
          </span>
          {isSearching && (
            <div style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
        </div>
      </div>

      {/* Category Filter */}
      {!searchQuery.trim() && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Categories</h3>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'space-between' : 'flex-start'
          }}>
            {categories.map(category => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                style={{
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto',
                  padding: '0.5rem 1rem',
                  border: `2px solid ${selectedCategory === category.key ? '#667eea' : '#e0e0e0'}`,
                  background: selectedCategory === category.key ? '#667eea' : 'white',
                  color: selectedCategory === category.key ? 'white' : '#666',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: isMobile ? '1.2rem' : '1rem' }}>{category.icon}</span>
                <span style={{ fontSize: isMobile ? '0.8rem' : '0.9rem' }}>{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
          {searchQuery.trim() ? `Search Results (${displayPlaces.length})` : 
           `Nearby Places (${displayPlaces.length})`}
        </h3>

        {!currentLocation && (
          <div style={{
            background: '#fff3cd',
            color: '#856404',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            📍 Enable location services to find nearby places
          </div>
        )}

        {displayPlaces.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#666',
            padding: '2rem'
          }}>
            {searchQuery.trim() ? 
              `No places found for "${searchQuery}"` : 
              'No nearby places found'
            }
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {displayPlaces.map((place, index) => (
              <div key={place.id || index} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1rem',
                background: '#fafafa',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '1.1rem' }}>
                    {place.name}
                  </h4>
                  {place.rating && (
                    <span style={{
                      background: '#4caf50',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      ⭐ {place.rating}
                    </span>
                  )}
                </div>

                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  📍 {place.address}
                </p>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <span style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.8rem'
                  }}>
                    {place.category}
                  </span>

                  {place.price && (
                    <span style={{
                      background: '#f3e5f5',
                      color: '#7b1fa2',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      💰 {'$'.repeat(place.price)}
                    </span>
                  )}

                  {place.hours && (
                    <span style={{
                      color: '#666',
                      fontSize: '0.8rem'
                    }}>
                      🕒 {place.hours}
                    </span>
                  )}

                  {place.phone && (
                    <span style={{
                      color: '#666',
                      fontSize: '0.8rem'
                    }}>
                      📞 {place.phone}
                    </span>
                  )}
                </div>

                {place.description && (
                  <p style={{
                    margin: '0.5rem 0 0 0',
                    color: '#666',
                    fontSize: '0.85rem',
                    fontStyle: 'italic'
                  }}>
                    {place.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
