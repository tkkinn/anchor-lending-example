import { BankrunContextWrapper, PROGRAM_ID, sendTransaction } from "@/helpers";
import {
  getAdminPublicKey,
  getInitializeIx,
  AdminAccount,
  getInitializeTokenGroupIx,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";

describe("Initialize Token Group", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let wallet: Keypair;
  let unauthorized: Keypair;
  let adminKey: PublicKey;

  beforeEach(async () => {
    // Set up testing environment
    context = await startAnchor("", [], []);
    client = context.banksClient;
    wallet = context.payer;
    unauthorized = Keypair.generate();

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();

    adminKey = getAdminPublicKey(PROGRAM_ID);

    // Initialize protocol first
    const initIx = await getInitializeIx(wallet.publicKey);
    await sendTransaction([initIx], connection, wallet);
  });

  /**
   * Test: Initialize Token Group Successfully
   * Flow:
   * 1. Call initialize token group with valid authority
   * 2. Verify admin account token_group_count increased
   * 3. Verify event emitted
   * Expected: Token group should be initialized and count incremented
   */
  it("should initialize token group successfully", async () => {
    // Get initial state
    const adminInfoBefore = await connection.getAccountInfo(adminKey);
    const adminBefore = AdminAccount.decode(adminInfoBefore.data);
    const countBefore = adminBefore.tokenGroupCount;

    // Initialize token group
    const ix = await getInitializeTokenGroupIx(wallet.publicKey);
    await sendTransaction([ix], connection, wallet);

    // Verify admin state updated
    const adminInfoAfter = await connection.getAccountInfo(adminKey);
    const adminAfter = AdminAccount.decode(adminInfoAfter.data);
    expect(adminAfter.tokenGroupCount).toBe(countBefore + 1);

    // Verify event - would need event listener setup
    // TODO: Add event verification once event testing utilities are available
  });
});
