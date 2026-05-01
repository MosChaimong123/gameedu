/** Omise REST (Thailand): Basic auth = secret key + ":" as username, empty password. */

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
    return { ok: false, message: "Omise PromptPay minimum amount is 2000 satang (THB 20)." };
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

  const jsonUnknown = await res.json();
  const json = jsonUnknown as OmiseChargeJson | OmiseErrorJson;

  if (!res.ok || json.object === "error") {
    const msg =
      json.object === "error"
        ? (json as OmiseErrorJson).message ??
          (json as OmiseErrorJson).code ??
          "Omise charge failed"
        : "Omise charge failed";
    return { ok: false, message: msg };
  }

  const charge = json as OmiseChargeJson;
  const authorizeUri = charge.authorize_uri?.trim();
  const chargeId = charge.id;
  if (!authorizeUri || !chargeId) {
    return {
      ok: false,
      message: "Omise returned no authorize_uri or charge id (check PromptPay is enabled on your Omise account).",
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
          "Omise retrieve charge failed"
        : "Omise retrieve charge failed";
    return { ok: false, message: msg };
  }

  return { ok: true, charge: json as OmiseChargeJson };
}
