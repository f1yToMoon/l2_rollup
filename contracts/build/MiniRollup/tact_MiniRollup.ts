import { 
    Cell,
    Slice, 
    Address, 
    Builder, 
    beginCell, 
    ComputeError, 
    TupleItem, 
    TupleReader, 
    Dictionary, 
    contractAddress, 
    ContractProvider, 
    Sender, 
    Contract, 
    ContractABI, 
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    let sc_0 = slice;
    let _code = sc_0.loadRef();
    let _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function loadTupleStateInit(source: TupleReader) {
    let _code = source.readCell();
    let _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function loadGetterTupleStateInit(source: TupleReader) {
    let _code = source.readCell();
    let _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function storeTupleStateInit(source: StateInit) {
    let builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounced: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounced);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    let sc_0 = slice;
    let _bounced = sc_0.loadBit();
    let _sender = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function loadTupleContext(source: TupleReader) {
    let _bounced = source.readBoolean();
    let _sender = source.readAddress();
    let _value = source.readBigNumber();
    let _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function loadGetterTupleContext(source: TupleReader) {
    let _bounced = source.readBoolean();
    let _sender = source.readAddress();
    let _value = source.readBigNumber();
    let _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function storeTupleContext(source: Context) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounced);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    bounce: boolean;
    to: Address;
    value: bigint;
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounce);
        b_0.storeAddress(src.to);
        b_0.storeInt(src.value, 257);
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
    };
}

export function loadSendParameters(slice: Slice) {
    let sc_0 = slice;
    let _bounce = sc_0.loadBit();
    let _to = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _mode = sc_0.loadIntBig(257);
    let _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function loadTupleSendParameters(source: TupleReader) {
    let _bounce = source.readBoolean();
    let _to = source.readAddress();
    let _value = source.readBigNumber();
    let _mode = source.readBigNumber();
    let _body = source.readCellOpt();
    let _code = source.readCellOpt();
    let _data = source.readCellOpt();
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function loadGetterTupleSendParameters(source: TupleReader) {
    let _bounce = source.readBoolean();
    let _to = source.readAddress();
    let _value = source.readBigNumber();
    let _mode = source.readBigNumber();
    let _body = source.readCellOpt();
    let _code = source.readCellOpt();
    let _data = source.readCellOpt();
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function storeTupleSendParameters(source: SendParameters) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounce);
    builder.writeAddress(source.to);
    builder.writeNumber(source.value);
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function loadTupleDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function loadGetterTupleDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function storeTupleDeploy(source: Deploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function loadTupleDeployOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function loadGetterTupleDeployOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function storeTupleDeployOk(source: DeployOk) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function loadTupleFactoryDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function loadGetterTupleFactoryDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function storeTupleFactoryDeploy(source: FactoryDeploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type Deposit = {
    $$type: 'Deposit';
}

export function storeDeposit(src: Deposit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1243991607, 32);
    };
}

export function loadDeposit(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1243991607) { throw Error('Invalid prefix'); }
    return { $$type: 'Deposit' as const };
}

function loadTupleDeposit(source: TupleReader) {
    return { $$type: 'Deposit' as const };
}

function loadGetterTupleDeposit(source: TupleReader) {
    return { $$type: 'Deposit' as const };
}

function storeTupleDeposit(source: Deposit) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserDeposit(): DictionaryValue<Deposit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeposit(src)).endCell());
        },
        parse: (src) => {
            return loadDeposit(src.loadRef().beginParse());
        }
    }
}

export type SettleBatch = {
    $$type: 'SettleBatch';
    batchIndex: bigint;
    newStateRoot: bigint;
    totalDeposits: bigint;
    withdrawals: Dictionary<Address, bigint>;
}

export function storeSettleBatch(src: SettleBatch) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3540778712, 32);
        b_0.storeUint(src.batchIndex, 64);
        b_0.storeUint(src.newStateRoot, 256);
        b_0.storeCoins(src.totalDeposits);
        b_0.storeDict(src.withdrawals, Dictionary.Keys.Address(), Dictionary.Values.BigUint(128));
    };
}

export function loadSettleBatch(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3540778712) { throw Error('Invalid prefix'); }
    let _batchIndex = sc_0.loadUintBig(64);
    let _newStateRoot = sc_0.loadUintBig(256);
    let _totalDeposits = sc_0.loadCoins();
    let _withdrawals = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigUint(128), sc_0);
    return { $$type: 'SettleBatch' as const, batchIndex: _batchIndex, newStateRoot: _newStateRoot, totalDeposits: _totalDeposits, withdrawals: _withdrawals };
}

