/** Serialized PLUS amounts from Stripe Prices (major currency units, e.g. THB baht). */
export type PlusPricesFromStripe = {
    monthlyAmount: number;
    yearlyAmount: number;
    currency: string;
};
