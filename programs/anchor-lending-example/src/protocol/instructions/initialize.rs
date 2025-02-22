use crate::protocol::{event::AdminInitialized, Admin, ADMIN_SEED, ADMIN_SPACE};
use anchor_lang::prelude::*;

/// Accounts for initializing admin
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The admin account to be initialized
    #[account(
        init,
        payer = authority,
        space = ADMIN_SPACE,
        seeds = [ADMIN_SEED],
        bump
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The authority that will have admin privileges
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Initialize the admin account with the provided authority
pub fn handle_initialize(ctx: Context<Initialize>) -> Result<()> {
    let mut admin = ctx.accounts.admin.load_init()?;

    // Set the authority address
    admin.authority = ctx.accounts.authority.key();

    // Initialize pool count to 0
    admin.pool_count = 0;

    msg!("Admin initialized with authority: {}", admin.authority);

    // Emit the initialize event
    emit!(AdminInitialized {
        admin: ctx.accounts.admin.key(),
        authority: admin.authority,
    });

    Ok(())
}
