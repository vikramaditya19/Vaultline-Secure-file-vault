# Vaultline Authentication Debug Log

## Issue
User trying to sign in with email `ishan5@email.com` and password `Ishan@12345` → Getting "Incorrect email or password" error

## Screenshots
![Login Error](Login_Error_Screenshot.png)
- Shows the exact error state
- Email: ishan5@email.com
- Password: Ishan@12345
- Error message displayed in red box
- Eye icon visible (password toggle working)

## Setup Status
✅ Frontend: Running on http://localhost:5173 (Vite dev server)
✅ Backend: Running on http://localhost:8000 (uvicorn)
✅ Database: PostgreSQL on localhost:5432, vaultline database exists
✅ Tables: users, files, shares all created in database

## Changes Made
1. Updated `src/services/authService.js` to use mock auth service (not real backend)
2. Switched password hashing from bcrypt to argon2 (bcrypt broken on Python 3.14)
3. Added password visibility toggle to Input component
4. Fixed requirements.txt with compatible versions for Python 3.14

## Current Problem
- User signs up with `ishan5@email.com` / `Ishan@12345`
- Frontend says it's using mock auth service
- But login attempt returns "Incorrect email or password"
- This error comes from backend `/fetch-salt` endpoint, NOT mock service
- **Conclusion: Frontend is still calling real backend, not mock**

## Symptoms
1. Hard refresh (Ctrl+Shift+R) doesn't fix it
2. Browser cache clearing doesn't fix it
3. Error message "No account found for this email" = backend error
4. Mock service would say "User not found" (different message)

## Root Cause Analysis
Frontend authService.js SHOULD be calling `mockAuthService.register()`, but it's somehow still calling the real API endpoints instead.

Possible causes:
- Browser cache not cleared properly
- Module not reloaded by Vite dev server
- Import path issue in authService.js
- Vite HMR (Hot Module Reload) not working

## Files Modified
- `src/services/authService.js` - switched to mock
- `backend-integration/app/utils/auth_utils.py` - changed bcrypt to argon2
- `src/components/common/Input.jsx` - added password toggle
- `src/components/common/Input.css` - styled password toggle
- `src/api/endpoints.js` - added fetchSalt endpoint
- `.env.local` - set VITE_API_BASE_URL

## Next Steps for Debugging
1. Check browser Network tab → see what URL is actually being called on login
2. Check browser Console → any errors or warnings?
3. Verify `src/services/authService.js` actually has mock imports (not apiClient)
4. Try accessing http://localhost:5173 in **Incognito/Private mode** (clears all cache)
5. If incognito works → browser cache is the issue
6. If incognito fails → there's a code issue

## Test Account Details
- Email: `ishan5@email.com`
- Password: `Ishan@12345`
- Tried: Fresh signup, logout, login again
- Result: Always "Incorrect email or password"

## System Info
- OS: Windows
- Python: 3.12 (in .venv)
- Node: (need to check version)
- Frontend: Vite React
- Backend: FastAPI
- Database: PostgreSQL 18

---
**Status:** BLOCKED - Cannot proceed with auth testing until this is resolved
