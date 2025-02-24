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
  UserAccount,
  BankStatus,
  TokenProgram,
  getUpdateBankStatusIx,
  BalanceType,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe("Deposit", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair = anchor.Wallet.local().payer;
  let unauthorized: Keypair;
  let secondUser: Keypair;
  let adminKey: PublicKey;
  let bankKey: PublicKey;
  let poolKey: PublicKey;
  let userKey: PublicKey;
  let secondUserKey: PublicKey;
  let userTokenAccount: PublicKey;
  let secondUserTokenAccount: PublicKey;
  let bankTokenAccount: PublicKey;

  const testMint = USDC_MINT;
  const poolId = 0;
  const bankId = 0;
  const userId = 0;
  const secondUserId = 1;
  const depositAmount = 1000000; // 1 USDC
  const secondUserDepositAmount = 1000000000; // 1000 USDC

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
    secondUser = Keypair.generate();

    userTokenAccount = getAssociatedTokenAddressSync(
      testMint,
      authority.publicKey
    );
    secondUserTokenAccount = getAssociatedTokenAddressSync(
      testMint,
      secondUser.publicKey
    );

    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      depositAmount,
      TokenProgram.TOKEN_PROGRAM
    );
    const secondUserTokenAccountInfo = constructTokenAccount(
      testMint,
      secondUser.publicKey,
      secondUserDepositAmount,
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);
    context.setAccount(secondUserTokenAccount, secondUserTokenAccountInfo.info);

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();
    bankrunContextWrapper.fundKeypair(secondUser, 1000000000);

    adminKey = getAdminPublicKey(PROGRAM_ID);
    poolKey = getPoolPublicKey(poolId, PROGRAM_ID);
    bankKey = getBankPublicKey(poolId, bankId, PROGRAM_ID);
    userKey = getUserPublicKey(poolId, userId, authority.publicKey, PROGRAM_ID);
    secondUserKey = getUserPublicKey(
      poolId,
      secondUserId,
      secondUser.publicKey,
      PROGRAM_ID
    );

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

    // Initialize users
    const initUserIx = await getInitializeUserIx(
      authority.publicKey,
      poolId,
      userId
    );
    const initSecondUserIx = await getInitializeUserIx(
      secondUser.publicKey,
      poolId,
      secondUserId
    );
    await sendTransaction([initUserIx], connection, authority);
    await sendTransaction([initSecondUserIx], connection, secondUser);

    bankTokenAccount = getBankTokenAccountPublicKey(bankKey, PROGRAM_ID);

    // Set bank to Active status after initialization
    const updateStatusIx = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.Active,
      poolId,
      bankId
    );
    await sendTransaction([updateStatusIx], connection, authority);

    // Deposit initial balance for second user
    const secondUserDepositIx = await getDepositIx(
      secondUser.publicKey,
      secondUserId,
      poolId,
      bankId,
      secondUserDepositAmount,
      secondUserTokenAccount
    );
    await sendTransaction([secondUserDepositIx], connection, secondUser);
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
      userId,
      poolId,
      bankId,
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
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(depositAmount);
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

  /**
   * Test: Repay Liability with Exact Amount
   * Flow:
   * 1. Create liability by withdrawing more than balance
   * 2. Deposit exact liability amount
   * Expected: Liability should be fully repaid
   */
  it("should repay liability with exact amount", async () => {
    // First create a liability
    const excessWithdrawAmount = new anchor.BN(depositAmount).add(
      new anchor.BN(1000000)
    );
    const withdrawIx = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      excessWithdrawAmount.toNumber(),
      userTokenAccount,
      [0]
    );
    await sendTransaction([withdrawIx], connection, authority);

    // Verify liability created
    let userInfo = await connection.getAccountInfo(userKey);
    let user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balanceType).toBe(BalanceType.Liability);
    const liabilityAmount = user.tokenBalances[0].balance;

    // Add funds to user token account for repayment
    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      liabilityAmount.toNumber(),
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);

    // Repay the exact liability amount
    const repayIx = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      liabilityAmount.toNumber(),
      userTokenAccount
    );
    await sendTransaction([repayIx], connection, authority);

    // Verify liability fully repaid (balance should be 0)
    userInfo = await connection.getAccountInfo(userKey);
    user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(0);
  });

  /**
   * Test: Repay Liability with Excess Amount
   * Flow:
   * 1. Create liability
   * 2. Deposit more than liability amount
   * Expected: Remaining amount should convert to collateral
   */
  it("should convert excess repayment to collateral", async () => {
    // Create initial liability
    const excessWithdrawAmount = new anchor.BN(depositAmount).add(
      new anchor.BN(1000000)
    );
    const withdrawIx = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      excessWithdrawAmount.toNumber(),
      userTokenAccount,
      [0]
    );
    await sendTransaction([withdrawIx], connection, authority);

    // Get liability amount
    let userInfo = await connection.getAccountInfo(userKey);
    let user = UserAccount.decode(userInfo.data);
    const liabilityAmount = user.tokenBalances[0].balance;

    // Calculate deposit with excess
    const excess = new anchor.BN(500000);
    const repaymentAmount = liabilityAmount.add(excess);

    // Add funds for repayment plus extra
    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      repaymentAmount.toNumber(),
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);

    // Deposit more than liability
    const repayIx = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      repaymentAmount.toNumber(),
      userTokenAccount
    );
    await sendTransaction([repayIx], connection, authority);

    // Verify conversion to collateral
    userInfo = await connection.getAccountInfo(userKey);
    user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balanceType).toBe(BalanceType.Collateral);
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(excess.toNumber());
  });

  /**
   * Test: Partial Liability Repayment
   * Flow:
   * 1. Create liability
   * 2. Deposit less than liability amount
   * Expected: Liability should be reduced but not eliminated
   */
  it("should partially repay liability", async () => {
    // Create initial liability
    const excessWithdrawAmount = new anchor.BN(depositAmount).add(
      new anchor.BN(2000000)
    );
    const withdrawIx = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      excessWithdrawAmount.toNumber(),
      userTokenAccount,
      [0]
    );
    await sendTransaction([withdrawIx], connection, authority);

    // Get initial liability amount
    let userInfo = await connection.getAccountInfo(userKey);
    let user = UserAccount.decode(userInfo.data);
    const initialLiability = user.tokenBalances[0].balance;

    // Calculate partial repayment (half of liability)
    const partialRepayment = initialLiability.div(new anchor.BN(2));

    // Add funds for partial repayment
    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      partialRepayment.toNumber(),
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);

    // Make partial repayment
    const repayIx = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      partialRepayment.toNumber(),
      userTokenAccount
    );
    await sendTransaction([repayIx], connection, authority);

    // Verify reduced liability
    userInfo = await connection.getAccountInfo(userKey);
    user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balanceType).toBe(BalanceType.Liability);
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(
      initialLiability.sub(partialRepayment).toNumber()
    );
  });
});
