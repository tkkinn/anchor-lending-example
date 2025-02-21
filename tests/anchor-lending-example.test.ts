import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorLendingExample } from "../target/types/anchor_lending_example";
import { BankrunProvider, startAnchor } from "anchor-bankrun";

describe('My test', () => {
  test('Test allocate counter + increment tx', async () => {
    const context = await startAnchor("", [], []);
    const client = context.banksClient;

    const provider = new BankrunProvider(context);
    anchor.setProvider(provider);

    // ... testing logic
  });
});