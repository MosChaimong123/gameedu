import { z } from "zod";
import { assertCivilizationInvariants } from "./invariants";
import { CIVILIZATION_CONTENT_VERSION, CIVILIZATION_SCHEMA_VERSION, type CivilizationState } from "./types";

const legacyEraSchema = z.enum(["stone", "bronze"]);
const v3EraSchema = z.enum(["stone", "bronze", "industrial"]);
const v4EraSchema = z.enum(["stone", "bronze", "industrial", "information"]);
const eraSchema = z.enum(["stone", "bronze", "industrial", "information", "space"]);
const activeActionSchema = z.object({ readyAt: z.number().finite().nonnegative() }).strict();
const resourceSchema = z
  .object({ amount: z.number().finite().nonnegative(), cap: z.number().finite().nonnegative() })
  .strict();
const legacyConverterStateSchema = z
  .object({ count: z.number().int().nonnegative(), enabled: z.boolean() })
  .strict();
const converterStateSchema = legacyConverterStateSchema.extend({
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
}).strict();

const civilizationStateV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: z.literal(1),
    era: legacyEraSchema,
    unlockedEras: z.array(legacyEraSchema),
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
        copper_smelter: legacyConverterStateSchema,
        bronze_foundry: legacyConverterStateSchema,
        iron_forge: legacyConverterStateSchema,
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

const jobMasterySecondsSchema = z.object({
  forager: z.number().finite().nonnegative(),
  woodcutter: z.number().finite().nonnegative(),
  hunter: z.number().finite().nonnegative(),
  miner: z.number().finite().nonnegative(),
  scientist: z.number().finite().nonnegative(),
}).strict();

const researchLevelsSchema = z.object({
  food_storage: z.number().int().min(0).max(3),
  labor_organization: z.number().int().min(0).max(3),
  precision_casting: z.number().int().min(0).max(3),
  metal_reserves: z.number().int().min(0).max(3),
}).strict();

const civilizationStateV2Schema = civilizationStateV1Schema
  .omit({ schemaVersion: true, contentVersion: true, actionLevels: true })
  .extend({
    schemaVersion: z.literal(2),
    contentVersion: z.literal(2),
    actionLevels: z.object({
      gather_fruit: z.number().int().min(1).max(10),
      chop_wood: z.number().int().min(1).max(10),
      mine_stone: z.number().int().min(1).max(10),
      pan_copper: z.number().int().min(1).max(10),
      forge_iron: z.number().int().min(1).max(10),
    }).strict(),
    jobMasterySeconds: jobMasterySecondsSchema,
    researchLevels: researchLevelsSchema,
    policy: z.object({
      id: z.enum(["balanced", "sustenance", "scholarship", "industry"]),
      changedAt: z.number().finite().nonnegative(),
    }).strict(),
  })
  .strict();

