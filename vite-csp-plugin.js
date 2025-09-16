import { createHash } from 'crypto';

export function cspPlugin() {
  return {
    name: 'csp-nonce',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const nonce = createHash('sha256').update(Date.now().toString()).digest('base64').slice(0, 16);
        
        // Add nonce to script tags
        html = html.replace(/<script(?![^>]*nonce)/g, `<script nonce="${nonce}"`);
        
        // Add CSP meta tag with nonce
        const cspContent = `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://storage.googleapis.com https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self';`;
        
        html = html.replace(
          '<meta name="referrer" content="strict-origin-when-cross-origin" />',
          `<meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
        );
        
        return html;
      }
    }
  };
}