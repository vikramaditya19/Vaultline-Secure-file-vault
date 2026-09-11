/**
 * authService.js
 */
import { mockAuthService } from './mock/mockAuthService'

export const authService = {
  async register(payload) {
    return mockAuthService.register(payload)
  },

  async fetchSalt(payload) {
    return mockAuthService.fetchSalt(payload)
  },

  async login(payload) {
    return mockAuthService.login(payload)
  },

  async logout() {
    return mockAuthService.logout()
  },

  async lookupPublicKey(payload) {
    return mockAuthService.lookupPublicKey(payload)
  },
}
