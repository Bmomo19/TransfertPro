import withPWAPlugin from 'next-pwa';

const withPWA = withPWAPlugin({
  dest:        'public',
  register:    true,
  skipWaiting: true,
  disable:     process.env.NODE_ENV === 'development',
  runtimeCaching: [
    { urlPattern: /\/_next\/static\/.*/i,         handler: 'CacheFirst',   options: { cacheName: 'next-static', expiration: { maxEntries: 200 } } },
    { urlPattern: /^https:\/\/fonts\..*/i,         handler: 'CacheFirst',   options: { cacheName: 'google-fonts', expiration: { maxEntries: 4, maxAgeSeconds: 31536000 } } },
    { urlPattern: /^https?:.*\/(?!api\/).*/,        handler: 'NetworkFirst', options: { cacheName: 'pages', networkTimeoutSeconds: 10, expiration: { maxEntries: 50 } } },
    { urlPattern: /\/api\/.*/i,                    handler: 'NetworkOnly' },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',       value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy',       value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
  
  typescript: { ignoreBuildErrors: false },
  
  turbopack: {},
};

export default withPWA(nextConfig);