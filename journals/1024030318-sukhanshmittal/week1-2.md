# Vaultline Troubleshooting & Solutions Log

## Session Overview
**Goal:** Connect frontend (localhost:5173) to backend (localhost:8000) with PostgreSQL database and working authentication

**Status:** ✅ RESOLVED - Backend and frontend now communicating with in-memory auth

---

## Issues Faced & Solutions

### 1. Python 3.14 Dependency Conflicts
**Problem:**
- `psycopg-binary==3.1.12` doesn't exist (only 3.2.10+)
- `pydantic-core` build failures on Python 3.14
- Python 3.14 too new for many pinned package versions

**Error:**
```
ERROR: Could not find a version that satisfies the requirement psycopg-binary==3.1.12
```

**Solution:**
- Changed from strict `==` version locks to minimum `>=` versions in requirements.txt
- Updated all packages to Python 3.14-compatible versions:
  - `psycopg[binary]>=3.3.5`
  - `fastapi>=0.110.0`
  - `pydantic>=2.7.0`
  - `email-validator>=2.0.0`

**File:** `backend-integration/requirements.txt`

---

### 2. SQLAlchemy Text() Import Issue
**Problem:**
- SQLAlchemy 2.0+ requires explicit `text()` wrapper for SQL strings
- Error: `Textual SQL expression 'SELECT 1' should be explicitly declared as text('SELECT 1')`

**Solution:**
- Added import: `from sqlalchemy import text`
- Wrapped raw SQL: `db.execute(text("SELECT 1"))`

**File:** `backend-integration/app/database.py` (line 41)

---

### 3. Bcrypt Broken on Python 3.14
**Problem:**
- Bcrypt version incompatibility with Python 3.14
- Error: `AttributeError: module 'bcrypt' has no attribute '__about__'`
- Also: `password cannot be longer than 72 bytes`

**Solution:**
- Switched from bcrypt to argon2 (more secure anyway)
- Changed `passlib[bcrypt]` to `passlib[argon2]` in requirements.txt
- Updated `auth_utils.py` to use argon2 context

**Why Argon2?**
- Winner of Password Hashing Competition
- Memory-hard (resistant to GPU attacks)
- Works with Python 3.14+
- More secure than bcrypt

**File:** `backend-integration/app/utils/auth_utils.py`

---

### 4. Missing email-validator Dependency
**Problem:**
- Pydantic EmailStr type requires email-validator library
- Error: `ImportError: email-validator is not installed`

**Solution:**
- Added `email-validator>=2.0.0` to requirements.txt

**File:** `backend-integration/requirements.txt`

---

### 5. Frontend Still Calling Backend Instead of Mock
**Problem:**
- User could not sign up/login even after switching `authService.js` to mock
- Frontend kept calling real backend `/fetch-salt` endpoint
- Error: "No account found for this email" (backend 404, not mock)

**Root Cause:**
- Browser aggressive caching despite Ctrl+Shift+R
- Vite dev server HMR not reloading the module properly

**Solution:**
- Open browser in **Incognito/Private mode** (clears all cache)
- Or: Close tab completely and reopen fresh tab
- Verified by checking Network tab to see actual endpoint being called

**Lesson:** Browser cache can persist across hard refresh; private mode is the nuclear option

---

### 6. Auth Endpoints Mismatch
**Problem:**
- Backend had complex JWT + bcrypt logic
- Frontend mock service is simple (in-memory, direct comparison)
- They didn't match → authentication failed

**Error Flow:**
```
Frontend: sends authProofB64
Backend: tries bcrypt verification
Mismatch: authProof too long for bcrypt (>72 bytes)
Result: 500 Internal Server Error
```

**Solution:** 
Simplified backend to match mock service exactly:
- **No hashing** - direct authProofB64 comparison
- **No JWT** - just return fake tokens
- **No database** - in-memory dict (`_users_db`)
- **No password hashing** - client already did PBKDF2, server just stores it

**Files:**
- `backend-integration/app/routers/auth.py` - completely rewritten

**Key Decision:** Follow Claude's guidance:
> "Do NOT modify authentication scheme. Current setup: in-memory dict for now, authProofB64 comparison only — no bcrypt/argon2/password hashing"

---

### 7. Auth Endpoints API URL Issue
**Problem:**
- `.env.local` had `VITE_API_BASE_URL=http://localhost:8000`
- But backend routes are mounted at `/api` prefix
- Frontend sending to `http://localhost:8000/auth/register` (404)
- Should send to `http://localhost:8000/api/auth/register`

**Solution:**
- Updated `.env.local`: `VITE_API_BASE_URL=http://localhost:8000/api`
- Updated `endpoints.js` to include all auth endpoints: `fetchSalt`, `lookupPublicKey`

**Files:**
- `.env.local`
- `src/api/endpoints.js`

---

### 8. Duplicate & Corrupted Auth File
**Problem:**
- After str_replace, old code remained in `auth.py` below new code
- Result: 334+ lines with duplicate endpoints, broken imports
- Error: `NameError: get_current_user not defined`

**Root Cause:**
- str_replace only replaced the FIRST occurrence of auth endpoints
- Old endpoint code below was never removed

**Solution:**
- Completely rewrote file using `fs_write` (not str_replace)
- Fresh, clean implementation with only 5 endpoints (register, fetch-salt, login, logout, lookup-public-key)
- Removed all database/JWT/hashing logic

**Lesson:** When file is severely broken, `fs_write` is better than targeted replacements

**File:** `backend-integration/app/routers/auth.py`

---

### 9. Database Creation Without pgAdmin CLI
**Problem:**
- User couldn't access pgAdmin at localhost:5050
- PostgreSQL running but no direct CLI access
- Needed to create `vaultline` database

