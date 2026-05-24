import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import type { MonsterSpecies, NegamonSettings } from "@/lib/types/negamon";

export const LEGACY_NEGAMON_SPECIES_ID_MAP: Record<string, string> = {
    naga: "tidemaw",
    garuda: "aerolisk",
    singha: "terranoir",
    kinnaree: "lumilune",
    thotsakan: "pyronox",
    hanuman: "aerolisk",
    mekkala: "voltshade",
    suvannamaccha: "lumilune",
};

const DEFAULT_NEGAMON_SPECIES_BY_ID = new Map(
    DEFAULT_NEGAMON_SPECIES.map((species) => [species.id, species] as const)
);

export function remapLegacyNegamonSpeciesId(speciesId: string | null | undefined): string | null {
    if (!speciesId) return null;
    if (DEFAULT_NEGAMON_SPECIES_BY_ID.has(speciesId)) return speciesId;
    return LEGACY_NEGAMON_SPECIES_ID_MAP[speciesId] ?? null;
}

function dedupeSpeciesById(speciesIds: string[]): string[] {
    return [...new Set(speciesIds)];
}

export function resolveNegamonRuntimeSpeciesCatalog(
    species: MonsterSpecies[] | null | undefined
): MonsterSpecies[] {
    if (!species || species.length === 0) {
        return DEFAULT_NEGAMON_SPECIES.slice();
    }

    const remappedIds = dedupeSpeciesById(
        species
            .map((entry) => remapLegacyNegamonSpeciesId(entry.id))
            .filter((id): id is string => Boolean(id))
    );

    if (remappedIds.length === 0) {
        return DEFAULT_NEGAMON_SPECIES.slice();
    }

    return remappedIds
        .map((id) => DEFAULT_NEGAMON_SPECIES_BY_ID.get(id))
        .filter((entry): entry is MonsterSpecies => Boolean(entry));
}

export function resolveNegamonAssignedSpeciesId(input: {
    rawSpeciesId: string | null | undefined;
    allowStudentChoice: boolean;
    speciesCatalog: MonsterSpecies[];
}): string | null {
    const remappedSpeciesId = remapLegacyNegamonSpeciesId(input.rawSpeciesId);
    if (remappedSpeciesId) {
        return remappedSpeciesId;
    }

    if (input.allowStudentChoice) {
        return null;
    }

    return input.speciesCatalog[0]?.id ?? DEFAULT_NEGAMON_SPECIES[0]?.id ?? null;
}

export function normalizeNegamonSettingsForRuntime(
    negamon: NegamonSettings | null | undefined
): NegamonSettings | null {
    if (!negamon) return null;

    const speciesCatalog = resolveNegamonRuntimeSpeciesCatalog(negamon.species);
    const normalizedStudentMonsters = Object.fromEntries(
        Object.entries(negamon.studentMonsters ?? {}).flatMap(([studentId, rawSpeciesId]) => {
            const speciesId = resolveNegamonAssignedSpeciesId({
                rawSpeciesId,
                allowStudentChoice: negamon.allowStudentChoice,
                speciesCatalog,
            });
            return speciesId ? [[studentId, speciesId]] : [];
        })
    );

    return {
        ...negamon,
        species: speciesCatalog,
        studentMonsters: normalizedStudentMonsters,
    };
}
