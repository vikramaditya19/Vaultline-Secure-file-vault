/**
 * Shared Axios client for the real FastAPI boundary.
 *
 * Axios selects Content-Type per payload: JSON for ordinary API calls and
 * multipart/form-data (including its generated boundary) for encrypted files.
 */
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

let authTokenGetter = () => null

/** Called from AuthContext so requests can attach the current JWT. */
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
    const normalized = {
      status: error.response?.status ?? null,
      message: error.response?.data?.detail || error.response?.data?.message || error.message || 'Request failed',
      original: error,
    }
    return Promise.reject(normalized)
  }
)
