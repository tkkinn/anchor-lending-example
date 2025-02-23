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
  getUpdateBankStatusIx,
  BankAccount,
  BankStatus,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { TokenProgram } from "@/sdk";

describe("Update Bank Status", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair;
  let unauthorized: Keypair;
  let adminKey: PublicKey;
  let bankKey: PublicKey;

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
    bankKey = getBankPublicKey(poolId, bankId, PROGRAM_ID);

    // Initialize admin
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    // Initialize pool
    const initPoolIx = await getInitializePoolIx(authority.publicKey, poolId);
    await sendTransaction([initPoolIx], connection, authority);

    // Initialize bank
    const initBankIx = await getInitializeBankIx(
      authority.publicKey,
      testMint,
      poolId,
      TokenProgram.TOKEN_PROGRAM
    );
    await sendTransaction([initBankIx], connection, authority);
  });

  /**
   * Test: Update Bank Status Successfully
   * Flow:
   * 1. Update bank status to Active
   * 2. Verify status updated
   * Expected: Bank status should be Active
   */
  it("should update bank status to Active", async () => {
    // Update bank status
    const ix = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.Active,
      poolId,
      bankId
    );
    await sendTransaction([ix], connection, authority);

    // Verify bank status updated
    const bankInfo = await connection.getAccountInfo(bankKey);
    const bank = BankAccount.decode(bankInfo.data);
    expect(bank.status).toBe(BankStatus.Active);
  });

  /**
   * Test: Update Bank Status to Reduce Only
   * Flow:
   * 1. Update bank status to ReduceOnly
   * 2. Verify status updated
   * Expected: Bank status should be ReduceOnly
   */
  it("should update bank status to ReduceOnly", async () => {
    const ix = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.ReduceOnly,
      poolId,
      bankId
    );
    await sendTransaction([ix], connection, authority);

    const bankInfo = await connection.getAccountInfo(bankKey);
    const bank = BankAccount.decode(bankInfo.data);
    expect(bank.status).toBe(BankStatus.ReduceOnly);
  });

  /**
   * Test: Update to Same Status
   * Flow:
   * 1. Update bank status to same current value
   * Expected: Transaction should succeed
   */
  it("should allow updating to same status", async () => {
    const bankInfo = await connection.getAccountInfo(bankKey);
    const bank = BankAccount.decode(bankInfo.data);
    const currentStatus = bank.status;

    const ix = await getUpdateBankStatusIx(
      authority.publicKey,
      currentStatus,
      poolId,
      bankId
    );
    await expect(
      sendTransaction([ix], connection, authority)
    ).resolves.not.toThrow();
  });

  /**
   * Test: Invalid Status Value
   * Flow:
   * 1. Try to update bank status to invalid value
   * Expected: Function should throw error during parameter validation
   */
  it("should fail with invalid status value", () => {
    const invalidStatus = 3; // Beyond ReduceOnly(2)

    expect(() =>
      getUpdateBankStatusIx(
        authority.publicKey,
        invalidStatus as BankStatus,
        poolId,
        bankId
      )
    ).rejects.toThrow("Invalid bank status value");
  });

  /**
   * Test: Unauthorized Status Update
   * Flow:
   * 1. Try to update status with unauthorized signer
   * Expected: Transaction should fail with unauthorized error
   */
  it("should fail on unauthorized update", async () => {
    const ix = await getUpdateBankStatusIx(
      unauthorized.publicKey,
      BankStatus.Active,
      poolId,
      bankId
    );
    await expect(
      sendTransaction([ix], connection, unauthorized)
    ).rejects.toThrow();
  });

  /**
   * Test: Status Transition Chain
   * Flow:
   * 1. Inactive -> Active -> ReduceOnly -> Inactive
   * Expected: All transitions should succeed
   */
  it("should allow full status transition chain", async () => {
    // Inactive -> Active
    let ix = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.Active,
      poolId,
      bankId
    );
    await sendTransaction([ix], connection, authority);

    let bankInfo = await connection.getAccountInfo(bankKey);
    let bank = BankAccount.decode(bankInfo.data);
    expect(bank.status).toBe(BankStatus.Active);

    // Active -> ReduceOnly
    ix = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.ReduceOnly,
      poolId,
      bankId
    );
    await sendTransaction([ix], connection, authority);

    bankInfo = await connection.getAccountInfo(bankKey);
    bank = BankAccount.decode(bankInfo.data);
    expect(bank.status).toBe(BankStatus.ReduceOnly);

    // ReduceOnly -> Inactive
    ix = await getUpdateBankStatusIx(
      authority.publicKey,
      BankStatus.Inactive,
      poolId,
      bankId
    );
    await sendTransaction([ix], connection, authority);

    bankInfo = await connection.getAccountInfo(bankKey);
    bank = BankAccount.decode(bankInfo.data);
    expect(bank.status).toBe(BankStatus.Inactive);
  });
});
