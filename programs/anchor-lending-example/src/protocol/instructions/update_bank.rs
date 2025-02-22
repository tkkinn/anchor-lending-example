use crate::protocol::{event::BankStatusUpdated, state::*, AdminError};
use anchor_lang::prelude::*;

/// Update bank status
#[derive(Accounts)]
pub struct UpdateBankStatus<'info> {
    /// The admin account
    #[account(
        seeds = [ADMIN_SEED],
        bump,
        has_one = authority @ AdminError::Unauthorized,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The authority that must sign
    pub authority: Signer<'info>,

    /// The bank account to update
    #[account(mut)]
    pub bank: AccountLoader<'info, Bank>,
}

/// Handles updating the status of a bank
pub fn handle_update_bank_status(ctx: Context<UpdateBankStatus>, new_status: u8) -> Result<()> {
    // Input validation
    require_gte!(
        BankStatus::ReduceOnly as u8,
        new_status,
        AdminError::InvalidInput
    );

    // Load bank and update status
    let mut bank = ctx.accounts.bank.load_mut()?;
    let old_status = bank.status;
    bank.status = new_status;

    // Emit event
    emit!(BankStatusUpdated {
        mint: bank.mint,
        old_status,
        new_status,
    });

    msg!("Bank status updated for mint: {}", bank.mint);
    Ok(())
}
