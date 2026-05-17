export interface User {
  address: string;
  telegram_id?: number;
  username?: string;
  avatar_url?: string;
  off_chain_balance: number;
  nonce: number;
}

export interface TxRecord {
  id: number;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: number;
  batch_id: number | null;
}

export interface BatchRecord {
  id: number;
  state_root: string;
  tx_count: number;
  total_volume: number;
  settled_at: number | null;
  tx_hash: string | null;
}

export interface BatchDetail {
  batch: BatchRecord;
  transactions: TxRecord[];
  balances: Record<string, number>;
}

export interface VerifyResult {
  batch_id: number;
  stored_state_root: string;
  computed_state_root: string;
  match: boolean;
  balances: Record<string, number>;
}

export interface Stats {
  total_off_chain_tx: number;
  total_on_chain_settlements: number;
  compression_ratio: number;
  total_volume_nanotons: number;
  estimated_gas_saved_nanotons: number;
  pending_tx_count: number;
}

export interface BalanceResponse {
  address: string;
  off_chain_balance: number;
  nonce: number;
}
