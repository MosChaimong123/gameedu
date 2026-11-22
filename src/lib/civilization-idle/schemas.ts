import { z } from "zod";
import { assertCivilizationInvariants } from "./invariants";
import type { CivilizationState } from "./types";

const eraSchema = z.enum(["stone", "bronze"]);
const activeActionSchema = z.object({ readyAt: z.number().finite().nonnegative() }).strict();
const resourceSchema = z
  .object({ amount: z.number().finite().nonnegative(), cap: z.number().finite().nonnegative() })
  .strict();
const converterStateSchema = z
  .object({ count: z.number().int().nonnegative(), enabled: z.boolean() })
  .strict();

export const civilizationStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: z.literal(1),
    era: eraSchema,
    unlockedEras: z.array(eraSchema),
    resources: z
      .object({
        food: resourceSchema,
        population: resourceSchema,
        wood: resourceSchema,
        stone: resourceSchema,
        science: resourceSchema,
        copper: resourceSchema,
        bronze: resourceSchema,
        iron: resourceSchema,
      })
      .strict(),
    workers: z
      .object({
        forager: z.number().int().nonnegative(),
        woodcutter: z.number().int().nonnegative(),
        hunter: z.number().int().nonnegative(),
        miner: z.number().int().nonnegative(),
        scientist: z.number().int().nonnegative(),
      })
      .strict(),
    idleWorkers: z.number().int().nonnegative(),
    buildings: z
      .object({
        shelter: z.number().int().nonnegative(),
        granary: z.number().int().nonnegative(),
        stockpile: z.number().int().nonnegative(),
        hunting_ground: z.number().int().nonnegative(),
        stone_mine: z.number().int().nonnegative(),
        storytelling_circle: z.number().int().nonnegative(),
        clay_brick_house: z.number().int().nonnegative(),
        metal_warehouse: z.number().int().nonnegative(),
      })
      .strict(),
    converters: z
      .object({
        copper_smelter: converterStateSchema,
        bronze_foundry: converterStateSchema,
        iron_forge: converterStateSchema,
      })
      .strict(),
    unlockedConverters: z.array(z.enum(["copper_smelter", "bronze_foundry", "iron_forge"])),
    researchedTechs: z.array(
      z.enum([
        "basic_tools",
        "foraging",
        "logging",
        "masonry",
        "animal_husbandry",
        "agriculture",
        "smelting",
        "bronze_working",
        "iron_working",
        "writing",
        "steam_power",
      ])
    ),
    actionLevels: z
      .object({
        gather_fruit: z.number().int().min(1).max(5),
        chop_wood: z.number().int().min(1).max(5),
        mine_stone: z.number().int().min(1).max(5),
        pan_copper: z.number().int().min(1).max(5),
        forge_iron: z.number().int().min(1).max(5),
      })
      .strict(),
    activeActions: z
      .object({
        gather_fruit: activeActionSchema.nullable(),
        chop_wood: activeActionSchema.nullable(),
        mine_stone: activeActionSchema.nullable(),
        pan_copper: activeActionSchema.nullable(),
        forge_iron: activeActionSchema.nullable(),
      })
      .strict(),
    populationGrowthProgressMs: z.number().finite().nonnegative(),
    bronzeCompleted: z.boolean(),
    lastSimulatedAt: z.number().finite().nonnegative(),
  })
  .strict();

export const civilizationCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SYNC") }).strict(),
  z
    .object({
      type: z.literal("START_ACTION"),
      actionId: z.enum([
        "gather_fruit",
        "chop_wood",
        "mine_stone",
        "pan_copper",
        "forge_iron",
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("UPGRADE_ACTION"),
      actionId: z.enum([
        "gather_fruit",
        "chop_wood",
        "mine_stone",
        "pan_copper",
        "forge_iron",
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("BUY_BUILDING"),
      buildingId: z.enum([
        "shelter",
        "granary",
        "stockpile",
        "hunting_ground",
        "stone_mine",
        "storytelling_circle",
        "clay_brick_house",
        "metal_warehouse",
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("ASSIGN_WORKER"),
      jobId: z.enum(["forager", "woodcutter", "hunter", "miner", "scientist"]),
      delta: z.number().int().refine((value) => value !== 0),
    })
    .strict(),
  z
    .object({
      type: z.literal("BUY_RESEARCH"),
      techId: z.enum([
        "basic_tools",
        "foraging",
        "logging",
        "masonry",
        "animal_husbandry",
        "agriculture",
        "smelting",
        "bronze_working",
        "iron_working",
        "writing",
        "steam_power",
      ]),
    })
    .strict(),
  z
    .object({ type: z.literal("ADVANCE_ERA"), eraId: eraSchema })
    .strict(),
  z
    .object({
      type: z.literal("BUY_CONVERTER"),
      converterId: z.enum(["copper_smelter", "bronze_foundry", "iron_forge"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("TOGGLE_CONVERTER"),
      converterId: z.enum(["copper_smelter", "bronze_foundry", "iron_forge"]),
    })
    .strict(),
]);

const commandIdSchema = z
  .string()
  .min(8)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

export const civilizationCommandRequestSchema = z
  .object({
    commandId: commandIdSchema,
    expectedRevision: z.number().int().nonnegative(),
    command: civilizationCommandSchema,
  })
  .strict();

export const civilizationSyncRequestSchema = z
  .object({
    commandId: commandIdSchema,
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict();

const engineEventSchema = z
  .object({
    type: z.enum([
      "ACTION_COMPLETED",
      "ACTION_STARTED",
      "ACTION_UPGRADED",
      "BUILDING_BOUGHT",
      "CONVERTER_BOUGHT",
      "CONVERTER_TOGGLED",
      "ERA_ADVANCED",
      "ERA_UNLOCKED",
      "POPULATION_GREW",
      "RESEARCH_BOUGHT",
      "WORKER_ASSIGNED",
    ]),
    id: z.string().optional(),
    amount: z.number().finite().optional(),
  })
  .strict();

export const civilizationStoredCommandResponseSchema = z
  .object({
    accepted: z.boolean(),
    commandError: z
      .enum([
        "ACTION_ALREADY_RUNNING",
        "ACTION_LEVEL_MAX",
        "CONTENT_LOCKED",
        "INSUFFICIENT_RESOURCES",
        "INVALID_DELTA",
        "NO_IDLE_WORKERS",
        "NOT_BUILT",
        "PREREQUISITE_MISSING",
        "TECH_ALREADY_RESEARCHED",
      ])
      .optional(),
    revision: z.number().int().positive(),
    state: civilizationStateSchema,
    events: z.array(engineEventSchema),
    simulation: z
      .object({
        requestedElapsedMs: z.number().finite().nonnegative(),
        simulatedElapsedMs: z.number().finite().nonnegative(),
        discardedElapsedMs: z.number().finite().nonnegative(),
        clockAdjusted: z.boolean(),
        resourceDeltas: z
          .object({
            food: z.number().finite(),
            population: z.number().finite(),
            wood: z.number().finite(),
            stone: z.number().finite(),
            science: z.number().finite(),
            copper: z.number().finite(),
            bronze: z.number().finite(),
            iron: z.number().finite(),
          })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type CivilizationCommandRequest = z.infer<typeof civilizationCommandRequestSchema>;
export type CivilizationStoredCommandResponse = z.infer<
  typeof civilizationStoredCommandResponseSchema
>;

export function parseCivilizationState(value: unknown): CivilizationState {
  const state = civilizationStateSchema.parse(value) as CivilizationState;
  assertCivilizationInvariants(state);
  return state;
}
