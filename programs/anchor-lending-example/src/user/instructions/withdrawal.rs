use crate::{
    controller::token::TokenInstructionInterface,
    protocol::{state::Bank, BANK_SEED},
    user::event::UserBalanceUpdated,
    user::state::User,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, TokenInterface};

/// Instruction context for withdrawing tokens
#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// User's wallet that must sign
    #[account(mut)]
    pub user: Signer<'info>,

    /// User's token account to withdraw to
    #[account(
        mut,
        token::authority = user,
        token::mint = bank.load()?.mint,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Bank's token account to withdraw from
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

    /// Bank account to validate status and sign token transfer
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

pub fn handle_withdrawal<'info>(
    ctx: Context<'_, '_, '_, 'info, Withdraw<'info>>,
    amount: u64,
) -> Result<()> {
    let bank = ctx.accounts.bank.load()?;
    let mut user_account = ctx.accounts.user_account.load_mut()?;

    msg!(
        "Executing withdrawal of {} tokens for user {}",
        amount,
        ctx.accounts.user.key()
    );

    // Get previous balance
    let previous_balance = user_account.find_balance_by_bank_id(bank.bank_id);
    msg!("Previous balance: {}", previous_balance);

    // // Verify user has sufficient balance
    // require!(
    //     previous_balance >= amount as i64,
    //     CustomError::InsufficientBalance
    // );

    // Calculate bank PDA seeds for signing
    let bank_seeds = &[
        BANK_SEED,
        &[bank.pool_id][..],
        &[bank.bank_id][..],
        &[bank.bump][..],
    ];

    // Transfer tokens from bank to user
    msg!(
        "Initiating token transfer from bank {}",
        ctx.accounts.bank.key()
    );
    let token_interface =
        TokenInstructionInterface::load(&ctx.accounts.token_program, ctx.remaining_accounts)?;

    token_interface.transfer_with_signer(
        ctx.accounts.bank_token_account.to_account_info(),
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.bank.to_account_info(),
        amount,
        bank_seeds,
    )?;
    msg!("Token transfer completed successfully");

    // Update user account balance (subtract amount)
    msg!("Updating user balance for bank_id: {}", bank.bank_id);
    user_account.update_balance(bank.bank_id, -(amount as i64))?;

    // Get new balance
    let new_balance = user_account.find_balance_by_bank_id(bank.bank_id);
    msg!("New balance: {}", new_balance);

    // Get current timestamp
    let clock = Clock::get()?;

    // Emit balance update event
    msg!("Emitting UserBalanceUpdated event");
    emit!(UserBalanceUpdated {
        user: ctx.accounts.user_account.key(),
        token_id: bank.bank_id,
        previous_balance: previous_balance as u64,
        new_balance: new_balance as u64,
        timestamp: clock.unix_timestamp,
    });

    msg!("Withdrawal completed successfully");
    Ok(())
}
