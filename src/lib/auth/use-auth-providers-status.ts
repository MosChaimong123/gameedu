"use client";

import { useEffect, useState } from "react";

export type AuthProvidersStatus = {
  google: boolean;
  credentials: boolean;
};

export function useAuthProvidersStatus() {
  const [status, setStatus] = useState<AuthProvidersStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/providers-status", { credentials: "same-origin" });
        if (!res.ok) {
          if (!cancelled) setStatus({ google: false, credentials: false });
          return;
        }
        const body = (await res.json()) as Partial<AuthProvidersStatus>;
        if (!cancelled) {
          setStatus({
            google: body.google === true,
            credentials: body.credentials === true,
          });
        }
      } catch {
        if (!cancelled) setStatus({ google: false, credentials: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    googleEnabled: status?.google === true,
    credentialsEnabled: status?.credentials === true,
  };
}
