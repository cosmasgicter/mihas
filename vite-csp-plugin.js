export function cspPlugin() {
  return {
    name: 'csp-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Relaxed CSP for development to avoid blocking issues
        const csp = [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "img-src 'self' data: blob: https: http: *", // Allow all image sources
          "connect-src 'self' https: wss: ws: http://localhost:3000 http://localhost:*",
          "style-src 'self' 'unsafe-inline' https:",
          "font-src 'self' https: data:",
          "media-src 'self' blob: https:",
          "object-src 'none'"
        ].join('; ')
        
        res.setHeader('Content-Security-Policy', csp)
        next()
      })
    }
  }
}