use crate::user::state::BalanceType;
use anchor_lang::prelude::*;

/// Event emitted when a new user account is initialized
#[event]
pub struct UserInitialized {
    /// The user account address
    #[index]
    pub user: Pubkey,
    /// The user's authority
    pub authority: Pubkey,
    /// The user's ID
    pub user_id: u16,
    /// Pool ID
    pub pool_id: u8,
}

/// Event emitted when a user's token balance is updated
#[event]
pub struct UserBalanceUpdated {
    /// The user account address
    #[index]
    pub user: Pubkey,
    /// Token ID
    pub token_id: u8,
    /// Previous balance
    pub previous_balance: u64,
    /// Previous asset type (Collateral/Liability)
    pub previous_asset_type: BalanceType,
    /// New balance
    pub new_balance: u64,
    /// New asset type (Collateral/Liability)
    pub new_asset_type: BalanceType,
    /// Timestamp of the update
    pub timestamp: i64,
}
