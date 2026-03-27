"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Coins, Star } from "lucide-react";

interface MaterialReward {
  type: string;
  quantity: number;
}

interface BossRewardData {
  bossName: string;
  rewardGold?: number;
  rewardXp?: number;
  rewardMaterials?: MaterialReward[];
}

interface BossRewardModalProps {
  reward: BossRewardData | null;
  onClose: () => void;
}

const MATERIAL_ICONS: Record<string, string> = {
  "Stone Fragment": "🪨", "Wolf Fang": "🦷", "Iron Ore": "⚙️", "Forest Herb": "🌿",
  "Dragon Scale": "🐉", "Shadow Essence": "🌑", "Thunder Crystal": "⚡", "Void Shard": "🌀",
  "Phoenix Feather": "🔥", "Abyssal Core": "💀", "Celestial Dust": "✨", "Ancient Relic": "🏺",
};

export function BossRewardModal({ reward, onClose }: BossRewardModalProps) {
  return (
    <AnimatePresence>
      {reward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 p-6 text-white text-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-5xl mb-2"
              >
                💀
              </motion.div>
              <h2 className="text-xl font-black uppercase tracking-wide">Boss Defeated!</h2>
              <p className="text-sm font-bold opacity-90 mt-1">{reward.bossName}</p>
            </div>

            {/* Close */}
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors">
              <X className="w-4 h-4" />
            </button>

            {/* Rewards */}
            <div className="p-6 space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-4">รางวัลที่ได้รับ</p>

              {(reward.rewardGold ?? 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200"
                >
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Coins className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-600 uppercase">Gold</p>
                    <p className="text-lg font-black text-amber-800">+{reward.rewardGold?.toLocaleString()}</p>
                  </div>
                </motion.div>
              )}

              {(reward.rewardXp ?? 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-200"
                >
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase">XP</p>
                    <p className="text-lg font-black text-indigo-800">+{reward.rewardXp?.toLocaleString()}</p>
                  </div>
                </motion.div>
              )}

              {(reward.rewardMaterials ?? []).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-3 rounded-2xl bg-purple-50 border border-purple-200"
                >
                  <p className="text-[10px] font-black text-purple-600 uppercase mb-2">Materials</p>
                  <div className="flex flex-wrap gap-2">
                    {reward.rewardMaterials!.map((m, i) => (
                      <div key={i} className="flex items-center gap-1 px-2.5 py-1 bg-white rounded-xl border border-purple-200 text-xs font-bold text-purple-700">
                        <span>{MATERIAL_ICONS[m.type] ?? "📦"}</span>
                        <span>{m.type}</span>
                        <span className="font-black">×{m.quantity}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="px-6 pb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black rounded-2xl shadow-lg text-sm"
              >
                <Trophy className="w-4 h-4 inline mr-2" />
                รับรางวัล!
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
