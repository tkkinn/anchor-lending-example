import { BankrunContextWrapper, PROGRAM_ID, sendTransaction } from "@/helpers";
import {
  getAdminPublicKey,
  getInitializeIx,
  AdminAccount,
  getInitializePoolIx,
  getPoolPublicKey,
  PoolAccount,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";

describe("Initialize Pool", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair;
  let unauthorized: Keypair;
  let adminKey: PublicKey;
  let poolKey: PublicKey;

  beforeEach(async () => {
    // Set up testing environment
    context = await startAnchor("", [], []);
    client = context.banksClient;
    authority = context.payer;
    unauthorized = Keypair.generate();

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();

    adminKey = getAdminPublicKey(PROGRAM_ID);

    // Initialize protocol first
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);
  });

  /**
   * Test: Initialize Pool Successfully
   * Flow:
   * 1. Call initialize pool with valid authority
   * 2. Verify pool account created with bank_count = 0
   * 3. Verify admin account pool_count incremented
   * Expected: Pool should be initialized with correct settings
   */
  it("should initialize pool successfully", async () => {
    // Get initial state
    const adminInfoBefore = await connection.getAccountInfo(adminKey);
    const adminBefore = AdminAccount.decode(adminInfoBefore.data);
    const poolId = adminBefore.poolCount;
    poolKey = getPoolPublicKey(poolId, PROGRAM_ID);

    // Initialize pool
    const ix = await getInitializePoolIx(authority.publicKey, poolId);
    await sendTransaction([ix], connection, authority);

    // Verify admin count incremented
    const adminInfoAfter = await connection.getAccountInfo(adminKey);
    const adminAfter = AdminAccount.decode(adminInfoAfter.data);
    expect(adminAfter.poolCount).toBe(poolId + 1);

    // Verify pool initialized correctly
    const poolInfo = await connection.getAccountInfo(poolKey);
    const pool = PoolAccount.decode(poolInfo.data);
    expect(pool.bankCount).toBe(0);
  });

  /**
   * Test: Unauthorized Pool Initialization
   * Flow:
   * 1. Try to initialize pool with unauthorized signer
   * Expected: Transaction should fail with unauthorized error
   */
  it("should fail on unauthorized initialization", async () => {
    const ix = await getInitializePoolIx(unauthorized.publicKey, 0);
    await expect(
      sendTransaction([ix], connection, unauthorized)
    ).rejects.toThrow();
  });

  /**
   * Test: Pool Count Overflow
   * Flow:
   * 1. Initialize pools until just before u8::MAX
   * 2. Try to initialize one more pool
   * Expected: Last initialization should fail with overflow error
   */
  it("should fail on pool count overflow", async () => {
    // Create pools until just before overflow
    for (let i = 0; i < 255; i++) {
      const ix = await getInitializePoolIx(authority.publicKey, i);
      await sendTransaction([ix], connection, authority);
    }

    // Try to initialize one more pool, should overflow
    const ix = await getInitializePoolIx(authority.publicKey, 255);
    await expect(sendTransaction([ix], connection, authority)).rejects.toThrow(
      /0x1773/
    );
  });
});
