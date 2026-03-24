"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BattleCharacter } from "@/components/battle/BattleCharacter";
import { BattleEffectsLayer } from "@/components/battle/BattleEffectsLayer";
import { BattleQuestionPanel } from "@/components/battle/BattleQuestionPanel";
import { BattleStage } from "@/components/battle/BattleStage";
import { DamagePopupLayer } from "@/components/battle/DamagePopupLayer";
import { useBattleAnimation } from "@/components/battle/use-battle-animation";
import type { BattleAnimationEvent } from "@/lib/game/battle-events";
import {
  getVisibleSkillIds,
  resolveSoloFarmingResources,
} from "@/lib/game/battle-ui-helpers";
import type { BattlePlayer, SoloMonster } from "@/lib/types/game";

interface SoloFarmingViewProps {
  farmingState: {
    wave: number;
    monster: SoloMonster;
    ap: number;
    stamina?: number;
    maxStamina?: number;
    mp: number;
  } | null;
  myPlayer: BattlePlayer;
  currentQuestion: { id: string; question: string; options: string[]; image?: string } | null;
  feedback: { correct: boolean } | null;
  attackFeed: string[];
  battleEvents: BattleAnimationEvent[];
  reducedMotion?: boolean;
  onAnswer: (index: number) => void;
  onSkill: (skillId: string) => void;
}

export function SoloFarmingView({
  farmingState,
  myPlayer,
  currentQuestion,
  feedback,
  attackFeed,
  battleEvents,
  reducedMotion = false,
  onAnswer,
  onSkill,
}: SoloFarmingViewProps) {
  const monster = farmingState?.monster ?? myPlayer.soloMonster;
  const wave = farmingState?.wave ?? myPlayer.wave;
  const { stamina, maxStamina, mp, maxMp } = resolveSoloFarmingResources(farmingState, myPlayer);

  const monsterHpPct = monster ? Math.max(0, (monster.hp / monster.maxHp) * 100) : 0;
  const staminaPct = Math.max(0, (stamina / maxStamina) * 100);
  const mpPct = Math.max(0, (mp / maxMp) * 100);
  const visibleSkills = getVisibleSkillIds(myPlayer.skills, 4);
  const recentFeed = attackFeed.slice(0, 4);

  const animation = useBattleAnimation({
    events: battleEvents,
    playerId: myPlayer.id,
    enemyId: "solo-monster",
    reducedMotion,
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_24%),linear-gradient(180deg,#031525,#0f172a)] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="rounded-[32px] border border-emerald-300/10 bg-slate-950/55 p-5 shadow-[0_32px_90px_-42px_rgba(16,185,129,0.42)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/55">Solo Farming</p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">สนามเก็บเลเวล</h1>
              <p className="mt-2 text-sm text-slate-300">ตอบคำถาม ใช้สกิล และรักษาจังหวะฟาร์มเพื่อผ่าน wave ให้ไกลที่สุด</p>
            </div>

            <div className="w-full max-w-xl">
              <div className="mb-2 flex items-center gap-3">
                <Badge className="rounded-full bg-emerald-500/15 px-4 py-1 text-sm font-bold text-emerald-200">
                  Wave {wave}
                </Badge>
                {monster ? <span className="font-bold text-emerald-100">{monster.name}</span> : null}
                {monster ? (
                  <span className="ml-auto text-sm text-slate-300">
                    {monster.hp} / {monster.maxHp} HP
                  </span>
                ) : null}
              </div>
              <Progress value={monsterHpPct} className="h-4 bg-slate-800 [&>div]:bg-[linear-gradient(90deg,#34d399,#14b8a6)]" />
            </div>
          </div>
        </div>

        <BattleStage variant="farming" shakeKey={animation.shakeKey} banner={animation.banner} reducedMotion={reducedMotion}>
          <BattleEffectsLayer activeFx={animation.activeFx} reducedMotion={reducedMotion} />
          <DamagePopupLayer popups={animation.popups} reducedMotion={reducedMotion} />

          <div className="grid min-h-[460px] items-center gap-5 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:px-8">
            <BattleCharacter
              name={myPlayer.name}
              subtitle="Player"
              hpText={`${myPlayer.hp.toLocaleString()} / ${myPlayer.maxHp.toLocaleString()}`}
              resourceText={`${stamina.toLocaleString()} / ${maxStamina.toLocaleString()} Stamina`}
              side="left"
              pose={animation.playerPose}
              statusEffects={animation.playerStatuses}
              reducedMotion={reducedMotion}
              variant="player"
              accent="emerald"
            />

            <div className="flex flex-col items-center justify-center gap-5">
              {animation.activeSkillLabel ? (
                <motion.div
                  initial={{ opacity: 0, y: -18, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="rounded-full border border-violet-300/30 bg-violet-500/20 px-5 py-2 text-sm font-black text-violet-100 shadow-[0_16px_40px_-26px_rgba(139,92,246,0.9)]"
                >
                  {animation.activeSkillLabel}
                </motion.div>
              ) : null}

              <BattleQuestionPanel
                question={currentQuestion}
                feedback={feedback}
                onAnswer={onAnswer}
                accent="farming"
                reducedMotion={reducedMotion}
              />
            </div>

            <BattleCharacter
              name={monster?.name || "Monster"}
              subtitle={`Wave ${wave}`}
              hpText={monster ? `${monster.hp.toLocaleString()} / ${monster.maxHp.toLocaleString()}` : "-"}
              side="right"
              pose={animation.enemyPose}
              statusEffects={animation.enemyStatuses}
              reducedMotion={reducedMotion}
              variant="enemy"
              accent="amber"
            />
          </div>
        </BattleStage>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[30px] border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Combat Feed</p>
                <h2 className="mt-2 text-xl font-black">เหตุการณ์ล่าสุด</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">MP</p>
                <p className="mt-2 text-lg font-black text-sky-300">{mp}/{maxMp}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {recentFeed.length > 0 ? (
                recentFeed.map((message, index) => (
                  <motion.div
                    key={`${message}-${index}`}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`rounded-[22px] border px-4 py-3 text-sm ${
                      index === 0
                        ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-slate-200"
                    }`}
                  >
                    {message}
                  </motion.div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
                  เมื่อมีการโจมตี สังหารศัตรู หรือเปลี่ยน wave รายการจะขึ้นที่นี่
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>Stamina</span>
                  <span>{stamina}/{maxStamina}</span>
                </div>
                <Progress value={staminaPct} className="h-2 bg-white/10 [&>div]:bg-amber-400" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>MP</span>
                  <span>{mp}/{maxMp}</span>
                </div>
                <Progress value={mpPct} className="h-2 bg-white/10 [&>div]:bg-sky-400" />
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Skill Palette</p>
            <h2 className="mt-2 text-xl font-black">ท่าต่อสู้ของตัวละคร</h2>

            <div className="mt-5 grid gap-3">
              {visibleSkills.map((skillId) => (
                <Button
                  key={skillId}
                  variant="outline"
                  className="h-14 justify-start rounded-2xl border-violet-300/30 bg-violet-500/10 px-5 text-left text-base font-bold text-violet-100 hover:bg-violet-500/20"
                  onClick={() => onSkill(skillId)}
                >
                  {skillId}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
