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
  getWithdrawIx,
  getPoolPublicKey,
  getUserPublicKey,
  getBankTokenAccountPublicKey,
  AdminAccount,
  PoolAccount,
  BankAccount,
  UserAccount,
  BankStatus,
  TokenProgram,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe("Withdraw", () => {
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
  const initialDeposit = 2000000; // 2 USDC
  const withdrawAmount = 1000000; // 1 USDC

  beforeEach(async () => {
    // Initialize test environment
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

    // Setup initial token balance
    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      initialDeposit,
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

    // Initialize core accounts
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    const initPoolIx = await getInitializePoolIx(authority.publicKey, poolId);
    await sendTransaction([initPoolIx], connection, authority);

    const initBankIx = await getInitializeBankIx(
      authority.publicKey,
      testMint,
      poolId,
      bankId,
      TokenProgram.TOKEN_PROGRAM
    );
    await sendTransaction([initBankIx], connection, authority);

    const initUserIx = await getInitializeUserIx(
      authority.publicKey,
      poolId,
      userId
    );
    await sendTransaction([initUserIx], connection, authority);

    bankTokenAccount = getBankTokenAccountPublicKey(bankKey, PROGRAM_ID);

    // Deposit initial balance
    const depositIx = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      initialDeposit,
      userTokenAccount
    );
    await sendTransaction([depositIx], connection, authority);
  });

  /**
   * Test: Successful Withdrawal
   * Flow:
   * 1. Withdraw tokens from bank
   * 2. Verify token transfer
   * 3. Verify user balance updated
   * Expected: Withdrawal succeeds and balances update correctly
   */
  it("should withdraw successfully", async () => {
    // Get initial balances
    const userBalanceBefore = (
      await bankrunContextWrapper.connection.getTokenAccount(userTokenAccount)
    ).amount;
    const bankBalanceBefore = (
      await bankrunContextWrapper.connection.getTokenAccount(bankTokenAccount)
    ).amount;

    // Withdraw
    const ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      withdrawAmount,
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
    expect(userBalanceAfter).toEqual(
      userBalanceBefore + BigInt(withdrawAmount)
    );
    expect(bankBalanceAfter).toEqual(
      bankBalanceBefore - BigInt(withdrawAmount)
    );

    // Verify user account balance updated
    const userInfo = await connection.getAccountInfo(userKey);
    const user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balance).toEqual(
      new anchor.BN(initialDeposit - withdrawAmount)
    );
  });

  /**
   * Test: Insufficient Balance
   * Flow:
   * 1. Try to withdraw more than deposited
   * Expected: Transaction should fail with insufficient balance error
   */
  it("should fail with insufficient balance", async () => {
    const tooMuchAmount = initialDeposit + 1000000; // More than deposited

    const ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      tooMuchAmount,
      userTokenAccount
    );

    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });

  /**
   * Test: Wrong Token Mint
   * Flow:
   * 1. Try to withdraw to an account with different token mint
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

    const ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      withdrawAmount,
      wrongTokenAccount,
      wrongMint,
      TokenProgram.TOKEN_2022_PROGRAM
    );

    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });

  /**
   * Test: Unauthorized Withdrawal
   * Flow:
   * 1. Try to withdraw using unauthorized wallet
   * Expected: Transaction should fail with unauthorized error
   */
  it("should fail with unauthorized user", async () => {
    const unauthorizedTokenAccount = getAssociatedTokenAddressSync(
      testMint,
      unauthorized.publicKey
    );

    context.setAccount(
      constructTokenAccount(
        testMint,
        unauthorized.publicKey,
        0,
        TokenProgram.TOKEN_PROGRAM
      ).address,
      constructTokenAccount(
        testMint,
        unauthorized.publicKey,
        0,
        TokenProgram.TOKEN_PROGRAM
      ).info
    );

    const ix = await getWithdrawIx(
      unauthorized.publicKey,
      userId,
      poolId,
      bankId,
      withdrawAmount,
      unauthorizedTokenAccount
    );

    await expect(
      sendTransaction([ix], connection, unauthorized)
    ).rejects.toThrow();
  });
});
