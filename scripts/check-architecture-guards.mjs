import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const failures = [];

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return existsSync(path.join(repoRoot, relativePath));
}

function normalize(text) {
  return text.replace(/\r\n/g, "\n");
}

function lineCount(text) {
  return normalize(text).split("\n").length;
}

function fail(message) {
  failures.push(message);
}

function requireFile(relativePath) {
  if (!exists(relativePath)) {
    fail(`Missing architecture guard target: ${relativePath}`);
    return false;
  }
  return true;
}

function requireIncludes(file, needle, reason) {
  if (!requireFile(file)) {
    return;
  }
  const content = read(file);
  if (!content.includes(needle)) {
    fail(`${file} must include ${needle}${reason ? ` (${reason})` : ""}`);
  }
}

function forbidIncludes(file, needle, reason) {
  if (!requireFile(file)) {
    return;
  }
  const content = read(file);
  if (content.includes(needle)) {
    fail(`${file} must not include ${needle}${reason ? ` (${reason})` : ""}`);
  }
}

function requireMaxLines(file, maxLines, reason) {
  if (!requireFile(file)) {
    return;
  }
  const count = lineCount(read(file));
  if (count > maxLines) {
    fail(`${file} has ${count} lines; expected <= ${maxLines}${reason ? ` (${reason})` : ""}`);
  }
}

const requiredServiceFiles = [
  "src/lib/services/lessons/lesson-list.ts",
  "src/lib/services/lessons/ai-generation.ts",
  "src/lib/services/assignments/update-classroom-assignment.ts",
  "src/lib/services/assignments/worksheet-submissions.ts",
  "src/lib/services/student-dashboard/student-notifications.ts",
  "src/lib/services/student-dashboard/submit-topic-assessment-attempt.ts",
  "src/components/classroom/line-submission-review-hint.tsx",
  "src/components/lessons/student-player/student-lesson-player-client.tsx",
  "src/components/lessons/student-player/student-lesson-player.types.ts",
  "src/components/lessons/student-player/student-lesson-player-model.ts",
  "src/components/lessons/student-player/use-student-lesson-data.ts",
  "src/components/lessons/student-player/use-topic-video-progress.ts",
  "src/components/lessons/student-player/lesson-content-panel.tsx",
  "src/components/lessons/student-player/lesson-topic-navigation.tsx",
];

for (const file of requiredServiceFiles) {
  requireFile(file);
}

const thinRouteContracts = [
  {
    file: "src/app/api/lessons/route.ts",
    imports: ["@/lib/services/lessons/lesson-list"],
    forbidden: ["@/lib/db"],
    maxLines: 90,
  },
  {
    file: "src/app/api/classrooms/[id]/assignments/[assignmentId]/route.ts",
    imports: ["@/lib/services/assignments/update-classroom-assignment"],
    forbidden: ["@/lib/db"],
    maxLines: 130,
  },
  {
    file: "src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submit/route.ts",
    imports: ["@/lib/services/assignments/worksheet-submissions"],
    forbidden: ["@/lib/db"],
    maxLines: 70,
  },
  {
    file: "src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/submissions/[submissionId]/route.ts",
    imports: ["@/lib/services/assignments/worksheet-submissions"],
    forbidden: ["@/lib/db"],
    maxLines: 90,
  },
  {
    file: "src/app/api/classrooms/[id]/assignments/[assignmentId]/worksheet/export/route.ts",
    imports: ["@/lib/services/assignments/worksheet-submissions"],
    forbidden: ["@/lib/db"],
    maxLines: 80,
  },
  {
    file: "src/app/api/student/[code]/notifications/route.ts",
    imports: ["@/lib/services/student-dashboard/student-notifications"],
    forbidden: ["@/lib/db"],
    maxLines: 130,
  },
  {
    file: "src/app/api/student/[code]/lessons/[lessonId]/topics/[topicId]/assessment/attempt/route.ts",
    imports: ["@/lib/services/student-dashboard/submit-topic-assessment-attempt"],
    forbidden: ["@/lib/db"],
    maxLines: 70,
  },
];

