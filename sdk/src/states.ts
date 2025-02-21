import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as idl from "./idl/anchor_lending_example.json";
import { AnchorLendingExample } from "./types/anchor_lending_example";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

/**
 * Represents the on-chain Admin account state
 */
export class AdminAccount {
  authority: PublicKey;
  tokenGroupCount: number;

  constructor(args: { authority: PublicKey; tokenGroupCount: number }) {
    this.authority = args.authority;
    this.tokenGroupCount = args.tokenGroupCount;
  }

  /**
   * Decodes raw account data into an AdminAccount instance
   * @param data Raw account data as buffer
   * @returns Decoded AdminAccount instance
   */
  static decode(data: Buffer): AdminAccount {
    return program.coder.accounts.decode("admin", data);
  }

  /**
   * Encodes an AdminAccount instance into a buffer
   * @param admin AdminAccount instance to encode
   * @returns Encoded buffer
   */
  static async encode(admin: AdminAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("admin", admin);
  }
}

/**
 * Token configuration operational status
 */
export enum TokenConfigStatus {
  Inactive = 0,
  Active = 1,
  ReduceOnly = 2,
}

/**
 * Represents the on-chain TokenConfig account state
 */
export class TokenConfigAccount {
  mint: PublicKey;
  groupId: number;
  bump: number;
  status: TokenConfigStatus;

  constructor(args: {
    mint: PublicKey;
    groupId: number;
    bump: number;
    status: TokenConfigStatus;
  }) {
    this.mint = args.mint;
    this.groupId = args.groupId;
    this.bump = args.bump;
    this.status = args.status;
  }

  /**
   * Decodes raw account data into a TokenConfigAccount instance
   * @param data Raw account data as buffer
   * @returns Decoded TokenConfigAccount instance
   */
  static decode(data: Buffer): TokenConfigAccount {
    return program.coder.accounts.decode("tokenConfig", data);
  }

  /**
   * Encodes a TokenConfigAccount instance into a buffer
   * @param config TokenConfigAccount instance to encode
   * @returns Encoded buffer
   */
  static async encode(config: TokenConfigAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("tokenConfig", config);
  }
}
