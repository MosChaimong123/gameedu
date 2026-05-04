import { describe, expect, it } from "vitest";

import type { AppErrorCode } from "@/lib/api-error";
import { formatBoardActionErrorMessage } from "@/lib/board-action-error-messages";
import { getLocalizedOmrErrorMessageFromResponse } from "@/lib/omr-ui-messages";
import { formatSocketErrorMessage } from "@/lib/socket-error-messages";
import type { Language } from "@/lib/translations";
import { getTranslationText } from "@/lib/translation-lookup";
import {
  getLocalizedErrorMessageFromResponse,
  getLocalizedMessageFromApiErrorBody,
} from "@/lib/ui-error-messages";

const coreUiKeys = [
  "dashboard",
  "welcomeBack",
  "settings",
  "logout",
  "loginAuthErrorUnknown",
  "loginAuthErrorRateLimited",
  "registerErrorInvalidPayload",
  "registerErrorFailed",
  "classroomOverview",
  "dashboardTabClassroom",
] as const;

const flowUiKeys = [
  "boardCreateTitle",
  "boardPostCommentPlaceholder",
  "boardPostCreateFail",
  "boardErrPostNotFound",
  "hostGameOverTitle",
  "hostFinalStandings",
  "hostBackToMyQuestionSets",
  "hostWaitingForPlayers",
  "hostStartGame",
  "hostEndLobbyTitle",
  "hostEndLobbyDesc",
  "hostCreateRoomTimeoutTitle",
  "hostCreateRoomTimeoutDesc",
  "hostSocketNotConnectedTitle",
  "hostSocketNotConnectedDesc",
  "hostNegamonIdentityStartTitle",
  "hostNegamonIdentityStartDesc",
  "hostNegamonIdentityStartBack",
  "hostNegamonIdentityStartAnyway",
  "playLobbyWaitingHost",
  "playLobbyWaitBody",
  "playLobbyLeaveGame",
  "playToastRoomPinMissingTitle",
  "playToastRoomPinMissingDesc",
  "playToastActionFailed",
  "playGameOverTitle",
  "playGameOverFinalRank",
  "playGameOverBackMenu",
  "playLeaveGame",
  "playSocketGameNotFound",
  "playSocketInvalidQuestionSet",
  "negamonStarterToastErrDesc",
  "negamonSettingsToastSaved",
  "omrErrInvalidPayload",
  "omrCameraError",
  "omrScannerTitle",
  "omrScannerChecking",
  "omrScannerWait",
  "omrScannerScanNext",
  "omrScannerProcessing",
  "omrScannerStudentScoreSummary",
  "omrScannerDataSaved",
  "omrScanComplete",
  "omrScanFailed",
  "omrScannerNoScanYet",
  "omrAwaitingCapture",
  "omrCvErrorShort",
  "omrRetryButton",
  "omrAlignCornersHint",
  "omrScannerAlignmentMode",
] as const;

const battleUiKeys = [
  "battleHudAtk",
  "battleHudDef",
  "battleHudSpd",
  "battleHudHp",
  "battleHudEn",
  "battleHudBuffLegend",
  "battleHudDebuffLegend",
  "battleViewFight",
  "battleViewHistory",
  "battleBadgeCrit",
  "battleStarting",
  "battleReadyTitle",
  "battleReadyQueue",
  "battleStartButton",
  "negamonActionNoEnergy",
  "negamonActionTurnMeta",
  "negamonActionQueueMeta",
  "negamonActionItemsUsed",
  "negamonActionNoItems",
  "battleResultWinnerBadge",
  "battleResultLoserBadge",
  "battleResultWinnerLine",
  "battleResultLoserLine",
  "battleResultSummaryTitle",
  "battleResultStatDamageDealt",
  "battleResultStatDamageReceived",
  "battleResultStatCrit",
  "battleResultStatHeals",
  "battleResultStatTurns",
  "battleLevelLabel",
  "battleHudPersonalTurns",
  "negamonMoveCategoryPHYSICAL",
  "negamonMoveCategorySPECIAL",
  "negamonMoveCategorySTATUS",
  "negamonMoveCategoryHEAL",
  "negamonMovePriority",
] as const;

