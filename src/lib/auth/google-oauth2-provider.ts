import type { OAuth2Config } from "@auth/core/providers/oauth";

/** https://www.googleapis.com/oauth2/v3/userinfo */
type GoogleUserInfo = {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    email_verified?: boolean;
};

/**
 * Google as **OAuth 2.0** (not OIDC discovery) so token exchange does not go through
 * strict OIDC `iss` validation on the token response — avoids `unexpected "iss" (issuer)`
 * when Google's JSON body is empty/malformed in edge cases (proxy, bad secret, code reuse).
 *
 * User profile comes from the userinfo endpoint (stable for web client_secret_post).
 */
export function googleOauth2WebProvider(
    clientId: string,
    clientSecret: string
): OAuth2Config<GoogleUserInfo> {
    return {
        id: "google",
        name: "Google",
        type: "oauth",
        checks: ["pkce", "state"],
        authorization: {
            url: "https://accounts.google.com/o/oauth2/v2/auth",
            params: {
                scope: "openid email profile",
                response_type: "code",
                access_type: "offline",
            },
        },
        token: "https://oauth2.googleapis.com/token",
        userinfo: "https://www.googleapis.com/oauth2/v3/userinfo",
        clientId,
        clientSecret,
        client: {
            token_endpoint_auth_method: "client_secret_post",
        },
        profile(profile) {
            return {
                id: profile.sub,
                name: profile.name,
                email: profile.email ?? "",
                image: profile.picture,
                emailVerified: profile.email_verified === true ? new Date() : null,
            };
        },
        style: { brandColor: "#1a73e8" },
    };
}
