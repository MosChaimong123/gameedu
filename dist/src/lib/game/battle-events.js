"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBattleEvent = createBattleEvent;
function createBattleEvent(event) {
    return {
        ...event,
        id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
    };
}