const battleLogStatusKeys = [
  "battleLogMoveUsed",
  "battleLogMiss",
  "battleLogDamage",
  "battleLogHeal",
  "battleLogStatusEnd",
  "battleLogFaint",
  "battleLogApplyBURN",
  "battleLogApplyPOISON",
  "battleLogApplyPARALYZE",
  "battleLogApplySLEEP",
  "battleLogApplyFREEZE",
  "battleLogApplyCONFUSE",
  "battleStatusMetaTurnsShort",
  "battleStatusMetaTurnsLeft",
  "battleStatusMetaEnDrain",
  "battleStatusMetaBurnRate",
  "battleLogTickBURN",
  "battleLogTickPOISON",
  "battleLogTickGeneric",
  "battleLogSkipSLEEP",
  "battleLogSkipPARALYZE",
  "battleLogSkipFREEZE",
  "battleLogSkipGeneric",
  "battleStatusBOOST_ATK",
  "battleStatusBOOST_DEF",
  "battleStatusLOWER_ATK",
  "battleStatusLOWER_DEF",
  "battleStatusBURN",
  "battleStatusPOISON",
  "battleStatusPARALYZE",
  "battleStatusSLEEP",
  "battleStatusFREEZE",
  "battleStatusCONFUSE",
  "battleLogConfusionHit",
  "battleLogFreezeThaw",
  "battleLogApplyBADLY_POISON",
  "battleLogApplyLowerAtk",
  "battleLogApplyLowerDef",
  "battleLogApplyLowerSpd",
  "battleLogApplyLowerEnRegen",
  "battleLogApplyBoostAtk",
  "battleLogApplyBoostDef",
  "battleLogApplyBoostSpd",
  "battleLogApplyIgnoreDef",
  "battleLogApplyGeneric",
  "battleStatusMetaIgnoreDef",
  "battleLogTickBADLY_POISON",
  "battleStatusBOOST_DEF_20",
  "battleStatusBOOST_SPD",
  "battleStatusBOOST_SPD_30",
  "battleStatusBOOST_SPD_100",
  "battleStatusBOOST_WATER_DMG",
  "battleStatusLOWER_ATK_ALL",
  "battleStatusLOWER_SPD",
  "battleStatusLOWER_EN_REGEN",
  "battleStatusIGNORE_DEF",
  "battleStatusBADLY_POISON",
] as const;

const battleSupportKeys = [
  "battleAbilityDefault",
  "battleAbilityRageMode",
  "battleAbilityGuardianScale",
  "battleHistoryJustNow",
  "battleHistoryMinutesAgo",
  "battleHistoryHoursAgo",
  "battleHistoryDaysAgo",
  "negamonRewardAuditReasonNoAwards",
  "negamonRewardAuditReasonAlreadyAwarded",
  "negamonRewardAuditReasonClaimAlreadyExists",
] as const;

const sharedUtilityKeys = [
  "adminPlanStatusActive",
  "adminPlanStatusExpired",
  "adminPlanStatusInactive",
  "adminPlanFree",
  "adminPlanPlus",
  "adminPlanPro",
  "timerClose",
  "timerMinutesPlaceholder",
  "timerSecondsPlaceholder",
  "timerSet",
  "classroomIconAlt",
  "connected",
  "disconnected",
  "mainNavigation",
  "coverImageAlt",
  "editQuestion",
  "addEquation",
  "addImage",
  "questionImageAlt",
  "optionImageAlt",
  "boardImagePreviewAlt",
  "boardPostImageAlt",
  "boardYoutubePlayerTitle",
  "boardAlbumImageAlt",
  "omrCapturedSheetAlt",
  "upgradeContactSubject",
  "upgradeLoading",
  "signupLegalPrefix",
  "signupLegalTerms",
  "signupLegalAnd",
  "signupLegalPrivacy",
  "createSetCreating",
] as const;

const adminBillingKeys = [
  "adminAuthRequired",
  "adminRoleUpdateFailDesc",
  "adminSubscriptionInvalidPayload",
  "adminSubscriptionInvalidExpiry",
  "adminSubscriptionUpdateFailDesc",
  "adminTeacherNewsUnavailable",
  "adminTeacherNewsInvalidPayload",
  "adminTeacherNewsCreateFailDesc",
  "adminTeacherNewsUpdateFailDesc",
  "adminTeacherNewsDeleteFailDesc",
  "adminTeacherMissionUnavailable",
  "adminTeacherMissionInvalidPayload",
  "adminTeacherMissionCreateFailDesc",
  "adminTeacherMissionUpdateFailDesc",
  "adminTeacherMissionDeleteFailDesc",
  "adminSetDeleteFailDesc",
  "apiError_BILLING_NOT_CONFIGURED",
  "apiError_BILLING_PRICE_NOT_CONFIGURED",
  "apiError_BILLING_PRO_MANAGED",
  "apiError_BILLING_CHECKOUT_CREATE_FAILED",
  "apiError_BILLING_THAI_NOT_CONFIGURED",
  "apiError_BILLING_OMISE_INACTIVE",
  "apiError_BILLING_OMISE_NOT_CONFIGURED",
  "apiError_BILLING_CHARGE_SESSION_MISMATCH",
  "apiError_BILLING_PROCESSING_FAILED",
  "apiError_INVALID_ACCESSIBILITY_SETTINGS",
  "apiError_ENDPOINT_NO_LONGER_AVAILABLE",
  "apiError_INVALID_BATTLE_LOADOUT",
  "billingPublicUrlRequired",
  "billingReturnUrlUnavailable",
  "billingRedirectUrlUnavailable",
  "billingStripeSecretMissing",
  "billingOmiseMinimumAmount",
  "billingOmiseChargeFailed",
  "billingOmiseMissingAuthorizeUri",
  "billingOmiseRetrieveFailed",
] as const;

