SDK guide:
You should write a SDK with three section, instruction, state and address derive.
For the instruction part, function should named get<InstructionName>Ix(). The output must be one or an array of TransactionInstruction. The parameter input should as less as possible, you should use other function from the address derive section to reduce the parameter needed, but don't include a onchain getAccount to derive the parameter. All function should be well documented.
Here is the instruction example:
```typescript
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as idl from "../idl/boat.json";
import { Boat } from "../types/boat";
import { Program } from "@coral-xyz/anchor";

const program = new Program<Boat>(idl as Boat);

export async function getInitializeIx(
    authority: PublicKey,
): Promise<TransactionInstruction> {
    return await program.methods.initialize().accountsPartial({
        authority,
    }).instruction();
}
```
For the state part, the account state should be in a class, which include function to encode and decode the account.
Here is the state example:
```typescript
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Boat } from "../boat";
import * as idl from "../../idl/boat.json";

const program = new Program<Boat>(idl as Boat);

export class StateAccount {
    authority: PublicKey;

    constructor(args: { authority: PublicKey }) {
        this.authority = args.authority;
    }

    static decode(data: Buffer): StateAccount {
        return program.coder.accounts.decode("state", data);
    }

    static async encode(state: StateAccount): Promise<Buffer> {
        return await program.coder.accounts.encode("state", state);
    }
}
```
For the address derive part, for each derived address, should have two function get<AccountName>PublicKeyAndNonce() and get<AccountName>PublicKey().
Here is the address derive example:
```typescript
import { PublicKey } from "@solana/web3.js";

export const STATE_SEED = "state";

/**
 * Derive the state PDA address and bump
 * @param programId The program ID
 * @returns Tuple of [address, bump]
 */
export function getBoatStatePublickeyAndNonce(
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(STATE_SEED)], programId);
}

/**
 * Retrieves the public key for the state account
 * @param programId - The public key of the program
 * @returns The public key of the boat state account
 */
export function getBoatStatePublickey(programId: PublicKey): PublicKey {
  return getBoatStatePublickeyAndNonce(programId)[0];
}
```