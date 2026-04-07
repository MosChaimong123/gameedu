export type PlanId = "FREE" | "PLUS" | "PRO";

export type PlanColor = "slate" | "indigo" | "emerald";

export type PlusPlanDef = {
    id: PlanId;
    name: string;
    /** Shown as ฿{price} when `priceLabelKey` is unset */
    price: string;
    /** When set, `price` is ignored and this translation key is shown (no ฿ prefix). */
    priceLabelKey?: string;
    unitKey?: string;
    descriptionKey: string;
    featureKeys: readonly string[];
    buttonTextKey: string;
    highlight: boolean;
    color: PlanColor;
};

export const PLUS_PLANS: readonly PlusPlanDef[] = [
    {
        id: "FREE",
        name: "Free",
        price: "0",
        descriptionKey: "planFreeDescription",
        featureKeys: ["planFreeFeat0", "planFreeFeat1", "planFreeFeat2", "planFreeFeat3"],
        buttonTextKey: "planFreeButton",
        highlight: false,
        color: "slate",
    },
    {
        id: "PLUS",
        name: "GameEdu Plus",
        price: "199",
        unitKey: "planPlusUnit",
        descriptionKey: "planPlusDescription",
        featureKeys: [
            "planPlusFeat0",
            "planPlusFeat1",
            "planPlusFeat2",
            "planPlusFeat3",
            "planPlusFeat4",
        ],
        buttonTextKey: "planPlusButton",
        highlight: true,
        color: "indigo",
    },
    {
        id: "PRO",
        name: "School Pro",
        price: "",
        priceLabelKey: "planProContactPrice",
        descriptionKey: "planProDescription",
        featureKeys: [
            "planProFeat0",
            "planProFeat1",
            "planProFeat2",
            "planProFeat3",
            "planProFeat4",
        ],
        buttonTextKey: "planProButton",
        highlight: false,
        color: "emerald",
    },
];
