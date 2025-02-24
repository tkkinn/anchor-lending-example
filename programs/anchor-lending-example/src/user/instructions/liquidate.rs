use crate::{
    controller::{oracle::calculate_token_value, token::TokenInstructionInterface, BankInterface},
    protocol::{
        state::{Bank, BankStatus},
        BankError, BANK_SEED,
    },
    user::{
        event::UserBalanceUpdated,
        state::{Direction, User},
        UserError,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, TokenInterface};

// Constant for liquidation discount (5%)
const LIQUIDATION_DISCOUNT: u8 = 95;

/// Instruction context for liquidating an unhealthy position
#[derive(Accounts)]
pub struct Liquidate<'info> {
    /// Liquidator that must sign
    #[account(mut)]
    pub liquidator: Signer<'info>,

    /// Liquidator's token account to receive collateral
    #[account(
        mut,
        token::authority = liquidator,
        token::mint = collateral_bank.load()?.mint,
    )]
    pub liquidator_collateral_token: InterfaceAccount<'info, TokenAccount>,

    /// Liquidator's token account to repay liability
    #[account(
        mut,
        token::authority = liquidator,
        token::mint = liability_bank.load()?.mint,
    )]
    pub liquidator_liability_token: InterfaceAccount<'info, TokenAccount>,

    /// Unhealthy user's account to liquidate
    #[account(
        mut,
        constraint = user_account.load()?.pool_id == collateral_bank.load()?.pool_id,
        constraint = user_account.load()?.pool_id == liability_bank.load()?.pool_id,
    )]
    pub user_account: AccountLoader<'info, User>,

    /// Bank account for collateral token
    #[account(
        mut,
        seeds = [
            BANK_SEED,
            &[collateral_bank.load()?.pool_id][..],
            &[collateral_bank.load()?.bank_id][..],
        ],
        bump,
    )]
    pub collateral_bank: AccountLoader<'info, Bank>,

    /// Bank account for liability token  
    #[account(
        mut,
        seeds = [
            BANK_SEED,
            &[liability_bank.load()?.pool_id][..],
            &[liability_bank.load()?.bank_id][..],
        ],
        bump,
    )]
    pub liability_bank: AccountLoader<'info, Bank>,

    /// Bank's token account for collateral
    #[account(
        mut,
        seeds = [
            b"token_account",
            collateral_bank.key().as_ref(),
        ],
        bump,
        token::authority = collateral_bank,
        token::mint = collateral_bank.load()?.mint,
    )]
    pub bank_collateral_token: InterfaceAccount<'info, TokenAccount>,

    /// Bank's token account for liability
    #[account(
        mut,
        seeds = [
            b"token_account", 
            liability_bank.key().as_ref(),
        ],
        bump,
        token::authority = liability_bank,
        token::mint = liability_bank.load()?.mint,
    )]
    pub bank_liability_token: InterfaceAccount<'info, TokenAccount>,

    /// Token program
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_liquidate<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, Liquidate<'info>>,
    liability_amount: u64,
) -> Result<()> {
    // Load accounts
    let collateral_bank = ctx.accounts.collateral_bank.load()?;
    let liability_bank = ctx.accounts.liability_bank.load()?;
    let collateral_bank_id = collateral_bank.bank_id;
    let liability_bank_id = liability_bank.bank_id;
    let mut user_account = ctx.accounts.user_account.load_mut()?;

    // Verify banks are active
    require!(
        collateral_bank.status == BankStatus::Active as u8,
        BankError::BankInactive
    );
    require!(
        liability_bank.status == BankStatus::Active as u8
            || liability_bank.status == BankStatus::ReduceOnly as u8,
        BankError::BankNotAvailableForWithdrawal
    );

    // Collect bank IDs from non-zero balances
    let bank_ids: Vec<u8> = user_account
        .token_balances
        .iter()
        .filter(|balance| balance.balance != 0 && balance.bank_id != 0)
        .map(|balance| balance.bank_id)
        .collect();

    let bank_interface = BankInterface::load(bank_ids, ctx.remaining_accounts)?;

    // Check if position is liquidatable
    let (maintenance_collateral, maintenance_liability) =
        bank_interface.calculate_total_maintenance_values(user_account.token_balances)?;

    require!(
        maintenance_collateral < maintenance_liability,
        UserError::PositionHealthy
    );

    // Calculate repayment and collateral amount with discount
    let liability_value = calculate_token_value(
        liability_amount,
        liability_bank.decimals,
        &liability_bank.price_message,
    )?;
    let collateral_amount = ((liability_value as u128)
        .checked_mul(100)
        .ok_or(error!(UserError::MathOverflow))?
        .checked_div(LIQUIDATION_DISCOUNT as u128)
        .ok_or(error!(UserError::MathOverflow))?) as u64;

    // Get token interface
    let token_interface =
        TokenInstructionInterface::load(&ctx.accounts.token_program, ctx.remaining_accounts)?;

    // Bank seed for signing transfers
    let collateral_bank_seeds = &[
        BANK_SEED,
        &[collateral_bank.pool_id][..],
        &[collateral_bank.bank_id][..],
        &[ctx.bumps.collateral_bank][..],
    ];

    // First repay liability
    token_interface.transfer(
        ctx.accounts.liquidator_liability_token.to_account_info(),
        ctx.accounts.bank_liability_token.to_account_info(),
        ctx.accounts.liquidator.to_account_info(),
        liability_amount,
    )?;

    // Then transfer collateral
    token_interface.transfer_with_signer(
        ctx.accounts.bank_collateral_token.to_account_info(),
        ctx.accounts.liquidator_collateral_token.to_account_info(),
        ctx.accounts.collateral_bank.to_account_info(),
        collateral_amount,
        collateral_bank_seeds,
    )?;

    // Update user balances
    let clock = Clock::get()?;

    // For liability
    let previous_liability = user_account.find_balance_by_bank_id(liability_bank_id);
    let previous_liability_type = user_account.get_balance_type_by_bank_id(liability_bank_id);
    user_account.update_balance(liability_bank_id, liability_amount, Direction::Deposit)?;
    let new_liability = user_account.find_balance_by_bank_id(liability_bank_id);
    let new_liability_type = user_account.get_balance_type_by_bank_id(liability_bank_id);

    emit!(UserBalanceUpdated {
        user: ctx.accounts.user_account.key(),
        token_id: liability_bank_id,
        previous_balance: previous_liability.unsigned_abs(),
        previous_asset_type: previous_liability_type,
        new_balance: new_liability.unsigned_abs(),
        new_asset_type: new_liability_type,
        timestamp: clock.unix_timestamp,
    });

    // For collateral
    let previous_collateral = user_account.find_balance_by_bank_id(collateral_bank_id);
    let previous_collateral_type = user_account.get_balance_type_by_bank_id(collateral_bank_id);
    user_account.update_balance(collateral_bank_id, collateral_amount, Direction::Withdrawal)?;
    let new_collateral = user_account.find_balance_by_bank_id(collateral_bank_id);
    let new_collateral_type = user_account.get_balance_type_by_bank_id(collateral_bank_id);

    emit!(UserBalanceUpdated {
        user: ctx.accounts.user_account.key(),
        token_id: collateral_bank_id,
        previous_balance: previous_collateral.unsigned_abs(),
        previous_asset_type: previous_collateral_type,
        new_balance: new_collateral.unsigned_abs(),
        new_asset_type: new_collateral_type,
        timestamp: clock.unix_timestamp,
    });

    // Check final position health improved
    let (final_maintenance_collateral, _final_maintenance_liability) =
        bank_interface.calculate_total_maintenance_values(user_account.token_balances)?;

    require_gte!(
        final_maintenance_collateral,
        maintenance_collateral,
        UserError::InsufficientCollateral
    );

    msg!(
        "Liquidation completed: {} liability repaid with {} collateral seized from user {}",
        liability_amount,
        collateral_amount,
        ctx.accounts.user_account.key()
    );

    Ok(())
}
