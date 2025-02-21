import { PublicKey } from "@solana/web3.js";

export const ADMIN_SEED = "admin";
export const TOKEN_CONFIG_SEED = "token_config";

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
export function getAdminPublicKey(programId: PublicKey): PublicKey {
  return getAdminPublicKeyAndNonce(programId)[0];
}

/**
 * Derive the token config PDA address and bump
 * @param mint The token mint address
 * @param groupId The token group ID
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getTokenConfigPublicKeyAndNonce(
  mint: PublicKey,
  groupId: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TOKEN_CONFIG_SEED), mint.toBuffer(), Buffer.from([groupId])],
    programId
  );
}

/**
 * Get the token config account public key
 * @param mint The token mint address
 * @param groupId The token group ID
 * @param programId The program ID
 * @returns The token config account public key
 */
export function getTokenConfigPublicKey(
  mint: PublicKey,
  groupId: number,
  programId: PublicKey
): PublicKey {
  return getTokenConfigPublicKeyAndNonce(mint, groupId, programId)[0];
}

/**
 * Derive the token account PDA address and bump
 * @param tokenConfig The token config account address
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getTokenAccountPublicKeyAndNonce(
  tokenConfig: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("token_account"), tokenConfig.toBuffer()],
    programId
  );
}

/**
 * Get the token account public key
 * @param tokenConfig The token config account address
 * @param programId The program ID
 * @returns The token account public key
 */
export function getTokenAccountPublicKey(
  tokenConfig: PublicKey,
  programId: PublicKey
): PublicKey {
  return getTokenAccountPublicKeyAndNonce(tokenConfig, programId)[0];
}
