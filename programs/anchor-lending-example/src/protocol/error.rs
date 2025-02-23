use anchor_lang::prelude::*;

/// Errors related to admin operations
#[error_code]
pub enum AdminError {
    /// Operation was attempted by an unauthorized account
    #[msg("Operation not authorized")]
    Unauthorized,

    /// Invalid group ID
    #[msg("Invalid group ID")]
    InvalidGroupId,

    /// Invalid input
    #[msg("Invalid input")]
    InvalidInput,

    /// Numeric overflow occurred
    #[msg("Numeric overflow occurred")]
    Overflow,
}

#[error_code]
pub enum BankError {
    #[msg("Bank account not found")]
    BankNotFound,

    #[msg("Bank is inactive for deposits")]
    BankInactive,

    #[msg("Bank is not available for withdrawals")]
    BankNotAvailableForWithdrawal,
}
