/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'iqarhmetoagfjjyfztzq.supabase.co',
      'placeholder.pics',
      'images.unsplash.com',
      'plus.unsplash.com',
      'picsum.photos',
      'placehold.co',
      'via.placeholder.com',
      'placekitten.com',
      'loremflickr.com',
      'source.unsplash.com',
      'random.imagecdn.app',
      'randomuser.me',
      'fastly.picsum.photos',
      'picsum.photos',
      'dummyimage.com',
      'placeholder.com',
      'placekitten.com',
      'placeimg.com',
      'placebear.com',
      'placecorgi.com',
      'placedog.net',
      'placepuppy.it',
      'baconmockup.com',
      'placebeard.it',
      'fillmurray.com',
      'placecage.com',
      'stevensegallery.com',
      'placebear.com',
      'www.placecage.com',
      'www.fillmurray.com',
      'www.stevensegallery.com',
      'www.placebear.com',
      'www.placekitten.com',
      'www.placedog.net',
      'www.placepuppy.it',
      'www.placeimg.com',
      'www.placebeard.it',
      'www.baconmockup.com',
      'www.placehold.it',
      'www.placeholder.com',
      'www.dummyimage.com',
      'www.placecorgi.com',
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.supabase.in https://*.vercel.app;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: blob: https://* http://*;
              font-src 'self' data:;
              connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.vercel.app https://*.vercel-insights.com https://*.vercel.com https://*.googleapis.com https://*.v0.dev https://*.usercontent.net;
              frame-src 'self' https://*.youtube.com https://*.youtube-nocookie.com https://*.youtu.be;
              frame-ancestors 'self';
              form-action 'self';
              base-uri 'self';
              object-src 'none';
            `.replace(/\s+/g, ' ').trim()
          },
        ],
      },
    ];
  },
};

export default nextConfig;
