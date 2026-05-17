import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { toNano, Dictionary, Address } from "@ton/core";
import { MiniRollup } from "../wrappers/MiniRollup";
import "@ton/test-utils";

// NOTE: Run `npx blueprint build` before running these tests.
// Tests assume the contract wrapper is generated at build/MiniRollup/tact_MiniRollup.ts
// If using the hand-written wrapper, replace the import above with the generated one.

const DISPUTE_WINDOW = 3600n; // 1 hour in seconds

describe("MiniRollup", () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let operator: SandboxContract<TreasuryContract>;
    let alice: SandboxContract<TreasuryContract>;
    let bob: SandboxContract<TreasuryContract>;
    let carol: SandboxContract<TreasuryContract>;
    let miniRollup: SandboxContract<MiniRollup>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury("deployer");
        operator = await blockchain.treasury("operator");
        alice = await blockchain.treasury("alice");
        bob = await blockchain.treasury("bob");
        carol = await blockchain.treasury("carol");

        // Deploy contract with operator address and 1-hour dispute window
        miniRollup = blockchain.openContract(
            await MiniRollup.fromInit(operator.address, DISPUTE_WINDOW)
        );

        const deployResult = await miniRollup.send(
            deployer.getSender(),
            { value: toNano("0.1") },
            { $$type: "Deploy", queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: miniRollup.address,
            deploy: true,
            success: true,
        });
    });

    it("should accept deposit and update user balance", async () => {
        const depositAmount = toNano("5");

        const result = await miniRollup.send(
            alice.getSender(),
            { value: depositAmount + toNano("0.01") },
            { $$type: "Deposit" }
        );

        expect(result.transactions).toHaveTransaction({
            from: alice.address,
            to: miniRollup.address,
            success: true,
        });

        const balance = await miniRollup.getGetDeposit(alice.address);
        expect(balance).toBeGreaterThan(0n);
        // Deposited ~5 TON minus gas
        expect(balance).toBeGreaterThanOrEqual(toNano("4.99"));
    });

    it("should reject deposit with zero value", async () => {
        const result = await miniRollup.send(
            alice.getSender(),
            { value: toNano("0.005") }, // less than gas cost
            { $$type: "Deposit" }
        );

        expect(result.transactions).toHaveTransaction({
            from: alice.address,
            to: miniRollup.address,
            success: false,
        });
    });

    it("should reject settlement from non-operator", async () => {
        // First deposit so contract has funds
        await miniRollup.send(
            alice.getSender(),
            { value: toNano("10.01") },
            { $$type: "Deposit" }
        );

        const withdrawals = Dictionary.empty<Address, bigint>();

        const result = await miniRollup.send(
            alice.getSender(), // not operator
            { value: toNano("0.1") },
            {
                $$type: "SettleBatch",
                batchIndex: 1n,
                newStateRoot: 12345n,
                totalDeposits: toNano("10"),
                withdrawals,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: alice.address,
            to: miniRollup.address,
            success: false,
        });
    });

    it("should settle batch correctly and update state root", async () => {
        // Alice deposits 10 TON
        await miniRollup.send(
            alice.getSender(),
            { value: toNano("10.01") },
            { $$type: "Deposit" }
        );

        const aliceDeposit = await miniRollup.getGetDeposit(alice.address);

        // Operator settles: withdraw 3 TON for Alice (off-chain balance after transfers)
        const withdrawals = Dictionary.empty<Address, bigint>();
        withdrawals.set(alice.address, toNano("3"));

        const stateRoot = BigInt(
            "0x" + Buffer.from("test_state_root_hash_32bytes!!").toString("hex")
        );

        const result = await miniRollup.send(
            operator.getSender(),
            { value: toNano("0.2") },
            {
                $$type: "SettleBatch",
                batchIndex: 1n,
                newStateRoot: stateRoot,
                totalDeposits: aliceDeposit - toNano("3"),
                withdrawals,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: miniRollup.address,
            to: alice.address,
            value: toNano("3"),
            success: true,
        });

        expect(await miniRollup.getGetBatchIndex()).toBe(1n);
        expect(await miniRollup.getGetStateRoot()).toBe(stateRoot);
    });

    it("should enforce sequential batch index", async () => {
        await miniRollup.send(
            alice.getSender(),
            { value: toNano("10.01") },
            { $$type: "Deposit" }
        );

        // Try to submit batchIndex=2 when expected is 1
        const result = await miniRollup.send(
            operator.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "SettleBatch",
                batchIndex: 2n, // wrong: should be 1
                newStateRoot: 0n,
                totalDeposits: toNano("10"),
                withdrawals: Dictionary.empty(),
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: operator.address,
            to: miniRollup.address,
            success: false,
        });
    });

    it("should allow dispute within window", async () => {
        await miniRollup.send(
            alice.getSender(),
            { value: toNano("10.01") },
            { $$type: "Deposit" }
        );

        // Settle first
        await miniRollup.send(
            operator.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "SettleBatch",
                batchIndex: 1n,
                newStateRoot: 99999n,
                totalDeposits: toNano("10"),
                withdrawals: Dictionary.empty(),
            }
        );

        // Immediately dispute (within window)
        const result = await miniRollup.send(
            alice.getSender(),
            { value: toNano("0.05") },
            { $$type: "Dispute", claimedBalance: toNano("10") }
        );

        expect(result.transactions).toHaveTransaction({
            from: alice.address,
            to: miniRollup.address,
            success: true,
        });

        expect(await miniRollup.getIsDisputed()).toBe(true);
    });

    it("should reject dispute after window expires", async () => {
        await miniRollup.send(
            alice.getSender(),
            { value: toNano("10.01") },
            { $$type: "Deposit" }
        );

        await miniRollup.send(
            operator.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "SettleBatch",
                batchIndex: 1n,
                newStateRoot: 99999n,
                totalDeposits: toNano("10"),
                withdrawals: Dictionary.empty(),
            }
        );

        // Fast-forward blockchain time past dispute window
        blockchain.now = Math.floor(Date.now() / 1000) + Number(DISPUTE_WINDOW) + 100;

        const result = await miniRollup.send(
            alice.getSender(),
            { value: toNano("0.05") },
            { $$type: "Dispute", claimedBalance: toNano("10") }
        );

        expect(result.transactions).toHaveTransaction({
            from: alice.address,
            to: miniRollup.address,
            success: false,
        });
    });

    it("should process direct withdraw after dispute window", async () => {
        const depositAmount = toNano("10");

        await miniRollup.send(
            alice.getSender(),
            { value: depositAmount + toNano("0.01") },
            { $$type: "Deposit" }
        );

        await miniRollup.send(
            operator.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "SettleBatch",
                batchIndex: 1n,
                newStateRoot: 99999n,
                totalDeposits: depositAmount,
                withdrawals: Dictionary.empty(),
            }
        );

        // Fast-forward past dispute window
        blockchain.now = Math.floor(Date.now() / 1000) + Number(DISPUTE_WINDOW) + 100;

        const aliceBalanceBefore = await alice.getBalance();

        const result = await miniRollup.send(
            alice.getSender(),
            { value: toNano("0.05") },
            { $$type: "Withdraw", amount: toNano("5") }
        );

        expect(result.transactions).toHaveTransaction({
            from: miniRollup.address,
            to: alice.address,
            value: toNano("5"),
            success: true,
        });

        const aliceDeposit = await miniRollup.getGetDeposit(alice.address);
        expect(aliceDeposit).toBeLessThan(depositAmount);
    });

    it("should operator resolve a dispute", async () => {
        await miniRollup.send(
            alice.getSender(),
            { value: toNano("10.01") },
            { $$type: "Deposit" }
        );

        await miniRollup.send(
            operator.getSender(),
            { value: toNano("0.1") },
            {
                $$type: "SettleBatch",
                batchIndex: 1n,
                newStateRoot: 99999n,
                totalDeposits: toNano("10"),
                withdrawals: Dictionary.empty(),
            }
        );

        await miniRollup.send(
            alice.getSender(),
            { value: toNano("0.05") },
            { $$type: "Dispute", claimedBalance: toNano("10") }
        );

        expect(await miniRollup.getIsDisputed()).toBe(true);

        const result = await miniRollup.send(
            operator.getSender(),
            { value: toNano("0.05") },
            { $$type: "ResolveDispute" }
        );

        expect(result.transactions).toHaveTransaction({
            from: operator.address,
            to: miniRollup.address,
            success: true,
        });

        expect(await miniRollup.getIsDisputed()).toBe(false);
    });
});
