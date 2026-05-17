import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  BalanceResponse,
  BatchDetail,
  BatchRecord,
  Stats,
  TxRecord,
  User,
  VerifyResult,
} from "../types";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const api = axios.create({ baseURL: API });

// ============= User =============

export function useRegisterUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      address: string;
      public_key: string;
      telegram_id?: number;
      username?: string;
      avatar_url?: string;
    }) => api.post("/api/users/register", data).then((r) => r.data as User),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["balance", vars.address] });
    },
  });
}

export function useUser(address: string | undefined) {
  return useQuery<User>({
    queryKey: ["user", address],
    queryFn: () => api.get(`/api/users/${address}`).then((r) => r.data),
    enabled: !!address,
  });
}

// ============= Balance =============

export function useBalance(address: string | undefined) {
  return useQuery<BalanceResponse>({
    queryKey: ["balance", address],
    queryFn: () => api.get(`/api/balance/${address}`).then((r) => r.data),
    enabled: !!address,
    refetchInterval: 10_000,
  });
}

// ============= History =============

export function useHistory(address: string | undefined, limit = 20) {
  return useQuery<TxRecord[]>({
    queryKey: ["history", address, limit],
    queryFn: () =>
      api.get(`/api/history/${address}`, { params: { limit } }).then((r) => r.data),
    enabled: !!address,
    refetchInterval: 15_000,
  });
}

// ============= Deposit =============

export function useConfirmDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { address: string; amount: number; tx_hash: string }) =>
      api.post("/api/deposit/confirm", data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["balance", vars.address] });
    },
  });
}

// ============= Transfer =============

export function useTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sender: string;
      receiver: string;
      amount: number;
      nonce: number;
      signature: string;
    }) => api.post("/api/transfer", data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["balance", vars.sender] });
      qc.invalidateQueries({ queryKey: ["history", vars.sender] });
    },
  });
}

// ============= Withdrawal =============

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { address: string; amount: number; signature: string }) =>
      api.post("/api/withdraw/request", data).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["balance", vars.address] });
    },
  });
}

// ============= Batches =============

export function useBatches() {
  return useQuery<BatchRecord[]>({
    queryKey: ["batches"],
    queryFn: () => api.get("/api/batches").then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useBatchDetail(batchId: number | undefined) {
  return useQuery<BatchDetail>({
    queryKey: ["batch", batchId],
    queryFn: () => api.get(`/api/batch/${batchId}`).then((r) => r.data),
    enabled: !!batchId,
  });
}

export function useVerifyBatch() {
  return useMutation({
    mutationFn: (batchId: number) =>
      api.get(`/api/verify/${batchId}`).then((r) => r.data as VerifyResult),
  });
}

// ============= Stats =============

export function useStats() {
  return useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => api.get("/api/stats").then((r) => r.data),
    refetchInterval: 20_000,
  });
}
