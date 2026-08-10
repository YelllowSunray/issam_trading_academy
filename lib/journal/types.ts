export type TradeDirection = "Long" | "Short";
export type TradeSource = "manual" | "mt5";

export type Mt5Trade = {
  id: string;
  date: string;
  instrument: string;
  direction: TradeDirection;
  entry: number | null;
  exit: number | null;
  sl: number | null;
  volume?: number | null;
  profitEur?: number | null;
  entryTime?: number | null;
  exitTime?: number | null;
  commission?: number | null;
  swap?: number | null;
  login?: number | string | null;
};

export type ManualTrade = {
  id: string;
  date: string;
  instrument: string;
  direction: TradeDirection;
  entry: string | number;
  sl: string | number;
  exit: string | number;
  riskEur: string | number | null;
  tags: string[];
  notes: string;
  imageUrl: string | null;
  createdAt?: string;
};

export type TradeAnnotation = {
  tags: string[];
  notes: string;
  imageUrl: string | null;
};

export type UnifiedTrade = {
  id: string;
  source: TradeSource;
  date: string;
  instrument: string;
  direction: TradeDirection;
  entry: string | number | null;
  sl: string | number | null;
  exit: string | number | null;
  riskEur: string | number | null;
  volume?: number | null;
  entryTime?: number | null;
  exitTime?: number | null;
  commission?: number | null;
  swap?: number | null;
  login?: number | string | null;
  tags: string[];
  notes: string;
  imageUrl: string | null;
  _mt5Profit?: number | null;
  r?: number | null;
  eur?: number | null;
};

export type Mt5AccountSummary = {
  login: string;
  balance: number | null;
  equity: number | null;
  currency: string | null;
  connected: boolean;
  trade_count: number;
  last_heartbeat: string | null;
};

export type Mt5Status = {
  connected: boolean;
  account: {
    login?: number | string;
    balance?: number;
    equity?: number;
    currency?: string;
  } | null;
  trade_count: number;
  last_sync: string | null;
  last_heartbeat: string | null;
  error?: string | null;
};

export type AppSettings = {
  selectedLogin: string | null;
};

export type SessionDef = {
  name: string;
  start: number;
  end: number;
  color: string;
};
