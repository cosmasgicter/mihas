# Vercel Environment Variables Setup

## Required Environment Variables

Add these to your Vercel project dashboard:

### Production Variables
```
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
VITE_ANALYTICS_ENABLED=true
NODE_ENV=production
```

### Setup Commands
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_TURNSTILE_SITE_KEY

# Deploy
vercel --prod
```

## Automatic Deployment
- Push to `main` branch triggers production deployment
- Pull requests create preview deployments
- Environment variables are automatically injected