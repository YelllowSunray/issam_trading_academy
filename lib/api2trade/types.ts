export type CloudAccountStatus =
  | "active"
  | "error"
  | "disconnected"
  | "pending";

export type CloudAccountRecord = {
  accountId: string;
  uid: string | null;
  email: string;
  login: string;
  server: string | null;
  name: string | null;
  platform: string;
  status: CloudAccountStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  lastTradeCount: number;
  createdAt: string;
  createdBy: string | null;
  source: "seed" | "register" | "map";
};

export type VendorAccount = {
  id: string;
  accountNumber: string | null;
  accountServer: string | null;
  type: string | null;
  name: string | null;
};

export type CloudAccountRow = CloudAccountRecord & {
  displayName: string | null;
  vendorConnected: boolean;
};

export type CloudSyncResult = {
  accountId: string;
  email: string;
  login: string;
  ok: boolean;
  connected: boolean;
  written: number;
  tradeCount: number;
  error: string | null;
};

export type Api2TradeSummary = {
  balance: number | null;
  equity: number | null;
  currency: string | null;
  login: string | null;
  name: string | null;
  server: string | null;
};