const classroomAssessmentKeys = [
  "classroomAttendanceInvalidData",
  "classroomAttendanceStudentNotFound",
  "classroomPointsMissingData",
  "classroomPointsStudentNotFound",
  "classroomPointsStudentsNotFound",
  "classroomPointsSkillNotFound",
  "manualScoreMissing",
  "manualScoreNotNumber",
  "manualScoreNotWhole",
  "manualScoreChecklistEmpty",
  "manualScoreChecklistRange",
  "manualScoreRange",
] as const;

const cryptoFlowKeys = [
  "cryptoClientSelectPasswordProtocol",
  "cryptoClientSelectVictimNode",
  "cryptoClientBruteForce",
  "cryptoClientCrackingPassword",
  "playCryptoPasswordTaken",
  "playCryptoSelectionInvalid",
  "playCryptoSelectionServerError",
  "playCryptoSystemGlitched",
  "cryptoTaskOverlaySystemFailure",
  "cryptoTaskOverlayCriticalError",
  "cryptoTaskOverlayErrorCode",
  "cryptoFrequencySignalLocked",
  "cryptoFrequencyStabilizeSignal",
  "cryptoFrequencyInstructions",
  "cryptoFrequencyTapToBoost",
  "cryptoPatternMismatch",
  "cryptoPatternVerificationRequired",
  "cryptoPatternWatch",
  "cryptoPatternRepeat",
  "cryptoPatternReplay",
] as const;

const battleShopKeys = [
  "battleLoadoutDuplicateItem",
  "battleLoadoutUnknownItem",
  "battleLoadoutCategoryLimit",
  "battleLoadoutNotOwned",
  "battleBagTitle",
  "battleBagHint",
  "battleBagEmpty",
  "battleLoadoutPreset",
  "battleLoadoutEdit",
  "battleLoadoutTapToEdit",
  "battleLoadoutSaved",
  "battlePresetSave",
  "battlePrepTitle",
  "battlePrepClear",
  "battlePrepFight",
  "battleErrInvalidLoadout",
  "shopBattleCategory_stat_boost",
  "shopBattleCategory_stat_boost_hint",
  "shopBattleCategory_status",
  "shopBattleCategory_status_hint",
  "shopBattleCategory_reward",
  "shopBattleCategory_reward_hint",
  "shopItem_item_buckler_name",
  "shopItem_item_buckler_desc",
  "shopItem_item_iron_shield_name",
  "shopItem_item_iron_shield_desc",
  "shopItem_item_aegis_plate_name",
  "shopItem_item_aegis_plate_desc",
  "shopItem_item_wind_thread_name",
  "shopItem_item_wind_thread_desc",
  "shopItem_item_swift_feather_name",
  "shopItem_item_swift_feather_desc",
  "shopItem_item_gale_plume_name",
  "shopItem_item_gale_plume_desc",
  "shopItem_item_spark_charm_name",
  "shopItem_item_spark_charm_desc",
  "shopItem_item_ember_charm_name",
  "shopItem_item_ember_charm_desc",
  "shopItem_item_inferno_talisman_name",
  "shopItem_item_inferno_talisman_desc",
  "shopItem_item_lucky_coin_name",
  "shopItem_item_lucky_coin_desc",
  "shopItem_item_merchants_sigil_name",
  "shopItem_item_merchants_sigil_desc",
] as const;

