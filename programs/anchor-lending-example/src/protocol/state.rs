use anchor_lang::prelude::*;
use std::mem::size_of;

/// Admin account data
#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct Admin {
    /// The authority pubkey that has admin privileges
    pub authority: Pubkey,
    /// Number of pools that have been initialized
    pub pool_count: u8,
}

/// Pool account data  
#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct Pool {
    /// Number of banks initialized in this pool
    pub bank_count: u8,
}

/// Constants for account initialization
pub const ADMIN_SEED: &[u8] = b"admin";
pub const ADMIN_SPACE: usize = 8 + size_of::<Admin>();
pub const POOL_SEED: &[u8] = b"pool";
pub const POOL_SPACE: usize = 8 + size_of::<Pool>();

/// Bank status indicating operational state
#[derive(Default, Clone, Copy, PartialEq, Debug)]
#[repr(u8)]
pub enum BankStatus {
    #[default]
    /// Bank is inactive and cannot be used
    Inactive = 0,
    /// Bank is active and can be used for all operations
    Active = 1,
    /// Bank is in reduce-only mode - no new positions allowed
    ReduceOnly = 2,
}

/// Bank account data
#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct Bank {
    /// The bank ID within the pool
    pub bank_id: u8,
    /// The pool ID
    pub pool_id: u8,
    /// Current operational status
    pub status: u8,
    /// The decimal places of the token mint
    pub decimals: u8,

    /// Weight applied to assets for initial collateral ratio calculations
    pub initial_asset_weight: u8,
    /// Weight applied to assets for maintenance collateral ratio calculations
    pub maintenance_asset_weight: u8,
    /// Weight applied to liabilities for initial borrowing limits
    pub initial_liability_weight: u8,
    /// Weight applied to liabilities for maintenance requirements
    pub maintenance_liability_weight: u8,

    /// The token mint address
    pub mint: Pubkey,
    /// The price message
    pub price_message: PriceFeedMessage,
}

/// Message containing price feed data
#[derive(Default)]
#[zero_copy]
pub struct PriceFeedMessage {
    /// Exponential moving average price
    pub ema_price: u64,
    /// EMA confidence interval
    pub ema_conf: u64,
    /// Current price
    pub price: u64,
    /// Confidence interval around the price
    pub conf: u64,
    /// Price exponent
    pub exponent: i32,
    pub padding: i32,
    /// Timestamp of price update
    pub publish_time: i64,
}

pub const BANK_SEED: &[u8] = b"bank";
pub const BANK_SPACE: usize = 8 + size_of::<Bank>();
