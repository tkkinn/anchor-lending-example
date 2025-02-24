import { BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

/**
 * Balance type for token positions
 */
export enum BalanceType {
  /** Balance represents collateral position */
  Collateral = 0,
  /** Balance represents liability position */
  Liability = 1,
}

/**
 * Direction of balance update operation
 */
export enum Direction {
  /** Deposit adds to balance as collateral */
  Deposit,
  /** Withdrawal reduces balance, may convert to liability */
  Withdrawal,
}

/**
 * Represents a single token balance entry in the user account
 */
export interface TokenBalance {
  /** Balance amount in token's native units */
  balance: BN;
  /** Bank identifier for the token */
  bankId: number;
  /** Type of balance (collateral or liability) */
  balanceType: BalanceType;
  /** Padding for memory alignment - must be 6 bytes */
  padding: number[]; // [u8; 6]
}

/**
 * Represents a user account in the lending protocol
 */
export class UserAccount {
  /** Size of the user account for space allocation */
  static readonly LEN = 8 + (32 + 2 + 1 + 1 + 4 + 16 * (8 + 1 + 1 + 6));

  /** The user's authority (usually their wallet address) */
  authority: PublicKey;
  /** Unique identifier for the user - u16 */
  id: number;
  /** Pool identifier - u8 */
  poolId: number;
  /** Bump seed for PDA validation - u8 */
  bump: number;
  /** Padding for memory alignment - 4 bytes */
  padding: number[];
  /** Token balances array with exactly 16 different tokens */
  tokenBalances: TokenBalance[];

  constructor(args: {
    authority: PublicKey;
    id: number;
    poolId: number;
    bump: number;
    padding: number[];
    tokenBalances: TokenBalance[];
  }) {
    this.authority = args.authority;
    this.id = args.id;
    this.poolId = args.poolId;
    this.bump = args.bump;
    this.padding = args.padding;
    // Ensure exactly 16 token balances
    this.tokenBalances = Array(16)
      .fill(null)
      .map(
        (_, i) =>
          args.tokenBalances[i] || {
            balance: new BN(0),
            bankId: 0,
            balanceType: BalanceType.Collateral,
            padding: new Array(6).fill(0),
          }
      );
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
