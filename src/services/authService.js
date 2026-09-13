import { apiClient } from '../api/client'
import { ENDPOINTS } from '../api/endpoints'

export const authService = {
  async register(payload) {
    return (await apiClient.post(ENDPOINTS.auth.register, payload)).data
  },
  async fetchSalt(payload) {
    return (await apiClient.post(ENDPOINTS.auth.fetchSalt, payload)).data
  },
  async login(payload) {
    return (await apiClient.post(ENDPOINTS.auth.login, payload)).data
  },
  async logout() {
    return (await apiClient.post(ENDPOINTS.auth.logout)).data
  },
  async lookupPublicKey(payload) {
    return (await apiClient.post(ENDPOINTS.auth.lookupPublicKey, payload)).data
  },
}
