// API Configuration - Use relative path for proxy
export const API_URL = process.env.REACT_APP_API_URL || 'https://qr-file-backend.onrender.com';

// Export additional configuration
export const CONFIG = {
  POLL_INTERVAL: 5000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
  MIN_RETRY_DELAY: 1000, // 1 second minimum between retries
  MAX_RETRY_DELAY: 5000, // 5 seconds maximum between retries
  MAX_FILE_SIZE: 1024 * 1024 * 500, // 500MB
  ALLOWED_FILE_TYPES: ['*/*'] // All types supported
}; 