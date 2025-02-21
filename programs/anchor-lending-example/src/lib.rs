use anchor_lang::prelude::*;

declare_id!("HKViZ7i7fEpfqcpCpDWAfmZpuVZ6WSRXST85nf1w227q");

#[program]
pub mod anchor_lending_example {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