**Solution:**
- Created `create_db.py` to programmatically create database using SQLAlchemy:
  ```python
  engine.connect()
  conn.execution_options(isolation_level="AUTOCOMMIT").execute(text('CREATE DATABASE vaultline'))
  ```

**File:** `backend-integration/create_db.py`

---

### 10. pgAdmin UI Cache Issue
**Problem:**
- Tables created in database (verified by SQL query)
- But pgAdmin UI showed "No tables" under public schema
- User thought tables didn't exist

**Solution:**
- Explained it's a UI cache issue, not a real problem
- Verified tables actually exist with: `SELECT table_name FROM information_schema.tables`
- Created `verify_tables.py` to prove tables exist

**Files:** 
- `backend-integration/verify_tables.py`

**Takeaway:** Sometimes the UI lies; always verify with SQL queries

---

### 11. Password Visibility Toggle Missing
**Problem:**
- User said "add that u can see the password after entering"
- Password field didn't have show/hide toggle

**Solution:**
- Added state hook to Input component: `const [showPassword, setShowPassword] = useState(false)`
- Conditional input type: `isPasswordField && showPassword ? 'text' : type`
- Added toggle button with eye emoji (👁️)
- Styled with absolute positioning and proper hover/focus states

**Files:**
- `src/components/common/Input.jsx`
- `src/components/common/Input.css`

---

### 12. Database Connection & Table Creation Process
**Problem:**
- Complex multi-step process:
  1. Create database in pgAdmin (couldn't access)
  2. Initialize tables with `init_db.py`
  3. Verify with `verify_tables.py`
  4. Backend queries database

**Solution:**
- Streamlined to: `create_db.py` → `init_db.py` → `verify_tables.py`
- Clear, sequential scripts for each step
- Error messages guide user to next step

**Files:**
- `backend-integration/create_db.py` - create vaultline database
- `backend-integration/init_db.py` - create tables (users, files, shares)
- `backend-integration/verify_tables.py` - verify tables exist

---

### 13. Requirements.txt Needs Loose Versioning
**Problem:**
- Strict `==` pinning fails on Python 3.14
- Packages like pydantic-core, bcrypt broken on new Python

**Solution:**
```
# Before (breaks):
fastapi==0.104.1
pydantic==2.5.0
passlib[bcrypt]==1.7.4

# After (works):
fastapi>=0.110.0
pydantic>=2.7.0
passlib[argon2]>=1.7.4
```

**Why?**
- `>=` lets pip find compatible versions for your Python version
- Old packages weren't tested on Python 3.14
- Newer versions have fixes

---

## Key Decisions Made

### 1. Simple Auth First
**Decision:** Use in-memory dict for auth instead of PostgreSQL
**Reasoning:** 
- Matches mock service exactly
- No bcrypt/JWT complexity
- Can migrate to database later
- Client already handles crypto (PBKDF2)

### 2. Argon2 Over Bcrypt
**Decision:** Switch to argon2
**Reasoning:**
- Bcrypt broken on Python 3.14
- Argon2 more secure (memory-hard)
- Better compatibility going forward

### 3. Loose Version Constraints
**Decision:** Use `>=` instead of `==`
**Reasoning:**
- Python 3.14 is bleeding edge
- Pinned versions often incompatible
- Pip finds compatible versions automatically

### 4. Frontend First (Mock Service)
**Decision:** Keep using mock service, debug backend separately
**Reasoning:**
- Unblock frontend development
- Test auth flow without backend
- Easier to debug one layer at a time

---

## Testing Checklist

✅ Backend running on localhost:8000  
✅ Frontend running on localhost:5173  
✅ PostgreSQL database created  
✅ users/files/shares tables created  
✅ User can sign up via frontend  
✅ User can log out  
✅ User can log back in  
✅ Password visibility toggle working  
✅ Correct error messages (409, 404, 401)  
✅ API documentation at /docs  

---

## Next Steps (Not Done Yet)

- [ ] Implement file upload/download endpoints
- [ ] Connect to real PostgreSQL (switch from in-memory)
- [ ] Implement file sharing logic
- [ ] Add Google Sign-In
- [ ] Deploy to DigitalOcean
- [ ] Set up custom domain with Cloudflare
- [ ] Add JWT authentication
- [ ] Implement token refresh/revocation

---

## Commands Reference

```bash
# Install dependencies
pip install -r requirements.txt

# Create database
python create_db.py

# Initialize tables
python init_db.py

# Verify tables
python verify_tables.py

# Run backend
uvicorn app.main:app --reload --port 8000

# Run frontend
npm run dev
```

---

## Resources Created

1. **DEBUG_LOG.md** - Initial issue documentation
2. **TROUBLESHOOTING_LOG.md** - This file, comprehensive issue log
3. **create_db.py** - Programmatic database creation
4. **init_db.py** - Table initialization script
5. **verify_tables.py** - Table verification script

---

## Key Lessons

1. **Python 3.14 is bleeding edge** - Many packages don't support it yet, use loose versioning
2. **Browser cache is aggressive** - Hard refresh doesn't always work, use Incognito/Private mode
3. **Follow the mock service spec** - It's the source of truth for API contracts
4. **Simplify first, complicate later** - In-memory auth works great for MVP
5. **SQL queries don't lie** - pgAdmin UI might be wrong, but SQL is always right
6. **Match error codes exactly** - 409, 404, 401 matter for client-side logic
7. **Corrupted files need fs_write, not str_replace** - When in doubt, rewrite

---

**Last Updated:** September 11, 2026  
**Session Status:** ✅ AUTH WORKING - Ready for file operations