const civilizationStateV3Schema = civilizationStateV2Schema
  .omit({
    schemaVersion: true,
    contentVersion: true,
    era: true,
    unlockedEras: true,
    resources: true,
    workers: true,
    buildings: true,
    converters: true,
    unlockedConverters: true,
    researchedTechs: true,
    actionLevels: true,
    activeActions: true,
    jobMasterySeconds: true,
    researchLevels: true,
  })
  .extend({
    schemaVersion: z.literal(3),
    contentVersion: z.literal(3),
    era: v3EraSchema,
    unlockedEras: z.array(v3EraSchema),
    resources: z.object({
      food: resourceSchema, population: resourceSchema, wood: resourceSchema, stone: resourceSchema,
      science: resourceSchema, copper: resourceSchema, bronze: resourceSchema, iron: resourceSchema,
      coal: resourceSchema, steel: resourceSchema, electricity: resourceSchema, machinery: resourceSchema,
    }).strict(),
    workers: z.object({
      forager: z.number().int().nonnegative(), woodcutter: z.number().int().nonnegative(),
      hunter: z.number().int().nonnegative(), miner: z.number().int().nonnegative(),
      scientist: z.number().int().nonnegative(), coal_miner: z.number().int().nonnegative(),
    }).strict(),
    buildings: z.object({
      shelter: z.number().int().nonnegative(), granary: z.number().int().nonnegative(),
      stockpile: z.number().int().nonnegative(), hunting_ground: z.number().int().nonnegative(),
      stone_mine: z.number().int().nonnegative(), storytelling_circle: z.number().int().nonnegative(),
      clay_brick_house: z.number().int().nonnegative(), metal_warehouse: z.number().int().nonnegative(),
      coal_mine: z.number().int().nonnegative(), worker_housing: z.number().int().nonnegative(),
      industrial_warehouse: z.number().int().nonnegative(), power_station: z.number().int().nonnegative(),
      industrial_institute: z.number().int().nonnegative(),
    }).strict(),
    converters: z.object({
      copper_smelter: converterStateSchema, bronze_foundry: converterStateSchema,
      iron_forge: converterStateSchema, steel_mill: converterStateSchema,
      steam_generator: converterStateSchema, machine_factory: converterStateSchema,
    }).strict(),
    unlockedConverters: z.array(z.enum(["copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory"])),
    researchedTechs: z.array(z.enum([
      "basic_tools", "foraging", "logging", "masonry", "animal_husbandry", "agriculture",
      "smelting", "bronze_working", "iron_working", "writing", "steam_power",
      "coal_geology", "steel_furnace", "steam_engine", "electrification", "conveyor_belts",
      "factory_priority", "efficient_generator", "factory_automation",
    ])),
    actionLevels: z.object({
      gather_fruit: z.number().int().min(1).max(10), chop_wood: z.number().int().min(1).max(10),
      mine_stone: z.number().int().min(1).max(10), pan_copper: z.number().int().min(1).max(10),
      forge_iron: z.number().int().min(1).max(10), mine_coal: z.number().int().min(1).max(10),
    }).strict(),
    activeActions: z.object({
      gather_fruit: activeActionSchema.nullable(), chop_wood: activeActionSchema.nullable(),
      mine_stone: activeActionSchema.nullable(), pan_copper: activeActionSchema.nullable(),
      forge_iron: activeActionSchema.nullable(), mine_coal: activeActionSchema.nullable(),
    }).strict(),
    jobMasterySeconds: jobMasterySecondsSchema.extend({ coal_miner: z.number().finite().nonnegative() }).strict(),
    researchLevels: researchLevelsSchema.extend({
      fuel_efficiency: z.number().int().min(0).max(5),
      machine_efficiency: z.number().int().min(0).max(5),
    }).strict(),
    industrialCompleted: z.boolean(),
  })
  .strict();

const civilizationStateV4Schema = civilizationStateV3Schema
  .omit({
    schemaVersion: true, contentVersion: true, era: true, unlockedEras: true,
    resources: true, buildings: true, converters: true, unlockedConverters: true,
    researchedTechs: true, actionLevels: true, activeActions: true,
    researchLevels: true,
  })
  .extend({
    schemaVersion: z.literal(4),
    contentVersion: z.literal(4),
    era: v4EraSchema,
    unlockedEras: z.array(v4EraSchema),
    resources: civilizationStateV3Schema.shape.resources.extend({
      circuits: resourceSchema, data: resourceSchema, compute: resourceSchema,
    }).strict(),
    buildings: civilizationStateV3Schema.shape.buildings.extend({
      electronics_warehouse: z.number().int().nonnegative(),
      network_station: z.number().int().nonnegative(),
      scheduler_center: z.number().int().nonnegative(),
    }).strict(),
    converters: civilizationStateV3Schema.shape.converters.extend({
      circuit_assembler: converterStateSchema,
      data_center: converterStateSchema,
      digital_lab: converterStateSchema,
    }).strict(),
    unlockedConverters: z.array(z.enum([
      "copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory",
      "circuit_assembler", "data_center", "digital_lab",
    ])),
    researchedTechs: z.array(z.enum([
      "basic_tools", "foraging", "logging", "masonry", "animal_husbandry", "agriculture",
      "smelting", "bronze_working", "iron_working", "writing", "steam_power",
      "coal_geology", "steel_furnace", "steam_engine", "electrification", "conveyor_belts",
      "factory_priority", "efficient_generator", "factory_automation", "circuitry", "computing",
      "networking", "databases", "job_scheduling", "computational_simulation", "telecommunications", "space_science",
    ])),
    actionLevels: civilizationStateV3Schema.shape.actionLevels.extend({
      audit_system: z.number().int().min(1).max(10),
    }).strict(),
    activeActions: civilizationStateV3Schema.shape.activeActions.extend({
      audit_system: activeActionSchema.nullable(),
    }).strict(),
    researchLevels: civilizationStateV3Schema.shape.researchLevels.extend({
      data_compression: z.number().int().min(0).max(5),
      computer_efficiency: z.number().int().min(0).max(5),
    }).strict(),
    informationCompleted: z.boolean(),
    automationRules: z.array(z.enum(["protect_copper", "protect_steel", "prioritize_data_center"])),
  })
  .strict();

