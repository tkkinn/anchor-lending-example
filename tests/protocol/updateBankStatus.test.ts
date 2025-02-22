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
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { TokenProgram } from "sdk/src/types/tokenProgram";

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
  const poolId = 1;
  const initialStatus = 0;
  const newStatus = 1;

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
   * 1. Update bank status with valid inputs
   * 2. Verify bank status updated
   * Expected: Bank status should be updated
   */
  it("should update bank status successfully", async () => {
    // Update bank status
    const ix = await getUpdateBankStatusIx(
      authority.publicKey,
      testMint,
      newStatus,
      poolId
    );
    await sendTransaction([ix], connection, authority);

    // Verify bank status updated
    // TODO: Add bank account data decoding and verification once Bank class is implemented
  });
});
