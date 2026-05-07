import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
