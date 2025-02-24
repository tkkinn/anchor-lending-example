import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import idl from "../idl/anchor_lending_example.json";
import { AnchorLendingExample } from "../types/anchor_lending_example";
import {
  getBankPublicKey,
  getBankTokenAccountPublicKey,
  getUserPublicKey,
} from "../pda";
import { TokenProgram, getTokenProgramId } from "../types/tokenProgram";
import { PROGRAM_ID } from "../utils";
import { BN } from "bn.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const program = new Program<AnchorLendingExample>(idl as AnchorLendingExample);

/**
 * Create instruction to initialize a new user account
 * @param authority User's wallet that will own the account
 * @param poolId Pool ID to create user in
 * @param userId User ID to assign
 * @param programId Program ID, defaults to the main program ID
 * @returns Initialize user instruction
 */
export async function getInitializeUserIx(
  authority: PublicKey,
  poolId: number,
  userId: number,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const user = getUserPublicKey(poolId, userId, authority, programId);

  return await program.methods
    .initializeUser(poolId, userId)
    .accountsPartial({
      user,
      authority,
    })
    .instruction();
}

/**
 * Create instruction to deposit tokens into a bank
 * @param user User's wallet
 * @param userTokenAccount User's token account to deposit from
 * @param bankTokenAccount Bank's token account to deposit to
 * @param userAccount User account PDA
 * @param poolId Pool ID of the bank
 * @param bankId Bank ID to deposit to
 * @param amount Amount of tokens to deposit
 * @param tokenProgram Optional token program ID, defaults to normal SPL token program
 * @param programId Program ID, defaults to the main program ID
 * @returns Deposit instruction
 */
export async function getDepositIx(
  user: PublicKey,
  userId: number,
  poolId: number,
  bankId: number,
  amount: number,
  userTokenAccount: PublicKey,
  mint?: PublicKey,
  tokenProgram: TokenProgram = TokenProgram.TOKEN_PROGRAM,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const bank = getBankPublicKey(poolId, bankId, programId);
  const userAccount = getUserPublicKey(poolId, userId, user, programId);
  const bankTokenAccount = getBankTokenAccountPublicKey(bank, programId);

  let remainingAccounts: AccountMeta[] = [];
  if (mint) {
    remainingAccounts.push({
      pubkey: mint,
      isWritable: false,
      isSigner: false,
    });
  }

  return await program.methods
    .deposit(new BN(amount))
    .accountsPartial({
      user,
      userTokenAccount,
      bankTokenAccount,
      userAccount,
      bank,
      tokenProgram: getTokenProgramId(tokenProgram),
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

/**
 * Create instruction to withdraw tokens from a bank
 * @param user User's wallet
 * @param userId User ID in the pool
 * @param poolId Pool ID of the bank
 * @param bankId Bank ID to withdraw from
 * @param amount Amount of tokens to withdraw
 * @param userTokenAccount User's token account to receive tokens
 * @param mint Optional mint account for transfer_checked
 * @param tokenProgram Optional token program ID, defaults to normal SPL token program
 * @param programId Program ID, defaults to the main program ID
 * @returns Withdraw instruction
 */
export async function getWithdrawIx(
  user: PublicKey,
  userId: number,
  poolId: number,
  bankId: number,
  amount: number,
  userTokenAccount: PublicKey,
  userBankId: number[],
  mint?: PublicKey,
  tokenProgram: TokenProgram = TokenProgram.TOKEN_PROGRAM,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const bank = getBankPublicKey(poolId, bankId, programId);
  const userAccount = getUserPublicKey(poolId, userId, user, programId);
  const bankTokenAccount = getBankTokenAccountPublicKey(bank, programId);

  let remainingAccounts: AccountMeta[] = [];

  for (const id of userBankId) {
    const collateralBank = getBankPublicKey(poolId, id, programId);
    remainingAccounts.push({
      pubkey: collateralBank,
      isWritable: false,
      isSigner: false,
    });
  }

  if (mint) {
    remainingAccounts.push({
      pubkey: mint,
      isWritable: false,
      isSigner: false,
    });
  }

  return await program.methods
    .withdraw(new BN(amount))
    .accountsPartial({
      user,
      userTokenAccount,
      bankTokenAccount,
      userAccount,
      bank,
      tokenProgram: getTokenProgramId(tokenProgram),
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}
