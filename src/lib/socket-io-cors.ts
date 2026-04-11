/**
 * Resolves Socket.io CORS `origin` option.
 * - Dev: reflect request origin (`true`) so localhost / LAN IPs work.
 * - Prod: use `SOCKET_IO_CORS_ORIGIN` (comma-separated) or fall back to `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`.
 */
export function resolveSocketIoCorsOrigin(): boolean | string | string[] {
  const dev = process.env.NODE_ENV !== "production";

  const explicit = process.env.SOCKET_IO_CORS_ORIGIN?.trim();
  if (explicit) {
    if (explicit === "*") {
      if (!dev) {
        console.warn(
          "[socket.io] SOCKET_IO_CORS_ORIGIN=* in production is insecure; set explicit origins."
        );
      }
      return "*";
    }
    const list = explicit
      .split(",")
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter(Boolean);
    if (list.length === 1) {
      return list[0]!;
    }
    return list;
  }

  if (dev) {
    return true;
  }

  const primary =
    process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (primary) {
    return [primary];
  }

  console.warn(
    "[socket.io] Production: set SOCKET_IO_CORS_ORIGIN or NEXTAUTH_URL to restrict origins. Using origin reflection."
  );
  return true;
}
