import { db } from "@/lib/db";
import { NegamonBattleV4QaClient } from "@/components/negamon/NegamonBattleV4QaClient";
import { startNegamonBattleV4 } from "@/lib/game-negamon/server/battle-v4";

const DEFAULTS = {
  classId: "6a12ee29a5e71c6c01a33947",
  challengerCode: "WUQADJEJY72J",
  defenderCode: "7FUM5RLTLA4C",
};

export default async function NegamonBattleV4QaPage() {
  const [challenger, defender] = await Promise.all([
    db.student.findFirst({
      where: { classId: DEFAULTS.classId, loginCode: DEFAULTS.challengerCode },
      select: { id: true, name: true },
    }),
    db.student.findFirst({
      where: { classId: DEFAULTS.classId, loginCode: DEFAULTS.defenderCode },
      select: { id: true, name: true },
    }),
  ]);

  if (!challenger || !defender) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h1 className="text-lg font-black text-amber-900">Negamon Battle V4 QA Harness</h1>
          <p className="mt-2 text-sm font-bold text-amber-700">
            Could not resolve the local QA students for battle testing.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-medium text-amber-700">
            <li>Classroom: {DEFAULTS.classId}</li>
            <li>Challenger code: {DEFAULTS.challengerCode}</li>
            <li>Defender code: {DEFAULTS.defenderCode}</li>
          </ul>
        </div>
      </div>
    );
  }

  const initialStart = await startNegamonBattleV4({
    classId: DEFAULTS.classId,
    challengerId: challenger.id,
    defenderId: defender.id,
    studentCode: DEFAULTS.challengerCode,
    seed: 3939001,
  });

  return (
    <NegamonBattleV4QaClient
      classId={DEFAULTS.classId}
      challengerId={challenger.id}
      defenderId={defender.id}
      studentCode={DEFAULTS.challengerCode}
      initialStart={initialStart.body}
    />
  );
}
