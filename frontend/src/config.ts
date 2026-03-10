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
  ALLOWED_FILE_TYPES: [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/x-gzip',
    'application/json',
    'text/javascript',
    'text/css',
    'text/html',
    'text/xml',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
}; 