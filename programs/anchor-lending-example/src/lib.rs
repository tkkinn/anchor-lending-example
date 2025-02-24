#[macro_use]
pub mod protocol;
pub mod controller;
pub mod user;

use crate::protocol::*;
use crate::user::*;
use anchor_lang::prelude::*;

// Program ID
declare_id!("HKViZ7i7fEpfqcpCpDWAfmZpuVZ6WSRXST85nf1w227q");

#[program]
pub mod anchor_lending_example {
    use super::*;

    /// Initialize the lending program by creating an admin account
    /// The admin account will have authority over certain program functions
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        protocol::handle_initialize(ctx)
    }

    /// Update the admin authority to a new account
    /// Can only be called by the current authority
    pub fn update_authority(ctx: Context<UpdateAuthority>) -> Result<()> {
        protocol::handle_update_authority(ctx)
    }

    /// Initialize a new pool
    /// Can only be called by the admin authority
    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        protocol::handle_initialize_pool(ctx)
    }

    /// Initialize configuration for a new bank
    /// Can only be called by the admin authority
    pub fn initialize_bank(
        ctx: Context<InitializeBank>,
        pool_id: u8,
        params: BankConfigParams,
    ) -> Result<()> {
        protocol::handle_initialize_bank(ctx, pool_id, params)
    }

    /// Update the operational status of a bank
    /// Can only be called by the admin authority
    pub fn update_bank_status(ctx: Context<UpdateBankStatus>, new_status: u8) -> Result<()> {
        protocol::handle_update_bank_status(ctx, new_status)
    }

    /// Update the price feed for a bank
    /// Can only be called by the admin authority
    pub fn update_price(ctx: Context<UpdatePrice>, params: UpdatePriceParams) -> Result<()> {
        protocol::handle_update_price(ctx, params)
    }

    /// Initialize a new user account with unique ID in a specific token group
    /// This creates a PDA account for the user that will hold their lending protocol state
    pub fn initialize_user(ctx: Context<InitializeUser>, pool_id: u8, user_id: u16) -> Result<()> {
        user::handle_initialize_user(ctx, pool_id, user_id)
    }

    /// Deposit tokens into a bank
    /// User must sign the transaction and provide token account with sufficient balance
    pub fn deposit<'info>(
        ctx: Context<'_, '_, '_, 'info, Deposit<'info>>,
        amount: u64,
    ) -> Result<()> {
        user::handle_deposit(ctx, amount)
    }

    /// Withdraw tokens from a bank
    /// User must sign the transaction and have sufficient balance in their user account
    pub fn withdraw<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, Withdraw<'info>>,
        amount: u64,
    ) -> Result<()> {
        user::handle_withdrawal(ctx, amount)
    }

    /// Liquidate an unhealthy position
    /// Liquidator must provide sufficient tokens to repay the liability
    pub fn liquidate<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, Liquidate<'info>>,
        amount: u64,
    ) -> Result<()> {
        user::handle_liquidate(ctx, amount)
    }
}
