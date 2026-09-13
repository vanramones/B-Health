// Detect environment and set API base URL
const getBaseUrl = () => {
  // For development/web browser
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5000/api';
  }
  
  // For Capacitor/Ionic mobile app
  if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
    // Change this to your actual backend server IP/domain
    // Example: 'http://192.168.1.100:5000/api' or 'https://your-backend.com/api'
    return 'http://localhost:5000/api';
  }
  
  // Default fallback
  return 'http://localhost:5000/api';
};

export const BASE_URL = getBaseUrl();
