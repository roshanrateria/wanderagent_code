import React, { useEffect, useState } from 'react';
import { useDeviceType } from './hooks/useDeviceType';
import { MobileTravelPlanner } from './components/MobileTravelPlanner';
import './App.css';

// Import your existing web components here
// import { WebTravelPlanner } from './components/WebTravelPlanner'; // Uncomment when you have this

function App() {
  const deviceInfo = useDeviceType();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app based on device type
    const initializeApp = async () => {
      try {
        console.log('Device Info:', deviceInfo);
        
        // Add any initialization logic here
        if (deviceInfo.isMobile) {
          console.log('Running on mobile device:', deviceInfo.platform);
        } else {
          console.log('Running on web platform');
        }
        
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [deviceInfo]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>WanderAgent</h2>
          <p>Starting your travel companion...</p>
        </div>
      </div>
    );
  }

  // Render mobile version for mobile devices
  if (deviceInfo.isMobile) {
    return (
      <div className="App mobile-app">
        <MobileTravelPlanner />
      </div>
    );
  }

  // Render web version for desktop/web
  return (
    <div className="App web-app">
      <header className="app-header">
        <div className="container">
          <h1>🌍 WanderAgent</h1>
          <p>Your AI-Powered Travel Planning Companion</p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {/* Replace this with your existing web components */}
          <div className="web-placeholder">
            <div className="welcome-card">
              <h2>Welcome to WanderAgent Web</h2>
              <p>
                This is the web version of your travel planning app. 
                Replace this component with your existing web interface.
              </p>
              
              <div className="feature-grid">
                <div className="feature-card">
                  <h3>🎯 AI Itinerary Planning</h3>
                  <p>Get personalized travel itineraries powered by Gemini AI</p>
                </div>
                
                <div className="feature-card">
                  <h3>🔍 Place Discovery</h3>
                  <p>Find amazing places with Foursquare integration</p>
                </div>
                
                <div className="feature-card">
                  <h3>🗺️ Route Optimization</h3>
                  <p>Get optimal routes with OSRM routing service</p>
                </div>
                
                <div className="feature-card">
                  <h3>✈️ Flight Booking</h3>
                  <p>Book flights and manage your complete travel experience</p>
                </div>
              </div>

              <div className="cta-section">
                <p>To use your existing web interface, replace the content in src/App.tsx</p>
                <button 
                  className="cta-button"
                  onClick={() => {
                    alert('Integrate your existing web components here!');
                  }}
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>&copy; 2025 WanderAgent. Your AI Travel Companion.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
