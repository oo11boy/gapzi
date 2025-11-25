// next.config.ts ← نسخه نهایی و درست
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // این خط درست و جدیده (نه experimental و نه serverComponentsExternalPackages)
  serverExternalPackages: ["mysql2"],

  images: {
    unoptimized: true,
  },
};

export default nextConfig;