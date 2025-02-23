import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./utils";
import { BN } from "bn.js";

export const ADMIN_SEED = "admin";
export const POOL_SEED = "pool";
export const BANK_SEED = "bank";
export const TOKEN_ACCOUNT_SEED = "token_account";
export const USER_SEED = "user";

/**
 * Derive the admin PDA address and bump
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getAdminPublicKeyAndNonce(
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(ADMIN_SEED)], programId);
}

/**
 * Get the admin account public key
 * @param programId The program ID
 * @returns The admin account public key
 */
export function getAdminPublicKey(
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  return getAdminPublicKeyAndNonce(programId)[0];
}

/**
 * Derive the pool PDA address and bump
 * @param poolId The pool ID
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getPoolPublicKeyAndNonce(
  poolId: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POOL_SEED), Buffer.from([poolId])],
    programId
  );
}

/**
 * Get the pool account public key
 * @param poolId The pool ID
 * @param programId The program ID
 * @returns The pool account public key
 */
export function getPoolPublicKey(
  poolId: number,
  programId: PublicKey
): PublicKey {
  return getPoolPublicKeyAndNonce(poolId, programId)[0];
}

/**
 * Derive the bank PDA address and bump
 * @param poolId The pool ID
 * @param bankId The bank ID
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getBankPublicKeyAndNonce(
  poolId: number,
  bankId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BANK_SEED), Buffer.from([poolId]), Buffer.from([bankId])],
    programId
  );
}

/**
 * Get the bank account public key
 * @param poolId The pool ID
 * @param bankId The bank ID
 * @param programId The program ID
 * @returns The bank account public key
 */
export function getBankPublicKey(
  poolId: number,
  bankId: number,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  return getBankPublicKeyAndNonce(poolId, bankId, programId)[0];
}

/**
 * Derive the token account PDA address and bump
 * @param bankPublicKey The bank account public key
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getBankTokenAccountPublicKeyAndNonce(
  bankPublicKey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TOKEN_ACCOUNT_SEED), bankPublicKey.toBuffer()],
    programId
  );
}

/**
 * Get the token account public key
 * @param bankPublicKey The bank account public key
 * @param programId The program ID
 * @returns The token account public key
 */
export function getBankTokenAccountPublicKey(
  bankPublicKey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  return getBankTokenAccountPublicKeyAndNonce(bankPublicKey, programId)[0];
}

/**
 * Derive the user account PDA address and bump
 * @param poolId Pool ID the user belongs to
 * @param userId User ID within the pool
 * @param authority User's wallet address
 * @param programId Program ID, defaults to the main program ID
 * @returns Tuple of [address, bump]
 */
function getUserPublicKeyAndNonce(
  poolId: number,
  userId: number,
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(USER_SEED),
      Buffer.from([poolId]),
      Buffer.from(new Uint16Array([userId]).buffer),
      authority.toBuffer(),
    ],
    programId
  );
}

/**
 * Derive the user account PDA address
 * @param poolId Pool ID the user belongs to
 * @param userId User ID within the pool
 * @param authority User's wallet address
 * @param programId Program ID, defaults to the main program ID
 * @returns User account PDA
 */
export function getUserPublicKey(
  poolId: number,
  userId: number,
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  return getUserPublicKeyAndNonce(poolId, userId, authority, programId)[0];
}
