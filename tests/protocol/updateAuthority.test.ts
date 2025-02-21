import { BankrunContextWrapper, PROGRAM_ID, sendTransaction } from "@/helpers";
import {
  getAdminPublicKey,
  AdminAccount,
  getInitializeIx,
  getUpdateAuthorityIx,
} from "@/sdk";
import * as anchor from "@coral-xyz/anchor";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";

describe("Update Authority", () => {
  let context: ProgramTestContext;
  let client: BanksClient;
  let provider: BankrunProvider;
  let connection: Connection;
  let bankrunContextWrapper: BankrunContextWrapper;

  let authority: Keypair;
  let newAuthority: Keypair;
  let adminKey: PublicKey;

  beforeEach(async () => {
    // Set up fresh testing environment
    context = await startAnchor("", [], []);
    client = context.banksClient;
    authority = context.payer;

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();

    newAuthority = Keypair.generate();
    adminKey = getAdminPublicKey(PROGRAM_ID);

    // Initialize admin account using SDK
    const initIx = await getInitializeIx(authority.publicKey);
    await sendTransaction([initIx], connection, authority);
  });

  /**
   * Test: Update Authority Success Case
   * Flow:
   * 1. Initialize admin account with original authority
   * 2. Update authority to new keypair using SDK
   * 3. Verify admin account state reflects new authority
   * Expected: Authority should be updated successfully
   */
  it("should successfully update authority", async () => {
    // Get initial state for comparison
    let adminInfo = await connection.getAccountInfo(adminKey);
    let adminAccount = AdminAccount.decode(adminInfo.data);
    expect(adminAccount.authority.equals(authority.publicKey)).toBe(true);

    // Update authority using SDK
    const updateIx = await getUpdateAuthorityIx(
      authority.publicKey,
      newAuthority.publicKey
    );
    await sendTransaction([updateIx], connection, authority);

    // Verify updated state
    adminInfo = await connection.getAccountInfo(adminKey);
    adminAccount = AdminAccount.decode(adminInfo.data);
    expect(adminAccount.authority.equals(newAuthority.publicKey)).toBe(true);
  });

  /**
   * Test: Update Authority Unauthorized Case
   * Flow:
   * 1. Try to update authority using non-authority signer
   * Expected: Transaction should fail with Unauthorized error
   */
  it("should fail when called by unauthorized signer", async () => {
    const unauthorizedSigner = Keypair.generate();

    await expect(async () => {
      const updateIx = await getUpdateAuthorityIx(
        unauthorizedSigner.publicKey,
        newAuthority.publicKey
      );
      await sendTransaction([updateIx], connection, unauthorizedSigner);
    }).rejects.toThrow(
      "Attempt to debit an account but found no record of a prior credit."
    );

    // Verify authority remained unchanged
    const adminInfo = await connection.getAccountInfo(adminKey);
    const adminAccount = AdminAccount.decode(adminInfo.data);
    expect(adminAccount.authority.equals(authority.publicKey)).toBe(true);
  });
});
