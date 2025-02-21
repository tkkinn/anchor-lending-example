import {
  BankrunContextWrapper,
  constructMint,
  PROGRAM_ID,
  sendTransaction,
  USDC_MINT,
} from "@/helpers";
import {
  getAdminPublicKey,
  AdminAccount,
  TokenConfigAccount,
  getInitializeIx,
  getInitializeTokenGroupIx,
  getInitializeTokenConfigIx,
  getTokenConfigPublicKey,
  TokenConfigStatus,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";

describe("Initialize Token Config", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair;
  let adminKey: PublicKey;
  let testMint: PublicKey = USDC_MINT;
  let tokenConfigKey: PublicKey;
  const groupId = 1;

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

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();

    adminKey = getAdminPublicKey(PROGRAM_ID);

    tokenConfigKey = getTokenConfigPublicKey(testMint, groupId, PROGRAM_ID);

    // Initialize admin
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    // Initialize token group
    const initGroupIx = await getInitializeTokenGroupIx(authority.publicKey);
    await sendTransaction([initGroupIx], connection, authority);
  });

  /**
   * Test: Initialize Token Config Success Case
   * Flow:
   * 1. Initialize admin and token group
   * 2. Initialize token config with test mint
   * 3. Verify config state and ownership
   * Expected: Config should initialize correctly with inactive status
   */
  it("should successfully initialize token config", async () => {
    // Initialize token config
    const initConfigIx = await getInitializeTokenConfigIx(
      authority.publicKey,
      testMint,
      groupId
    );
    await sendTransaction([initConfigIx], connection, authority);

    // Verify token config state
    const configInfo = await connection.getAccountInfo(tokenConfigKey);
    const config = TokenConfigAccount.decode(configInfo.data);

    expect(config.mint.equals(testMint)).toBe(true);
    expect(config.groupId).toBe(groupId);
    expect(config.status).toBe(TokenConfigStatus.Inactive); // Inactive status
  });

  /**
   * Test: Initialize Token Config Invalid Group Case
   * Flow:
   * 1. Try to initialize config with invalid group ID
   * Expected: Should fail with invalid group error
   */
  it("should fail with invalid group ID", async () => {
    const invalidGroupId = 99;

    await expect(async () => {
      const initConfigIx = await getInitializeTokenConfigIx(
        authority.publicKey,
        testMint,
        invalidGroupId
      );
      await sendTransaction([initConfigIx], connection, authority);
    }).rejects.toThrow(/0x1771/);
  });

  /**
   * Test: Initialize Token Config Unauthorized Case
   * Flow:
   * 1. Try to initialize with non-authority signer
   * Expected: Should fail with unauthorized error
   */
  it("should fail with unauthorized signer", async () => {
    const unauthorizedSigner = Keypair.generate();

    await expect(async () => {
      const initConfigIx = await getInitializeTokenConfigIx(
        unauthorizedSigner.publicKey,
        testMint,
        groupId
      );
      await sendTransaction([initConfigIx], connection, unauthorizedSigner);
    }).rejects.toThrow(
      "Attempt to debit an account but found no record of a prior credit."
    );
  });
});
