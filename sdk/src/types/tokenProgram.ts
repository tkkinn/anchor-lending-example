import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

export enum TokenProgram {
  TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
}

export function getTokenProgramId(program: TokenProgram): PublicKey {
  switch (program) {
    case TokenProgram.TOKEN_PROGRAM:
      return TOKEN_PROGRAM_ID;
    case TokenProgram.TOKEN_2022_PROGRAM:
      return TOKEN_2022_PROGRAM_ID;
    default:
      throw new Error("Invalid token program");
  }
}
