export function cspPlugin() {
  return {
    name: 'csp-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https://*.supabase.co https://storage.googleapis.com;")
        next()
      })
    }
  }
}