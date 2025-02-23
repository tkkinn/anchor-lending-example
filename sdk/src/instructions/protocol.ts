import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";
import {
  getAdminPublicKey,
  getPoolPublicKey,
  getBankPublicKey,
  getBankTokenAccountPublicKey,
} from "../pda";
import { TokenProgram, getTokenProgramId } from "../types/tokenProgram";
import { BankStatus } from "../states";
import { PROGRAM_ID } from "../utils";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

/**
 * Create instruction to initialize the lending protocol
 * @param authority Initial admin authority address
 * @param programId Program ID, defaults to the main program ID
 * @returns Initialize instruction
 */
export async function getInitializeIx(
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const admin = getAdminPublicKey(programId);
  return await program.methods
    .initialize()
    .accountsPartial({
      admin,
      authority,
    })
    .instruction();
}

/**
 * Create instruction to update the admin authority
 * @param currentAuthority Current admin authority
 * @param newAuthority New admin authority to set
 * @param programId Program ID, defaults to the main program ID
 * @returns Update authority instruction
 */
export async function getUpdateAuthorityIx(
  currentAuthority: PublicKey,
  newAuthority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const admin = getAdminPublicKey(programId);
  return await program.methods
    .updateAuthority()
    .accountsPartial({
      admin,
      authority: currentAuthority,
      newAuthority,
    })
    .instruction();
}

/**
 * Create instruction to initialize a new pool
 * @param authority Admin authority
 * @param poolId Pool ID to create
 * @param programId Program ID, defaults to the main program ID
 * @returns Initialize pool instruction
 */
export async function getInitializePoolIx(
  authority: PublicKey,
  poolId: number,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const admin = getAdminPublicKey(programId);
  const pool = getPoolPublicKey(poolId, programId);

  return await program.methods
    .initializePool()
    .accountsPartial({
      authority,
      admin,
      pool,
    })
    .instruction();
}

/**
 * Create instruction to initialize bank for a token
 * @param authority Admin authority
 * @param mint Token mint address
 * @param poolId Pool ID
 * @param bankId Bank ID to create
 * @param tokenProgram Optional token program ID, defaults to normal SPL token program
 * @param programId Program ID, defaults to the main program ID
 * @returns Initialize bank instruction
 */
export async function getInitializeBankIx(
  authority: PublicKey,
  mint: PublicKey,
  poolId: number,
  bankId: number,
  tokenProgram: TokenProgram = TokenProgram.TOKEN_PROGRAM,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  // Get required PDAs
  const admin = getAdminPublicKey(programId);
  const pool = getPoolPublicKey(poolId, programId);
  const bank = getBankPublicKey(poolId, bankId, programId);
  const tokenAccount = getBankTokenAccountPublicKey(bank, programId);

  return await program.methods
    .initializeBank(poolId)
    .accountsPartial({
      authority,
      admin,
      pool,
      bank,
      mint,
      tokenAccount,
      tokenProgram: getTokenProgramId(tokenProgram),
    })
    .instruction();
}

/**
 * Create instruction to update bank operational status
 * @param authority Admin authority
 * @param newStatus New operational status to set (must be BankStatus enum value)
 * @param poolId Pool ID
 * @param bankId Bank ID within the pool
 * @param programId Program ID, defaults to the main program ID
 * @returns Update bank status instruction
 * @throws If newStatus is not a valid BankStatus value
 */
export async function getUpdateBankStatusIx(
  authority: PublicKey,
  newStatus: BankStatus,
  poolId: number,
  bankId: number,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  // Validate new status is within enum range
  if (newStatus > BankStatus.ReduceOnly || newStatus < BankStatus.Inactive) {
    throw new Error("Invalid bank status value");
  }

  const bank = getBankPublicKey(poolId, bankId, programId);
  const admin = getAdminPublicKey(programId);
  return await program.methods
    .updateBankStatus(newStatus)
    .accountsPartial({
      authority,
      bank,
      admin,
    })
    .instruction();
}
