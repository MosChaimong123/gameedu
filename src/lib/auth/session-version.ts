export function normalizeAuthVersion(version: unknown): number {
  return typeof version === "number" && Number.isSafeInteger(version) && version >= 0
    ? version
    : 0;
}

export function isAuthVersionCurrent(params: {
  tokenVersion: unknown;
  currentVersion: unknown;
  isNewSignIn: boolean;
}) {
  if (params.isNewSignIn) return true;
  return normalizeAuthVersion(params.tokenVersion) === normalizeAuthVersion(params.currentVersion);
}