function loadTupleSettleBatch(source: TupleReader) {
    let _batchIndex = source.readBigNumber();
    let _newStateRoot = source.readBigNumber();
    let _totalDeposits = source.readBigNumber();
    let _withdrawals = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigUint(128), source.readCellOpt());
    return { $$type: 'SettleBatch' as const, batchIndex: _batchIndex, newStateRoot: _newStateRoot, totalDeposits: _totalDeposits, withdrawals: _withdrawals };
}

function loadGetterTupleSettleBatch(source: TupleReader) {
    let _batchIndex = source.readBigNumber();
    let _newStateRoot = source.readBigNumber();
    let _totalDeposits = source.readBigNumber();
    let _withdrawals = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigUint(128), source.readCellOpt());
    return { $$type: 'SettleBatch' as const, batchIndex: _batchIndex, newStateRoot: _newStateRoot, totalDeposits: _totalDeposits, withdrawals: _withdrawals };
}

function storeTupleSettleBatch(source: SettleBatch) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.batchIndex);
    builder.writeNumber(source.newStateRoot);
    builder.writeNumber(source.totalDeposits);
    builder.writeCell(source.withdrawals.size > 0 ? beginCell().storeDictDirect(source.withdrawals, Dictionary.Keys.Address(), Dictionary.Values.BigUint(128)).endCell() : null);
    return builder.build();
}

function dictValueParserSettleBatch(): DictionaryValue<SettleBatch> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSettleBatch(src)).endCell());
        },
        parse: (src) => {
            return loadSettleBatch(src.loadRef().beginParse());
        }
    }
}

export type Dispute = {
    $$type: 'Dispute';
    claimedBalance: bigint;
}

export function storeDispute(src: Dispute) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2884954055, 32);
        b_0.storeCoins(src.claimedBalance);
    };
}

export function loadDispute(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2884954055) { throw Error('Invalid prefix'); }
    let _claimedBalance = sc_0.loadCoins();
    return { $$type: 'Dispute' as const, claimedBalance: _claimedBalance };
}

function loadTupleDispute(source: TupleReader) {
    let _claimedBalance = source.readBigNumber();
    return { $$type: 'Dispute' as const, claimedBalance: _claimedBalance };
}

function loadGetterTupleDispute(source: TupleReader) {
    let _claimedBalance = source.readBigNumber();
    return { $$type: 'Dispute' as const, claimedBalance: _claimedBalance };
}

function storeTupleDispute(source: Dispute) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.claimedBalance);
    return builder.build();
}

function dictValueParserDispute(): DictionaryValue<Dispute> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDispute(src)).endCell());
        },
        parse: (src) => {
            return loadDispute(src.loadRef().beginParse());
        }
    }
}

export type Withdraw = {
    $$type: 'Withdraw';
    amount: bigint;
}

export function storeWithdraw(src: Withdraw) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(195467089, 32);
        b_0.storeCoins(src.amount);
    };
}

export function loadWithdraw(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 195467089) { throw Error('Invalid prefix'); }
    let _amount = sc_0.loadCoins();
    return { $$type: 'Withdraw' as const, amount: _amount };
}

function loadTupleWithdraw(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'Withdraw' as const, amount: _amount };
}

function loadGetterTupleWithdraw(source: TupleReader) {
    let _amount = source.readBigNumber();
    return { $$type: 'Withdraw' as const, amount: _amount };
}

function storeTupleWithdraw(source: Withdraw) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.amount);
    return builder.build();
}

function dictValueParserWithdraw(): DictionaryValue<Withdraw> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeWithdraw(src)).endCell());
        },
        parse: (src) => {
            return loadWithdraw(src.loadRef().beginParse());
        }
    }
}

export type ResolveDispute = {
    $$type: 'ResolveDispute';
}

export function storeResolveDispute(src: ResolveDispute) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2052948809, 32);
    };
}

export function loadResolveDispute(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2052948809) { throw Error('Invalid prefix'); }
    return { $$type: 'ResolveDispute' as const };
}

function loadTupleResolveDispute(source: TupleReader) {
    return { $$type: 'ResolveDispute' as const };
}

function loadGetterTupleResolveDispute(source: TupleReader) {
    return { $$type: 'ResolveDispute' as const };
}

function storeTupleResolveDispute(source: ResolveDispute) {
    let builder = new TupleBuilder();
    return builder.build();
}

function dictValueParserResolveDispute(): DictionaryValue<ResolveDispute> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeResolveDispute(src)).endCell());
        },
        parse: (src) => {
            return loadResolveDispute(src.loadRef().beginParse());
        }
    }
}

export type MiniRollup$Data = {
    $$type: 'MiniRollup$Data';
    operator: Address;
    deposits: Dictionary<Address, bigint>;
    stateRoot: bigint;
    batchIndex: bigint;
    settlementTime: bigint;
    disputeWindow: bigint;
    disputed: boolean;
}