for (const contract of thinRouteContracts) {
  for (const importPath of contract.imports) {
    requireIncludes(contract.file, importPath, "refactored route must delegate business logic to a service");
  }
  for (const forbidden of contract.forbidden) {
    forbidIncludes(contract.file, forbidden, "refactored route should not own Prisma access directly");
  }
  requireMaxLines(contract.file, contract.maxLines, "refactored route should stay as a thin adapter");
}

const aiLessonRoutes = [
  "src/app/api/ai/lessons/generate-outline/route.ts",
  "src/app/api/ai/lessons/generate-topic-content/route.ts",
  "src/app/api/ai/lessons/generate-assessment/route.ts",
];

for (const file of aiLessonRoutes) {
  requireIncludes(file, "@/lib/services/lessons/ai-generation", "AI lesson routes must share generation/fallback behavior");
}

const classroomTable = "src/components/classroom/classroom-table.tsx";
requireIncludes(
  classroomTable,
  "@/components/classroom/line-submission-review-hint",
  "LINE review hint should remain decomposed from the large table"
);
forbidIncludes(
  classroomTable,
  "function LineSubmissionReviewHint",
  "do not reintroduce the local component into classroom-table"
);
forbidIncludes(
  classroomTable,
  "ParsedLineTextSubmissionContent",
  "the extracted component owns its LINE submission content prop type"
);

const studentLessonPage = "src/app/student/[code]/lessons/[lessonId]/page.tsx";
const studentLessonClient = "src/components/lessons/student-player/student-lesson-player-client.tsx";
const studentLessonContentPanel = "src/components/lessons/student-player/lesson-content-panel.tsx";

requireIncludes(
  studentLessonPage,
  "@/components/lessons/student-player/student-lesson-player-client",
  "student lesson route page must only compose the player client"
);
forbidIncludes(studentLessonPage, "fetch(", "route page must not own client data orchestration");
forbidIncludes(studentLessonPage, "useState", "route page must remain a thin composition boundary");
requireMaxLines(studentLessonPage, 10, "student lesson route page must remain thin");

requireIncludes(
  studentLessonClient,
  "./use-student-lesson-data",
  "student lesson API orchestration belongs in the data hook"
);
requireIncludes(
  studentLessonClient,
  "./use-topic-video-progress",
  "video progress transport belongs in its dedicated hook"
);
requireIncludes(
  studentLessonClient,
  "./lesson-content-panel",
  "lesson content rendering must remain decomposed"
);
requireIncludes(
  studentLessonClient,
  "./lesson-topic-navigation",
  "topic navigation rows must remain presentational"
);
forbidIncludes(studentLessonClient, "fetch(", "player client should consume typed hooks instead of calling APIs");
forbidIncludes(
  studentLessonClient,
  "function topicHasStudentContent",
  "active topic policy belongs to the canonical lesson domain"
);
forbidIncludes(
  studentLessonClient,
  'contentStatus !== "empty"',
  "student visibility must use the canonical active-topic policy"
);
requireMaxLines(studentLessonClient, 1100, "decomposed player client must stay within its line budget");

for (const file of [
  studentLessonContentPanel,
  "src/components/lessons/student-player/lesson-topic-navigation.tsx",
  "src/components/lessons/student-player/student-lesson-player.types.ts",
]) {
  forbidIncludes(file, "fetch(", "presentational student lesson modules must not call APIs");
  forbidIncludes(file, "@prisma/client", "presentational student lesson modules must not depend on Prisma types");
}

requireIncludes("docs/architecture-guards.md", "npm run check:architecture", "docs must explain the guard command");
requireIncludes("docs/README.md", "architecture-guards.md", "docs index must link architecture guards");
requireIncludes("docs/TESTING.md", "npm run check:architecture", "testing guide must list architecture guard command");

if (failures.length > 0) {
  console.error("Architecture guard check failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Architecture guard check passed.");
