import { toNano, Address } from "@ton/core";
import { NetworkProvider } from "@ton/blueprint";

import { MiniRollup } from "../build/MiniRollup/tact_MiniRollup";

export async function run(provider: NetworkProvider) {
    const senderAddress = provider.sender().address;
    if (!senderAddress) {
        throw new Error("Sender address is not available");
    }

    console.log("Deploying MiniRollup contract...");
    console.log("Operator address:", senderAddress.toString());

    const DISPUTE_WINDOW = 3600n; // 1 hour for demo (real rollup uses 7 days)

    const miniRollup = provider.open(
        await MiniRollup.fromInit(senderAddress, DISPUTE_WINDOW)
    );

    await miniRollup.send(
        provider.sender(),
        { value: toNano("0.1") },
        { $$type: "Deploy", queryId: 0n }
    );

    await provider.waitForDeploy(miniRollup.address);

    console.log("\n✅ MiniRollup deployed successfully!");
    console.log("Contract address:", miniRollup.address.toString());
    console.log("\nAdd to your .env files:");
    console.log(`CONTRACT_ADDRESS=${miniRollup.address.toString()}`);
    console.log(`VITE_CONTRACT_ADDRESS=${miniRollup.address.toString()}`);

    // Verify initial state
    const batchIndex = await miniRollup.getGetBatchIndex();
    const stateRoot = await miniRollup.getGetStateRoot();
    const operator = await miniRollup.getGetOperator();

    console.log("\nInitial state:");
    console.log("  batchIndex:", batchIndex.toString());
    console.log("  stateRoot:", stateRoot.toString());
    console.log("  operator:", operator.toString());
}