export function storeMiniRollup$Data(src: MiniRollup$Data) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.operator);
        b_0.storeDict(src.deposits, Dictionary.Keys.Address(), Dictionary.Values.BigUint(128));
        b_0.storeUint(src.stateRoot, 256);
        b_0.storeUint(src.batchIndex, 64);
        b_0.storeUint(src.settlementTime, 64);
        b_0.storeUint(src.disputeWindow, 64);
        b_0.storeBit(src.disputed);
    };
}

export function loadMiniRollup$Data(slice: Slice) {
    let sc_0 = slice;
    let _operator = sc_0.loadAddress();
    let _deposits = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigUint(128), sc_0);
    let _stateRoot = sc_0.loadUintBig(256);
    let _batchIndex = sc_0.loadUintBig(64);
    let _settlementTime = sc_0.loadUintBig(64);
    let _disputeWindow = sc_0.loadUintBig(64);
    let _disputed = sc_0.loadBit();
    return { $$type: 'MiniRollup$Data' as const, operator: _operator, deposits: _deposits, stateRoot: _stateRoot, batchIndex: _batchIndex, settlementTime: _settlementTime, disputeWindow: _disputeWindow, disputed: _disputed };
}

function loadTupleMiniRollup$Data(source: TupleReader) {
    let _operator = source.readAddress();
    let _deposits = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigUint(128), source.readCellOpt());
    let _stateRoot = source.readBigNumber();
    let _batchIndex = source.readBigNumber();
    let _settlementTime = source.readBigNumber();
    let _disputeWindow = source.readBigNumber();
    let _disputed = source.readBoolean();
    return { $$type: 'MiniRollup$Data' as const, operator: _operator, deposits: _deposits, stateRoot: _stateRoot, batchIndex: _batchIndex, settlementTime: _settlementTime, disputeWindow: _disputeWindow, disputed: _disputed };
}

function loadGetterTupleMiniRollup$Data(source: TupleReader) {
    let _operator = source.readAddress();
    let _deposits = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigUint(128), source.readCellOpt());
    let _stateRoot = source.readBigNumber();
    let _batchIndex = source.readBigNumber();
    let _settlementTime = source.readBigNumber();
    let _disputeWindow = source.readBigNumber();
    let _disputed = source.readBoolean();
    return { $$type: 'MiniRollup$Data' as const, operator: _operator, deposits: _deposits, stateRoot: _stateRoot, batchIndex: _batchIndex, settlementTime: _settlementTime, disputeWindow: _disputeWindow, disputed: _disputed };
}

function storeTupleMiniRollup$Data(source: MiniRollup$Data) {
    let builder = new TupleBuilder();
    builder.writeAddress(source.operator);
    builder.writeCell(source.deposits.size > 0 ? beginCell().storeDictDirect(source.deposits, Dictionary.Keys.Address(), Dictionary.Values.BigUint(128)).endCell() : null);
    builder.writeNumber(source.stateRoot);
    builder.writeNumber(source.batchIndex);
    builder.writeNumber(source.settlementTime);
    builder.writeNumber(source.disputeWindow);
    builder.writeBoolean(source.disputed);
    return builder.build();
}

function dictValueParserMiniRollup$Data(): DictionaryValue<MiniRollup$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMiniRollup$Data(src)).endCell());
        },
        parse: (src) => {
            return loadMiniRollup$Data(src.loadRef().beginParse());
        }
    }
}

 type MiniRollup_init_args = {
    $$type: 'MiniRollup_init_args';
    operator: Address;
    disputeWindow: bigint;
}

function initMiniRollup_init_args(src: MiniRollup_init_args) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.operator);
        b_0.storeInt(src.disputeWindow, 257);
    };
}

