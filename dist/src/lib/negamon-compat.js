"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_NEGAMON_SPECIES_ID_MAP = void 0;
exports.remapLegacyNegamonSpeciesId = remapLegacyNegamonSpeciesId;
exports.resolveNegamonRuntimeSpeciesCatalog = resolveNegamonRuntimeSpeciesCatalog;
exports.resolveNegamonAssignedSpeciesId = resolveNegamonAssignedSpeciesId;
exports.normalizeNegamonSettingsForRuntime = normalizeNegamonSettingsForRuntime;
const negamon_species_1 = require("@/lib/negamon-species");
exports.LEGACY_NEGAMON_SPECIES_ID_MAP = {
    naga: "tidemaw",
    garuda: "aerolisk",
    singha: "terranoir",
    kinnaree: "lumilune",
    thotsakan: "pyronox",
    hanuman: "aerolisk",
    mekkala: "voltshade",
    suvannamaccha: "lumilune",
};
const DEFAULT_NEGAMON_SPECIES_BY_ID = new Map(negamon_species_1.DEFAULT_NEGAMON_SPECIES.map((species) => [species.id, species]));
function remapLegacyNegamonSpeciesId(speciesId) {
    var _a;
    if (!speciesId)
        return null;
    if (DEFAULT_NEGAMON_SPECIES_BY_ID.has(speciesId))
        return speciesId;
    return (_a = exports.LEGACY_NEGAMON_SPECIES_ID_MAP[speciesId]) !== null && _a !== void 0 ? _a : null;
}
function dedupeSpeciesById(speciesIds) {
    return [...new Set(speciesIds)];
}
function resolveNegamonRuntimeSpeciesCatalog(species) {
    if (!species || species.length === 0) {
        return negamon_species_1.DEFAULT_NEGAMON_SPECIES.slice();
    }
    const remappedIds = dedupeSpeciesById(species
        .map((entry) => remapLegacyNegamonSpeciesId(entry.id))
        .filter((id) => Boolean(id)));
    if (remappedIds.length === 0) {
        return negamon_species_1.DEFAULT_NEGAMON_SPECIES.slice();
    }
    return remappedIds
        .map((id) => DEFAULT_NEGAMON_SPECIES_BY_ID.get(id))
        .filter((entry) => Boolean(entry));
}
function resolveNegamonAssignedSpeciesId(input) {
    var _a, _b, _c, _d;
    const remappedSpeciesId = remapLegacyNegamonSpeciesId(input.rawSpeciesId);
    if (remappedSpeciesId) {
        return remappedSpeciesId;
    }
    if (input.allowStudentChoice) {
        return null;
    }
    return (_d = (_b = (_a = input.speciesCatalog[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (_c = negamon_species_1.DEFAULT_NEGAMON_SPECIES[0]) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null;
}
function normalizeNegamonSettingsForRuntime(negamon) {
    var _a;
    if (!negamon)
        return null;
    const speciesCatalog = resolveNegamonRuntimeSpeciesCatalog(negamon.species);
    const normalizedStudentMonsters = Object.fromEntries(Object.entries((_a = negamon.studentMonsters) !== null && _a !== void 0 ? _a : {}).flatMap(([studentId, rawSpeciesId]) => {
        const speciesId = resolveNegamonAssignedSpeciesId({
            rawSpeciesId,
            allowStudentChoice: negamon.allowStudentChoice,
            speciesCatalog,
        });
        return speciesId ? [[studentId, speciesId]] : [];
    }));
    return {
        ...negamon,
        species: speciesCatalog,
        studentMonsters: normalizedStudentMonsters,
    };
}
