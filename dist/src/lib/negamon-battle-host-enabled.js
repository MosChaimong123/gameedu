"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNegamonBattleHostEnabled = isNegamonBattleHostEnabled;
/**
 * Live Negamon Battle from the host flow (mode picker + create-game).
 * Set `NEXT_PUBLIC_NEGAMON_BATTLE_HOST_ENABLED=true` to re-enable (server + browser).
 */
function isNegamonBattleHostEnabled() {
    return process.env.NEXT_PUBLIC_NEGAMON_BATTLE_HOST_ENABLED === "true";
}