const groupQuestKeys = [
  "groupSaving",
  "groupSetNameAuto",
  "groupNamePattern",
  "questTeacherCreateSet",
  "questTeacherHostSession",
  "questTeacherViewReport",
  "questStudentPlay3Matches",
  "questStudentWinGame",
  "questStudentEarnXp",
  "recentSetAlgebraBasics",
  "recentSetHistoryRome",
  "recentSetScienceTrivia",
  "relative2DaysAgo",
  "relative1WeekAgo",
  "relative2WeeksAgo",
] as const;

const playSocketQuizKeys = [
  "playNegamonSocketInvalidGameCode",
  "playNegamonSocketTooManySubmissions",
  "playNegamonSocketMidMatch",
  "playSocketUnauthorized",
  "playSocketUnauthorizedQuestionSetAccess",
  "playSocketSetNotFound",
  "playSocketFailedToLoadQuestions",
  "playSocketHostReconnectionDenied",
  "playSocketGameLocked",
  "playSocketInvalidStudentCode",
  "playSocketNicknameInUse",
  "playSocketOnlyHostCanStart",
  "playSocketOnlyHostCanEnd",
  "playSocketUnauthorizedClassroomAccess",
  "playSocketInvalidClassroomEvent",
  "playSocketJoinClassroomFirst",
  "playSocketUnauthorizedClassroomEvent",
  "quizPlainErrBadRequest",
  "quizPlainErrStudentNotFound",
  "quizPlainErrNotQuizAssignment",
  "quizPlainErrAssignmentClosed",
  "quizPlainErrNoQuestions",
  "quizPlainErrAlreadySubmitted",
  "quizPlainErrInvalidIndex",
  "quizPlainErrInternal",
] as const;

const economyLedgerKeys = [
  "dashboardTabEconomy",
  "economyLedgerLoadFailed",
  "economyLedgerFilterStudentId",
  "economyLedgerFilterStudentIdPlaceholder",
  "economyLedgerFilterSource",
  "economyLedgerFilterType",
  "economyLedgerFilterLimit",
  "economyLedgerAll",
  "economyLedgerApply",
  "economyLedgerExportCsv",
  "economyLedgerTrendTitle",
  "economyLedgerTrendSubtitle",
  "economyLedgerTopStudents",
  "economyLedgerPickStudent",
  "economyLedgerAdjustTitle",
  "economyLedgerAdjustAmount",
  "economyLedgerAdjustReason",
  "economyLedgerAdjustApply",
  "economyLedgerAdjustFailed",
  "economyLedgerAdjustScopeSingle",
  "economyLedgerAdjustScopeSelected",
  "economyLedgerAdjustScopeAll",
  "economyLedgerAdjustSelectedStudents",
  "economyLedgerAdjustSelectedCount",
  "economyLedgerAdjustAllCount",
  "economyLedgerAdjustSelectAll",
  "economyLedgerAdjustClearSelection",
  "economyLedgerAdjustPreview",
  "economyLedgerAdjustPreviewEmpty",
  "economyLedgerRows",
  "economyLedgerEarned",
  "economyLedgerSpent",
  "economyLedgerNet",
  "economyLedgerTableType",
  "economyLedgerTableSource",
  "economyLedgerTableAmount",
  "economyLedgerTableBalance",
  "economyLedgerTableDate",
  "economyLedgerEmpty",
  "economyLedgerSourceBattle",
  "economyLedgerSourceShop",
  "economyLedgerSourceQuest",
  "economyLedgerSourceCheckin",
  "economyLedgerSourcePassiveGold",
  "economyLedgerSourceAdminAdjustment",
  "economyLedgerSourceMigration",
  "economyLedgerTypeEarn",
  "economyLedgerTypeSpend",
  "economyLedgerTypeAdjust",
  "economyReconciliationTitle",
  "economyReconciliationStudents",
  "economyReconciliationOk",
  "economyReconciliationIssues",
  "economyReconciliationGold",
  "economyReconciliationHealthy",
] as const;

