"use strict";
/** Stripe recurring prices: create monthly/yearly PLUS prices in Stripe Dashboard and set env `STRIPE_PRICE_PLUS_MONTHLY` / `STRIPE_PRICE_PLUS_YEARLY`. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLUS_PLANS = void 0;
exports.PLUS_PLANS = [
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
        name: "TeachPlayEdu Plus",
        /** Fallback when Stripe prices are not loaded (misconfigured env). */
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
