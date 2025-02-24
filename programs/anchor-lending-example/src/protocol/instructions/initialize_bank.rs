use crate::protocol::{event::BankInitialized, state::*, AdminError};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

/// Parameters for initializing a new bank
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BankConfigParams {
    /// Weight applied to assets for initial collateral ratio calculations
    pub initial_asset_weight: u8,
    /// Weight applied to assets for maintenance collateral ratio calculations  
    pub maintenance_asset_weight: u8,
    /// Weight applied to liabilities for initial borrowing limits
    pub initial_liability_weight: u8,
    /// Weight applied to liabilities for maintenance requirements
    pub maintenance_liability_weight: u8,
}

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

    /// The pool account
    #[account(
        mut,
        seeds = [POOL_SEED, &[pool_id][..]],
        bump,
    )]
    pub pool: AccountLoader<'info, Pool>,

    /// The bank account to initialize
    #[account(
        init,
        payer = authority,
        space = BANK_SPACE,
        seeds = [
            BANK_SEED,
            &[pool_id][..],
            &[pool.load()?.bank_count][..],
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

pub fn handle_initialize_bank(
    ctx: Context<InitializeBank>,
    pool_id: u8,
    params: BankConfigParams,
) -> Result<()> {
    let admin = ctx.accounts.admin.load()?;

    // Verify pool_id exists
    require_gte!(admin.pool_count, pool_id + 1, AdminError::InvalidGroupId);

    let mut pool = ctx.accounts.pool.load_mut()?;
    let bank_id = pool.bank_count;

    // Increment bank count
    pool.bank_count = pool.bank_count.checked_add(1).ok_or(AdminError::Overflow)?;

    let mut bank = ctx.accounts.bank.load_init()?;

    // Initialize bank
    bank.mint = ctx.accounts.mint.key();
    bank.decimals = ctx.accounts.mint.decimals;
    bank.pool_id = pool_id;
    bank.bank_id = bank_id;
    bank.status = BankStatus::Inactive as u8;

    // Set bank weights
    bank.initial_asset_weight = params.initial_asset_weight;
    bank.maintenance_asset_weight = params.maintenance_asset_weight;
    bank.initial_liability_weight = params.initial_liability_weight;
    bank.maintenance_liability_weight = params.maintenance_liability_weight;

    // Emit event
    emit!(BankInitialized {
        mint: ctx.accounts.mint.key(),
        group_id: pool_id,
        status: bank.status,
        token_account: ctx.accounts.token_account.key(),
    });

    msg!(
        "Initialized bank #{} for mint: {:?}, pool: {}, decimals: {}, status: {:?}, token account: {:?}",
        bank_id,
        ctx.accounts.mint.key(),
        pool_id,
        bank.decimals,
        bank.status,
        ctx.accounts.token_account.key()
    );

    Ok(())
}
