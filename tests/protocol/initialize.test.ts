import * as anchor from "@coral-xyz/anchor";
import { BanksClient, ProgramTestContext, startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BankrunContextWrapper, PROGRAM_ID, sendTransaction } from "@/helpers";
import { getAdminPublicKey, getInitializeIx, AdminAccount } from "@/sdk";

let context: ProgramTestContext;
let client: BanksClient;
let provider: BankrunProvider;
let connection: Connection;
let bankrunContextWrapper: BankrunContextWrapper;

let wallet: Keypair;

describe("Protocol Admin Functions", () => {
  let adminKey: PublicKey;

  beforeEach(async () => {
    // Set up fresh testing environment before each test
    context = await startAnchor("", [], []);
    client = context.banksClient;
    wallet = context.payer;

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    bankrunContextWrapper = new BankrunContextWrapper(context);
    connection = bankrunContextWrapper.connection.toConnection();
    adminKey = getAdminPublicKey(PROGRAM_ID);
  });

  describe("initialize", () => {
    /**
     * Test: Initialize Admin Account
     * Flow:
     * 1. Create initialize instruction with wallet as authority
     * 2. Send and execute transaction
     * 3. Fetch and decode admin account data
     * Expected: Admin account should be created with wallet as authority
     */
    it("should initialize admin account", async () => {
      const ix = await getInitializeIx(wallet.publicKey);
      await sendTransaction([ix], connection, wallet);

      const adminInfo = await connection.getAccountInfo(adminKey);
      const admin = AdminAccount.decode(adminInfo.data);

      expect(admin.authority).toEqual(wallet.publicKey);
      expect(admin.poolCount).toEqual(0);
    });

    /**
     * Test: Initialize Admin Account Twice
     * Flow:
     * 1. Initialize admin account first time
     * 2. Try to initialize again with same authority
     * Expected: Second initialization should fail with account already initialized error
     */
    it("should fail when trying to initialize twice", async () => {
      // First initialization
      const ix = await getInitializeIx(wallet.publicKey);
      await sendTransaction([ix], connection, wallet);

      // Try to initialize again
      await expect(sendTransaction([ix], connection, wallet)).rejects.toThrow();
    });

    /**
     * Test: Initialize with Different Authority
     * Flow:
     * 1. Create new keypair
     * 2. Try to initialize with new keypair
     * Expected: Should successfully initialize with different authority
     */
    it("should initialize with different authority", async () => {
      const newAuthority = Keypair.generate();

      // Airdrop some SOL to new authority for transaction
      await bankrunContextWrapper.fundKeypair(newAuthority, 1000000000);

      const ix = await getInitializeIx(newAuthority.publicKey);
      await sendTransaction([ix], connection, newAuthority);

      const adminInfo = await connection.getAccountInfo(adminKey);
      const admin = AdminAccount.decode(adminInfo.data);

      expect(admin.authority).toEqual(newAuthority.publicKey);
      expect(admin.poolCount).toEqual(0);
    });
  });
});
