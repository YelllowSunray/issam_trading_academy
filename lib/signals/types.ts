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
  "Dit is geen beleggingsadvies en geen vermogensbeheer. Geen garantie. Je voert zelf handmatig uit. Verleden resultaten zeggen niets over de toekomst.";
