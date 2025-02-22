#[macro_use]
// pub mod utils;
pub mod protocol;
// pub mod user;

use crate::protocol::*;
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
    pub fn initialize_bank(ctx: Context<InitializeBank>, group_id: u8) -> Result<()> {
        protocol::handle_initialize_bank(ctx, group_id)
    }

    /// Update the operational status of a bank
    /// Can only be called by the admin authority
    pub fn update_bank_status(ctx: Context<UpdateBankStatus>, new_status: u8) -> Result<()> {
        protocol::handle_update_bank_status(ctx, new_status)
    }

    // /// Initialize a new user account with unique ID in a specific token group
    // /// This creates a PDA account for the user that will hold their lending protocol state
    // pub fn initialize_user(ctx: Context<InitializeUser>, group_id: u8, user_id: u16) -> Result<()> {
    //     user::handle_initialize_user(ctx, group_id, user_id)
    // }
}
