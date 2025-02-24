use crate::protocol::state::PriceFeedMessage;
use anchor_lang::prelude::*;

/// Calculates the USD value of a token amount using a price feed
///
/// # Arguments
///
/// * `amount` - The token amount as u64, scaled by token decimals
/// * `token_decimals` - Number of decimals used by the token
/// * `price_feed` - Price feed message containing current price and exponent
///
/// # Returns
///
/// * `Result<u64>` - The USD value scaled to 6 decimals, or error if math overflow occurs
///
/// # Math
///
/// 1. Converts amount and price to u128 for safe multiplication
/// 2. Multiplies amount by price
/// 3. Adjusts result based on price feed exponent to get 6 decimal places
/// 4. Converts back to u64 after calculations
pub fn calculate_token_value(
    amount: u64,
    token_decimals: u8,
    price_feed: &PriceFeedMessage,
) -> Result<u64> {
    let amount_u128 = amount as u128;
    let price_u128 = price_feed.price as u128;

    // Check for overflow before multiplying the amount and price
    if amount_u128 > u128::MAX / price_u128 {
        return Err(ErrorCode::MathOverflow.into());
    }

    // Step 1: Adjust price by its exponent to get the actual price in UI scale
    let actual_price_u128 = price_u128
        .checked_mul(10u128.pow(price_feed.exponent.unsigned_abs()))
        .ok_or(ErrorCode::MathOverflow)?;

    // Step 2: Calculate the base value by multiplying the amount and actual price
    let base_value = amount_u128
        .checked_mul(actual_price_u128)
        .ok_or(ErrorCode::MathOverflow)?;

    // Step 3: Adjust for token decimals by dividing by 10^token_decimals
    let decimal_adj = base_value
        .checked_div(10u128.pow(token_decimals as u32))
        .ok_or(ErrorCode::MathOverflow)?;

    // Step 4: Adjust for the price exponent to get 6 decimals output
    let exp_adj = 6 - price_feed.exponent;
    let adj_factor = 10u128.pow(exp_adj.unsigned_abs());

    let final_value_u128 = if exp_adj > 0 {
        decimal_adj
            .checked_mul(adj_factor)
            .ok_or(ErrorCode::MathOverflow)?
    } else {
        decimal_adj
            .checked_div(adj_factor)
            .ok_or(ErrorCode::MathOverflow)?
    };

    // Step 5: Verify final value fits within u64 before conversion
    if final_value_u128 > u64::MAX as u128 {
        return Err(ErrorCode::MathOverflow.into());
    }

    Ok(final_value_u128 as u64)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Math operation overflow")]
    MathOverflow,
}
