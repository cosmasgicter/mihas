// Security Headers Configuration
export const SECURITY_HEADERS = {
  CSP: "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  HSTS: "max-age=31536000; includeSubDomains; preload",
  REFERRER_POLICY: "strict-origin-when-cross-origin",
  X_CONTENT_TYPE_OPTIONS: "nosniff",
  X_FRAME_OPTIONS: "DENY",
  PERMISSIONS_POLICY: "camera=(), microphone=(), geolocation=()"
};

// Apply security headers for client-side enforcement
export const applyClientSecurityHeaders = () => {
  // Add meta tags for additional security
  const metaTags = [
    { name: 'referrer', content: 'strict-origin-when-cross-origin' },
    { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' }
  ];

  metaTags.forEach(tag => {
    const meta = document.createElement('meta');
    Object.entries(tag).forEach(([key, value]) => {
      meta.setAttribute(key, value);
    });
    document.head.appendChild(meta);
  });
};