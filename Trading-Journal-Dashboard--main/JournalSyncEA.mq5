//+------------------------------------------------------------------+
//| JournalSyncEA.mq5  (v3 — multi-account + rijkere trade-data)       |
//| Stuurt gesloten trades + een heartbeat naar de lokale               |
//| Trading Journal bridge (Mt5ServerBridgeMac.py), zodat               |
//| Trading-Journal-PnL.html automatisch synct.                         |
//|                                                                      |
//| Nieuw in v3: elke trade/heartbeat wordt getagged met het account-   |
//| inlognummer (voor meerdere accounts), en bevat nu ook open-tijd,    |
//| commissie en swap los van elkaar (niet alleen het nettoresultaat).  |
//|                                                                      |
//| Werkt op elke MT5-terminal (Windows, of MT5 voor Mac) omdat dit     |
//| script binnen MT5 zelf draait -- geen Windows-only Python nodig.    |
//|                                                                      |
//| Installatie:                                                        |
//|   1. Kopieer dit bestand naar MQL5/Experts/ (via MetaEditor:        |
//|      File > Open Data Folder > MQL5 > Experts)                      |
//|   2. Open het in MetaEditor en compileer (F7)                       |
//|   3. Zet in MT5: Extra/Tools > Opties > Expert Advisors >           |
//|      "Sta WebRequest toe voor de genoemde URL's" AAN, en voeg toe:  |
//|          http://127.0.0.1:8765                                     |
//|   4. Sleep JournalSyncEA op een willekeurige chart, zet              |
//|      AutoTrading/"Live handelen toestaan" aan                       |
//|   5. Start Mt5ServerBridgeMac.py op dezelfde Mac/pc                 |
//|                                                                      |
//| Meerdere accounts: installeer dezelfde EA op meerdere terminals     |
//| (of laat 'm los draaien per account als je meerdere MT5-instanties  |
//| open hebt) -- ze wijzen allemaal naar dezelfde bridge-URL en        |
//| worden automatisch per account-login uit elkaar gehouden.           |
//+------------------------------------------------------------------+
#property copyright "TradingAcadamy"
#property strict

input string TradeURL     = "http://127.0.0.1:8765/api/mt5-trade";
input string HeartbeatURL = "http://127.0.0.1:8765/api/heartbeat";
input datetime BackfillFrom = D'2026.01.01 00:00:00';
input int HeartbeatSeconds = 30;

bool backfillDone = false;

//+------------------------------------------------------------------+
int OnInit(){
   backfillDone = false;
   EventSetTimer(3);   // eerste tick snel: heartbeat + backfill
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason){
   EventKillTimer();
}

void OnTimer(){
   SendHeartbeat();
   if(!backfillDone){
      BackfillHistory();
      backfillDone = true;
      EventSetTimer(HeartbeatSeconds); // daarna alleen nog periodieke heartbeat
   }
}

