import {
  Connection,
  Keypair,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export async function sendTransaction(
  ix: TransactionInstruction[],
  connection: Connection,
  payer: Keypair,
  logTransactionsSize?: boolean
): Promise<string> {
  // send version 0 transaction
  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: ix,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  const signer = [payer];
  transaction.sign(signer);

  if (logTransactionsSize) {
    console.log("Transaction size:", transaction.serialize().length);
  }

  const txid = await connection.sendTransaction(transaction);

  return txid;
}
