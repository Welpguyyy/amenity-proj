import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  webpack: (config: Configuration) => {
    // Exclude .svg from the default asset/resource loader
    const fileLoaderRule = config.module?.rules?.find((rule: any) =>
      rule?.test?.test?.('.svg')
    );

    if (fileLoaderRule && typeof fileLoaderRule === 'object' && 'exclude' in fileLoaderRule) {
      (fileLoaderRule as any).exclude = /\.svg$/;
    }

    // Add SVGR loader for .svg files
    config.module?.rules?.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            icon: true,
          },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
