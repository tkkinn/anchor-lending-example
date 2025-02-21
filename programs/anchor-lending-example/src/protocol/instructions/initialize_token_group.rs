use crate::protocol::{state::Admin, AdminError, ADMIN_SEED};
use anchor_lang::prelude::*;

#[event]
pub struct TokenGroupInitialized {
    pub token_group_count: u8,
}

pub fn handle_initialize_token_group(ctx: Context<InitializeTokenGroup>) -> Result<()> {
    // Increment token group count in admin account
    let mut admin = ctx.accounts.admin.load_mut()?;
    admin.token_group_count += 1;

    // Log the event
    emit!(TokenGroupInitialized {
        token_group_count: admin.token_group_count,
    });

    msg!(
        "Token group initialized successfully. New count: {}",
        admin.token_group_count
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeTokenGroup<'info> {
    /// The admin account to be updated
    #[account(
        mut,
        seeds = [ADMIN_SEED],
        bump,
        has_one = authority @ AdminError::Unauthorized,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The authority that must sign this transaction
    pub authority: Signer<'info>,
}
