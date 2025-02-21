use crate::protocol::{event::AdminAuthorityUpdated, Admin, AdminError, ADMIN_SEED};
use anchor_lang::prelude::*;

/// Accounts required for updating admin authority
#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    /// The admin account to update
    #[account(
        mut,
        seeds = [ADMIN_SEED],
        bump,
        has_one = authority @ AdminError::Unauthorized,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The current authority that must sign
    pub authority: Signer<'info>,

    /// The new authority to be set
    pub new_authority: SystemAccount<'info>,
}

/// Update the admin authority to a new account
/// Can only be called by the current authority
pub fn handle_update_authority(ctx: Context<UpdateAuthority>) -> Result<()> {
    let mut admin = ctx.accounts.admin.load_mut()?;
    let old_authority = admin.authority;

    // Update the authority
    admin.authority = ctx.accounts.new_authority.key();

    msg!(
        "Admin authority updated from {} to {}",
        old_authority,
        admin.authority
    );

    // Emit the update event
    emit!(AdminAuthorityUpdated {
        admin: ctx.accounts.admin.key(),
        old_authority,
        new_authority: admin.authority,
    });

    Ok(())
}
