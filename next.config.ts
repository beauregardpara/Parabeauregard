import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-eval' n'est requis que par le rafraîchissement à chaud du mode
      // développement ; il est retiré en production pour durcir la CSP.
      `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data: blob:",
      "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
      "connect-src 'self' https://api.anthropic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  // Sortie autonome : image Docker minimale (voir Dockerfile).
  output: "standalone",

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },

  // Node ≥ 23/24 : le hasher WASM (md4/xxhash) de webpack crashe
  // ("Cannot read properties of undefined (reading 'length')" dans
  // WasmHash._updateWithBuffer). On force un hasher natif JS/Node.
  webpack: (config) => {
    if (config.output) {
      config.output.hashFunction = "sha256";
    }
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Workaround crash WasmHash de webpack sous Node ≥ 23/24 : la compilation
// webpack s'exécute dans le process principal au lieu d'un worker dédié.
(nextConfig as NextConfig & { experimental?: Record<string, unknown> }).experimental = {
  ...(nextConfig.experimental ?? {}),
  webpackBuildWorker: false,
};
