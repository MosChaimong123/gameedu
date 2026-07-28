import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const strict = process.argv.includes("--strict") || process.env.NODE_ENV === "production";
const required = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_CLASSROOM_BINDING_SECRET",
  "LINE_REMINDER_CRON_SECRET",
  "LINE_WEBHOOK_INBOX_SECRET",
  "NEXT_PUBLIC_APP_URL",
];

const issues = [];
for (const key of required) {
  const value = process.env[key]?.trim();
  if (!value) issues.push(`${key}:missing`);
}

const botChatUrlKey = process.env.NEXT_PUBLIC_LINE_BOT_URL?.trim()
  ? "NEXT_PUBLIC_LINE_BOT_URL"
  : process.env.LINE_BOT_CHAT_URL?.trim()
    ? "LINE_BOT_CHAT_URL"
    : undefined;
if (!botChatUrlKey) issues.push("LINE_BOT_CHAT_URL:missing");

for (const key of [
  "LINE_CLASSROOM_BINDING_SECRET",
  "LINE_REMINDER_CRON_SECRET",
  "LINE_WEBHOOK_INBOX_SECRET",
]) {
  const value = process.env[key]?.trim();
  if (value && value.length < 32) issues.push(`${key}:too_short`);
}

for (const key of ["NEXT_PUBLIC_APP_URL", botChatUrlKey].filter(Boolean)) {
  const value = process.env[key]?.trim();
  if (!value) continue;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
      issues.push(`${key}:unsafe_url`);
    }
  } catch {
    issues.push(`${key}:invalid_url`);
  }
}

const pilotIds = process.env.LINE_PILOT_CLASSROOM_IDS?.split(",")
  .map((value) => value.trim())
  .filter(Boolean) ?? [];
if (pilotIds.some((value) => !/^[a-f0-9]{24}$/i.test(value))) {
  issues.push("LINE_PILOT_CLASSROOM_IDS:invalid_object_id");
}

const output = {
  ready: issues.length === 0,
  strict,
  issueCodes: issues,
  rollout: {
    pilotClassroomCount: pilotIds.length,
    groupMutationsEnabled: process.env.LINE_GROUP_MUTATIONS_ENABLED === "true",
    webhookAcceptingEnabled: process.env.LINE_WEBHOOK_ACCEPTING_ENABLED !== "false",
    reminderDeliveryEnabled: process.env.LINE_REMINDER_DELIVERY_ENABLED !== "false",
    directSubmissionsEnabled: process.env.LINE_DIRECT_SUBMISSIONS_ENABLED !== "false",
  },
};

console.log(JSON.stringify(output, null, 2));
if (strict && issues.length > 0) process.exitCode = 1;
