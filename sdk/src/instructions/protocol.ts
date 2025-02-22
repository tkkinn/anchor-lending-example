import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as idl from "../idl/anchor_lending_example.json";
import { Program } from "@coral-xyz/anchor";
import { AnchorLendingExample } from "../types/anchor_lending_example";
import { getBankPublicKey } from "../pda";
import { getTokenProgramId, TokenProgram } from "../types/tokenProgram";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

/**
 * Create instruction to initialize the lending protocol
 * @param authority Initial admin authority address
 * @returns Initialize instruction
 */
export async function getInitializeIx(
  authority: PublicKey
): Promise<TransactionInstruction> {
  return await program.methods
    .initialize()
    .accounts({
      authority,
    })
    .instruction();
}

/**
 * Create instruction to update the admin authority
 * @param currentAuthority Current admin authority
 * @param newAuthority New admin authority to set
 * @returns Update authority instruction
 */
export async function getUpdateAuthorityIx(
  currentAuthority: PublicKey,
  newAuthority: PublicKey
): Promise<TransactionInstruction> {
  return await program.methods
    .updateAuthority()
    .accountsPartial({
      authority: currentAuthority,
      newAuthority,
    })
    .instruction();
}

/**
 * Create instruction to initialize a new pool
 * @param authority Admin authority
 * @param poolId Pool ID
 * @returns Initialize pool instruction
 */
export async function getInitializePoolIx(
  authority: PublicKey
): Promise<TransactionInstruction> {
  return await program.methods
    .initializePool()
    .accountsPartial({
      authority,
    })
    .instruction();
}

/**
 * Create instruction to initialize bank for a token
 * @param authority Admin authority
 * @param mint Token mint address
 * @param poolId Pool ID
 * @returns Initialize bank instruction
 */
export async function getInitializeBankIx(
  authority: PublicKey,
  mint: PublicKey,
  poolId: number,
  tokenProgram: TokenProgram = TokenProgram.TOKEN_PROGRAM
): Promise<TransactionInstruction> {
  const bankPda = getBankPublicKey(mint, poolId, program.programId);
  return await program.methods
    .initializeBank(poolId)
    .accountsPartial({
      authority,
      mint,
      bank: bankPda,
      tokenProgram: getTokenProgramId(tokenProgram),
    })
    .instruction();
}

/**
 * Create instruction to update bank operational status
 * @param authority Admin authority
 * @param mint Token mint address
 * @param newStatus New operational status to set
 * @returns Update bank status instruction
 */
export async function getUpdateBankStatusIx(
  authority: PublicKey,
  mint: PublicKey,
  newStatus: number,
  poolId: number
): Promise<TransactionInstruction> {
  const bankPda = getBankPublicKey(mint, poolId, program.programId);
  return await program.methods
    .updateBankStatus(newStatus)
    .accountsPartial({
      authority,
      bank: bankPda,
    })
    .instruction();
}
