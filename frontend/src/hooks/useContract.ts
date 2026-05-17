/**
 * Interactions with the MiniRollup smart contract via TON Connect.
 */

import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";
import { beginCell, toNano } from "@ton/core";
import { useCallback } from "react";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";

// Message opcodes — must match the compiled Tact contract
const OP_DEPOSIT = 0xbf3f447e;
const OP_WITHDRAW = 0x2e7c6a5b;
const OP_DISPUTE = 0x4d6c1e3f;

export function useContract() {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();

  const sendDeposit = useCallback(
    async (amountTon: number): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");

      // Deposit message body: just the opcode (no extra fields)
      const body = beginCell().storeUint(OP_DEPOSIT, 32).endCell();

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano(amountTon).toString(),
            payload: body.toBoc().toString("base64"),
          },
        ],
      });

      return result.boc; // base64 BOC of the sent tx
    },
    [address, tonConnectUI]
  );

  const sendWithdraw = useCallback(
    async (amountNano: number): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");

      const body = beginCell()
        .storeUint(OP_WITHDRAW, 32)
        .storeCoins(BigInt(amountNano))
        .endCell();

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano("0.05").toString(), // gas fee
            payload: body.toBoc().toString("base64"),
          },
        ],
      });

      return result.boc;
    },
    [address, tonConnectUI]
  );

  const sendDispute = useCallback(
    async (claimedBalanceNano: number): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");

      const body = beginCell()
        .storeUint(OP_DISPUTE, 32)
        .storeCoins(BigInt(claimedBalanceNano))
        .endCell();

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano("0.05").toString(),
            payload: body.toBoc().toString("base64"),
          },
        ],
      });

      return result.boc;
    },
    [address, tonConnectUI]
  );

  return { sendDeposit, sendWithdraw, sendDispute, contractAddress: CONTRACT_ADDRESS };
}
