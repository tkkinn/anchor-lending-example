use anchor_lang::{prelude::*, Discriminator};
use arrayref::array_ref;

use crate::controller::oracle::calculate_token_value;
use crate::protocol::{Bank, BANK_SPACE};
use crate::user::state::{BalanceType, TokenBalance};

#[error_code]
pub enum BankError {
    #[msg("Missing required banks")]
    MissingRequiredBanks,
    #[msg("Bank not found for token balance")]
    BankNotFound,
    #[msg("Math overflow in collateral calculation")]
    CollateralOverflow,
    #[msg("Math overflow in liability calculation")]
    LiabilityOverflow,
    #[msg("Math overflow in final net value calculation")]
    NetValueOverflow,
    #[msg("Math overflow in weight calculation")]
    WeightOverflow,
}

pub struct BankInterface<'a> {
    pub banks: Vec<(u8, AccountLoader<'a, Bank>)>,
}

impl<'a> BankInterface<'a> {
    /// Load bank interface with required and optional bank accounts
    /// @param remaining_account - List of required bank accounts
    /// @param bank_ids - List of required bank IDs
    pub fn load<'c: 'a>(
        bank_ids: Vec<u8>,
        remaining_account: &'c [AccountInfo<'a>],
    ) -> Result<BankInterface<'a>> {
        let mut bank_interface = BankInterface { banks: vec![] };

        // Process all accounts
        for account_info in remaining_account.iter() {
            // Skip if account owner is not the program
            if account_info.owner != &crate::ID {
                continue;
            }

            let data = account_info.try_borrow_data()?;

            if data.len() != BANK_SPACE {
                continue;
            }

            if array_ref![data, 0, 8] != &Bank::DISCRIMINATOR {
                continue;
            }

            let account_loader: AccountLoader<'_, Bank> = AccountLoader::try_from(account_info)?;
            let bank = account_loader.load()?;
            if bank_interface
                .banks
                .iter()
                .any(|(id, _loader)| *id == bank.bank_id)
            {
                continue;
            }
            bank_interface
                .banks
                .push((bank.bank_id, account_loader.clone()));
        }

        // Validate that all required banks are present
        for required_id in bank_ids.iter() {
            if !bank_interface.banks.iter().any(|(id, _)| id == required_id) {
                return Err(error!(BankError::MissingRequiredBanks));
            }
        }

        Ok(bank_interface)
    }

    fn calculate_sum(
        &self,
        token_balances: &[TokenBalance; 16],
        required_type: BalanceType,
        weight_selector: Option<fn(&Bank) -> u8>,
        overflow_error: BankError,
    ) -> Result<u128> {
        let mut total: u128 = 0;
        for balance in token_balances.iter() {
            if balance.balance_type != required_type as u8
                || balance.balance == 0
                || balance.bank_id == 0
            {
                continue;
            }
            let bank = self
                .banks
                .iter()
                .find(|(id, _)| *id == balance.bank_id)
                .ok_or(error!(BankError::BankNotFound))?
                .1
                .load()?;
            let usd_value =
                calculate_token_value(balance.balance, bank.decimals, &bank.price_message)?;
            let final_value = if let Some(weight_fn) = weight_selector {
                let w = weight_fn(&bank) as u128;
                (usd_value as u128)
                    .checked_mul(w)
                    .ok_or(error!(BankError::WeightOverflow))?
                    .checked_div(100)
                    .ok_or(error!(BankError::WeightOverflow))?
            } else {
                usd_value as u128
            };
            total = total
                .checked_add(final_value)
                .ok_or(error!(overflow_error))?;
        }
        Ok(total)
    }

    /// Calculates the total collateral value (sum of collateral balances)
    /// Returns the sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total collateral value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    fn calculate_total_collateral_value(
        &self,
        token_balances: &[TokenBalance; 16],
    ) -> Result<u128> {
        self.calculate_sum(
            token_balances,
            BalanceType::Collateral,
            None,
            BankError::CollateralOverflow,
        )
    }

    /// Calculates the total liability value (sum of liability balances)
    /// Returns the sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total liability value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    fn calculate_total_liability_value(&self, token_balances: &[TokenBalance; 16]) -> Result<u128> {
        self.calculate_sum(
            token_balances,
            BalanceType::Liability,
            None,
            BankError::LiabilityOverflow,
        )
    }

    /// Calculates the net value (total collateral minus total liability)
    /// Returns the net sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Net value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    ///   - Net value becomes negative (underflow)
    ///
    /// # Example
    ///
    /// ```ignore
    /// let net_value = bank_interface.calculate_total_value(user.token_balances)?;
    /// ```
    pub fn calculate_total_value(&self, token_balances: [TokenBalance; 16]) -> Result<u128> {
        let collateral = self.calculate_total_collateral_value(&token_balances)?;
        let liability = self.calculate_total_liability_value(&token_balances)?;

        // Ensure collateral covers liability
        if collateral < liability {
            return Err(error!(BankError::NetValueOverflow));
        }

        // Calculate net value (guaranteed no underflow due to above check)
        let net_value = collateral - liability;

        Ok(net_value)
    }

    /// Calculates the total collateral value with Initial Asset Weight applied
    /// Returns the weighted sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total weighted collateral value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    ///   - Weight multiplication overflow
    pub fn calculate_total_weighted_collateral_value(
        &self,
        token_balances: &[TokenBalance; 16],
    ) -> Result<u128> {
        self.calculate_sum(
            token_balances,
            BalanceType::Collateral,
            Some(|b: &Bank| b.initial_asset_weight),
            BankError::CollateralOverflow,
        )
    }

    /// Calculates the total liability value with Initial Liability Weight applied
    /// Returns the weighted sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total weighted liability value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    ///   - Weight multiplication overflow
    pub fn calculate_total_weighted_liability_value(
        &self,
        token_balances: &[TokenBalance; 16],
    ) -> Result<u128> {
        self.calculate_sum(
            token_balances,
            BalanceType::Liability,
            Some(|b: &Bank| b.initial_liability_weight),
            BankError::LiabilityOverflow,
        )
    }

    /// Calculates both weighted collateral and liability values
    /// Returns (weighted_collateral, weighted_liability) tuple
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<(u128, u128)>` - Tuple of weighted collateral and liability values in USD (6 decimals)
    pub fn calculate_total_weighted_values(
        &self,
        token_balances: [TokenBalance; 16],
    ) -> Result<(u128, u128)> {
        let weighted_collateral =
            self.calculate_total_weighted_collateral_value(&token_balances)?;
        let weighted_liability = self.calculate_total_weighted_liability_value(&token_balances)?;

        Ok((weighted_collateral, weighted_liability))
    }

    /// Calculates the total collateral value with Maintenance Asset Weight applied
    /// Returns the weighted sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total weighted collateral value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    ///   - Weight multiplication overflow
    pub fn calculate_total_maintenance_collateral_value(
        &self,
        token_balances: &[TokenBalance; 16],
    ) -> Result<u128> {
        self.calculate_sum(
            token_balances,
            BalanceType::Collateral,
            Some(|b: &Bank| b.maintenance_asset_weight),
            BankError::CollateralOverflow,
        )
    }

    /// Calculates the total liability value with Maintenance Liability Weight applied
    /// Returns the weighted sum in USD with 6 decimal places precision
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<u128>` - Total weighted liability value in USD (6 decimals) or error if:
    ///   - Required bank not found
    ///   - Math overflow in calculations
    ///   - Weight multiplication overflow
    pub fn calculate_total_maintenance_liability_value(
        &self,
        token_balances: &[TokenBalance; 16],
    ) -> Result<u128> {
        self.calculate_sum(
            token_balances,
            BalanceType::Liability,
            Some(|b: &Bank| b.maintenance_liability_weight),
            BankError::LiabilityOverflow,
        )
    }

    /// Calculates both maintenance weighted collateral and liability values
    /// Returns (weighted_collateral, weighted_liability) tuple
    ///
    /// # Arguments
    ///
    /// * `token_balances` - Array of TokenBalance containing bank IDs and amounts
    ///
    /// # Returns
    ///
    /// * `Result<(u128, u128)>` - Tuple of maintenance weighted collateral and liability values in USD (6 decimals)
    pub fn calculate_total_maintenance_values(
        &self,
        token_balances: [TokenBalance; 16],
    ) -> Result<(u128, u128)> {
        let maintenance_collateral =
            self.calculate_total_maintenance_collateral_value(&token_balances)?;
        let maintenance_liability =
            self.calculate_total_maintenance_liability_value(&token_balances)?;

        Ok((maintenance_collateral, maintenance_liability))
    }
}
