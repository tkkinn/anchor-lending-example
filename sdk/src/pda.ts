import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./utils";

const TOKEN_ACCOUNT_SEED = "token_account";
const BANK_SEED = "bank";
const ADMIN_SEED = "admin";

/**
 * Get the admin account public key
 * @param programId The program ID
 * @returns The admin account public key
 */
export function getAdminPublicKey(
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ADMIN_SEED)],
    programId
  )[0];
}

/**
 * Derive the bank PDA address and bump
 * @param mint The token mint address
 * @param groupId The token group ID
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getBankPublicKeyAndNonce(
  mint: PublicKey,
  groupId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BANK_SEED), mint.toBuffer(), Buffer.from([groupId])],
    programId
  );
}

/**
 * Get the bank account public key
 * @param mint The token mint address
 * @param groupId The token group ID
 * @param programId The program ID
 * @returns The bank account public key
 */
export function getBankPublicKey(
  mint: PublicKey,
  groupId: number,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  return getBankPublicKeyAndNonce(mint, groupId, programId)[0];
}

/**
 * Derive the token account PDA address and bump
 * @param bank The bank account address
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getTokenAccountPublicKeyAndNonce(
  bank: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TOKEN_ACCOUNT_SEED), bank.toBuffer()],
    programId
  );
}

/**
 * Get the token account public key
 * @param bank The bank account address
 * @param programId The program ID
 * @returns The token account public key
 */
export function getTokenAccountPublicKey(
  bank: PublicKey,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  return getTokenAccountPublicKeyAndNonce(bank, programId)[0];
}
