import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

/**
 * Bank operational status
 */
export enum BankStatus {
  /** Bank is inactive and cannot be used */
  Inactive = 0,
  /** Bank is active and can be used for all operations */
  Active = 1,
  /** Bank is in reduce-only mode - no new positions allowed */
  ReduceOnly = 2,
}

/**
 * Represents price feed data from oracle
 */
export interface PriceFeedMessage {
  /** Exponential moving average price */
  emaPrice: bigint;
  /** EMA confidence interval */
  emaConf: bigint;
  /** Current price */
  price: bigint;
  /** Confidence interval around the price */
  conf: bigint;
  /** Price decimal exponent */
  exponent: number;
  /** Timestamp of price update */
  publishTime: bigint;
}

/**
 * Represents the on-chain Bank account state
 */
export class BankAccount {
  /** The token mint address */
  mint: PublicKey;
  /** The pool ID */
  poolId: number;
  /** The bank ID within the pool */
  bankId: number;
  /** The PDA bump seed */
  bump: number;
  /** Current operational status */
  status: BankStatus;
  /** Current price feed data */
  priceMessage: PriceFeedMessage;

  constructor(args: {
    mint: PublicKey;
    poolId: number;
    bankId: number;
    bump: number;
    status: BankStatus;
    priceMessage: PriceFeedMessage;
  }) {
    this.mint = args.mint;
    this.poolId = args.poolId;
    this.bankId = args.bankId;
    this.bump = args.bump;
    this.status = args.status;
    this.priceMessage = args.priceMessage;
  }

  /**
   * Decodes raw account data into a BankAccount instance
   * @param data Raw account data as buffer
   * @returns Decoded BankAccount instance
   */
  static decode(data: Buffer): BankAccount {
    return program.coder.accounts.decode("bank", data);
  }

  /**
   * Encodes a BankAccount instance into a buffer
   * @param bank BankAccount instance to encode
   * @returns Encoded buffer
   */
  static async encode(bank: BankAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("bank", bank);
  }
}
