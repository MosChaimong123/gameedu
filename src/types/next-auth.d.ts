import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";
import type { AppRole } from "@/lib/roles";

type AppUserFields = {
  id?: string;
  role?: AppRole;
  school?: string | null;
  settings?: unknown;
  plan?: string | null;
  planStatus?: string | null;
  /** Credential generation captured when the JWT was issued. */
  authVersion?: number;
  /** Legacy credential authenticated successfully but does not meet the current creation policy. */
  passwordUpgradeRequired?: boolean;
  securitySessionId?: string;
  authenticatedAt?: number;
  mfaEnrolled?: boolean;
  mfaLevel?: number;
  mfaVerifiedAt?: number;
  /** ISO 8601 from JWT sync (`User.planExpiry`). */
  planExpiry?: string | null;
};

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & AppUserFields;
  }

  interface User extends AppUserFields {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT, AppUserFields {
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    securitySessionToken?: string;
  }
}
