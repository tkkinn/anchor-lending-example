use anchor_lang::prelude::*;
use std::mem::size_of;

/// Admin account data
#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct Admin {
    /// The authority pubkey that has admin privileges
    pub authority: Pubkey,
    /// Number of token groups that have been initialized
    pub token_group_count: u8,
}

/// Constants for account initialization
pub const ADMIN_SEED: &[u8] = b"admin";
pub const ADMIN_SPACE: usize = 8 + size_of::<Admin>();

/// Token config status indicating operational state
#[derive(Default, Clone, Copy, PartialEq, Debug)]
#[repr(u8)]
pub enum TokenConfigStatus {
    #[default]
    /// Token is inactive and cannot be used
    Inactive = 0,
    /// Token is active and can be used for all operations
    // Active = 1,
    /// Token is in reduce-only mode - no new positions allowed
    ReduceOnly = 2,
}

/// Token config account data
#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct TokenConfig {
    /// The token mint address
    pub mint: Pubkey,
    /// The token group ID
    pub group_id: u8,
    /// The PDA bump seed
    pub bump: u8,
    /// Current operational status
    pub status: u8,
}

pub const TOKEN_CONFIG_SEED: &[u8] = b"token_config";
pub const TOKEN_CONFIG_SPACE: usize = 8 + size_of::<TokenConfig>();
