use crate::{
    controller::{token::TokenInstructionInterface, BankInterface},
    protocol::{
        state::{Bank, BankStatus},
        BankError, BANK_SEED,
    },
    user::{
        event::UserBalanceUpdated,
        state::{Direction, User},
    },
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

pub fn handle_withdrawal<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, Withdraw<'info>>,
    amount: u64,
) -> Result<()> {
    let bank = ctx.accounts.bank.load()?;
    let mut user_account = ctx.accounts.user_account.load_mut()?;

    require!(
        bank.status == BankStatus::Active as u8 || bank.status == BankStatus::ReduceOnly as u8,
        BankError::BankNotAvailableForWithdrawal
    );

    let previous_balance = user_account.find_balance_by_bank_id(bank.bank_id);
    let previous_asset_type = user_account.get_balance_type_by_bank_id(bank.bank_id);

    let bank_seeds = &[
        BANK_SEED,
        &[bank.pool_id][..],
        &[bank.bank_id][..],
        &[bank.bump][..],
    ];

    let token_interface =
        TokenInstructionInterface::load(&ctx.accounts.token_program, ctx.remaining_accounts)?;

    token_interface.transfer_with_signer(
        ctx.accounts.bank_token_account.to_account_info(),
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.bank.to_account_info(),
        amount,
        bank_seeds,
    )?;

    // Use Direction::Withdrawal to handle balance type conversion automatically
    user_account.update_balance(bank.bank_id, amount, Direction::Withdrawal)?;

    let final_balance = user_account.find_balance_by_bank_id(bank.bank_id);
    let new_asset_type = user_account.get_balance_type_by_bank_id(bank.bank_id);

    let clock = Clock::get()?;

    let net_value = {
        // Collect bank IDs from non-zero balances
        let mut bank_ids: Vec<u8> = user_account
            .token_balances
            .iter()
            .filter(|balance| balance.balance != 0 && balance.bank_id != 0)
            .map(|balance| balance.bank_id)
            .collect();

        // Add withdrawal bank ID if not already included
        if !bank_ids.contains(&bank.bank_id) {
            bank_ids.push(bank.bank_id);
        };

        let bank_interface = BankInterface::load(bank_ids, ctx.remaining_accounts)?;

        // Calculate total values
        bank_interface.calculate_total_value(user_account.token_balances)?
    };

    msg!("User total value after withdrawal: Net={}", net_value);

    emit!(UserBalanceUpdated {
        user: ctx.accounts.user_account.key(),
        token_id: bank.bank_id,
        previous_balance: previous_balance.unsigned_abs(),
        previous_asset_type,
        new_balance: final_balance.unsigned_abs(),
        new_asset_type,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Withdrawal completed: amount {} withdrawn for user {}, new balance: {} ({:?})",
        amount,
        ctx.accounts.user.key(),
        final_balance,
        new_asset_type
    );
    Ok(())
}
