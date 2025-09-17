import React, { useState } from 'react';
import { ItineraryRequest, ItineraryResponse } from '../services/GeminiService';

interface ItineraryPlannerProps {
  onCreateItinerary: (request: ItineraryRequest) => void;
  itinerary: ItineraryResponse | null;
  isLoading: boolean;
  isMobile: boolean;
}

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  onCreateItinerary,
  itinerary,
  isLoading,
  isMobile
}) => {
  const [formData, setFormData] = useState<ItineraryRequest>({
    destination: '',
    duration: 3,
    interests: [],
    budget: '',
    startDate: ''
  });

  const interestOptions = [
    'Culture & History',
    'Food & Dining',
    'Nature & Outdoors',
    'Arts & Museums',
    'Architecture',
    'Nightlife',
    'Shopping',
    'Adventure Sports',
    'Beach & Water Activities',
    'Local Experiences'
  ];

  const budgetOptions = [
    'Budget ($0-50/day)',
    'Moderate ($50-100/day)',
    'Comfortable ($100-200/day)',
    'Luxury ($200+/day)'
  ];

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.destination && formData.duration && formData.interests.length > 0) {
      onCreateItinerary(formData);
    }
  };

  const containerStyle = {
    maxWidth: isMobile ? '100%' : '800px',
    margin: isMobile ? '0' : '0 auto',
    padding: isMobile ? '0' : '2rem'
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    marginBottom: '1rem'
  };

  if (itinerary) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: '#333' }}>Your Itinerary</h2>
            <button
              onClick={() => onCreateItinerary(formData)}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Create New
            </button>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#667eea', margin: '0 0 0.5rem 0' }}>
              {itinerary.destination} - {itinerary.totalDays} Days
            </h3>
            <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
              {itinerary.overview}
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: '#333', margin: '0 0 1rem 0' }}>Daily Itinerary</h4>
            {itinerary.days.map((day, index) => (
              <div key={index} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                background: '#fafafa'
              }}>
                <h5 style={{ color: '#667eea', margin: '0 0 0.5rem 0' }}>
                  Day {day.day} - {day.date}
                </h5>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {day.activities.map((activity, actIndex) => (
                    <div key={actIndex} style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      borderLeft: '4px solid #667eea'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h6 style={{ margin: 0, color: '#333', fontSize: '1rem' }}>
                          {activity.time} - {activity.title}
                        </h6>
                        <span style={{
                          background: activity.type === 'attraction' ? '#e3f2fd' : 
                                    activity.type === 'restaurant' ? '#f3e5f5' : 
                                    activity.type === 'activity' ? '#e8f5e8' : '#fff3e0',
                          color: activity.type === 'attraction' ? '#1976d2' : 
                                activity.type === 'restaurant' ? '#7b1fa2' : 
                                activity.type === 'activity' ? '#388e3c' : '#f57c00',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize'
                        }}>
                          {activity.type}
                        </span>
                      </div>
                      
                      <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                        {activity.description}
                      </p>
                      
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        📍 {activity.location} • ⏱️ {activity.duration}
                        {activity.cost && ` • 💰 ${activity.cost}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {itinerary.estimatedBudget && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#333', margin: '0 0 0.5rem 0' }}>Estimated Budget</h4>
              <p style={{ color: '#667eea', fontWeight: 'bold', margin: 0 }}>
                {itinerary.estimatedBudget}
              </p>
            </div>
          )}

          {itinerary.tips && itinerary.tips.length > 0 && (
            <div>
              <h4 style={{ color: '#333', margin: '0 0 1rem 0' }}>Travel Tips</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {itinerary.tips.map((tip, index) => (
                  <li key={index} style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 1.5rem 0', color: '#333', textAlign: 'center' }}>
          Plan Your Perfect Trip
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Destination *
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="Where would you like to go?"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Duration (days) *
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 30].map(days => (
                <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Interests * (Select at least one)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {interestOptions.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  style={{
                    padding: '0.5rem',
                    border: `2px solid ${formData.interests.includes(interest) ? '#667eea' : '#e0e0e0'}`,
                    background: formData.interests.includes(interest) ? '#667eea' : 'white',
                    color: formData.interests.includes(interest) ? 'white' : '#666',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Budget Range (optional)
            </label>
            <select
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select budget range</option>
              {budgetOptions.map(budget => (
                <option key={budget} value={budget}>{budget}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 'bold' }}>
              Start Date (optional)
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !formData.destination || !formData.duration || formData.interests.length === 0}
            style={{
              width: '100%',
              padding: '1rem',
              background: isLoading || !formData.destination || !formData.duration || formData.interests.length === 0 
                ? '#cccccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'Creating Itinerary...' : 'Create My Itinerary 🎯'}
          </button>
        </form>
      </div>
    </div>
  );
};
