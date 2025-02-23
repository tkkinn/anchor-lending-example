use crate::{
    protocol::{Admin, ADMIN_SEED},
    user::{TokenBalance, User, UserError, UserInitialized},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(pool_id: u8, user_id: u16)]
pub struct InitializeUser<'info> {
    /// The new user account to be created
    #[account(
        init,
        seeds = [
            b"user",
            pool_id.to_le_bytes().as_ref(),
            user_id.to_le_bytes().as_ref(),
            authority.key().as_ref()
        ],
        bump,
        payer = authority,
        space = User::LEN
    )]
    pub user: AccountLoader<'info, User>,

    /// The authority (owner) of the user account
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The admin account for the protocol
    #[account(
        seeds = [ADMIN_SEED],
        bump,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// System program for CPI
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_user(
    ctx: Context<InitializeUser>,
    pool_id: u8,
    user_id: u16,
) -> Result<()> {
    let admin = ctx.accounts.admin.load()?;
    require_gte!(admin.pool_count, pool_id, UserError::PoolNotFound);

    // Initialize user account
    let mut user = ctx.accounts.user.load_init()?;
    user.authority = ctx.accounts.authority.key();
    user.id = user_id;
    user.pool_id = pool_id;
    user.bump = ctx.bumps.user;
    user.token_balances = [TokenBalance::default(); 16];

    // Log initialization
    msg!(
        "User account initialized with ID {} in pool {} for authority: {}",
        user_id,
        pool_id,
        ctx.accounts.authority.key()
    );

    // Emit user initialized event
    emit!(UserInitialized {
        user: ctx.accounts.user.key(),
        authority: ctx.accounts.authority.key(),
        user_id,
        pool_id
    });

    Ok(())
}