const civilizationStateV5Schema = civilizationStateV4Schema
  .omit({
    schemaVersion: true, contentVersion: true, era: true, unlockedEras: true,
    resources: true, buildings: true, converters: true, unlockedConverters: true,
    researchedTechs: true, researchLevels: true,
  })
  .extend({
    schemaVersion: z.literal(5),
    contentVersion: z.literal(5),
    era: eraSchema,
    unlockedEras: z.array(eraSchema),
    resources: civilizationStateV4Schema.shape.resources.extend({
      advanced_alloy: resourceSchema,
      rocket_fuel: resourceSchema,
      ship_parts: resourceSchema,
    }).strict(),
    buildings: civilizationStateV4Schema.shape.buildings.extend({
      space_warehouse: z.number().int().nonnegative(),
      test_center: z.number().int().nonnegative(),
      evacuation_port: z.number().int().nonnegative(),
    }).strict(),
    converters: civilizationStateV4Schema.shape.converters.extend({
      space_material_plant: converterStateSchema,
      rocket_fuel_refinery: converterStateSchema,
      orbital_shipyard: converterStateSchema,
    }).strict(),
    unlockedConverters: z.array(z.enum([
      "copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory",
      "circuit_assembler", "data_center", "digital_lab", "space_material_plant", "rocket_fuel_refinery", "orbital_shipyard",
    ])),
    researchedTechs: z.array(z.enum([
      "basic_tools", "foraging", "logging", "masonry", "animal_husbandry", "agriculture",
      "smelting", "bronze_working", "iron_working", "writing", "steam_power",
      "coal_geology", "steel_furnace", "steam_engine", "electrification", "conveyor_belts",
      "factory_priority", "efficient_generator", "factory_automation", "circuitry", "computing",
      "networking", "databases", "job_scheduling", "computational_simulation", "telecommunications", "space_science",
      "lightweight_materials", "propulsion_systems", "navigation_systems", "life_support", "spacecraft_testing", "evacuation",
    ])),
    researchLevels: civilizationStateV4Schema.shape.researchLevels.extend({
      material_efficiency: z.number().int().min(0).max(5),
      propulsion_efficiency: z.number().int().min(0).max(5),
    }).strict(),
    spaceProjectStage: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    spaceCompleted: z.boolean(),
  })
  .strict();

const civilizationStateV6Schema = civilizationStateV5Schema
  .omit({ schemaVersion: true, contentVersion: true })
  .extend({
    schemaVersion: z.literal(6),
    contentVersion: z.literal(6),
    runNumber: z.number().int().positive(),
    runStartedAt: z.number().finite().nonnegative(),
    permanentRewards: z.object({
      abundant_harvest: z.number().int().min(0).max(5),
      research_archive: z.number().int().min(0).max(5),
      founder_stockpile: z.number().int().min(0).max(5),
      efficient_industry: z.number().int().min(0).max(5),
    }).strict(),
  })
  .strict();

