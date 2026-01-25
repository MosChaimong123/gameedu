import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { GoldQuestPlayer, ChestReward } from "@/lib/types/game";
import { GoldQuestPlayerView } from "./player-view";
import { useSound } from "@/hooks/use-sound";

type Props = {
    socket: Socket | null;
    player: GoldQuestPlayer;
    otherPlayers: GoldQuestPlayer[];
    onNavigate: (view: string) => void; // Callback to request navigation (e.g. back to question)
}

export function GoldQuestClient({ socket, player, otherPlayers, onNavigate }: Props) {
    const { play } = useSound();

    // Local State for Gold Quest Mode
    const [currentReward, setCurrentReward] = useState<ChestReward | null>(null);
    const [isChestOpen, setIsChestOpen] = useState(false);

    // Socket Listeners specific to Gold Quest
    useEffect(() => {
        if (!socket) return;

        // Chest Result Handlers
        const handleChestResult = (data: { reward: ChestReward, newTotal: number }) => {
            play("chest-open");
            setCurrentReward(data.reward);
            setIsChestOpen(true);
            // newTotal is updated in parent via game-state-update usually, 
            // but we might want to propagate it or rely on parent props updating.
            // Parent handles player state update via "player-gold-update" or "game-state-update".
        };

        const handleInteractionEffect = (data: { source: string; target: string; type: "SWAP" | "STEAL" }) => {
            // Parent handles "being attacked" notification.
            // This component cares if WE are the source? 
            // Actually, parent handles notifications. 
            // This component handles the *Active* interaction (choosing a victim).
        };

        socket.on("chest-result", handleChestResult);

        return () => {
            socket.off("chest-result", handleChestResult);
        }
    }, [socket, play]);

    // Cleanup / Auto-advance
    useEffect(() => {
        if (isChestOpen && currentReward && currentReward.type !== "SWAP" && currentReward.type !== "STEAL") {
            const timer = setTimeout(() => {
                setIsChestOpen(false);
                setCurrentReward(null);
                onNavigate("QUESTION"); // Request return to question loop
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isChestOpen, currentReward, onNavigate]);

    // Handlers
    const handleOpenChest = (index: number) => {
        if (!socket) return;
        const pin = sessionStorage.getItem("game_pin");
        socket.emit("open-chest", { pin, chestIndex: index });
    };

    const handleInteraction = (targetId: string) => {
        if (!socket) return;
        socket.emit("use-interaction", { targetId, type: currentReward?.type });

        setTimeout(() => {
            setIsChestOpen(false);
            setCurrentReward(null);
            onNavigate("QUESTION");
        }, 1000);
    };

    return (
        <GoldQuestPlayerView
            player={player}
            otherPlayers={otherPlayers}
            onOpenChest={handleOpenChest}
            onInteraction={handleInteraction}
            currentReward={currentReward}
            isChestOpen={isChestOpen}
        />
    );
}
