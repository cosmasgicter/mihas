# Development Setup Fixes

## Issues Fixed

### 1. ❌ `hasLoaded is not defined` Error
**Problem**: The `hasLoaded` variable was declared as a local variable but accessed in a callback closure, causing a ReferenceError.

**Solution**: Changed `hasLoaded` from a local variable to a state variable using `useState`.

**Files Modified**:
- `src/contexts/AuthContext.tsx`

### 2. ❌ 404 Error for `admin-C7G7yCP3.js`
**Problem**: The application was trying to load old build artifacts that no longer existed.

**Solution**: Ran a fresh build to generate new assets.

**Files Generated**:
- `dist/` folder with new build artifacts
- New admin bundle: `admin-BzVaA9tx.js`

### 3. ❌ Invalid Refresh Token / Login Credentials
**Problem**: Stale authentication tokens and incorrect environment configuration for development.

**Solutions**:
1. Created auth clearing script
2. Updated environment variables for local development
3. Added better error logging to AuthContext
4. Created test utilities for offline development

**Files Created/Modified**:
- `clear-auth-dev.js` - Clears authentication cache
- `test-supabase-connection.js` - Tests Supabase connectivity
- `create-test-user.js` - Creates test user for development
- `src/lib/devMode.ts` - Development mode utilities
- `.env` - Updated for development
- `.env.development` - Corrected API URLs

## How to Test the Application

### Option 1: Online Mode (Requires Internet)
```bash
# 1. Clear any cached auth tokens
node clear-auth-dev.js

# 2. Test Supabase connection
node test-supabase-connection.js

# 3. Create test user (if needed)
node create-test-user.js

# 4. Start development server
npm run dev
```

**Test Credentials**:
- Email: `test@mihas.edu.zm`
- Password: `TestPassword123!`

### Option 2: Offline Mode (For UI Testing)
```bash
# 1. Enable test mode
export VITE_TEST_MODE=true

# 2. Start development server
npm run dev
```

In test mode, the application will use mock data for authentication and bypass Supabase calls.

### Option 3: Production Build Testing
```bash
# 1. Build for production
npm run build

# 2. Preview production build
npm run preview
```

## Environment Variables Summary

### Development (`.env` and `.env.development`)
```env
VITE_SUPABASE_URL=https://mylgegkqoddcrxtwcclb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_API_BASE_URL=http://localhost:5173
VITE_APP_BASE_URL=http://localhost:5173
NODE_ENV=development
VITE_TEST_MODE=true  # Optional: enables offline mode
```

### Production (`.env.production`)
```env
VITE_SUPABASE_URL=https://mylgegkqoddcrxtwcclb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
VITE_APP_BASE_URL=https://mihas-katc.com
NODE_ENV=production
```

## Troubleshooting

### If you still get authentication errors:
1. Clear browser cache and localStorage
2. Run `node clear-auth-dev.js`
3. Restart the development server
4. Try using test mode: `VITE_TEST_MODE=true npm run dev`

### If Supabase connection fails:
1. Check internet connectivity
2. Verify environment variables are loaded
3. Run `node test-supabase-connection.js` to diagnose

### If build fails:
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall: `npm install`
3. Try building again: `npm run build`

## Next Steps

1. **Test the application** using one of the methods above
2. **Verify all features work** in development mode
3. **Test authentication flow** with the test user
4. **Check admin features** (may need admin role assignment)
5. **Test production build** before deployment

## Files You Can Safely Delete After Testing

- `clear-auth-dev.js`
- `test-supabase-connection.js`
- `create-test-user.js`
- `DEV_SETUP_FIXES.md` (this file)

These are temporary development utilities and not needed for production.