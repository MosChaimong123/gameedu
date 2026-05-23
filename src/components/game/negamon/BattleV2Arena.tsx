"use client";

import type { ComponentProps } from "react";
import { NegamonLiteBattleArena } from "@/components/negamon/NegamonLiteBattleArena";

export type BattleV2ArenaProps = ComponentProps<typeof NegamonLiteBattleArena>;

export function BattleV2Arena(props: BattleV2ArenaProps) {
    return <NegamonLiteBattleArena {...props} />;
}
