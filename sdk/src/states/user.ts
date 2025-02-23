import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

/**
 * Represents a single token balance entry in the user account
 */
export interface TokenBalance {
  /** Balance amount (can be negative) */
  balance: BN;
  /** Bank identifier for the token */
  bankId: number;
}

/**
 * Represents a user account in the lending protocol
 */
export class UserAccount {
  /** The user's authority (usually their wallet address) */
  authority: PublicKey;
  /** Unique identifier for the user */
  id: number;
  /** Pool identifier */
  poolId: number;
  /** Bump seed for PDA validation */
  bump: number;
  /** Token balances array with maximum 16 different tokens */
  tokenBalances: TokenBalance[];

  constructor(args: {
    authority: PublicKey;
    id: number;
    poolId: number;
    bump: number;
    tokenBalances: TokenBalance[];
  }) {
    this.authority = args.authority;
    this.id = args.id;
    this.poolId = args.poolId;
    this.bump = args.bump;
    this.tokenBalances = args.tokenBalances;
  }

  /**
   * Decode raw data into a UserAccount instance
   * @param data Raw account data buffer
   * @returns Decoded UserAccount instance
   */
  static decode(data: Buffer): UserAccount {
    return program.coder.accounts.decode("user", data);
  }

  /**
   * Encode UserAccount instance into buffer
   * @param user UserAccount instance to encode
   * @returns Encoded buffer
   */
  static async encode(user: UserAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("user", user);
  }
}
