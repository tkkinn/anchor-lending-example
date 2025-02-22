use crate::protocol::{event::BankInitialized, state::*, AdminError};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
#[instruction(pool_id: u8)]
pub struct InitializeBank<'info> {
    /// The admin account
    #[account(
        seeds = [ADMIN_SEED],
        bump,
        has_one = authority @ AdminError::Unauthorized,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The bank account to initialize
    #[account(
        init,
        payer = authority,
        space = BANK_SPACE,
        seeds = [
            BANK_SEED,
            mint.key().as_ref(),
            &[pool_id][..],
        ],
        bump
    )]
    pub bank: AccountLoader<'info, Bank>,

    /// The token mint
    pub mint: InterfaceAccount<'info, Mint>,

    /// The token account owned by bank PDA
    #[account(
        init,
        payer = authority,
        seeds = [
            b"token_account",
            bank.key().as_ref(),
        ],
        bump,
        token::mint = mint,
        token::authority = bank,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    /// The authority that must sign to initialize bank
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Token program
    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_bank(ctx: Context<InitializeBank>, pool_id: u8) -> Result<()> {
    let admin = ctx.accounts.admin.load()?;

    // Verify pool_id is within allowed range
    require_gte!(
        admin.pool_count,
        pool_id,
        AdminError::InvalidGroupId // Reusing same error enum
    );

    let mut bank = ctx.accounts.bank.load_init()?;

    // Initialize bank
    bank.mint = ctx.accounts.mint.key();
    bank.pool_id = pool_id;
    bank.bump = ctx.bumps.bank;
    bank.status = BankStatus::Inactive as u8; // Initialize as inactive by default

    // Emit event
    emit!(BankInitialized {
        mint: ctx.accounts.mint.key(),
        group_id: pool_id, // Keep event field as is for backwards compatibility
        status: bank.status,
        token_account: ctx.accounts.token_account.key(),
    });

    msg!(
        "Initialized bank for mint: {:?}, pool: {}, status: {:?}, token account: {:?}",
        ctx.accounts.mint.key(),
        pool_id,
        bank.status,
        ctx.accounts.token_account.key()
    );

    Ok(())
}
