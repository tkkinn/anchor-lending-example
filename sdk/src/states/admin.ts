import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";

const program = new anchor.Program<AnchorLendingExample>(
  idl as AnchorLendingExample
);

export class AdminAccount {
  authority: PublicKey;
  tokenGroupCount: number;

  constructor(authority: PublicKey, tokenGroupCount: number) {
    this.authority = authority;
    this.tokenGroupCount = tokenGroupCount;
  }

  static decode(data: Buffer): AdminAccount {
    return program.coder.accounts.decode("admin", data) as AdminAccount;
  }

  static async encode(account: AdminAccount): Promise<Buffer> {
    return await program.coder.accounts.encode("admin", account);
  }
}

export enum TokenConfigStatus {
  Inactive = 0,
  Active = 1,
  ReduceOnly = 2,
}

export class TokenConfig {
  mint: PublicKey;
  groupId: number;
  bump: number;
  status: TokenConfigStatus;

  constructor(
    mint: PublicKey,
    groupId: number,
    bump: number,
    status: TokenConfigStatus
  ) {
    this.mint = mint;
    this.groupId = groupId;
    this.bump = bump;
    this.status = status;
  }

  static decode(data: Buffer): TokenConfig {
    return program.coder.accounts.decode("tokenConfig", data) as TokenConfig;
  }

  static async encode(account: TokenConfig): Promise<Buffer> {
    return await program.coder.accounts.encode("tokenConfig", account);
  }
}
