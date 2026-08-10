export type EmailDeliveryReadinessStatus = "configured" | "not_configured" | "invalid";

export type EmailDeliveryReadinessReason =
  | "missing_api_key"
  | "missing_from"
  | "missing_webhook_secret"
  | "invalid_from"
  | "test_sender_domain"
  | "missing_public_url"
  | "invalid_public_url"
  | "public_url_must_use_https"
  | "public_url_must_not_be_local";

export type EmailDeliveryReadiness = {
  status: EmailDeliveryReadinessStatus;
  reason?: EmailDeliveryReadinessReason;
};

function extractMailbox(value: string) {
  const angleMatch = value.match(/<([^<>]+)>\s*$/);
  return (angleMatch?.[1] ?? value).trim().toLowerCase();
}

function isValidMailbox(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

export function resolveEmailDeliveryReadiness(
  env: NodeJS.ProcessEnv = process.env
): EmailDeliveryReadiness {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { status: "not_configured", reason: "missing_api_key" };

  const from = env.EMAIL_FROM?.trim();
  if (!from) return { status: "not_configured", reason: "missing_from" };

  const mailbox = extractMailbox(from);
  if (!isValidMailbox(mailbox)) {
    return { status: "invalid", reason: "invalid_from" };
  }

  const senderDomain = mailbox.split("@")[1];
  if (senderDomain === "resend.dev" || senderDomain.endsWith(".resend.dev")) {
    return { status: "invalid", reason: "test_sender_domain" };
  }

  if (
    env.NODE_ENV === "production" &&
    !env.RESEND_WEBHOOK_SECRET?.trim()
  ) {
    return { status: "not_configured", reason: "missing_webhook_secret" };
  }

  const publicUrl =
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    env.NEXTAUTH_URL?.trim() ||
    env.AUTH_URL?.trim();
  if (!publicUrl) {
    return { status: "invalid", reason: "missing_public_url" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(publicUrl);
  } catch {
    return { status: "invalid", reason: "invalid_public_url" };
  }

  if (env.NODE_ENV === "production") {
    if (parsedUrl.protocol !== "https:") {
      return { status: "invalid", reason: "public_url_must_use_https" };
    }
    if (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "0.0.0.0" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "::1"
    ) {
      return { status: "invalid", reason: "public_url_must_not_be_local" };
    }
  }

  return { status: "configured" };
}
