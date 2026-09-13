/**
 * Route map for the FastAPI contract mounted below /api. Vite proxies /api
 * locally; deployments can set VITE_API_BASE_URL to the hosted API prefix.
 */
export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    fetchSalt: '/auth/fetch-salt',
    login: '/auth/login',
    logout: '/auth/logout',
    lookupPublicKey: '/auth/lookup-public-key',
    me: '/auth/me',
  },
  files: {
    list: '/files',
    upload: '/files/upload',
    detail: (fileId) => `/files/${fileId}`,
    download: (fileId) => `/files/${fileId}/download`,
    delete: (fileId) => `/files/${fileId}`,
  },
  sharing: {
    shareFile: '/sharing/share',
    listShares: (fileId) => `/sharing/file/${fileId}`,
    revokeShare: '/sharing/revoke',
    sharedWithMe: '/sharing/shared-with-me',
  },
}
