use crate::protocol::{
    state::{Admin, Pool},
    AdminError, ADMIN_SEED, POOL_SEED, POOL_SPACE,
};
use anchor_lang::prelude::*;

#[event]
pub struct PoolInitialized {
    pub pool_count: u8,
    pub pool_id: u8,
}

pub fn handle_initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
    // Increment pool count in admin account
    let mut admin = ctx.accounts.admin.load_mut()?;
    let pool_id = admin.pool_count;
    admin.pool_count = admin
        .pool_count
        .checked_add(1)
        .ok_or(AdminError::Overflow)?;

    // Initialize pool account
    let mut pool = ctx.accounts.pool.load_init()?;
    pool.bank_count = 0;

    // Log the event
    emit!(PoolInitialized {
        pool_count: admin.pool_count,
        pool_id,
    });

    msg!(
        "Pool initialized successfully. Pool ID: {}, Total pools: {}",
        pool_id,
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

    /// The pool account to initialize
    #[account(
        init,
        payer = authority,
        space = POOL_SPACE,
        seeds = [POOL_SEED, &[admin.load()?.pool_count][..]],
        bump
    )]
    pub pool: AccountLoader<'info, Pool>,

    /// The authority that must sign this transaction
    #[account(mut)]
    pub authority: Signer<'info>,

    /// System program for CPI
    pub system_program: Program<'info, System>,
}
