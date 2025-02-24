use anchor_lang::prelude::*;

#[error_code]
pub enum UserError {
    #[msg("User account already initialized")]
    AlreadyInitialized,
    #[msg("Invalid authority provided")]
    InvalidAuthority,
    #[msg("Balance update overflow")]
    BalanceUpdateOverflow,
    #[msg("Reach max token types in a single account, no extra token types can be insert, consider create a new account.")]
    MaxTokenTypes,
    #[msg("Pool not found")]
    PoolNotFound,
    #[msg("Invalid collateral balance")]
    InvalidCollateralBalance,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
}
