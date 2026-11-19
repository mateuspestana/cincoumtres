import type { NextConfig } from 'next';

// Site estático: cada deputado e cada vaga viram uma página no build (generateStaticParams).
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
