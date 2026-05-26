"use client";

import type { ComponentProps } from "react";
import { NegamonBattleArenaV4 } from "@/components/negamon/NegamonBattleArenaV4";

export type BattleV2ArenaProps = ComponentProps<typeof NegamonBattleArenaV4>;

export function BattleV2Arena(props: BattleV2ArenaProps) {
    return <NegamonBattleArenaV4 {...props} />;
}
