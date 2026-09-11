Deployment Guide - Vaultline with GitHub Student Pack

This guide covers deploying with free credits from GitHub Student Pack:
1. Hosting the frontend (free with credits)
2. Hosting the backend (free with credits)
3. Database hosting (free tier)
4. Connecting with Cloudflare domain
5. Adding Google Sign-In

========================================================================
PART 0: GITHUB STUDENT PACK BENEFITS
========================================================================

Your GitHub Student Pack includes:

FREE CREDITS:
- DigitalOcean: $50 credit (12 months)
- GitHub Codespaces: 60 core-hours/month free
- GitLab Premium: 1 year free
- JetBrains IDEs: 1 year free (not needed for this)

DATABASE:
- Supabase: 2 free projects with PostgreSQL

HOSTING OPTIONS WITH CREDITS:

Option A: DigitalOcean App Platform ($50 credit = ~10 months free)
  - Deploy frontend and backend
  - 12 GB storage
  - Excellent value
  - Simple deployment

Option B: Railway.app (Free tier, then paid)
  - $5/month credit when you sign up
  - Good for learning
  - Easy setup

Option C: GitHub Codespaces (Free from student pack)
  - Can run backend 24/7 for development
  - 60 core-hours/month

RECOMMENDED FOR YOU:
DigitalOcean App Platform + Supabase
- Frontend: DigitalOcean (using $50 credit)
- Backend: DigitalOcean (using $50 credit)
- Database: Supabase (free tier PostgreSQL)
- Total cost: Free for 10 months!

========================================================================
PART 1: ACTIVATE GITHUB STUDENT PACK
========================================================================

1. Go to education.github.com/pack
2. Sign in with your GitHub account
3. Verify you're a student
4. Accept terms
5. You'll see all available benefits
6. Click "Get access" on DigitalOcean
7. Get your $50 credit code

========================================================================
PART 2: SETUP DIGITALOCEAN (Frontend + Backend Hosting)
========================================================================

Step 1: Create DigitalOcean Account

1. Go to digitalocean.com
2. Click "Sign up"
3. Sign up with GitHub (easiest)
4. Verify email

Step 2: Apply GitHub Student Pack Credit

1. Go to Billing > Promotions
2. Enter your $50 code from GitHub Pack
3. Credit applied to your account

Step 3: Create Frontend App

1. Go to Apps (left sidebar)
2. Click "Create Apps"
3. Choose "Deploy from GitHub"
4. Connect your GitHub account
5. Select your vaultline repository
6. Source Branch: main
7. Build settings:
   - Framework: Vite
   - Build command: npm run build
   - Output directory: dist
8. Set environment variables:
   VITE_API_BASE_URL=https://api.yoursite.com
9. Set resource tier (Starter $5/month is fine)
10. Click Deploy

Your frontend URL: app-name-xxxx.ondigitalocean.app

Step 4: Create Backend App

1. Go to Apps > Create Apps
2. Choose "Deploy from GitHub"
3. Same repository
4. Choose "backend-integration" folder
5. Framework: Python/FastAPI
6. Build settings:
   - Build command: pip install -r requirements.txt
   - Run command: uvicorn app.main:app --host 0.0.0.0 --port 8080
7. Set environment variables:
   DATABASE_URL=your-supabase-connection-string (from Part 3)
   SECRET_KEY=generate-with: python -c "import secrets; print(secrets.token_urlsafe(32))"
   JWT_EXPIRY_HOURS=24
   CORS_ORIGINS=https://yoursite.com,https://www.yoursite.com
8. Set resource tier (Starter $5/month)
9. Click Deploy

Your backend URL: api-app-xxxx.ondigitalocean.app

========================================================================
PART 3: DATABASE WITH SUPABASE (Free PostgreSQL)
========================================================================

Step 1: Create Supabase Account

1. Go to supabase.com
2. Sign up with GitHub
3. Create new project "vaultline"
4. Choose region closest to you
5. Set database password
6. Click Create

Step 2: Get Connection String

1. In Supabase dashboard
2. Go to Project Settings > Database
3. Copy "Connection string" (Pooling mode)
4. Replace [YOUR-PASSWORD] with your password
5. Connection string looks like:
   postgresql://postgres:password@db.supabase.co:6543/postgres

