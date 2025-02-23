Test requirement:
Test should written in DRY principle. You should include edge case.
You should use function provided in the SDK to access the smart contract. 
Don't use built-in function in anchor to fetch account, use getAccountInfo() then decode account instead. 
Here is the example for the test. 
```typescript
import { BankrunContextWrapper, PROGRAM_ID, sendTransaction } from "@/helpers";
import { getAdminPublicKey, getInitializeIx, AdminAccount, getInitializeTokenGroupIx } from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";

let context: ProgramTestContext;
let client: BanksClient;
let provider: BankrunProvider;
let connection: Connection;
let bankrunContextWrapper: BankrunContextWrapper;

let wallet: Keypair;

describe("Admin Function", () => {
  let stateKey: PublicKey;

  beforeEach(async () => {
    // Set up fresh testing environment before each test
    // Initialize program context, client, wallet, provider and connections
    context = await startAnchor("", [], [
        // Add additational account here
    ]);
    client = context.banksClient;
    wallet = context.payer;

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();
    stateKey = getBoatStatePublickey(PROGRAM_ID);
  });

  /**
   * Test: Initialize State Account
   * Flow:
   * 1. Create initialize instruction with wallet as authority
   * 2. Send and execute transaction
   * 3. Fetch and decode state account data
   * Expected: State account should be created with wallet as authority
   */
  it("should initialize state account", async () => {
    const ix = await getInitializeIx(wallet.publicKey);
    await sendTransaction([ix], connection, wallet);

    const stateInfo = await connection.getAccountInfo(stateKey);
    const state = StateAccount.decode(stateInfo.data);
    expect(state.authority).toEqual(wallet.publicKey);
    // get token amount
    const amount = (await bankrunContextWrapper.connection.getTokenAccount(bankTokenAccount)).amount;
  });
});
```