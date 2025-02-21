import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as idl from "../idl/anchor_lending_example.json";
import { Program } from "@coral-xyz/anchor";
import { AnchorLendingExample } from "../types/anchor_lending_example";
import { getTokenConfigPublicKey } from "../pda";
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
 * Create instruction to initialize a new token group
 * @param authority Admin authority
 * @param groupId Token group ID
 * @returns Initialize token group instruction
 */
export async function getInitializeTokenGroupIx(
  authority: PublicKey
): Promise<TransactionInstruction> {
  return await program.methods
    .initializeTokenGroup()
    .accountsPartial({
      authority,
    })
    .instruction();
}

/**
 * Create instruction to initialize configuration for a token
 * @param authority Admin authority
 * @param mint Token mint address
 * @param groupId Token group ID
 * @returns Initialize token config instruction
 */
export async function getInitializeTokenConfigIx(
  authority: PublicKey,
  mint: PublicKey,
  groupId: number,
  tokenProgram: TokenProgram = TokenProgram.TOKEN_PROGRAM
): Promise<TransactionInstruction> {
  const tokenConfigPda = getTokenConfigPublicKey(
    mint,
    groupId,
    program.programId
  );
  return await program.methods
    .initializeTokenConfig(groupId)
    .accountsPartial({
      authority,
      mint,
      tokenConfig: tokenConfigPda,
      tokenProgram: getTokenProgramId(tokenProgram),
    })
    .instruction();
}

/**
 * Create instruction to update token config operational status
 * @param authority Admin authority
 * @param mint Token mint address
 * @param newStatus New operational status to set
 * @returns Update token config status instruction
 */
export async function getUpdateTokenConfigStatusIx(
  authority: PublicKey,
  mint: PublicKey,
  newStatus: number,
  groupId: number
): Promise<TransactionInstruction> {
  const tokenConfigPda = getTokenConfigPublicKey(
    mint,
    groupId,
    program.programId
  );

  return await program.methods
    .updateTokenConfigStatus(newStatus)
    .accountsPartial({
      tokenConfig: tokenConfigPda,
      authority,
    })
    .instruction();
}
