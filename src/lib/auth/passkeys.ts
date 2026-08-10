import { createHash } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/types";
import { db } from "@/lib/db";

const CHALLENGE_TTL_MS = 5 * 60_000;

function challengeHash(challenge: string) {
  return createHash("sha256").update(challenge, "utf8").digest("hex");
}

export function getWebAuthnConfig() {
  const configuredOrigin = process.env.AUTH_WEBAUTHN_ORIGIN?.trim() || process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredOrigin) throw new Error("AUTH_WEBAUTHN_ORIGIN or NEXTAUTH_URL is required");
  const origin = new URL(configuredOrigin).origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
    throw new Error("WebAuthn requires HTTPS in production");
  }
  const rpID = process.env.AUTH_WEBAUTHN_RP_ID?.trim() || new URL(origin).hostname;
  return { origin, rpID, rpName: "GameEdu" };
}

async function rememberChallenge(userId: string | null, type: string, challenge: string) {
  await db.authChallenge.create({
    data: {
      userId,
      type,
      challengeHash: challengeHash(challenge),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

async function consumeChallenge(userId: string | null, type: string, challenge: string) {
  const consumed = await db.authChallenge.updateMany({
    where: {
      userId,
      type,
      challengeHash: challengeHash(challenge),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  return consumed.count === 1;
}

function responseChallenge(response: AuthenticationResponseJSON | RegistrationResponseJSON) {
  try {
    const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8")) as { challenge?: unknown };
    return typeof clientData.challenge === "string" ? clientData.challenge : "";
  } catch {
    return "";
  }
}

export async function createPasskeyRegistrationOptions(userId: string) {
  const config = getWebAuthnConfig();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, passkeyCredentials: { select: { credentialId: true, transports: true } } },
  });
  if (!user?.email) throw new Error("User email is required");
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userID: userId,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    // Sign-in starts without a username, so every new passkey must be discoverable.
    authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
    excludeCredentials: user.passkeyCredentials.map((credential) => ({
      id: Buffer.from(credential.credentialId, "base64url"),
      type: "public-key" as const,
      transports: credential.transports as AuthenticatorTransport[],
    })),
  });
  await rememberChallenge(userId, "PASSKEY_REGISTRATION", options.challenge);
  return options;
}

export async function finishPasskeyRegistration(userId: string, response: RegistrationResponseJSON, name: string) {
  const config = getWebAuthnConfig();
  const challenge = responseChallenge(response);
  if (!challenge || !(await consumeChallenge(userId, "PASSKEY_REGISTRATION", challenge))) return null;
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
    requireUserVerification: true,
  });
  const info = verification.registrationInfo;
  if (!verification.verified || !info) return null;
  const credentialId = Buffer.from(info.credentialID).toString("base64url");
  return db.passkeyCredential.create({
    data: {
      userId,
      credentialId,
      publicKey: Buffer.from(info.credentialPublicKey),
      counter: info.counter,
      transports: response.response.transports ?? [],
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      name: name.trim().slice(0, 80) || "Passkey",
    },
    select: { id: true, name: true, createdAt: true },
  });
}

export async function createPasskeyAuthenticationOptions(userId?: string) {
  const config = getWebAuthnConfig();
  const passkeys = userId
    ? await db.passkeyCredential.findMany({ where: { userId }, select: { credentialId: true, transports: true } })
    : [];
  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    userVerification: "required",
    allowCredentials: userId ? passkeys.map((credential) => ({ id: Buffer.from(credential.credentialId, "base64url"), type: "public-key" as const, transports: credential.transports as AuthenticatorTransport[] })) : undefined,
  });
  await rememberChallenge(userId ?? null, userId ? "PASSKEY_MFA" : "PASSKEY_SIGNIN", options.challenge);
  return options;
}

export async function verifyPasskeyAuthentication(response: AuthenticationResponseJSON, userId?: string) {
  const config = getWebAuthnConfig();
  const challenge = responseChallenge(response);
  const type = userId ? "PASSKEY_MFA" : "PASSKEY_SIGNIN";
  if (!challenge || !(await consumeChallenge(userId ?? null, type, challenge))) return null;
  const credential = await db.passkeyCredential.findUnique({
    where: { credentialId: response.id },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true, school: true, authVersion: true, disabledAt: true } } },
  });
  if (!credential || credential.user.disabledAt || (userId && credential.userId !== userId)) return null;
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      requireUserVerification: true,
      authenticator: {
        credentialID: Buffer.from(credential.credentialId, "base64url"),
        credentialPublicKey: new Uint8Array(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransport[],
      },
    });
  } catch {
    return null;
  }
  if (!verification.verified) return null;
  const updated = await db.passkeyCredential.updateMany({
    where: { id: credential.id, counter: credential.counter },
    data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
  });
  if (updated.count !== 1) return null;
  return credential.user;
}
