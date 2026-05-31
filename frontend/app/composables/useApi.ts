export function useApiUrl() {
  if (typeof window !== 'undefined') {
    // If on local development, target backend on port 5002
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5002';
    }
    // In production, backend and frontend share the same origin
    return window.location.origin;
  }
  return 'http://localhost:5002';
}
