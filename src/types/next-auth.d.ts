import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

type AppUserFields = {
  id?: string;
  role?: string;
  school?: string | null;
  settings?: unknown;
  plan?: string | null;
  planStatus?: string | null;
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
  }
}
