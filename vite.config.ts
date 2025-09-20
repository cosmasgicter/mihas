import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { cspPlugin } from './vite-csp-plugin.js'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    plugins: [
      react(),
      cspPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'MIHAS Application System',
          short_name: 'MIHAS',
          description: 'Medical Institute of Health and Allied Sciences Application System',
          theme_color: '#1e40af',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'favicon.ico',
              sizes: '16x16 32x32',
              type: 'image/x-icon'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          cacheId: 'mihas-v2',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /\/api\/.*/,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7
                }
              }
            },
            {
              urlPattern: ({ request }) => request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24
                }
              }
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      global: 'globalThis',
    },
    build: {
      target: 'esnext',
      minify: isProduction ? 'terser' : false,
      sourcemap: !isProduction,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Critical path - keep in main bundle
            if (id.includes('LandingPageOptimized') || id.includes('LandingPageSkeleton')) {
              return 'main'
            }
            
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor'
              }
              if (id.includes('@supabase')) {
                return 'supabase'
              }
              if (id.includes('framer-motion')) {
                return 'animations'
              }
              if (id.includes('@radix-ui')) {
                return 'ui-vendor'
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query'
              }
              return 'vendor'
            }
            
            // Lazy loaded chunks
            if (id.includes('src/pages/admin')) {
              return 'admin'
            }
            if (id.includes('src/pages/student')) {
              return 'student'
            }
            if (id.includes('src/pages/auth')) {
              return 'auth'
            }
            if (id.includes('src/components/analytics')) {
              return 'analytics'
            }
            if (id.includes('LandingPage.tsx')) {
              return 'landing-full'
            }
          }
        }
      },
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined
    },
    test: {
      environment: 'jsdom',
      setupFiles: './tests/setupTests.ts',
      include: ['**/*.test.ts', '**/*.test.tsx'],
      exclude: [
        'tests/e2e/**',
        'tests/**/*.spec.ts',
        'tests/**/*.spec.tsx',
        'tests/integration/**',
        'tests/vite.config.test.ts',
        'node_modules/**',
        'dist/**'
      ]
    },
    server: {
      port: 5173,
      host: true
    },
    preview: {
      port: 4173,
      host: true
    }
  }
})