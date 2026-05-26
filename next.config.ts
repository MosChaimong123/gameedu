import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";
import { withSentryConfig } from "@sentry/nextjs";

function resolveR2ImageRemotePatterns(): RemotePattern[] {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!base) return [];
  try {
    const { hostname } = new URL(base);
    return [{ protocol: "https", hostname, pathname: "/board/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["pokemon-showdown"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      ...resolveR2ImageRemotePatterns(),
    ],
  },
};

const sentryAuthTokenAvailable = Boolean(process.env.SENTRY_AUTH_TOKEN);

/**
 * `withSentryConfig` is a no-op at runtime when `SENTRY_DSN` is unset,
 * but the wrapper still injects build-time helpers (source-map upload,
 * tunnel, etc). Source-map upload requires `SENTRY_AUTH_TOKEN`; when it
 * is missing locally we silence the upload step so `npm run build` keeps
 * working without Sentry credentials.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !sentryAuthTokenAvailable,
  },
  telemetry: false,
});
