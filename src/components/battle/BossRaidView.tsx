"use client";

import { motion } from "framer-motion";
import { Shield, Sword, WandSparkles } from "lucide-react";

import { BattleCharacter } from "@/components/battle/BattleCharacter";
import { BattleEffectsLayer } from "@/components/battle/BattleEffectsLayer";
import { BattleQuestionPanel } from "@/components/battle/BattleQuestionPanel";
import { BattleStage } from "@/components/battle/BattleStage";
import { DamagePopupLayer } from "@/components/battle/DamagePopupLayer";
import { useBattleAnimation } from "@/components/battle/use-battle-animation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BattleAnimationEvent } from "@/lib/game/battle-events";
import {
  getVisibleSkillIds,
  resolveBattleMaxStamina,
  resolveBattleStamina,
} from "@/lib/game/battle-ui-helpers";
import { cn } from "@/lib/utils";
import type { BattlePlayer, BossState } from "@/lib/types/game";

interface BossRaidViewProps {
  boss: BossState;
  players: BattlePlayer[];
  myPlayer: BattlePlayer;
  currentQuestion: { id: string; question: string; options: string[]; image?: string } | null;
  feedback: { correct: boolean } | null;
  battleEvents: BattleAnimationEvent[];
  onAnswer: (index: number) => void;
  onAction: (type: "ATTACK" | "DEFEND" | "SKILL", skillId?: string) => void;
}

export function BossRaidView({
  boss,
  players,
  myPlayer,
  currentQuestion,
  feedback,
  battleEvents,
  onAnswer,
  onAction,
}: BossRaidViewProps) {
  const bossHpPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
  const currentStamina = resolveBattleStamina(myPlayer);
  const maxStamina = resolveBattleMaxStamina(myPlayer);
  const staminaPct = Math.max(0, (currentStamina / maxStamina) * 100);
  const visibleSkills = getVisibleSkillIds(myPlayer.skills, 3);

  const animation = useBattleAnimation({
    events: battleEvents,
    playerId: myPlayer.id,
    enemyId: "boss",
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.16),transparent_26%),linear-gradient(180deg,#020617,#0f172a)] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="rounded-[32px] border border-rose-300/10 bg-slate-950/55 p-5 shadow-[0_32px_90px_-42px_rgba(244,63,94,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-200/55">Co-op Boss Raid</p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{boss.name}</h1>
              <p className="mt-2 text-sm text-slate-300">ประสานทีม ตอบคำถาม และเร่งจังหวะโจมตีเพื่อปิดบอสให้เร็วที่สุด</p>
            </div>

            <div className="w-full max-w-xl">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>Boss HP</span>
                <span>{boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()}</span>
              </div>
              <Progress value={bossHpPct} className="h-4 bg-slate-800 [&>div]:bg-[linear-gradient(90deg,#fb7185,#f97316)]" />
            </div>
          </div>
        </div>

        <BattleStage variant="boss" shakeKey={animation.shakeKey} banner={animation.banner}>
          <BattleEffectsLayer activeFx={animation.activeFx} />
          <DamagePopupLayer popups={animation.popups} />

          <div className="grid min-h-[460px] items-center gap-5 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:px-8">
            <BattleCharacter
              name={myPlayer.name}
              subtitle="Hero"
              hpText={`${myPlayer.hp.toLocaleString()} / ${myPlayer.maxHp.toLocaleString()}`}
              resourceText={`${currentStamina.toLocaleString()} / ${maxStamina.toLocaleString()} Stamina`}
              side="left"
              pose={animation.playerPose}
              statusEffects={animation.playerStatuses}
              variant="player"
              accent="indigo"
            />

            <div className="relative flex flex-col items-center justify-center gap-5">
              {animation.feedbackSplash ? (
                <motion.div
                  initial={{ opacity: 0, y: -18, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "rounded-full border px-5 py-2 text-sm font-black shadow-[0_18px_45px_-28px_rgba(15,23,42,0.9)]",
                    animation.feedbackSplash.tone === "success"
                      ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-200"
                      : "border-rose-300/30 bg-rose-500/20 text-rose-200"
                  )}
                >
                  {animation.feedbackSplash.label}
                </motion.div>
              ) : null}

              <BattleQuestionPanel
                question={currentQuestion}
                feedback={feedback}
                onAnswer={onAnswer}
                accent="boss"
              />
            </div>

            <BattleCharacter
              name={boss.name}
              subtitle="World Boss"
              hpText={`${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()}`}
              side="right"
              pose={animation.enemyPose}
              statusEffects={animation.enemyStatuses}
              variant="enemy"
              accent="rose"
            />
          </div>
        </BattleStage>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[30px] border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Team Status</p>
                <h2 className="mt-2 text-xl font-black">แนวรบของทีม</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Stamina</p>
                <p className="mt-2 text-lg font-black text-amber-300">{currentStamina}/{maxStamina}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {players.map((player) => {
                const isMe = player.id === myPlayer.id;
                const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "rounded-[24px] border p-4",
                      isMe ? "border-indigo-300/30 bg-indigo-500/10" : "border-white/10 bg-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold">{isMe ? "คุณ" : player.name}</p>
                      <p className="text-xs text-white/45">Lv.{player.level}</p>
                    </div>
                    <Progress value={hpPct} className="mt-3 h-2 bg-white/10 [&>div]:bg-emerald-400" />
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                      <span>HP</span>
                      <span>{player.hp}/{player.maxHp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Action Deck</p>
            <h2 className="mt-2 text-xl font-black">เลือกจังหวะต่อสู้</h2>

            <div className="mt-5 space-y-3">
              <Button
                className="h-14 w-full justify-start rounded-2xl bg-[linear-gradient(90deg,#f97316,#ef4444)] px-5 text-left text-base font-bold hover:opacity-95"
                disabled={currentStamina < 10}
                onClick={() => onAction("ATTACK")}
              >
                <Sword className="mr-3 h-5 w-5" />
                โจมตีหนัก (10 Stamina)
              </Button>

              <Button
                variant="outline"
                className="h-14 w-full justify-start rounded-2xl border-sky-300/30 bg-sky-500/10 px-5 text-left text-base font-bold text-sky-100 hover:bg-sky-500/20"
                onClick={() => onAction("DEFEND")}
              >
                <Shield className="mr-3 h-5 w-5" />
                ป้องกันและลดความเสียหาย
              </Button>

              {visibleSkills.map((skillId) => (
                <Button
                  key={skillId}
                  variant="outline"
                  className="h-14 w-full justify-start rounded-2xl border-violet-300/30 bg-violet-500/10 px-5 text-left text-base font-bold text-violet-100 hover:bg-violet-500/20"
                  onClick={() => onAction("SKILL", skillId)}
                >
                  <WandSparkles className="mr-3 h-5 w-5" />
                  {skillId}
                </Button>
              ))}
            </div>

            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                <span>Stamina</span>
                <span>{currentStamina}/{maxStamina}</span>
              </div>
              <Progress value={staminaPct} className="h-2 bg-white/10 [&>div]:bg-amber-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
