use crate::protocol::{event::TokenConfigStatusUpdated, state::*, AdminError};
use anchor_lang::prelude::*;

/// Update token config status
#[derive(Accounts)]
pub struct UpdateTokenConfigStatus<'info> {
    /// The admin account
    #[account(
        seeds = [ADMIN_SEED],
        bump,
        has_one = authority @ AdminError::Unauthorized,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The authority that must sign
    pub authority: Signer<'info>,

    /// The token config account to update
    #[account(mut)]
    pub token_config: AccountLoader<'info, TokenConfig>,
}

/// Handles updating the status of a token config
pub fn handle_update_token_config_status(
    ctx: Context<UpdateTokenConfigStatus>,
    new_status: u8,
) -> Result<()> {
    // Input validation
    require_gte!(
        TokenConfigStatus::ReduceOnly as u8,
        new_status,
        AdminError::InvalidInput
    );

    // Load token config and update status
    let mut token_config = ctx.accounts.token_config.load_mut()?;
    token_config.status = new_status;

    // Emit event
    emit!(TokenConfigStatusUpdated {
        mint: token_config.mint,
        old_status: token_config.status,
        new_status,
    });

    msg!(
        "Token config status updated for mint: {}",
        token_config.mint
    );
    Ok(())
}
