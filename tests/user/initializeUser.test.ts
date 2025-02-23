import { BankrunContextWrapper, PROGRAM_ID, sendTransaction } from "@/helpers";
import {
  getAdminPublicKey,
  getInitializeIx,
  getInitializePoolIx,
  getInitializeUserIx,
  getUserPublicKey,
  AdminAccount,
  PoolAccount,
  UserAccount,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("Initialize User", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair;
  let unauthorized: Keypair;
  let adminKey: PublicKey;

  const poolId = 0;
  const userId = 0;

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

    // Initialize admin and pool
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    const initPoolIx = await getInitializePoolIx(authority.publicKey, poolId);
    await sendTransaction([initPoolIx], connection, authority);
  });

  /**
   * Test: Initialize User Successfully
   * Flow:
   * 1. Initialize user with valid inputs
   * 2. Verify user account created with correct settings
   * Expected: User account initialized correctly
   */
  it("should initialize user successfully", async () => {
    const userKey = getUserPublicKey(
      poolId,
      userId,
      authority.publicKey,
      PROGRAM_ID
    );

    // Initialize user
    const ix = await getInitializeUserIx(authority.publicKey, poolId, userId);
    await sendTransaction([ix], connection, authority);

    // Verify user account created and initialized correctly
    const userInfo = await connection.getAccountInfo(userKey);
    const user = UserAccount.decode(userInfo.data);
    expect(user.authority).toEqual(authority.publicKey);
    expect(user.poolId).toEqual(poolId);
    expect(user.id).toEqual(userId);
    expect(user.tokenBalances).toHaveLength(16);
  });

  /**
   * Test: Unauthorized User Initialization
   * Flow:
   * 1. Try to initialize user with unauthorized signer
   * Expected: Transaction should fail with unauthorized error
   */
  it("should fail on unauthorized initialization", async () => {
    const ix = await getInitializeUserIx(
      unauthorized.publicKey,
      poolId,
      userId
    );
    await expect(
      sendTransaction([ix], connection, unauthorized)
    ).rejects.toThrow();
  });

  /**
   * Test: Invalid Pool ID
   * Flow:
   * 1. Try to initialize user with non-existent pool ID
   * Expected: Transaction should fail with invalid pool ID error
   */
  it("should fail with invalid pool ID", async () => {
    const invalidPoolId = 99;
    const ix = await getInitializeUserIx(
      authority.publicKey,
      invalidPoolId,
      userId
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });

  /**
   * Test: Duplicate User Initialization
   * Flow:
   * 1. Initialize user first time successfully
   * 2. Try to initialize same user again
   * Expected: Second initialization should fail
   */
  it("should fail on duplicate initialization", async () => {
    // First initialization
    const ix = await getInitializeUserIx(authority.publicKey, poolId, userId);
    await sendTransaction([ix], connection, authority);

    // Try to initialize again
    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });
});
