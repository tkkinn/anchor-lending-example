use anchor_lang::prelude::*;

/// Event emitted when admin is initialized
#[event]
pub struct AdminInitialized {
    /// The admin account address
    #[index]
    pub admin: Pubkey,
    /// The authority set for this admin
    pub authority: Pubkey,
}

/// Event emitted when admin authority is updated
#[event]
pub struct AdminAuthorityUpdated {
    /// The admin account address
    #[index]
    pub admin: Pubkey,
    /// The old authority
    pub old_authority: Pubkey,
    /// The new authority  
    pub new_authority: Pubkey,
}

/// Event emitted when a new token group is initialized
#[event]
pub struct TokenGroupInitialized {
    /// The group ID that was initialized  
    #[index]
    pub group_id: u8,
    /// The authority that initialized it
    pub authority: Pubkey,
}

#[event]
pub struct TokenConfigInitialized {
    pub mint: Pubkey,
    pub group_id: u8,
    pub status: u8,
    pub token_account: Pubkey,
}

/// Event emitted when token config status is updated
#[event]
pub struct TokenConfigStatusUpdated {
    /// The token mint address
    pub mint: Pubkey,
    /// Previous token status
    pub old_status: u8,
    /// New token status
    pub new_status: u8,
}
