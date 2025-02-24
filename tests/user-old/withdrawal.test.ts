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
  getUpdateBankStatusIx,
  BalanceType,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

jest.retryTimes(3);
describe("Withdraw", () => {
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
  const initialDeposit = 2000000; // 2 USDC
  const secondUserDepositAmount = 1000000000; // 1000 USDC
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
    secondUser = Keypair.generate();

    userTokenAccount = getAssociatedTokenAddressSync(
      testMint,
      authority.publicKey
    );
    secondUserTokenAccount = getAssociatedTokenAddressSync(
      testMint,
      secondUser.publicKey
    );

    // Setup initial token balance
    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      initialDeposit,
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

    // Deposit initial balances
    const depositIx = await getDepositIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      initialDeposit,
      userTokenAccount
    );
    await sendTransaction([depositIx], connection, authority);

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
      userTokenAccount,
      [0]
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
      userTokenAccount,
      [0]
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
      [0],
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
      unauthorizedTokenAccount,
      [0]
    );

    await expect(
      sendTransaction([ix], connection, unauthorized)
    ).rejects.toThrow();
  });

  /**
   * Test: Withdrawal with ReduceOnly Bank
   * Flow:
   * 1. Set bank status to ReduceOnly
   * 2. Try to withdraw tokens
   * Expected: Transaction should succeed since ReduceOnly allows withdrawals
   */
  it("should succeed with reduce-only bank", async () => {
    // Set bank to ReduceOnly status
    const updateStatusIx = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.ReduceOnly,
      poolId,
      bankId
    );
    await sendTransaction([updateStatusIx], connection, authority);

    // Attempt withdrawal
    const ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      withdrawAmount,
      userTokenAccount,
      [0]
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).resolves.not.toThrow();

    // Verify user account balance updated
    const userInfo = await connection.getAccountInfo(userKey);
    const user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balance).toEqual(
      new anchor.BN(initialDeposit - withdrawAmount)
    );
  });

  /**
   * Test: Withdrawal with Inactive Bank
   * Flow:
   * 1. Set bank status to Inactive
   * 2. Try to withdraw tokens
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

    // Attempt withdrawal
    const ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      withdrawAmount,
      userTokenAccount,
      [0]
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).rejects.toThrow();
  });

  /**
   * Test: Create Liability Position from Collateral
   * Flow:
   * 1. Withdraw more than deposited amount
   * 2. Verify conversion from collateral to liability
   * Expected: Should convert collateral to liability for excess amount
   */
  it("should convert collateral to liability on excess withdrawal", async () => {
    // Calculate withdrawal amount that exceeds collateral
    const excessAmount = new anchor.BN(500000);
    const totalWithdrawal = new anchor.BN(initialDeposit).add(excessAmount);

    // Add extra balance to user token account for withdrawal
    const userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      totalWithdrawal.toNumber(),
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);

    // Withdraw more than deposited
    const ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      totalWithdrawal.toNumber(),
      userTokenAccount,
      [0]
    );
    await sendTransaction([ix], connection, authority);

    // Verify position converted to liability
    const userInfo = await connection.getAccountInfo(userKey);
    const user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balanceType).toBe(BalanceType.Liability);
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(
      excessAmount.toNumber()
    );
  });

  /**
   * Test: Accumulate Additional Liability
   * Flow:
   * 1. Create initial liability
   * 2. Withdraw more to add to liability
   * Expected: Should add to existing liability amount
   */
  it("should accumulate additional liability", async () => {
    // First create initial liability
    const initialExcess = new anchor.BN(500000);
    const firstWithdrawal = new anchor.BN(initialDeposit).add(initialExcess);

    // Add balance for first withdrawal
    let userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      firstWithdrawal.toNumber(),
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);

    // Make first withdrawal
    let ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      firstWithdrawal.toNumber(),
      userTokenAccount,
      [0]
    );
    await sendTransaction([ix], connection, authority);

    // Verify initial liability
    let userInfo = await connection.getAccountInfo(userKey);
    let user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balanceType).toBe(BalanceType.Liability);
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(
      initialExcess.toNumber()
    );

    // Add more liability with second withdrawal
    const additionalExcess = new anchor.BN(300000);

    // Add balance for second withdrawal
    userTokenAccountInfo = constructTokenAccount(
      testMint,
      authority.publicKey,
      additionalExcess.toNumber(),
      TokenProgram.TOKEN_PROGRAM
    );
    context.setAccount(userTokenAccount, userTokenAccountInfo.info);

    // Make second withdrawal
    ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      additionalExcess.toNumber(),
      userTokenAccount,
      [0]
    );
    await sendTransaction([ix], connection, authority);

    // Verify increased liability
    userInfo = await connection.getAccountInfo(userKey);
    user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balanceType).toBe(BalanceType.Liability);
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(
      initialExcess.add(additionalExcess).toNumber()
    );
  });

  /**
   * Test: Exact Collateral Boundary Withdrawal
   * Flow:
   * 1. Withdraw exactly the collateral amount
   * Expected: Balance should become zero, no liability created
   */
  it("should handle exact collateral withdrawal", async () => {
    // Withdraw exactly the deposited amount
    const ix = await getWithdrawIx(
      authority.publicKey,
      userId,
      poolId,
      bankId,
      initialDeposit,
      userTokenAccount,
      [0]
    );
    await sendTransaction([ix], connection, authority);

    // Verify balance becomes zero with no liability
    const userInfo = await connection.getAccountInfo(userKey);
    const user = UserAccount.decode(userInfo.data);
    expect(user.tokenBalances[0].balance.toNumber()).toEqual(0);
    expect(user.tokenBalances[0].balanceType).toBe(BalanceType.Collateral);
  });
});
