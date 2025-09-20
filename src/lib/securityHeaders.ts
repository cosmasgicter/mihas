

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