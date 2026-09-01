export const VIP_PUBLIC_CHANNEL = "https://t.me/tradingacadamyy";

export const VIP_PERKS = [
  "Calls & setups",
  "Uitgebreide analyses (entry, SL, TP)",
  "Group calls",
  "VIP Telegram-groep",
  "Academy + certificaten",
  "MT5-journal & P&L",
];

export type VipPlanId = "monthly" | "quarterly" | "semiannual" | "yearly";

export type VipPlan = {
  id: VipPlanId;
  label: string;
  priceLabel: string;
  cadence: string;
  highlight?: boolean;
};

export const VIP_PLANS: VipPlan[] = [
  {
    id: "monthly",
    label: "1 maand",
    priceLabel: "€100",
    cadence: "/ maand",
  },
  {
    id: "quarterly",
    label: "3 maanden",
    priceLabel: "€250",
    cadence: "/ 3 maanden",
    highlight: true,
  },
  {
    id: "semiannual",
    label: "6 maanden",
    priceLabel: "€500",
    cadence: "/ 6 maanden",
  },
  {
    id: "yearly",
    label: "1 jaar",
    priceLabel: "€1000",
    cadence: "/ jaar",
  },
];

export function isVipPlanId(value: unknown): value is VipPlanId {
  return (
    value === "monthly" ||
    value === "quarterly" ||
    value === "semiannual" ||
    value === "yearly"
  );
}
