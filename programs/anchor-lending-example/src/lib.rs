use anchor_lang::prelude::*;

mod protocol;

use protocol::*;

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

    /// Initialize a new token group
    /// Can only be called by the admin authority
    pub fn initialize_token_group(ctx: Context<InitializeTokenGroup>) -> Result<()> {
        protocol::handle_initialize_token_group(ctx)
    }

    /// Initialize configuration for a new token
    /// Can only be called by the admin authority
    pub fn initialize_token_config(
        ctx: Context<InitializeTokenConfig>,
        group_id: u8,
    ) -> Result<()> {
        protocol::handle_initialize_token_config(ctx, group_id)
    }

    /// Update the operational status of a token config
    /// Can only be called by the admin authority
    pub fn update_token_config_status(
        ctx: Context<UpdateTokenConfigStatus>,
        new_status: u8,
    ) -> Result<()> {
        protocol::handle_update_token_config_status(ctx, new_status)
    }
}
