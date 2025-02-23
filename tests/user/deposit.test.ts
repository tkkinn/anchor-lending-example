import {
  BankrunContextWrapper,
  constructMint,
  constructTokenAccount,
  PROGRAM_ID,
  PYUSD_MINT,
  sendTransaction,
  USDC_MINT,
} from "@/helpers";
import {
  getAdminPublicKey,
  getBankPublicKey,
  getInitializeIx,
  getInitializePoolIx,
  getInitializeBankIx,
  getInitializeUserIx,
  getDepositIx,
  getPoolPublicKey,
  getUserPublicKey,
  getBankTokenAccountPublicKey,
  AdminAccount,
  PoolAccount,
  BankAccount,
  UserAccount,
  BankStatus,
  TokenProgram,
  getUpdateBankStatusIx,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

describe("Deposit", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair = anchor.Wallet.local().payer;
  let unauthorized: Keypair;
  let adminKey: PublicKey;
  let bankKey: PublicKey;
  let poolKey: PublicKey;
  let userKey: PublicKey;
  let userTokenAccount: PublicKey;
  let bankTokenAccount: PublicKey;

  const testMint = USDC_MINT;
  const poolId = 0;
  const bankId = 0;
  const userId = 0;
  const depositAmount = 1000000; // 1 USDC

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
        constructMint(
          PYUSD_MINT,
          0,
          PublicKey.default,
          0,
          6,
          0,
          PublicKey.default,
          TokenProgram.TOKEN_2022_PROGRAM
        ),
      ]
    );
    client = context.banksClient;
    authority = context.payer;
    unauthorized = Keypair.generate();

    userTokenAccount = getAssociatedTokenAddressSync(
      testMint,
      authority.publicKey
    );

    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      depositAmount,
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();

    adminKey = getAdminPublicKey(PROGRAM_ID);
    poolKey = getPoolPublicKey(poolId, PROGRAM_ID);
    bankKey = getBankPublicKey(poolId, bankId, PROGRAM_ID);
    userKey = getUserPublicKey(poolId, userId, authority.publicKey, PROGRAM_ID);

    // Initialize admin and pool
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    const initPoolIx = await getInitializePoolIx(authority.publicKey, poolId);
    await sendTransaction([initPoolIx], connection, authority);

    // Initialize bank
    const initBankIx = await getInitializeBankIx(
      authority.publicKey,
      testMint,
      0,
      0,
      TokenProgram.TOKEN_PROGRAM
    );
    await sendTransaction([initBankIx], connection, authority);

    // Initialize user
    const initUserIx = await getInitializeUserIx(
      authority.publicKey,
      poolId,
      userId
    );
    await sendTransaction([initUserIx], connection, authority);

    bankTokenAccount = getBankTokenAccountPublicKey(bankKey, PROGRAM_ID);

    // Set bank to Active status after initialization
    const updateStatusIx = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.Active,
      poolId,
      bankId
    );
    await sendTransaction([updateStatusIx], connection, authority);
  });

  /**
   * Test: Successful Deposit
   * Flow:
   * 1. Deposit tokens
   * 2. Verify token transfer
   * 3. Verify user balance updated
   * Expected: Deposit succeeds and balances update correctly
   */
  it("should deposit successfully", async () => {
    // Get initial balances
    const userBalanceBefore = (
      await bankrunContextWrapper.connection.getTokenAccount(userTokenAccount)
    ).amount;
    const bankBalanceBefore = (
      await bankrunContextWrapper.connection.getTokenAccount(bankTokenAccount)
    ).amount;

    // Deposit
    const ix = await getDepositIx(
      authority.publicKey,
      0,
      0,
      0,
      depositAmount,
      userTokenAccount
    );
    await sendTransaction([ix], connection, authority);

    // Verify token transfer
    const userBalanceAfter = (
      await bankrunContextWrapper.connection.getTokenAccount(userTokenAccount)
    ).amount;
    const bankBalanceAfter = (
      await bankrunContextWrapper.connection.getTokenAccount(bankTokenAccount)
    ).amount;
    expect(userBalanceAfter).toEqual(userBalanceBefore - BigInt(depositAmount));
    expect(bankBalanceAfter).toEqual(bankBalanceBefore + BigInt(depositAmount));

    // Verify user account balance updated
    const userInfo = await connection.getAccountInfo(userKey);
    const user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balance).toEqual(new anchor.BN(depositAmount));
  });

  /**
   * Test: Wrong Token Mint
   * Flow:
   * 1. Create account with different token mint
   * 2. Try to deposit from that account
   * Expected: Transaction should fail with token mint mismatch error
   */
  it("should fail with wrong token mint", async () => {
    const wrongMint = PYUSD_MINT;
    const wrongTokenAccount = getAssociatedTokenAddressSync(
      wrongMint,
      authority.publicKey
    );
    context.setAccount(
      constructTokenAccount(
        wrongMint,
        authority.publicKey,
        0,
        TokenProgram.TOKEN_2022_PROGRAM
      ).address,
      constructTokenAccount(
        wrongMint,
        authority.publicKey,
        0,
        TokenProgram.TOKEN_2022_PROGRAM
      ).info
    );
    const ix = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      depositAmount,
      wrongTokenAccount,
      wrongMint,
      TokenProgram.TOKEN_2022_PROGRAM
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });

  /**
   * Test: Deposit with Inactive Bank
   * Flow:
   * 1. Set bank status to Inactive
   * 2. Try to deposit tokens
   * Expected: Transaction should fail with invalid bank status error
   */
  it("should fail with inactive bank", async () => {
    // Set bank to Inactive status
    const updateStatusIx = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.Inactive,
      poolId,
      bankId
    );
    await sendTransaction([updateStatusIx], connection, authority);

    // Attempt deposit
    const ix = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      depositAmount,
      userTokenAccount
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });

  /**
   * Test: Deposit with ReduceOnly Bank
   * Flow:
   * 1. Set bank status to ReduceOnly
   * 2. Try to deposit tokens
   * Expected: Transaction should fail with invalid bank status error
   */
  it("should fail with reduce-only bank", async () => {
    // Set bank to ReduceOnly status
    const updateStatusIx = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.ReduceOnly,
      poolId,
      bankId
    );
    await sendTransaction([updateStatusIx], connection, authority);

    // Attempt deposit
    const ix = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      depositAmount,
      userTokenAccount
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });
});
