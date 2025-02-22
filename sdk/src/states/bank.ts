import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";

const program = new anchor.Program<AnchorLendingExample>(
  idl as AnchorLendingExample
);

/**
 * Bank operational status
 */
export enum BankStatus {
  Inactive = 0,
  Active = 1,
  ReduceOnly = 2,
}

/**
 * Represents the on-chain Bank account state
 */
export class BankAccount {
  mint: PublicKey;
  groupId: number;
  bump: number;
  status: BankStatus;

  constructor(args: {
    mint: PublicKey;
    groupId: number;
    bump: number;
    status: BankStatus;
  }) {
    this.mint = args.mint;
    this.groupId = args.groupId;
    this.bump = args.bump;
    this.status = args.status;
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
