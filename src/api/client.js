/**
 * client.js
 *
 * Thin axios wrapper. This is intentionally the ONLY file that knows
 * about base URLs, headers, and auth token attachment. Every service
 * (authService, fileService, sharingService) calls through here instead
 * of importing axios directly, so swapping mocks for real endpoints
 * later touches this file and the services/mock/* files — nothing else.
 *
 * NOTE: base URL and auth header wiring are placeholders. Fill in
 * VITE_API_BASE_URL and the token storage strategy once the backend
 * team publishes the real contract.
 */
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

let authTokenGetter = () => null

/** Called once from AuthContext so this client can attach the current JWT. */
export function registerAuthTokenGetter(getter) {
  authTokenGetter = getter
}

apiClient.interceptors.request.use((config) => {
  const token = authTokenGetter()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralized shape so UI code doesn't need to know axios internals.
    const normalized = {
      status: error.response?.status ?? null,
      message: error.response?.data?.message || error.message || 'Request failed',
      original: error,
    }
    return Promise.reject(normalized)
  }
)
