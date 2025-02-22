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
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { TokenProgram } from "sdk/src/types/tokenProgram";

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

  const testMint = USDC_MINT;
  const poolId = 1;

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

    bankKey = getBankPublicKey(testMint, poolId, PROGRAM_ID);

    // Initialize admin
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    // Initialize pool
    const initPoolIx = await getInitializePoolIx(authority.publicKey);
    await sendTransaction([initPoolIx], connection, authority);
  });

  /**
   * Test: Initialize Bank Successfully
   * Flow:
   * 1. Initialize bank with valid inputs
   * 2. Verify bank account created with correct settings
   * 3. Verify token account created
   * Expected: Bank should be initialized
   */
  it("should initialize bank successfully", async () => {
    // Initialize bank
    const ix = await getInitializeBankIx(
      authority.publicKey,
      testMint,
      poolId,
      TokenProgram.TOKEN_PROGRAM
    );
    await sendTransaction([ix], connection, authority);

    // Verify bank PDA was created
    const bankInfo = await connection.getAccountInfo(bankKey);
    expect(bankInfo).not.toBeNull();

    // TODO: Add bank account data decoding and verification once Bank class is implemented
  });
});