async function MiniRollup_init(operator: Address, disputeWindow: bigint) {
    const __code = Cell.fromBase64('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');
    const __system = Cell.fromBase64('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');
    let builder = beginCell();
    builder.storeRef(__system);
    builder.storeUint(0, 1);
    initMiniRollup_init_args({ $$type: 'MiniRollup_init_args', operator, disputeWindow })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

const MiniRollup_errors: { [key: number]: { message: string } } = {
    2: { message: `Stack underflow` },
    3: { message: `Stack overflow` },
    4: { message: `Integer overflow` },
    5: { message: `Integer out of expected range` },
    6: { message: `Invalid opcode` },
    7: { message: `Type check error` },
    8: { message: `Cell overflow` },
    9: { message: `Cell underflow` },
    10: { message: `Dictionary error` },
    13: { message: `Out of gas error` },
    32: { message: `Method ID not found` },
    34: { message: `Action is invalid or not supported` },
    37: { message: `Not enough TON` },
    38: { message: `Not enough extra-currencies` },
    128: { message: `Null reference exception` },
    129: { message: `Invalid serialization prefix` },
    130: { message: `Invalid incoming message` },
    131: { message: `Constraints error` },
    132: { message: `Access denied` },
    133: { message: `Contract stopped` },
    134: { message: `Invalid argument` },
    135: { message: `Code of a contract was not found` },
    136: { message: `Invalid address` },
    137: { message: `Masterchain support is not enabled for this contract` },
    4092: { message: `Active dispute — wait for resolution` },
    4103: { message: `Amount too small to withdraw` },
    9937: { message: `Withdrawal exceeds user deposit` },
    13483: { message: `Only operator can resolve` },
    21780: { message: `Withdrawal amount must be positive` },
    22362: { message: `No active dispute` },
    23738: { message: `No settlement has occurred yet` },
    25240: { message: `Dispute window has closed` },
    32416: { message: `Already in dispute` },
    34869: { message: `No batches settled yet` },
    35327: { message: `Insufficient deposit balance` },
    37645: { message: `Dispute window still open` },
    45290: { message: `Deposit amount too small` },
    45879: { message: `Active dispute — resolve first` },
    51744: { message: `Only operator can settle` },
    55591: { message: `Insufficient contract balance` },
    62823: { message: `Invalid batch index` },
}

const MiniRollup_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Deposit","header":1243991607,"fields":[]},
    {"name":"SettleBatch","header":3540778712,"fields":[{"name":"batchIndex","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newStateRoot","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"totalDeposits","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"withdrawals","type":{"kind":"dict","key":"address","value":"uint","valueFormat":128}}]},
    {"name":"Dispute","header":2884954055,"fields":[{"name":"claimedBalance","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"Withdraw","header":195467089,"fields":[{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
    {"name":"ResolveDispute","header":2052948809,"fields":[]},
    {"name":"MiniRollup$Data","header":null,"fields":[{"name":"operator","type":{"kind":"simple","type":"address","optional":false}},{"name":"deposits","type":{"kind":"dict","key":"address","value":"uint","valueFormat":128}},{"name":"stateRoot","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"batchIndex","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"settlementTime","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"disputeWindow","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"disputed","type":{"kind":"simple","type":"bool","optional":false}}]},
]

const MiniRollup_getters: ABIGetter[] = [
    {"name":"getDeposit","arguments":[{"name":"addr","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getStateRoot","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getBatchIndex","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"isDisputed","arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"getOperator","arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"getDisputeDeadline","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getContractBalance","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
]

export const MiniRollup_getterMapping: { [key: string]: string } = {
    'getDeposit': 'getGetDeposit',
    'getStateRoot': 'getGetStateRoot',
    'getBatchIndex': 'getGetBatchIndex',
    'isDisputed': 'getIsDisputed',
    'getOperator': 'getGetOperator',
    'getDisputeDeadline': 'getGetDisputeDeadline',
    'getContractBalance': 'getGetContractBalance',
}

const MiniRollup_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"Deposit"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SettleBatch"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Dispute"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ResolveDispute"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Withdraw"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export class MiniRollup implements Contract {
    
    static async init(operator: Address, disputeWindow: bigint) {
        return await MiniRollup_init(operator, disputeWindow);
    }
    
    static async fromInit(operator: Address, disputeWindow: bigint) {
        const init = await MiniRollup_init(operator, disputeWindow);
        const address = contractAddress(0, init);
        return new MiniRollup(address, init);
    }
    
    static fromAddress(address: Address) {
        return new MiniRollup(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  MiniRollup_types,
        getters: MiniRollup_getters,
        receivers: MiniRollup_receivers,
        errors: MiniRollup_errors,
    };
    
    private constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Deposit | SettleBatch | Dispute | ResolveDispute | Withdraw | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deposit') {
            body = beginCell().store(storeDeposit(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SettleBatch') {
            body = beginCell().store(storeSettleBatch(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Dispute') {
            body = beginCell().store(storeDispute(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ResolveDispute') {
            body = beginCell().store(storeResolveDispute(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Withdraw') {
            body = beginCell().store(storeWithdraw(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getGetDeposit(provider: ContractProvider, addr: Address) {
        let builder = new TupleBuilder();
        builder.writeAddress(addr);
        let source = (await provider.get('getDeposit', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getGetStateRoot(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('getStateRoot', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getGetBatchIndex(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('getBatchIndex', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getIsDisputed(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('isDisputed', builder.build())).stack;
        let result = source.readBoolean();
        return result;
    }
    
    async getGetOperator(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('getOperator', builder.build())).stack;
        let result = source.readAddress();
        return result;
    }
    
    async getGetDisputeDeadline(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('getDisputeDeadline', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getGetContractBalance(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('getContractBalance', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
}