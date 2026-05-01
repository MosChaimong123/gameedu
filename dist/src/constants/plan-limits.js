"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = void 0;
exports.PLAN_LIMITS = {
    FREE: {
        maxQuestionSets: 10,
        maxQuestionsPerSet: 30,
        maxLiveGamePlayers: 40,
        maxOmrScansPerMonth: 50,
        maxClassrooms: 5,
        aiQuestionGeneration: false,
        aiFileParse: false,
        maxNegamonSpeciesInClassroom: 3,
        negamonDefaultSpeciesSlotCount: 3,
        negamonAllowCustomSpecies: false,
    },
    PLUS: {
        maxQuestionSets: 100,
        maxQuestionsPerSet: 200,
        maxLiveGamePlayers: 200,
        maxOmrScansPerMonth: 2000,
        maxClassrooms: 50,
        aiQuestionGeneration: true,
        aiFileParse: true,
        maxNegamonSpeciesInClassroom: 32,
        negamonDefaultSpeciesSlotCount: null,
        negamonAllowCustomSpecies: false,
    },
    PRO: {
        maxQuestionSets: Number.POSITIVE_INFINITY,
        maxQuestionsPerSet: Number.POSITIVE_INFINITY,
        maxLiveGamePlayers: 500,
        maxOmrScansPerMonth: Number.POSITIVE_INFINITY,
        maxClassrooms: Number.POSITIVE_INFINITY,
        aiQuestionGeneration: true,
        aiFileParse: true,
        maxNegamonSpeciesInClassroom: Number.POSITIVE_INFINITY,
        negamonDefaultSpeciesSlotCount: null,
        negamonAllowCustomSpecies: true,
    },
};
