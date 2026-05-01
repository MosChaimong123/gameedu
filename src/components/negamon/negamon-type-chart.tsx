"use client";

import type { MonsterType } from "@/lib/types/negamon";
import { NEGAMON_ELEMENT_CYCLE_ORDER } from "@/lib/classroom-utils";
import { useLanguage } from "@/components/providers/language-provider";

const TYPE_VISUAL: Record<
    MonsterType,
    { fill: string; stroke: string; text: string }
> = {
    WATER: { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" },
    FIRE: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
    WIND: { fill: "#e0f2fe", stroke: "#0284c7", text: "#0c4a6e" },
    EARTH: { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
    THUNDER: { fill: "#fef9c3", stroke: "#ca8a04", text: "#713f12" },
    LIGHT: { fill: "#fef9c3", stroke: "#eab308", text: "#713f12" },
    DARK: { fill: "#ede9fe", stroke: "#7c3aed", text: "#4c1d95" },
    NORMAL: { fill: "#f1f5f9", stroke: "#64748b", text: "#334155" },
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

export function NegamonTypeChart() {
    const { t } = useLanguage();

    const vb = 220;
    const cx = vb / 2;
    const cy = vb / 2 - 4;
    const r = 72;
    const nodeR = 24;
    const inset = nodeR + 5;
    const cycle = NEGAMON_ELEMENT_CYCLE_ORDER;
    const verts = cycleVertices(cx, cy, r, cycle);

    const ariaCycle = cycle.map((type, i) => {
        const next = cycle[(i + 1) % cycle.length];
        return `${typeLabel(t, type)} ${t("negamonInfoTypeChartSuperRow")} ${typeLabel(t, next)}`;
    }).join(". ");

    return (
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-black tracking-tight text-slate-900">{t("negamonInfoTypeChartTitle")}</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">{t("negamonInfoTypeChartIntro")}</p>

            <div className="mt-5 flex flex-col items-center gap-4">
                <figure className="w-full max-w-[min(100%,18rem)]">
                    <svg
                        viewBox={`0 0 ${vb} ${vb}`}
                        className="h-auto w-full overflow-visible drop-shadow-sm"
                        role="img"
                        aria-label={ariaCycle}
                    >
                        <defs>
                            <marker
                                id="negamon-type-cycle-arrow"
                                markerWidth="8"
                                markerHeight="8"
                                refX="7"
                                refY="4"
                                orient="auto"
                                markerUnits="strokeWidth"
                            >
                                <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
                            </marker>
                            <filter id="negamon-type-node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
                            </filter>
                        </defs>

                        {/* เส้นเชื่อมจาง (pentagon) */}
                        <polygon
                            points={verts.map((v) => `${v.x},${v.y}`).join(" ")}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />

                        {verts.map((v, i) => {
                            const to = verts[(i + 1) % verts.length];
                            const { x1, y1, x2, y2 } = shortenSegment(v.x, v.y, to.x, to.y, inset);
                            return (
                                <line
                                    key={`arr-${v.type}`}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="#64748b"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    markerEnd="url(#negamon-type-cycle-arrow)"
                                />
                            );
                        })}

                        {verts.map((v) => {
                            const vis = TYPE_VISUAL[v.type];
                            const label = typeShortName(typeLabel(t, v.type));
                            return (
                                <g key={v.type} filter="url(#negamon-type-node-shadow)">
                                    <circle
                                        cx={v.x}
                                        cy={v.y}
                                        r={nodeR}
                                        fill={vis.fill}
                                        stroke={vis.stroke}
                                        strokeWidth="2.25"
                                    />
                                    <text
                                        x={v.x}
                                        y={v.y}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className="pointer-events-none select-none font-black tracking-tight"
                                        fill={vis.text}
                                        style={{
                                            fontSize: label.length > 7 ? 9 : label.length > 5 ? 10 : 11,
                                        }}
                                    >
                                        {label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                    <figcaption className="mt-2 text-center text-xs font-medium text-slate-500">
                        {t("negamonInfoTypeChartWheelCaption")}
                    </figcaption>
                </figure>

                <div className="w-full max-w-md space-y-3 rounded-xl border border-slate-100 bg-white/90 p-3 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        {t("negamonInfoTypeChartLightDarkTitle")}
                    </p>
                    <ul className="space-y-2 text-sm font-semibold leading-snug text-slate-700">
                        <li className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <TypePill type="LIGHT" t={t} />
                                <span className="text-slate-400">→</span>
                                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                                    ×2
                                </span>
                                <span className="text-slate-400">→</span>
                                <TypePill type="DARK" t={t} />
                            </div>
                            <p className="text-xs font-medium text-slate-500">
                                {t("negamonInfoTypeChartLightBeatsDark")}
                            </p>
                        </li>
                        <li>{t("negamonInfoTypeChartDarkBeatsFive")}</li>
                        <li>{t("negamonInfoTypeChartFiveBeatsLight")}</li>
                    </ul>
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
