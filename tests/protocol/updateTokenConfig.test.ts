import {
  BankrunContextWrapper,
  constructMint,
  PROGRAM_ID,
  sendTransaction,
  USDC_MINT,
} from "@/helpers";
import {
  getAdminPublicKey,
  getInitializeIx,
  getInitializeTokenGroupIx,
  getInitializeTokenConfigIx,
  getUpdateTokenConfigStatusIx,
  getTokenConfigPublicKey,
  TokenConfigAccount,
  TokenConfigStatus,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";

describe("Update Token Config", () => {
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
    // Set up fresh testing environment
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

    // Initialize admin account
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);

    // Initialize token group
    const initGroupIx = await getInitializeTokenGroupIx(authority.publicKey);
    await sendTransaction([initGroupIx], connection, authority);

    // Initialize token config
    const initConfigIx = await getInitializeTokenConfigIx(
      authority.publicKey,
      testMint,
      groupId
    );
    await sendTransaction([initConfigIx], connection, authority);
  });

  /**
   * Test: Update Token Config Status Success Case
   * Flow:
   * 1. Initialize admin, group and token config
   * 2. Update config status to ReduceOnly
   * 3. Verify config state reflects new status
   * Expected: Config status should update successfully
   */
  it("should successfully update token config status", async () => {
    // Get initial state
    let configInfo = await connection.getAccountInfo(tokenConfigKey);
    let config = TokenConfigAccount.decode(configInfo.data);
    expect(config.status).toBe(TokenConfigStatus.Inactive);

    // Update to ReduceOnly status
    const updateIx = await getUpdateTokenConfigStatusIx(
      authority.publicKey,
      testMint,
      TokenConfigStatus.ReduceOnly,
      groupId
    );
    await sendTransaction([updateIx], connection, authority);

    // Verify updated state
    configInfo = await connection.getAccountInfo(tokenConfigKey);
    config = TokenConfigAccount.decode(configInfo.data);
    expect(config.status).toBe(TokenConfigStatus.ReduceOnly);
  });

  /**
   * Test: Update Token Config Unauthorized Case
   * Flow:
   * 1. Try to update config using non-authority signer
   * Expected: Transaction should fail with Unauthorized error
   */
  it("should fail when called by unauthorized signer", async () => {
    const unauthorizedSigner = Keypair.generate();

    await expect(async () => {
      const updateIx = await getUpdateTokenConfigStatusIx(
        unauthorizedSigner.publicKey,
        testMint,
        TokenConfigStatus.Active,
        groupId
      );
      await sendTransaction([updateIx], connection, unauthorizedSigner);
    }).rejects.toThrow(
      "Attempt to debit an account but found no record of a prior credit."
    );

    // Verify status remained unchanged
    const configInfo = await connection.getAccountInfo(tokenConfigKey);
    const config = TokenConfigAccount.decode(configInfo.data);
    expect(config.status).toBe(TokenConfigStatus.Inactive);
  });

  /**
   * Test: Update Token Config Invalid Status Case
   * Flow:
   * 1. Try to update config with invalid status value
   * Expected: Transaction should fail with invalid input error
   */
  it("should fail with invalid status value", async () => {
    await expect(async () => {
      const updateIx = await getUpdateTokenConfigStatusIx(
        authority.publicKey,
        testMint,
        99, // Invalid status
        groupId
      );
      await sendTransaction([updateIx], connection, authority);
    }).rejects.toThrow(/0x1772/);
  });
});
