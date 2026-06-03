"use client";

import type { MonsterType } from "@/lib/types/negamon";
import { NEGAMON_ELEMENT_CYCLE_ORDER } from "@/lib/classroom-utils";
import { useLanguage } from "@/components/providers/language-provider";

const TYPE_VISUAL: Record<
    MonsterType,
    { fill: string; stroke: string; text: string; icon: string }
> = {
    GRASS:       { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d", icon: "🌿" },
    WATER:       { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a", icon: "💧" },
    FIRE:        { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d", icon: "🔥" },
    ELECTRICITY: { fill: "#fef9c3", stroke: "#ca8a04", text: "#713f12", icon: "⚡" },
    NORMAL:      { fill: "#f1f5f9", stroke: "#64748b", text: "#334155", icon: "⬜" },
};

function typeLabel(
    t: (key: string, params?: Record<string, string | number>) => string,
    type: MonsterType
): string {
    const key = `monsterType_${type}`;
    const out = t(key);
    return out !== key ? out : type;
}

/** ตัด emoji นำหน้าออก เหลือชื่อธาตุสั้นๆ บนวง */
function typeShortName(raw: string): string {
    const parts = raw.trim().split(/\s+/);
    if (parts.length <= 1) return raw;
    return parts.slice(1).join(" ");
}

function cycleVertices(cx: number, cy: number, r: number, order: MonsterType[]) {
    return order.map((type, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / order.length;
        return {
            type,
            x: cx + r * Math.cos(a),
            y: cy + r * Math.sin(a),
        };
    });
}

function shortenSegment(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    inset: number
) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    return {
        x1: x1 + ux * inset,
        y1: y1 + uy * inset,
        x2: x2 - ux * inset,
        y2: y2 - uy * inset,
    };
}

// วงจร: GRASS → WATER → FIRE → ELECTRICITY → GRASS
const ELEMENT_CYCLE: MonsterType[] = ["GRASS", "WATER", "FIRE", "ELECTRICITY"];

export function NegamonTypeChart() {
    const { t } = useLanguage();

    const vb = 220;
    const cx = vb / 2;
    const cy = vb / 2;
    const r = 68;
    const nodeR = 26;
    const inset = nodeR + 6;
    const verts = cycleVertices(cx, cy, r, ELEMENT_CYCLE);

    return (
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-black tracking-tight text-slate-900">ความสัมพันธ์ธาตุ</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
                ลูกศรชี้ = ชนะทาง ×2 | ถูกชี้ = แพ้ทาง ×0.5
            </p>

            <div className="mt-4 flex flex-col items-center gap-4">
                <figure className="w-full max-w-[min(100%,16rem)]">
                    <svg
                        viewBox={`0 0 ${vb} ${vb}`}
                        className="h-auto w-full overflow-visible drop-shadow-sm"
                        aria-label="วงจรชนะ-แพ้ธาตุ: พืช ชนะ น้ำ ชนะ ไฟ ชนะ ไฟฟ้า ชนะ พืช"
                    >
                        <defs>
                            <marker id="ntype-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                                <path d="M0,0 L8,4 L0,8 Z" fill="#475569" />
                            </marker>
                            <filter id="ntype-shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.14" />
                            </filter>
                        </defs>

                        {/* วงสี่เหลี่ยมจาง */}
                        <polygon
                            points={verts.map((v) => `${v.x},${v.y}`).join(" ")}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />

                        {/* ลูกศรชนะทาง */}
                        {verts.map((v, i) => {
                            const to = verts[(i + 1) % verts.length];
                            const { x1, y1, x2, y2 } = shortenSegment(v.x, v.y, to.x, to.y, inset);
                            const vis = TYPE_VISUAL[v.type];
                            return (
                                <line
                                    key={`arr-${v.type}`}
                                    x1={x1} y1={y1} x2={x2} y2={y2}
                                    stroke={vis.stroke}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    markerEnd="url(#ntype-arrow)"
                                    opacity="0.7"
                                />
                            );
                        })}

                        {/* โหนดธาตุ */}
                        {verts.map((v) => {
                            const vis = TYPE_VISUAL[v.type];
                            const label = typeShortName(typeLabel(t, v.type));
                            return (
                                <g key={v.type} filter="url(#ntype-shadow)">
                                    <circle cx={v.x} cy={v.y} r={nodeR} fill={vis.fill} stroke={vis.stroke} strokeWidth="2.5" />
                                    <text x={v.x} y={v.y - 7} textAnchor="middle" dominantBaseline="central"
                                        style={{ fontSize: 14 }}>{vis.icon}</text>
                                    <text x={v.x} y={v.y + 8} textAnchor="middle" dominantBaseline="central"
                                        className="pointer-events-none select-none font-black"
                                        fill={vis.text}
                                        style={{ fontSize: label.length > 5 ? 8 : 9 }}>
                                        {label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </figure>

                {/* ตารางแสดง matchup */}
                <div className="w-full space-y-2">
                    {ELEMENT_CYCLE.map((type) => {
                        const vis = TYPE_VISUAL[type];
                        const winIdx = (ELEMENT_CYCLE.indexOf(type) + 1) % 4;
                        const loseIdx = (ELEMENT_CYCLE.indexOf(type) + 3) % 4;
                        const wins = ELEMENT_CYCLE[winIdx];
                        const loses = ELEMENT_CYCLE[loseIdx];
                        const winsVis = TYPE_VISUAL[wins];
                        const losesVis = TYPE_VISUAL[loses];
                        const label = typeShortName(typeLabel(t, type));
                        const winsLabel = typeShortName(typeLabel(t, wins));
                        const losesLabel = typeShortName(typeLabel(t, loses));
                        return (
                            <div key={type} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"
                                style={{ borderColor: vis.stroke, backgroundColor: vis.fill }}>
                                <span className="text-base">{vis.icon}</span>
                                <span style={{ color: vis.text }} className="w-16 shrink-0">{label}</span>
                                <span className="text-xs text-slate-500 shrink-0">ชนะ</span>
                                <span className="rounded-md px-1.5 py-0.5 text-xs font-bold border"
                                    style={{ backgroundColor: winsVis.fill, borderColor: winsVis.stroke, color: winsVis.text }}>
                                    {winsVis.icon} {winsLabel}
                                </span>
                                <span className="ml-auto text-xs text-slate-400 shrink-0">แพ้</span>
                                <span className="rounded-md px-1.5 py-0.5 text-xs font-bold border"
                                    style={{ backgroundColor: losesVis.fill, borderColor: losesVis.stroke, color: losesVis.text }}>
                                    {losesVis.icon} {losesLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function TypePill({
    type,
    t,
}: {
    type: MonsterType;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    const vis = TYPE_VISUAL[type];
    const name = typeShortName(typeLabel(t, type));
    return (
        <span
            className="inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-bold shadow-sm"
            style={{
                backgroundColor: vis.fill,
                borderColor: vis.stroke,
                color: vis.text,
            }}
        >
            {name}
        </span>
    );
}
