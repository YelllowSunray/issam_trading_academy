import type { TradeDirection } from "@/lib/journal/types";

export type BacktestEntry = {
  id: string;
  date: string;
  instrument: string;
  direction: TradeDirection;
  thesis: string;
  resultR: string;
  notes: string;
  createdAt: string;
};
