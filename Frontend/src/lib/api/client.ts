import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types';

// Use relative URL so requests go through Next.js rewrite proxy (same-origin, no CORS)
// The Next.js rewrites in next.config.mjs proxy /api/* to the backend

// Convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Transform object keys from snake_case to camelCase
function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
      const camelKey = snakeToCamel(key);
      acc[camelKey] = transformKeys((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  transformRequest: [
    (data) => {
      if (data) {
        return JSON.stringify(transformKeys(data));
      }
      return data;
    },
  ],
});

// Request interceptor - add JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    // Get auth data from localStorage if available
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          const token = parsed?.state?.token;
          if (token) {
            // Add Authorization header with Bearer token
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status;

    if (status === 409) {
      // Business blocked or license expired
    } else if (status === 401) {
      // Unauthorized - clear auth and redirect to login
      // Skip redirect if already on the login page (e.g. wrong password attempt)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
