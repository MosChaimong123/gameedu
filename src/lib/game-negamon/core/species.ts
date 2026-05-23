import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import type { MonsterSpecies } from "@/lib/types/negamon";

export function getNegamonSpeciesCatalog(customSpecies: MonsterSpecies[] = []): MonsterSpecies[] {
    const byId = new Map<string, MonsterSpecies>();
    for (const species of customSpecies) {
        byId.set(species.id, species);
    }
    for (const species of DEFAULT_NEGAMON_SPECIES) {
        byId.set(species.id, species);
    }
    return [...byId.values()];
}

export function findNegamonSpeciesById(
    speciesId: string | undefined | null,
    customSpecies: MonsterSpecies[] = []
): MonsterSpecies | null {
    if (!speciesId) return null;
    return getNegamonSpeciesCatalog(customSpecies).find((species) => species.id === speciesId) ?? null;
}