const negamonRewardOpsKeys = [
  "negamonRewardAuditTitle",
  "negamonRewardAuditSubtitle",
  "negamonRewardAuditEvents",
  "negamonRewardAuditApplied",
  "negamonRewardAuditSkipped",
  "negamonRewardAuditRecipients",
  "negamonRewardAuditLinked",
  "negamonRewardAuditFallback",
  "negamonRewardAuditSkippedPlayers",
  "negamonRewardAuditGamePin",
  "negamonRewardAuditAllReasons",
  "negamonRewardAuditClearFilters",
  "negamonRewardAuditExport",
  "negamonRewardAuditAmbiguous",
  "negamonRewardAuditInvalidId",
  "negamonRewardAuditNoMatch",
  "negamonRewardAuditDuplicate",
  "negamonRewardAuditZeroExp",
  "negamonRewardAuditEmpty",
  "negamonRewardRemediationTitle",
  "negamonRewardRemediationSubtitle",
  "negamonRewardRemediationEvents",
  "negamonRewardRemediationStudents",
  "negamonRewardRemediationNames",
  "negamonRewardRemediationNicknames",
  "negamonRewardRemediationPins",
  "negamonRewardRemediationEventLabel",
  "negamonRewardRemediationEmpty",
  "negamonRewardEffectivenessTitle",
  "negamonRewardEffectivenessSubtitle",
  "negamonRewardEffectivenessPins",
  "negamonRewardEffectivenessSkips",
  "negamonRewardEffectivenessTouched",
  "negamonRewardEffectivenessFollowUp",
  "negamonRewardEffectivenessGamePinLabel",
  "negamonRewardEffectivenessStudents",
  "negamonRewardEffectivenessRewardEvents",
  "negamonRewardEffectivenessLastReward",
  "negamonRewardEffectivenessLastFix",
  "negamonRewardEffectivenessEmpty",
  "negamonRewardFocusLabel",
  "negamonRewardFocusHint",
  "negamonRewardFocusClear",
  "negamonRewardResyncAction",
  "negamonRewardResyncFailedTitle",
  "negamonRewardResyncFailedDesc",
  "negamonRewardResyncFinishedTitle",
  "negamonRewardResyncFinishedDesc",
  "negamonRewardResyncResultTitle",
  "negamonRewardResyncReason",
  "negamonRewardResyncApplied",
  "negamonRewardResyncSkipped",
  "negamonRewardResyncUnresolved",
  "negamonRewardResyncAppliedRecipients",
  "negamonRewardResyncRemainingSkipped",
  "negamonRewardResyncSource",
  "negamonRewardResyncBehavior",
  "negamonRewardResolvedBadge",
  "negamonRewardUnresolvedBadge",
  "economyResyncPanelClose",
  "economyResyncScoreLabel",
] as const;

const finalThaiSupplementalKeys = [
  "profileEmailPlaceholderExample",
  "boardLinkPlaceholder",
  "boardYoutubePlaceholder",
  "loginAuthErrorRateLimited",
  "omrCvLoadingShort",
  "omrCvLargeFileHint",
  "battlePrepHint",
  "battleErrSessionLimit",
  "analyticsExportCsvButton",
] as const;

const finalLiteralSupplementalKeys = [
  "hostPlayUrlLabel",
  "signupLegalSuffix",
  "economyLedgerBalanceArrow",
] as const;

const appErrorCodes: AppErrorCode[] = [
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "RATE_LIMITED",
  "INVALID_PAYLOAD",
  "REGISTER_EMAIL_ALREADY_EXISTS",
  "REGISTER_USERNAME_TAKEN",
  "REGISTER_VERIFICATION_EMAIL_FAILED",
  "NOT_FOUND",
  "NO_FILE",
  "UNSUPPORTED_FILE_TYPE",
  "FILE_TOO_LARGE",
  "INTERNAL_ERROR",
  "INVALID_BATTLE_LOADOUT",
  "NOT_ENOUGH_GOLD",
  "NEGAMON_NOT_ENABLED",
  "NEGAMON_SELECTION_DISABLED",
  "NEGAMON_INVALID_SPECIES",
  "NEGAMON_PASSIVE_NOT_FOUND",
  "BILLING_NOT_CONFIGURED",
  "BILLING_THAI_NOT_CONFIGURED",
  "BILLING_PROCESSING_FAILED",
  "PLAN_LIMIT_OMR_MONTHLY",
  "PLAN_LIMIT_LIVE_PLAYERS",
  "INVALID_ACCESSIBILITY_SETTINGS",
  "ENDPOINT_NO_LONGER_AVAILABLE",
];

const hasThaiGlyph = (text: string) => /[\u0E00-\u0E7F]/.test(text);

function t(language: Language) {
  return (key: string, params?: Record<string, string | number>) => {
    let text = getTranslationText(language, key);
    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        text = text.replace(`{${paramKey}}`, String(value));
      }
    }
    return text;
  };
}

