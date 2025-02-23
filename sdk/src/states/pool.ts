import { Buffer } from "buffer";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";

const program = new anchor.Program<AnchorLendingExample>(
  idl as AnchorLendingExample
);

/**
 * Represents the on-chain Pool account state
 */
export class PoolAccount {
  bankCount: number;

  constructor(args: { bankCount: number }) {
    this.bankCount = args.bankCount;
  }

  /**
   * Decodes raw account data into a PoolAccount instance
   * @param data Raw account data as buffer
   * @returns Decoded PoolAccount instance
   */
  static decode(data: Buffer): PoolAccount {
    return program.coder.accounts.decode("pool", data);
  }

  /**
   * Encodes a PoolAccount instance into a buffer
   * @param pool PoolAccount instance to encode
   * @returns Encoded buffer
   */
  static async encode(pool: PoolAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("pool", pool);
  }
}
