import { createHash } from "node:crypto";

const PREHASHED_PASSWORD_PREFIX = "$gamedu$sha256$";

function passwordDigest(password: string) {
    return createHash("sha256").update(password, "utf8").digest("base64url");
}

export async function hashPassword(password: string) {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(passwordDigest(password), 12);
    return `${PREHASHED_PASSWORD_PREFIX}${hash}`;
}

export async function verifyPassword(password: string, storedHash: string) {
    const bcrypt = await import("bcryptjs");
    if (storedHash.startsWith(PREHASHED_PASSWORD_PREFIX)) {
        return bcrypt.compare(passwordDigest(password), storedHash.slice(PREHASHED_PASSWORD_PREFIX.length));
    }
    return bcrypt.compare(password, storedHash);
}
