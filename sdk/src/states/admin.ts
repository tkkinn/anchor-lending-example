import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

export class AdminAccount {
  authority: PublicKey;
  poolCount: number;
  bump: number;

  constructor(args: { authority: PublicKey; poolCount: number; bump: number }) {
    this.authority = args.authority;
    this.poolCount = args.poolCount;
    this.bump = args.bump;
  }

  static decode(data: Buffer): AdminAccount {
    return program.coder.accounts.decode("admin", data);
  }

  static async encode(admin: AdminAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("admin", admin);
  }
}
