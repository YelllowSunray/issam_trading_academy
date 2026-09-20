import type { TradeDirection } from "@/lib/journal/types";

export type SignalStatus = "open" | "closed";

export type TradeSignal = {
  id: string;
  instrument: string;
  direction: TradeDirection;
  entry: string;
  sl: string;
  tps: string[];
  thesis: string;
  status: SignalStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

export const SIGNAL_DISCLAIMER =
  "This is not investment advice and not asset management. No guarantee. You execute manually. Past results say nothing about the future.";
