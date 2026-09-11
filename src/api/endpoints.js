/**
 * endpoints.js
 *
 * Placeholder route map. Nothing here is called yet — services currently
 * point at services/mock/*. Once the backend contract is final, fill in
 * the paths below and flip the USE_MOCKS flag in services/index.js.
 */
export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    fetchSalt: '/auth/fetch-salt',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    lookupPublicKey: '/auth/lookup-public-key',
    me: '/auth/me',
  },
  files: {
    list: '/files',
    upload: '/files',
    detail: (fileId) => `/files/${fileId}`,
    download: (fileId) => `/files/${fileId}/download`,
    delete: (fileId) => `/files/${fileId}`,
  },
  sharing: {
    shareFile: (fileId) => `/files/${fileId}/share`,
    listShares: (fileId) => `/files/${fileId}/shares`,
    revokeShare: (fileId, userId) => `/files/${fileId}/share/${userId}`,
    lookupUser: '/users/lookup', // e.g. by email, to fetch a recipient's public key
  },
}

