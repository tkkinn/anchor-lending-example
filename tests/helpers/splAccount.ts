import {
  ACCOUNT_SIZE,
  AccountLayout,
  getAssociatedTokenAddressSync,
  MintLayout,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  getTokenProgramId,
  TokenProgram,
} from "../../sdk/src/types/tokenProgram";

/**
 * Constructs a token mint account with specified parameters
 * @param tokenMint - The public key of the token mint
 * @param mintAuthorityOption - Option for mint authority (0 or 1)
 * @param mintAuthority - The public key of the mint authority
 * @param supply - The initial supply of tokens
 * @param decimals - The number of decimal places for the token
 * @param freezeAuthorityOption - Option for freeze authority (0 or 1)
 * @param freezeAuthority - The public key of the freeze authority
 * @param tokenProgram - The token program type (defaults to TokenProgramType.TOKEN)
 * @returns An object containing the mint address and account info
 */
export function constructMint(
  tokenMint: PublicKey,
  mintAuthorityOption: number,
  mintAuthority: PublicKey,
  supply: number,
  decimals: number,
  freezeAuthorityOption: number,
  freezeAuthority: PublicKey,
  tokenProgram: TokenProgram = TokenProgram.TOKEN_PROGRAM
) {
  const mintData = {
    mintAuthorityOption: mintAuthorityOption as 0 | 1,
    mintAuthority: mintAuthority,
    supply: BigInt(new BN(supply).toString()),
    decimals: decimals,
    isInitialized: true,
    freezeAuthorityOption: freezeAuthorityOption as 0 | 1,
    freezeAuthority: freezeAuthority,
  };

  const buffer = Buffer.alloc(MintLayout.span);
  MintLayout.encode(mintData, buffer);

  return {
    address: tokenMint,
    info: {
      lamports: 1461600,
      data: buffer,
      owner: getTokenProgramId(tokenProgram),
      executable: false,
    },
  };
}

/**
 * Constructs a token account with specified parameters
 * @param mint - The public key of the token mint
 * @param owner - The public key of the token account owner
 * @param amount - The amount of tokens to be held in the account
 * @param tokenProgram - The token program type (defaults to TokenProgramType.TOKEN)
 * @param publicKey - Optional public key for the token account
 * @returns An object containing the token account address and account info
 */
export function constructTokenAccount(
  mint: PublicKey,
  owner: PublicKey,
  amount: number,
  tokenProgram: TokenProgram = TokenProgram.TOKEN_PROGRAM,
  publicKey?: PublicKey
) {
  let isNativeOption: 0 | 1 = 0;
  let isNative = BigInt(0);
  if (mint == NATIVE_MINT) {
    isNativeOption = 1;
    isNative = BigInt(2039280);
  }
  const accData = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint,
      owner,
      amount: BigInt(amount),
      delegateOption: 0,
      delegate: PublicKey.default,
      delegatedAmount: BigInt(0),
      state: 1,
      isNativeOption,
      isNative,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    accData
  );

  return {
    address:
      publicKey ||
      getAssociatedTokenAddressSync(
        mint,
        owner,
        true,
        getTokenProgramId(tokenProgram)
      ),
    info: {
      lamports: 2039280,
      data: accData,
      owner: getTokenProgramId(tokenProgram),
      executable: false,
    },
  };
}