describe("i18n regression guard", () => {
  it("resolves core login, register, and dashboard keys in English and Thai", () => {
    for (const key of coreUiKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves board, host-play, Negamon, and OMR flow keys in English and Thai", () => {
    for (const key of flowUiKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves battle HUD, action, and result keys in English and Thai", () => {
    for (const key of battleUiKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves battle log and status placeholder keys in English and Thai", () => {
    for (const key of battleLogStatusKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves battle support and reward audit keys in English and Thai", () => {
    for (const key of battleSupportKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves shared utility and accessibility keys in English and Thai", () => {
    for (const key of sharedUtilityKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves admin and billing error keys in English and Thai", () => {
    for (const key of adminBillingKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves classroom assessment validation keys in English and Thai", () => {
    for (const key of classroomAssessmentKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves crypto task and play crypto keys in English and Thai", () => {
    for (const key of cryptoFlowKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves battle loadout and battle shop keys in English and Thai", () => {
    for (const key of battleShopKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves group, quest, recent set, and relative time keys in English and Thai", () => {
    for (const key of groupQuestKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves play socket and quiz plain error keys in English and Thai", () => {
    for (const key of playSocketQuizKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves economy ledger and reconciliation keys in English and Thai", () => {
    for (const key of economyLedgerKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves Negamon reward audit and resync operation keys in English and Thai", () => {
    for (const key of negamonRewardOpsKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves final Thai supplemental cleanup keys in English and Thai", () => {
    for (const key of finalThaiSupplementalKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("resolves final literal supplemental cleanup keys without requiring Thai glyphs", () => {
    for (const key of finalLiteralSupplementalKeys) {
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
    }
  });

  it("keeps shared API error codes localizable in English and Thai", () => {
    for (const code of appErrorCodes) {
      const key = `apiError_${code}`;
      const english = getTranslationText("en", key);
      const thai = getTranslationText("th", key);

      expect(english, `${key} should resolve in English`).not.toBe(key);
      expect(thai, `${key} should resolve in Thai`).not.toBe(key);
      expect(thai, `${key} should contain Thai text`).toSatisfy(hasThaiGlyph);
    }
  });

  it("localizes structured API error bodies instead of showing raw codes or keys", () => {
    expect(
      getLocalizedMessageFromApiErrorBody(
        { error: { code: "BILLING_NOT_CONFIGURED", message: "Billing is not configured" } },
        t("en")
      )
    ).toBe("Billing is not configured right now.");

    const thaiMessage = getLocalizedMessageFromApiErrorBody(
      { error: { code: "BILLING_NOT_CONFIGURED", message: "Billing is not configured" } },
      t("th")
    );

    expect(thaiMessage).not.toBe("apiError_BILLING_NOT_CONFIGURED");
    expect(thaiMessage).not.toBe("Billing is not configured");
    expect(thaiMessage).toSatisfy(hasThaiGlyph);
  });

  it("localizes structured fetch responses for register-style flows", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: "INVALID_PAYLOAD",
          message: "Invalid data",
        },
      }),
      { headers: { "content-type": "application/json" } }
    );

    await expect(
      getLocalizedErrorMessageFromResponse(
        response,
        "registerErrorFailed",
        t("th"),
        "th",
        {
          overrideTranslationKeys: {
            INVALID_PAYLOAD: "registerErrorInvalidPayload",
          },
        }
      )
    ).resolves.toSatisfy(hasThaiGlyph);
  });

  it("localizes board action legacy errors into translation keys", () => {
    const message = formatBoardActionErrorMessage("Post not found", t("th"));

    expect(message).not.toBe("Post not found");
    expect(message).not.toBe("boardErrPostNotFound");
    expect(message).toSatisfy(hasThaiGlyph);
  });

  it("localizes socket legacy errors and direct socket keys", () => {
    const legacyMessage = formatSocketErrorMessage("Game not found", t("th"));
    const directMessage = formatSocketErrorMessage("playSocketInvalidQuestionSet", t("th"));

    expect(legacyMessage).not.toBe("Game not found");
    expect(legacyMessage).not.toBe("playSocketGameNotFound");
    expect(legacyMessage).toSatisfy(hasThaiGlyph);
    expect(directMessage).not.toBe("playSocketInvalidQuestionSet");
    expect(directMessage).toSatisfy(hasThaiGlyph);
  });

  it("uses OMR-specific translation overrides for structured API responses", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: "INVALID_PAYLOAD",
          message: "Invalid OMR payload",
        },
      }),
      { headers: { "content-type": "application/json" } }
    );

    await expect(
      getLocalizedOmrErrorMessageFromResponse(response, "omrCvErrorShort", t("th"), "th")
    ).resolves.toSatisfy(hasThaiGlyph);
  });
});
