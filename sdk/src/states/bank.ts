import { BN, Program } from "@coral-xyz/anchor";
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
  emaPrice: BN;
  /** EMA confidence interval */
  emaConf: BN;
  /** Current price */
  price: BN;
  /** Confidence interval around the price */
  conf: BN;
  /** Price exponent */
  exponent: number;
  /** Padding for memory alignment */
  padding: number;
  /** Timestamp of price update */
  publishTime: number;
}

/**
 * Represents the on-chain Bank account state
 */
export class BankAccount {
  /** The bank ID within the pool */
  bankId: number;
  /** The pool ID */
  poolId: number;
  /** The PDA bump seed */
  bump: number;
  /** Current operational status */
  status: BankStatus;
  /** The decimal places of the token mint */
  decimals: number;
  /** Padding for memory alignment */
  padding: number[];
  /** The token mint address */
  mint: PublicKey;
  /** Current price feed data */
  priceMessage: PriceFeedMessage;

  constructor(args: {
    bankId: number;
    poolId: number;
    bump: number;
    status: BankStatus;
    decimals: number;
    padding: number[];
    mint: PublicKey;
    priceMessage: PriceFeedMessage;
  }) {
    this.bankId = args.bankId;
    this.poolId = args.poolId;
    this.bump = args.bump;
    this.status = args.status;
    this.decimals = args.decimals;
    this.padding = args.padding;
    this.mint = args.mint;
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

  /**
   * Calculate USD value of token amount using bank price feed
   * Returns the USD value scaled to 6 decimal places
   *
   * @param amount - The token amount as BN
   * @returns Calculated USD value with 6 decimals or error if:
   * - Amount too large
   * - Price feed invalid
   * - Math overflow
   */
  calculateUsdValue(amount: BN): BN {
    // Convert to u128 equivalent
    const amountU128 = amount.toNumber();
    const priceU128 = this.priceMessage.price.toNumber();

    // Check for overflow
    if (amountU128 > Number.MAX_SAFE_INTEGER / priceU128) {
      throw new Error("Amount too large for calculation");
    }

    // 1. Adjust price by exponent
    const actualPrice =
      priceU128 * Math.pow(10, Math.abs(this.priceMessage.exponent));

    // 2. Calculate base value
    const baseValue = amountU128 * actualPrice;

    // 3. Adjust for token decimals
    const decimalAdjusted = baseValue / Math.pow(10, this.decimals);

    // 4. Adjust to get 6 decimals output
    const expAdjustment = 6 - this.priceMessage.exponent;
    const adjFactor = Math.pow(10, Math.abs(expAdjustment));

    const finalValue =
      expAdjustment > 0
        ? decimalAdjusted * adjFactor
        : decimalAdjusted / adjFactor;

    return new BN(Math.floor(finalValue));
  }
}
