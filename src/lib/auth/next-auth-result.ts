export function getNextAuthResultCode(
    resultUrl: string | null | undefined,
    origin: string
) {
    if (!resultUrl) {
        return null;
    }

    try {
        const url = new URL(resultUrl, origin);
        return url.searchParams.get("code");
    } catch {
        return null;
    }
}
