/**
 * Teacher OMR dashboard, scanner, and templates. When false, UI shows “coming soon” and routes redirect.
 * Set `NEXT_PUBLIC_OMR_DASHBOARD_ENABLED=true` to re-enable.
 */
export function isOmrDashboardEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OMR_DASHBOARD_ENABLED === "true";
}
