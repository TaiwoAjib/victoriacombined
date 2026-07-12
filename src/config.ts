// Dynamic API URL based on environment
// In development: uses Vite proxy (relative path)
// In production: uses VITE_API_URL environment variable

const envUrl = import.meta.env.VITE_API_URL;

// If VITE_API_URL is set, ensure it has protocol and ends with /api
const getApiUrl = () => {
  if (!envUrl) return '/api';
  
  let url = envUrl;
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  
  return url;
};

export const API_BASE_URL = getApiUrl();

export const SALON_INFO = {
  name: "Victoria Braids & Weaves",
  bookingPhone: "+1 8622157260",
  inquiryPhone: "+1 2018854565",
};

