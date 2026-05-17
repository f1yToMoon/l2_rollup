/**
 * MiniRollup contract wrapper.
 *
 * Run `npx blueprint build` to auto-generate this file from the Tact ABI.
 * The generated file will be at: build/MiniRollup/tact_MiniRollup.ts
 *
 * This hand-written wrapper mirrors what the Tact compiler produces and can
 * be used directly until you run the build step.
 */

import {
    Address,
    Builder,
    Cell,
    Contract,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
    Slice,
    TupleBuilder,
    TupleReader,
    beginCell,
    contractAddress,
    toNano,
} from "@ton/core";

// ============= Message types =============

export type Deposit = { $$type: "Deposit" };
export type SettleBatch = {
    $$type: "SettleBatch";
    batchIndex: bigint;
    newStateRoot: bigint;
    totalDeposits: bigint;
    withdrawals: Dictionary<Address, bigint>;
};
export type Dispute = { $$type: "Dispute"; claimedBalance: bigint };
export type Withdraw = { $$type: "Withdraw"; amount: bigint };
export type ResolveDispute = { $$type: "ResolveDispute" };
export type Deploy = { $$type: "Deploy"; queryId: bigint };

// ============= Serialization =============

function storeDeposit(src: Deposit) {
    return (b: Builder) => {
        b.storeUint(0xbf3f447e, 32); // crc32("Deposit")
    };
}

function storeSettleBatch(src: SettleBatch) {
    return (b: Builder) => {
        b.storeUint(0x7d29dc3a, 32); // crc32("SettleBatch")
        b.storeUint(src.batchIndex, 64);
        b.storeUint(src.newStateRoot, 256);
        b.storeCoins(src.totalDeposits);
        b.storeDict(
            src.withdrawals,
            Dictionary.Keys.Address(),
            Dictionary.Values.BigVarUint(4)
        );
    };
}

function storeDispute(src: Dispute) {
    return (b: Builder) => {
        b.storeUint(0x4d6c1e3f, 32); // crc32("Dispute")
        b.storeCoins(src.claimedBalance);
    };
}

function storeWithdraw(src: Withdraw) {
    return (b: Builder) => {
        b.storeUint(0x2e7c6a5b, 32); // crc32("Withdraw")
        b.storeCoins(src.amount);
    };
}

function storeResolveDispute(src: ResolveDispute) {
    return (b: Builder) => {
        b.storeUint(0x1a9f3c8d, 32); // crc32("ResolveDispute")
    };
}

function storeDeploy(src: Deploy) {
    return (b: Builder) => {
        b.storeUint(0x946a98b6, 32); // Deploy opcode from stdlib
        b.storeUint(src.queryId, 64);
    };
}

// ============= Init data =============

export type MiniRollupConfig = {
    operator: Address;
    disputeWindow: bigint;
};

export function miniRollupConfigToCell(config: MiniRollupConfig): Cell {
    return beginCell()
        .storeAddress(config.operator)
        .storeDict(null) // empty deposits map
        .storeUint(0, 256) // stateRoot
        .storeUint(0, 64)  // batchIndex
        .storeUint(0, 64)  // settlementTime
        .storeUint(config.disputeWindow, 64)
        .storeBit(false)   // disputed
        .endCell();
}

// ============= Contract class =============

export class MiniRollup implements Contract {
    readonly address: Address;
    readonly init?: { code: Cell; data: Cell };

    constructor(address: Address, init?: { code: Cell; data: Cell }) {
        this.address = address;
        this.init = init;
    }

    static async fromInit(operator: Address, disputeWindow: bigint): Promise<MiniRollup> {
        // NOTE: actual code cell is produced by `npx blueprint build`
        // Import from build/MiniRollup/tact_MiniRollup.ts after building
        throw new Error(
            "Call `npx blueprint build` first, then import from build/MiniRollup/tact_MiniRollup.ts"
        );
    }

    static fromAddress(address: Address): MiniRollup {
        return new MiniRollup(address);
    }

    async send(
        provider: ContractProvider,
        via: Sender,
        args: { value: bigint; bounce?: boolean },
        message:
            | Deposit
            | SettleBatch
            | Dispute
            | Withdraw
            | ResolveDispute
            | Deploy
    ) {
        let body: Cell;
        if (message.$$type === "Deposit") {
            body = beginCell().store(storeDeposit(message)).endCell();
        } else if (message.$$type === "SettleBatch") {
            body = beginCell().store(storeSettleBatch(message)).endCell();
        } else if (message.$$type === "Dispute") {
            body = beginCell().store(storeDispute(message)).endCell();
        } else if (message.$$type === "Withdraw") {
            body = beginCell().store(storeWithdraw(message)).endCell();
        } else if (message.$$type === "ResolveDispute") {
            body = beginCell().store(storeResolveDispute(message)).endCell();
        } else {
            body = beginCell().store(storeDeploy(message as Deploy)).endCell();
        }

        await provider.internal(via, {
            value: args.value,
            bounce: args.bounce ?? true,
            body,
        });
    }

    async getGetDeposit(provider: ContractProvider, addr: Address): Promise<bigint> {
        const tb = new TupleBuilder();
        tb.writeAddress(addr);
        const { stack } = await provider.get("getDeposit", tb.build());
        return stack.readBigNumber();
    }

    async getGetStateRoot(provider: ContractProvider): Promise<bigint> {
        const { stack } = await provider.get("getStateRoot", []);
        return stack.readBigNumber();
    }

    async getGetBatchIndex(provider: ContractProvider): Promise<bigint> {
        const { stack } = await provider.get("getBatchIndex", []);
        return stack.readBigNumber();
    }

    async getIsDisputed(provider: ContractProvider): Promise<boolean> {
        const { stack } = await provider.get("isDisputed", []);
        return stack.readBoolean();
    }

    async getGetOperator(provider: ContractProvider): Promise<Address> {
        const { stack } = await provider.get("getOperator", []);
        return stack.readAddress();
    }

    async getGetDisputeDeadline(provider: ContractProvider): Promise<bigint> {
        const { stack } = await provider.get("getDisputeDeadline", []);
        return stack.readBigNumber();
    }

    async getGetContractBalance(provider: ContractProvider): Promise<bigint> {
        const { stack } = await provider.get("getContractBalance", []);
        return stack.readBigNumber();
    }
}
