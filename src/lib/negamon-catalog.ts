import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import type { MonsterSpecies, NegamonSettings } from "@/lib/types/negamon";

export const LEGACY_NEGAMON_SPECIES_ID_ALIASES: Record<string, string> = {
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

export function getCanonicalNegamonSpeciesId(
    speciesId: string | null | undefined
): string | null {
    if (!speciesId) return null;
    if (DEFAULT_NEGAMON_SPECIES_BY_ID.has(speciesId)) {
        return speciesId;
    }
    return LEGACY_NEGAMON_SPECIES_ID_ALIASES[speciesId] ?? null;
}

export function getCanonicalNegamonSpeciesCatalog(
    species: MonsterSpecies[] | null | undefined
): MonsterSpecies[] {
    if (!species || species.length === 0) {
        return DEFAULT_NEGAMON_SPECIES.slice();
    }

    const canonicalIds = [...new Set(
        species
            .map((entry) => getCanonicalNegamonSpeciesId(entry.id))
            .filter((id): id is string => Boolean(id))
    )];

    if (canonicalIds.length === 0) {
        return DEFAULT_NEGAMON_SPECIES.slice();
    }

    return canonicalIds
        .map((id) => DEFAULT_NEGAMON_SPECIES_BY_ID.get(id))
        .filter((entry): entry is MonsterSpecies => Boolean(entry));
}

export function resolveCanonicalNegamonAssignment(input: {
    rawSpeciesId: string | null | undefined;
    allowStudentChoice: boolean;
    speciesCatalog: MonsterSpecies[];
}): string | null {
    const speciesId = getCanonicalNegamonSpeciesId(input.rawSpeciesId);
    if (speciesId && input.speciesCatalog.some((species) => species.id === speciesId)) {
        return speciesId;
    }

    if (input.allowStudentChoice) {
        return null;
    }

    return input.speciesCatalog[0]?.id ?? DEFAULT_NEGAMON_SPECIES[0]?.id ?? null;
}

export function normalizeNegamonSettingsToCanonical(
    negamon: NegamonSettings | null | undefined
): NegamonSettings | null {
    if (!negamon) return null;

    const speciesCatalog = getCanonicalNegamonSpeciesCatalog(negamon.species);
    const studentMonsters = Object.fromEntries(
        Object.entries(negamon.studentMonsters ?? {}).flatMap(([studentId, rawSpeciesId]) => {
            const speciesId = resolveCanonicalNegamonAssignment({
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
        studentMonsters,
    };
}
