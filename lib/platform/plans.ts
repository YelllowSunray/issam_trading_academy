export const VIP_PUBLIC_CHANNEL = "https://t.me/tradingacadamyy";

export const VIP_PERKS = [
  "Calls & setups",
  "Full analyses (entry, SL, TP)",
  "Group calls",
  "VIP Telegram group",
  "Academy + certificates",
  "MT5 journal & P&L",
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
    label: "1 month",
    priceLabel: "€100",
    cadence: "/ month",
  },
  {
    id: "quarterly",
    label: "3 months",
    priceLabel: "€250",
    cadence: "/ 3 months",
    highlight: true,
  },
  {
    id: "semiannual",
    label: "6 months",
    priceLabel: "€500",
    cadence: "/ 6 months",
  },
  {
    id: "yearly",
    label: "1 year",
    priceLabel: "€1000",
    cadence: "/ year",
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
