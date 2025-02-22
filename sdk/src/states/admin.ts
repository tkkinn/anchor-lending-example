import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";
import { Buffer } from "buffer";

const program = new anchor.Program<AnchorLendingExample>(
  idl as AnchorLendingExample
);

export class AdminAccount {
  authority: PublicKey;
  poolCount: number;

  constructor(authority: PublicKey, poolCount: number) {
    this.authority = authority;
    this.poolCount = poolCount;
  }

  static decode(data: Buffer): AdminAccount {
    return program.coder.accounts.decode("admin", data);
  }

  static async encode(admin: AdminAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("admin", admin);
  }
}
