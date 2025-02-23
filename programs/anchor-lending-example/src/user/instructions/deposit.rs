use crate::{
    controller::token::TokenInstructionInterface,
    protocol::{
        state::{Bank, BankStatus},
        BankError, BANK_SEED,
    },
    user::event::UserBalanceUpdated,
    user::state::User,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, TokenInterface};

/// Instruction context for depositing tokens
#[derive(Accounts)]
pub struct Deposit<'info> {
    /// User's wallet that must sign
    #[account(mut)]
    pub user: Signer<'info>,

    /// User's token account to deposit from
    #[account(
        mut,
        token::authority = user,
        token::mint = bank.load()?.mint,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Bank's token account to deposit to
    #[account(
        mut,
        seeds = [
            b"token_account",
            bank.key().as_ref(),
        ],
        bump,
        token::authority = bank,
        token::mint = bank.load()?.mint,
    )]
    pub bank_token_account: InterfaceAccount<'info, TokenAccount>,

    /// User account to update balance
    #[account(
        mut,
        constraint = user_account.load()?.authority == user.key(),
        constraint = user_account.load()?.pool_id == bank.load()?.pool_id,
    )]
    pub user_account: AccountLoader<'info, User>,

    /// Bank account to validate status
    #[account(
        mut,
        seeds = [
            BANK_SEED,
            &[bank.load()?.pool_id][..],
            &[bank.load()?.bank_id][..],
        ],
        bump = bank.load()?.bump,
    )]
    pub bank: AccountLoader<'info, Bank>,

    /// Token program, either Token or Token2022
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_deposit<'info>(
    ctx: Context<'_, '_, '_, 'info, Deposit<'info>>,
    amount: u64,
) -> Result<()> {
    let bank = ctx.accounts.bank.load()?;
    let mut user_account = ctx.accounts.user_account.load_mut()?;

    // Check bank status - only allow deposits when Active
    require_eq!(
        bank.status,
        BankStatus::Active as u8,
        BankError::BankInactive
    );

    let previous_balance = user_account.find_balance_by_bank_id(bank.bank_id);

    let token_interface =
        TokenInstructionInterface::load(&ctx.accounts.token_program, ctx.remaining_accounts)?;

    token_interface.transfer(
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.bank_token_account.to_account_info(),
        ctx.accounts.user.to_account_info(),
        amount,
    )?;

    user_account.update_balance(bank.bank_id, amount as i64)?;

    let new_balance = user_account.find_balance_by_bank_id(bank.bank_id);

    let clock = Clock::get()?;

    emit!(UserBalanceUpdated {
        user: ctx.accounts.user_account.key(),
        token_id: bank.bank_id,
        previous_balance: previous_balance as u64,
        new_balance: new_balance as u64,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Deposit completed: amount {} deposited for user {}, new balance: {}",
        amount,
        ctx.accounts.user.key(),
        new_balance
    );
    Ok(())
}
