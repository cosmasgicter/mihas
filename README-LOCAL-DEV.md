# Local Development Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development servers:**
   ```bash
   # Start both frontend and API server
   npm run dev:full
   
   # Or start them separately:
   npm run dev:api    # API server on :8888
   npm run dev        # Frontend on :5173
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - API: http://localhost:8888

## Environment Configuration

The `.env` file is configured for local development with:
- Supabase connection to production database
- Local API endpoints (localhost:5173)
- Relaxed rate limits for development
- Test Turnstile keys
- All security headers disabled

## Security Headers Disabled

For local development, all security measures have been disabled:
- CSP (Content Security Policy) - disabled
- HSTS, X-Frame-Options, etc. - disabled
- Function constructor blocking - disabled
- eval() blocking - disabled

## API Routes

The local API server (`local-server.js`) automatically loads all routes from the `/api` directory and serves them on port 8888. The frontend proxies `/api/*` requests to this server.

## Testing Supabase Connection

The app connects to your production Supabase instance using the credentials in `.env`. All database operations will work as expected.

## Available Scripts

- `npm run dev` - Frontend only (with local config)
- `npm run dev:api` - API server only
- `npm run dev:full` - Both frontend and API
- `npm run dev:prod` - Frontend with production config
- `npm test` - Run tests
- `npm run build` - Build for production

## Troubleshooting

1. **API not working**: Make sure both servers are running with `npm run dev:full`
2. **Supabase errors**: Check your `.env` file has correct Supabase credentials
3. **CORS issues**: The local API server has CORS enabled for all origins
4. **Port conflicts**: Change ports in `vite.config.local.ts` and `local-server.js` if needed