import "@stdlib/deploy";

// ============= Messages =============

message Deposit {}

message SettleBatch {
    batchIndex: Int as uint64;
    newStateRoot: Int as uint256;
    totalDeposits: Int as coins;
    withdrawals: map<Address, Int as coins>;
}

message Dispute {
    claimedBalance: Int as coins;
}

message Withdraw {
    amount: Int as coins;
}

message ResolveDispute {}

// ============= Contract =============

contract MiniRollup with Deployable {
    operator: Address;
    deposits: map<Address, Int as coins>;
    stateRoot: Int as uint256;
    batchIndex: Int as uint64;
    settlementTime: Int as uint64;
    disputeWindow: Int as uint64;
    disputed: Bool;

    init(operator: Address, disputeWindow: Int) {
        self.operator = operator;
        self.stateRoot = 0;
        self.batchIndex = 0;
        self.settlementTime = 0;
        self.disputeWindow = disputeWindow;
        self.disputed = false;
    }

    // User deposits TON into the rollup
    receive(msg: Deposit) {
        // Keep 0.01 TON for gas, rest goes to user's deposit
        let value: Int = context().value - ton("0.01");
        require(value > 0, "Deposit amount too small");

        let sender: Address = context().sender;
        let current: Int = self.deposits.get(sender) ?: 0;
        self.deposits.set(sender, current + value);
    }

    // Operator settles a batch of off-chain transactions
    receive(msg: SettleBatch) {
        require(context().sender == self.operator, "Only operator can settle");
        require(!self.disputed, "Active dispute — resolve first");
        require(msg.batchIndex == self.batchIndex + 1, "Invalid batch index");

        // Sum all withdrawal amounts
        let totalOut: Int = 0;
        foreach(addr, amount in msg.withdrawals) {
            require(amount > 0, "Withdrawal amount must be positive");
            totalOut = totalOut + amount;
        }

        // Reserve 0.1 TON for gas costs across all sends
        require(
            msg.totalDeposits + totalOut <= myBalance() - ton("0.1"),
            "Insufficient contract balance"
        );

        // Process each withdrawal
        foreach(addr, amount in msg.withdrawals) {
            let deposit: Int = self.deposits.get(addr) ?: 0;
            require(deposit >= amount, "Withdrawal exceeds user deposit");
            self.deposits.set(addr, deposit - amount);

            send(SendParameters{
                to: addr,
                value: amount,
                mode: SendPayGasSeparately,
                body: "Rollup withdrawal".asComment()
            });
        }

        self.stateRoot = msg.newStateRoot;
        self.batchIndex = msg.batchIndex;
        self.settlementTime = now();
    }

    // User raises a dispute within the dispute window after settlement
    receive(msg: Dispute) {
        require(!self.disputed, "Already in dispute");
        require(self.batchIndex > 0, "No batches settled yet");
        require(
            now() <= self.settlementTime + self.disputeWindow,
            "Dispute window has closed"
        );
        self.disputed = true;
    }

    // Operator resolves a dispute by providing correct state
    receive(msg: ResolveDispute) {
        require(context().sender == self.operator, "Only operator can resolve");
        require(self.disputed, "No active dispute");
        self.disputed = false;
    }

    // User directly withdraws their on-chain deposit after dispute window
    receive(msg: Withdraw) {
        require(!self.disputed, "Active dispute — wait for resolution");
        require(self.batchIndex > 0, "No settlement has occurred yet");
        require(
            now() > self.settlementTime + self.disputeWindow,
            "Dispute window still open"
        );

        let sender: Address = context().sender;
        let deposit: Int = self.deposits.get(sender) ?: 0;
        require(deposit >= msg.amount, "Insufficient deposit balance");
        require(msg.amount > ton("0.01"), "Amount too small to withdraw");

        self.deposits.set(sender, deposit - msg.amount);

        send(SendParameters{
            to: sender,
            value: msg.amount,
            mode: SendPayGasSeparately,
            body: "Direct withdrawal".asComment()
        });
    }

    // ============= Getters =============

    get fun getDeposit(addr: Address): Int {
        return self.deposits.get(addr) ?: 0;
    }

    get fun getStateRoot(): Int {
        return self.stateRoot;
    }

    get fun getBatchIndex(): Int {
        return self.batchIndex;
    }

    get fun isDisputed(): Bool {
        return self.disputed;
    }

    get fun getOperator(): Address {
        return self.operator;
    }

    get fun getDisputeDeadline(): Int {
        if (self.batchIndex == 0) {
            return 0;
        }
        return self.settlementTime + self.disputeWindow;
    }

    get fun getContractBalance(): Int {
        return myBalance();
    }
}
