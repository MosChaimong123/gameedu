/** Omise REST (Thailand): Basic auth = secret key + ":" as username, empty password. */

import {
  BILLING_OMISE_CHARGE_FAILED,
  BILLING_OMISE_MINIMUM_AMOUNT,
  BILLING_OMISE_MISSING_AUTHORIZE_URI,
  BILLING_OMISE_RETRIEVE_FAILED,
} from "@/lib/billing/billing-error-keys";

const OMISE_API = "https://api.omise.co";

function basicAuth(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export type OmiseChargeJson = {
  object: string;
  id?: string;
  authorize_uri?: string | null;
  status?: string;
  paid?: boolean;
  metadata?: Record<string, unknown>;
  paid_at?: string | null;
};

export type OmiseErrorJson = {
  object: "error";
  location?: string;
  code?: string;
  message?: string;
};

export async function omiseCreatePromptPayCharge(params: {
  secretKey: string;
  amountSatang: number;
  metadata: Record<string, string>;
  returnUri: string;
}): Promise<
  | { ok: true; authorizeUri: string; chargeId: string }
  | { ok: false; message: string }
> {
  const { secretKey, amountSatang, metadata, returnUri } = params;

  if (amountSatang < 2000) {
    return { ok: false, message: BILLING_OMISE_MINIMUM_AMOUNT };
  }

  const body = new URLSearchParams();
  body.set("amount", String(amountSatang));
  body.set("currency", "THB");
  body.set("source[type]", "promptpay");
  body.set("return_uri", returnUri);
  for (const [k, v] of Object.entries(metadata)) {
    body.set(`metadata[${k}]`, v);
  }

  const res = await fetch(`${OMISE_API}/charges`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(secretKey),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const jsonUnknown = await res.json().catch(() => null);
  const json = jsonUnknown as OmiseChargeJson | OmiseErrorJson | null;

  if (!res.ok || !json || json.object === "error") {
    const err = json?.object === "error" ? (json as OmiseErrorJson) : null;
    console.error("[omise] charges create failed", {
      httpStatus: res.status,
      omiseCode: err?.code ?? null,
      omiseLocation: err?.location ?? null,
      omiseMessage: err?.message ?? null,
      amountSatang,
      mode: secretKey.startsWith("skey_test_") ? "test" : "live",
    });
    const msg = err?.message ?? err?.code ?? BILLING_OMISE_CHARGE_FAILED;
    return { ok: false, message: msg };
  }

  const charge = json as OmiseChargeJson;
  const authorizeUri = charge.authorize_uri?.trim();
  const chargeId = charge.id;
  if (!authorizeUri || !chargeId) {
    console.error("[omise] charge missing authorize_uri/id", {
      chargeId: charge.id ?? null,
      hasAuthorizeUri: Boolean(authorizeUri),
      status: charge.status ?? null,
    });
    return {
      ok: false,
      message: BILLING_OMISE_MISSING_AUTHORIZE_URI,
    };
  }

  return { ok: true, authorizeUri, chargeId };
}

export async function omiseRetrieveCharge(
  secretKey: string,
  chargeId: string
): Promise<{ ok: true; charge: OmiseChargeJson } | { ok: false; message: string }> {
  const res = await fetch(`${OMISE_API}/charges/${encodeURIComponent(chargeId)}`, {
    headers: { Authorization: basicAuth(secretKey) },
    cache: "no-store",
  });

  const jsonUnknown = await res.json();
  const json = jsonUnknown as OmiseChargeJson | OmiseErrorJson;

  if (!res.ok || json.object === "error") {
    const msg =
      json.object === "error"
        ? (json as OmiseErrorJson).message ??
          (json as OmiseErrorJson).code ??
          BILLING_OMISE_RETRIEVE_FAILED
        : BILLING_OMISE_RETRIEVE_FAILED;
    return { ok: false, message: msg };
  }

  return { ok: true, charge: json as OmiseChargeJson };
}

/**
 * Test-mode only. Asks Omise to mark a `pending` charge as paid; only works
 * when the secret key is `skey_test_...` and the account permits it.
 * Used by the upgrade UI's one-click "simulate payment" button so testers
 * don't need to leave the app to flip a charge in the Omise dashboard.
 */
export async function omiseMarkChargeAsPaid(
  secretKey: string,
  chargeId: string
): Promise<{ ok: true; charge: OmiseChargeJson } | { ok: false; message: string; httpStatus: number }> {
  if (!secretKey.startsWith("skey_test_")) {
    return {
      ok: false,
      message: "Mark-as-paid is only available in Omise test mode.",
      httpStatus: 400,
    };
  }
  const res = await fetch(
    `${OMISE_API}/charges/${encodeURIComponent(chargeId)}/mark_as_paid`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(secretKey),
        "Content-Length": "0",
      },
      cache: "no-store",
    }
  );

  const jsonUnknown = await res.json().catch(() => null);
  const json = jsonUnknown as OmiseChargeJson | OmiseErrorJson | null;

  if (!res.ok || !json || json.object === "error") {
    const err = json?.object === "error" ? (json as OmiseErrorJson) : null;
    console.error("[omise] mark_as_paid failed", {
      httpStatus: res.status,
      omiseCode: err?.code ?? null,
      omiseLocation: err?.location ?? null,
      omiseMessage: err?.message ?? null,
      chargeId,
    });
    return {
      ok: false,
      message: err?.message ?? err?.code ?? `Omise mark_as_paid failed (HTTP ${res.status})`,
      httpStatus: res.status,
    };
  }

  return { ok: true, charge: json as OmiseChargeJson };
}
