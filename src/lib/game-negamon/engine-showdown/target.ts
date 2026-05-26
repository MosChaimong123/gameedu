export const NEGAMON_BATTLE_ENGINE_V4_ID = "negamon_v4_showdown_adapter";
export const NEGAMON_BATTLE_ENGINE_V4_PACKAGE = "pokemon-showdown";

export type NegamonBattleEngineTarget = {
    adapterId: typeof NEGAMON_BATTLE_ENGINE_V4_ID;
    packageName: typeof NEGAMON_BATTLE_ENGINE_V4_PACKAGE;
    upstream: "smogon/pokemon-showdown";
    status: "adapter_scaffolded";
    runtimeMode: "server_authoritative";
    notes: string;
};

export const NEGAMON_BATTLE_ENGINE_TARGET: NegamonBattleEngineTarget = {
    adapterId: NEGAMON_BATTLE_ENGINE_V4_ID,
    packageName: NEGAMON_BATTLE_ENGINE_V4_PACKAGE,
    upstream: "smogon/pokemon-showdown",
    status: "adapter_scaffolded",
    runtimeMode: "server_authoritative",
    notes: "Phase B scaffold only. Showdown integration remains behind a local adapter boundary.",
};
