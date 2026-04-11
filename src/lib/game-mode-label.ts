type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

/** Converts persisted game mode codes into localized labels. */
export function formatGameModeLabel(gameMode: string, t: TranslateFn): string {
    switch (gameMode) {
        case "GOLD_QUEST":
            return t("gameModeLabelGoldQuest");
        case "CRYPTO_HACK":
            return t("gameModeLabelCryptoHack");
        default:
            return gameMode.replace(/_/g, " ");
    }
}