Step 3: Use in DigitalOcean

1. Copy connection string
2. Go to DigitalOcean backend app
3. Edit > Settings > Environment Variables
4. Add: DATABASE_URL=your-connection-string
5. Redeploy

Step 4: Verify Connection

1. Visit your backend: https://api-app-xxxx.ondigitalocean.app/docs
2. Should see Swagger API docs
3. If shows error, check DATABASE_URL in logs

========================================================================
PART 4: CLOUDFLARE DOMAIN SETUP
========================================================================

Step 1: Point Domain to DigitalOcean Frontend

In Cloudflare Dashboard:
1. Go to DNS settings
2. Add CNAME records:

   Name: @
   Type: CNAME
   Value: app-name-xxxx.ondigitalocean.app

   Name: www
   Type: CNAME
   Value: app-name-xxxx.ondigitalocean.app

Step 2: Add Custom Domain to DigitalOcean

1. Go to DigitalOcean > Apps > Your Frontend App
2. Settings > Domains
3. Add custom domain: yoursite.com
4. Add www.yoursite.com
5. DigitalOcean will verify DNS

Step 3: Point API Subdomain

In Cloudflare DNS:
1. Add CNAME record:

   Name: api
   Type: CNAME
   Value: api-app-xxxx.ondigitalocean.app

2. Enable Cloudflare proxy (orange cloud)

Step 4: SSL/TLS

1. In Cloudflare go to SSL/TLS
2. Set to "Flexible" or "Full"
3. Both frontend and backend now have HTTPS

Final DNS Records:
  @ CNAME app-name-xxxx.ondigitalocean.app
  www CNAME app-name-xxxx.ondigitalocean.app
  api CNAME api-app-xxxx.ondigitalocean.app

========================================================================
PART 5: GOOGLE SIGN-IN INTEGRATION
========================================================================

Step 1: Create Google OAuth Credentials

1. Go to console.cloud.google.com
2. Create new project "Vaultline"
3. Search for "OAuth 2.0" in APIs
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Authorized redirect URIs:
   https://yoursite.com/auth/callback
   https://api.yoursite.com/auth/callback
   http://localhost:3000/auth/callback (for testing)
7. Get: Client ID and Client Secret

Step 2: Update Backend

Add to backend environment variables in DigitalOcean:
  GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-client-secret
  GOOGLE_REDIRECT_URI=https://yoursite.com/auth/callback

Step 3: Add Google Endpoint to Backend

In app/routers/auth.py add:

```python
from google.oauth2 import id_token
from google.auth.transport import requests

@router.post("/auth/google")
async def google_signin(google_token: str, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(
            google_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        email = idinfo.get('email')
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            user = User(
                email=email,
                username=email.split('@')[0],
                password_hash="google_oauth",
                public_key=b"",
            )
            db.add(user)
            db.commit()
        
        access_token = create_access_token(data={"sub": user.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "email": user.email
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token")
```

Also add to requirements.txt:
```
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
```

Step 4: Update Frontend

Install Google SDK:
```bash
npm install @react-oauth/google
```

Create src/components/common/GoogleLoginButton.jsx:

```javascript
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

export function GoogleLoginButton() {
  async function handleGoogleSuccess(credentialResponse) {
    const token = credentialResponse.credential
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/google`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ google_token: token })
        }
      )
      
      const data = await response.json()
      localStorage.setItem('access_token', data.access_token)
      window.location.href = '/dashboard'
      
    } catch (error) {
      console.error('Google login failed:', error)
    }
  }
  
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleLogin onSuccess={handleGoogleSuccess} />
    </GoogleOAuthProvider>
  )
}
```

Update LoginPage.jsx to include the Google button

Add to .env.local:
```
VITE_GOOGLE_CLIENT_ID=your-client-id
```

Add to DigitalOcean frontend app environment variables:
```
VITE_GOOGLE_CLIENT_ID=your-client-id
```

========================================================================
DEPLOYMENT SUMMARY WITH STUDENT PACK
========================================================================

Total Cost: FREE for first 10 months!
  - DigitalOcean $50 credit covers ~10 months
  - Supabase free tier (no cost)
  - GitHub Student Pack (free)
  - Domain cost only (if not free)

Timeline: 2-3 hours

Services Needed:
  [ ] GitHub account (you have)
  [ ] DigitalOcean account (create with $50 credit)
  [ ] Supabase account (free, create)
  [ ] Google Console account (free, create)
  [ ] Cloudflare domain (already have)

Deployment Steps:
  1. Apply GitHub Student Pack credit to DigitalOcean ($50)
  2. Create Supabase PostgreSQL database
  3. Deploy frontend to DigitalOcean Apps
  4. Deploy backend to DigitalOcean Apps
  5. Connect database to backend
  6. Setup Cloudflare DNS records
  7. Create Google OAuth credentials
  8. Add Google Sign-In to app
  9. Test everything

========================================================================
STEP-BY-STEP WALKTHROUGH
========================================================================

Step 1: DigitalOcean Setup (15 mins)
  - Create account
  - Apply student pack credit
  - Verify billing

Step 2: Supabase Setup (10 mins)
  - Create account
  - Create project
  - Get connection string

Step 3: Deploy Frontend (15 mins)
  - Go to Apps > Create
  - Connect GitHub
  - Set build settings
  - Add environment variables
  - Deploy

Step 4: Deploy Backend (15 mins)
  - Go to Apps > Create
  - Connect GitHub (same repo)
  - Set backend folder
  - Set build settings
  - Add environment variables
  - Deploy

Step 5: Configure Domain (10 mins)
  - Add Cloudflare DNS records
  - Wait for DNS propagation (24-48 hours)
  - Test after propagation

Step 6: Google Sign-In (30 mins)
  - Create Google OAuth credentials
  - Add backend code
  - Add frontend code
  - Update environment variables
  - Test sign-in

Step 7: Testing (15 mins)
  - Register account
  - Login
  - Upload file
  - Test Google Sign-In
  - Check logs for errors

========================================================================
MONITORING AND SCALING
========================================================================

Free Tier Limits:
  - DigitalOcean App: 1 free app, then $5/month each
  - Supabase: 500MB storage, 50k API calls/month
  - With $50 credit: Can run 2-3 apps for ~10 months

After Student Pack Expires:
  - ~$10-15/month for continued hosting
  - Or upgrade to paid tier if app grows
  - Can get more credits by referring friends

Monitor Usage:
  - DigitalOcean shows CPU, RAM, bandwidth
  - Supabase shows database usage
  - Both have alerts for overages

========================================================================
TROUBLESHOOTING
========================================================================

Build fails:
  - Check logs in DigitalOcean
  - Verify requirements.txt is in root or build command is correct
  - Check for environment variable syntax errors

Database won't connect:
  - Copy full connection string including password
  - Paste exactly into DATABASE_URL
  - Check Supabase shows active connection
  - Look at backend logs for specific error

Domain not working:
  - DNS takes 24-48 hours to propagate
  - Check Cloudflare DNS records are correct
  - Verify DigitalOcean app is healthy (green status)
  - Try clearing browser cache

Google Sign-In not working:
  - Check CLIENT_ID in environment variables
  - Verify redirect URI in Google Console matches exactly
  - Check browser console for JavaScript errors
  - Look at backend logs for token verification errors

CORS errors:
  - Make sure CORS_ORIGINS includes yoursite.com
  - Include both www.yoursite.com and yoursite.com
  - Redeploy backend after changes

========================================================================
AFTER DEPLOYMENT CHECKLIST
========================================================================

[ ] Frontend loads at yoursite.com
[ ] Backend API accessible at api.yoursite.com/docs
[ ] Can register new account
[ ] Account saves in database
[ ] Can login with credentials
[ ] Can upload file (gets encrypted)
[ ] Can download file (gets decrypted)
[ ] Google Sign-In works
[ ] All pages load correctly
[ ] No console errors
[ ] App is secure (HTTPS everywhere)
[ ] Database has backups (Supabase auto-backups)

========================================================================
NEXT STEPS
========================================================================

1. Activate GitHub Student Pack today
2. Create DigitalOcean account and apply $50 credit
3. Deploy frontend and backend
4. Configure Cloudflare
5. Wait for DNS propagation
6. Implement Google Sign-In
7. Test everything thoroughly
8. Share your live app!

You now have a completely free hosting for 10 months as a student!

Good luck deploying Vaultline!
