use crate::protocol::{state::*, AdminError};
use anchor_lang::prelude::*;

/// Parameters for updating price information
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdatePriceParams {
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
    /// Timestamp of price update
    pub publish_time: i64,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    /// The admin account containing authority info
    #[account(
        constraint = admin.load()?.authority == authority.key() @ AdminError::Unauthorized,
    )]
    pub admin: AccountLoader<'info, Admin>,

    /// The bank account to update price for
    #[account(mut)]
    pub bank: AccountLoader<'info, Bank>,

    /// The authority that can update prices
    pub authority: Signer<'info>,
}

/// Update price data for a bank
pub fn handle_update_price(ctx: Context<UpdatePrice>, params: UpdatePriceParams) -> Result<()> {
    let mut bank = ctx.accounts.bank.load_mut()?;

    // Update bank price message
    bank.price_message = PriceFeedMessage {
        ema_price: params.ema_price,
        ema_conf: params.ema_conf,
        price: params.price,
        conf: params.conf,
        exponent: params.exponent,
        padding: 0, // Default padding
        publish_time: params.publish_time,
    };

    // Emit event with full price information
    emit!(PriceUpdateEvent {
        bank: ctx.accounts.bank.key(),
        price: params.price,
        conf: params.conf,
        ema_price: params.ema_price,
        ema_conf: params.ema_conf,
        publish_time: params.publish_time
    });

    msg!(
        "Updated price for bank {}: price={}, conf={}, ema_price={}, ema_conf={}, time={}",
        ctx.accounts.bank.key(),
        params.price,
        params.conf,
        params.ema_price,
        params.ema_conf,
        params.publish_time
    );

    Ok(())
}

#[event]
pub struct PriceUpdateEvent {
    pub bank: Pubkey,
    pub price: u64,
    pub conf: u64,
    pub ema_price: u64,
    pub ema_conf: u64,
    pub publish_time: i64,
}