export const civilizationStateSchema = civilizationStateV6Schema
  .omit({ schemaVersion: true, contentVersion: true })
  .extend({
    schemaVersion: z.literal(CIVILIZATION_SCHEMA_VERSION),
    contentVersion: z.literal(CIVILIZATION_CONTENT_VERSION),
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
        "mine_coal",
        "audit_system",
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
        "mine_coal",
        "audit_system",
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
        "coal_mine",
        "worker_housing",
        "industrial_warehouse",
        "power_station",
        "industrial_institute",
        "electronics_warehouse",
        "network_station",
        "scheduler_center",
        "space_warehouse",
        "test_center",
        "evacuation_port",
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("ASSIGN_WORKER"),
      jobId: z.enum(["forager", "woodcutter", "hunter", "miner", "scientist", "coal_miner"]),
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
        "coal_geology",
        "steel_furnace",
        "steam_engine",
        "electrification",
        "conveyor_belts",
        "factory_priority",
        "efficient_generator",
        "factory_automation",
        "circuitry",
        "computing",
        "networking",
        "databases",
        "job_scheduling",
        "computational_simulation",
        "telecommunications",
        "space_science",
        "lightweight_materials",
        "propulsion_systems",
        "navigation_systems",
        "life_support",
        "spacecraft_testing",
        "evacuation",
      ]),
    })
    .strict(),
  z.object({
    type: z.literal("BUY_REPEATABLE_RESEARCH"),
    researchId: z.enum(["food_storage", "labor_organization", "precision_casting", "metal_reserves", "fuel_efficiency", "machine_efficiency", "data_compression", "computer_efficiency", "material_efficiency", "propulsion_efficiency"]),
  }).strict(),
  z.object({
    type: z.literal("SET_POLICY"),
    policyId: z.enum(["balanced", "sustenance", "scholarship", "industry"]),
  }).strict(),
  z
    .object({ type: z.literal("ADVANCE_ERA"), eraId: eraSchema })
    .strict(),
  z
    .object({
      type: z.literal("BUY_CONVERTER"),
      converterId: z.enum(["copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory", "circuit_assembler", "data_center", "digital_lab", "space_material_plant", "rocket_fuel_refinery", "orbital_shipyard"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("TOGGLE_CONVERTER"),
      converterId: z.enum(["copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory", "circuit_assembler", "data_center", "digital_lab", "space_material_plant", "rocket_fuel_refinery", "orbital_shipyard"]),
    })
    .strict(),
  z.object({
    type: z.literal("SET_CONVERTER_PRIORITY"),
    converterId: z.enum(["copper_smelter", "bronze_foundry", "iron_forge", "steel_mill", "steam_generator", "machine_factory", "circuit_assembler", "data_center", "digital_lab", "space_material_plant", "rocket_fuel_refinery", "orbital_shipyard"]),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }).strict(),
  z.object({
    type: z.literal("TOGGLE_AUTOMATION_RULE"),
    ruleId: z.enum(["protect_copper", "protect_steel", "prioritize_data_center"]),
  }).strict(),
  z.object({
    type: z.literal("COMPLETE_SPACE_PROJECT_STAGE"),
    stage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  }).strict(),
  z.object({
    type: z.literal("PRESTIGE_RESET"),
    rewardId: z.enum(["abundant_harvest", "research_archive", "founder_stockpile", "efficient_industry"]),
    confirmRunNumber: z.number().int().positive(),
  }).strict(),
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
      "CONVERTER_PRIORITY_CHANGED",
      "AUTOMATION_RULE_CHANGED",
      "SPACE_PROJECT_STAGE_COMPLETED",
      "SPACE_COMPLETED",
      "PRESTIGE_COMPLETED",
      "ERA_ADVANCED",
      "ERA_UNLOCKED",
      "POPULATION_GREW",
      "RESEARCH_BOUGHT",
      "REPEATABLE_RESEARCH_BOUGHT",
      "POLICY_CHANGED",
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
        "RESEARCH_LEVEL_MAX",
        "POLICY_COOLDOWN",
        "COMPLETION_REQUIREMENTS_MISSING",
        "PRESTIGE_NOT_READY",
        "PRESTIGE_REWARD_MAXED",
        "PRESTIGE_CONFIRMATION_MISMATCH",
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
            coal: z.number().finite(),
            steel: z.number().finite(),
            electricity: z.number().finite(),
            machinery: z.number().finite(),
            circuits: z.number().finite(),
            data: z.number().finite(),
            compute: z.number().finite(),
            advanced_alloy: z.number().finite(),
            rocket_fuel: z.number().finite(),
            ship_parts: z.number().finite(),
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
  const current = civilizationStateSchema.safeParse(value);
  let state: CivilizationState;
  if (current.success) {
    state = current.data as CivilizationState;
  } else {
    const version6 = civilizationStateV6Schema.safeParse(value);
    if (version6.success) {
      state = migrateCivilizationStateV6(version6.data);
    } else {
      const version5 = civilizationStateV5Schema.safeParse(value);
      if (version5.success) {
        state = migrateCivilizationStateV6(migrateCivilizationStateV5(version5.data));
      } else {
        const version4 = civilizationStateV4Schema.safeParse(value);
        if (version4.success) {
          state = migrateCivilizationStateV6(migrateCivilizationStateV5(migrateCivilizationStateV4(version4.data)));
        } else {
          const version3 = civilizationStateV3Schema.safeParse(value);
          if (version3.success) {
            state = migrateCivilizationStateV6(migrateCivilizationStateV5(migrateCivilizationStateV4(migrateCivilizationStateV3(version3.data))));
          } else {
            const version2 = civilizationStateV2Schema.safeParse(value);
            const migratedV3 = version2.success
              ? migrateCivilizationStateV2(version2.data)
              : migrateCivilizationStateV2(migrateCivilizationStateV1(civilizationStateV1Schema.parse(value)));
            state = migrateCivilizationStateV6(migrateCivilizationStateV5(migrateCivilizationStateV4(migrateCivilizationStateV3(migratedV3))));
          }
        }
      }
    }
  }
  assertCivilizationInvariants(state);
  return state;
}

function migrateCivilizationStateV1(value: z.infer<typeof civilizationStateV1Schema>): z.infer<typeof civilizationStateV2Schema> {
  return {
    ...value,
    schemaVersion: 2,
    contentVersion: 2,
    jobMasterySeconds: { forager: 0, woodcutter: 0, hunter: 0, miner: 0, scientist: 0 },
    researchLevels: { food_storage: 0, labor_organization: 0, precision_casting: 0, metal_reserves: 0 },
    policy: { id: "balanced", changedAt: 0 },
  };
}

function migrateCivilizationStateV2(value: z.infer<typeof civilizationStateV2Schema>): z.infer<typeof civilizationStateV3Schema> {
  const converter = (id: "copper_smelter" | "bronze_foundry" | "iron_forge") => ({
    ...value.converters[id],
    priority: 2 as const,
  });
  return {
    ...value,
    schemaVersion: 3,
    contentVersion: 3,
    resources: {
      ...value.resources,
      coal: { amount: 0, cap: 400 },
      steel: { amount: 0, cap: 300 },
      electricity: { amount: 0, cap: 0 },
      machinery: { amount: 0, cap: 200 },
    },
    workers: { ...value.workers, coal_miner: 0 },
    buildings: {
      ...value.buildings,
      coal_mine: 0,
      worker_housing: 0,
      industrial_warehouse: 0,
      power_station: 0,
      industrial_institute: 0,
    },
    converters: {
      copper_smelter: converter("copper_smelter"),
      bronze_foundry: converter("bronze_foundry"),
      iron_forge: converter("iron_forge"),
      steel_mill: { count: 0, enabled: true, priority: 2 },
      steam_generator: { count: 0, enabled: true, priority: 1 },
      machine_factory: { count: 0, enabled: true, priority: 2 },
    },
    actionLevels: { ...value.actionLevels, mine_coal: 1 },
    activeActions: { ...value.activeActions, mine_coal: null },
    industrialCompleted: false,
    jobMasterySeconds: { ...value.jobMasterySeconds, coal_miner: 0 },
    researchLevels: { ...value.researchLevels, fuel_efficiency: 0, machine_efficiency: 0 },
  };
}

function migrateCivilizationStateV3(value: z.infer<typeof civilizationStateV3Schema>): z.infer<typeof civilizationStateV4Schema> {
  return {
    ...value,
    schemaVersion: 4,
    contentVersion: 4,
    resources: {
      ...value.resources,
      circuits: { amount: 0, cap: 300 },
      data: { amount: 0, cap: 400 },
      compute: { amount: 0, cap: 0 },
    },
    buildings: {
      ...value.buildings,
      electronics_warehouse: 0,
      network_station: 0,
      scheduler_center: 0,
    },
    converters: {
      ...value.converters,
      circuit_assembler: { count: 0, enabled: true, priority: 2 },
      data_center: { count: 0, enabled: true, priority: 1 },
      digital_lab: { count: 0, enabled: true, priority: 2 },
    },
    actionLevels: { ...value.actionLevels, audit_system: 1 },
    activeActions: { ...value.activeActions, audit_system: null },
    researchLevels: { ...value.researchLevels, data_compression: 0, computer_efficiency: 0 },
    informationCompleted: false,
    automationRules: [],
  };
}

function migrateCivilizationStateV4(value: z.infer<typeof civilizationStateV4Schema>): z.infer<typeof civilizationStateV5Schema> {
  return {
    ...value,
    schemaVersion: 5,
    contentVersion: 5,
    resources: {
      ...value.resources,
      advanced_alloy: { amount: 0, cap: 300 },
      rocket_fuel: { amount: 0, cap: 400 },
      ship_parts: { amount: 0, cap: 300 },
    },
    buildings: {
      ...value.buildings,
      space_warehouse: 0,
      test_center: 0,
      evacuation_port: 0,
    },
    converters: {
      ...value.converters,
      space_material_plant: { count: 0, enabled: true, priority: 2 },
      rocket_fuel_refinery: { count: 0, enabled: true, priority: 2 },
      orbital_shipyard: { count: 0, enabled: true, priority: 1 },
    },
    researchLevels: {
      ...value.researchLevels,
      material_efficiency: 0,
      propulsion_efficiency: 0,
    },
    spaceProjectStage: 0,
    spaceCompleted: false,
  };
}

function migrateCivilizationStateV5(
  value: z.infer<typeof civilizationStateV5Schema>
): z.infer<typeof civilizationStateV6Schema> {
  return {
    ...value,
    schemaVersion: 6,
    contentVersion: 6,
    runNumber: 1,
    runStartedAt: value.lastSimulatedAt,
    permanentRewards: {
      abundant_harvest: 0,
      research_archive: 0,
      founder_stockpile: 0,
      efficient_industry: 0,
    },
  } as z.infer<typeof civilizationStateV6Schema>;
}

function migrateCivilizationStateV6(value: z.infer<typeof civilizationStateV6Schema>): CivilizationState {
  return {
    ...value,
    schemaVersion: CIVILIZATION_SCHEMA_VERSION,
    contentVersion: CIVILIZATION_CONTENT_VERSION,
    resources: {
      ...value.resources,
      science: {
        ...value.resources.science,
        cap: Math.max(
          2_000,
          value.resources.science.cap +
            value.buildings.network_station * 20_000 +
            value.buildings.test_center * 30_000
        ),
      },
    },
  };
}