//+------------------------------------------------------------------+
//| Live: elke keer dat een positie sluit, direct doorsturen            |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                         const MqlTradeRequest &request,
                         const MqlTradeResult &result){
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD){
      ulong dealTicket = trans.deal;
      if(HistorySelect(BackfillFrom, TimeCurrent()) && HistoryDealSelect(dealTicket)){
         long entry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY){
            long posId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
            SendPositionTrade(posId);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Eenmalig bij opstarten: alle al gesloten trades sinds BackfillFrom   |
//+------------------------------------------------------------------+
void BackfillHistory(){
   if(!HistorySelect(BackfillFrom, TimeCurrent())) return;
   int total = HistoryDealsTotal();
   long seen[];
   for(int i=0; i<total; i++){
      ulong ticket = HistoryDealGetTicket(i);
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry==DEAL_ENTRY_OUT || entry==DEAL_ENTRY_OUT_BY){
         long posId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
         bool already=false;
         for(int j=0; j<ArraySize(seen); j++){ if(seen[j]==posId){ already=true; break; } }
         if(!already){
            int n = ArraySize(seen);
            ArrayResize(seen, n+1);
            seen[n]=posId;
            SendPositionTrade(posId);
         }
      }
   }
   Print("JournalSyncEA: backfill klaar, ", ArraySize(seen), " trade(s) verstuurd.");
}

//+------------------------------------------------------------------+
//| Verzamelt alle deals van een positie en stuurt 1 samengevoegde      |
//| trade naar de bridge (ondersteunt partial closes).                   |
//+------------------------------------------------------------------+
void SendPositionTrade(long posId){
   if(!HistorySelect(BackfillFrom, TimeCurrent())) return;

   double entryPrice=0, exitPrice=0, inVol=0, outVol=0;
   double profit=0, swap=0, commission=0;
   datetime entryTime=0, exitTime=0;
   string symbol="";
   long dirType=-1;

   int total = HistoryDealsTotal();
   for(int i=0; i<total; i++){
      ulong ticket = HistoryDealGetTicket(i);
      if((long)HistoryDealGetInteger(ticket, DEAL_POSITION_ID) != posId) continue;

      long dtype = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(dtype != DEAL_TYPE_BUY && dtype != DEAL_TYPE_SELL) continue;

      long dentry   = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      double price  = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double vol    = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      profit       += HistoryDealGetDouble(ticket, DEAL_PROFIT);
      swap         += HistoryDealGetDouble(ticket, DEAL_SWAP);
      commission   += HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      symbol        = HistoryDealGetString(ticket, DEAL_SYMBOL);

      if(dentry==DEAL_ENTRY_IN || dentry==DEAL_ENTRY_INOUT){
         double newVol = inVol + vol;
         entryPrice = (newVol>0) ? (entryPrice*inVol + price*vol) / newVol : price;
         inVol = newVol;
         dirType = dtype;
         datetime t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         if(entryTime==0 || t<entryTime) entryTime = t;
      } else if(dentry==DEAL_ENTRY_OUT || dentry==DEAL_ENTRY_OUT_BY){
         double newVol = outVol + vol;
         exitPrice = (newVol>0) ? (exitPrice*outVol + price*vol) / newVol : price;
         outVol = newVol;
         datetime t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         if(t > exitTime) exitTime = t;
      }
   }

   if(inVol<=0 || outVol<=0) return; // positie nog niet (volledig) gesloten

   string direction = (dirType==DEAL_TYPE_BUY) ? "Long" : "Short";

   // Best-effort: SL van de order die de positie opende
   double sl = 0;
   if(HistorySelectByPosition(posId)){
      int ordersTotal = HistoryOrdersTotal();
      for(int k=0; k<ordersTotal; k++){
         ulong oticket = HistoryOrderGetTicket(k);
         long otype = HistoryOrderGetInteger(oticket, ORDER_TYPE);
         if(otype==ORDER_TYPE_BUY || otype==ORDER_TYPE_SELL){
            sl = HistoryOrderGetDouble(oticket, ORDER_SL);
            break;
         }
      }
   }
   HistorySelect(BackfillFrom, TimeCurrent()); // herstel volledige selectie

   MqlDateTime dt;
   TimeToStruct(exitTime, dt);
   string dateStr = StringFormat("%04d-%02d-%02d", dt.year, dt.mon, dt.day);
   long login = (long)AccountInfoInteger(ACCOUNT_LOGIN);

   string json = "{";
   json += "\"id\":\"mt5-" + IntegerToString(login) + "-" + IntegerToString((long)posId) + "\",";
   json += "\"login\":" + IntegerToString(login) + ",";
   json += "\"date\":\"" + dateStr + "\",";
   json += "\"instrument\":\"" + symbol + "\",";
   json += "\"direction\":\"" + direction + "\",";
   json += "\"entry\":" + DoubleToString(entryPrice, 5) + ",";
   json += "\"exit\":" + DoubleToString(exitPrice, 5) + ",";
   json += "\"sl\":" + (sl>0 ? DoubleToString(sl,5) : "null") + ",";
   json += "\"volume\":" + DoubleToString(inVol, 2) + ",";
   json += "\"entryTime\":" + IntegerToString((long)entryTime) + ",";
   json += "\"exitTime\":" + IntegerToString((long)exitTime) + ",";
   json += "\"commission\":" + DoubleToString(commission, 2) + ",";
   json += "\"swap\":" + DoubleToString(swap, 2) + ",";
   json += "\"profitEur\":" + DoubleToString(profit+swap+commission, 2);
   json += "}";

   PostJson(TradeURL, json);
}

//+------------------------------------------------------------------+
void SendHeartbeat(){
   string json = "{";
   json += "\"login\":" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   json += "\"name\":\"" + AccountInfoString(ACCOUNT_NAME) + "\",";
   json += "\"server\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\",";
   json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
   json += "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\"";
   json += "}";
   PostJson(HeartbeatURL, json);
}

//+------------------------------------------------------------------+
void PostJson(string url, string json){
   char post[]; char result[]; string resultHeaders;
   StringToCharArray(json, post, 0, StringLen(json));
   ResetLastError();
   int res = WebRequest("POST", url, "Content-Type: application/json\r\n", 5000, post, result, resultHeaders);
   if(res == -1){
      int err = GetLastError();
      Print("JournalSyncEA: WebRequest mislukt (", err, "). Voeg ", url,
            " toe bij Opties > Expert Advisors > 'Sta WebRequest toe voor de genoemde URL's'.");
   }
}
//+------------------------------------------------------------------+
