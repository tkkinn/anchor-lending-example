import * as anchor from "@coral-xyz/anchor-29";
import { IDL } from "./idl/pyth_solana_recevier";
import { PYTH_RECEIVER_PROGRAM_ID } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor-29";
import { hexToBytes32 } from "@/sdk";

const program = new anchor.Program(IDL, PYTH_RECEIVER_PROGRAM_ID);

export async function constructPythPriceAccount(
  publicKey: PublicKey,
  feedId: string,
  price: number,
  conf: number,
  exponent: number,
  slot: number = 0
) {
  const currentTimestamp = new Date().getTime();
  const buffer = await program.coder.accounts.encode("priceUpdateV2", {
    writeAuthority: PublicKey.default,
    verificationLevel: { full: {} },
    priceMessage: {
      feedId: hexToBytes32(feedId),
      price: new BN(price),
      conf: new BN(conf),
      exponent: new BN(exponent),
      publishTime: new BN(currentTimestamp),
      prevPublishTime: new BN(currentTimestamp - 50),
      emaPrice: new BN(price),
      emaConf: new BN(conf),
    },
    postedSlot: new BN(slot),
  });

  return {
    address: publicKey,
    info: {
      data: buffer,
      executable: false,
      lamports: 1000000000,
      owner: PYTH_RECEIVER_PROGRAM_ID,
    },
  };
}
