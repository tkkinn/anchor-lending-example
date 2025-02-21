use crate::protocol::{event::TokenConfigInitialized, state::*, AdminError};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
#[instruction(group_id: u8)]
pub struct InitializeTokenConfig<'info> {
    /// The admin account
    #[account(
        seeds = [ADMIN_SEED],
        bump,
        has_one = authority @ AdminError::Unauthorized,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The token config account to initialize
    #[account(
        init,
        payer = authority,
        space = TOKEN_CONFIG_SPACE,
        seeds = [
            TOKEN_CONFIG_SEED,
            mint.key().as_ref(),
            &[group_id][..],
        ],
        bump
    )]
    pub token_config: AccountLoader<'info, TokenConfig>,

    /// The token mint
    pub mint: InterfaceAccount<'info, Mint>,

    /// The token account owned by token config PDA
    #[account(
        init,
        payer = authority,
        seeds = [
            b"token_account",
            token_config.key().as_ref(),
        ],
        bump,
        token::mint = mint,
        token::authority = token_config,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    /// The authority that must sign to initialize token config
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Token program
    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_token_config(
    ctx: Context<InitializeTokenConfig>,
    group_id: u8,
) -> Result<()> {
    let admin = ctx.accounts.admin.load()?;

    // Verify group_id is within allowed range
    require_gte!(
        admin.token_group_count,
        group_id,
        AdminError::InvalidGroupId
    );

    let mut token_config = ctx.accounts.token_config.load_init()?;

    // Initialize token config
    token_config.mint = ctx.accounts.mint.key();
    token_config.group_id = group_id;
    token_config.bump = ctx.bumps.token_config;
    token_config.status = TokenConfigStatus::Inactive as u8; // Initialize as inactive by default

    // Emit event
    emit!(TokenConfigInitialized {
        mint: ctx.accounts.mint.key(),
        group_id,
        status: token_config.status,
        token_account: ctx.accounts.token_account.key(),
    });

    msg!(
        "Initialized token config for mint: {:?}, group: {}, status: {:?}, token account: {:?}",
        ctx.accounts.mint.key(),
        group_id,
        token_config.status,
        ctx.accounts.token_account.key()
    );

    Ok(())
}
