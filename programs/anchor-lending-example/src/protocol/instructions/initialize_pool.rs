use crate::protocol::{state::Admin, AdminError, ADMIN_SEED};
use anchor_lang::prelude::*;

#[event]
pub struct PoolInitialized {
    pub pool_count: u8,
}

pub fn handle_initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
    // Increment pool count in admin account
    let mut admin = ctx.accounts.admin.load_mut()?;
    admin.pool_count += 1;

    // Log the event
    emit!(PoolInitialized {
        pool_count: admin.pool_count,
    });

    msg!(
        "Pool initialized successfully. New count: {}",
        admin.pool_count
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
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
