/**
 * authService.js
 *
 * Public interface the rest of the app calls. Every method here is a
 * placeholder that currently delegates to the mock implementation.
 *
 * TO SWITCH TO THE REAL BACKEND: replace the body of each method with an
 * apiClient call against ENDPOINTS.auth.*, keeping the same method
 * signatures and return shapes — nothing outside this file should need
 * to change. This file intentionally does NOT do any crypto itself;
 * callers (AuthContext) derive keys via src/crypto and pass in only
 * values that are safe to transmit (authProof, public key, wrapped
 * private key).
 */
import { mockAuthService } from './mock/mockAuthService'
// import { apiClient } from '../api/client'
// import { ENDPOINTS } from '../api/endpoints'

export const authService = {
  /** @param {{email: string, authProofB64: string, publicKeyB64: string, wrappedPrivateKeyB64: string}} payload */
  async register(payload) {
    return mockAuthService.register(payload)
    // return (await apiClient.post(ENDPOINTS.auth.register, payload)).data
  },

  /** @param {{email: string}} payload */
  async fetchSalt(payload) {
    return mockAuthService.fetchSalt(payload)
  },

  /** @param {{email: string, authProofB64: string}} payload */
  async login(payload) {
    return mockAuthService.login(payload)
    // return (await apiClient.post(ENDPOINTS.auth.login, payload)).data
  },

  async logout() {
    return mockAuthService.logout()
    // return (await apiClient.post(ENDPOINTS.auth.logout)).data
  },

  /** @param {{email: string}} payload — used to fetch a recipient's public key before sharing */
  async lookupPublicKey(payload) {
    return mockAuthService.lookupPublicKey(payload)
  },
}
