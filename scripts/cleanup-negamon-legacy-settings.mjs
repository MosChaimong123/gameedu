import "./load-env-for-cli.mjs";
import { PrismaClient } from "@prisma/client";

const LEGACY_NEGAMON_SPECIES_ID_MAP = {
    naga: "tidemaw",
    garuda: "aerolisk",
    singha: "terranoir",
    kinnaree: "lumilune",
    thotsakan: "pyronox",
    hanuman: "aerolisk",
    mekkala: "voltshade",
    suvannamaccha: "lumilune",
};

const prisma = new PrismaClient();

function parseArgs(argv) {
    return {
        dryRun: argv.includes("--dry-run"),
    };
}

function dedupe(values) {
    return [...new Set(values)];
}

function remapSpeciesId(id, defaultById) {
    if (!id) return null;
    if (defaultById.has(id)) return id;
    return LEGACY_NEGAMON_SPECIES_ID_MAP[id] ?? null;
}

async function loadDefaultSpecies() {
    try {
        const mod = await import("../dist/src/lib/negamon-species.js");
        if (!Array.isArray(mod.DEFAULT_NEGAMON_SPECIES) || mod.DEFAULT_NEGAMON_SPECIES.length === 0) {
            throw new Error("DEFAULT_NEGAMON_SPECIES is empty");
        }
        return mod.DEFAULT_NEGAMON_SPECIES;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Failed to load canonical Negamon species from dist. Run "npm.cmd run predev" first. Details: ${message}`
        );
    }
}

function sanitizeGamifiedSettings(input, defaultSpecies) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return {};
    }

    const root = { ...input };
    const negamon = root.negamon;
    if (!negamon || typeof negamon !== "object" || Array.isArray(negamon)) {
        return root;
    }

    const defaultById = new Map(defaultSpecies.map((species) => [species.id, species]));
    const rawSpecies = Array.isArray(negamon.species) ? negamon.species : [];
    const remappedIds = dedupe(
        rawSpecies
            .map((entry) => remapSpeciesId(entry?.id, defaultById))
            .filter(Boolean)
    );
    const speciesIds = remappedIds.length > 0 ? remappedIds : defaultSpecies.map((species) => species.id);
    const species = speciesIds
        .map((id) => defaultById.get(id))
        .filter(Boolean);

    const rawStudentMonsters =
        negamon.studentMonsters &&
        typeof negamon.studentMonsters === "object" &&
        !Array.isArray(negamon.studentMonsters)
            ? negamon.studentMonsters
            : {};
    const studentMonsters = Object.fromEntries(
        Object.entries(rawStudentMonsters)
            .map(([studentId, rawId]) => [studentId, remapSpeciesId(String(rawId), defaultById)])
            .filter(([, speciesId]) => Boolean(speciesId))
    );

    return {
        ...root,
        negamon: {
            ...negamon,
            species,
            studentMonsters,
        },
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const defaultSpecies = await loadDefaultSpecies();
    const classrooms = await prisma.classroom.findMany({
        select: {
            id: true,
            name: true,
            gamifiedSettings: true,
        },
    });

    const changed = [];

    for (const classroom of classrooms) {
        const before = JSON.stringify(classroom.gamifiedSettings ?? {});
        const sanitized = sanitizeGamifiedSettings(classroom.gamifiedSettings, defaultSpecies);
        const after = JSON.stringify(sanitized);
        if (before === after) continue;

        if (!args.dryRun) {
            await prisma.classroom.update({
                where: { id: classroom.id },
                data: { gamifiedSettings: sanitized },
            });
        }

        changed.push({
            id: classroom.id,
            name: classroom.name,
        });
    }

    console.log(
        JSON.stringify(
            {
                mode: args.dryRun ? "dry-run" : "apply",
                updatedCount: changed.length,
                changed,
            },
            null,
            2
        )
    );
}

main()
    .catch((error) => {
        console.error("[cleanup-negamon-legacy-settings]", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
