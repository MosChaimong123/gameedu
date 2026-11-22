export type PasskeyErrorTranslationKey =
  | "passkeyErrorAlreadyRegistered"
  | "passkeyErrorConfiguration"
  | "passkeyErrorUnavailable";

type ErrorLike = {
  code?: unknown;
  name?: unknown;
  cause?: { name?: unknown };
};

function errorNames(error: unknown) {
  if (!error || typeof error !== "object") return { code: "", name: "" };
  const candidate = error as ErrorLike;
  return {
    code: typeof candidate.code === "string" ? candidate.code : "",
    name:
      typeof candidate.name === "string"
        ? candidate.name
        : typeof candidate.cause?.name === "string"
          ? candidate.cause.name
          : "",
  };
}

export function getPasskeyErrorTranslationKey<Fallback extends string>(
  error: unknown,
  fallback: Fallback,
): PasskeyErrorTranslationKey | Fallback {
  const { code, name } = errorNames(error);

  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || name === "InvalidStateError") {
    return "passkeyErrorAlreadyRegistered";
  }

  if (
    code === "ERROR_INVALID_DOMAIN" ||
    code === "ERROR_INVALID_RP_ID" ||
    name === "SecurityError"
  ) {
    return "passkeyErrorConfiguration";
  }

  if (code || name === "NotAllowedError" || name === "ConstraintError" || name === "UnknownError") {
    return "passkeyErrorUnavailable";
  }

  return fallback;
}
