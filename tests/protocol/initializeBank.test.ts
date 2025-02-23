import {
  BankrunContextWrapper,
  constructMint,
  PROGRAM_ID,
  sendTransaction,
  USDC_MINT,
} from "@/helpers";
import {
  getAdminPublicKey,
  getBankPublicKey,
  getInitializeIx,
  getInitializePoolIx,
  getInitializeBankIx,
  getPoolPublicKey,
  AdminAccount,
  PoolAccount,
  BankAccount,
  BankStatus,
  getBankTokenAccountPublicKey,
  TokenProgram,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";

describe("Initialize Bank", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair;
  let unauthorized: Keypair;
  let adminKey: PublicKey;
  let bankKey: PublicKey;
  let poolKey: PublicKey;

  const testMint = USDC_MINT;
  const poolId = 0;
  const bankId = 0;

  beforeEach(async () => {
    // Set up testing environment
    context = await startAnchor(
      "",
      [],
      [
        constructMint(
          USDC_MINT,
          0,
          PublicKey.default,
          0,
          6,
          0,
          PublicKey.default
        ),
      ]
    );
    client = context.banksClient;
    authority = context.payer;
    unauthorized = Keypair.generate();

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();

    adminKey = getAdminPublicKey(PROGRAM_ID);
    poolKey = getPoolPublicKey(poolId, PROGRAM_ID);
    bankKey = getBankPublicKey(poolId, bankId, PROGRAM_ID);

    // Initialize admin and pool
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    const initPoolIx = await getInitializePoolIx(authority.publicKey, poolId);
    await sendTransaction([initPoolIx], connection, authority);
  });

  /**
   * Test: Initialize Bank Successfully
   * Flow:
   * 1. Initialize bank with valid inputs
   * 2. Verify bank account created with correct settings
   * 3. Verify token account created
   * 4. Verify pool bank count incremented
   * Expected: Bank and token account initialized correctly
   */
  it("should initialize bank successfully", async () => {
    // Get initial pool state
    const poolInfoBefore = await connection.getAccountInfo(poolKey);
    const poolBefore = PoolAccount.decode(poolInfoBefore.data);
    const expectedBankId = poolBefore.bankCount;

    // Initialize bank
    const ix = await getInitializeBankIx(
      authority.publicKey,
      testMint,
      poolId,
      TokenProgram.TOKEN_PROGRAM
    );
    await sendTransaction([ix], connection, authority);

    // Verify bank account created and initialized correctly
    const bankInfo = await connection.getAccountInfo(bankKey);
    const bank = BankAccount.decode(bankInfo.data);
    expect(bank.mint).toEqual(testMint);
    expect(bank.poolId).toEqual(poolId);
    expect(bank.bankId).toEqual(expectedBankId);
    expect(bank.status).toEqual(BankStatus.Inactive);

    // Verify token account created
    const tokenAccountKey = getBankTokenAccountPublicKey(bankKey, PROGRAM_ID);
    const tokenAccountInfo = await connection.getAccountInfo(tokenAccountKey);
    expect(tokenAccountInfo).not.toBeNull();

    // Verify pool bank count incremented
    const poolInfoAfter = await connection.getAccountInfo(poolKey);
    const poolAfter = PoolAccount.decode(poolInfoAfter.data);
    expect(poolAfter.bankCount).toEqual(poolBefore.bankCount + 1);
  });

  /**
   * Test: Unauthorized Bank Initialization
   * Flow:
   * 1. Try to initialize bank with unauthorized signer
   * Expected: Transaction should fail with unauthorized error
   */
  it("should fail on unauthorized initialization", async () => {
    const ix = await getInitializeBankIx(
      unauthorized.publicKey,
      testMint,
      poolId,
      TokenProgram.TOKEN_PROGRAM
    );
    await expect(
      sendTransaction([ix], connection, unauthorized)
    ).rejects.toThrow();
  });

  /**
   * Test: Invalid Pool ID
   * Flow:
   * 1. Try to initialize bank with non-existent pool ID
   * Expected: Transaction should fail with invalid pool ID error
   */
  it("should fail with invalid pool ID", async () => {
    const invalidPoolId = 99; // Pool that doesn't exist
    const ix = await getInitializeBankIx(
      authority.publicKey,
      testMint,
      invalidPoolId,
      TokenProgram.TOKEN_PROGRAM
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });
});
